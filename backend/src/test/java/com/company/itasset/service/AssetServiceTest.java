package com.company.itasset.service;

import com.company.itasset.dto.request.AssetDto;
import com.company.itasset.dto.response.AssetResponse;
import com.company.itasset.entity.Asset;
import com.company.itasset.entity.Branch;
import com.company.itasset.entity.User;
import com.company.itasset.entity.enums.AssetStatus;
import com.company.itasset.entity.enums.Role;
import com.company.itasset.exception.ResourceNotFoundException;
import com.company.itasset.exception.ValidationException;
import com.company.itasset.repository.AssetRepository;
import com.company.itasset.repository.BranchRepository;
import com.company.itasset.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * JUnit 5 service-layer tests for AssetService.
 * Uses Mockito to isolate the service from the database — no Spring context loaded.
 *
 * Covers:
 *  - searchAssets paginates via Specification
 *  - create happy-path wires branch, publishes Kafka event
 *  - create throws on duplicate serial number
 *  - assign throws when asset is not AVAILABLE
 *  - setParent throws when child == parent (cycle guard)
 *  - getChildren returns the repository result mapped to responses
 */
@ExtendWith(MockitoExtension.class)
class AssetServiceTest {

    @Mock AssetRepository      assetRepository;
    @Mock BranchRepository     branchRepository;
    @Mock UserRepository       userRepository;
    @Mock AuditLogService      auditLogService;
    @Mock NotificationService  notificationService;
    @Mock KafkaProducerService kafkaProducer;

    @InjectMocks AssetService assetService;

    private Branch branch;
    private Asset  asset;
    private User   user;

    @BeforeEach
    void setUp() {
        branch = new Branch();
        branch.setId(1L); branch.setName("HQ"); branch.setCity("New York"); branch.setCountry("US");

        asset = Asset.builder()
                .id(10L).name("HP EliteBook").type("Laptop")
                .serialNumber("HP-001").status(AssetStatus.AVAILABLE)
                .branch(branch).build();

        user = new User();
        user.setId(5L); user.setEmail("emp@test.com"); user.setName("Employee");
        user.setRole(Role.EMPLOYEE); user.setActive(true);
    }

    // ── searchAssets ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("searchAssets returns paged results from repository")
    void searchAssets_returnsMappedPage() {
        Page<Asset> page = new PageImpl<>(List.of(asset));
        when(assetRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        var result = assetService.searchAssets(null, null, null, null, 0, 20, "name");

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("HP EliteBook");
        verify(assetRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    @DisplayName("searchAssets caps page size at 100")
    void searchAssets_capsPageSize() {
        when(assetRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(Page.empty());

        assetService.searchAssets(null, null, null, null, 0, 9999, "name");

        ArgumentCaptor<Pageable> cap = ArgumentCaptor.forClass(Pageable.class);
        verify(assetRepository).findAll(any(Specification.class), cap.capture());
        assertThat(cap.getValue().getPageSize()).isEqualTo(100);
    }

    // ── create ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("create — happy path saves asset and publishes Kafka event")
    void create_savesAndPublishesEvent() {
        AssetDto dto = buildDto("HP-NEW");
        when(assetRepository.existsBySerialNumber("HP-NEW")).thenReturn(false);
        when(branchRepository.findById(1L)).thenReturn(Optional.of(branch));
        when(assetRepository.save(any())).thenReturn(asset);

        AssetResponse resp = assetService.create(dto, "admin@test.com");

        assertThat(resp.getName()).isEqualTo("HP EliteBook");
        verify(kafkaProducer).publishAssetEvent(eq("ASSET_CREATED"), eq(10L), eq("HP EliteBook"), eq("admin@test.com"));
        verify(auditLogService).log(eq("CREATE_ASSET"), eq("Asset"), eq(10L), eq("admin@test.com"), anyString());
    }

    @Test
    @DisplayName("create — throws ValidationException on duplicate serial number")
    void create_throwsOnDuplicateSerial() {
        AssetDto dto = buildDto("HP-DUP");
        when(assetRepository.existsBySerialNumber("HP-DUP")).thenReturn(true);

        assertThatThrownBy(() -> assetService.create(dto, "admin@test.com"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("Serial number");

        verify(assetRepository, never()).save(any());
        verify(kafkaProducer, never()).publishAssetEvent(any(), any(), any(), any());
    }

    @Test
    @DisplayName("create — throws ResourceNotFoundException when branch missing")
    void create_throwsWhenBranchNotFound() {
        AssetDto dto = buildDto("HP-X");
        when(assetRepository.existsBySerialNumber("HP-X")).thenReturn(false);
        when(branchRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> assetService.create(dto, "admin@test.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── assign ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("assign — happy path changes status to ASSIGNED")
    void assign_setsStatusAssigned() {
        when(assetRepository.findById(10L)).thenReturn(Optional.of(asset));
        when(userRepository.findById(5L)).thenReturn(Optional.of(user));
        when(assetRepository.save(any())).thenReturn(asset);

        assetService.assign(10L, 5L, "admin@test.com");

        assertThat(asset.getStatus()).isEqualTo(AssetStatus.ASSIGNED);
        assertThat(asset.getAssignedTo()).isEqualTo(user);
        verify(kafkaProducer).publishAssetEvent(eq("ASSET_ASSIGNED"), eq(10L), any(), eq("admin@test.com"));
    }

    @Test
    @DisplayName("assign — throws ValidationException when asset not AVAILABLE")
    void assign_throwsWhenNotAvailable() {
        asset.setStatus(AssetStatus.MAINTENANCE);
        when(assetRepository.findById(10L)).thenReturn(Optional.of(asset));

        assertThatThrownBy(() -> assetService.assign(10L, 5L, "admin@test.com"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("not available");

        verify(userRepository, never()).findById(any());
        verify(assetRepository, never()).save(any());
    }

    // ── hierarchical parent-child ─────────────────────────────────────────────

    @Test
    @DisplayName("setParent — throws ValidationException when child == parent (cycle guard)")
    void setParent_throwsOnSelfReference() {
        when(assetRepository.findById(10L)).thenReturn(Optional.of(asset));

        assertThatThrownBy(() -> assetService.setParent(10L, 10L, "admin@test.com"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("own parent");
    }

    @Test
    @DisplayName("setParent — null parentId clears the parent (makes root asset)")
    void setParent_clearParent() {
        asset.setParentAsset(new Asset());   // pretend it had a parent
        when(assetRepository.findById(10L)).thenReturn(Optional.of(asset));
        when(assetRepository.save(any())).thenReturn(asset);

        assetService.setParent(10L, null, "admin@test.com");

        assertThat(asset.getParentAsset()).isNull();
    }

    @Test
    @DisplayName("getChildren — returns all direct children from repository")
    void getChildren_returnsChildList() {
        Asset child = Asset.builder().id(20L).name("Child Asset").type("Monitor")
                .serialNumber("MON-001").status(AssetStatus.AVAILABLE).branch(branch).build();
        when(assetRepository.findById(10L)).thenReturn(Optional.of(asset));
        when(assetRepository.findByParentAssetId(10L)).thenReturn(List.of(child));

        var children = assetService.getChildren(10L);

        assertThat(children).hasSize(1);
        assertThat(children.get(0).getName()).isEqualTo("Child Asset");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private AssetDto buildDto(String serial) {
        AssetDto dto = new AssetDto();
        dto.setName("HP EliteBook"); dto.setType("Laptop"); dto.setSerialNumber(serial);
        dto.setBranchId(1L); dto.setPurchasePrice(BigDecimal.valueOf(1299));
        return dto;
    }
}

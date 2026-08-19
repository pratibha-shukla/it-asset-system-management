package com.company.itasset.service;

import com.company.itasset.dto.request.AssetRequestDto;
import com.company.itasset.entity.*;
import com.company.itasset.entity.enums.RequestStatus;
import com.company.itasset.entity.enums.Role;
import com.company.itasset.exception.ResourceNotFoundException;
import com.company.itasset.exception.ValidationException;
import com.company.itasset.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * JUnit 5 service-layer tests for AssetRequestService.
 *
 * Covers:
 *  - submit creates PENDING request and logs audit event
 *  - submit throws when user not found
 *  - approve transitions PENDING → APPROVED
 *  - reject transitions PENDING → REJECTED
 *  - approve throws when request is already resolved (non-PENDING)
 *  - reject throws when request is already resolved
 */
@ExtendWith(MockitoExtension.class)
class AssetRequestServiceTest {

    @Mock AssetRequestRepository requestRepository;
    @Mock UserRepository         userRepository;
    @Mock AssetRepository        assetRepository;
    @Mock AuditLogService        auditLogService;

    @InjectMocks AssetRequestService service;

    private User employee;
    private User admin;
    private AssetRequest pendingRequest;

    @BeforeEach
    void setUp() {
        employee = new User();
        employee.setId(1L); employee.setEmail("emp@test.com");
        employee.setName("Jane Employee"); employee.setRole(Role.EMPLOYEE); employee.setActive(true);

        admin = new User();
        admin.setId(2L); admin.setEmail("admin@test.com");
        admin.setName("Admin User"); admin.setRole(Role.ADMIN); admin.setActive(true);

        pendingRequest = AssetRequest.builder()
                .id(100L).user(employee).productName("MacBook Pro")
                .justification("Remote dev work").status(RequestStatus.PENDING).quantity(1).build();
    }

    // ── submit ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("submit — creates PENDING request and fires audit log")
    void submit_createsPendingRequest() {
        AssetRequestDto dto = buildDto();
        when(userRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(requestRepository.save(any())).thenReturn(pendingRequest);

        AssetRequest result = service.submit(dto, 1L);

        assertThat(result.getStatus()).isEqualTo(RequestStatus.PENDING);
        assertThat(result.getProductName()).isEqualTo("MacBook Pro");
        verify(auditLogService).log(eq("SUBMIT_REQUEST"), eq("AssetRequest"), eq(100L),
                eq("emp@test.com"), anyString());
    }

    @Test
    @DisplayName("submit — throws ResourceNotFoundException when user not found")
    void submit_throwsWhenUserNotFound() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submit(buildDto(), 99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("User");

        verify(requestRepository, never()).save(any());
    }

    // ── approve ───────────────────────────────────────────────────────────────

    @Test
    @DisplayName("approve — transitions PENDING to APPROVED")
    void approve_setsApprovedStatus() {
        when(requestRepository.findById(100L)).thenReturn(Optional.of(pendingRequest));
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin));
        when(requestRepository.save(any())).thenReturn(pendingRequest);

        AssetRequest result = service.approve(100L, "Looks good", 2L);

        assertThat(result.getStatus()).isEqualTo(RequestStatus.APPROVED);
        assertThat(result.getAdminNotes()).isEqualTo("Looks good");
        assertThat(result.getResolvedBy()).isEqualTo(admin);
        assertThat(result.getResolvedDate()).isNotNull();
    }

    @Test
    @DisplayName("approve — throws ValidationException when request is not PENDING")
    void approve_throwsWhenAlreadyResolved() {
        pendingRequest.setStatus(RequestStatus.APPROVED);   // already resolved
        when(requestRepository.findById(100L)).thenReturn(Optional.of(pendingRequest));

        assertThatThrownBy(() -> service.approve(100L, "notes", 2L))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("PENDING");

        verify(requestRepository, never()).save(any());
    }

    // ── reject ────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("reject — transitions PENDING to REJECTED")
    void reject_setsRejectedStatus() {
        when(requestRepository.findById(100L)).thenReturn(Optional.of(pendingRequest));
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin));
        when(requestRepository.save(any())).thenReturn(pendingRequest);

        AssetRequest result = service.reject(100L, "Budget constraints", 2L);

        assertThat(result.getStatus()).isEqualTo(RequestStatus.REJECTED);
        assertThat(result.getAdminNotes()).isEqualTo("Budget constraints");
        assertThat(result.getResolvedDate()).isNotNull();
    }

    @Test
    @DisplayName("reject — throws ValidationException when request is already rejected")
    void reject_throwsWhenAlreadyResolved() {
        pendingRequest.setStatus(RequestStatus.REJECTED);
        when(requestRepository.findById(100L)).thenReturn(Optional.of(pendingRequest));

        assertThatThrownBy(() -> service.reject(100L, "n/a", 2L))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    @DisplayName("reject — throws ResourceNotFoundException when request missing")
    void reject_throwsWhenRequestNotFound() {
        when(requestRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.reject(999L, "n/a", 2L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("AssetRequest");
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private AssetRequestDto buildDto() {
        AssetRequestDto dto = new AssetRequestDto();
        dto.setProductName("MacBook Pro");
        dto.setJustification("Remote dev work");
        dto.setQuantity(1);
        return dto;
    }
}

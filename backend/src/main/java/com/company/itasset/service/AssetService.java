package com.company.itasset.service;

import com.company.itasset.dto.request.AssetDto;
import com.company.itasset.dto.response.AssetResponse;
import com.company.itasset.dto.response.AssetResponse.ChildRef;
import com.company.itasset.dto.response.PagedResponse;
import com.company.itasset.entity.*;
import com.company.itasset.entity.enums.AssetStatus;
import com.company.itasset.exception.*;
import com.company.itasset.repository.*;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssetService {

    private final AssetRepository assetRepository;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final KafkaProducerService kafkaProducer;

    @Transactional(readOnly = true)
    public PagedResponse<AssetResponse> searchAssets(AssetStatus status, String type,
            Long branchId, String search, int page, int size, String sortBy) {
        Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.ASC, sortBy));
        Specification<Asset> spec = buildSpec(status, type, branchId, search);
        Page<Asset> assets = assetRepository.findAll(spec, pageable);
        return PagedResponse.of(assets.map(this::toResponse));
    }

    private Specification<Asset> buildSpec(AssetStatus status, String type, Long branchId, String search) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null)
                predicates.add(cb.equal(root.get("status"), status));
            if (type != null && !type.isBlank())
                predicates.add(cb.equal(root.get("type"), type));
            if (branchId != null)
                predicates.add(cb.equal(root.get("branch").get("id"), branchId));
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("name")), pattern),
                    cb.like(cb.lower(root.get("serialNumber")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    @Transactional(readOnly = true)
    public AssetResponse getById(Long id) {
        return toResponse(assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", "id", id)));
    }

    @Transactional
    public AssetResponse create(AssetDto dto, String createdByEmail) {
        if (assetRepository.existsBySerialNumber(dto.getSerialNumber()))
            throw new ValidationException("serialNumber", "Serial number already exists");
        Branch branch = branchRepository.findById(dto.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch", "id", dto.getBranchId()));
        Asset parentAsset = null;
        if (dto.getParentAssetId() != null) {
            parentAsset = assetRepository.findById(dto.getParentAssetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent Asset", "id", dto.getParentAssetId()));
        }
        Asset asset = Asset.builder()
                .name(dto.getName()).type(dto.getType()).serialNumber(dto.getSerialNumber())
                .status(dto.getStatus() != null ? dto.getStatus() : AssetStatus.AVAILABLE)
                .branch(branch).description(dto.getDescription()).manufacturer(dto.getManufacturer())
                .model(dto.getModel()).purchaseDate(dto.getPurchaseDate())
                .purchasePrice(dto.getPurchasePrice()).warrantyExpiry(dto.getWarrantyExpiry())
                .parentAsset(parentAsset)
                .build();
        Asset saved = assetRepository.save(asset);
        auditLogService.log("CREATE_ASSET", "Asset", saved.getId(), createdByEmail, "Asset created: " + saved.getName());
        kafkaProducer.publishAssetEvent("ASSET_CREATED", saved.getId(), saved.getName(), createdByEmail);
        return toResponse(saved);
    }

    @Transactional
    public AssetResponse update(Long id, AssetDto dto, String updatedByEmail) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", "id", id));
        if (!asset.getSerialNumber().equals(dto.getSerialNumber()) &&
                assetRepository.existsBySerialNumber(dto.getSerialNumber()))
            throw new ValidationException("serialNumber", "Serial number already in use");
        Branch branch = branchRepository.findById(dto.getBranchId())
                .orElseThrow(() -> new ResourceNotFoundException("Branch", "id", dto.getBranchId()));
        asset.setName(dto.getName()); asset.setType(dto.getType()); asset.setSerialNumber(dto.getSerialNumber());
        asset.setStatus(dto.getStatus()); asset.setBranch(branch); asset.setDescription(dto.getDescription());
        asset.setManufacturer(dto.getManufacturer()); asset.setModel(dto.getModel());
        asset.setPurchaseDate(dto.getPurchaseDate()); asset.setPurchasePrice(dto.getPurchasePrice());
        asset.setWarrantyExpiry(dto.getWarrantyExpiry());
        if (dto.getParentAssetId() != null) {
            Asset parent = assetRepository.findById(dto.getParentAssetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent Asset", "id", dto.getParentAssetId()));
            asset.setParentAsset(parent);
        } else {
            asset.setParentAsset(null);
        }
        Asset saved = assetRepository.save(asset);
        auditLogService.log("UPDATE_ASSET", "Asset", saved.getId(), updatedByEmail, "Asset updated: " + saved.getName());
        kafkaProducer.publishAssetEvent("ASSET_UPDATED", saved.getId(), saved.getName(), updatedByEmail);
        return toResponse(saved);
    }

    @Transactional
    public void assign(Long assetId, Long userId, String adminEmail) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", "id", assetId));
        if (asset.getStatus() != AssetStatus.AVAILABLE)
            throw new ValidationException("asset", "Asset is not available");
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        asset.setAssignedTo(user); asset.setStatus(AssetStatus.ASSIGNED);
        assetRepository.save(asset);
        auditLogService.log("ASSIGN_ASSET", "Asset", assetId, adminEmail,
                "Assigned " + asset.getName() + " to " + user.getEmail());
        notificationService.sendToUser(user.getEmail(), "ASSET_ASSIGNED",
                "Asset \"" + asset.getName() + "\" has been assigned to you.");
        notificationService.broadcast("ASSET_UPDATED",
                "Asset \"" + asset.getName() + "\" assigned to " + user.getName());
        kafkaProducer.publishAssetEvent("ASSET_ASSIGNED", assetId, asset.getName(), adminEmail);
    }

    @Transactional
    public void unassign(Long assetId, String adminEmail) {
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", "id", assetId));
        asset.setAssignedTo(null); asset.setStatus(AssetStatus.AVAILABLE);
        assetRepository.save(asset);
        auditLogService.log("UNASSIGN_ASSET", "Asset", assetId, adminEmail, "Unassigned: " + asset.getName());
    }

    @Transactional
    public void delete(Long id, String adminEmail) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", "id", id));
        auditLogService.log("DELETE_ASSET", "Asset", id, adminEmail, "Deleted: " + asset.getName());
        assetRepository.delete(asset);
    }

    /**
     * Hierarchical Schema Optimization:
     *   Sets the parent asset — supports complex parent-child lookups across
     *   global datacenters.  E.g. a rack server (parent) with blade servers (children).
     */
    @Transactional
    public AssetResponse setParent(Long childId, Long parentId, String adminEmail) {
        Asset child = assetRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", "id", childId));
        if (parentId == null) {
            child.setParentAsset(null);
        } else {
            if (parentId.equals(childId)) throw new ValidationException("parentId", "Asset cannot be its own parent");
            Asset parent = assetRepository.findById(parentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Asset (parent)", "id", parentId));
            child.setParentAsset(parent);
        }
        Asset saved = assetRepository.save(child);
        auditLogService.log("SET_PARENT", "Asset", childId, adminEmail,
                "Set parent of " + child.getName() + " to " + (parentId == null ? "none" : parentId));
        return toResponse(saved);
    }

    /** Returns all direct children of the given asset. */
    @Transactional(readOnly = true)
    public List<AssetResponse> getChildren(Long parentId) {
        assetRepository.findById(parentId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", "id", parentId));
        return assetRepository.findByParentAssetId(parentId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** Returns the asset with its full parent + children populated. */
    @Transactional(readOnly = true)
    public AssetResponse getHierarchy(Long id) {
        Asset asset = assetRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", "id", id));
        return toResponseWithChildren(asset);
    }

    private AssetResponse toResponseWithChildren(Asset a) {
        AssetResponse r = toResponse(a);
        if (a.getChildren() != null) {
            r.setChildren(a.getChildren().stream().map(c -> {
                ChildRef cr = new ChildRef();
                cr.setId(c.getId());
                cr.setName(c.getName());
                cr.setType(c.getType());
                cr.setStatus(c.getStatus());
                return cr;
            }).collect(Collectors.toList()));
        }
        return r;
    }

    private AssetResponse toResponse(Asset a) {
        AssetResponse r = new AssetResponse();
        r.setId(a.getId());
        r.setName(a.getName());
        r.setType(a.getType());
        r.setSerialNumber(a.getSerialNumber());
        r.setStatus(a.getStatus());
        r.setDescription(a.getDescription());
        r.setManufacturer(a.getManufacturer());
        r.setModel(a.getModel());
        r.setPurchaseDate(a.getPurchaseDate());
        r.setPurchasePrice(a.getPurchasePrice());
        r.setWarrantyExpiry(a.getWarrantyExpiry());
        r.setCreatedAt(a.getCreatedAt());
        r.setUpdatedAt(a.getUpdatedAt());
        r.setBranchId(a.getBranch() != null ? a.getBranch().getId() : null);
        r.setBranchName(a.getBranch() != null ? a.getBranch().getName() : null);
        r.setAssignedToId(a.getAssignedTo() != null ? a.getAssignedTo().getId() : null);
        r.setAssignedToName(a.getAssignedTo() != null ? a.getAssignedTo().getName() : null);
        r.setAvailable(a.getStatus() == AssetStatus.AVAILABLE);
        r.setStatusLabel(a.getStatus().name().charAt(0) + a.getStatus().name().substring(1).toLowerCase());
        // Hierarchical parent reference (flat — avoids recursive serialization)
        if (a.getParentAsset() != null) {
            r.setParentAssetId(a.getParentAsset().getId());
            r.setParentAssetName(a.getParentAsset().getName());
        }
        r.setChildren(Collections.emptyList());  // populated only by getHierarchy()
        return r;
    }
}

package com.company.itasset.service;

import com.company.itasset.dto.request.AssetRequestDto;
import com.company.itasset.dto.response.PagedResponse;
import com.company.itasset.entity.*;
import com.company.itasset.entity.enums.RequestStatus;
import com.company.itasset.exception.*;
import com.company.itasset.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AssetRequestService {

    private final AssetRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final AuditLogService auditLogService;

    @Transactional
    public AssetRequest submit(AssetRequestDto dto, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
        Asset asset = dto.getAssetId() != null
                ? assetRepository.findById(dto.getAssetId())
                    .orElseThrow(() -> new ResourceNotFoundException("Asset", "id", dto.getAssetId()))
                : null;
        AssetRequest request = AssetRequest.builder()
                .user(user).asset(asset).productName(dto.getProductName())
                .justification(dto.getJustification()).priority(dto.getPriority())
                .department(dto.getDepartment()).projectName(dto.getProjectName())
                .phoneNumber(dto.getPhoneNumber()).quantity(dto.getQuantity() != null ? dto.getQuantity() : 1)
                .neededBy(dto.getNeededBy()).employeeName(dto.getEmployeeName())
                .status(RequestStatus.PENDING).build();
        AssetRequest saved = requestRepository.save(request);
        auditLogService.log("SUBMIT_REQUEST", "AssetRequest", saved.getId(),
                user.getEmail(), "Request submitted: " + dto.getProductName());
        return saved;
    }

    @Transactional(readOnly = true)
    public PagedResponse<AssetRequest> getRequests(Long userId, String role,
                                                    RequestStatus status, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "requestDate"));
        Long filterUserId = "ROLE_EMPLOYEE".equals(role) ? userId : null;
        return PagedResponse.of(requestRepository.findByFilters(filterUserId, status, pageable));
    }

    @Transactional
    public AssetRequest approve(Long requestId, String notes, Long adminId) {
        AssetRequest request = getOrThrow(requestId);
        ensurePending(request);
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", adminId));
        request.setStatus(RequestStatus.APPROVED);
        request.setAdminNotes(notes); request.setResolvedBy(admin);
        request.setResolvedDate(LocalDateTime.now());
        AssetRequest saved = requestRepository.save(request);
        auditLogService.log("APPROVE_REQUEST", "AssetRequest", requestId,
                admin.getEmail(), "Approved: " + request.getProductName());
        return saved;
    }

    @Transactional
    public AssetRequest reject(Long requestId, String notes, Long adminId) {
        AssetRequest request = getOrThrow(requestId);
        ensurePending(request);
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", adminId));
        request.setStatus(RequestStatus.REJECTED);
        request.setAdminNotes(notes); request.setResolvedBy(admin);
        request.setResolvedDate(LocalDateTime.now());
        AssetRequest saved = requestRepository.save(request);
        auditLogService.log("REJECT_REQUEST", "AssetRequest", requestId,
                admin.getEmail(), "Rejected: " + request.getProductName());
        return saved;
    }

    @Transactional
    public AssetRequest fulfill(Long requestId, Long assetId, Long adminId) {
        AssetRequest request = getOrThrow(requestId);
        if (request.getStatus() != RequestStatus.APPROVED)
            throw new ValidationException("status", "Only APPROVED requests can be fulfilled");
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", adminId));
        Asset asset = assetRepository.findById(assetId)
                .orElseThrow(() -> new ResourceNotFoundException("Asset", "id", assetId));
        if (asset.getAssignedTo() != null)
            throw new ValidationException("asset", "Asset is already assigned to someone else");
        // Assign asset to the requesting employee
        asset.setAssignedTo(request.getUser());
        asset.setStatus(com.company.itasset.entity.enums.AssetStatus.ASSIGNED);
        assetRepository.save(asset);
        // Mark request fulfilled
        request.setStatus(RequestStatus.FULFILLED);
        request.setAsset(asset);
        request.setResolvedBy(admin);
        request.setResolvedDate(LocalDateTime.now());
        AssetRequest saved = requestRepository.save(request);
        auditLogService.log("FULFILL_REQUEST", "AssetRequest", requestId,
                admin.getEmail(), "Fulfilled with asset: " + asset.getSerialNumber());
        return saved;
    }

    private AssetRequest getOrThrow(Long id) {
        return requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("AssetRequest", "id", id));
    }

    private void ensurePending(AssetRequest r) {
        if (r.getStatus() != RequestStatus.PENDING && r.getStatus() != RequestStatus.APPROVED)
            throw new ValidationException("status", "Only PENDING or APPROVED requests can be rejected");
    }
}

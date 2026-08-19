package com.company.itasset.service;

import com.company.itasset.dto.response.PagedResponse;
import com.company.itasset.entity.Asset;
import com.company.itasset.entity.AssetRequest;
import com.company.itasset.entity.User;
import com.company.itasset.entity.enums.RequestStatus;
import com.company.itasset.exception.ResourceNotFoundException;
import com.company.itasset.exception.UnauthorizedException;
import com.company.itasset.exception.ValidationException;
import com.company.itasset.repository.AssetRepository;
import com.company.itasset.repository.AssetRequestRepository;
import com.company.itasset.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ManagerService {

    private final UserRepository        userRepository;
    private final AssetRequestRepository requestRepository;
    private final AssetRepository       assetRepository;
    private final AuditLogService       auditLogService;

    // ── helpers ──────────────────────────────────────────────────────────────

    private User getManager(Long managerId) {
        return userRepository.findById(managerId)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", managerId));
    }

    private List<User> getTeamMembers(User manager) {
        return userRepository.findByManagerId(manager.getId());
    }

    private List<Long> teamIds(User manager) {
        return getTeamMembers(manager).stream().map(User::getId).toList();
    }

    /** Throws 403 if the request does not belong to the manager's team. */
    private void assertOwnsRequest(User manager, AssetRequest request) {
        List<Long> ids = teamIds(manager);
        if (!ids.contains(request.getUser().getId())) {
            throw new UnauthorizedException("This request does not belong to your team.");
        }
    }

    // ── team requests ─────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PagedResponse<AssetRequest> getTeamRequests(Long managerId, RequestStatus status,
                                                        String search, int page, int size) {
        User manager = getManager(managerId);
        List<Long> ids = teamIds(manager);
        if (ids.isEmpty()) return PagedResponse.of(Page.empty());

        Pageable pageable = PageRequest.of(page, size);
        Page<AssetRequest> raw = routRepository(ids, pageable);

        // In-memory filter for status + search (team sizes are small)
        List<AssetRequest> filtered = raw.getContent().stream()
                .filter(r -> status == null || r.getStatus() == status)
                .filter(r -> search == null || search.isBlank()
                        || r.getProductName().toLowerCase().contains(search.toLowerCase())
                        || r.getUser().getName().toLowerCase().contains(search.toLowerCase()))
                .toList();

        return PagedResponse.of(new PageImpl<>(filtered, pageable, filtered.size()));
    }

    private Page<AssetRequest> routRepository(List<Long> ids, Pageable pageable) {
        return ids.isEmpty() ? Page.empty() : requestRepository.findByUserIdIn(ids, pageable);
    }

    // ── team assets ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PagedResponse<Asset> getTeamAssets(Long managerId, String search, int page, int size) {
        User manager = getManager(managerId);
        List<Long> ids = teamIds(manager);
        if (ids.isEmpty()) return PagedResponse.of(Page.empty());

        Pageable pageable = PageRequest.of(page, size);
        Page<Asset> raw = assetRepository.findByAssignedToIdIn(ids, pageable);

        List<Asset> filtered = raw.getContent().stream()
                .filter(a -> search == null || search.isBlank()
                        || a.getName().toLowerCase().contains(search.toLowerCase())
                        || (a.getAssignedTo() != null &&
                            a.getAssignedTo().getName().toLowerCase().contains(search.toLowerCase())))
                .toList();

        return PagedResponse.of(new PageImpl<>(filtered, pageable, filtered.size()));
    }

    // ── team stats ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> getTeamStats(Long managerId) {
        User manager = getManager(managerId);
        List<User> team = getTeamMembers(manager);
        List<Long> ids = team.stream().map(User::getId).toList();

        long totalMembers    = team.size();
        long assignedAssets  = ids.stream().mapToLong(assetRepository::countByAssignedToId).sum();
        long pendingRequests = ids.isEmpty() ? 0
                : requestRepository.countByUserIdInAndStatus(ids, RequestStatus.PENDING);
        long approvedThisMonth = ids.isEmpty() ? 0
                : requestRepository.countByUserIdInAndStatusAndRequestDateAfter(
                        ids, RequestStatus.APPROVED,
                        LocalDate.now().withDayOfMonth(1).atStartOfDay());

        return Map.of(
                "totalMembers",     totalMembers,
                "assignedAssets",   assignedAssets,
                "pendingRequests",  pendingRequests,
                "approvedThisMonth", approvedThisMonth
        );
    }

    // ── approve / reject ──────────────────────────────────────────────────────

    @Transactional
    public AssetRequest approveRequest(Long managerId, Long requestId, String notes) {
        User manager = getManager(managerId);
        AssetRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("AssetRequest", "id", requestId));

        assertOwnsRequest(manager, request);
        if (request.getStatus() != RequestStatus.PENDING)
            throw new ValidationException("status", "Only PENDING requests can be approved");

        request.setStatus(RequestStatus.APPROVED);
        request.setAdminNotes(notes);
        request.setResolvedBy(manager);
        request.setResolvedDate(LocalDateTime.now());
        AssetRequest saved = requestRepository.save(request);

        auditLogService.log("APPROVE_REQUEST", "AssetRequest", requestId,
                manager.getEmail(), "Manager approved: " + request.getProductName()
                        + " for " + request.getUser().getName());
        return saved;
    }

    @Transactional
    public AssetRequest rejectRequest(Long managerId, Long requestId, String notes) {
        User manager = getManager(managerId);
        AssetRequest request = requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("AssetRequest", "id", requestId));

        assertOwnsRequest(manager, request);
        if (request.getStatus() != RequestStatus.PENDING)
            throw new ValidationException("status", "Only PENDING requests can be rejected");

        request.setStatus(RequestStatus.REJECTED);
        request.setAdminNotes(notes);
        request.setResolvedBy(manager);
        request.setResolvedDate(LocalDateTime.now());
        AssetRequest saved = requestRepository.save(request);

        auditLogService.log("REJECT_REQUEST", "AssetRequest", requestId,
                manager.getEmail(), "Manager rejected: " + request.getProductName()
                        + " for " + request.getUser().getName() + ". Reason: " + notes);
        return saved;
    }
}

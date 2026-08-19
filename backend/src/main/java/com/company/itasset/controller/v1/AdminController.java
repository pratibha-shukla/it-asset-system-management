package com.company.itasset.controller.v1;

import com.company.itasset.dto.response.ApiResponse;
import com.company.itasset.dto.response.PagedResponse;
import com.company.itasset.dto.response.UserSummary;
import com.company.itasset.entity.AuditLog;
import com.company.itasset.entity.Branch;
import com.company.itasset.entity.User;
import com.company.itasset.entity.enums.AssetStatus;
import com.company.itasset.entity.enums.RequestStatus;
import com.company.itasset.entity.enums.Role;
import com.company.itasset.exception.ResourceNotFoundException;
import com.company.itasset.exception.ValidationException;
import com.company.itasset.repository.*;
import com.company.itasset.service.AuditLogService;
import org.springframework.security.crypto.password.PasswordEncoder;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;


@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final UserRepository userRepository;
    private final AssetRepository assetRepository;
    private final AssetRequestRepository requestRepository;
    private final AuditLogService auditLogService;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalAssets",       assetRepository.count());
        stats.put("availableAssets",   assetRepository.countByStatus(AssetStatus.AVAILABLE));
        stats.put("assignedAssets",    assetRepository.countByStatus(AssetStatus.ASSIGNED));
        stats.put("maintenanceAssets", assetRepository.countByStatus(AssetStatus.MAINTENANCE));
        stats.put("pendingRequests",   requestRepository.countByStatus(RequestStatus.PENDING));
        stats.put("approvedRequests",  requestRepository.countByStatus(RequestStatus.APPROVED));
        stats.put("totalUsers",        userRepository.count());
        stats.put("assetsByType",      assetRepository.countByType());
        return ResponseEntity.ok(ApiResponse.success(stats, "Stats fetched"));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<PagedResponse<UserSummary>>> getUsers(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {

        Specification<User> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            // always filter active only
            predicates.add(cb.equal(root.get("active"), true));
            // optional search
            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("name")),  pattern),
                    cb.like(cb.lower(root.get("email")), pattern)
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<User> users = userRepository.findAll(spec, PageRequest.of(page, size, Sort.by("name")));
        Page<UserSummary> summaries = users.map(u -> new UserSummary(
                u.getId(), u.getName(), u.getEmail(), u.getRole(), u.isActive(),
                u.getPhoneNumber(), u.getEmployeeId(),
                u.getBranch() != null ? u.getBranch().getId()      : null,
                u.getBranch() != null ? u.getBranch().getName()    : null,
                u.getBranch() != null ? u.getBranch().getCity()    : null,
                u.getBranch() != null ? u.getBranch().getCountry() : null
        ));
        return ResponseEntity.ok(ApiResponse.success(PagedResponse.of(summaries), "Users fetched"));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<ApiResponse<User>> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(
                userRepository.findWithBranchById(id)
                        .orElseThrow(() -> new ResourceNotFoundException("User","id",id)), "User found"));
    }

    @PutMapping("/users/{id}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User","id",id));
        String newPassword = body.get("password");
        if (newPassword == null || newPassword.length() < 6)
            throw new ValidationException("password", "Password must be at least 6 characters");
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(null, "Password reset successfully"));
    }

    @PatchMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> updates) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User","id",id));
        if (updates.containsKey("phoneNumber"))
            user.setPhoneNumber((String) updates.get("phoneNumber"));
        if (updates.containsKey("employeeId"))
            user.setEmployeeId((String) updates.get("employeeId"));
        if (updates.containsKey("role") && updates.get("role") != null)
            user.setRole(Role.valueOf((String) updates.get("role")));
        if (updates.containsKey("branchId")) {
            Object bid = updates.get("branchId");
            if (bid == null) {
                user.setBranch(null);
            } else {
                Long branchId = Long.valueOf(bid.toString());
                Branch branch = branchRepository.findById(branchId)
                        .orElseThrow(() -> new ResourceNotFoundException("Branch","id",branchId));
                user.setBranch(branch);
            }
        }
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(null, "User updated"));
    }

    @PutMapping("/users/{id}/deactivate")
    public ResponseEntity<ApiResponse<Void>> deactivateUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User","id",id));
        user.setActive(false);
        userRepository.save(user);
        return ResponseEntity.ok(ApiResponse.success(null, "User deactivated"));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<PagedResponse<AuditLog>>> getAuditLogs(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                PagedResponse.of(auditLogService.getAll(page, size)), "Audit logs fetched"));
    }

    @GetMapping("/audit-logs/entity/{type}/{id}")
    public ResponseEntity<ApiResponse<PagedResponse<AuditLog>>> getEntityLogs(
            @PathVariable String type, @PathVariable Long id,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(
                PagedResponse.of(auditLogService.getByEntity(type, id, page, size)), "Logs fetched"));
    }
}

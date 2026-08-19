package com.company.itasset.controller.v1;

import com.company.itasset.dto.response.ApiResponse;
import com.company.itasset.dto.response.PagedResponse;
import com.company.itasset.entity.Asset;
import com.company.itasset.entity.AssetRequest;
import com.company.itasset.entity.enums.RequestStatus;
import com.company.itasset.security.UserDetailsImpl;
import com.company.itasset.service.ManagerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/manager")
@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")
@RequiredArgsConstructor
public class ManagerController {

    private final ManagerService managerService;

    /** GET /api/v1/manager/requests?status=PENDING&search=laptop&page=0&size=20 */
    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<PagedResponse<AssetRequest>>> getTeamRequests(
            @RequestParam(required = false) RequestStatus status,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(
                managerService.getTeamRequests(user.getId(), status, search, page, size),
                "Team requests fetched"));
    }

    /** GET /api/v1/manager/team-assets?search=laptop&page=0&size=20 */
    @GetMapping("/team-assets")
    public ResponseEntity<ApiResponse<PagedResponse<Asset>>> getTeamAssets(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(
                managerService.getTeamAssets(user.getId(), search, page, size),
                "Team assets fetched"));
    }

    /** GET /api/v1/manager/stats */
    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeamStats(
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(
                managerService.getTeamStats(user.getId()), "Team stats fetched"));
    }

    /** PUT /api/v1/manager/requests/{id}/approve */
    @PutMapping("/requests/{id}/approve")
    public ResponseEntity<ApiResponse<AssetRequest>> approve(
            @PathVariable Long id,
            @RequestParam(defaultValue = "") String notes,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(
                managerService.approveRequest(user.getId(), id, notes), "Request approved"));
    }

    /** PUT /api/v1/manager/requests/{id}/reject */
    @PutMapping("/requests/{id}/reject")
    public ResponseEntity<ApiResponse<AssetRequest>> reject(
            @PathVariable Long id,
            @RequestParam(defaultValue = "") String notes,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(
                managerService.rejectRequest(user.getId(), id, notes), "Request rejected"));
    }
}

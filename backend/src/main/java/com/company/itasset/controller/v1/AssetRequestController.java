package com.company.itasset.controller.v1;

import com.company.itasset.dto.request.AssetRequestDto;
import com.company.itasset.dto.response.ApiResponse;
import com.company.itasset.dto.response.PagedResponse;
import com.company.itasset.entity.AssetRequest;
import com.company.itasset.entity.enums.RequestStatus;
import com.company.itasset.security.UserDetailsImpl;
import com.company.itasset.service.AssetRequestService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/requests")
public class AssetRequestController {

    private final AssetRequestService requestService;

    @Autowired
    public AssetRequestController(AssetRequestService requestService) {
        this.requestService = requestService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<AssetRequest>>> getAll(
            @RequestParam(required = false) RequestStatus status,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserDetailsImpl user) {
        String role = user.getAuthorities().iterator().next().getAuthority();
        return ResponseEntity.ok(ApiResponse.success(
                requestService.getRequests(user.getId(), role, status, page, size), "Requests fetched"));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','EMPLOYEE')")
    public ResponseEntity<ApiResponse<AssetRequest>> submit(
            @Valid @RequestBody AssetRequestDto dto,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(requestService.submit(dto, user.getId()), "Request submitted"));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AssetRequest>> approve(
            @PathVariable Long id,
            @RequestParam(defaultValue = "") String notes,
            @AuthenticationPrincipal UserDetailsImpl admin) {
        return ResponseEntity.ok(ApiResponse.success(
                requestService.approve(id, notes, admin.getId()), "Request approved"));
    }

    @PutMapping("/{id}/fulfill")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AssetRequest>> fulfill(
            @PathVariable Long id,
            @RequestParam Long assetId,
            @AuthenticationPrincipal UserDetailsImpl admin) {
        return ResponseEntity.ok(ApiResponse.success(
                requestService.fulfill(id, assetId, admin.getId()), "Request fulfilled"));
    }

    @PutMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AssetRequest>> reject(
            @PathVariable Long id,
            @RequestParam String notes,
            @AuthenticationPrincipal UserDetailsImpl admin) {
        return ResponseEntity.ok(ApiResponse.success(
                requestService.reject(id, notes, admin.getId()), "Request rejected"));
    }
}

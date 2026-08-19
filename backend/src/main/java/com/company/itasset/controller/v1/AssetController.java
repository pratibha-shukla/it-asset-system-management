package com.company.itasset.controller.v1;

import com.company.itasset.dto.request.AssetDto;
import com.company.itasset.dto.response.*;
import com.company.itasset.entity.enums.AssetStatus;
import java.util.List;
import com.company.itasset.security.UserDetailsImpl;
import com.company.itasset.service.AssetService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/assets")
@RequiredArgsConstructor
public class AssetController {

    private final AssetService assetService;

    @GetMapping
    public ResponseEntity<ApiResponse<PagedResponse<AssetResponse>>> search(
            @RequestParam(required = false) AssetStatus status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0")    int page,
            @RequestParam(defaultValue = "20")   int size,
            @RequestParam(defaultValue = "name") String sortBy) {
        return ResponseEntity.ok(ApiResponse.success(
                assetService.searchAssets(status, type, branchId, search, page, size, sortBy), "Assets fetched"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AssetResponse>> getOne(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(assetService.getById(id), "Asset found"));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AssetResponse>> create(
            @Valid @RequestBody AssetDto dto, @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(assetService.create(dto, user.getEmail()), "Asset created"));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AssetResponse>> update(
            @PathVariable Long id, @Valid @RequestBody AssetDto dto,
            @AuthenticationPrincipal UserDetailsImpl user) {
        return ResponseEntity.ok(ApiResponse.success(assetService.update(id, dto, user.getEmail()), "Asset updated"));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> delete(
            @PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl user) {
        assetService.delete(id, user.getEmail());
        return ResponseEntity.ok(ApiResponse.success(null, "Asset deleted"));
    }

    @PutMapping("/{id}/assign/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> assign(
            @PathVariable Long id, @PathVariable Long userId,
            @AuthenticationPrincipal UserDetailsImpl admin) {
        assetService.assign(id, userId, admin.getEmail());
        return ResponseEntity.ok(ApiResponse.success(null, "Asset assigned"));
    }

    @PutMapping("/{id}/unassign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> unassign(
            @PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl admin) {
        assetService.unassign(id, admin.getEmail());
        return ResponseEntity.ok(ApiResponse.success(null, "Asset unassigned"));
    }

    // ── Hierarchical Schema Optimization ────────────────────────────────────

    /**
     * GET /api/v1/assets/{id}/hierarchy
     * Returns the asset with its parent reference and shallow children list.
     */
    @GetMapping("/{id}/hierarchy")
    public ResponseEntity<ApiResponse<AssetResponse>> getHierarchy(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(assetService.getHierarchy(id), "Hierarchy fetched"));
    }

    /**
     * GET /api/v1/assets/{id}/children
     * Returns all direct child assets of the given parent.
     */
    @GetMapping("/{id}/children")
    public ResponseEntity<ApiResponse<List<AssetResponse>>> getChildren(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(assetService.getChildren(id), "Children fetched"));
    }

    /**
     * PUT /api/v1/assets/{id}/parent/{parentId}
     * Sets the parent of an asset (admin only).
     */
    @PutMapping("/{id}/parent/{parentId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AssetResponse>> setParent(
            @PathVariable Long id, @PathVariable Long parentId,
            @AuthenticationPrincipal UserDetailsImpl admin) {
        return ResponseEntity.ok(ApiResponse.success(
                assetService.setParent(id, parentId, admin.getEmail()), "Parent set"));
    }

    /**
     * DELETE /api/v1/assets/{id}/parent
     * Removes the parent reference (makes asset a root-level asset).
     */
    @DeleteMapping("/{id}/parent")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AssetResponse>> removeParent(
            @PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl admin) {
        return ResponseEntity.ok(ApiResponse.success(
                assetService.setParent(id, null, admin.getEmail()), "Parent removed"));
    }
}

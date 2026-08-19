package com.company.itasset.repository;

import com.company.itasset.entity.AssetRequest;
import com.company.itasset.entity.enums.RequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AssetRequestRepository extends JpaRepository<AssetRequest, Long> {

    @EntityGraph(attributePaths = {"user", "asset", "resolvedBy"})
    Page<AssetRequest> findByUserId(Long userId, Pageable pageable);

    @Query(value = """
        SELECT r FROM AssetRequest r
        LEFT JOIN r.user u
        WHERE (:userId IS NULL OR u.id = :userId)
          AND (:status IS NULL OR r.status = :status)
        """,
        countQuery = """
        SELECT COUNT(r) FROM AssetRequest r
        LEFT JOIN r.user u
        WHERE (:userId IS NULL OR u.id = :userId)
          AND (:status IS NULL OR r.status = :status)
        """)
    Page<AssetRequest> findByFilters(@Param("userId") Long userId,
                                     @Param("status") RequestStatus status,
                                     Pageable pageable);

    long countByStatus(RequestStatus status);

    // ── Manager team queries ──────────────────────────────────────────────────

    @Query("SELECT r FROM AssetRequest r WHERE r.user.id IN :userIds ORDER BY r.requestDate DESC")
    Page<AssetRequest> findByUserIdIn(@Param("userIds") java.util.List<Long> userIds, Pageable pageable);

    long countByUserIdInAndStatus(java.util.List<Long> userIds, RequestStatus status);

    @Query("SELECT COUNT(r) FROM AssetRequest r WHERE r.user.id IN :userIds AND r.status = :status AND r.requestDate >= :after")
    long countByUserIdInAndStatusAndRequestDateAfter(@Param("userIds") java.util.List<Long> userIds,
                                                     @Param("status") RequestStatus status,
                                                     @Param("after") java.time.LocalDateTime after);
}

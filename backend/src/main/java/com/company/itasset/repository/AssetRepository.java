package com.company.itasset.repository;

import com.company.itasset.entity.Asset;
import com.company.itasset.entity.enums.AssetStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AssetRepository extends JpaRepository<Asset, Long>, JpaSpecificationExecutor<Asset> {

    @EntityGraph(attributePaths = {"branch", "assignedTo"})
    Page<Asset> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"branch", "assignedTo"})
    Optional<Asset> findById(Long id);

    boolean existsBySerialNumber(String serialNumber);

    long countByStatus(AssetStatus status);

    /** Hierarchical Schema Optimization: fetch all direct children of a parent asset. */
    @EntityGraph(attributePaths = {"branch", "assignedTo"})
    List<Asset> findByParentAssetId(Long parentAssetId);

    @Query("SELECT a.type, COUNT(a) FROM Asset a GROUP BY a.type")
    List<Object[]> countByType();

    // ── Manager team queries ──────────────────────────────────────────────────

    @Query("SELECT a FROM Asset a WHERE a.assignedTo.id IN :userIds")
    Page<Asset> findByAssignedToIdIn(@Param("userIds") List<Long> userIds, Pageable pageable);

    long countByAssignedToId(Long userId);
}

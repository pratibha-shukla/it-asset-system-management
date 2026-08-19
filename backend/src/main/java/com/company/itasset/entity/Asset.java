package com.company.itasset.entity;

import com.company.itasset.entity.enums.AssetStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.ArrayList;
import lombok.*;
import org.hibernate.envers.Audited;
import org.hibernate.envers.NotAudited;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "assets", indexes = {
    @Index(name = "idx_assets_status",   columnList = "status"),
    @Index(name = "idx_assets_branch",   columnList = "branch_id"),
    @Index(name = "idx_assets_assigned", columnList = "assigned_to_user_id"),
    @Index(name = "idx_assets_type",     columnList = "asset_type"),
    @Index(name = "idx_assets_parent",   columnList = "parent_asset_id")
})
@Audited
@Data @NoArgsConstructor @AllArgsConstructor @Builder
@EntityListeners(AuditingEntityListener.class)
public class Asset {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank @Column(nullable = false)
    private String name;

    @NotBlank @Column(name = "asset_type", nullable = false)
    private String type;

    @Column(name = "serial_number", unique = true, nullable = false)
    private String serialNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private AssetStatus status = AssetStatus.AVAILABLE;

    @NotAudited
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    @NotNull
    private Branch branch;

    @NotAudited
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_user_id")
    private User assignedTo;

    /**
     * Hierarchical Schema Optimization:
     *   Self-referential FK supports complex parent-child inventory lookups,
     *   e.g. a Server asset with child Network Equipment or a Laptop with Docking Station.
     *   Kept LAZY to avoid N+1 on list queries; loaded explicitly in hierarchy endpoint.
     */
    @NotAudited
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_asset_id")
    private Asset parentAsset;

    @NotAudited
    @OneToMany(mappedBy = "parentAsset", fetch = FetchType.LAZY)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private List<Asset> children;

    private String description;
    private String manufacturer;
    private String model;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "purchase_price", precision = 10, scale = 2)
    private BigDecimal purchasePrice;

    @Column(name = "warranty_expiry")
    private LocalDate warrantyExpiry;

    @CreatedBy  @Column(name = "created_by", updatable = false)
    private String createdBy;

    @LastModifiedBy @Column(name = "updated_by")
    private String updatedBy;

    @CreatedDate  @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Version
    private Long version;
}

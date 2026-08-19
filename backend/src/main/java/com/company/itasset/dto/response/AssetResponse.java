package com.company.itasset.dto.response;
import com.company.itasset.entity.enums.AssetStatus;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class AssetResponse {
    private Long id;
    private String name;
    private String type;
    private String serialNumber;
    private AssetStatus status;
    private String statusLabel;
    private Long branchId;
    private String branchName;
    private Long assignedToId;
    private String assignedToName;
    private String description;
    private String manufacturer;
    private String model;
    private LocalDate purchaseDate;
    private BigDecimal purchasePrice;
    private LocalDate warrantyExpiry;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean available;

    // Hierarchical Schema Optimization: parent-child asset relationships
    private Long   parentAssetId;
    private String parentAssetName;
    /** Shallow child list — ids + names only; prevents infinite nesting in JSON. */
    private List<ChildRef> children;

    @Data
    public static class ChildRef {
        private Long   id;
        private String name;
        private String type;
        private AssetStatus status;
    }
}

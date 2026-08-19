package com.company.itasset.dto.request;
import com.company.itasset.entity.enums.AssetStatus;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
@Data
public class AssetDto {
    @NotBlank(message = "Asset name is required") @Size(max = 200) private String name;
    @NotBlank(message = "Asset type is required") private String type;
    @NotBlank(message = "Serial number is required") private String serialNumber;
    private AssetStatus status;
    @NotNull(message = "Branch ID is required") private Long branchId;
    private String description;
    private String manufacturer;
    private String model;
    @PastOrPresent private LocalDate purchaseDate;
    @DecimalMin("0.0") private BigDecimal purchasePrice;
    private LocalDate warrantyExpiry;   // no @Future — expired warranties are valid
    /** Optional parent asset ID — null means root-level asset. */
    private Long parentAssetId;
}

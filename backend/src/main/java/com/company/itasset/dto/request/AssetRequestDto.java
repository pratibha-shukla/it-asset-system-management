package com.company.itasset.dto.request;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;
// Min/Max already covered by jakarta.validation.constraints.*
@Data
public class AssetRequestDto {
    @NotBlank(message = "Employee name is required")
    @Pattern(regexp = "^[a-zA-Z\\s'\\-]{2,80}$", message = "Name must be 2–80 letters, spaces, hyphens or apostrophes")
    private String employeeName;

    @NotBlank(message = "Product name is required")
    @Size(max = 200)
    @Pattern(regexp = "^[a-zA-Z0-9\\s\\-_.,()&/]{3,200}$", message = "Product name contains invalid characters")
    private String productName;

    @NotBlank
    @Size(min = 10, max = 1000, message = "Justification must be 10–1000 characters")
    private String justification;

    @Pattern(regexp = "LOW|MEDIUM|HIGH", message = "Priority must be LOW, MEDIUM, or HIGH")
    private String priority = "MEDIUM";

    private Long assetId;

    @NotBlank(message = "Department is required")
    private String department;

    @Pattern(regexp = "^[a-zA-Z0-9\\s\\-_.]{2,100}$", message = "Project name contains invalid characters")
    private String projectName;

    @Pattern(regexp = "^(\\+?[\\d\\s\\-(). ]{7,20}|[Ee]xt\\.?\\s*\\d{1,6})$", message = "Enter a valid phone number")
    private String phoneNumber;

    @Min(value = 1, message = "Quantity must be at least 1")
    @Max(value = 50, message = "Quantity cannot exceed 50")
    private Integer quantity = 1;

    private LocalDate neededBy;
}

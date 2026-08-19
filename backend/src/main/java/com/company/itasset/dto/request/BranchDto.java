package com.company.itasset.dto.request;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
@Data
public class BranchDto {
    @NotBlank(message = "Branch name is required") private String name;
    private String location;
    private String city;
    private String country;
    private String contactEmail;
}

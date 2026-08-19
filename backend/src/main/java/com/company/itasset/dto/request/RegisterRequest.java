package com.company.itasset.dto.request;
import com.company.itasset.entity.enums.Role;
import jakarta.validation.constraints.*;
import lombok.Data;
@Data
public class RegisterRequest {
    @NotBlank @Size(min = 2, max = 100) private String name;
    @Email @NotBlank private String email;
    @NotBlank @Size(min = 8) @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$",
        message = "Password must contain uppercase, lowercase, and digit")
    private String password;
    private Role role = Role.EMPLOYEE;
    private Long branchId;
    private String phoneNumber;
    private String employeeId;
}

package com.company.itasset.dto.response;

import com.company.itasset.entity.enums.Role;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class UserSummary {
    private Long   id;
    private String name;
    private String email;
    private String role;           // serialized as plain string for frontend
    private boolean active;
    private String phoneNumber;
    private String employeeId;
    // Branch fields flattened — no lazy loading, no circular reference
    private Long   branchId;
    private String branchName;
    private String branchCity;
    private String branchCountry;

    /** Constructor called by JPQL — role comes in as the enum, converted to its name for JSON. */
    public UserSummary(Long id, String name, String email, Role role, boolean active,
                       String phoneNumber, String employeeId,
                       Long branchId, String branchName, String branchCity, String branchCountry) {
        this.id          = id;
        this.name        = name;
        this.email       = email;
        this.role        = role != null ? role.name() : null;
        this.active      = active;
        this.phoneNumber = phoneNumber;
        this.employeeId  = employeeId;
        this.branchId    = branchId;
        this.branchName  = branchName;
        this.branchCity  = branchCity;
        this.branchCountry = branchCountry;
    }
}

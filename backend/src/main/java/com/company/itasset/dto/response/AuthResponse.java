package com.company.itasset.dto.response;
import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

/**
 * token/refreshToken are @JsonIgnore — they never reach the response body.
 * The controller reads them off this object to set httpOnly cookies instead;
 * the JWTs themselves must never be visible to frontend JS.
 */
@Data @Builder @AllArgsConstructor
public class AuthResponse {
    @JsonIgnore
    private String token;
    @JsonIgnore
    private String refreshToken;
    private String tokenType;
    private Long userId;
    private String name;
    private String email;
    private String role;
    private Long branchId;
    private String branchName;
}

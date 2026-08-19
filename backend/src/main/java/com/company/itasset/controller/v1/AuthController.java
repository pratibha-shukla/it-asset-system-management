package com.company.itasset.controller.v1;

import com.company.itasset.dto.request.LoginRequest;
import com.company.itasset.dto.request.RegisterRequest;
import com.company.itasset.dto.response.ApiResponse;
import com.company.itasset.dto.response.AuthResponse;
import com.company.itasset.entity.User;
import com.company.itasset.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private static final String ACCESS_COOKIE  = "access_token";
    private static final String REFRESH_COOKIE = "refresh_token";
    private static final String REFRESH_COOKIE_PATH = "/api/v1/auth";

    private final AuthService authService;

    @Value("${app.cookie.secure:false}")
    private boolean cookieSecure;

    @Value("${jwt.expiration-ms}")
    private long jwtExpirationMs;

    @Value("${jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest req) {
        AuthResponse auth = authService.login(req);
        return withAuthCookies(auth).body(ApiResponse.success(auth, "Login successful"));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> register(@Valid @RequestBody RegisterRequest req) {
        User user = authService.register(req);
        return ResponseEntity.ok(ApiResponse.success("User created: " + user.getId(), "Registration successful"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken) {
        AuthResponse auth = authService.refreshToken(refreshToken);
        return withAuthCookies(auth).body(ApiResponse.success(auth, "Token refreshed"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<String>> logout() {
        ResponseCookie expiredAccess = ResponseCookie.from(ACCESS_COOKIE, "")
                .httpOnly(true).secure(cookieSecure).sameSite("Lax").path("/").maxAge(0).build();
        ResponseCookie expiredRefresh = ResponseCookie.from(REFRESH_COOKIE, "")
                .httpOnly(true).secure(cookieSecure).sameSite("Lax").path(REFRESH_COOKIE_PATH).maxAge(0).build();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, expiredAccess.toString())
                .header(HttpHeaders.SET_COOKIE, expiredRefresh.toString())
                .body(ApiResponse.success("OK", "Logged out"));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthResponse>> me(Authentication authentication) {
        AuthResponse profile = authService.getCurrentUser(authentication.getName());
        return ResponseEntity.ok(ApiResponse.success(profile, "OK"));
    }

    /** Builds the two Set-Cookie headers shared by /login and /refresh. */
    private ResponseEntity.BodyBuilder withAuthCookies(AuthResponse auth) {
        ResponseCookie accessCookie = ResponseCookie.from(ACCESS_COOKIE, auth.getToken())
                .httpOnly(true).secure(cookieSecure).sameSite("Lax").path("/")
                .maxAge(jwtExpirationMs / 1000).build();
        ResponseCookie refreshCookie = ResponseCookie.from(REFRESH_COOKIE, auth.getRefreshToken())
                .httpOnly(true).secure(cookieSecure).sameSite("Lax").path(REFRESH_COOKIE_PATH)
                .maxAge(refreshExpirationMs / 1000).build();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, accessCookie.toString())
                .header(HttpHeaders.SET_COOKIE, refreshCookie.toString());
    }
}

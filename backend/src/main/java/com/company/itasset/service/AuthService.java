package com.company.itasset.service;

import com.company.itasset.dto.request.LoginRequest;
import com.company.itasset.dto.request.RegisterRequest;
import com.company.itasset.dto.response.AuthResponse;
import com.company.itasset.entity.*;
import com.company.itasset.exception.ResourceNotFoundException;
import com.company.itasset.exception.ValidationException;
import com.company.itasset.repository.*;
import com.company.itasset.security.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final BranchRepository branchRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final AuditLogService auditLogService;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String accessToken  = tokenProvider.generateToken(authentication);
        String refreshToken = tokenProvider.generateRefreshToken(userDetails.getEmail());
        User user = userRepository.findWithBranchById(userDetails.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", userDetails.getId()));
        auditLogService.log("LOGIN", "User", user.getId(), user.getEmail(), "User logged in");
        return AuthResponse.builder()
                .token(accessToken).refreshToken(refreshToken).tokenType("Bearer")
                .userId(user.getId()).name(user.getName()).email(user.getEmail())
                .role(user.getRole().name())
                .branchId(user.getBranch() != null ? user.getBranch().getId() : null)
                .branchName(user.getBranch() != null ? user.getBranch().getName() : null)
                .build();
    }

    @Transactional
    public User register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail()))
            throw new ValidationException("email", "Email is already registered");
        Branch branch = null;
        if (request.getBranchId() != null) {
            branch = branchRepository.findById(request.getBranchId())
                    .orElseThrow(() -> new ResourceNotFoundException("Branch", "id", request.getBranchId()));
        }
        User user = User.builder()
                .name(request.getName()).email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(request.getRole()).branch(branch)
                .phoneNumber(request.getPhoneNumber()).employeeId(request.getEmployeeId())
                .active(true)   // must be true — UserDetailsServiceImpl rejects inactive users
                .build();
        return userRepository.save(user);
    }

    /**
     * Used by GET /auth/me — the frontend can no longer read the httpOnly
     * cookie itself, so it asks the server "who am I" on boot instead.
     */
    public AuthResponse getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return AuthResponse.builder()
                .tokenType("Bearer").userId(user.getId())
                .name(user.getName()).email(user.getEmail()).role(user.getRole().name())
                .branchId(user.getBranch() != null ? user.getBranch().getId() : null)
                .branchName(user.getBranch() != null ? user.getBranch().getName() : null)
                .build();
    }

    @Transactional
    public AuthResponse refreshToken(String refreshToken) {
        if (!tokenProvider.validateToken(refreshToken))
            throw new ValidationException("token", "Invalid or expired refresh token");
        String email = tokenProvider.getEmailFromToken(refreshToken);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        Authentication auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
        return AuthResponse.builder()
                .token(tokenProvider.generateToken(auth))
                .refreshToken(tokenProvider.generateRefreshToken(email))
                .tokenType("Bearer").userId(user.getId())
                .name(user.getName()).email(user.getEmail()).role(user.getRole().name())
                .build();
    }
}

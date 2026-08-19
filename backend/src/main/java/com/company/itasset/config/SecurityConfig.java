package com.company.itasset.config;

import com.company.itasset.security.JwtAuthenticationFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.session.NullAuthenticatedSessionStrategy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                // The JWT now lives in an httpOnly cookie sent automatically by the
                // browser, so CSRF protection is needed (a Bearer-token-in-header
                // design was naturally immune to this; a cookie-based one isn't).
                // Cookie-based double-submit repository, matching axios's built-in
                // default XSRF-TOKEN cookie / X-XSRF-TOKEN header handling.
                // Both CsrfTokenRequestAttributeHandler and the default
                // XorCsrfTokenRequestAttributeHandler resolve the token LAZILY — the
                // cookie is only actually written once something calls
                // CsrfToken#getToken(), which a server-rendered view (Thymeleaf, etc.)
                // does automatically but a pure REST API never does. CsrfCookieFilter
                // below (Spring's own documented fix for SPA clients) forces that
                // resolution on every request so the cookie is always present.
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                        // No session exists yet at login/register time, and forcing a
                        // CSRF pre-flight before the very first login would require an
                        // extra round trip on a fresh browser session.
                        .ignoringRequestMatchers("/api/v1/auth/login", "/api/v1/auth/register")
                        // CsrfConfigurer registers a CsrfAuthenticationStrategy on the
                        // session-management filter by default, which deletes and
                        // regenerates the XSRF-TOKEN cookie on every "new" login it
                        // detects. With STATELESS sessions there's no persisted
                        // SecurityContext to compare against, so every single
                        // authenticated request looks like a brand-new login — the
                        // cookie gets wiped after every request, breaking the CSRF
                        // double-submit pattern on the very next mutating call.
                        // NullAuthenticatedSessionStrategy is a no-op, appropriate for
                        // a fully stateless JWT/cookie auth model. (This must be set
                        // here, on CsrfConfigurer itself — CsrfConfigurer.configure()
                        // unconditionally installs its own strategy on
                        // SessionManagementConfigurer regardless of what's set via
                        // .sessionManagement(...).sessionAuthenticationStrategy(...).)
                        .sessionAuthenticationStrategy(new NullAuthenticatedSessionStrategy())
                )
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // /me requires an already-valid cookie (JwtAuthenticationFilter
                        // populates the SecurityContext from it) — it must NOT be
                        // permitAll, or an unauthenticated call would NPE on a null
                        // Authentication instead of cleanly 401ing.
                        .requestMatchers("/api/v1/auth/login", "/api/v1/auth/register",
                                          "/api/v1/auth/refresh", "/api/v1/auth/logout").permitAll()
                        .requestMatchers("/api/v1/auth/me").authenticated()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        // SSE — any authenticated user can hold an event-stream connection
                        .requestMatchers("/api/v1/sse/**").hasAnyRole("ADMIN", "MANAGER", "EMPLOYEE")
                        .requestMatchers(HttpMethod.GET, "/api/v1/assets/**").hasAnyRole("ADMIN", "MANAGER", "EMPLOYEE")
                        .requestMatchers(HttpMethod.GET, "/api/v1/branches/**").hasAnyRole("ADMIN", "MANAGER", "EMPLOYEE")
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST,   "/api/v1/assets/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT,    "/api/v1/assets/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/assets/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/branches/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT,  "/api/v1/branches/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/v1/requests/**").hasAnyRole("ADMIN", "MANAGER", "EMPLOYEE")
                        .requestMatchers(HttpMethod.GET,  "/api/v1/requests/**").hasAnyRole("ADMIN", "MANAGER", "EMPLOYEE")
                        .requestMatchers("/api/v1/requests/*/approve").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers("/api/v1/requests/*/reject").hasAnyRole("ADMIN", "MANAGER")
                        .requestMatchers("/api/v1/manager/**").hasAnyRole("ADMIN", "MANAGER")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class)
                .build();
    }

    /**
     * Forces the deferred CsrfToken to resolve on every request so
     * CookieCsrfTokenRepository actually writes the XSRF-TOKEN cookie — see the
     * comment on .csrf(...) above. This is Spring Security's own documented
     * pattern for SPA clients (no server-rendered view ever calls getToken()
     * on its own).
     */
    private static final class CsrfCookieFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                         FilterChain filterChain) throws ServletException, IOException {
            CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            if (csrfToken != null) {
                csrfToken.getToken();
            }
            filterChain.doFilter(request, response);
        }
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "http://localhost:3000",//A common default port for Create-React-App projects (probably a leftover/just-in-case entry)
                "http://localhost:5173",//Your React web frontend's default Vite port
                "http://localhost:5174",
                "http://localhost:8081", // add this
                "http://localhost:8082"    // Your React Native mobile app, running in browser via Expo/Metro
        ));
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS","PATCH"));
        config.setAllowedHeaders(List.of("Authorization","Content-Type","Accept"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}

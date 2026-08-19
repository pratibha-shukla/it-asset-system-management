package com.company.gateway;

import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * GatewayConfig.java — API Gateway (port 8080)
 *
 * Responsibilities:
 *  1. JWT Authentication — validate token ONCE here, forward user info to services
 *  2. Logging — log every request with timing
 *  3. Fallback — return friendly error when a service is down (circuit breaker)
 *
 * Microservices (8081, 8082 etc.) trust the gateway.
 * They don't re-validate JWT — gateway adds X-User-Id header instead.
 */
@Configuration
public class GatewayConfig {

    /**
     * Global filter — runs on EVERY request before routing.
     * Validates JWT from httpOnly cookie, adds user info as headers.
     */
    @Bean
    @Order(1)
    public GlobalFilter jwtAuthFilter(JwtUtil jwtUtil) {
        return (exchange, chain) -> {
            String path = exchange.getRequest().getPath().toString();

            // Public paths — skip auth
            if (path.startsWith("/api/v1/auth/login") ||
                path.startsWith("/api/v1/auth/register")) {
                return chain.filter(exchange);
            }

            // Extract JWT from httpOnly cookie
            String token = extractTokenFromCookie(exchange);
            if (token == null) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            // Validate token
            if (!jwtUtil.isValid(token)) {
                exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                return exchange.getResponse().setComplete();
            }

            // Add user info as headers — downstream services read these
            // They never see the JWT itself
            ServerWebExchange mutated = exchange.mutate()
                .request(r -> r
                    .header("X-User-Id",    jwtUtil.getUserId(token))
                    .header("X-User-Email", jwtUtil.getEmail(token))
                    .header("X-User-Role",  jwtUtil.getRole(token))
                )
                .build();

            return chain.filter(mutated);
        };
    }

    /**
     * Global logging filter — logs method, path, and response time.
     */
    @Bean
    @Order(2)
    public GlobalFilter loggingFilter() {
        return (exchange, chain) -> {
            long start = System.currentTimeMillis();
            String path = exchange.getRequest().getPath().toString();
            String method = exchange.getRequest().getMethod().name();

            return chain.filter(exchange).then(Mono.fromRunnable(() -> {
                long ms = System.currentTimeMillis() - start;
                int status = exchange.getResponse().getStatusCode().value();
                System.out.printf("[GATEWAY] %s %s → %d (%dms)%n", method, path, status, ms);
            }));
        };
    }

    private String extractTokenFromCookie(ServerWebExchange exchange) {
        return exchange.getRequest().getCookies()
            .getFirst("jwt") != null
            ? exchange.getRequest().getCookies().getFirst("jwt").getValue()
            : null;
    }
}

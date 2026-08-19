package com.company.gateway;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * FallbackController — Circuit Breaker fallback responses.
 *
 * When a microservice is DOWN and circuit breaker is OPEN,
 * gateway calls these endpoints instead of retrying the dead service.
 * Returns a friendly error instead of hanging for 30 seconds.
 */
@RestController
@RequestMapping("/fallback")
public class FallbackController {

    // Asset Service (8081) is down
    @GetMapping("/assets")
    public ResponseEntity<Map<String,String>> assetFallback() {
        return ResponseEntity.status(503).body(Map.of(
            "error",   "Asset service is temporarily unavailable",
            "message", "Please try again in a few minutes"
        ));
    }

    // Maintenance Service (8082) is down
    @GetMapping("/maintenance")
    public ResponseEntity<Map<String,String>> maintenanceFallback() {
        return ResponseEntity.status(503).body(Map.of(
            "error",   "Maintenance service is temporarily unavailable",
            "message", "Please try again in a few minutes"
        ));
    }
}

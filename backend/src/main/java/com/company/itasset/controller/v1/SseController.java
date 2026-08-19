package com.company.itasset.controller.v1;

import com.company.itasset.service.SseEmitterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

/**
 * Persistent Telemetry Streams:
 *   Provides a single SSE endpoint that each authenticated browser tab subscribes to.
 *   Events flow: Kafka topic → KafkaConsumerService → SseEmitterRegistry → this endpoint → browser.
 *
 *   Why SSE over WebSocket:
 *   - Unidirectional (server→client) fits the alert use-case perfectly.
 *   - Works through HTTP/2 multiplexing — no WS upgrade handshake.
 *   - Automatic reconnect via EventSource browser API.
 *   - Easier to secure with existing JWT filter (HTTP header based).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/sse")
@RequiredArgsConstructor
public class SseController {

    private final SseEmitterRegistry registry;

    /**
     * Subscribe to the real-time event stream.
     * The client keeps this connection open; events arrive as text/event-stream chunks.
     */
    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@AuthenticationPrincipal UserDetails principal) {
        // Client id = username + random suffix so the same user can have multiple tabs
        String clientId = (principal != null ? principal.getUsername() : "anon")
                          + "-" + UUID.randomUUID().toString().substring(0, 8);
        log.info("SSE subscribe — clientId={} totalClients={}", clientId, registry.getConnectedCount() + 1);
        return registry.register(clientId);
    }

    /** Heartbeat every 25 s — prevents proxies from closing idle connections. */
    @Scheduled(fixedDelay = 25_000)
    public void heartbeat() {
        if (registry.getConnectedCount() > 0) {
            registry.sendHeartbeat();
        }
    }
}

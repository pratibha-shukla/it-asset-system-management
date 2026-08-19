package com.company.itasset.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Persistent Telemetry Streams:
 *   In-memory registry of active SSE connections.  Each authenticated client holds
 *   one long-lived emitter.  Kafka consumer threads call {@link #broadcast} to push
 *   infrastructure alerts without any API polling overhead.
 *
 *   Thread-safety: ConcurrentHashMap — multiple Kafka consumer threads + HTTP threads
 *   can call broadcast / remove simultaneously without locking.
 */
@Slf4j
@Service
public class SseEmitterRegistry {

    /** Timeout: 30 min — client reconnects automatically via EventSource retry */
    private static final long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L;

    private final Map<String, SseEmitter> emitters = new ConcurrentHashMap<>();

    /** Called from SseController when a client subscribes. */
    public SseEmitter register(String clientId) {
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);

        emitter.onCompletion(() -> {
            emitters.remove(clientId);
            log.debug("SSE completed — clientId={}", clientId);
        });
        emitter.onTimeout(() -> {
            emitters.remove(clientId);
            log.debug("SSE timeout — clientId={}", clientId);
        });
        emitter.onError(ex -> {
            emitters.remove(clientId);
            log.debug("SSE error — clientId={}: {}", clientId, ex.getMessage());
        });

        emitters.put(clientId, emitter);
        log.debug("SSE registered — clientId={} totalClients={}", clientId, emitters.size());
        return emitter;
    }

    /**
     * Broadcast an event to ALL connected clients.
     * Called from Kafka consumer thread — must not block.
     */
    public void broadcast(String eventType, String message) {
        if (emitters.isEmpty()) return;

        String eventId = UUID.randomUUID().toString();
        emitters.forEach((clientId, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                        .id(eventId)
                        .name(eventType)
                        .data(message));
            } catch (IOException | IllegalStateException ex) {
                // Client disconnected — remove from registry
                emitters.remove(clientId);
                log.debug("Removed stale SSE emitter — clientId={}", clientId);
            }
        });
    }

    /** Send a heartbeat to prevent proxy/loadbalancer connection timeouts. */
    public void sendHeartbeat() {
        emitters.forEach((clientId, emitter) -> {
            try {
                emitter.send(SseEmitter.event().name("heartbeat").data("ping"));
            } catch (IOException | IllegalStateException ex) {
                emitters.remove(clientId);
            }
        });
    }

    public int getConnectedCount() { return emitters.size(); }
}

package com.company.itasset.service;

import com.company.itasset.dto.event.AssetEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Service;

/**
 * Persistent Telemetry Streams:
 *   Consumes events from both asset and request topics.  For each event it:
 *     1. Emits an SSE notification to all connected browser clients via SseEmitterRegistry.
 *     2. Can be extended to feed analytics aggregators, alerting engines, or audit stores.
 *
 *   The consumer group {@code it-asset-management} ensures each event is processed
 *   exactly once per consumer group, enabling horizontal scaling of backend replicas.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaConsumerService {

    private final SseEmitterRegistry sseRegistry;

    @KafkaListener(
        topics      = {"${spring.kafka.topics.asset-events:it.asset.events}",
                       "${spring.kafka.topics.request-events:it.request.events}"},
        groupId     = "${spring.kafka.consumer.group-id:it-asset-management}",
        concurrency = "3"    // 3 threads → up to 3 partitions consumed in parallel
    )
    public void onEvent(AssetEvent event,
                        @Header(KafkaHeaders.RECEIVED_TOPIC) String topic,
                        @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
                        @Header(KafkaHeaders.OFFSET) long offset) {

        log.debug("Consumed event — topic={} partition={} offset={} type={} entityId={} correlationId={}",
                topic, partition, offset,
                event.getEventType(), event.getEntityId(), event.getCorrelationId());

        // Bridge to SSE layer — push notification to all authenticated browser clients
        String message = buildNotificationMessage(event);
        sseRegistry.broadcast(event.getEventType(), message);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private String buildNotificationMessage(AssetEvent event) {
        return switch (event.getEventType()) {
            case "ASSET_CREATED"      -> "New asset added: "         + event.getEntityName();
            case "ASSET_UPDATED"      -> "Asset updated: "           + event.getEntityName();
            case "ASSET_ASSIGNED"     -> "Asset assigned: "          + event.getEntityName();
            case "ASSET_UNASSIGNED"   -> "Asset unassigned: "        + event.getEntityName();
            case "ASSET_DELETED"      -> "Asset removed: "           + event.getEntityName();
            case "REQUEST_SUBMITTED"  -> "New request submitted for " + event.getEntityName();
            case "REQUEST_APPROVED"   -> "Request approved: "        + event.getEntityName();
            case "REQUEST_REJECTED"   -> "Request rejected: "        + event.getEntityName();
            default                   -> event.getEventType() + ": " + event.getEntityName();
        };
    }
}

package com.company.itasset.service;

import com.company.itasset.dto.event.AssetEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.CompletableFuture;

/**
 * Non-Blocking Mutation Processing:
 *   All Kafka publishes happen on a dedicated async executor so the HTTP thread
 *   is never blocked by broker round-trips.  Fire-and-forget with callback logging.
 *
 * Persistent Telemetry Streams:
 *   Events land on durable Kafka topics (retention configurable via broker policy).
 *   Downstream consumers — alert router, audit aggregator, analytics pipeline — read
 *   at their own pace without impacting write throughput.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KafkaProducerService {

    private final KafkaTemplate<String, AssetEvent> kafkaTemplate;

    @Value("${spring.kafka.topics.asset-events:it.asset.events}")
    private String assetTopic;

    @Value("${spring.kafka.topics.request-events:it.request.events}")
    private String requestTopic;

    // ── Public API ──────────────────────────────────────────────────────────

    @Async
    public void publishAssetEvent(String eventType, Long assetId, String assetName, String actorEmail) {
        publish(assetTopic, buildEvent(eventType, assetId, assetName, actorEmail, null));
    }

    @Async
    public void publishRequestEvent(String eventType, Long requestId, String productName,
                                    String actorEmail, String details) {
        publish(requestTopic, buildEvent(eventType, requestId, productName, actorEmail, details));
    }

    // ── Internals ───────────────────────────────────────────────────────────

    private AssetEvent buildEvent(String type, Long id, String name, String actor, String details) {
        return AssetEvent.builder()
                .correlationId(UUID.randomUUID().toString())
                .eventType(type)
                .entityId(id)
                .entityName(name)
                .actorEmail(actor)
                .details(details)
                .build();
    }

    private void publish(String topic, AssetEvent event) {
        // Use entity id as the partition key — guarantees ordering per asset
        CompletableFuture<SendResult<String, AssetEvent>> future =
                kafkaTemplate.send(topic, String.valueOf(event.getEntityId()), event);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                log.error("Kafka publish failed — topic={} eventType={} entityId={}: {}",
                        topic, event.getEventType(), event.getEntityId(), ex.getMessage());
            } else {
                log.debug("Kafka publish OK — topic={} partition={} offset={} correlationId={}",
                        topic,
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset(),
                        event.getCorrelationId());
            }
        });
    }
}

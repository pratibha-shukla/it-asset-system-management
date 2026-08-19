package com.company.itasset.dto.event;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * Immutable domain event published to the Kafka topic {@code it.asset.events}.
 *
 * Design rationale (State Architecture Isolation):
 *   - Decoupled from JPA entities — consumers don't need entity classes on the classpath.
 *   - All timestamps are UTC Instants — eliminates timezone skew between services.
 *   - eventType is a free-form string (not an enum) so new event types don't require
 *     a consumer redeployment.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssetEvent {

    /** Correlation id for distributed tracing across the telemetry pipeline. */
    private String correlationId;

    /**
     * Domain event type — consumers route on this field.
     * Known values: ASSET_CREATED, ASSET_UPDATED, ASSET_ASSIGNED, ASSET_UNASSIGNED,
     *               ASSET_DELETED, REQUEST_SUBMITTED, REQUEST_APPROVED, REQUEST_REJECTED.
     */
    private String eventType;

    private Long   entityId;
    private String entityName;   // human-readable label for notification messages
    private String actorEmail;   // who triggered the event (JWT subject)
    private String details;      // optional extra payload (serialized as JSON string)

    @Builder.Default
    private Instant occurredAt = Instant.now();
}

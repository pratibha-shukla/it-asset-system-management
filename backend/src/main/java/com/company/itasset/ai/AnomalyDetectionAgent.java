package com.company.itasset.ai;

import com.company.itasset.entity.Asset;
import com.company.itasset.entity.enums.AssetStatus;
import com.company.itasset.repository.AssetRepository;
import com.company.itasset.service.KafkaProducerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Agentic RAG — Autonomous Anomaly Detection Agent
 *
 * This is the "agentic" part of the AI stack. Unlike the chatbot which
 * responds to questions, this agent acts autonomously on a schedule:
 *
 *   1. RETRIEVE  — Query assets assigned to inactive users (RAG: real data)
 *   2. REASON    — Decide: is this a compliance risk?
 *   3. ACT       — Publish alert to Kafka → IT Admin gets notified
 *
 * A2A (Agent-to-Agent Collaboration):
 *   This IT Asset Agent publishes to the existing Kafka topic "it.asset.events".
 *   Any downstream agent or service (notification service, HR system, audit logger)
 *   subscribes independently — agents collaborate without direct coupling.
 *   Your existing KafkaConsumerService already listens on this topic.
 *
 * Schedule: runs every night at midnight (cron = "0 0 0 * * *").
 * @EnableScheduling is already set in ItAssetApplication.
 *
 * This turns a 3-month blind spot (manually finding unreturned assets)
 * into a 24-hour maximum detection window — automatically.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnomalyDetectionAgent {

    private final AssetRepository      assetRepository;
    private final KafkaProducerService kafkaProducerService;
    private final LlmOpsLogger         llmOpsLogger;

    /**
     * Nightly autonomous run — every day at midnight.
     * No human trigger needed. Agent runs, checks, acts.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional(readOnly = true)
    public void runNightlyAnomalyDetection() {
        long start = System.currentTimeMillis();
        log.info("[AgentRAG] Nightly anomaly detection started...");

        List<Asset> anomalies = detectAnomalies();
        int count = anomalies.size();

        if (count > 0) {
            log.warn("[AgentRAG] Found {} compliance anomalies — publishing A2A alerts", count);
            anomalies.forEach(this::handleAnomaly);
        } else {
            log.info("[AgentRAG] All clear — no unreturned assets from inactive users");
        }

        // LLMOps: track agent run for monitoring dashboard
        llmOpsLogger.logAgentRun("AnomalyDetectionAgent", count,
                System.currentTimeMillis() - start);
    }

    /**
     * RAG retrieval step — cross-reference asset assignments with user status.
     * "Grounding in real data": pulls from PostgreSQL, not from AI memory.
     *
     * Anomaly = asset is ASSIGNED but the assigned user is inactive (deactivated).
     * In your system, deactivating a user = the equivalent of HR marking them terminated.
     */
    private List<Asset> detectAnomalies() {
        return assetRepository.findAll().stream()
                .filter(asset ->
                        asset.getStatus() == AssetStatus.ASSIGNED
                     && asset.getAssignedTo() != null
                     && !asset.getAssignedTo().isActive())   // inactive user = compliance risk
                .collect(Collectors.toList());
    }

    /**
     * Agentic action step — for each anomaly, publish an A2A event to Kafka.
     *
     * A2A design:
     *   - This agent (IT Asset Agent) publishes event type "COMPLIANCE_RISK_DETECTED"
     *   - KafkaConsumerService (already running) receives it
     *   - NotificationService can trigger IT Admin alert
     *   - HR integration agent (future) can subscribe to same topic
     *   - All agents are decoupled — no direct calls between them
     */
    private void handleAnomaly(Asset asset) {
        String employeeName  = asset.getAssignedTo().getName();
        String employeeEmail = asset.getAssignedTo().getEmail();
        String assetName     = asset.getName();

        String details = String.format(
                "COMPLIANCE RISK: Asset '%s' (ID: %d, Type: %s) is still assigned to " +
                "inactive user '%s' (%s). Immediate asset recovery required.",
                assetName, asset.getId(), asset.getType(), employeeName, employeeEmail);

        // A2A: publish to existing Kafka asset-events topic
        // KafkaConsumerService subscribes and routes to NotificationService
        kafkaProducerService.publishAssetEvent(
                "COMPLIANCE_RISK_DETECTED",
                asset.getId(),
                assetName,
                "agent@itam-system.internal"   // agent identity for audit trail
        );

        // LLMOps: compliance audit trail
        llmOpsLogger.logComplianceFlag(employeeEmail, assetName);

        log.warn("[AgentRAG][A2A] Compliance alert published — employee={} asset=[{}]{}",
                employeeEmail, asset.getId(), assetName);
    }
}

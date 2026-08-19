package com.company.itasset.ai;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * LLMOps Logger — Production AI Monitoring
 *
 * "Own the lifecycle of AI models in production" means tracking every
 * AI interaction so you can answer: Is the model reliable? Is it fast?
 * Is it giving safe answers? When did something go wrong?
 *
 * This logger establishes the observability pipeline:
 *   - Every chat query is logged with latency + model version
 *   - Slow responses (>5s) trigger a warning alert
 *   - Anomaly detection runs are tracked with issue counts
 *   - Compliance flags create an audit trail
 *
 * MLOps extension:
 *   Logs are written to SLF4J (captured by your existing logging config).
 *   For a full MLOps pipeline, plug in: ELK stack, Datadog, MLflow, or
 *   Prometheus metrics — all read from these structured log entries.
 */
@Slf4j
@Service
public class LlmOpsLogger {

    private static final long LATENCY_WARN_THRESHOLD_MS = 5_000;
    private static final String MODEL_VERSION = "claude-opus-4-8";

    /**
     * Log every AI chat interaction.
     * Captures: who asked, what they asked, how long it took, which model answered.
     */
    public void logChatInteraction(String question, String answer, long latencyMs) {
        // Structured log — easy to parse with ELK or Datadog
        log.info("[LLMOps][CHAT] model={} latency={}ms question_length={} answer_length={}",
                MODEL_VERSION, latencyMs, question.length(), answer.length());

        // Latency alert — if response takes more than 5 seconds, flag it
        if (latencyMs > LATENCY_WARN_THRESHOLD_MS) {
            log.warn("[LLMOps][LATENCY_ALERT] Response took {}ms — above {}ms threshold. question='{}'",
                    latencyMs, LATENCY_WARN_THRESHOLD_MS,
                    question.length() > 80 ? question.substring(0, 80) + "..." : question);
        }
    }

    /**
     * Log every agentic anomaly detection run.
     * Answers: "How often does the agent find issues? Is it running on time?"
     */
    public void logAgentRun(String agentName, int issuesFound, long durationMs) {
        if (issuesFound > 0) {
            log.warn("[LLMOps][AGENT_RUN] agent={} issues_found={} duration={}ms timestamp={}",
                    agentName, issuesFound, durationMs, Instant.now());
        } else {
            log.info("[LLMOps][AGENT_RUN] agent={} issues_found=0 duration={}ms timestamp={}",
                    agentName, durationMs, Instant.now());
        }
    }

    /**
     * Log compliance flags raised by the anomaly detection agent.
     * Full audit trail — required for enterprise compliance (SOX, HIPAA, ISO 27001).
     */
    public void logComplianceFlag(String employeeEmail, String assetName) {
        log.warn("[LLMOps][COMPLIANCE_FLAG] Unreturned asset detected — employee={} asset={} flagged_at={}",
                employeeEmail, assetName, Instant.now());
    }

    /**
     * Log AI errors — when Claude fails to respond or returns an error.
     * Feeds into the reliability metric: what % of queries succeed?
     */
    public void logError(String question, String errorMessage) {
        log.error("[LLMOps][AI_ERROR] model={} error='{}' question_preview='{}'",
                MODEL_VERSION, errorMessage,
                question.length() > 60 ? question.substring(0, 60) + "..." : question);
    }
}

package com.company.itasset.service;

import com.company.itasset.ai.AssetContextService;
import com.company.itasset.ai.LlmOpsLogger;
import com.company.itasset.ai.McpToolHandler;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

/**
 * Chatbot Service — RAG + MCP + LLMOps pipeline (powered by Google Gemini)
 *
 * Full AI pipeline:
 *   1. RAG  — AssetContextService fetches live PostgreSQL data as grounded context
 *   2. MCP  — McpToolHandler injects structured tool definitions the model reasons about
 *   3. LLM  — Google Gemini answers ONLY from the provided context (no hallucination)
 *   4. OPS  — LlmOpsLogger records every query for reliability + latency monitoring
 *
 * Uses Google Gemini free tier — no credit card required.
 * No extra SDK needed: plain Java HttpClient + Jackson (already in Spring Boot).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ChatbotService {

    private final AssetContextService assetContextService;
    private final McpToolHandler      mcpToolHandler;
    private final LlmOpsLogger        llmOpsLogger;
    private final ObjectMapper        objectMapper;

    @Value("${google.gemini.api-key}")
    private String geminiApiKey;

    @Value("${google.gemini.model}")
    private String geminiModel;

    private static final String GEMINI_BASE_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";

    /**
     * Process a user question through the full RAG + Gemini pipeline.
     *
     * @param question  Natural language question from the user
     * @return          AI answer grounded in real ITAM database data
     */
    public String processQuery(String question) {
        long start = System.currentTimeMillis();

        try {
            // Step 1 — RAG: fetch live asset data from PostgreSQL
            String assetContext = assetContextService.buildContext();

            // Step 2 — MCP: inject tool definitions the model can reference
            String toolDefs = mcpToolHandler.getToolDefinitions();

            // Step 3 — Build system prompt with grounded context
            String systemPrompt = buildSystemPrompt(assetContext, toolDefs);

            // Step 4 — Call Gemini
            String answer = callGemini(systemPrompt, question);

            // Step 5 — LLMOps: log for monitoring and reliability tracking
            llmOpsLogger.logChatInteraction(question, answer,
                    System.currentTimeMillis() - start);

            return answer;

        } catch (Exception e) {
            llmOpsLogger.logError(question, e.getMessage());
            log.error("[LLMOps] Chat pipeline error: {}", e.getMessage(), e);
            return "I'm sorry, the AI assistant is temporarily unavailable. Please try again shortly.";
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private String buildSystemPrompt(String assetContext, String toolDefs) {
        return """
                You are an intelligent IT Asset Management assistant for an enterprise platform.

                RULES — follow these strictly:
                1. Answer ONLY using the asset data provided below. Never invent asset details.
                2. If the data doesn't contain the answer, say "I don't have that information."
                3. For compliance risks (inactive users holding assets), always highlight them clearly with ⚠.
                4. Be concise and direct. Use bullet points for lists of assets.
                5. When relevant, mention which MCP tool would retrieve additional data.

                %s

                %s
                """.formatted(assetContext, toolDefs);
    }

    /**
     * Calls Google Gemini REST API.
     *
     * Request format:
     *   POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=KEY
     *   {
     *     "system_instruction": { "parts": [{ "text": "..." }] },
     *     "contents": [{ "role": "user", "parts": [{ "text": "..." }] }],
     *     "generationConfig": { "maxOutputTokens": 1024 }
     *   }
     *
     * Response: candidates[0].content.parts[0].text
     */
    private String callGemini(String systemPrompt, String question) throws Exception {
        String url = String.format(GEMINI_BASE_URL, geminiModel);

        // Build request body
        ObjectNode body = objectMapper.createObjectNode();

        // System instruction
        ObjectNode systemInstruction = objectMapper.createObjectNode();
        ArrayNode sysParts = objectMapper.createArrayNode();
        sysParts.add(objectMapper.createObjectNode().put("text", systemPrompt));
        systemInstruction.set("parts", sysParts);
        body.set("system_instruction", systemInstruction);

        // User message
        ArrayNode contents = objectMapper.createArrayNode();
        ObjectNode userContent = objectMapper.createObjectNode();
        userContent.put("role", "user");
        ArrayNode userParts = objectMapper.createArrayNode();
        userParts.add(objectMapper.createObjectNode().put("text", question));
        userContent.set("parts", userParts);
        contents.add(userContent);
        body.set("contents", contents);

        // Generation config
        ObjectNode genConfig = objectMapper.createObjectNode();
        genConfig.put("maxOutputTokens", 1024);
        body.set("generationConfig", genConfig);

        String requestBody = objectMapper.writeValueAsString(body);

        // HTTP call
        HttpClient httpClient = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("X-goog-api-key", geminiApiKey)
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request,
                HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            log.error("[LLMOps] Gemini API error — status={} body={}",
                    response.statusCode(), response.body());
            throw new RuntimeException("Gemini API error " + response.statusCode()
                    + ": " + response.body());
        }

        // Parse: candidates[0].content.parts[0].text
        JsonNode root = objectMapper.readTree(response.body());
        String answer = root.path("candidates")
                            .path(0)
                            .path("content")
                            .path("parts")
                            .path(0)
                            .path("text")
                            .asText("");

        if (answer.isBlank()) {
            return "I'm sorry, I couldn't generate a response. Please try again.";
        }
        return answer;
    }
}

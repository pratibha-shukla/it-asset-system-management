# AI Features — IT Asset Management System

## Overview

This document explains the AI features added to the ITAM system, what each one does,
and how they work together. All features are production-ready and tied to the existing
Spring Boot + React stack.

---

## Architecture

```
User asks question (ChatWidget.jsx)
         ↓
ChatbotController  POST /api/v1/chatbot/query
         ↓
ChatbotService.processQuery()
         ↓
  ┌──────────────────────────────────────┐
  │  Step 1: RAG                         │
  │  AssetContextService.buildContext()  │
  │  → fetches live data from PostgreSQL │
  └──────────────┬───────────────────────┘
                 ↓
  ┌──────────────────────────────────────┐
  │  Step 2: MCP                         │
  │  McpToolHandler.getToolDefinitions() │
  │  → injects structured tool schema    │
  └──────────────┬───────────────────────┘
                 ↓
  ┌──────────────────────────────────────┐
  │  Step 3: LLM                         │
  │  Claude (Anthropic API)              │
  │  → answers from context only         │
  └──────────────┬───────────────────────┘
                 ↓
  ┌──────────────────────────────────────┐
  │  Step 4: LLMOps                      │
  │  LlmOpsLogger.logChatInteraction()   │
  │  → logs latency, model, query        │
  └──────────────────────────────────────┘
         ↓
  Answer returned to user

── Runs independently every night at midnight ──

AnomalyDetectionAgent (Agentic RAG + A2A)
  → Finds: ASSIGNED assets where user.active = false
  → Publishes: "COMPLIANCE_RISK_DETECTED" to Kafka
  → KafkaConsumerService receives → NotificationService alerts admin
```

---

## Files Added / Modified

### New — `backend/src/main/java/com/company/itasset/ai/`

| File | Purpose |
|------|---------|
| `AssetContextService.java` | RAG context builder — fetches live PostgreSQL data |
| `McpToolHandler.java` | MCP tool definitions + executor |
| `AnomalyDetectionAgent.java` | Nightly Agentic RAG + A2A scheduler |
| `LlmOpsLogger.java` | LLMOps monitoring + audit logging |

### Modified — existing files

| File | What changed |
|------|-------------|
| `service/ChatbotService.java` | Now uses RAG + MCP + LLMOps pipeline instead of basic asset fetch |
| `components/ChatWidget.jsx` | Added suggested questions + RAG/MCP badge in header |

---

## Feature Details

### 1. RAG (Retrieval-Augmented Generation)

**What it is:** Instead of Claude guessing, it reads your real database before answering.

**How it works in code:**
```java
// AssetContextService.java
public String buildContext() {
    // 1. Asset counts by status
    // 2. All assigned assets with employee names
    // 3. All available assets
    // 4. COMPLIANCE: assets held by inactive users  ← key business value
}
```

**Why it matters:** Without RAG, Claude might say "Laptops are generally assigned to IT staff."
With RAG, it says "There are 3 laptops available: [Laptop A in Branch NYC], [Laptop B in Branch LA]..."

---

### 2. MCP (Model Context Protocol)

**What it is:** A structured contract between Claude and your system.
Claude receives named "tools" and can reason about which one to use for a query.

**Tools defined:**
- `search_by_type(type)` — find all assets of a given type
- `search_by_status(status)` — find assets by status
- `get_asset_by_id(id)` — look up a specific asset
- `compliance_check()` — list all assets held by inactive users
- `asset_summary()` — counts by status and type

**Interview explanation:** "MCP is how I structured the AI's access to the system —
instead of giving Claude free-form database access, each action is a defined tool
with inputs and outputs. It's safe, auditable, and controllable."

---

### 3. Agentic RAG

**What it is:** The AI acts autonomously — no human triggers it.
It retrieves data, reasons about it, and takes action on its own.

**How it works:**
```
Every night at midnight (cron: 0 0 0 * * *)
  → Query: find assets with status=ASSIGNED where user.active=false
  → Reason: inactive user + still holding asset = compliance risk
  → Act: publish "COMPLIANCE_RISK_DETECTED" event to Kafka
  → Log: LlmOpsLogger records the run + issues found
```

**Business value:** Turns a 3-month blind spot (quarterly manual audit)
into a 24-hour maximum detection window. Automatic.

---

### 4. A2A (Agent-to-Agent Collaboration)

**What it is:** Agents communicate via Kafka without direct coupling.

**How it works in this system:**
```
IT Asset Agent (AnomalyDetectionAgent)
    → publishes "COMPLIANCE_RISK_DETECTED" to Kafka topic: it.asset.events
         ↓
KafkaConsumerService (already exists) receives the event
         ↓
NotificationService sends alert to IT Admin
```

**Design benefit:** The HR system, notification system, and audit logger
all subscribe to the same Kafka topic independently. Adding a new agent
(e.g. an HR integration) doesn't require changing any existing code.

---

### 5. LLMOps & MLOps

**What it is:** Running AI in production responsibly.
Monitoring, latency tracking, error logging, audit trails.

**What's logged:**
```
[LLMOps][CHAT]             model=... latency=...ms question_length=... answer_length=...
[LLMOps][LATENCY_ALERT]    Response took 6200ms — above 5000ms threshold
[LLMOps][AGENT_RUN]        agent=AnomalyDetectionAgent issues_found=3 duration=245ms
[LLMOps][COMPLIANCE_FLAG]  employee=john@company.com asset=Laptop-007
[LLMOps][AI_ERROR]         model=... error='...' question_preview='...'
```

**Interview explanation:** "LLMOps means I own the AI in production end-to-end.
I know when it's slow, when it fails, what users are asking, and whether
compliance flags are being raised. Without this, AI is a black box."

---

## How to Run

### Prerequisites (already configured in your project):
- `application.yml` already has `anthropic.api.key: ${ANTHROPIC_API_KEY}`
- `ItAssetApplication.java` already has `@EnableScheduling` and `@EnableAsync`
- `pom.xml` already has the Anthropic Java SDK

### Only step needed — set the API key:
```bash
# Windows (PowerShell)
$env:ANTHROPIC_API_KEY = "sk-ant-..."

# Or add to your .env / IDE run configuration:
ANTHROPIC_API_KEY=sk-ant-...
```

Then run the backend normally. The chatbot and nightly agent will work automatically.

---

## Example Questions to Ask

| Question | What Claude uses |
|----------|-----------------|
| "Which assets are available?" | RAG: buildAvailableAssets() |
| "Show me compliance risks" | RAG: buildInactiveUserAssets() |
| "How many laptops are assigned?" | RAG: asset summary + MCP: search_by_type |
| "What assets does John hold?" | RAG: assigned assets context |
| "Are there any maintenance items?" | MCP: search_by_status(MAINTENANCE) |

---

## Interview Story (use this)

**Setup:** "I added an AI layer on top of the existing ITAM system."

**RAG:** "Instead of Claude guessing, it reads from our actual PostgreSQL database
before every answer. This is RAG — the AI is grounded in real data."

**MCP:** "Claude has access to structured tools — search_by_type, compliance_check,
get_asset_by_id — through MCP. Each tool call is auditable and controlled."

**Agentic RAG:** "Every night at midnight, an autonomous agent runs — no human triggers it.
It finds assets still assigned to inactive users and publishes a Kafka event automatically.
What used to take 3 months to catch now gets detected within 24 hours."

**A2A:** "The IT asset agent publishes to Kafka, and the notification service — a separate
'agent' — picks it up and alerts admins. They collaborate without direct API coupling."

**LLMOps:** "Every AI query is logged with latency, model version, and response.
If something takes more than 5 seconds, I get a warning log. If it fails, I know why."

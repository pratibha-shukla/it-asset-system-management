# Microfrontend + Microservice — How Everything Connects

## Ports at a Glance

### Frontend (Microfrontends)
| App            | Port  | Owns                        |
|----------------|-------|-----------------------------|
| Shell App      | 3000  | Login, layout, notifications |
| Asset MFE      | 5073  | Asset list, add, edit        |
| Maintenance MFE| 5074  | Maintenance records          |
| User MFE       | 5075  | User management              |
| Request MFE    | 5076  | Asset requests               |
| Reports MFE    | 5077  | Reports and export           |

### Backend (Microservices)
| Service             | Port  | Handles                    |
|---------------------|-------|----------------------------|
| API Gateway         | 8080  | Routing, auth, rate limit  |
| Asset Service       | 8081  | CRUD for assets            |
| Maintenance Service | 8082  | Maintenance records        |
| User Service        | 8083  | Users, roles               |
| Request Service     | 8084  | Asset request workflow     |
| Auth Service        | 8085  | Login, JWT                 |
| Report Service      | 8086  | PDF/Excel reports          |
| Notification Service| 8087  | Email, SSE alerts          |

---

## Rule: Frontend Always Calls Gateway (8080) Only

CORRECT:
  Asset MFE (5073) → localhost:8080/api/v1/assets   ✅
  Maint MFE (5074) → localhost:8080/api/v1/maintenance ✅

WRONG:
  Asset MFE (5073) → localhost:8081/api/v1/assets   ❌ never bypass gateway

---

## How Microfrontends Communicate

Asset MFE clicks an asset
  → eventBus.emit('asset:selected', { assetId: 5 })
    → window CustomEvent fires
      → Maintenance MFE is listening
        → eventBus.on('asset:selected', ...) loads maintenance for assetId 5

No import between MFEs. No shared code. Just events on window.

---

## What API Gateway Does

1. ROUTING    — /assets/* → 8081, /maintenance/* → 8082
2. AUTH       — validates JWT cookie once, adds X-User-Id header to forwarded request
3. RATE LIMIT — 100 requests/sec per user (uses Redis)
4. CIRCUIT BREAKER — if 8081 fails 5 times → stop calling it, return fallback for 30s
5. CORS       — allows ports 3000, 5073, 5074 etc. to call 8080
6. LOGGING    — logs every request with timing

Microservices (8081, 8082...) trust the gateway completely.
They read X-User-Id from the header — they never see or validate the JWT.

---

## Request Flow (Full Example)

1. User opens Asset MFE at localhost:5073
2. Asset MFE calls: GET localhost:8080/api/v1/assets
3. Gateway checks JWT cookie → valid → adds X-User-Id: 42 header
4. Gateway routes to Asset Service at localhost:8081/api/v1/assets
5. Asset Service reads X-User-Id: 42, queries DB, returns assets
6. Gateway forwards response back to Asset MFE
7. Asset MFE renders the list

User clicks an asset:
8. Asset MFE fires: eventBus.emit('asset:selected', { assetId: 5 })
9. Maintenance MFE (5074) receives it
10. Maintenance MFE calls: GET localhost:8080/api/v1/maintenance?assetId=5
11. Gateway routes to Maintenance Service at localhost:8082
12. Maintenance MFE shows the maintenance history

---

## Circuit Breaker States

CLOSED (normal) → requests flow through
    if 50% of last 10 requests fail →
OPEN (broken) → requests blocked, fallback returned immediately
    after 30 seconds →
HALF-OPEN → let 3 test requests through
    if they succeed →
CLOSED again ✅

microfronted :They never import each other — instead they all share one tiny file called eventBus.js
"It's a publish/subscribe pattern. Any MFE can call eventBus.emit('asset:selected', data)
eventBus.on('asset:selected', callback) to listen.
"One shared file, two functions — emit to send, on to receive. No MFE knows about any other MFE directly."

# ft_transcendence - Infrastructure with ELK Stack and Prometheus/Grafana

Complete infrastructure setup for **log management** (ELK Stack) and **monitoring** (Prometheus/Grafana).

---

## 📋 Table of Contents

1. [Major Module: ELK Stack (Log Management)](#major-module-elk-stack)
2. [Minor Module: Prometheus & Grafana (Monitoring)](#minor-module-prometheus--grafana)
3. [Quick Start](#quick-start)
4. [Architecture](#architecture)
5. [API Endpoints](#api-endpoints)

---

## 🔴 Major Module: ELK Stack

### Objective
Establish a robust **log management and analysis system** using the ELK stack (Elasticsearch, Logstash, Kibana).

### Components

#### 1️⃣ **Elasticsearch** (Log Storage & Indexing)
**What it does:** Stores, indexes, and makes logs searchable.

**Port:** `9201` (HTTP) / `9302` (Node communication)

**Example:**
```bash
# Send logs to Elasticsearch
curl -X POST http://localhost:9201/logs-2025.11.26/_doc \
  -H "Content-Type: application/json" \
  -d '{
    "message": "User login successful",
    "service": "auth-service",
    "timestamp": "2025-11-26T18:00:00Z",
    "level": "info"
  }'

# Search logs
curl http://localhost:9201/logs-*/_search?q=service:auth-service
```

**Key Features:**
- ✅ Full-text search capability
- ✅ Real-time indexing
- ✅ Distributed and scalable
- ✅ RESTful API

#### 2️⃣ **Logstash** (Log Processing & Collection)
**What it does:** Collects logs from services, processes them, and sends to Elasticsearch.

**Port:** `5046` (TCP input for logs)

**Configuration:** `/infrastructure/elk/logstash/pipeline/logstash.conf`

```conf
# Input: Receive logs from services
input {
  tcp {
    port => 5044
    codec => json
  }
}

# Filter: Process and enrich logs
filter {
  mutate {
    add_field => { "[@metadata][index_name]" => "logs-%{+YYYY.MM.dd}" }
  }
}

# Output: Send to Elasticsearch
output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "%{[@metadata][index_name]}"
  }
  stdout { codec => rubydebug }
}
```

**How it works:**
```
Services (gateway, auth, user)
  ↓ (send logs via TCP:5044)
Logstash (process & transform)
  ↓
Elasticsearch (store & index)
```

**Key Features:**
- ✅ Real-time log processing
- ✅ Multi-source support
- ✅ Data transformation & enrichment
- ✅ Multiple output options

#### 3️⃣ **Kibana** (Log Visualization & Analysis)
**What it does:** Visualize logs, create dashboards, and analyze log data.

**Port:** `5601` (Web UI)

**URL:** http://localhost:5601

**How to use:**
1. Open http://localhost:5601
2. Go to **Discover**
3. Create index pattern: `logs-*`
4. View and search logs in real-time

**Example Dashboard Queries:**
```kibana
# Find all errors in gateway
service: "gateway" AND level: "error"

# Find auth failures
service: "auth-service" AND message: "Failed"

# Count requests by service (last 24h)
_count by service
```

**Key Features:**
- ✅ Real-time log visualization
- ✅ Custom dashboards
- ✅ Advanced filtering & search
- ✅ Log trend analysis

### Data Flow Example

```
Gateway Service (port 3000)
  ↓ (Winston logger)
Logstash (port 5046)
  ↓ (processes & transforms)
Elasticsearch (port 9201)
  ↓
Kibana (port 5601)
  ↓
Visualize & Analyze Logs
```

### Example: How Logging Works in Gateway

**Gateway Code:**
```typescript
// back/gateway/src/index.ts
import logger from "../../observability/log/logger";

async function start() {
  try {
    const server = await buildServer();
    await server.listen({ port: PORT, host: "0.0.0.0" });

    // Log successful startup
    logger.info("Gateway started successfully", {
      port: PORT,
      host: "0.0.0.0"
    });

  } catch (err) {
    // Log startup error
    logger.error("Failed to start gateway", { error: err });
    process.exit(1);
  }
}
```

**Logger Configuration:**
```typescript
// observability/log/logger.ts
import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  defaultMeta: { service: "ft_transcendence" },
  transports: [
    // Console output (for development)
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

export default logger;
```

**Result in Kibana:**
```json
{
  "message": "Gateway started successfully",
  "service": "gateway",
  "port": 3000,
  "host": "0.0.0.0",
  "timestamp": "2025-11-26T18:00:00Z",
  "level": "info"
}
```

### Key Features of ELK Stack

| Component | Purpose | Port |
|-----------|---------|------|
| **Elasticsearch** | Store & index logs | 9201 |
| **Logstash** | Collect & process logs | 5046 |
| **Kibana** | Visualize logs | 5601 |

---

## 🟢 Minor Module: Prometheus & Grafana

### Objective
Set up a **comprehensive monitoring system** to collect metrics and visualize system health.

### Components

#### 1️⃣ **Prometheus** (Metrics Collection & Storage)
**What it does:** Collects metrics from services and stores them for analysis.

**Port:** `9090` (Web UI & API)

**URL:** http://localhost:9090

**Configuration:** `/infrastructure/monitoring/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Collect metrics from Gateway
  - job_name: 'gateway'
    static_configs:
      - targets: ['gateway:3000']
    metrics_path: '/metrics'
```

**Example Queries:**
```promql
# Total HTTP requests
http_requests_total

# API latency (95th percentile)
histogram_quantile(0.95, api_latency_seconds)

# Service uptime
up

# Request rate per second
rate(http_requests_total[1m])
```

**Key Features:**
- ✅ Time-series metrics storage
- ✅ Pull-based metric collection
- ✅ Multi-dimensional data labels
- ✅ Powerful query language (PromQL)

#### 2️⃣ **Grafana** (Metrics Visualization & Dashboards)
**What it does:** Create beautiful dashboards and visualizations for metrics.

**Port:** `3050` (Web UI)

**URL:** http://localhost:3050

**Default Credentials:**
- Username: `admin`
- Password: `admin`

**How to Create Dashboard:**
1. Open http://localhost:3050
2. Go to **Configuration** → **Data Sources**
3. Add Prometheus: `http://prometheus:9090`
4. Go to **Dashboards** → **Create New**
5. Add panels with metrics:
   - `http_requests_total`
   - `api_latency_seconds`
   - `up`

**Example Dashboard Panel:**
```json
{
  "title": "Request Rate",
  "targets": [
    {
      "expr": "rate(http_requests_total[1m])",
      "legendFormat": "{{method}} {{endpoint}}"
    }
  ],
  "type": "graph"
}
```

**Key Features:**
- ✅ Real-time dashboards
- ✅ Custom visualizations (graphs, tables, gauges)
- ✅ Multi-source support
- ✅ User-friendly interface

### Metrics Collection Example

**Gateway Metrics Endpoint:**
```typescript
// back/gateway/src/index.ts
import { register } from "prom-client";

server.get("/metrics", async (request, reply) => {
  reply.type(register.contentType);
  return await register.metrics();
});
```

**Response Example:**
```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/health"} 156
http_requests_total{method="POST",endpoint="/auth/login"} 42

# HELP api_latency_seconds API latency in seconds
# TYPE api_latency_seconds histogram
api_latency_seconds_bucket{le="0.1",endpoint="/health"} 150
api_latency_seconds_bucket{le="1",endpoint="/health"} 155
api_latency_seconds_sum{endpoint="/health"} 5.23
api_latency_seconds_count{endpoint="/health"} 156
```

### Monitoring Workflow

```
Services (gateway, auth, user)
  ↓ (expose /metrics endpoint)
Prometheus (scrape every 15s)
  ↓ (store time-series data)
Grafana (query & visualize)
  ↓
Dashboard (real-time metrics)
```

### Key Metrics to Monitor

| Metric | Purpose | Query |
|--------|---------|-------|
| **http_requests_total** | Total requests | `rate(http_requests_total[1m])` |
| **api_latency_seconds** | Response time | `histogram_quantile(0.95, api_latency_seconds)` |
| **up** | Service uptime | `up` |
| **db_connection_pool** | DB connections | `db_connection_pool_active` |

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Linux/Mac (or WSL on Windows)

### Installation

```bash
# 1. Clone repository
cd /media/cmarguer/Nastya\ BackUp/ft_transcendence

# 2. Build all services
cd infrastructure
sudo docker compose build --no-cache

# 3. Start all services
sudo docker compose up -d

# 4. Wait for services to be ready (30 seconds)
sleep 30

# 5. Verify all services are running
sudo docker compose ps

# Expected output:
# gateway              Up
# auth                 Up
# user                 Up
# game-engine          Up
# match-service        Up
# elasticsearch        Up (healthy)
# logstash             Up
# kibana               Up
# prometheus           Up
# grafana              Up
```

### Verify Installation

```bash
# 1. Test Gateway
curl http://localhost:3000/health

# 2. Test Metrics Endpoint
curl http://localhost:3000/metrics

# 3. Test Elasticsearch
curl http://localhost:9201

# 4. Test Prometheus
curl http://localhost:9090/api/v1/query?query=up

# 5. Access Web Interfaces
# Kibana:    http://localhost:5601
# Prometheus: http://localhost:9090
# Grafana:   http://localhost:3050 (admin/admin)
```

### Stop Services

```bash
cd infrastructure
sudo docker compose down -v
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ft_transcendence Stack                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐         ┌──────────────────────────┐
│   Microservices          │         │   Infrastructure         │
├──────────────────────────┤         ├──────────────────────────┤
│ • Gateway (3000)         │         │ ELK Stack (Log Mgmt)     │
│ • Auth (3001)            │────────→│ • Elasticsearch (9201)   │
│ • User (3002)            │  logs   │ • Logstash (5046)        │
│ • Game-Engine (3003)     │  +      │ • Kibana (5601)          │
│ • Match (3004)           │ metrics │                          │
└──────────────────────────┘         │ Monitoring               │
                                     │ • Prometheus (9090)      │
                                     │ • Grafana (3050)         │
                                     └──────────────────────────┘

```

---

## 📊 API Endpoints

### Gateway (3000)
```
GET  /health          - Health check
GET  /metrics         - Prometheus metrics
POST /auth/login      - Authentication (proxied to auth-service)
GET  /users           - User service (proxied to user-service)
```

### Elasticsearch (9201)
```
POST /logs-YYYY.MM.dd/_doc          - Index log
GET  /logs-*/_search                - Search logs
GET  /logs-*/_count                 - Count logs
DELETE /logs-YYYY.MM.dd             - Delete index
```

### Prometheus (9090)
```
GET  /api/v1/query              - Execute PromQL query
GET  /api/v1/targets            - List active scrape targets
GET  /metrics                    - Prometheus metrics
```

### Grafana (3050)
```
Web UI: http://localhost:3050
Default: admin/admin
```

### Kibana (5601)
```
Web UI: http://localhost:5601
```

---

## 📈 Example: Monitor API Performance

### Step 1: Make Requests
```bash
# Generate traffic
for i in {1..100}; do
  curl http://localhost:3000/health
  sleep 1
done
```

### Step 2: View in Prometheus
```
http://localhost:9090
Query: rate(http_requests_total[1m])
```

### Step 3: Create Grafana Dashboard
```
1. Open http://localhost:3050
2. Create New Dashboard
3. Add Panel with query: rate(http_requests_total[1m])
4. Set to "Graph" visualization
5. Save
```

### Step 4: View Logs in Kibana
```
1. Open http://localhost:5601
2. Go to Discover
3. Create index pattern: logs-*
4. Search: service: "gateway"
5. View all gateway logs
```

---

## 🔒 Security Considerations

### TODO: Implement
- [ ] Elasticsearch authentication (user/password)
- [ ] Kibana RBAC (Role-Based Access Control)
- [ ] Prometheus authentication
- [ ] Grafana LDAP/OAuth integration
- [ ] TLS/HTTPS for all components
- [ ] API authentication tokens

---

## 📚 Documentation

- [Elasticsearch Docs](https://www.elastic.co/guide/en/elasticsearch/reference/8.10/index.html)
- [Logstash Docs](https://www.elastic.co/guide/en/logstash/8.10/index.html)
- [Kibana Docs](https://www.elastic.co/guide/en/kibana/8.10/index.html)
- [Prometheus Docs](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs/)




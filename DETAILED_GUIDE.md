# 📚 Detailed Guide: ELK Stack & Prometheus/Grafana

Complete explanation of **what this is**, **why it matters**, and **how it works**.

---

## 📖 Table of Contents

1. [What is Logging & Monitoring?](#what-is-logging--monitoring)
2. [ELK Stack Deep Dive](#elk-stack-deep-dive)
3. [Prometheus & Grafana Deep Dive](#prometheus--grafana-deep-dive)
4. [Real-World Examples](#real-world-examples)
5. [Troubleshooting](#troubleshooting)

---

## 🤔 What is Logging & Monitoring?

### The Problem We're Solving

Imagine you have a web application with **5 microservices**:

```
Gateway → Auth Service → User Service → Game Engine → Match Service
```

**Problems without logging and monitoring:**
- ❌ When service crashes - **you don't know why**
- ❌ When requests are slow - **you don't know where the bottleneck is**
- ❌ When user complains - **you can't find the bug**
- ❌ When DB is slow - **you can't see request volume**

### Solution: Logging + Monitoring

```
┌─────────────────────────────────┐
│    Microservices Stack          │
├─────────────────────────────────┤
│ 🔴 Problems happen...           │
│   • Services crash              │
│   • Requests hang               │
│   • DB overloaded               │
│   • Code errors                 │
└─────────────────────────────────┘
           ↓↓↓
┌─────────────────────────────────┐
│  Logging (What happened)        │
│  ✅ Understand WHAT happened    │
│  ✅ See all errors              │
│  ✅ Find the bug                │
└─────────────────────────────────┘
           ↓↓↓
┌─────────────────────────────────┐
│ Monitoring (How to improve)     │
│ ✅ See performance              │
│ ✅ Find bottlenecks             │
│ ✅ Optimize                     │
└─────────────────────────────────┘
```

---

## 🔴 ELK Stack Deep Dive

### What is ELK?

**ELK** = **E**lasticsearch + **L**ogstash + **K**ibana

System for **collecting, processing, and analyzing logs**.

### 📝 Elasticsearch - The Brain

**What it is:** Log database that searches very fast.

**Analogy:** Imagine a 1000-page book.
- ❌ Without index: read entire book to find a word
- ✅ With index: find word in milliseconds

**How it works:**
```
Logs                  Elasticsearch              Result
┌──────────────┐     ┌──────────────┐         ┌────────┐
│ Message: X   │     │ Index:       │         │ In 1ms!│
│ Level: info  │────→│ message:["X"]│────────→│ 5 matches
│ Service: Y   │     │ level:[info] │         └────────┘
│ Time: 10:00  │     │ service:["Y"]│
└──────────────┘     └──────────────┘
```

**What it stores:**
```json
{
  "@timestamp": "2025-11-26T18:00:00.000Z",
  "message": "User login successful",
  "service": "auth-service",
  "level": "info",
  "user_id": 123,
  "ip_address": "192.168.1.1",
  "response_time_ms": 45
}
```

**Why it's needed:**
- ✅ Store logs long-term (months/years)
- ✅ Search logs quickly
- ✅ Scale (store billions of logs)
- ✅ Analyze data

**Example query:**
```bash
# Find all errors in auth-service in last hour
curl -X GET "http://localhost:9201/logs-*/_search" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "bool": {
        "must": [
          { "match": { "service": "auth-service" } },
          { "match": { "level": "error" } },
          { "range": { "@timestamp": { "gte": "now-1h" } } }
        ]
      }
    }
  }'

# Result: Found 15 errors in 50ms
```

---

### 🔧 Logstash - The Processor

**What it is:** Program that takes logs, processes them, and sends to Elasticsearch.

**Why it's needed:**
- ❌ Sending raw logs to Elasticsearch - bad idea
  - Logs in different formats
  - Lots of garbage and duplicates
  - Hard to analyze

- ✅ Process logs before saving - good idea
  - Standardize format
  - Remove garbage
  - Add useful information

**How it works:**

```
Raw Logs              Logstash              Clean Logs
   ↓                     ↓                      ↓
"2025-11-26        ┌──────────────┐       {
18:00:00.123       │ 1. Parse:    │        "@timestamp": "...",
Auth success       │    JSON      │        "message": "Auth success",
user=123"          │ 2. Filter:   │        "service": "auth",
                   │    Remove    │        "level": "info",
"ERROR at 10:05    │    duplicates│        "user_id": 123
DB timeout"        │ 3. Enrich:   │       }
                   │    Add fields│
                   │ 4. Format:   │       {
                   │    Standardize│       "@timestamp": "...",
                   └──────────────┘        "message": "DB timeout",
                                           "service": "db",
                                           "level": "error"
                                          }
```

**Example configuration:**

```logstash
input {
  # 1. WHERE to get logs
  tcp {
    port => 5044
    codec => json
  }
}

filter {
  # 2. HOW to process them
  
  # If error - add "alert" tag
  if [level] == "error" {
    mutate {
      add_tag => [ "alert" ]
    }
  }
  
  # Convert timestamp to proper format
  date {
    match => [ "timestamp", "ISO8601" ]
    target => "@timestamp"
  }
  
  # Add server information
  mutate {
    add_field => { 
      "server": "prod-1"
      "environment": "production"
    }
  }
}

output {
  # 3. WHERE to send logs
  
  # Main: to Elasticsearch
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "logs-%{+YYYY.MM.dd}"
  }
  
  # Backup: to file
  file {
    path => "/var/log/backup-%{service}.log"
  }
  
  # Debug: to console
  stdout {
    codec => rubydebug
  }
}
```

**Why it's needed:**
- ✅ Standardize log format
- ✅ Remove duplicates and garbage
- ✅ Add context (server, environment)
- ✅ Route logs (different logs to different places)

---

### 📊 Kibana - The Dashboard

**What it is:** Beautiful web panel for viewing logs.

**Why it's needed:**
- ✅ See logs in human format (not JSON)
- ✅ Search logs quickly
- ✅ Create beautiful graphs
- ✅ Set alerts

**Example uses:**

**1️⃣ Find all errors in last hour**
```
1. Open Kibana: http://localhost:5601
2. Go to "Discover"
3. Search: level:"error" AND timestamp:[now-1h TO now]
4. See all 15 errors with time, message, service
```

**2️⃣ Create graph: errors per hour**
```
1. Kibana → Visualize
2. Choose type: Line Chart
3. X-axis: timestamp (split by hour)
4. Y-axis: count of documents
5. Filter: level:"error"
6. See beautiful error graph over time
```

**3️⃣ Monitor critical services**
```
1. Kibana → Discover
2. Filter: level:"error" AND service:"payment"
3. Create Alert: if 5+ errors per hour → send email
```

**Typical DevOps day with Kibana:**

```
08:00 - Check Kibana: everything OK overnight?
       "Oh, 100 errors! What happened?"
       
08:05 - Search: service:"auth" AND level:"error" AND timestamp:[now-2h TO now]
       "See auth-service crashed at 03:00"
       
08:10 - Look at logs: "ERROR: DB connection timeout"
       "Probably DB was overloaded"
       
08:15 - Restart DB, errors disappear
       
08:20 - Create Alert: "If >50 DB timeouts per hour → Slack"
       No more surprises!
```

---

## 🟢 Prometheus & Grafana Deep Dive

### What is Prometheus & Grafana?

**Prometheus** = system for collecting **metrics** (numeric measurements)
**Grafana** = beautiful panel for displaying metrics

**Difference between Logs and Metrics:**

| Logs | Metrics |
|------|---------|
| **WHAT happened** | **HOW it works** |
| `"User login failed"` | `failed_logins: 5` |
| `"DB timeout"` | `db_response_time: 250ms` |
| `"Server crashed"` | `uptime: 99.9%` |
| Lots of info | Small numbers |
| Slow to search | Fast to analyze |

**Analogy:**
- 📝 **Logs** = diary of events (what happened)
- 📊 **Metrics** = health heartbeat (how it's feeling)

---

### 📈 Prometheus - The Metric Collector

**How it works:**

```
Services expose metrics    Prometheus scrapes     Prometheus stores
        ↓                        ↓                        ↓
┌──────────────┐          ┌──────────────┐       ┌─────────────┐
│ Gateway:     │          │ Every 15s    │       │ Time series │
│ GET /metrics │────────→ │ calls        │────→ │ database:   │
│ 156 requests │          │ /metrics     │       │ http_*[t]   │
│ 45ms latency │          │ on all       │       │ db_*[t]     │
│              │          │ services     │       │ up[t]       │
│ Auth:        │          │              │       └─────────────┘
│ 42 auth OK   │          │ Stores data  │
│ 3 auth fail  │          │ with time    │
└──────────────┘          └──────────────┘
```

**Example metrics from Gateway:**

```
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/health"} 156
http_requests_total{method="POST",endpoint="/auth/login"} 42
http_requests_total{method="GET",endpoint="/users"} 89

# HELP api_latency_seconds API request latency
# TYPE api_latency_seconds histogram
api_latency_seconds_bucket{endpoint="/health",le="0.01"} 145
api_latency_seconds_bucket{endpoint="/health",le="0.1"} 155
api_latency_seconds_bucket{endpoint="/health",le="1"} 156
api_latency_seconds_sum{endpoint="/health"} 5.23
api_latency_seconds_count{endpoint="/health"} 156

# HELP up Service uptime
# TYPE up gauge
up{job="gateway"} 1
up{job="auth"} 1
up{job="user"} 0  ← ⚠️ User service DOWN!
```

**Metric types:**

| Type | What it is | Example |
|------|-----------|---------|
| **Counter** | Only grows | `requests_total: 1000` |
| **Gauge** | Can go up/down | `cpu_usage: 45%` |
| **Histogram** | Distribution | `response_time_ms: [1,5,50,100]` |
| **Summary** | Statistics | `quantile_95: 150ms` |

**Example queries in Prometheus:**

```promql
# Total requests processed?
http_requests_total

# What percentage of requests are errors?
100 * (rate(http_requests_total{status="5xx"}[1m]) / rate(http_requests_total[1m]))

# Average response time?
histogram_quantile(0.5, rate(api_latency_seconds_bucket[1m]))

# 95th percentile latency?
histogram_quantile(0.95, rate(api_latency_seconds_bucket[1m]))

# Which services are down?
up == 0

# Service uptime percentage?
100 * (count(up{job="gateway"} == 1) / count(up{job="gateway"}))
```

---

### 📊 Grafana - The Metrics Dashboard

**What it is:** Beautiful panel for metric graphs.

**Example Dashboard:**

```
╔════════════════════════════════════════════════════════════╗
║              ft_transcendence System Health                 ║
╠════════════════════════════════════════════════════════════╣
║                                                              ║
║  ┌──────────────────┐  ┌──────────────────┐               ║
║  │ Active Services  │  │ Error Rate       │               ║
║  │      5/5         │  │    0.5%          │               ║
║  │   [████████]     │  │  [▁▂▂▂▃▃▂▁]     │               ║
║  └──────────────────┘  └──────────────────┘               ║
║                                                              ║
║  ┌────────────────────────────────────────────────────┐   ║
║  │ Request Rate (requests/sec)                        │   ║
║  │                                                    │   ║
║  │      100 ┤     ╱╲     ╱╲                          │   ║
║  │           │    ╱  ╲   ╱  ╲                        │   ║
║  │       50 ┤   ╱    ╲ ╱    ╲ ╱╲                    │   ║
║  │           │  ╱      ╲      ╱  ╲                  │   ║
║  │        0 ┤╱──────────────────────╲               │   ║
║  │          └────────────────────────────────────   │   ║
║  │          08:00 09:00 10:00 11:00 12:00          │   ║
║  └────────────────────────────────────────────────────┘   ║
║                                                              ║
║  ┌──────────────────┐  ┌──────────────────┐               ║
║  │ Avg Response     │  │ DB Pool Active   │               ║
║  │     45ms         │  │      28/50       │               ║
║  │   [████░░░]      │  │   [██████░░░]   │               ║
║  └──────────────────┘  └──────────────────┘               ║
║                                                              ║
╚════════════════════════════════════════════════════════════╝
```

**How to create:**

```
1. Open Grafana: http://localhost:3050 (admin/admin)
2. Create → Dashboard
3. Add Panel
4. Select Data Source: Prometheus
5. Write Query: http_requests_total
6. Choose type: Graph
7. Save
8. Repeat for other metrics
```

---

## 🌍 Real-World Examples

### Example 1: Find bug in production

**Situation:** Users complaining about slow payments.

**Step 1: Check logs in Kibana**
```
service:"payment" AND level:"error" AND timestamp:[now-1h TO now]

Result:
- 15:00 - "ERROR: DB connection timeout"
- 15:05 - "ERROR: DB connection timeout"
- 15:10 - "ERROR: DB connection timeout"
```

**Step 2: Check metrics in Grafana**
```
Query: db_connection_pool_active

See: At 15:00 active connections = 50/50 (all busy!)
Before 15:00 was: 15/50 (plenty free)
```

**Conclusion:** Something started using lots of DB connections at 15:00.

**Step 3: Find what changed**
```
Check logs:
- 14:55 - New deployment to payment service
- 15:00 - Errors start

Probably: New code has connection leak!
```

**Solution:**
```
1. Rollback deployment
2. Errors disappear (verify in Kibana and Grafana)
3. Developer fixes connection leak
4. Deploy again
```

---

### Example 2: Optimize database

**Situation:** Site running slower than before.

**Step 1: Check Response Time in Grafana**
```
Query: histogram_quantile(0.95, api_latency_seconds)

See:
- Week ago: 50ms
- Today: 500ms (10x slower!)
```

**Step 2: Find slow endpoint**
```
Query: histogram_quantile(0.95, api_latency_seconds{endpoint=~".+"})

Result:
- /health: 10ms ✅
- /users: 50ms ✅
- /users/{id}/orders: 500ms ❌ (very slow!)
```

**Step 3: Check logs**
```
Kibana: endpoint:"/users/{id}/orders" AND level:"debug"

See: "Query time: 450ms" (DB query takes 450ms!)
```

**Solution:**
```
1. Developer adds index on user_id column
2. Query time: 450ms → 5ms
3. Check Grafana: /users/{id}/orders now 10ms ✅
```

---

### Example 3: Prevent server crash

**Situation:** Server memory keeps growing.

**Step 1: See trend in Grafana**
```
Query: process_resident_memory_bytes

Graph:
- Day 1: 200MB
- Day 2: 300MB
- Day 3: 400MB
- Day 4: 500MB (max 512MB!)
- Day 5: ??? CRASH!
```

**Step 2: Find memory leak in logs**
```
Check code: creating objects but not deleting
Found: cache never deletes old entries
```

**Solution:**
```
1. Add TTL to cache
2. Restart service
3. Check Grafana: memory stabilizes at 250MB
4. Graph now flat - all good ✅
```

---

## 🔧 Troubleshooting

### Problem 1: Elasticsearch slow

**Sign:** Search in Kibana takes 10+ seconds

**Diagnosis:**
```bash
# Check index size
curl http://localhost:9201/_cat/indices?v

# If big index - need rotation
# Solution: move/delete old logs
```

**Fix:**
```bash
# Delete logs older than 30 days
DELETE /logs-2025.10.*

# Or use Index Lifecycle Management (ILM)
```

---

### Problem 2: Prometheus uses too much memory

**Sign:** Prometheus using 2GB+ memory

**Diagnosis:**
```bash
# Check data collected
curl http://localhost:9090/api/v1/series

# Too many series = too much memory
```

**Fix:**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  retention: 7d  # Only keep 7 days (not months)
```

---

### Problem 3: Logs not reaching Elasticsearch

**Sign:** Kibana empty, no data

**Diagnosis:**
```bash
# Check Logstash logs
docker logs logstash | tail -50

# Look for: "Connection refused" or "Timeout"
```

**Fix:**
```bash
# Verify Elasticsearch running
curl http://localhost:9201

# Restart Logstash
docker restart logstash

# Check services sending logs
docker logs gateway | grep -i "log\|error"
```

---

## 📚 Quick Reference

### ELK Stack URLs
```
Elasticsearch: http://localhost:9201
Kibana:        http://localhost:5601
Logstash:      (no UI, port 5046)
```

### Prometheus & Grafana URLs
```
Prometheus:    http://localhost:9090
Grafana:       http://localhost:3050 (admin/admin)
```

### Common Kibana Queries
```
# All errors
level:"error"

# Errors in last hour
level:"error" AND timestamp:[now-1h TO now]

# Errors in specific service
service:"auth-service" AND level:"error"

# Errors with specific text
message:"timeout"

# Combo: payment errors in last 30 min
service:"payment" AND level:"error" AND timestamp:[now-30m TO now]
```

### Common Prometheus Queries
```
# All metrics
http_requests_total

# Error percentage
100 * rate(http_requests_total{status="5xx"}[5m]) / rate(http_requests_total[5m])

# Average response time (50 percentile)
histogram_quantile(0.5, rate(api_latency_seconds_bucket[5m]))

# P95 response time (95 percentile)
histogram_quantile(0.95, rate(api_latency_seconds_bucket[5m]))

# Which services are down?
up == 0

# Uptime percentage
100 * avg_over_time(up[24h])
```

---

## 🎯 When to Use What

### Use LOGS (Kibana) for:
- ✅ Finding specific errors
- ✅ Analyzing event sequence
- ✅ Debugging bugs
- ✅ Auditing (who did what)
- ✅ Finding exact problem time

### Use METRICS (Grafana) for:
- ✅ Monitoring system health
- ✅ Tracking trends
- ✅ Optimizing performance
- ✅ Planning capacity
- ✅ Creating alerts

---

Done! Now you understand what all this means! 🚀


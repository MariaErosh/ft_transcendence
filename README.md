# Running the Project

---

## 1) Backend Services
To start each backend service, navigate to the service’s folder and run:
```bash
npm run build
npm run start
```

---

## 2) Frontend
The frontend runs via Docker.
From the root of the frontend directory, execute:
```bash
docker build -t ft_transcendence_frontend .
docker run -p 8080:80 ft_transcendence_frontend
```

---

## 3) Monitoring and Logging

### Logging
The backend services use **Winston** for structured logging. Logs are sent to both the console and **Logstash** for centralized log management. Logstash processes the logs and sends them to **Elasticsearch**, where they can be visualized in **Kibana**.

#### How to View Logs:
1. Start the ELK stack (Elasticsearch, Logstash, Kibana):
   ```bash
   cd infrastructure/elk
   docker-compose up -d
   ```
2. Open Kibana in your browser:
   ```
   http://localhost:5601
   ```
3. Navigate to the "Discover" tab to view logs.
4. Use filters to search for specific logs (e.g., by service name or log level).

### Monitoring
The backend services are instrumented with **Prometheus** for metrics collection. Metrics include:
- `db_query_duration_seconds`: Measures the duration of database queries.
- `db_errors_total`: Tracks the total number of database errors.

#### How to View Metrics:
1. Start Prometheus and Grafana:
   ```bash
   cd infrastructure/monitoring
   docker-compose up -d
   ```
2. Open Prometheus in your browser:
   ```
   http://localhost:9090
   ```
3. Use the Prometheus query interface to explore metrics. For example:
   - `db_query_duration_seconds`
   - `db_errors_total`

4. Open Grafana in your browser:
   ```
   http://localhost:3000
   ```
5. Log in to Grafana (default credentials: `admin`/`admin`) and configure Prometheus as a data source.
6. Import or create dashboards to visualize metrics.

---

## 4) Accessing the Application
Once all services are running, open your browser and go to:
```
http://localhost:8080
```

---

## Summary of Added Features
### Logging:
- **Winston** is used for structured logging.
- Logs are sent to **Logstash** and stored in **Elasticsearch**.
- Logs can be visualized in **Kibana**.

### Monitoring:
- **Prometheus** collects metrics from backend services.
- **Grafana** visualizes metrics with customizable dashboards.

### Key Metrics:
- `db_query_duration_seconds`: Measures the duration of database queries.
- `db_errors_total`: Tracks the total number of database errors.


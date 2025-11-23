import { Registry, Histogram, Counter, Gauge } from "prom-client";

const register = new Registry();

// ========== HTTP МЕТРИКИ ==========
export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code", "service"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status_code", "service"],
  registers: [register],
});

// ========== DATABASE МЕТРИКИ ==========
export const dbQueryDuration = new Histogram({
  name: "db_query_duration_seconds",
  help: "Database query duration in seconds",
  labelNames: ["query_type", "service"],
  buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const dbErrors = new Counter({
  name: "db_errors_total",
  help: "Total database errors",
  labelNames: ["operation", "service"],
  registers: [register],
});

export const dbConnections = new Gauge({
  name: "db_connections",
  help: "Number of active database connections",
  labelNames: ["service"],
  registers: [register],
});

// ========== ЛОГИРОВАНИЕ МЕТРИКИ ==========
export const logEventsTotal = new Counter({
  name: "log_events_total",
  help: "Total log events",
  labelNames: ["level", "service"],
  registers: [register],
});

// ========== БИЗНЕС-ЛОГИКА МЕТРИКИ ==========

// Auth Service
export const authAttempts = new Counter({
  name: "auth_attempts_total",
  help: "Total authentication attempts",
  labelNames: ["status", "service"],
  registers: [register],
});

export const jwtTokensIssued = new Counter({
  name: "jwt_tokens_issued_total",
  help: "Total JWT tokens issued",
  labelNames: ["service"],
  registers: [register],
});

// User Service
export const userCreated = new Counter({
  name: "users_created_total",
  help: "Total users created",
  labelNames: ["service"],
  registers: [register],
});

export const userProfileUpdates = new Counter({
  name: "user_profile_updates_total",
  help: "Total user profile updates",
  labelNames: ["field", "service"],
  registers: [register],
});

// Game/Match Service
export const matchesCreated = new Counter({
  name: "matches_created_total",
  help: "Total matches created",
  labelNames: ["game_type", "service"],
  registers: [register],
});

export const matchDuration = new Histogram({
  name: "match_duration_seconds",
  help: "Match duration in seconds",
  labelNames: ["game_type", "service"],
  buckets: [30, 60, 120, 300, 600, 1800],
  registers: [register],
});

export const activeMatches = new Gauge({
  name: "active_matches",
  help: "Number of active matches",
  labelNames: ["game_type", "service"],
  registers: [register],
});

export const matchResults = new Counter({
  name: "match_results_total",
  help: "Match results",
  labelNames: ["result", "game_type", "service"],
  registers: [register],
});

// ========== СИСТЕМА МЕТРИКИ ==========
export const systemUptime = new Gauge({
  name: "system_uptime_seconds",
  help: "System uptime in seconds",
  labelNames: ["service"],
  registers: [register],
});

export const systemErrors = new Counter({
  name: "system_errors_total",
  help: "Total system errors",
  labelNames: ["error_type", "service"],
  registers: [register],
});

export const apiLatency = new Histogram({
  name: "api_latency_ms",
  help: "API latency in milliseconds",
  labelNames: ["endpoint", "service"],
  buckets: [10, 50, 100, 200, 500, 1000],
  registers: [register],
});

export { register };

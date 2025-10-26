import { Registry, Histogram, Counter } from "prom-client";

const register = new Registry();

// Histogram for measuring the duration of SQL queries
const dbQueryDuration = new Histogram({
  name: "db_query_duration_seconds",
  help: "Duration of database queries in seconds",
  labelNames: ["query"],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});
register.registerMetric(dbQueryDuration);

// Counter for tracking the total number of database errors
const dbErrors = new Counter({
  name: "db_errors_total",
  help: "Total number of database errors",
  labelNames: ["operation"],
});
register.registerMetric(dbErrors);

export { register, dbQueryDuration, dbErrors };

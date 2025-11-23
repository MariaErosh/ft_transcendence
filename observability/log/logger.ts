import winston from "winston";
require("winston-logstash");

const serviceName = process.env.SERVICE_NAME || "unknown";
const logstashHost = process.env.LOGSTASH_HOST || "localhost";
const logstashPort = parseInt(process.env.LOGSTASH_PORT || "5046");

const logger = winston.createLogger({
  defaultMeta: {
    service: serviceName,
    timestamp: new Date().toISOString(),
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        winston.format.printf(
          ({ level, message, service, timestamp }) =>
            `${timestamp} [${service}] ${level}: ${message}`
        )
      ),
    }),

    // Logstash output
    // @ts-ignore
    new winston.transports.Logstash({
      port: logstashPort,
      host: logstashHost,
      format: winston.format.combine(
        winston.format.json(),
        winston.format.timestamp(),
        winston.format.metadata()
      ),
    }),
  ],
});

export default logger;

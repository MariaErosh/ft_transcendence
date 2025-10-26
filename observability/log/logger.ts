import winston from "winston";
require("winston-logstash");

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    // @ts-ignore
    new winston.transports.Logstash({
      port: 5044, // Logstash port
      host: "logstash", // Logstash container name
    }),
  ],
});

export default logger;

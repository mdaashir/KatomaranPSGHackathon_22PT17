const winston = require("winston");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Ensure logs directory exists
const logDir = process.env.LOG_DIR || "../../logs";
const logDirPath = path.resolve(__dirname, "..", logDir);

if (!fs.existsSync(logDirPath)) {
  fs.mkdirSync(logDirPath, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

// Create loggers
const appLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "face-recognition-backend" },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(logDirPath, "app.log"),
    }),
  ],
});

// Specialized logger for registration events
const registrationLogger = winston.createLogger({
  level: "info",
  format: logFormat,
  defaultMeta: { service: "face-registration" },
  transports: [
    new winston.transports.File({
      filename: path.join(logDirPath, "registration.log"),
    }),
  ],
});

// Log registration events in the structured format
const logRegistration = (name, status, errorDetails = null) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: "registration",
    name,
    status,
  };

  if (errorDetails) {
    logEntry.error = errorDetails;
  }

  registrationLogger.info(logEntry);
  return logEntry;
};

module.exports = {
  appLogger,
  registrationLogger,
  logRegistration,
};

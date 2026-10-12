/**
 * Structured logger using Winston.
 *
 * - Development: colorized, human-readable console output.
 * - Production:  JSON-formatted for log aggregators (Datadog, CloudWatch, etc.).
 *
 * Usage:
 *   import logger from "./config/logger.js";
 *   logger.info("Server started on port %d", port);
 *   logger.error("Something broke", { err });
 */
import { createLogger, format, transports } from "winston";

const isDev = process.env.NODE_ENV !== "production";

const logger = createLogger({
  level: isDev ? "debug" : "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    isDev
      ? format.combine(format.colorize(), format.printf(({ timestamp, level, message, stack, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
          return `${timestamp} [${level}]: ${stack || message}${metaStr}`;
        }))
      : format.json()
  ),
  transports: [new transports.Console()],
  // Prevent Winston from crashing the process on uncaught rejections
  exitOnError: false,
});

export default logger;

import winston from 'winston';
import path from 'path';

// Validate required environment variables before initializing logger
const requiredEnvVars = ['NODE_ENV', 'NAME_APP', 'PATH_TO_LOGS'];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`FATAL ERROR: Required environment variable ${envVar} is not set`);
    process.exit(1);
  }
}

const NODE_ENV = process.env.NODE_ENV as string;
const NAME_APP = process.env.NAME_APP as string;
const PATH_TO_LOGS = process.env.PATH_TO_LOGS as string;

// Optional variables with defaults
const LOG_MAX_SIZE = process.env.LOG_MAX_SIZE
  ? parseInt(process.env.LOG_MAX_SIZE, 10) * 1024 * 1024 // Convert MB to bytes
  : 5 * 1024 * 1024; // Default 5MB

const LOG_MAX_FILES = process.env.LOG_MAX_FILES
  ? parseInt(process.env.LOG_MAX_FILES, 10)
  : 5; // Default 5 files

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Configure transports based on NODE_ENV
const transports: winston.transport[] = [];

// Determine log level based on environment
const logLevel = NODE_ENV === 'development' ? 'debug' : 'info';

if (NODE_ENV === 'development') {
  // Development: Console only
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: logLevel,
    })
  );
} else if (NODE_ENV === 'testing') {
  // Testing: Console AND files
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: logLevel,
    }),
    new winston.transports.File({
      filename: path.join(PATH_TO_LOGS, `${NAME_APP}.log`),
      format: logFormat,
      level: logLevel,
      maxsize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      tailable: true,
    })
  );
} else if (NODE_ENV === 'production') {
  // Production: Files only
  transports.push(
    new winston.transports.File({
      filename: path.join(PATH_TO_LOGS, `${NAME_APP}.log`),
      format: logFormat,
      level: logLevel,
      maxsize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      tailable: true,
    })
  );
}

// Create and export singleton logger instance
const logger = winston.createLogger({
  transports,
  exitOnError: false,
});

export default logger;

import { Injectable } from '@angular/core';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: string;
  data?: any;
  error?: Error;
}

/**
 * Structured Logger Service
 * Provides consistent logging across the application
 * Can be extended to send logs to a remote service
 */
@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly maxLogEntries = 100;
  private logs: LogEntry[] = [];
  private minLogLevel = LogLevel.DEBUG;

  constructor() {
    this.setMinLogLevel(this.getMinLogLevelFromEnv());
  }

  /**
   * Set minimum log level to display
   */
  setMinLogLevel(level: LogLevel) {
    this.minLogLevel = level;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: string, data?: any) {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  /**
   * Log info message
   */
  info(message: string, context?: string, data?: any) {
    this.log(LogLevel.INFO, message, context, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: string, data?: any) {
    this.log(LogLevel.WARN, message, context, data);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error | unknown, context?: string, data?: any) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    this.log(LogLevel.ERROR, message, context, { ...data, error: errorObj });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: string, data?: any) {
    if (level < this.minLogLevel) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      data
    };

    this.logs.push(entry);

    // Keep log array size manageable
    if (this.logs.length > this.maxLogEntries) {
      this.logs.shift();
    }

    // Also log to console
    this.logToConsole(entry);
  }

  /**
   * Log to browser console with appropriate formatting
   */
  private logToConsole(entry: LogEntry) {
    const timestamp = entry.timestamp.toISOString();
    const prefix = `[${timestamp}] [${LogLevel[entry.level]}]`;
    const contextStr = entry.context ? ` [${entry.context}]` : '';
    const fullMessage = `${prefix}${contextStr} ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(fullMessage, entry.data);
        break;
      case LogLevel.INFO:
        console.info(fullMessage, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(fullMessage, entry.data);
        break;
      case LogLevel.ERROR:
        console.error(fullMessage, entry.data);
        break;
    }
  }

  /**
   * Get all logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Get logs filtered by context
   */
  getLogsByContext(context: string): LogEntry[] {
    return this.logs.filter(log => log.context === context);
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportLogsAsJson(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Export logs as CSV
   */
  exportLogsAsCsv(): string {
    const headers = 'Timestamp,Level,Context,Message,Data\n';
    const rows = this.logs.map(log =>
      `"${log.timestamp.toISOString()}","${LogLevel[log.level]}","${log.context || ''}","${log.message}","${JSON.stringify(log.data || {}).replace(/"/g, '\\"')}"`
    );
    return headers + rows.join('\n');
  }

  /**
   * Determine min log level from environment
   */
  private getMinLogLevelFromEnv(): LogLevel {
    // In production, only show INFO and above
    // In development, show all levels
    if (typeof document !== 'undefined') {
      const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      return isDev ? LogLevel.DEBUG : LogLevel.INFO;
    }
    return LogLevel.INFO;
  }
}

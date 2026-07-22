type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (import.meta.env.VITE_LOG_LEVEL as LogLevel) ||
  (import.meta.env.DEV ? 'debug' : 'info');

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel];
}

function formatMessage(level: LogLevel, module: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}]${module ? ` [${module}]` : ''} ${message}`;
}

function createLogger(module?: string) {
  return {
    debug(message: string, ...args: unknown[]): void {
      if (shouldLog('debug')) {
        console.debug(formatMessage('debug', module || '', message), ...args);
      }
    },
    info(message: string, ...args: unknown[]): void {
      if (shouldLog('info')) {
        console.info(formatMessage('info', module || '', message), ...args);
      }
    },
    warn(message: string, ...args: unknown[]): void {
      if (shouldLog('warn')) {
        console.warn(formatMessage('warn', module || '', message), ...args);
      }
    },
    error(message: string, ...args: unknown[]): void {
      if (shouldLog('error')) {
        console.error(formatMessage('error', module || '', message), ...args);
      }
    },
  };
}

export const logger = createLogger();
export { createLogger };
export type { LogLevel };

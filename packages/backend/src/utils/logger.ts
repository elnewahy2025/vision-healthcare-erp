import pino from 'pino';

const REDACTED_FIELDS = [
  'password',
  'password_hash',
  'passwordHash',
  'currentPassword',
  'newPassword',
  'adminPassword',
  'token',
  'accessToken',
  'refreshToken',
  'partialToken',
  'secret',
  'mfa_secret',
  'mfaSecret',
  'authorization',
  'Authorization',
  'DB_PASSWORD',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'REDIS_PASSWORD',
];

export const loggerOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: REDACTED_FIELDS,
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
};

export function createChildLogger(name: string, parent: pino.Logger): pino.Logger {
  return parent.child({ module: name });
}

import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  // Errors ship to Grafana Cloud (>= warn). Postgres bakes the offending row (email/ip)
  // into err.detail, Brevo into err.body/rawResponse; pino's default serializer copies both.
  redact: {
    paths: ['err.detail', 'err.where', 'err.body', 'err.rawResponse'],
    censor: '[redacted]',
  },
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } }
      : undefined,
})

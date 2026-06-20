import {styleText} from 'node:util'

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
} as const

type LogLevel = keyof typeof LEVELS

const LEVEL_COLORS: Record<LogLevel, 'red' | 'yellow' | 'green' | 'blue'> = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  debug: 'blue',
}

const envLevel = process.env['LOG_LEVEL']?.toLowerCase() as LogLevel | undefined
const currentLevelValue = envLevel && envLevel in LEVELS ? LEVELS[envLevel] : LEVELS.info

function log(level: LogLevel, message: string): void {
  if (LEVELS[level] > currentLevelValue) return

  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const tag = styleText(LEVEL_COLORS[level], level.toUpperCase())
  const line = `${timestamp} [${tag}] ${message}`

  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else if (level === 'debug') console.debug(line)
  else console.log(line)
}

export default {
  error: (msg: string) => log('error', msg),
  warn: (msg: string) => log('warn', msg),
  info: (msg: string) => log('info', msg),
  debug: (msg: string) => log('debug', msg),
}

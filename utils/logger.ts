import { styleText } from 'node:util'

const LEVEL_COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
} as const

function log(level: keyof typeof LEVEL_COLORS, message: string): void {
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const tag = styleText(LEVEL_COLORS[level], level.toUpperCase())
  const line = `${timestamp} [${tag}] ${message}`

  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export default {
  error: (msg: string) => log('error', msg),
  warn: (msg: string) => log('warn', msg),
  info: (msg: string) => log('info', msg),
}

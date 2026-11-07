import { parseArgs } from 'node:util'

import { providers } from './providers'
import { type Account, loadConfig } from './utils/config'
import logger from './utils/logger'

const { values } = parseArgs({
  options: {
    cron: { type: 'boolean', short: 'c' },
    help: { type: 'boolean', short: 'h' },
  },
})

if (values.help) {
  console.log(`
Gacha Auto Login - Automated Daily Check-in

Usage:
  gacha-auto [options]

Options:
  -c, --cron    Run in persistent daemon mode using per-account cron schedules (UTC)
  -h, --help    Display this help message
`)
  process.exit(0)
}

async function checkInAccount(account: Account): Promise<boolean> {
  const provider = providers[account.provider]

  try {
    const result = await provider.checkIn(account)
    const isFr = Boolean(result.message && /[\u00C0-\u017F]|connexion|déjà|validé/i.test(result.message))
    const label =
      result.status === 'success'
        ? isFr
          ? 'Validé'
          : 'Claimed'
        : result.status === 'already_claimed'
          ? isFr
            ? 'Déjà validé'
            : 'Already claimed'
          : isFr
            ? 'Erreur'
            : 'Error'

    logger.info(`  [${account.name}] ${label}${result.message ? ` - ${result.message}` : ''}`)
    return result.status !== 'error'
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`  [${account.name}] Exception during check-in: ${msg}`)
    return false
  }
}

async function main(): Promise<void> {
  const config = await loadConfig()

  if (values.cron) {
    for (const account of config.accounts) {
      Bun.cron(account.cron, () => checkInAccount(account), { tz: 'UTC' })
    }
    logger.info(`Initialized ${config.accounts.length} cron jobs`)
    return
  }

  logger.info(`Starting check-in for ${config.accounts.length} account(s)`)
  const results = await Promise.allSettled(config.accounts.map(checkInAccount))
  const hasErrors = results.some((r) => r.status === 'rejected' || !r.value)

  if (hasErrors) {
    logger.warn('Finished check-in with errors.')
    process.exitCode = 1
  } else {
    logger.info('All check-ins completed successfully.')
  }
}

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error)
  logger.error(`Fatal error during execution: ${msg}`)
  process.exit(1)
})

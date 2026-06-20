import logger from './utils/logger'
import {providers} from './providers'
import {loadConfig} from './utils/config'

async function main(): Promise<void> {
  const config = await loadConfig()

  logger.info(`Starting check-in for ${config.accounts.length} account(s)`)

  const results = await Promise.allSettled(
    config.accounts.map(async (account) => {
      const provider = providers[account.provider]
      if (!provider) {
        logger.error(`  [${account.name}] Unknown provider: ${account.provider}`)
        return false
      }

      try {
        const result = await provider.checkIn(account)
        const label = result.status === 'success'
          ? 'Claimed'
          : result.status === 'already_claimed'
            ? 'Already claimed'
            : 'Error'

        logger.info(`  [${account.name}] ${label}${result.message ? ` - ${result.message}` : ''}`)
        return result.status !== 'error'
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error(`  [${account.name}] Exception during check-in: ${msg}`)
        return false
      }
    }),
  )

  const hasErrors = results.some((r) => r.status === 'rejected' || !r.value)

  if (hasErrors) {
    logger.warn('Finished with errors.')
    process.exitCode = 1
    return
  }

  logger.info('All check-ins completed successfully.')
}

main().catch((error: unknown) => {
  const msg = error instanceof Error ? error.message : String(error)
  logger.error(`Fatal error during execution: ${msg}`)
  process.exitCode = 1
})

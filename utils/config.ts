import logger from './logger.ts'

export type CanonicalHoyoGame = 'genshin' | 'hsr' | 'zzz' | 'hi3' | 'tot'
export type CanonicalSkportGame = 'endfield'
export type CanonicalGame = CanonicalHoyoGame | CanonicalSkportGame
export type ProviderName = 'hoyolab' | 'skport'

export interface Account {
  name: string
  game: CanonicalGame
  provider: ProviderName
  cron: string
  credentials: {
    cookie?: string
    account_token?: string
    sk_game_role?: string
    [key: string]: string | undefined
  }
}

export interface Config {
  accounts: Account[]
}

const SUPPORTED_GAMES: { game: CanonicalGame; provider: ProviderName; aliases: string[] }[] = [
  { game: 'genshin', provider: 'hoyolab', aliases: ['genshin', 'gi', 'genshinimpact'] },
  { game: 'hsr', provider: 'hoyolab', aliases: ['hsr', 'starrail', 'honkaistarrail', 'hkrpg'] },
  { game: 'zzz', provider: 'hoyolab', aliases: ['zzz', 'zenless', 'zenlesszonezero'] },
  { game: 'hi3', provider: 'hoyolab', aliases: ['hi3', 'honkai', 'honkai3', 'honkai3rd', 'bh3'] },
  { game: 'tot', provider: 'hoyolab', aliases: ['tot', 'themis', 'tearsofthemis', 'nxx'] },
  { game: 'endfield', provider: 'skport', aliases: ['endfield', 'arknights'] },
] as const

export async function loadConfig(): Promise<Config> {
  const text = await Bun.file('config.json').text()
  if (!text) {
    throw new Error('Config not found in config.json')
  }

  const rawData = JSON.parse(text) as { accounts?: Partial<Account>[] }
  if (!rawData.accounts || rawData.accounts.length === 0) {
    throw new Error('No accounts found in configuration')
  }

  const accounts: Account[] = []

  for (const raw of rawData.accounts) {
    if (!raw.name || !raw.game || !raw.credentials || !raw.cron) {
      throw new Error(`Account ${raw.name ?? raw.game} is missing required fields (name, game, credentials or cron).`)
    }

    const key = raw.game.toLowerCase().replace(/[-_ ]/g, '')
    const resolved = SUPPORTED_GAMES.find((g) => g.aliases.includes(key))
    if (!resolved) {
      throw new Error(`Account "${raw.name}" has unsupported game "${raw.game}".`)
    }

    const cronExpr = raw.cron.trim()
    try {
      Bun.cron.parse(cronExpr, Date.now(), { tz: 'UTC' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Account "${raw.name}" has invalid cron expression "${cronExpr}": ${msg}`)
    }

    accounts.push({
      name: raw.name,
      provider: resolved.provider,
      game: resolved.game,
      cron: cronExpr,
      credentials: raw.credentials,
    })
  }

  logger.info(`Loaded ${accounts.length} accounts from configuration`)

  return { accounts }
}

export type CanonicalSkportGame = 'endfield'
export type CanonicalGame = CanonicalSkportGame
export type ProviderName = 'skport'

export interface Account {
  name: string
  game: CanonicalGame
  provider: ProviderName
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
  {game: 'endfield', provider: 'skport', aliases: ['endfield', 'arknights']},
] as const

export async function loadConfig(): Promise<Config> {
  const text = process.env['CONFIG_JSON']?.trim() || await Bun.file('config.json').text().catch(() => null)
  if (!text) {
    throw new Error('Config not found in config.json or CONFIG_JSON environment variable')
  }

  const rawData = JSON.parse(text) as {accounts?: Partial<Account>[]}
  if (!rawData.accounts || rawData.accounts.length === 0) {
    throw new Error('No accounts found in configuration')
  }

  const accounts: Account[] = []

  for (const raw of rawData.accounts) {
    if (!raw.name || !raw.game || !raw.credentials) {
      throw new Error('Account is missing required fields (name, game, or credentials).')
    }

    const key = raw.game.toLowerCase().replace(/[-_ ]/g, '')
    const resolved = SUPPORTED_GAMES.find((g) => (g.aliases).includes(key))
    if (!resolved) {
      throw new Error(`Account "${raw.name}" has unsupported game "${raw.game}".`)
    }

    accounts.push({
      name: raw.name,
      provider: resolved.provider,
      game: resolved.game,
      credentials: raw.credentials,
    })
  }

  return {accounts}
}

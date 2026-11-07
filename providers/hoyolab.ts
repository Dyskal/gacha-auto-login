import type { Account, CanonicalHoyoGame } from '../utils/config'
import { fetchWithRetry } from '../utils/http'
import logger from '../utils/logger'
import type { CheckInResult, Provider } from './index'

interface HoyoGameConfig {
  name: string
  actId: string
  signUrl: string
  signgame: string | null
  gameId: number
}

const GAMES: Record<CanonicalHoyoGame, HoyoGameConfig> = {
  genshin: {
    name: 'Genshin Impact',
    actId: 'e202102251931481',
    signUrl: 'https://sg-hk4e-api.hoyolab.com/event/sol/sign',
    signgame: 'hk4e',
    gameId: 2,
  },
  hsr: {
    name: 'Honkai: Star Rail',
    actId: 'e202303301540311',
    signUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/sign',
    signgame: 'hkrpg',
    gameId: 6,
  },
  zzz: {
    name: 'Zenless Zone Zero',
    actId: 'e202406031448091',
    signUrl: 'https://sg-public-api.hoyolab.com/event/luna/zzz/os/sign',
    signgame: 'zzz',
    gameId: 8,
  },
  hi3: {
    name: 'Honkai Impact 3rd',
    actId: 'e202110291205111',
    signUrl: 'https://sg-public-api.hoyolab.com/event/mani/sign',
    signgame: null,
    gameId: 1,
  },
  tot: {
    name: 'Tears of Themis',
    actId: 'e202202281857121',
    signUrl: 'https://sg-public-api.hoyolab.com/event/luna/os/sign',
    signgame: null,
    gameId: 0,
  },
}

const BASE_HEADERS: Record<string, string> = {
  accept: 'application/json, text/plain, */*',
  'content-type': 'application/json;charset=UTF-8',
  origin: 'https://act.hoyolab.com',
  priority: 'u=1, i',
  referer: 'https://act.hoyolab.com/',
  'sec-ch-ua': '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'x-rpc-app_version': '1.5.0',
  'x-rpc-client_type': '5',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
}

interface HoyoResponse<T = unknown> {
  retcode: number
  message?: string
  data?: T
}

interface GameRecordList {
  list: Array<{
    game_id: number
    game_role_id: string
    nickname: string
  }>
}

function extractUid(cookie: string): string | null {
  const match = cookie.match(/(?:ltuid_v2|ltuid|account_id_v2|account_id)=([0-9]+)/)
  return match ? match[1]! : null
}

function extractLang(cookie: string): string {
  const match = cookie.match(/mi18nLang=([a-zA-Z0-9_-]+)/)
  return match ? match[1]!.toLowerCase() : 'en-us'
}

async function hoyoFetch<T>(
  url: string,
  method: 'GET' | 'POST',
  cookie: string,
  params: Record<string, string>,
  signgame?: string | null,
): Promise<HoyoResponse<T>> {
  const lang = extractLang(cookie)
  const headers: Record<string, string> = {
    ...BASE_HEADERS,
    'accept-language': `${lang},en-US;q=0.9,en;q=0.8`,
    'x-rpc-language': lang,
    cookie,
  }
  if (signgame) {
    headers['x-rpc-signgame'] = signgame
  }

  const parsed = new URL(url)
  parsed.searchParams.set('lang', lang)

  let body: string | undefined

  if (method === 'GET') {
    for (const [k, v] of Object.entries(params)) {
      parsed.searchParams.set(k, v)
    }
  } else {
    body = JSON.stringify(params)
  }

  const res = await fetchWithRetry(parsed.toString(), { method, headers, body })
  try {
    return (await res.json()) as HoyoResponse<T>
  } catch {
    return { retcode: -1, message: 'Invalid JSON response' }
  }
}

export const hoyolab: Provider = {
  name: 'hoyolab',
  async checkIn(account: Account): Promise<CheckInResult> {
    const config = GAMES[account.game as CanonicalHoyoGame]
    if (!config) {
      return { status: 'error', message: `Unknown Hoyolab game: ${account.game}` }
    }

    logger.info(`  Checking in ${config.name} via hoyolab for ${account.name}...`)

    const cookie = account.credentials.cookie
    if (!cookie) {
      return { status: 'error', message: 'Missing credentials (cookie)' }
    }

    const lang = extractLang(cookie)
    const isFr = lang.startsWith('fr')

    try {
      const uid = extractUid(cookie)
      const profilePromise =
        uid && config.gameId > 0
          ? hoyoFetch<GameRecordList>(
              'https://bbs-api-os.hoyolab.com/game_record/card/wapi/getGameRecordCard',
              'GET',
              cookie,
              {
                uid,
              },
            ).catch(() => null)
          : null

      const checkInPromise = hoyoFetch(config.signUrl, 'POST', cookie, { act_id: config.actId }, config.signgame)

      const [record, res] = await Promise.all([profilePromise, checkInPromise])

      if (record && record.retcode === 0 && record.data?.list) {
        const profile = record.data.list.find((p) => p.game_id === config.gameId)
        if (profile) {
          const loggedPrefix = isFr ? 'Connecté en tant que' : 'Logged in as'
          logger.info(`  [${account.name}] ${loggedPrefix} ${profile.nickname} (${profile.game_role_id})`)
        }
      }

      if (res.retcode === 0) {
        const defaultMsg = isFr ? 'Connexion validée avec succès' : 'Claimed successfully'
        return { status: 'success', message: res.message || defaultMsg }
      }
      if (res.retcode === -5003 || res.message?.includes('already')) {
        const defaultMsg = isFr ? "Connexion quotidienne déjà effectuée aujourd'hui" : 'Already claimed'
        return { status: 'already_claimed', message: res.message || defaultMsg }
      }
      return { status: 'error', message: res.message || `Code ${res.retcode}` }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { status: 'error', message: msg }
    }
  },
}

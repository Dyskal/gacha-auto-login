import { CryptoHasher, MD5 } from 'bun'

import type { Account } from '../utils/config'
import { fetchWithRetry } from '../utils/http'
import logger from '../utils/logger'
import type { CheckInResult, Provider } from './index'

interface ApiResponse<T = unknown> {
  code?: number
  status?: number
  message?: string
  msg?: string
  data?: T
}

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
} as const

const BASE_HEADERS: Record<string, string> = {
  accept: '*/*',
  'accept-language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7',
  'content-type': 'application/json',
  origin: 'https://game.skport.com',
  platform: '3',
  priority: 'u=1, i',
  referer: 'https://game.skport.com/',
  'sec-ch-ua': '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'sk-language': 'en',
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
  vname: '1.0.0',
}

function generateSignV2(path: string, timestamp: string, salt: string): string {
  const headerJson = `{"platform":"3","timestamp":"${timestamp}","dId":"","vName":"1.0.0"}`
  const s = `${path}${timestamp}${headerJson}`
  const hmac = new CryptoHasher('sha256', salt).update(s).digest('hex')
  return MD5.hash(hmac, 'hex')
}

async function performOAuthFlow(accountToken: string): Promise<{ cred: string; salt: string }> {
  const basicRes = await fetchWithRetry(
    `https://as.gryphline.com/user/info/v1/basic?token=${encodeURIComponent(accountToken)}`,
    {
      method: 'GET',
      headers: JSON_HEADERS,
    },
  )
  const basic = (await basicRes.json()) as ApiResponse
  if (basic.status !== 0) {
    throw new Error(`OAuth step 1 failed: ${basic.msg || `status ${basic.status}`}`)
  }

  const grantRes = await fetchWithRetry('https://as.gryphline.com/user/oauth2/v2/grant', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ token: accountToken, appCode: '6eb76d4e13aa36e6', type: 0 }),
  })
  const grant = (await grantRes.json()) as ApiResponse<{ code: string }>
  if (grant.status !== 0 || !grant.data?.code) {
    throw new Error(`OAuth step 2 failed: ${grant.msg || `status ${grant.status}`}`)
  }

  const credRes = await fetchWithRetry('https://zonai.skport.com/web/v1/user/auth/generate_cred_by_code', {
    method: 'POST',
    headers: {
      ...JSON_HEADERS,
      Origin: 'https://www.skport.com',
      Referer: 'https://www.skport.com/',
      platform: '3',
    },
    body: JSON.stringify({ code: grant.data.code, kind: 1 }),
  })
  const credData = (await credRes.json()) as ApiResponse<{ cred: string; token: string }>
  if (credData.code !== 0 || !credData.data?.cred) {
    throw new Error(`OAuth step 3 failed: ${credData.message || `code ${credData.code}`}`)
  }

  return { cred: credData.data.cred, salt: credData.data.token }
}

async function skportFetch<T = unknown>(
  path: string,
  method: 'GET' | 'POST',
  cred: string,
  salt: string,
  gameRole?: string,
): Promise<ApiResponse<T>> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signPath = `/web/v1/${path}`
  const sign = generateSignV2(signPath, timestamp, salt)

  const headers: Record<string, string> = {
    ...BASE_HEADERS,
    cred,
    sign,
    timestamp,
  }
  if (gameRole) {
    headers['sk-game-role'] = gameRole
  }

  const res = await fetchWithRetry(`https://zonai.skport.com${signPath}`, { method, headers })
  try {
    return (await res.json()) as ApiResponse<T>
  } catch {
    return { code: -1, message: 'Invalid JSON response' }
  }
}

export const skport: Provider = {
  name: 'skport',
  async checkIn(account: Account): Promise<CheckInResult> {
    const gameName = account.game === 'endfield' ? 'Arknights: Endfield' : account.game
    logger.info(`  Checking in ${gameName} via skport for ${account.name}...`)

    const accountToken = account.credentials.account_token
    if (!accountToken) {
      return { status: 'error', message: 'Missing account_token' }
    }

    try {
      const { cred, salt } = await performOAuthFlow(accountToken)

      const profilePromise = skportFetch<{ user: { nickname: string; userId: string } }>(
        'wiki/me',
        'GET',
        cred,
        salt,
      ).catch(() => null)

      const checkInPromise = skportFetch(
        'game/endfield/attendance',
        'POST',
        cred,
        salt,
        account.credentials.sk_game_role,
      )

      const [profileRes, res] = await Promise.all([profilePromise, checkInPromise])

      if (profileRes?.code === 0 && profileRes.data?.user) {
        logger.info(
          `  [${account.name}] Logged in as ${profileRes.data.user.nickname} (${profileRes.data.user.userId})`,
        )
      }

      if (res.code === 0) {
        return { status: 'success', message: 'Claimed successfully' }
      }
      if (res.code === 10001 || res.message?.includes('has already')) {
        return { status: 'already_claimed', message: res.message || 'Already claimed' }
      }
      return { status: 'error', message: res.message || `Code ${res.code}` }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { status: 'error', message: msg }
    }
  },
}

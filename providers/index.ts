import {skport} from './skport'
import type {Account, ProviderName} from '../utils/config'

export interface CheckInResult {
  status: 'success' | 'already_claimed' | 'error'
  message?: string
}

export interface Provider {
  name: ProviderName
  checkIn(account: Account): Promise<CheckInResult>
}

export const providers: Record<ProviderName, Provider> = {
  skport,
}

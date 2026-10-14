import {
  deleteSecurityKey,
  getSecurityKey,
  getSecurityKeyTtl,
  incrementCounterWithWindow,
  setSecurityKey,
} from '@/lib/security-store'
import { normalizeIpAddress } from '@/lib/ip-security'

const FAILED_LOGIN_WINDOW_SECONDS = 10 * 60
const FAILED_LOGIN_LIMIT = 5
const IP_LOCK_SECONDS = 15 * 60

const ACCOUNT_FAILED_WINDOW_SECONDS = 60 * 60
const ACCOUNT_FAILED_LIMIT = 10
const ACCOUNT_LOCK_SECONDS = 60 * 60

function ipFailedCountKey(ipAddress: string) {
  return `security:login:ip:failed-count:${ipAddress}`
}

function ipLockKey(ipAddress: string) {
  return `security:login:ip:lock:${ipAddress}`
}

function accountFailedCountKey(userId: string) {
  return `security:login:account:failed-count:${userId}`
}

function accountLockKey(userId: string) {
  return `security:login:account:lock:${userId}`
}

function accountAlertKey(userId: string) {
  return `security:login:account:alert-sent:${userId}`
}

export async function getIpLoginLockRemainingSeconds(ipAddress: string) {
  const normalizedIp = normalizeIpAddress(ipAddress)
  if (!normalizedIp) return 0
  return getSecurityKeyTtl(ipLockKey(normalizedIp))
}

export async function getAccountLockRemainingSeconds(userId: string) {
  if (!userId) return 0
  return getSecurityKeyTtl(accountLockKey(userId))
}

export async function registerFailedLoginAttempt(input: {
  ipAddress: string
  userId?: string | null
}) {
  const ipAddress = normalizeIpAddress(input.ipAddress)
  if (!ipAddress) {
    return {
      ipAttempts: 0,
      ipLockTriggered: false,
      ipRetryAfterSeconds: 0,
      accountAttempts: 0,
      accountLockTriggered: false,
      accountRetryAfterSeconds: 0,
    }
  }

  const ipResult = await incrementCounterWithWindow(
    ipFailedCountKey(ipAddress),
    FAILED_LOGIN_WINDOW_SECONDS
  )

  let ipLockTriggered = false
  let ipRetryAfterSeconds = 0
  if (ipResult.count >= FAILED_LOGIN_LIMIT) {
    await setSecurityKey(ipLockKey(ipAddress), '1', IP_LOCK_SECONDS)
    ipLockTriggered = true
    ipRetryAfterSeconds = IP_LOCK_SECONDS
  }

  let accountAttempts = 0
  let accountLockTriggered = false
  let accountRetryAfterSeconds = 0

  if (input.userId) {
    const accountResult = await incrementCounterWithWindow(
      accountFailedCountKey(input.userId),
      ACCOUNT_FAILED_WINDOW_SECONDS
    )
    accountAttempts = accountResult.count

    if (accountResult.count >= ACCOUNT_FAILED_LIMIT) {
      await setSecurityKey(accountLockKey(input.userId), '1', ACCOUNT_LOCK_SECONDS)
      accountLockTriggered = true
      accountRetryAfterSeconds = ACCOUNT_LOCK_SECONDS
    }
  }

  return {
    ipAttempts: ipResult.count,
    ipLockTriggered,
    ipRetryAfterSeconds,
    accountAttempts,
    accountLockTriggered,
    accountRetryAfterSeconds,
  }
}

export async function clearLoginFailureState(input: {
  ipAddress: string
  userId?: string | null
}) {
  const ipAddress = normalizeIpAddress(input.ipAddress)
  if (ipAddress) {
    await Promise.all([
      deleteSecurityKey(ipFailedCountKey(ipAddress)),
      deleteSecurityKey(ipLockKey(ipAddress)),
    ])
  }

  if (input.userId) {
    await Promise.all([
      deleteSecurityKey(accountFailedCountKey(input.userId)),
      deleteSecurityKey(accountLockKey(input.userId)),
      deleteSecurityKey(accountAlertKey(input.userId)),
    ])
  }
}

export async function shouldSendAccountSecurityAlert(userId: string) {
  if (!userId) return false
  const existing = await getSecurityKey(accountAlertKey(userId))
  if (existing) return false
  await setSecurityKey(accountAlertKey(userId), '1', ACCOUNT_LOCK_SECONDS)
  return true
}

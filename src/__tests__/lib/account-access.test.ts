import { describe, it, expect } from 'vitest'
import { getPrimaryWorkspacePath, shouldShowSetupLinks } from '@/lib/account-access'

describe('account access helpers', () => {
  it('returns merchant workspace for merchant accounts', () => {
    expect(getPrimaryWorkspacePath({ role: 'merchant', hasMerchant: true, hasRider: false })).toBe('/merchant/overview')
  })

  it('returns rider workspace for rider accounts', () => {
    expect(getPrimaryWorkspacePath({ role: 'rider', hasMerchant: false, hasRider: true })).toBe('/rider')
  })

  it('shows setup links only for customer accounts', () => {
    expect(shouldShowSetupLinks({ role: 'customer', hasMerchant: false, hasRider: false })).toBe(true)
  })

  it('hides setup links for operator accounts', () => {
    expect(shouldShowSetupLinks({ role: 'merchant', hasMerchant: true, hasRider: false })).toBe(false)
  })
})

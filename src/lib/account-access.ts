export type AccountStatus = {
  role?: 'customer' | 'merchant' | 'rider' | 'admin'
  hasMerchant: boolean
  hasRider: boolean
}

export function getPrimaryWorkspacePath(status: AccountStatus): '/merchant/overview' | '/rider' | null {
  if (status.hasMerchant) return '/merchant/overview'
  if (status.hasRider) return '/rider'
  if (status.role === 'merchant') return '/merchant/overview'
  if (status.role === 'rider') return '/rider'
  return null
}

export function shouldShowSetupLinks(status: AccountStatus): boolean {
  return getPrimaryWorkspacePath(status) === null
}

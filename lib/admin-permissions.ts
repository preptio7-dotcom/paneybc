/**
 * Admin Permission System
 *
 * Super admins always have ALL permissions.
 * Regular admins have permissions granted by the super admin
 * via the `adminPermissions` JSON field on the User model.
 */

export type AdminPermissions = {
  canManageAds: boolean
  canManagePayments: boolean
  // Add more granular permissions here in the future:
  // canManageUsers: boolean
  // canManageBlog: boolean
  // canManageSettings: boolean
}

export const DEFAULT_ADMIN_PERMISSIONS: AdminPermissions = {
  canManageAds: false, // admins do NOT get ads access by default
  canManagePayments: false, // admins do NOT get payments access by default
}

export function getAdminPermissions(
  role: string,
  rawPermissions?: unknown
): AdminPermissions {
  // Super admins always have full access
  if (role === 'super_admin') {
    return {
      canManageAds: true,
      canManagePayments: true,
    }
  }

  // For regular admins, merge defaults with saved permissions
  if (role === 'admin') {
    const saved =
      rawPermissions &&
      typeof rawPermissions === 'object' &&
      !Array.isArray(rawPermissions)
        ? (rawPermissions as Partial<AdminPermissions>)
        : {}

    return {
      ...DEFAULT_ADMIN_PERMISSIONS,
      ...saved,
    }
  }

  // Non-admin users have no permissions
  return { ...DEFAULT_ADMIN_PERMISSIONS }
}

export function hasPermission(
  role: string,
  rawPermissions: unknown,
  permission: keyof AdminPermissions
): boolean {
  const perms = getAdminPermissions(role, rawPermissions)
  return perms[permission] === true
}

import type { Access, FieldAccess } from 'payload'

/**
 * Multi-tenant access control.
 * Users have a `sites` relationship field (array of Site IDs).
 * They can only read/update/delete documents belonging to their assigned sites.
 * Admins bypass all restrictions.
 */

export const isSuperAdmin: Access = ({ req: { user } }) => {
  return user?.role === 'superadmin'
}

// Collection-level: filter documents to only those matching the user's assigned sites
export const tenantAccess: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'superadmin') return true

  const siteIds: string[] = user.sites?.map((s: any) =>
    typeof s === 'string' ? s : s.id,
  ) ?? []

  if (siteIds.length === 0) return false

  return {
    site: {
      in: siteIds,
    },
  }
}

// Create access: user must have at least one site assigned
export const tenantCreateAccess: Access = ({ req: { user } }) => {
  if (!user) return false
  if (user.role === 'superadmin') return true
  return (user.sites?.length ?? 0) > 0
}

// Field-level: prevent non-admins from changing the `site` field after creation
export const siteFieldAccess: FieldAccess = ({ req: { user }, doc }) => {
  if (user?.role === 'superadmin') return true
  // If document already exists, lock the site field
  if (doc?.site) return false
  return true
}

import type { CollectionConfig } from 'payload'
import { isSuperAdmin } from '../access/tenantAccess'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'superadmin') return true
      // Users can only read their own profile
      return { id: { equals: user.id } }
    },
    create: isSuperAdmin,
    update: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'superadmin') return true
      return { id: { equals: user.id } }
    },
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'editor',
      options: [
        { label: 'Super Admin', value: 'superadmin' },
        { label: 'Site Admin', value: 'siteadmin' },
        { label: 'Editor', value: 'editor' },
      ],
      access: {
        update: ({ req: { user } }) => user?.role === 'superadmin',
      },
    },
    {
      name: 'sites',
      type: 'relationship',
      relationTo: 'sites',
      hasMany: true,
      admin: {
        description: 'Sites this user can manage',
      },
      access: {
        update: ({ req: { user } }) =>
          user?.role === 'superadmin' || user?.role === 'siteadmin',
      },
    },
  ],
}

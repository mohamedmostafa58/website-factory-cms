import type { CollectionConfig } from 'payload'
import { tenantAccess, tenantCreateAccess, siteFieldAccess } from '../access/tenantAccess'

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    mimeTypes: ['image/*', 'video/*', 'application/pdf'],
  },
  access: {
    read: () => true, // Public read for media
    create: tenantCreateAccess,
    update: tenantAccess,
    delete: tenantAccess,
  },
  fields: [
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: true,
      access: { update: siteFieldAccess },
    },
    { name: 'alt', type: 'text', required: true },
  ],
}

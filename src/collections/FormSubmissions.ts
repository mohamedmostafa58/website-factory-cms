import type { CollectionConfig } from 'payload'
import { tenantAccess } from '../access/tenantAccess'

export const FormSubmissions: CollectionConfig = {
  slug: 'form-submissions',
  admin: {
    useAsTitle: 'createdAt',
    defaultColumns: ['site', 'page', 'createdAt'],
  },
  access: {
    read: tenantAccess,
    create: () => true, // Public — submitted by site visitors
    update: tenantAccess,
    delete: tenantAccess,
  },
  fields: [
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: true,
    },
    {
      name: 'page',
      type: 'text',
      admin: { description: 'Page slug where form was submitted' },
    },
    {
      name: 'data',
      type: 'json',
      required: true,
      admin: { description: 'Form field values as JSON' },
    },
  ],
}

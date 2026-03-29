import type { CollectionConfig } from 'payload'
import { isSuperAdmin } from '../access/tenantAccess'

export const Sites: CollectionConfig = {
  slug: 'sites',
  admin: {
    useAsTitle: 'name',
    description: 'Each site represents a tenant website in the factory',
  },
  access: {
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'superadmin') return true
      const siteIds: string[] = user.sites?.map((s: any) =>
        typeof s === 'string' ? s : s.id,
      ) ?? []
      return { id: { in: siteIds } }
    },
    create: isSuperAdmin,
    update: isSuperAdmin,
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Display name for this site (e.g., "Acme Corp")' },
    },
    {
      name: 'domain',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Primary domain (e.g., "acme.example.com")' },
    },
    {
      name: 'domains',
      type: 'array',
      admin: { description: 'Additional domains / aliases' },
      fields: [
        {
          name: 'domain',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'active',
      options: [
        { label: 'Active', value: 'active' },
        { label: 'Maintenance', value: 'maintenance' },
        { label: 'Disabled', value: 'disabled' },
      ],
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        // Trigger frontend cache invalidation via webhook
        const webhookUrl = process.env.FRONTEND_WEBHOOK_URL
        if (webhookUrl) {
          try {
            await fetch(`${webhookUrl}/api/webhook/invalidate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': process.env.WEBHOOK_SECRET ?? '',
              },
              body: JSON.stringify({
                type: 'site',
                siteId: doc.id,
                domain: doc.domain,
              }),
            })
          } catch (e) {
            req.payload.logger.error(`Failed to invalidate cache for site ${doc.id}`)
          }
        }
        return doc
      },
    ],
  },
}

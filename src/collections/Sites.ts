import type { CollectionConfig } from 'payload'
import { isSuperAdmin } from '../access/tenantAccess'
import { createSiteRepo } from '../hooks/createSiteRepo'

export const Sites: CollectionConfig = {
  slug: 'sites',
  admin: {
    useAsTitle: 'name',
    description: 'Create a new site — just enter a name and save. Everything else is automatic.',
    defaultColumns: ['name', 'pagesUrl', 'repoUrl', 'provisioningStatus', 'status'],
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
    // ── What you fill in ──
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Site name (e.g., "Acme Corp"). The repo + project name is auto-generated from this.' },
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      admin: {
        description: 'Auto-generated from name. Used as GitHub repo name + CF Pages project name.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data, operation }) => {
            if ((!value || operation === 'create') && data?.name) {
              return data.name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
            }
            return value
          },
        ],
      },
    },
    {
      name: 'domain',
      type: 'text',
      required: true,
      unique: true,
      admin: { description: 'Auto-generated: {slug}.pages.dev — or set a custom domain.' },
      hooks: {
        beforeValidate: [
          ({ value, data, operation }) => {
            if ((!value || operation === 'create') && data?.name) {
              const s = (data.slug || data.name)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '')
              return `${s}.pages.dev`
            }
            return value
          },
        ],
      },
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

    // ── Auto-provisioned (read-only, filled by hook) ──
    {
      name: 'pagesUrl',
      type: 'text',
      admin: {
        description: 'Live site URL (Cloudflare Pages) — auto-created on save',
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'repoUrl',
      type: 'text',
      admin: {
        description: 'GitHub repo — auto-created on save',
        readOnly: true,
        position: 'sidebar',
      },
    },

    // ── Provisioning status + log ──
    {
      name: 'provisioningStatus',
      type: 'select',
      defaultValue: 'pending',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Auto-provisioning status',
      },
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Complete', value: 'complete' },
        { label: 'Failed', value: 'failed' },
      ],
    },
    {
      name: 'provisioningLog',
      type: 'textarea',
      admin: {
        readOnly: true,
        description: 'Step-by-step provisioning log. Refresh the page after saving to see updates.',
      },
    },

    // ── Custom Domains ──
    {
      name: 'customDomains',
      type: 'array',
      admin: {
        description: 'Optional: add custom domains. After adding, create a CNAME DNS record pointing to your Pages URL above.',
      },
      fields: [
        {
          name: 'domain',
          type: 'text',
          required: true,
          admin: { description: 'e.g., "www.acmecorp.com"' },
        },
        {
          name: 'dnsStatus',
          type: 'select',
          defaultValue: 'pending',
          admin: { readOnly: true },
          options: [
            { label: 'Pending DNS', value: 'pending' },
            { label: 'Active', value: 'active' },
            { label: 'Error', value: 'error' },
          ],
        },
      ],
    },
  ],
  hooks: {
    afterChange: [
      // On CREATE: auto-provision everything
      createSiteRepo,

      // On UPDATE: handle new custom domains
      async ({ doc, operation, previousDoc, req }) => {
        if (operation !== 'update') return doc

        const cfApiToken = process.env.CF_API_TOKEN
        const cfAccountId = process.env.CF_ACCOUNT_ID
        if (!cfApiToken || !cfAccountId) return doc

        const pagesUrl = doc.pagesUrl as string | undefined
        if (!pagesUrl) return doc
        const pagesProject = pagesUrl.replace('https://', '').replace('.pages.dev', '')

        const currentDomains = (doc.customDomains as any[] | undefined) ?? []
        const previousDomains = (previousDoc?.customDomains as any[] | undefined) ?? []
        const previousDomainNames = new Set(previousDomains.map((d: any) => d.domain))

        for (const entry of currentDomains) {
          if (previousDomainNames.has(entry.domain)) continue

          req.payload.logger.info(`Adding custom domain ${entry.domain} to ${pagesProject}`)
          try {
            const res = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${pagesProject}/domains`,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${cfApiToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: entry.domain }),
              },
            )
            if (!res.ok) {
              req.payload.logger.warn(`Domain ${entry.domain}: ${await res.text()}`)
            }
          } catch (e) {
            req.payload.logger.error(`Error adding domain ${entry.domain}: ${e}`)
          }
        }

        return doc
      },
    ],
  },
}

import type { CollectionConfig } from 'payload'
import { isSuperAdmin } from '../access/tenantAccess'
import { createSiteRepo } from '../hooks/createSiteRepo'

export const Sites: CollectionConfig = {
  slug: 'sites',
  admin: {
    useAsTitle: 'name',
    description: 'Each site = its own GitHub repo + Cloudflare Pages project',
    defaultColumns: ['name', 'domain', 'pagesUrl', 'status'],
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
    // ── Basic Info ──
    {
      name: 'name',
      type: 'text',
      required: true,
      admin: { description: 'Display name (e.g., "Acme Corp")' },
    },
    {
      name: 'domain',
      type: 'text',
      required: true,
      unique: true,
      admin: {
        description: 'Primary domain for this site (e.g., "acme.example.com"). Used as the CF Pages project name.',
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

    // ── Auto-provisioned (read-only) ──
    {
      type: 'row',
      fields: [
        {
          name: 'pagesUrl',
          type: 'text',
          admin: {
            description: 'Cloudflare Pages URL — auto-created. This is the live site URL.',
            readOnly: true,
            width: '50%',
          },
        },
        {
          name: 'repoUrl',
          type: 'text',
          admin: {
            description: 'GitHub repo — auto-created.',
            readOnly: true,
            width: '50%',
          },
        },
      ],
    },

    // ── Custom Domains ──
    {
      name: 'customDomains',
      type: 'array',
      admin: {
        description: 'Custom domains to add to this site. After adding, set a CNAME record pointing to the Pages URL above.',
      },
      fields: [
        {
          name: 'domain',
          type: 'text',
          required: true,
          admin: { description: 'e.g., "www.acmecorp.com"' },
        },
        {
          name: 'status',
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
      // On CREATE: auto-create GitHub repo + CF Pages project + default content
      createSiteRepo,

      // On UPDATE: if customDomains changed, add them to CF Pages
      async ({ doc, operation, previousDoc, req }) => {
        if (operation !== 'update') return doc

        const cfApiToken = process.env.CF_API_TOKEN
        const cfAccountId = process.env.CF_ACCOUNT_ID
        if (!cfApiToken || !cfAccountId) return doc

        // Get the pages project name from pagesUrl
        const pagesUrl = doc.pagesUrl as string | undefined
        if (!pagesUrl) return doc
        const pagesProject = pagesUrl
          .replace('https://', '')
          .replace('.pages.dev', '')

        // Check for new custom domains
        const currentDomains = (doc.customDomains as any[] | undefined) ?? []
        const previousDomains = (previousDoc?.customDomains as any[] | undefined) ?? []
        const previousDomainNames = new Set(previousDomains.map((d: any) => d.domain))

        for (const entry of currentDomains) {
          if (previousDomainNames.has(entry.domain)) continue

          // New domain — add to CF Pages
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

            if (res.ok) {
              req.payload.logger.info(`Domain ${entry.domain} added — set CNAME to ${pagesProject}.pages.dev`)
            } else {
              const err = await res.text()
              req.payload.logger.warn(`Failed to add domain ${entry.domain}: ${err}`)
            }
          } catch (e) {
            req.payload.logger.error(`Error adding domain ${entry.domain}: ${e}`)
          }
        }

        return doc
      },

      // Trigger cache invalidation on the site's own Pages URL
      async ({ doc, req }) => {
        const pagesUrl = doc.pagesUrl as string | undefined
        if (!pagesUrl) return doc

        try {
          await fetch(`${pagesUrl}/api/webhook/invalidate`, {
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

        return doc
      },
    ],
  },
}

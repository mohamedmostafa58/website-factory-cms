import type { CollectionConfig } from 'payload'
import { tenantAccess, tenantCreateAccess, siteFieldAccess } from '../access/tenantAccess'
import { HeroBlock } from '../blocks/Hero'
import { ContentBlock } from '../blocks/Content'
import { ImageGalleryBlock } from '../blocks/ImageGallery'
import { ContactFormBlock } from '../blocks/ContactForm'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'site', 'status', 'updatedAt'],
  },
  access: {
    read: tenantAccess,
    create: tenantCreateAccess,
    update: tenantAccess,
    delete: tenantAccess,
  },
  versions: {
    drafts: true,
  },
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        const webhookUrl = process.env.FRONTEND_WEBHOOK_URL
        if (webhookUrl) {
          const siteId = typeof doc.site === 'string' ? doc.site : doc.site?.id
          try {
            await fetch(`${webhookUrl}/api/webhook/invalidate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': process.env.WEBHOOK_SECRET ?? '',
              },
              body: JSON.stringify({
                type: 'page',
                siteId,
                pageSlug: doc.slug,
              }),
            })
          } catch (e) {
            req.payload.logger.error(`Failed to invalidate page cache: ${doc.slug}`)
          }
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: true,
      index: true,
      access: { update: siteFieldAccess },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: false, // unique per site, enforced via hook
      index: true,
      admin: { description: 'URL slug (e.g., "about-us"). Must be unique per site.' },
      hooks: {
        beforeValidate: [
          ({ value, data }) => {
            if (!value && data?.title) {
              return data.title
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
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
    },
    {
      name: 'isHomePage',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Set as the home page for this site' },
    },
    // ── Page-level style overrides ──
    {
      name: 'pageStyle',
      type: 'group',
      label: 'Page Style Overrides',
      admin: { description: 'Override site-level theme for this specific page' },
      fields: [
        {
          name: 'template',
          type: 'select',
          defaultValue: 'default',
          options: [
            { label: 'Default (inherit site theme)', value: 'default' },
            { label: 'Landing Page', value: 'landing' },
            { label: 'Blog Post', value: 'blog' },
            { label: 'Full Width', value: 'full-width' },
            { label: 'Sidebar Layout', value: 'sidebar' },
          ],
        },
        { name: 'overridePrimaryColor', type: 'text', admin: { description: 'Leave empty to inherit' } },
        { name: 'overrideBackgroundColor', type: 'text' },
        { name: 'customCSS', type: 'code', admin: { language: 'css', description: 'Additional CSS for this page' } },
      ],
    },
    // ── SEO ──
    {
      name: 'seo',
      type: 'group',
      fields: [
        { name: 'metaTitle', type: 'text' },
        { name: 'metaDescription', type: 'textarea' },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
      ],
    },
    // ── Page Builder Blocks ──
    {
      name: 'blocks',
      type: 'blocks',
      label: 'Page Content',
      blocks: [HeroBlock, ContentBlock, ImageGalleryBlock, ContactFormBlock],
    },
  ],
}

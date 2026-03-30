import type { CollectionConfig } from 'payload'
import { tenantAccess, tenantCreateAccess, siteFieldAccess } from '../access/tenantAccess'
import { invalidateSiteCache } from '../hooks/invalidateCache'

/**
 * SiteSettings — one document per site.
 * Stores theme variables, navigation, SEO defaults, and layout preferences.
 * Acts like a "Global per tenant" pattern using a Collection with unique site constraint.
 */
export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  admin: {
    useAsTitle: 'site',
    description: 'Per-site design tokens, navigation, and layout settings',
  },
  access: {
    read: tenantAccess,
    create: tenantCreateAccess,
    update: tenantAccess,
    delete: tenantAccess,
  },
  hooks: {
    afterChange: [
      async ({ doc, req }) => {
        const siteId = typeof doc.site === 'string' ? doc.site : doc.site?.id
        if (siteId) await invalidateSiteCache(req.payload, siteId, { type: 'settings' })
        return doc
      },
    ],
  },
  fields: [
    // ── Tenant Link ──
    {
      name: 'site',
      type: 'relationship',
      relationTo: 'sites',
      required: true,
      unique: true,
      access: { update: siteFieldAccess },
      admin: { description: 'The site these settings belong to' },
    },

    // ── Theme / Design Tokens ──
    {
      name: 'theme',
      type: 'group',
      label: 'Theme & Styling',
      fields: [
        {
          name: 'primaryColor',
          type: 'text',
          required: true,
          defaultValue: '#3B82F6',
          admin: { description: 'Primary brand color (hex)', components: {} },
        },
        {
          name: 'secondaryColor',
          type: 'text',
          required: true,
          defaultValue: '#10B981',
          admin: { description: 'Secondary accent color (hex)' },
        },
        {
          name: 'accentColor',
          type: 'text',
          defaultValue: '#F59E0B',
          admin: { description: 'Accent / highlight color (hex)' },
        },
        {
          name: 'backgroundColor',
          type: 'text',
          defaultValue: '#FFFFFF',
          admin: { description: 'Page background color' },
        },
        {
          name: 'textColor',
          type: 'text',
          defaultValue: '#1F2937',
          admin: { description: 'Default body text color' },
        },
        {
          name: 'fontFamily',
          type: 'select',
          defaultValue: 'inter',
          options: [
            { label: 'Inter', value: 'inter' },
            { label: 'Roboto', value: 'roboto' },
            { label: 'Poppins', value: 'poppins' },
            { label: 'Playfair Display', value: 'playfair' },
            { label: 'Montserrat', value: 'montserrat' },
            { label: 'DM Sans', value: 'dm-sans' },
            { label: 'System Default', value: 'system' },
          ],
        },
        {
          name: 'headingFontFamily',
          type: 'select',
          defaultValue: 'inherit',
          options: [
            { label: 'Same as Body', value: 'inherit' },
            { label: 'Inter', value: 'inter' },
            { label: 'Roboto', value: 'roboto' },
            { label: 'Poppins', value: 'poppins' },
            { label: 'Playfair Display', value: 'playfair' },
            { label: 'Montserrat', value: 'montserrat' },
            { label: 'DM Sans', value: 'dm-sans' },
          ],
        },
        {
          name: 'borderRadius',
          type: 'select',
          defaultValue: 'md',
          options: [
            { label: 'None', value: 'none' },
            { label: 'Small (4px)', value: 'sm' },
            { label: 'Medium (8px)', value: 'md' },
            { label: 'Large (12px)', value: 'lg' },
            { label: 'Extra Large (16px)', value: 'xl' },
            { label: 'Full / Pill', value: 'full' },
          ],
        },
        {
          name: 'layoutTheme',
          type: 'select',
          defaultValue: 'modern',
          admin: { description: 'Overall page structure / style preset' },
          options: [
            { label: 'Modern (clean, spacious)', value: 'modern' },
            { label: 'Classic (traditional, serif-friendly)', value: 'classic' },
            { label: 'Bold (large type, strong contrast)', value: 'bold' },
            { label: 'Minimal (stripped-down, focus on content)', value: 'minimal' },
          ],
        },
      ],
    },

    // ── Header Navigation ──
    {
      name: 'headerLinks',
      type: 'array',
      label: 'Header Navigation Links',
      admin: { description: 'Links shown in the site header / top nav' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
        {
          name: 'openInNewTab',
          type: 'checkbox',
          defaultValue: false,
        },
        {
          name: 'children',
          type: 'array',
          label: 'Dropdown Items',
          admin: { description: 'Sub-menu items (optional)' },
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'url', type: 'text', required: true },
            { name: 'openInNewTab', type: 'checkbox', defaultValue: false },
          ],
        },
      ],
    },

    // ── Footer Navigation ──
    {
      name: 'footerLinks',
      type: 'array',
      label: 'Footer Navigation Links',
      fields: [
        { name: 'groupLabel', type: 'text', required: true, admin: { description: 'Column heading' } },
        {
          name: 'links',
          type: 'array',
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'url', type: 'text', required: true },
            { name: 'openInNewTab', type: 'checkbox', defaultValue: false },
          ],
        },
      ],
    },

    // ── Footer Content ──
    {
      name: 'footerContent',
      type: 'group',
      fields: [
        { name: 'copyrightText', type: 'text', defaultValue: '© {year} All rights reserved.' },
        { name: 'showPoweredBy', type: 'checkbox', defaultValue: false },
      ],
    },

    // ── SEO Defaults ──
    {
      name: 'seo',
      type: 'group',
      label: 'Default SEO',
      fields: [
        { name: 'metaTitle', type: 'text' },
        { name: 'metaDescription', type: 'textarea' },
        { name: 'ogImage', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
}

import type { Block } from 'payload'

export const ContentBlock: Block = {
  slug: 'content',
  labels: { singular: 'Content', plural: 'Content Blocks' },
  fields: [
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'default',
      options: [
        { label: 'Default (full width)', value: 'default' },
        { label: 'Two Columns', value: 'two-col' },
        { label: 'Narrow / Centered', value: 'narrow' },
        { label: 'With Sidebar', value: 'sidebar' },
      ],
    },
    {
      name: 'columns',
      type: 'array',
      minRows: 1,
      maxRows: 3,
      fields: [
        {
          name: 'richText',
          type: 'richText',
          required: true,
        },
        {
          name: 'width',
          type: 'select',
          defaultValue: 'full',
          options: [
            { label: 'Full', value: 'full' },
            { label: 'Half', value: 'half' },
            { label: 'Third', value: 'third' },
            { label: 'Two Thirds', value: 'two-thirds' },
          ],
        },
      ],
    },
    {
      name: 'backgroundColor',
      type: 'select',
      defaultValue: 'transparent',
      options: [
        { label: 'Transparent', value: 'transparent' },
        { label: 'Light Gray', value: 'gray' },
        { label: 'Primary (light)', value: 'primary-light' },
        { label: 'Dark', value: 'dark' },
      ],
    },
  ],
}

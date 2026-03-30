import type { Block } from 'payload'

export const ContactFormBlock: Block = {
  slug: 'contactForm',
  labels: { singular: 'Contact Form', plural: 'Contact Forms' },
  fields: [
    { name: 'heading', type: 'text', defaultValue: 'Get in Touch' },
    { name: 'description', type: 'textarea' },
    {
      name: 'fields',
      type: 'array',
      label: 'Form Fields',
      minRows: 1,
      admin: {
        description: 'Add the fields you want in your form',
        initCollapsed: false,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'label',
              type: 'text',
              required: true,
              admin: { width: '30%', description: 'Field label shown to users' },
            },
            {
              name: 'name',
              type: 'text',
              required: true,
              admin: { width: '20%', description: 'Field name (e.g., "email")' },
              hooks: {
                beforeValidate: [
                  ({ value, siblingData }) => {
                    if (!value && siblingData?.label) {
                      return siblingData.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '')
                    }
                    return value
                  },
                ],
              },
            },
            {
              name: 'fieldType',
              type: 'select',
              required: true,
              defaultValue: 'text',
              admin: { width: '20%' },
              options: [
                { label: 'Text', value: 'text' },
                { label: 'Email', value: 'email' },
                { label: 'Phone', value: 'tel' },
                { label: 'Number', value: 'number' },
                { label: 'URL', value: 'url' },
                { label: 'Textarea', value: 'textarea' },
                { label: 'Select / Dropdown', value: 'select' },
                { label: 'Checkbox', value: 'checkbox' },
              ],
            },
            {
              name: 'required',
              type: 'checkbox',
              defaultValue: false,
              admin: { width: '10%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'placeholder',
              type: 'text',
              admin: { width: '40%', description: 'Placeholder text inside the field' },
            },
            {
              name: 'defaultValue',
              type: 'text',
              admin: { width: '30%', description: 'Default value (optional)' },
            },
            {
              name: 'width',
              type: 'select',
              defaultValue: 'full',
              admin: { width: '30%' },
              options: [
                { label: 'Full Width', value: 'full' },
                { label: 'Half Width', value: 'half' },
                { label: 'Third', value: 'third' },
              ],
            },
          ],
        },
        {
          name: 'helpText',
          type: 'text',
          admin: { description: 'Help text shown below the field (optional)' },
        },
        {
          name: 'options',
          type: 'array',
          admin: {
            condition: (_, siblingData) => siblingData?.fieldType === 'select',
            description: 'Dropdown options',
          },
          fields: [
            { name: 'label', type: 'text', required: true },
            { name: 'value', type: 'text', required: true },
          ],
        },
        {
          name: 'validation',
          type: 'group',
          admin: {
            condition: (_, siblingData) => ['text', 'number', 'textarea'].includes(siblingData?.fieldType),
          },
          fields: [
            { name: 'minLength', type: 'number', admin: { width: '50%' } },
            { name: 'maxLength', type: 'number', admin: { width: '50%' } },
          ],
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'submitLabel', type: 'text', defaultValue: 'Send Message', admin: { width: '50%' } },
        { name: 'successMessage', type: 'text', defaultValue: 'Thank you! We will be in touch.', admin: { width: '50%' } },
      ],
    },
    {
      name: 'recipientEmail',
      type: 'email',
      admin: { description: 'Where form submissions are sent (optional)' },
    },
    {
      name: 'layout',
      type: 'select',
      defaultValue: 'centered',
      options: [
        { label: 'Centered (narrow)', value: 'centered' },
        { label: 'Full Width', value: 'full' },
        { label: 'With Sidebar Text', value: 'split' },
      ],
    },
  ],
}

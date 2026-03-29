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
      minRows: 1,
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'fieldType',
          type: 'select',
          required: true,
          options: [
            { label: 'Text', value: 'text' },
            { label: 'Email', value: 'email' },
            { label: 'Phone', value: 'tel' },
            { label: 'Textarea', value: 'textarea' },
            { label: 'Select', value: 'select' },
          ],
        },
        { name: 'required', type: 'checkbox', defaultValue: false },
        {
          name: 'options',
          type: 'array',
          admin: {
            condition: (_, siblingData) => siblingData?.fieldType === 'select',
            description: 'Options for select fields',
          },
          fields: [{ name: 'label', type: 'text', required: true }, { name: 'value', type: 'text', required: true }],
        },
      ],
    },
    { name: 'submitLabel', type: 'text', defaultValue: 'Send Message' },
    { name: 'successMessage', type: 'text', defaultValue: 'Thank you! We will be in touch.' },
    {
      name: 'recipientEmail',
      type: 'email',
      admin: { description: 'Where form submissions are sent' },
    },
  ],
}

import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { Users } from './collections/Users'
import { Sites } from './collections/Sites'
import { SiteSettings } from './collections/SiteSettings'
import { Pages } from './collections/Pages'
import { Media } from './collections/Media'
import { FormSubmissions } from './collections/FormSubmissions'

export default buildConfig({
  // Use SQLite adapter — works with Cloudflare D1 via Turso driver
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URL ?? 'file:./data/payload.db',
      authToken: process.env.DATABASE_AUTH_TOKEN,
    },
  }),

  editor: lexicalEditor({}),

  // R2-compatible S3 storage for media uploads
  plugins: [
    s3Storage({
      collections: { media: true },
      bucket: process.env.R2_BUCKET ?? 'website-factory-media',
      config: {
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
        },
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT ?? '',
      },
    }),
  ],

  collections: [Users, Sites, SiteSettings, Pages, Media, FormSubmissions],

  // CORS: allow all tenant domains + admin domain
  cors: [
    process.env.ADMIN_URL ?? 'http://localhost:3000',
    // Wildcard patterns for tenant domains
    ...(process.env.CORS_ORIGINS?.split(',') ?? []),
  ],

  // API configuration
  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL ?? 'http://localhost:3000',

  secret: process.env.PAYLOAD_SECRET ?? 'CHANGE-ME-IN-PRODUCTION',

  typescript: {
    outputFile: './src/payload-types.ts',
  },

  admin: {
    user: Users.slug,
    meta: {
      titleSuffix: '— Website Factory',
    },
  },

  // Custom REST endpoints for the frontend to bulk-fetch site data
  endpoints: [
    {
      path: '/site-bundle/:domain',
      method: 'get',
      handler: async (req) => {
        const domain = req.routeParams?.domain as string
        if (!domain) {
          return Response.json({ error: 'Domain required' }, { status: 400 })
        }

        try {
          // Find site by domain
          const sites = await req.payload.find({
            collection: 'sites',
            where: {
              or: [
                { domain: { equals: domain } },
                { 'domains.domain': { equals: domain } },
              ],
            },
            limit: 1,
          })

          const site = sites.docs[0]
          if (!site) {
            return Response.json({ error: 'Site not found' }, { status: 404 })
          }

          // Fetch settings and pages in parallel
          const [settings, pages] = await Promise.all([
            req.payload.find({
              collection: 'site-settings',
              where: { site: { equals: site.id } },
              limit: 1,
            }),
            req.payload.find({
              collection: 'pages',
              where: {
                and: [
                  { site: { equals: site.id } },
                  { status: { equals: 'published' } },
                ],
              },
              limit: 100,
              depth: 2, // Resolve media relationships
            }),
          ])

          const bundle = {
            site: {
              id: site.id,
              name: site.name,
              domain: site.domain,
              status: site.status,
            },
            settings: settings.docs[0] ?? null,
            pages: pages.docs,
            fetchedAt: new Date().toISOString(),
          }

          return Response.json(bundle, {
            headers: {
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            },
          })
        } catch (error) {
          return Response.json({ error: 'Internal error' }, { status: 500 })
        }
      },
    },
  ],
})

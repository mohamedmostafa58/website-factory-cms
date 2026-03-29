import fs from 'fs'
import path from 'path'
import { sqliteD1Adapter } from '@payloadcms/db-d1-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { r2Storage } from '@payloadcms/storage-r2'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import { CloudflareContext, getCloudflareContext } from '@opennextjs/cloudflare'
import { GetPlatformProxyOptions } from 'wrangler'

import { Users } from './collections/Users'
import { Sites } from './collections/Sites'
import { SiteSettings } from './collections/SiteSettings'
import { Pages } from './collections/Pages'
import { Media } from './collections/Media'
import { FormSubmissions } from './collections/FormSubmissions'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const realpath = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : undefined)

const isCLI = process.argv.some((value) => realpath(value)?.endsWith(path.join('payload', 'bin.js')))
const isProduction = process.env.NODE_ENV === 'production'

// Cloudflare-compatible structured logger
const createLog =
  (level: string, fn: typeof console.log) => (objOrMsg: object | string, msg?: string) => {
    if (typeof objOrMsg === 'string') {
      fn(JSON.stringify({ level, msg: objOrMsg }))
    } else {
      fn(JSON.stringify({ level, ...objOrMsg, msg: msg ?? (objOrMsg as { msg?: string }).msg }))
    }
  }

const cloudflareLogger = {
  level: process.env.PAYLOAD_LOG_LEVEL || 'info',
  trace: createLog('trace', console.debug),
  debug: createLog('debug', console.debug),
  info: createLog('info', console.log),
  warn: createLog('warn', console.warn),
  error: createLog('error', console.error),
  fatal: createLog('fatal', console.error),
  silent: () => {},
} as any

// Get Cloudflare bindings (D1, R2, etc.)
const cloudflare =
  isCLI || !isProduction
    ? await getCloudflareContextFromWrangler()
    : await getCloudflareContext({ async: true })

export default buildConfig({
  // ── Database: Cloudflare D1 ──
  db: sqliteD1Adapter({ binding: cloudflare.env.D1 }),

  editor: lexicalEditor(),

  // ── Storage: Cloudflare R2 ──
  plugins: [
    r2Storage({
      bucket: cloudflare.env.R2,
      collections: { media: true },
    }),
  ],

  collections: [Users, Sites, SiteSettings, Pages, Media, FormSubmissions],

  secret: process.env.PAYLOAD_SECRET || '',

  logger: isProduction ? cloudflareLogger : undefined,

  serverURL: process.env.PAYLOAD_PUBLIC_SERVER_URL || process.env.ADMIN_URL || '',

  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },

  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: '— Website Factory',
    },
  },

  // CORS: allow frontend domains
  cors: [
    process.env.ADMIN_URL ?? '',
    process.env.FRONTEND_WEBHOOK_URL ?? '',
    ...(process.env.CORS_ORIGINS?.split(',').filter(Boolean) ?? []),
  ].filter(Boolean),

  // ── Custom endpoint: bulk fetch site data for frontend ──
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
              depth: 2,
            }),
          ])

          return Response.json({
            site: {
              id: site.id,
              name: site.name,
              domain: site.domain,
              status: site.status,
            },
            settings: settings.docs[0] ?? null,
            pages: pages.docs,
            fetchedAt: new Date().toISOString(),
          }, {
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

// Adapted from official Payload D1 template
function getCloudflareContextFromWrangler(): Promise<CloudflareContext> {
  return import(/* webpackIgnore: true */ `${'__wrangler'.replaceAll('_', '')}`).then(
    ({ getPlatformProxy }) =>
      getPlatformProxy({
        environment: process.env.CLOUDFLARE_ENV,
        remoteBindings: isProduction,
      } satisfies GetPlatformProxyOptions),
  )
}

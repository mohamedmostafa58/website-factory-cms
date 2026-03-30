/**
 * Shared cache invalidation helper.
 * Looks up the site's pagesUrl and sends a webhook to that specific site's frontend.
 */
import type { Payload } from 'payload'

export async function invalidateSiteCache(
  payload: Payload,
  siteId: string | number,
  extra: Record<string, any> = {},
): Promise<void> {
  try {
    const site = await payload.findByID({
      collection: 'sites',
      id: siteId,
    })

    const pagesUrl = (site as any)?.pagesUrl as string | undefined
    if (!pagesUrl) return

    await fetch(`${pagesUrl}/api/webhook/invalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.WEBHOOK_SECRET ?? '',
      },
      body: JSON.stringify({
        siteId,
        domain: site.domain,
        ...extra,
      }),
    })
  } catch (e) {
    payload.logger.error(`Cache invalidation failed for site ${siteId}: ${e}`)
  }
}

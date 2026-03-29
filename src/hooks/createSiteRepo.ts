/**
 * afterChange hook for the Sites collection.
 *
 * When a NEW site is created from the Payload admin GUI:
 * 1. Creates a GitHub repo from the frontend template repo
 * 2. Updates the repo's wrangler.toml with the site's domain / CMS URL
 * 3. Adds custom domain to Cloudflare Pages
 * 4. Creates default SiteSettings + Home page if not already done
 *
 * Required env vars:
 *   GITHUB_TOKEN          — GitHub PAT with repo scope
 *   GITHUB_TEMPLATE_OWNER — Owner of the template repo (e.g., "mohamedmostafa58")
 *   GITHUB_TEMPLATE_REPO  — Template repo name (e.g., "website-factory-frontend")
 *   GITHUB_OWNER          — Owner for new repos (defaults to GITHUB_TEMPLATE_OWNER)
 *   CF_API_TOKEN           — Cloudflare API token
 *   CF_ACCOUNT_ID          — Cloudflare account ID
 *   CF_PAGES_PROJECT       — Cloudflare Pages project name (if using single project + custom domains)
 */

import type { CollectionAfterChangeHook } from 'payload'

export const createSiteRepo: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  // Only run on create, not update
  if (operation !== 'create') return doc

  const githubToken = process.env.GITHUB_TOKEN
  const templateOwner = process.env.GITHUB_TEMPLATE_OWNER ?? 'mohamedmostafa58'
  const templateRepo = process.env.GITHUB_TEMPLATE_REPO ?? 'website-factory-frontend'
  const repoOwner = process.env.GITHUB_OWNER ?? templateOwner
  const cfApiToken = process.env.CF_API_TOKEN
  const cfAccountId = process.env.CF_ACCOUNT_ID

  if (!githubToken) {
    req.payload.logger.warn('GITHUB_TOKEN not set — skipping auto repo creation')
    return doc
  }

  const domain = doc.domain as string
  const siteName = doc.name as string
  // Create a clean repo name from the domain
  const repoName = domain
    .replace(/^www\./, '')
    .replace(/\.[^.]+$/, '') // remove TLD
    .replace(/[^a-z0-9-]/gi, '-')
    .toLowerCase()

  req.payload.logger.info(`Creating GitHub repo "${repoName}" for site "${siteName}" (${domain})`)

  try {
    // ── Step 1: Create repo from template ──
    const createRepoRes = await fetch(
      `https://api.github.com/repos/${templateOwner}/${templateRepo}/generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          owner: repoOwner,
          name: repoName,
          description: `Website for ${siteName} — powered by Website Factory`,
          private: false,
          include_all_branches: false,
        }),
      },
    )

    if (!createRepoRes.ok) {
      const err = await createRepoRes.text()
      req.payload.logger.error(`Failed to create repo: ${err}`)
      return doc
    }

    const repo = (await createRepoRes.json()) as { full_name: string; html_url: string }
    req.payload.logger.info(`Repo created: ${repo.html_url}`)

    // Wait a moment for GitHub to finish generating from template
    await new Promise((r) => setTimeout(r, 3000))

    // ── Step 2: Update wrangler.toml in the new repo ──
    // Get current file content
    const fileRes = await fetch(
      `https://api.github.com/repos/${repo.full_name}/contents/wrangler.toml`,
      {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
        },
      },
    )

    if (fileRes.ok) {
      const fileData = (await fileRes.json()) as { sha: string; content: string }
      const currentContent = atob(fileData.content.replace(/\n/g, ''))

      // Update the PAYLOAD_API_URL and WEBHOOK_SECRET
      const cmsUrl = process.env.ADMIN_URL ?? process.env.PAYLOAD_PUBLIC_SERVER_URL ?? ''
      const webhookSecret = process.env.WEBHOOK_SECRET ?? ''

      let updatedContent = currentContent
        .replace(
          /PAYLOAD_API_URL\s*=\s*"[^"]*"/,
          `PAYLOAD_API_URL = "${cmsUrl}"`,
        )
        .replace(
          /WEBHOOK_SECRET\s*=\s*"[^"]*"/,
          `WEBHOOK_SECRET = "${webhookSecret}"`,
        )

      // Update to new file
      await fetch(
        `https://api.github.com/repos/${repo.full_name}/contents/wrangler.toml`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
          },
          body: JSON.stringify({
            message: `Configure for ${domain}`,
            content: btoa(updatedContent),
            sha: fileData.sha,
          }),
        },
      )
    }

    // ── Step 3: Add custom domain to Cloudflare Pages ──
    if (cfApiToken && cfAccountId) {
      const pagesProject = process.env.CF_PAGES_PROJECT ?? 'website-factory-frontend'

      const domainRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${pagesProject}/domains`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: domain }),
        },
      )

      if (domainRes.ok) {
        req.payload.logger.info(`Custom domain ${domain} added to Cloudflare Pages`)
      } else {
        const err = await domainRes.text()
        req.payload.logger.warn(`Could not add domain to CF Pages: ${err}`)
      }
    }

    // ── Step 4: Update the site doc with the repo URL ──
    try {
      await req.payload.update({
        collection: 'sites',
        id: doc.id,
        data: {
          repoUrl: repo.html_url,
        } as any,
      })
    } catch {
      // Field may not exist yet — non-fatal
    }

    // ── Step 5: Create default settings + home page ──
    const existingSettings = await req.payload.find({
      collection: 'site-settings',
      where: { site: { equals: doc.id } },
      limit: 1,
    })

    if (existingSettings.docs.length === 0) {
      await req.payload.create({
        collection: 'site-settings',
        data: {
          site: doc.id,
          theme: {
            primaryColor: '#3B82F6',
            secondaryColor: '#10B981',
            accentColor: '#F59E0B',
            backgroundColor: '#FFFFFF',
            textColor: '#1F2937',
            fontFamily: 'inter',
            headingFontFamily: 'inherit',
            borderRadius: 'md',
            layoutTheme: 'modern',
          },
          headerLinks: [
            { label: 'Home', url: '/' },
            { label: 'About', url: '/about' },
            { label: 'Contact', url: '/contact' },
          ],
          footerLinks: [
            {
              groupLabel: 'Company',
              links: [
                { label: 'About', url: '/about' },
                { label: 'Contact', url: '/contact' },
              ],
            },
          ],
          footerContent: {
            copyrightText: `© {year} ${siteName}. All rights reserved.`,
            showPoweredBy: false,
          },
        },
      })
    }

    const existingPages = await req.payload.find({
      collection: 'pages',
      where: { site: { equals: doc.id } },
      limit: 1,
    })

    if (existingPages.docs.length === 0) {
      await req.payload.create({
        collection: 'pages',
        data: {
          site: doc.id,
          title: 'Home',
          slug: 'home',
          status: 'published',
          isHomePage: true,
          blocks: [
            {
              blockType: 'hero',
              style: 'centered',
              heading: `Welcome to ${siteName}`,
              subheading: 'Your website is ready. Customize it from the CMS.',
              cta: { label: 'Learn More', url: '/about', variant: 'primary' },
            },
          ],
        },
      })
    }

    req.payload.logger.info(`Site "${siteName}" fully provisioned!`)
  } catch (err) {
    req.payload.logger.error(`Error creating site repo: ${err}`)
  }

  return doc
}

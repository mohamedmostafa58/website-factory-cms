/**
 * afterChange hook for the Sites collection.
 *
 * When a NEW site is created from the Payload admin GUI:
 * 1. Creates a GitHub repo from the frontend template
 * 2. Creates a dedicated Cloudflare Pages project connected to that repo
 * 3. Sets environment variables on the Pages project
 * 4. Adds the custom domain to the Pages project
 * 5. Updates the repo config (wrangler.toml) with CMS URL
 * 6. Creates default SiteSettings + Home page
 *
 * Each site = its own GitHub repo + its own CF Pages project + its own domain
 */

import type { CollectionAfterChangeHook } from 'payload'

export const createSiteRepo: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== 'create') return doc

  const githubToken = process.env.GITHUB_TOKEN
  const templateOwner = process.env.GITHUB_TEMPLATE_OWNER ?? 'mohamedmostafa58'
  const templateRepo = process.env.GITHUB_TEMPLATE_REPO ?? 'website-factory-frontend'
  const repoOwner = process.env.GITHUB_OWNER ?? templateOwner
  const cfApiToken = process.env.CF_API_TOKEN
  const cfAccountId = process.env.CF_ACCOUNT_ID
  const cmsUrl = process.env.ADMIN_URL ?? process.env.PAYLOAD_PUBLIC_SERVER_URL ?? ''
  const webhookSecret = process.env.WEBHOOK_SECRET ?? ''

  if (!githubToken) {
    req.payload.logger.warn('GITHUB_TOKEN not set — skipping auto repo creation')
    return doc
  }

  const domain = doc.domain as string
  const siteName = doc.name as string
  const repoName = domain
    .replace(/^www\./, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9-]/gi, '-')
    .toLowerCase()

  // CF Pages project name (must be lowercase, alphanumeric + hyphens)
  const pagesProjectName = repoName

  req.payload.logger.info(
    `Provisioning site "${siteName}": repo=${repoName}, pages=${pagesProjectName}, domain=${domain}`,
  )

  let repoFullName = ''
  let repoUrl = ''

  try {
    // ════════════════════════════════════════════
    // Step 1: Create GitHub repo from template
    // ════════════════════════════════════════════
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
          description: `${siteName} — powered by Website Factory`,
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
    repoFullName = repo.full_name
    repoUrl = repo.html_url
    req.payload.logger.info(`GitHub repo created: ${repoUrl}`)

    // Wait for GitHub to finish generating from template
    await new Promise((r) => setTimeout(r, 5000))

    // ════════════════════════════════════════════
    // Step 2: Create Cloudflare Pages project
    //         connected to the new GitHub repo
    // ════════════════════════════════════════════
    let pagesUrl = ''

    if (cfApiToken && cfAccountId) {
      req.payload.logger.info(`Creating CF Pages project: ${pagesProjectName}`)

      const createPagesRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: pagesProjectName,
            production_branch: 'main',
            source: {
              type: 'github',
              config: {
                owner: repoOwner,
                repo_name: repoName,
                production_branch: 'main',
                pr_comments_enabled: true,
                deployments_enabled: true, // Auto-deploy on push
                production_deployments_enabled: true,
                preview_deployment_setting: 'all',
                preview_branch_includes: ['*'],
              },
            },
            build_config: {
              build_command: 'npm run build',
              destination_dir: 'dist',
              root_dir: '',
            },
          }),
        },
      )

      if (createPagesRes.ok) {
        const pagesData = (await createPagesRes.json()) as {
          result: { subdomain: string; name: string }
        }
        pagesUrl = `https://${pagesData.result.subdomain}`
        req.payload.logger.info(`CF Pages project created: ${pagesUrl}`)
      } else {
        const err = await createPagesRes.text()
        req.payload.logger.warn(`CF Pages creation response: ${err}`)
        // If project already exists, continue — it might have been created manually
      }

      // ════════════════════════════════════════════
      // Step 3: Set environment variables on Pages
      // ════════════════════════════════════════════
      req.payload.logger.info('Setting Pages environment variables...')

      await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${pagesProjectName}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${cfApiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deployment_configs: {
              production: {
                env_vars: {
                  PAYLOAD_API_URL: { value: cmsUrl },
                  WEBHOOK_SECRET: { value: webhookSecret },
                },
                kv_namespaces: {
                  // Bind KV for resilient cache
                  SITE_CACHE: { namespace_id: process.env.KV_NAMESPACE_ID ?? '' },
                },
              },
              preview: {
                env_vars: {
                  PAYLOAD_API_URL: { value: cmsUrl },
                  WEBHOOK_SECRET: { value: webhookSecret },
                },
              },
            },
          }),
        },
      )

      // ════════════════════════════════════════════
      // Step 4: Add custom domain to Pages project
      // ════════════════════════════════════════════
      req.payload.logger.info(`Adding custom domain: ${domain}`)

      const domainRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${pagesProjectName}/domains`,
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
        req.payload.logger.info(`Custom domain ${domain} added to ${pagesProjectName}`)
      } else {
        const err = await domainRes.text()
        req.payload.logger.warn(
          `Domain setup needs manual DNS: CNAME ${domain} → ${pagesProjectName}.pages.dev — ${err}`,
        )
      }
    }

    // ════════════════════════════════════════════
    // Step 5: Update wrangler.toml in the new repo
    // ════════════════════════════════════════════
    req.payload.logger.info('Updating repo config...')

    const fileRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/contents/wrangler.toml`,
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

      const updatedContent = currentContent
        .replace(
          /name\s*=\s*"[^"]*"/,
          `name = "${pagesProjectName}"`,
        )
        .replace(
          /PAYLOAD_API_URL\s*=\s*"[^"]*"/,
          `PAYLOAD_API_URL = "${cmsUrl}"`,
        )
        .replace(
          /WEBHOOK_SECRET\s*=\s*"[^"]*"/,
          `WEBHOOK_SECRET = "${webhookSecret}"`,
        )

      await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/wrangler.toml`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
          },
          body: JSON.stringify({
            message: `Configure for ${siteName} (${domain})`,
            content: btoa(updatedContent),
            sha: fileData.sha,
          }),
        },
      )
      req.payload.logger.info('Repo config updated — this triggers auto-deploy')
    }

    // ════════════════════════════════════════════
    // Step 6: Update site doc with repo + pages URLs
    // ════════════════════════════════════════════
    try {
      await req.payload.update({
        collection: 'sites',
        id: doc.id,
        data: {
          repoUrl: repoUrl,
          pagesUrl: `https://${pagesProjectName}.pages.dev`,
        } as any,
      })
    } catch {
      // Fields may not exist yet
    }

    // ════════════════════════════════════════════
    // Step 7: Create default settings + home page
    // ════════════════════════════════════════════
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

    req.payload.logger.info(
      `Site "${siteName}" fully provisioned! Repo: ${repoUrl} | Pages: https://${pagesProjectName}.pages.dev | Domain: ${domain}`,
    )
  } catch (err) {
    req.payload.logger.error(`Error provisioning site: ${err}`)
  }

  return doc
}

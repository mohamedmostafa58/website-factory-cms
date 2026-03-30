/**
 * Auto-provision a new site:
 *   1. Create GitHub repo from template
 *   2. Create Cloudflare Pages project connected to that repo
 *   3. Set env vars on Pages project
 *   4. Update wrangler.toml in repo (triggers auto-deploy)
 *   5. Create default SiteSettings + Home page
 *
 * Updates provisioningLog field after each step so admin can see progress.
 */

import type { CollectionAfterChangeHook, Payload } from 'payload'

function ghHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'WebsiteFactory/1.0',
  }
}

async function log(payload: Payload, siteId: string | number, message: string, currentLog: string): Promise<string> {
  const timestamp = new Date().toISOString().substr(11, 8)
  const newLog = currentLog + `[${timestamp}] ${message}\n`
  try {
    await payload.update({
      collection: 'sites',
      id: siteId,
      data: { provisioningLog: newLog } as any,
    })
  } catch { /* non-fatal */ }
  return newLog
}

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

  const siteName = doc.name as string
  const slug = (doc.slug as string) || siteName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  let logText = ''

  // Mark as in progress
  await req.payload.update({
    collection: 'sites',
    id: doc.id,
    data: { provisioningStatus: 'in_progress', provisioningLog: '' } as any,
  })

  try {
    // ════════════════════════════════════════════
    // Step 1: Create GitHub repo
    // ════════════════════════════════════════════
    if (!githubToken) {
      logText = await log(req.payload, doc.id, '⚠ GITHUB_TOKEN not set — skipping repo creation', logText)
      await req.payload.update({ collection: 'sites', id: doc.id, data: { provisioningStatus: 'failed' } as any })
      return doc
    }

    logText = await log(req.payload, doc.id, `Creating GitHub repo: ${repoOwner}/${slug}...`, logText)

    const createRepoRes = await fetch(
      `https://api.github.com/repos/${templateOwner}/${templateRepo}/generate`,
      {
        method: 'POST',
        headers: ghHeaders(githubToken),
        body: JSON.stringify({
          owner: repoOwner,
          name: slug,
          description: `${siteName} — powered by Website Factory`,
          private: false,
          include_all_branches: false,
        }),
      },
    )

    if (!createRepoRes.ok) {
      const err = await createRepoRes.text()
      logText = await log(req.payload, doc.id, `✗ GitHub repo creation failed: ${err}`, logText)
      await req.payload.update({ collection: 'sites', id: doc.id, data: { provisioningStatus: 'failed' } as any })
      return doc
    }

    const repo = (await createRepoRes.json()) as { full_name: string; html_url: string }
    logText = await log(req.payload, doc.id, `✓ GitHub repo created: ${repo.html_url}`, logText)

    // Save repoUrl immediately
    await req.payload.update({
      collection: 'sites',
      id: doc.id,
      data: { repoUrl: repo.html_url } as any,
    })

    // Wait for GitHub to finish generating from template
    logText = await log(req.payload, doc.id, 'Waiting for GitHub template generation...', logText)
    await new Promise((r) => setTimeout(r, 5000))

    // ════════════════════════════════════════════
    // Step 2: Create Cloudflare Pages project
    // ════════════════════════════════════════════
    let pagesProjectName = slug
    let pagesUrl = `https://${pagesProjectName}.pages.dev`

    if (cfApiToken && cfAccountId) {
      logText = await log(req.payload, doc.id, `Creating CF Pages project: ${pagesProjectName}...`, logText)

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
                repo_name: slug,
                production_branch: 'main',
                pr_comments_enabled: true,
                deployments_enabled: true,
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
        const pagesData = (await createPagesRes.json()) as { result: { subdomain: string; name: string } }
        pagesUrl = `https://${pagesData.result.subdomain}`
        logText = await log(req.payload, doc.id, `✓ CF Pages project created: ${pagesUrl}`, logText)
      } else {
        const err = await createPagesRes.text()
        logText = await log(req.payload, doc.id, `⚠ CF Pages creation: ${err.substring(0, 200)}`, logText)
        // Continue anyway — might already exist
      }

      // Save pagesUrl
      await req.payload.update({
        collection: 'sites',
        id: doc.id,
        data: { pagesUrl } as any,
      })

      // ════════════════════════════════════════════
      // Step 3: Set env vars on Pages
      // ════════════════════════════════════════════
      logText = await log(req.payload, doc.id, 'Setting environment variables on Pages project...', logText)

      const envRes = await fetch(
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

      if (envRes.ok) {
        logText = await log(req.payload, doc.id, '✓ Environment variables set', logText)
      } else {
        logText = await log(req.payload, doc.id, `⚠ Env vars: ${(await envRes.text()).substring(0, 200)}`, logText)
      }

      // ════════════════════════════════════════════
      // Step 4: Add custom domains if any
      // ════════════════════════════════════════════
      const customDomains = (doc.customDomains as any[] | undefined) ?? []
      for (const entry of customDomains) {
        logText = await log(req.payload, doc.id, `Adding custom domain: ${entry.domain}...`, logText)
        const domRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/pages/projects/${pagesProjectName}/domains`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cfApiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: entry.domain }),
          },
        )
        if (domRes.ok) {
          logText = await log(req.payload, doc.id, `✓ Domain ${entry.domain} added — set CNAME → ${pagesProjectName}.pages.dev`, logText)
        } else {
          logText = await log(req.payload, doc.id, `⚠ Domain ${entry.domain}: ${(await domRes.text()).substring(0, 200)}`, logText)
        }
      }
    } else {
      logText = await log(req.payload, doc.id, '⚠ CF_API_TOKEN not set — skipping Pages creation', logText)
    }

    // ════════════════════════════════════════════
    // Step 5: Update wrangler.toml in the repo
    // ════════════════════════════════════════════
    logText = await log(req.payload, doc.id, 'Updating repo config (triggers auto-deploy)...', logText)

    const fileRes = await fetch(
      `https://api.github.com/repos/${repo.full_name}/contents/wrangler.toml`,
      {
        headers: ghHeaders(githubToken),
      },
    )

    if (fileRes.ok) {
      const fileData = (await fileRes.json()) as { sha: string; content: string }
      const currentContent = atob(fileData.content.replace(/\n/g, ''))

      const updatedContent = currentContent
        .replace(/name\s*=\s*"[^"]*"/, `name = "${pagesProjectName}"`)
        .replace(/PAYLOAD_API_URL\s*=\s*"[^"]*"/, `PAYLOAD_API_URL = "${cmsUrl}"`)
        .replace(/WEBHOOK_SECRET\s*=\s*"[^"]*"/, `WEBHOOK_SECRET = "${webhookSecret}"`)

      await fetch(
        `https://api.github.com/repos/${repo.full_name}/contents/wrangler.toml`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
          },
          body: JSON.stringify({
            message: `Configure for ${siteName} (${pagesProjectName})`,
            content: btoa(updatedContent),
            sha: fileData.sha,
          }),
        },
      )
      logText = await log(req.payload, doc.id, '✓ Repo config updated — auto-deploy triggered', logText)
    } else {
      logText = await log(req.payload, doc.id, '⚠ Could not update wrangler.toml (deploy manually)', logText)
    }

    // ════════════════════════════════════════════
    // Step 6: Create default SiteSettings + Home page
    // ════════════════════════════════════════════
    logText = await log(req.payload, doc.id, 'Creating default site settings...', logText)

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
    logText = await log(req.payload, doc.id, '✓ Default site settings created', logText)

    logText = await log(req.payload, doc.id, 'Creating home page...', logText)
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
    logText = await log(req.payload, doc.id, '✓ Home page created', logText)

    // ════════════════════════════════════════════
    // Done!
    // ════════════════════════════════════════════
    logText = await log(req.payload, doc.id, `\n✅ DONE! Site "${siteName}" is fully provisioned.`, logText)
    logText = await log(req.payload, doc.id, `   Live at: ${pagesUrl}`, logText)
    logText = await log(req.payload, doc.id, `   Repo: ${repo.html_url}`, logText)
    logText = await log(req.payload, doc.id, `   First deploy will take ~2 min. Refresh the Pages URL after.`, logText)

    await req.payload.update({
      collection: 'sites',
      id: doc.id,
      data: { provisioningStatus: 'complete' } as any,
    })
  } catch (err) {
    logText = await log(req.payload, doc.id, `\n✗ ERROR: ${err}`, logText)
    await req.payload.update({
      collection: 'sites',
      id: doc.id,
      data: { provisioningStatus: 'failed' } as any,
    })
  }

  return doc
}

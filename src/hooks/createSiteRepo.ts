/**
 * Auto-provision a new site — runs synchronously so the admin UI
 * shows all results immediately after save (no refresh needed).
 *
 * 1. Create PRIVATE GitHub repo from template
 * 2. Create Cloudflare Pages project connected to that repo
 * 3. Set env vars + KV bindings on Pages project
 * 4. Update wrangler.toml in repo (triggers auto-deploy)
 * 5. Trigger initial deployment via CF API
 * 6. Create default SiteSettings + Home page
 *
 * Returns the fully populated doc so the admin UI displays everything.
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

function cfHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

function ts(): string {
  return new Date().toISOString().substring(11, 19)
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
  const kvNamespaceId = process.env.KV_NAMESPACE_ID ?? '2bee696f1e8247628e5d0f4f34577e8b'

  const siteName = doc.name as string
  const slug = (doc.slug as string) || siteName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const cfBase = `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}`

  // Collect results to return to admin UI immediately
  let log = ''
  let repoUrl = ''
  let pagesUrl = `https://${slug}.pages.dev`
  let status = 'in_progress'
  let repoFullName = ''

  const addLog = (msg: string) => { log += `[${ts()}] ${msg}\n` }

  if (!githubToken) {
    addLog('⚠ GITHUB_TOKEN not set — cannot create repo')
    status = 'failed'
    return saveAndReturn(req.payload, doc, { provisioningLog: log, provisioningStatus: status })
  }

  try {
    // ── Step 1: Create PRIVATE GitHub repo from template ──
    addLog(`Creating private GitHub repo: ${repoOwner}/${slug}...`)

    const repoRes = await fetch(
      `https://api.github.com/repos/${templateOwner}/${templateRepo}/generate`,
      {
        method: 'POST',
        headers: ghHeaders(githubToken),
        body: JSON.stringify({
          owner: repoOwner,
          name: slug,
          description: `${siteName} — powered by Website Factory`,
          private: true,
          include_all_branches: false,
        }),
      },
    )

    if (!repoRes.ok) {
      const err = await repoRes.text()
      addLog(`✗ Repo creation failed: ${err.substring(0, 200)}`)
      status = 'failed'
      return saveAndReturn(req.payload, doc, { provisioningLog: log, provisioningStatus: status })
    }

    const repo = (await repoRes.json()) as { full_name: string; html_url: string }
    repoFullName = repo.full_name
    repoUrl = repo.html_url
    addLog(`✓ Repo created: ${repoUrl}`)

    // Wait for template generation
    addLog('Waiting for template generation...')
    await new Promise((r) => setTimeout(r, 5000))

    // ── Step 2: Create CF Pages project connected to GitHub repo ──
    if (cfApiToken && cfAccountId) {
      addLog(`Creating CF Pages project: ${slug}...`)

      const pagesRes = await fetch(`${cfBase}/pages/projects`, {
        method: 'POST',
        headers: cfHeaders(cfApiToken),
        body: JSON.stringify({
          name: slug,
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
      })

      if (pagesRes.ok) {
        const pd = (await pagesRes.json()) as { result: { subdomain: string } }
        pagesUrl = `https://${pd.result.subdomain}`
        addLog(`✓ CF Pages project created: ${pagesUrl}`)
      } else {
        const err = await pagesRes.text()
        addLog(`⚠ CF Pages: ${err.substring(0, 200)}`)
      }

      // ── Step 3: Set env vars + KV binding ──
      addLog('Setting environment variables + KV cache binding...')

      const envRes = await fetch(`${cfBase}/pages/projects/${slug}`, {
        method: 'PATCH',
        headers: cfHeaders(cfApiToken),
        body: JSON.stringify({
          deployment_configs: {
            production: {
              env_vars: {
                PAYLOAD_API_URL: { value: cmsUrl },
                WEBHOOK_SECRET: { value: webhookSecret },
              },
              kv_namespaces: {
                SITE_CACHE: { namespace_id: kvNamespaceId },
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
      })

      addLog(envRes.ok ? '✓ Env vars + KV binding set' : `⚠ Env config: ${(await envRes.text()).substring(0, 150)}`)

      // ── Step 4: Handle custom domains ──
      const customDomains = (doc.customDomains as any[] | undefined) ?? []
      for (const entry of customDomains) {
        addLog(`Adding custom domain: ${entry.domain}...`)
        const domRes = await fetch(`${cfBase}/pages/projects/${slug}/domains`, {
          method: 'POST',
          headers: cfHeaders(cfApiToken),
          body: JSON.stringify({ name: entry.domain }),
        })
        addLog(domRes.ok
          ? `✓ Domain ${entry.domain} added — CNAME → ${slug}.pages.dev`
          : `⚠ Domain ${entry.domain}: ${(await domRes.text()).substring(0, 150)}`)
      }
    } else {
      addLog('⚠ CF_API_TOKEN not set — skipping Pages creation')
    }

    // ── Step 5: Update wrangler.toml in repo (triggers auto-deploy) ──
    addLog('Updating repo config...')

    const fileRes = await fetch(
      `https://api.github.com/repos/${repoFullName}/contents/wrangler.toml`,
      { headers: ghHeaders(githubToken) },
    )

    if (fileRes.ok) {
      const fd = (await fileRes.json()) as { sha: string; content: string }
      const content = atob(fd.content.replace(/\n/g, ''))
        .replace(/name\s*=\s*"[^"]*"/, `name = "${slug}"`)
        .replace(/PAYLOAD_API_URL\s*=\s*"[^"]*"/, `PAYLOAD_API_URL = "${cmsUrl}"`)
        .replace(/WEBHOOK_SECRET\s*=\s*"[^"]*"/, `WEBHOOK_SECRET = "${webhookSecret}"`)

      await fetch(
        `https://api.github.com/repos/${repoFullName}/contents/wrangler.toml`,
        {
          method: 'PUT',
          headers: ghHeaders(githubToken),
          body: JSON.stringify({
            message: `Configure for ${siteName}`,
            content: btoa(content),
            sha: fd.sha,
          }),
        },
      )
      addLog('✓ Repo config updated — auto-deploy triggered')
    } else {
      addLog('⚠ Could not update wrangler.toml')
    }

    // ── Step 6: Trigger initial deployment via CF API ──
    if (cfApiToken && cfAccountId) {
      addLog('Triggering initial deployment...')
      const deployRes = await fetch(`${cfBase}/pages/projects/${slug}/deployments`, {
        method: 'POST',
        headers: cfHeaders(cfApiToken),
      })
      addLog(deployRes.ok
        ? '✓ Deployment triggered — site will be live in ~1 min'
        : `⚠ Deploy trigger: ${(await deployRes.text()).substring(0, 150)}`)
    }

    // ── Step 7: Create default SiteSettings + Home page ──
    addLog('Creating default theme + home page...')

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
        footerLinks: [{
          groupLabel: 'Company',
          links: [
            { label: 'About', url: '/about' },
            { label: 'Contact', url: '/contact' },
          ],
        }],
        footerContent: {
          copyrightText: `© {year} ${siteName}. All rights reserved.`,
          showPoweredBy: false,
        },
      },
    })

    await req.payload.create({
      collection: 'pages',
      data: {
        site: doc.id,
        title: 'Home',
        slug: 'home',
        status: 'published',
        isHomePage: true,
        blocks: [{
          blockType: 'hero',
          style: 'centered',
          heading: `Welcome to ${siteName}`,
          subheading: 'Your website is ready. Customize it from the CMS.',
          cta: { label: 'Learn More', url: '/about', variant: 'primary' },
        }],
      },
    })

    addLog('✓ Default theme + home page created')
    addLog('')
    addLog(`✅ DONE! Site "${siteName}" is ready.`)
    addLog(`   Live: ${pagesUrl}`)
    addLog(`   Repo: ${repoUrl}`)
    status = 'complete'
  } catch (err) {
    addLog(`✗ ERROR: ${err}`)
    status = 'failed'
  }

  return saveAndReturn(req.payload, doc, {
    repoUrl,
    pagesUrl,
    provisioningLog: log,
    provisioningStatus: status,
  })
}

/**
 * Save updated fields to DB AND return the updated doc to the admin UI.
 * This way the user sees everything immediately without refreshing.
 */
async function saveAndReturn(
  payload: Payload,
  doc: any,
  updates: Record<string, any>,
): Promise<any> {
  try {
    const updated = await payload.update({
      collection: 'sites',
      id: doc.id,
      data: updates,
    })
    return updated
  } catch {
    return { ...doc, ...updates }
  }
}

# Automation Guardrails

This repository now includes a safe automation baseline focused on protecting the site without changing runtime behavior.

## What Runs Automatically

- GitHub Actions CI in `.github/workflows/ci.yml`
- Pull request site preview artifacts in `.github/workflows/site-preview.yml`
- Controlled Worker deployment in `.github/workflows/deploy-worker.yml`
- Static site build via `npm run build`
- Worker tests via `cd backend/worker && npm test`
- Asset size validation via `npm run check:assets`
- Public secret scanning via `npm run check:public-secrets`

## Why These Checks Exist

- The static build confirms the site still assembles into `dist/`.
- Worker tests confirm the Cloudflare Worker still responds on key routes.
- Asset checks help prevent large files from slowing the site down or breaking GitHub pushes.
- Public secret scanning blocks obvious cases where secrets are accidentally committed into public files.
- PR preview artifacts let you inspect the generated `dist/` output before merging.
- The Worker deployment workflow keeps production deploys behind GitHub secrets and environment controls.

## Asset Thresholds

- Images warn at `5 MB`
- Images fail at `25 MB`
- Any asset fails at `95 MB`
- Videos warn at `20 MB`

Warnings do not fail CI. Failures stop the workflow.

## Local Commands

```bash
npm run check:assets
npm run build
cd backend/worker && npm test
```

## Current Scope

These automations are intentionally non-destructive:

- the static site keeps using the existing GitHub Pages publish path
- Worker deploys only run when Cloudflare secrets are configured
- no content mutation
- no scheduled data writes

## Deployment Notes

- The live static site is currently served by GitHub Pages.
- PR previews are shipped as downloadable workflow artifacts instead of public preview URLs.
- GitHub Pages preview deployments through `deploy-pages` are not publicly available in general release, so artifact previews are the safer option for this repository right now.
- Worker deploy automation is ready, but it requires repository secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`

That keeps the site functional while adding guardrails and controlled deployment paths first.

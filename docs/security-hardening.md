# Security Hardening

This repository now includes code-level security hardening focused on protecting student information without requiring repeated Cloudflare dashboard changes.

## What Changed

- Worker CORS is now restricted to trusted website origins and local loopback development origins.
- Worker responses now include baseline security headers and `Cache-Control: no-store`.
- Admin JWT lifetime was shortened to `2 hours`.
- Student JWT lifetime was shortened to `8 hours`.
- Legacy admin tokens stored in `localStorage` are no longer trusted and are actively cleared.
- The kiosk access key is no longer embedded in public HTML. It must be configured on the kiosk device itself.
- Several client-side HTML rendering paths now escape server-fed values before inserting them into the DOM.

## Kiosk Security Model

- The public site no longer ships the kiosk access key in `kiosk.html`.
- Staff can configure the kiosk key on the device by tapping the kiosk logo 5 times and saving the key locally on that machine.
- This keeps the key out of the public page source and out of the Git repository.

## Automation

- `scripts/check-public-secrets.sh` fails CI if public-facing files contain obvious secret patterns.
- `npm run ci` now includes the public secret scan alongside asset checks, build, and Worker tests.

## Remaining Risks

- A static site cannot fully protect a client-side kiosk secret if the kiosk device itself is not locked down.
- `sessionStorage` still depends on strong XSS hygiene. Reducing dynamic `innerHTML` usage further is still worthwhile.
- Full brute-force and rate-limit controls are better enforced at the edge or WAF layer, which is outside this code-only hardening pass.

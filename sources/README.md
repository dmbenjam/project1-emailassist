# Sources (Repo‑Managed Voice Library)

This folder powers the app’s **institutional knowledge + voice** (similar to a “Project” in Claude).

## How it works
- Add **20–50** example emails into `sources/emails/` (one file per email).
- Optionally maintain a short `sources/voice-guide.md` with voice rules (preferred phrases, CTA style, sign-offs, etc.).
- On every Generate / Refine request, the server:
  - Searches these sources using lightweight keyword scoring
  - Selects a few **relevant excerpts**
  - Injects them into the model as **voice context**

## Updating sources
1. Add or edit files under `sources/emails/`
2. Commit + push
3. Vercel redeploys automatically (or trigger a redeploy)

## File tips
- Keep each email in a single file (`.txt` or `.md`)
- Include the subject line at the top (helps retrieval), for example:

  Subject: Homecoming Weekend is calling

  Body:
  ...


<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.

<!-- LOVABLE:END -->

## Project rules

- Reports table ships empty (no seed rows); the map shows an empty-state card when nothing matches.
- Reports are anonymous (no sign-in): the browser reads/inserts `reports` directly under RLS, and votes go only through the `vote_report` SECURITY DEFINER function — why: anon users must never get UPDATE rights on reports.
- Leaflet is imported dynamically inside `ReportsMap`'s effect and the map wrapper uses `isolate` — why: Leaflet touches `window` at import (breaks SSR) and its pane z-indexes would otherwise cover the bottom sheets.
- Installable via manifest only (no service worker) — why: offline mode was not requested and service workers break previews.
- Keep `.env` committed (never add it to `.gitignore`); it holds only public backend URL/publishable key — why: published builds read the `VITE_SUPABASE_*` values from it, and without them the live app opens to a blank screen.

# Architecture

## Overview

The browser serves a static page from `public/`. `public/app.js` uses Quill for rich text editing and calls the JSON API under `/api`. `server.js` hosts the static files and mounts `src/routes.js`. Routes read and update `data/store.json` through `src/store.js`.

The current user is selected from the seeded mock users and sent in `X-User-Id`. Each document stores its owner, HTML content, timestamps, and a list of user shares with `view` or `edit` roles. Route middleware resolves the caller's access before returning a document. Missing and inaccessible documents both return 404. View role blocks write requests with 403; only the owner can create or change shares.

## Prioritized

1. **Access control:** document reads and writes are checked on the server, and sharing is owner-only.
2. **Data integrity:** JSON changes are serialized in-process and written to a temporary file before rename.
3. **Core editing flow:** create, reopen, rename, edit, debounced autosave, and upload work through the same document API.
4. **Clear interaction:** the sidebar distinguishes owned and shared docs; role, owner, save state, and server errors are visible.
5. **Small dependency surface:** Express, Multer, and Mammoth are the runtime packages. Tests use Node's built-in runner.

## Deprioritized

- **Real authentication and authorization identity:** mock user selection is a demonstration mechanism; clients can select any seeded account.
- **Durable hosted storage:** JSON files on Render's free service filesystem are ephemeral.
- **Multi-process coordination:** the write queue protects concurrent updates in one Node process only; it is not a database transaction or distributed lock.
- **Revision history, conflict resolution, and collaboration:** saves replace the document's current HTML. There is no history or live co-editing.
- **Advanced import fidelity:** `.txt` and `.md` become plain text; `.docx` is converted to HTML. Complex Word styling may not carry over.

## Next 2–4 hours

- Replace mock-user headers with real login and session-backed identity; add CSRF protections for write operations.
- Add end-to-end browser checks for owner, view, and edit flows, autosave, and upload errors.
- Add document deletion and explicit share revocation UI, with confirmation and status feedback.
- Move persistence to a database or provision durable storage, then add backup and recovery behavior.
- Sanitize imported and stored rich-text HTML before rendering, and tighten editor output validation.

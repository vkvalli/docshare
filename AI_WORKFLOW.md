# AI Workflow

## How AI assistance was used

AI assistance was used to draft the Express API, atomic JSON storage, the Quill-based frontend, the access-control test, and the project documentation. The implementation was kept within the requested Node 18 stack and uses only Express, Multer, and Mammoth as runtime dependencies.

## Review and verification

- Reviewed route behavior against the owner, edit, view, and no-access requirements.
- Ran JavaScript syntax checks during implementation.
- Added a `node:test` integration test that starts the Express app and exercises document access through HTTP requests.
- Run `npm test` to repeat the access-control check.

## Known limitations

- Mock user selection is not authentication. A client can claim any seeded user through `X-User-Id`.
- JSON storage is appropriate for a lightweight demo and does not provide cross-process coordination or durable Render free-tier storage.
- The UI depends on Quill and fonts delivered by public CDNs.

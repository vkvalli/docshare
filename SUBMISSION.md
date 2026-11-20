# Submission

## Included

- Node 18 Express backend with JSON file storage and atomic writes.
- Quill editor frontend with autosave, upload, mock user switching, and sharing.
- Server-side access checks for owner, edit, and view roles.
- Automated access-control test and project documentation.

## Run locally

```sh
npm install
npm start
```

Visit `http://localhost:3000` and select Alice, Bob, or Carol in the user switcher. Run `npm test` for the access-control test.

## Deployment note

The app reads Render's `PORT`. Render free-tier filesystem storage is ephemeral; documents in `data/store.json` are not guaranteed to persist across restarts or redeploys.

## Walkthrough

No hosted walkthrough URL is available yet. See `walkthrough_url.txt`.

## Live App: https://docshare-od8c.onrender.com/
Test accounts : alice, bob , carol(pick one in the dropdown at the top of the page. No password required)
# Docshare Lite

A small Google Docs style app with a Quill editor, an Express API, and JSON file storage. It is designed to run on Node.js 18 and deploy as a Render web service.

## Requirements

- Node.js 18
- npm

## Install and run

```sh
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). The server uses `PORT` when set by the hosting environment and otherwise defaults to port 3000.

Quill and the page font are loaded from public CDNs, so the browser needs network access to those CDNs.

## Mock accounts

Choose a mock user from the switcher in the sidebar:

- Alice (`alice`)
- Bob (`bob`)
- Carol (`carol`)

This user switcher is for a local/demo flow, not authentication. The API identifies the current mock user through the `X-User-Id` request header.

## Features

- Create, rename, edit, save, and reopen documents.
- Format text with bold, italic, underline, headings, and ordered or bulleted lists.
- Share a document with another mock user as `view` or `edit`; only its owner can manage sharing.
- View-only users can read but cannot update a document. Users without access receive a 404.
- Owned and shared documents appear in separate sidebar sections.
- Upload `.txt`, `.md`, and `.docx` files up to 2 MB. Text and Markdown files are imported as text; Word files are converted with Mammoth.
- Autosave displays a Saving/Saved status.

## Test

```sh
npm test
```

The access-control test uses only Node's built-in `node:test` and `fetch` APIs. Runtime packages are Express, Multer, and Mammoth.

## Render deployment

1. Push this folder to a Git repository and create a **Web Service** in Render connected to that repository.
2. Set **Build Command** to `npm install` and **Start Command** to `npm start`.
3. Select a Node 18 runtime if the service settings expose a runtime selector. `package.json` declares the supported engine range.
4. Deploy. The app listens on Render's `PORT` environment variable.

The app writes data under `data/store.json`. Render's free web services use an ephemeral filesystem, so local JSON data can be lost when an instance restarts or redeploys. This storage is suitable for a demo; use persistent storage or a database if documents must survive deploys.

## Storage

The JSON store is initialized with the three mock accounts and writes updates through a temporary file followed by an atomic rename. Do not edit `data/store.json` while the server is running.

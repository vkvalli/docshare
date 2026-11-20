# Video Walkthrough Script (about 4 minutes)

**Before recording:** Open the deployed app in a private browser window and confirm it loads. Keep the app and repository/docs ready. Use a small `.md` file for the import demo. Start with Alice selected. If the live app is unavailable, run locally with `npm install` and `npm start`, then open `http://localhost:3000`.

## 0:00–0:20 — Introduction

**On screen:** Show the app and the sidebar.

**Say:**

“Hi, this is Docshare Lite, a focused document editor built for the Ajaia full-stack assignment. I scoped it around the core workflow: create and format a document, save it, import a file, and share it with clear access levels. I’ll show those flows, then the main engineering choices and tradeoffs.”

## 0:20–1:05 — Create and edit

**On screen:** With Alice selected, choose **New document**. Rename it to “Project notes”. Type a short sentence. Apply a heading, bold or underline, and a bullet list. Pause until the status changes from **Saving…** to **Saved**.

**Say:**

“The user switcher selects one of three seeded demo users: Alice, Bob, or Carol. I’ll create a document as Alice, rename it, and use Quill for headings, inline formatting, and lists. Edits are debounced and saved through the Express API, with a visible save status. Documents and sharing metadata are stored in a JSON file, so I can reopen this after a refresh.”

## 1:05–1:30 — Import a file

**On screen:** Choose **Upload a file** and select the prepared `.md` file. Show the imported content in the editor and the supported types label.

**Say:**

“The import flow creates a new editable document from `.txt`, `.md`, or `.docx`, up to 2 megabytes. The interface states the supported types and size limit, and server errors are shown to the user. Text and Markdown are imported as text; Mammoth converts Word documents to HTML.”

## 1:30–2:45 — Share and verify roles

**On screen:** Reopen “Project notes” if needed. Open **Share**, grant Bob **Can view**, then switch to Bob. Open the shared document and point out the shared section, owner, and role. Try clicking in the editor to show it is read-only. Switch back to Alice, change Bob to **Can edit**, then switch to Bob and make a small edit. Wait for **Saved**.

**Say:**

“Owned and shared documents are separated in the sidebar. Shared rows show both the role and owner. Alice is the owner, so only Alice sees the share controls. Bob can read this document as a view user, and the editor is read-only. The API enforces that permission too: the automated test checks that a view user’s write request receives 403. I’ll change Bob to edit access, switch back, and make a small edit. The server now accepts that update.”

## 2:45–3:30 — Access test and implementation

**On screen:** Show `test/acess-control.test.js`, then briefly show `src/routes.js` and `src/store.js`. If the terminal is ready, run `npm test` and show the passing result.

**Say:**

“The access-control test covers private-by-default behavior, view and edit roles, and owner-only sharing. The backend is a small Express app, with document routes in one file and a JSON store that writes through a temporary file before an atomic rename. It reads the hosting port from `PORT`, which supports the Render deployment setup.”

## 3:30–4:05 — Scope and AI workflow

**On screen:** Show `ARCHITECTURE.md` and `AI_WORKFLOW.md`, or return to the app.

**Say:**

“I intentionally kept authentication simulated with seeded users, and used file storage to keep setup lightweight. That means the user header is not real authentication, and Render’s free filesystem is ephemeral; this version is a demo, not a durable production document service. I deprioritized real-time collaboration, version history, and multi-process storage. With another two to four hours, I’d add real session-based identity, browser-level flow checks, and durable storage.

“I used AI assistance to draft and refine implementation and documentation, then reviewed the access rules and ran the automated test. I kept the scope and tradeoffs explicit rather than treating generated output as verified. Ajaia’s focus on practical AI use is reflected in that workflow. Thanks for watching.”

## Recording checklist

- Keep the video between 3 and 5 minutes.
- Confirm the live app and all links work in a private browser window before submitting.
- Do not show private credentials or personal data.
- Upload the video as an unlisted/public link that reviewers can open, then add its URL beside the live app URL in `walkthrough_url.txt`.

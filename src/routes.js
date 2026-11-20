const express = require('express');
const multer = require('multer');
const mammoth = require('mammoth');
const crypto = require('node:crypto');
const { readStore, updateStore } = require('./store');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }
});
const VALID_ROLES = new Set(['view', 'edit']);
const MAX_TITLE_LENGTH = 160;
const MAX_CONTENT_LENGTH = 5 * 1024 * 1024;

function fail(res, status, message) {
  return res.status(status).json({ error: message });
}

async function currentUser(req, res, next) {
  try {
    const id = req.get('x-user-id');
    const store = await readStore();
    const user = store.users.find((candidate) => candidate.id === id);
    if (!user) return fail(res, 401, 'Choose a valid mock user in the X-User-Id header.');
    req.user = user;
    req.store = store;
    return next();
  } catch (error) {
    return next(error);
  }
}

function accessibleDocument(store, documentId, userId) {
  const doc = store.documents.find((item) => item.id === documentId);
  if (!doc) return null;
  if (doc.ownerId === userId) return { doc, role: 'owner' };
  const share = (doc.shares || []).find((item) => item.userId === userId);
  return share ? { doc, role: share.role } : null;
}

function requireDocument(req, res, next) {
  const access = accessibleDocument(req.store, req.params.id, req.user.id);
  if (!access) return fail(res, 404, 'Document not found.');
  req.doc = access.doc;
  req.role = access.role;
  return next();
}

function requireEdit(req, res, next) {
  if (req.role === 'view') return fail(res, 403, 'You have view-only access to this document.');
  return next();
}

function validTitle(title) {
  return typeof title === 'string' && title.trim().length > 0 && title.trim().length <= MAX_TITLE_LENGTH;
}

function publicDocument(doc, role) {
  return { ...doc, role };
}

router.use(currentUser);

router.get('/users', async (req, res, next) => {
  try {
    const store = await readStore();
    res.json({ users: store.users, currentUser: req.user });
  } catch (error) { next(error); }
});

router.get('/documents', async (req, res, next) => {
  try {
    const store = await readStore();
    const owned = [];
    const shared = [];
    for (const doc of store.documents) {
      if (doc.ownerId === req.user.id) owned.push(publicDocument(doc, 'owner'));
      else {
        const share = (doc.shares || []).find((item) => item.userId === req.user.id);
        if (share) shared.push(publicDocument(doc, share.role));
      }
    }
    res.json({ owned, shared });
  } catch (error) { next(error); }
});

router.post('/documents', async (req, res, next) => {
  try {
    const title = req.body?.title;
    if (!validTitle(title)) return fail(res, 400, `Title is required and must be at most ${MAX_TITLE_LENGTH} characters.`);
    const now = new Date().toISOString();
    const doc = {
      id: crypto.randomUUID(), title: title.trim(), ownerId: req.user.id,
      content: '', shares: [], createdAt: now, updatedAt: now
    };
    await updateStore((store) => { store.documents.push(doc); });
    res.status(201).json({ document: publicDocument(doc, 'owner') });
  } catch (error) { next(error); }
});

router.post('/documents/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return fail(res, 400, 'Choose a .txt or .md file up to 2 MB.');
    const originalName = req.file.originalname || '';
    const extension = originalName.toLowerCase().match(/\.([^.]+)$/)?.[1];
    if (!['txt', 'md', 'docx'].includes(extension)) {
      return fail(res, 400, 'Unsupported file type. Upload a .txt, .md, or .docx file (maximum 2 MB).');
    }
    let content;
    if (extension === 'docx') {
      try {
        const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
        content = result.value;
      } catch {
        return fail(res, 400, 'Could not read this .docx file. Check that it is a valid Word document.');
      }
    } else {
      content = escapeHtml(req.file.buffer.toString('utf8'))
        .split(/\r?\n/).map((line) => line || '<br>').join('<br>');
    }
    const title = (req.body?.title || originalName.replace(/\.[^.]+$/, '')).trim();
    if (!validTitle(title)) return fail(res, 400, `Title is required and must be at most ${MAX_TITLE_LENGTH} characters.`);
    const now = new Date().toISOString();
    const doc = {
      id: crypto.randomUUID(), title, ownerId: req.user.id, content, shares: [], createdAt: now, updatedAt: now
    };
    await updateStore((store) => { store.documents.push(doc); });
    res.status(201).json({ document: publicDocument(doc, 'owner') });
  } catch (error) { next(error); }
});

router.get('/documents/:id', requireDocument, (req, res) => {
  res.json({ document: publicDocument(req.doc, req.role) });
});

router.patch('/documents/:id', requireDocument, requireEdit, async (req, res, next) => {
  try {
    const { title, content } = req.body || {};
    if (title !== undefined && !validTitle(title)) return fail(res, 400, `Title must be at most ${MAX_TITLE_LENGTH} characters and cannot be blank.`);
    if (content !== undefined && (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > MAX_CONTENT_LENGTH)) {
      return fail(res, 400, 'Content must be text no larger than 5 MB.');
    }
    if (title === undefined && content === undefined) return fail(res, 400, 'Provide a title or content to update.');
    const doc = await updateStore((store) => {
      const target = store.documents.find((item) => item.id === req.doc.id);
      if (title !== undefined) target.title = title.trim();
      if (content !== undefined) target.content = content;
      target.updatedAt = new Date().toISOString();
      return target;
    });
    res.json({ document: publicDocument(doc, req.role) });
  } catch (error) { next(error); }
});

router.put('/documents/:id/shares/:userId', requireDocument, async (req, res, next) => {
  try {
    if (req.role !== 'owner') return fail(res, 403, 'Only the owner can manage sharing.');
    const { role } = req.body || {};
    if (!VALID_ROLES.has(role)) return fail(res, 400, 'Role must be "view" or "edit".');
    const store = await readStore();
    if (req.params.userId === req.user.id) return fail(res, 400, 'You already own this document.');
    const targetUser = store.users.find((user) => user.id === req.params.userId);
    if (!targetUser) return fail(res, 400, 'That user does not exist.');
    const updated = await updateStore((current) => {
      const doc = current.documents.find((item) => item.id === req.doc.id);
      doc.shares ||= [];
      const existing = doc.shares.find((share) => share.userId === targetUser.id);
      if (existing) existing.role = role;
      else doc.shares.push({ userId: targetUser.id, role });
      doc.updatedAt = new Date().toISOString();
      return doc;
    });
    res.json({ document: publicDocument(updated, 'owner') });
  } catch (error) { next(error); }
});

router.delete('/documents/:id/shares/:userId', requireDocument, async (req, res, next) => {
  try {
    if (req.role !== 'owner') return fail(res, 403, 'Only the owner can manage sharing.');
    const updated = await updateStore((store) => {
      const doc = store.documents.find((item) => item.id === req.doc.id);
      doc.shares = (doc.shares || []).filter((share) => share.userId !== req.params.userId);
      return doc;
    });
    res.json({ document: publicDocument(updated, 'owner') });
  } catch (error) { next(error); }
});

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

module.exports = router;

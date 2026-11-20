const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');
const { updateStore } = require('../src/store');

test('document access follows private, view, edit, and owner-only sharing rules', async (t) => {
  const server = app.listen(0);
  let testDocumentId;
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    if (testDocumentId) {
      await updateStore((store) => {
        store.documents = store.documents.filter((doc) => doc.id !== testDocumentId);
      });
    }
    server.closeAllConnections?.();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
  const request = (user, url, options = {}) => fetch(`${baseUrl}${url}`, {
    ...options,
    headers: {
      'X-User-Id': user,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });

  const createResponse = await request('alice', '/documents', {
    method: 'POST', body: JSON.stringify({ title: 'Access test document' })
  });
  assert.equal(createResponse.status, 201);
  const { document: doc } = await createResponse.json();
  testDocumentId = doc.id;

  const privateRead = await request('carol', `/documents/${doc.id}`);
  assert.equal(privateRead.status, 404, 'a non-member cannot see a private document');

  const shareView = await request('alice', `/documents/${doc.id}/shares/bob`, {
    method: 'PUT', body: JSON.stringify({ role: 'view' })
  });
  assert.equal(shareView.status, 200);

  const viewRead = await request('bob', `/documents/${doc.id}`);
  assert.equal(viewRead.status, 200, 'a view user can read the document');
  const viewEdit = await request('bob', `/documents/${doc.id}`, {
    method: 'PATCH', body: JSON.stringify({ content: '<p>Not allowed</p>' })
  });
  assert.equal(viewEdit.status, 403, 'a view user cannot edit the document');

  const shareEdit = await request('alice', `/documents/${doc.id}/shares/bob`, {
    method: 'PUT', body: JSON.stringify({ role: 'edit' })
  });
  assert.equal(shareEdit.status, 200);
  const editResponse = await request('bob', `/documents/${doc.id}`, {
    method: 'PATCH', body: JSON.stringify({ content: '<p>Edited</p>' })
  });
  assert.equal(editResponse.status, 200, 'an edit user can update the document');

  const nonOwnerShare = await request('bob', `/documents/${doc.id}/shares/carol`, {
    method: 'PUT', body: JSON.stringify({ role: 'view' })
  });
  assert.equal(nonOwnerShare.status, 403, 'only the owner can share');
});

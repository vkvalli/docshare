const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');
const initialStore = {
  users: [
    { id: 'alice', name: 'Alice' },
    { id: 'bob', name: 'Bob' },
    { id: 'carol', name: 'Carol' }
  ],
  documents: []
};

let writeQueue = Promise.resolve();

async function atomicWrite(data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const temporaryFile = path.join(DATA_DIR, `.store-${process.pid}-${crypto.randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporaryFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await fs.rename(temporaryFile, STORE_FILE);
  } catch (error) {
    await fs.rm(temporaryFile, { force: true }).catch(() => {});
    throw error;
  }
}

async function initialize() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(STORE_FILE);
  } catch {
    await atomicWrite(initialStore);
  }
}

async function readStore() {
  await initialize();
  return JSON.parse(await fs.readFile(STORE_FILE, 'utf8'));
}

async function updateStore(mutator) {
  const operation = writeQueue.then(async () => {
    const store = await readStore();
    const result = await mutator(store);
    await atomicWrite(store);
    return result;
  });
  writeQueue = operation.catch(() => {});
  return operation;
}

module.exports = { initialize, readStore, updateStore };

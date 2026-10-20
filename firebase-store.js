import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {
  collection, deleteDoc, doc, getDocs, getFirestore, onSnapshot, writeBatch, runTransaction, getDocsFromServer
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCHyPyqWGjiNQcCFxhmykcKQ_qx9XUdkOk',
  authDomain: 'harmonie-zone-health-massage.firebaseapp.com',
  projectId: 'harmonie-zone-health-massage',
  storageBucket: 'harmonie-zone-health-massage.firebasestorage.app',
  messagingSenderId: '390099660641',
  appId: '1:390099660641:web:5e222d47c7884eb1f35f20'
};

export const OWNER_UID = 'cJsuY9YJJLP7PLabwe2niJvPgGv2';
const app = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(app);
const db = getFirestore(app);
const names = ['services', 'staff', 'receipts', 'expenses', 'auditLogs', 'dailyClosings'];

export const observeAuth = callback => onAuthStateChanged(firebaseAuth, callback);
export const signInOwner = (email, password) => signInWithEmailAndPassword(firebaseAuth, email, password);
export const signOutOwner = () => signOut(firebaseAuth);

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

export async function watchShopData(onData, onError) {
  const result = { services: [], staff: [], receipts: [], expenses: [], auditLogs: [], dailyClosings: [] };
  const ready = new Set(), metadata = new Map();
  const unsubscribers = names.map(name => onSnapshot(collection(db, name), { includeMetadataChanges: true }, snapshot => {
    result[name] = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
    ready.add(name); metadata.set(name, snapshot.metadata);
    if (ready.size === names.length) onData(cloneData(result), { fromCache: [...metadata.values()].some(item => item.fromCache), hasPendingWrites: [...metadata.values()].some(item => item.hasPendingWrites) });
  }, onError));
  return () => unsubscribers.forEach(unsubscribe => unsubscribe());
}

async function commitOps(ops) {
  for (let i = 0; i < ops.length; i += 450) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + 450)) {
      if (op.type === 'delete') batch.delete(doc(db, op.collection, op.id));
      else batch.set(doc(db, op.collection, op.id), op.data);
    }
    await batch.commit();
  }
}

export async function saveShopData(next, previous) {
  stageShopData(next, previous); await flushPendingShopData(); return cloneData(next);
}
export async function restoreShopData(next) {
  if (hasPendingShopChanges()) throw new Error('Pending offline changes must be synchronized before restoring a backup.');
  const current = await readShopData();
  const ops = [];
  for (const name of names) {
    const restored = next[name] || [];
    const restoredIds = new Set(restored.map(record => String(record.id)));
    for (const record of restored) {
      if (!record?.id) throw new Error('Backup record is missing an id.');
      const clean = { ...record };
      delete clean.password;
      ops.push({ type: 'set', collection: name, id: String(record.id), data: clean });
    }
    for (const record of current[name] || []) {
      if (!restoredIds.has(String(record.id))) ops.push({ type: 'delete', collection: name, id: String(record.id) });
    }
  }
  await commitOps(ops);
  return await readShopData();
}
export async function deleteShopRecord(name, id) {
  if (!names.includes(name)) throw new Error('Ungültiger Datenbereich.');
  const cached = JSON.parse(localStorage.getItem('sabaidee-pos-v1') || '{}');
  const before = cleanRecord((cached[name] || []).find(record => record.id === id));
  persistGroup([{ collection: name, id, before, after: null }]);
  flushPendingShopData().catch(() => {});
}

export async function readShopData() {
  const values = await Promise.all(names.map(async name => {
    const snapshot = await getDocsFromServer(collection(db, name));
    return [name, snapshot.docs.map(item => ({ ...item.data(), id: item.id }))];
  }));
  return Object.fromEntries(values);
}


// Durable, per-save outbox. Each key is immutable until its transaction is acknowledged.
const OUTBOX_PREFIX = 'harmonie-outbox-v1:' + OWNER_UID + ':';
let syncing = null, syncError = null, lastOutboxTime = 0;
const syncNames = names;
const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  return JSON.stringify(value);
}
function cleanRecord(record) { if (!record) return null; const result = copy(record); delete result.password; return result; }
function pendingGroups() {
  const groups = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(OUTBOX_PREFIX)) continue;
    const group = JSON.parse(localStorage.getItem(key));
    if (!group || !Array.isArray(group.ops) || group.owner !== OWNER_UID) throw new Error('Invalid offline outbox');
    groups.push({ key, ...group });
  }
  return groups.sort((a, b) => a.createdAt - b.createdAt || a.key.localeCompare(b.key));
}
export function hasPendingShopChanges() { return pendingGroups().length > 0; }
export function getShopSyncStatus() {
  return { pending: pendingGroups().reduce((sum, group) => sum + group.ops.length, 0), syncing: !!syncing, offline: navigator.onLine === false, error: syncError };
}
function announceSync() { window.dispatchEvent(new Event('harmonie-sync-status')); }
function persistGroup(ops) {
  if (!ops.length) return;
  const createdAt = Math.max(Date.now(), lastOutboxTime + 1, ...pendingGroups().map(group => group.createdAt + 1)); lastOutboxTime = createdAt; const key = OUTBOX_PREFIX + createdAt + ':' + crypto.randomUUID();
  try { localStorage.setItem(key, JSON.stringify({ owner: OWNER_UID, createdAt, ops })); syncError = null; }
  catch (error) { syncError = 'local-storage'; announceSync(); throw error; }
  announceSync();
}
export function stageShopData(next, previous) {
  const ops = [];
  for (const name of syncNames) {
    const old = new Map((previous?.[name] || []).map(record => [record.id, record]));
    for (const record of next[name] || []) {
      if (!record?.id) continue;
      const before = cleanRecord(old.get(record.id)), after = cleanRecord(record);
      if (canonical(before) !== canonical(after)) ops.push({ collection: name, id: String(record.id), before, after });
    }
  }
  persistGroup(ops);
}
function applyPatch(remote, op, checkConflict) {
  const before = op.before, after = op.after;
  if (canonical(remote) === canonical(after)) return copy(remote);
  const conflict = () => { const error = new Error('Concurrent change: ' + op.collection + '/' + op.id); error.code = 'sync-conflict'; throw error; };
  if (!before || !after || !remote) {
    if (checkConflict && canonical(remote) !== canonical(before)) conflict();
    return copy(after);
  }
  const result = copy(remote);
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (canonical(before[key]) === canonical(after[key])) continue;
    if (checkConflict && canonical(remote[key]) !== canonical(before[key]) && canonical(remote[key]) !== canonical(after[key])) conflict();
    if (Object.prototype.hasOwnProperty.call(after, key)) result[key] = copy(after[key]); else delete result[key];
  }
  return result;
}
export function mergePendingShopData(snapshot) {
  const result = copy(snapshot);
  for (const name of syncNames) result[name] = result[name] || [];
  for (const group of pendingGroups()) for (const op of group.ops) {
    const records = result[op.collection], index = records.findIndex(record => record.id === op.id);
    const merged = applyPatch(index < 0 ? null : records[index], op, false);
    if (!merged) { if (index >= 0) records.splice(index, 1); }
    else if (index < 0) records.push(merged); else records[index] = merged;
  }
  return result;
}
export function flushPendingShopData() {
  if (syncing) return syncing;
  if (navigator.onLine === false || firebaseAuth.currentUser?.uid !== OWNER_UID) return Promise.resolve(false);
  syncing = (async () => {
    syncError = null;
    for (const group of pendingGroups()) {
      if (!localStorage.getItem(group.key)) continue;
      // Keep an entire normal save atomic; reject oversize operations without losing them.
      if (group.ops.length > 400) { const error = new Error('Offline save too large'); error.code = 'sync-too-large'; throw error; }
      await runTransaction(db, async transaction => {
        if (!localStorage.getItem(group.key)) return;
        const reads = [];
        for (const op of group.ops) {
          const ref = doc(db, op.collection, op.id), snapshot = await transaction.get(ref);
          reads.push({ ref, op, remote: snapshot.exists() ? { ...snapshot.data(), id: snapshot.id } : null });
        }
        const changes = reads.map(item => ({ ...item, after: applyPatch(item.remote, item.op, true) }));
        for (const item of changes) {
          if (canonical(item.remote) === canonical(item.after)) continue;
          if (item.after) transaction.set(item.ref, item.after); else transaction.delete(item.ref);
        }
      });
      localStorage.removeItem(group.key);
      announceSync();
    }
    return true;
  })().catch(error => { syncError = error.code || 'network'; throw error; }).finally(() => { syncing = null; announceSync(); });
  announceSync();
  return syncing;
}
window.addEventListener('online', () => { flushPendingShopData().catch(() => {}); });
window.addEventListener('storage', event => { if (event.key?.startsWith(OUTBOX_PREFIX)) announceSync(); });

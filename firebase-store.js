import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js';
import {
  collection, deleteDoc, doc, getDocs, getFirestore, onSnapshot, writeBatch
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
const names = ['services', 'staff', 'receipts', 'expenses'];

export const observeAuth = callback => onAuthStateChanged(firebaseAuth, callback);
export const signInOwner = (email, password) => signInWithEmailAndPassword(firebaseAuth, email, password);
export const signOutOwner = () => signOut(firebaseAuth);

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

export async function watchShopData(onData, onError) {
  const result = { services: [], staff: [], receipts: [], expenses: [] };
  const ready = new Set();
  const unsubscribers = names.map(name => onSnapshot(collection(db, name), snapshot => {
    result[name] = snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
    ready.add(name);
    if (ready.size === names.length) onData(cloneData(result));
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
  const ops = [];
  for (const name of names) {
    const oldRecords = new Map((previous?.[name] || []).map(record => [record.id, record]));
    const newRecords = next[name] || [];
    for (const record of newRecords) {
      if (!record?.id) continue;
      const clean = { ...record };
      delete clean.password;
      if (JSON.stringify(oldRecords.get(record.id)) !== JSON.stringify(clean)) {
        ops.push({ type: 'set', collection: name, id: record.id, data: clean });
      }
      oldRecords.delete(record.id);
    }
  }
  await commitOps(ops);
  return cloneData(next);
}

export async function deleteShopRecord(name, id) {
  if (!names.includes(name)) throw new Error('Ungültiger Datenbereich.');
  await deleteDoc(doc(db, name, id));
}

export async function readShopData() {
  const values = await Promise.all(names.map(async name => {
    const snapshot = await getDocs(collection(db, name));
    return [name, snapshot.docs.map(item => ({ ...item.data(), id: item.id }))];
  }));
  return Object.fromEntries(values);
}

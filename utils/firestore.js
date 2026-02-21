import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

// ─── Users ───────────────────────────────────────────────────────────────────

export async function getUser(name) {
  const snap = await getDoc(doc(db, 'users', name));
  return snap.exists() ? snap.data() : null;
}

export async function createUser(name, hashedPin) {
  await setDoc(doc(db, 'users', name), { name, pin: hashedPin });
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function addExpense({ title, amount, paidBy, splitType, splits }) {
  await addDoc(collection(db, 'expenses'), {
    title,
    amount,
    paidBy,
    splitType,
    splits,
    date: serverTimestamp(),
    settled: false,
  });
}

export async function getExpenses() {
  const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Settlements ──────────────────────────────────────────────────────────────

export async function addSettlement({ from, to, amount }) {
  await addDoc(collection(db, 'settlements'), {
    from,
    to,
    amount,
    date: serverTimestamp(),
  });
}

export async function getSettlements() {
  const snap = await getDocs(collection(db, 'settlements'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

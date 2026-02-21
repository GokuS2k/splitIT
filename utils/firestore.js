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

export async function saveReceiptScan({ createdBy, imageUrl, rawOcrText, parsed, groupId = 'default-group' }) {
  const ref = await addDoc(collection(db, 'receipt_scans'), {
    groupId,
    createdBy,
    imageUrl,
    rawOcrText,
    parsed,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getReceiptScans(groupId = 'default-group') {
  const q = query(collection(db, 'receipt_scans'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((scan) => scan.groupId === groupId);
}

export async function saveSplitExpense({
  groupId,
  createdBy,
  members,
  items,
  allocations,
  subtotal,
  tax,
  total,
  computedTotals,
  taxMode,
  receiptScanId,
}) {
  const ref = await addDoc(collection(db, 'expenses_v2'), {
    groupId,
    createdBy,
    members,
    items,
    allocations,
    subtotal,
    tax,
    total,
    computedTotals,
    taxMode,
    receiptScanId,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function getSplitExpenses(groupId = 'default-group') {
  const q = query(collection(db, 'expenses_v2'), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((expense) => expense.groupId === groupId);
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

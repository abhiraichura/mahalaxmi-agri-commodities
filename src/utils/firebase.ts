import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, Timestamp, onSnapshot, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mahalaxmi-contracts.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mahalaxmi-contracts",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch(() => {});

export const COLLECTIONS = {
  PARTIES: 'parties',
  PRODUCTS: 'products',
  CONTRACTS: 'contracts',
  BILLS: 'bills',
  SETTINGS: 'settings',
  LOGOS: 'logos',
  SIGNATURES: 'signatures',
  NOTES: 'notes',
  LEDGER: 'ledger'
};

// Auth
export const loginUser = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);
export const registerUser = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);
export const logoutUser = () => signOut(auth);
export const onAuthChange = (callback: any) => onAuthStateChanged(auth, callback);

// Firestore CRUD Helpers
export const addDoc = async (col: string, id: string, data: any) => {
  await setDoc(doc(db, col, id), { ...data, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
};

export const setDocData = async (col: string, id: string, data: any) => {
  await setDoc(doc(db, col, id), { ...data, updatedAt: Timestamp.now() }, { merge: true });
};

export const getDocData = async (col: string, id: string) => {
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getColData = async (col: string, orderField = 'createdAt', orderDir: 'desc' | 'asc' = 'desc') => {
  const snap = await getDocs(query(collection(db, col), orderBy(orderField, orderDir)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const getColDataWhere = async (col: string, field: string, operator: any, value: any, orderField = 'createdAt', orderDir: 'desc' | 'asc' = 'desc') => {
  const snap = await getDocs(query(collection(db, col), where(field, operator, value), orderBy(orderField, orderDir)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const updateDocData = async (col: string, id: string, data: any) => {
  await updateDoc(doc(db, col, id), { ...data, updatedAt: Timestamp.now() });
};

export const deleteDocData = async (col: string, id: string) => {
  await deleteDoc(doc(db, col, id));
};

export const subscribeCol = (col: string, callback: any, orderField = 'createdAt') => {
  return onSnapshot(query(collection(db, col), orderBy(orderField, 'desc')), callback);
};

export const subscribeDoc = (col: string, id: string, callback: any) => {
  return onSnapshot(doc(db, col, id), callback);
};

export const subscribeColWhere = (col: string, field: string, operator: any, value: any, callback: any, orderField = 'createdAt') => {
  return onSnapshot(query(collection(db, col), where(field, operator, value), orderBy(orderField, 'desc')), callback);
};

export { Timestamp };

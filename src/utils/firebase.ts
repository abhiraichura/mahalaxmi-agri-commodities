import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  enableIndexedDbPersistence 
} from 'firebase/firestore';

// Use environment variables with fallback for build
const getEnvVar = (key: string): string => {
  // @ts-ignore - Vite env vars
  return import.meta.env?.[key] || '';
};

// Your Firebase config - REPLACE THESE VALUES from Firebase Console
const firebaseConfig = {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY') || "YOUR_API_KEY",
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN') || "mahalaxmi-contracts.firebaseapp.com",
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID') || "mahalaxmi-contracts",
  appId: getEnvVar('VITE_FIREBASE_APP_ID') || "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable offline persistence (works on free tier)
enableIndexedDbPersistence(db).catch((err: any) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence enabled in first tab only');
  } else if (err.code === 'unimplemented') {
    console.warn('Browser does not support persistence');
  }
});

export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logoutUser = () => signOut(auth);
export const onAuthChange = (callback: (user: any) => void) => onAuthStateChanged(auth, callback);

// Firestore helpers
export const COLLECTIONS = {
  PARTIES: 'parties',
  PRODUCTS: 'products',
  CONTRACTS: 'contracts',
  BROKERAGE_BILLS: 'brokerageBills',
  SETTINGS: 'settings',
  USERS: 'users',
  LOGOS: 'logos'
};

export const createDocument = async (collectionName: string, id: string, data: any) => {
  const docRef = doc(db, collectionName, id);
  await setDoc(docRef, { ...data, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
  return docRef;
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  return docRef;
};

export const getDocument = async (collectionName: string, id: string) => {
  const docRef = doc(db, collectionName, id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

export const getCollection = async (collectionName: string, filters?: any[]) => {
  let q = query(collection(db, collectionName), orderBy('createdAt', 'desc'));
  if (filters) {
    filters.forEach(filter => {
      q = query(q, where(filter.field, filter.op, filter.value));
    });
  }
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const deleteDocument = async (collectionName: string, id: string) => {
  await deleteDoc(doc(db, collectionName, id));
};

// Logo storage in Firestore (base64) - FREE, no Storage needed
export const saveLogoToFirestore = async (userId: string, base64Image: string) => {
  const logoRef = doc(db, COLLECTIONS.LOGOS, userId);
  await setDoc(logoRef, { 
    image: base64Image, 
    updatedAt: Timestamp.now() 
  });
  return base64Image;
};

export const getLogoFromFirestore = async (userId: string) => {
  const logoSnap = await getDoc(doc(db, COLLECTIONS.LOGOS, userId));
  return logoSnap.exists() ? logoSnap.data().image : null;
};

export { Timestamp };

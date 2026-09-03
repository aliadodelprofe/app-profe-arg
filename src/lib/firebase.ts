import { initializeApp, setLogLevel as setAppLogLevel } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Configure log level to silence transient connection logs
try {
  setLogLevel('silent');
  setAppLogLevel('silent');
} catch {
  // Ignore in case environment restricts logger configuration
}

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent cache and force long polling for reliable sandbox/iframe connections
const databaseId = (firebaseConfig as any).firestoreDatabaseId;

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    experimentalForceLongPolling: true
  }, databaseId && databaseId !== '(default)' ? databaseId : undefined);
} catch (e) {
  try {
    firestoreDb = initializeFirestore(app, {
      experimentalForceLongPolling: true
    }, databaseId && databaseId !== '(default)' ? databaseId : undefined);
  } catch (err) {
    console.warn('Firestore fallback initialization:', err);
    firestoreDb = initializeFirestore(app, {}, databaseId && databaseId !== '(default)' ? databaseId : undefined);
  }
}

export const db = firestoreDb;

// Initialize Storage
export const storage = getStorage(app);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Helper for error handling
export { signInWithPopup, signOut };

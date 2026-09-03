import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../lib/firebase';

/**
 * Checks if a URL is hosted on Firebase Storage and deletes the object
 * to free up storage space.
 */
export async function deleteVideoFromStorage(url: string | undefined | null): Promise<boolean> {
  if (!url || typeof url !== 'string') return false;

  const cleanUrl = url.trim();

  // Check if it's a Firebase Storage download URL or gs:// path
  const isFirebaseStorage =
    cleanUrl.includes('firebasestorage.googleapis.com') ||
    cleanUrl.includes('.firebasestorage.app') ||
    cleanUrl.startsWith('gs://');

  if (!isFirebaseStorage) {
    return false;
  }

  try {
    const fileRef = ref(storage, cleanUrl);
    await deleteObject(fileRef);
    console.log('[Firebase Storage] Old video successfully deleted from storage:', cleanUrl);
    return true;
  } catch (error: any) {
    // If it's already deleted or not found (storage/object-not-found), ignore silently
    if (error?.code === 'storage/object-not-found') {
      console.log('[Firebase Storage] Object already removed or not found.');
      return false;
    }
    console.warn('[Firebase Storage] Could not delete object from storage:', error?.message || error);
    return false;
  }
}

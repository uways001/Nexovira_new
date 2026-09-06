/**
 * Nexovira Unified Firebase Storage Service
 * 
 * Strict Storage Rules:
 *  - All images and files are stored in Firebase Storage.
 *  - Never store base64 strings or local server file paths in Firestore documents.
 *  - Returns permanent public download URLs from Firebase Storage.
 *  - Explicitly informs user if storage upload fails.
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export interface StorageUploadResult {
  url: string;
  fileName: string;
  size: number;
  contentType: string;
}

/**
 * Upload a browser File object directly to Firebase Storage
 */
export async function uploadFileToStorage(file: File, folder = 'general'): Promise<StorageUploadResult> {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  if (!storage) {
    throw new Error('Firebase Storage is not initialized. Please verify your Firebase configuration.');
  }

  try {
    const timestamp = Date.now();
    const cleanExt = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'bin';
    const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const safeFileName = `${baseName}_${timestamp}.${cleanExt}`;
    const safeFolder = folder.replace(/[^a-zA-Z0-9_\-\/]/g, '');

    const storageRef = ref(storage, `${safeFolder}/${safeFileName}`);

    const metadata = {
      contentType: file.type || 'application/octet-stream',
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    };

    const uploadSnapshot = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(uploadSnapshot.ref);

    if (!downloadUrl) {
      throw new Error('Firebase Storage did not return a valid download URL.');
    }

    return {
      url: downloadUrl,
      fileName: safeFileName,
      size: file.size,
      contentType: file.type || 'application/octet-stream'
    };
  } catch (err: any) {
    console.error('[Firebase Storage Upload Error]:', err);
    throw new Error(`Firebase Storage upload failed: ${err.message || 'Check storage permissions in Firebase Console.'}`);
  }
}

/**
 * Upload an image file directly to Firebase Storage and return its permanent download URL string
 */
export async function uploadImageToFirebaseStorage(file: File, folder = 'general'): Promise<string> {
  const result = await uploadFileToStorage(file, folder);
  return result.url;
}

/**
 * Upload a dataUrl or blob directly to Firebase Storage and return its permanent public download URL
 */
export async function uploadDataUrlToStorage(
  dataUrl: string,
  filename: string,
  folder = 'general'
): Promise<string> {
  if (!dataUrl) {
    throw new Error('No data provided for upload.');
  }

  // If already a permanent Firebase Storage URL, return as-is
  if (dataUrl.includes('firebasestorage.googleapis.com') || dataUrl.startsWith('https://storage.googleapis.com/')) {
    return dataUrl;
  }

  if (!storage) {
    throw new Error('Firebase Storage is not initialized.');
  }

  try {
    // Convert data URL to Blob
    const fetchRes = await fetch(dataUrl);
    const blob = await fetchRes.blob();

    const timestamp = Date.now();
    const cleanExt = filename.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg';
    const baseName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-]/g, '_');
    const safeFileName = `${baseName}_${timestamp}.${cleanExt}`;
    const safeFolder = folder.replace(/[^a-zA-Z0-9_\-\/]/g, '');

    const storageRef = ref(storage, `${safeFolder}/${safeFileName}`);

    const uploadSnapshot = await uploadBytes(storageRef, blob, {
      contentType: blob.type || 'image/jpeg'
    });

    const downloadUrl = await getDownloadURL(uploadSnapshot.ref);
    return downloadUrl;
  } catch (err: any) {
    console.error('[Firebase Storage DataUrl Upload Error]:', err);
    throw new Error(`Failed to upload asset to Firebase Storage: ${err?.message || 'Check storage permissions.'}`);
  }
}

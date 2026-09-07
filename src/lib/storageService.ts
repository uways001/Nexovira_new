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
 * Upload via backend storage proxy route (/api/v1/storage/upload)
 * Fully bypasses browser CORS/fetch limitations in sandboxed runtimes
 * and persists to Firebase Cloud Storage with permanent fallback.
 */
async function uploadViaBackend(
  fileOrData: File | Blob | string,
  filename: string,
  folder = 'general'
): Promise<StorageUploadResult> {
  let base64Data = '';
  let contentType = 'application/octet-stream';

  if (typeof fileOrData === 'string') {
    if (fileOrData.startsWith('data:')) {
      const match = fileOrData.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        base64Data = match[2];
      } else {
        base64Data = fileOrData;
      }
    } else {
      base64Data = fileOrData;
    }
  } else {
    contentType = fileOrData.type || 'application/octet-stream';
    base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileOrData);
    });
  }

  const res = await fetch('/api/v1/storage/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename,
      contentType,
      base64Data,
      folder
    })
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.error || errJson.details || `Upload endpoint failed with status ${res.status}`);
  }

  const data = await res.json();
  return {
    url: data.url,
    fileName: data.fileName || filename,
    size: data.size || 0,
    contentType: data.contentType || contentType
  };
}

/**
 * Upload a browser File object directly to Firebase Storage with backend fallback
 */
export async function uploadFileToStorage(file: File, folder = 'general'): Promise<StorageUploadResult> {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // 1. Try direct client upload if Firebase Storage is initialized
  if (storage) {
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

      if (downloadUrl) {
        return {
          url: downloadUrl,
          fileName: safeFileName,
          size: file.size,
          contentType: file.type || 'application/octet-stream'
        };
      }
    } catch (directErr: any) {
      console.warn('[Direct Firebase Storage upload skipped, falling back to server pipeline]:', directErr?.message || directErr);
    }
  }

  // 2. High-reliability fallback: backend upload pipeline
  try {
    return await uploadViaBackend(file, file.name, folder);
  } catch (backendErr: any) {
    console.error('[Firebase Storage Upload Error]:', backendErr);
    throw new Error(`Upload failed: ${backendErr?.message || 'Please check storage permissions in Firebase Console.'}`);
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

  // If already a permanent Firebase Storage URL or public upload URL, return as-is
  if (dataUrl.includes('firebasestorage.googleapis.com') || dataUrl.startsWith('https://storage.googleapis.com/') || dataUrl.startsWith('/uploads/')) {
    return dataUrl;
  }

  // 1. Try direct client-side upload if available
  if (storage) {
    try {
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
      if (downloadUrl) {
        return downloadUrl;
      }
    } catch (err: any) {
      console.warn('[Direct dataUrl upload skipped, falling back to server pipeline]:', err?.message || err);
    }
  }

  // 2. High-reliability fallback: backend storage pipeline
  try {
    const result = await uploadViaBackend(dataUrl, filename, folder);
    return result.url;
  } catch (err: any) {
    console.error('[Unified DataUrl Upload Error]:', err);
    throw new Error(`Failed to upload asset to Firebase Storage: ${err?.message || 'Check storage permissions.'}`);
  }
}

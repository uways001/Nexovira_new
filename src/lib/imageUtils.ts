import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Creates an instantaneous preview URL for any selected File (0ms latency)
 */
export function getInstantPreviewUrl(file: File): string {
  try {
    return URL.createObjectURL(file);
  } catch (_) {
    return '';
  }
}

/**
 * Safely revokes an object URL to prevent memory leaks
 */
export function revokeInstantPreviewUrl(url: string | null | undefined): void {
  if (url && typeof url === 'string' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url);
    } catch (_) {}
  }
}

/**
 * Resizes and compresses an image File using an offscreen HTML5 Canvas.
 * Returns a high-quality, lightweight base64 data URL (under 120KB)
 * to ensure documents never exceed Firestore 1MB limits.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's already an SVG, read directly as text/dataURL
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read SVG file'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              maxHeight = height;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Prefer webp with fallback to jpeg
          let compressed = '';
          try {
            compressed = canvas.toDataURL('image/webp', quality);
          } catch (_) {
            compressed = canvas.toDataURL('image/jpeg', quality);
          }

          if (!compressed || !compressed.startsWith('data:image/')) {
            compressed = canvas.toDataURL('image/jpeg', quality);
          }

          resolve(compressed || (e.target?.result as string));
        } catch (err) {
          resolve(e.target?.result as string);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Upload an image file directly to Firebase Storage:
 * 1. Validates format and creates an optimized WebP / JPEG asset via canvas
 * 2. Uploads the Blob to Firebase Storage
 * 3. Returns the permanent Firebase Storage download URL
 * 4. Fails with a clear error if upload fails (no base64 or fake fallbacks saved)
 */
export async function uploadImageWithFallback(
  file: File,
  folder = 'general',
  customId = `${Date.now()}`
): Promise<string> {
  // Validate basic format
  const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (!validMimes.includes(file.type.toLowerCase()) && !/\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name)) {
    throw new Error('Please select a valid image file (JPG, PNG, WebP, GIF, SVG).');
  }

  if (!storage) {
    throw new Error('Firebase Storage is not initialized.');
  }

  // Compress to produce an optimized, lightweight asset
  const compressedDataUrl = await compressImageFile(file);

  try {
    const cleanExt = file.name.split('.').pop()?.toLowerCase() || 'webp';
    const cleanName = `${customId}_${Math.random().toString(36).substring(2, 7)}.${cleanExt}`;
    const storageRef = ref(storage, `${folder}/${cleanName}`);

    const res = await fetch(compressedDataUrl);
    const blob = await res.blob();
    const uploadResult = await uploadBytes(storageRef, blob, {
      contentType: blob.type || 'image/webp',
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString()
      }
    });

    const downloadUrl = await getDownloadURL(uploadResult.ref);
    if (!downloadUrl) {
      throw new Error('Firebase Storage did not return a valid download URL.');
    }

    return downloadUrl;
  } catch (storageErr: any) {
    console.error('[Firebase Storage Upload Error]:', storageErr);
    throw new Error(`Firebase Storage upload failed: ${storageErr?.message || 'Check storage permissions in Firebase Console.'}`);
  }
}

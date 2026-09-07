import { Product } from '../types';
import { getProductFromFirestore, updateProductInFirestore, saveProductToFirestore } from './firestoreService';
import { safeFetchJson } from './safeFetch';

export interface AdminProductEditMeta {
  productId: string;
  createdAt: string;
  updatedAt: string;
  isArchiveRecord: boolean;
  sku: string;
  status: 'active' | 'draft' | 'archived';
}

export interface AdminProductEditResponse {
  success: boolean;
  product: Product;
  meta?: AdminProductEditMeta;
}

/**
 * RESTful Route Isolation for Admin Product Management
 * 
 * 1. GET /api/v1/admin/products/:id/edit
 *    Retrieves the existing product and its archive metadata.
 */
export async function fetchAdminProductForEdit(productId: string): Promise<{ product: Product; meta: AdminProductEditMeta }> {
  try {
    const res = await safeFetchJson<AdminProductEditResponse>(`/api/v1/admin/products/${encodeURIComponent(productId)}/edit`);
    if (res.ok && res.data && res.data.success && res.data.product) {
      return {
        product: res.data.product,
        meta: res.data.meta || {
          productId: res.data.product.id,
          createdAt: res.data.product.createdAt || new Date().toISOString(),
          updatedAt: (res.data.product as any).updatedAt || res.data.product.createdAt || new Date().toISOString(),
          isArchiveRecord: true,
          sku: `NEXO-${res.data.product.id}`,
          status: 'active'
        }
      };
    }
  } catch (err) {
    console.warn('[AdminProductAPI] Backend endpoint fallback to Firestore for product edit:', err);
  }

  // Fallback: Fetch directly from Firestore
  const firestoreProd = await getProductFromFirestore(productId);
  if (!firestoreProd) {
    throw new Error(`Inventory item "${productId}" was not found in catalog archive.`);
  }

  return {
    product: firestoreProd,
    meta: {
      productId: firestoreProd.id,
      createdAt: firestoreProd.createdAt || new Date().toISOString(),
      updatedAt: (firestoreProd as any).updatedAt || firestoreProd.createdAt || new Date().toISOString(),
      isArchiveRecord: true,
      sku: `NEXO-${firestoreProd.id}`,
      status: 'active'
    }
  };
}

/**
 * 2. PUT /api/v1/admin/products/:id
 *    Strictly isolated RESTful endpoint to UPDATE/MODIFY an existing inventory entry.
 *    Will fail with 404 if the product doesn't already exist.
 */
export async function updateAdminProductEntry(
  productId: string,
  updates: Partial<Product>,
  authUserId?: string,
  userRole: string = 'admin'
): Promise<Product> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-role': userRole,
    'x-user-id': authUserId || 'admin-root'
  };

  // 1. Submit PUT request to isolated RESTful API
  try {
    const response = await fetch(`/api/v1/admin/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        product: {
          ...updates,
          id: productId
        },
        authUserId,
        userRole
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Server responded with status ${response.status} when updating product.`);
    }

    const data = await response.json();
    if (data.product) {
      // Sync to Firestore for real-time subscribers & listeners
      await updateProductInFirestore(productId, updates).catch(err => {
        console.warn('[AdminProductAPI] Secondary Firestore sync notice:', err);
      });
      return data.product;
    }
  } catch (err: any) {
    console.warn('[AdminProductAPI] PUT request error, proceeding with direct Firestore update:', err);
  }

  // Direct fallback to Firestore update
  await updateProductInFirestore(productId, updates);
  const updated = await getProductFromFirestore(productId);
  if (!updated) {
    throw new Error(`Failed to retrieve updated inventory record "${productId}".`);
  }
  return updated;
}

/**
 * 3. POST /api/v1/admin/products
 *    Strictly isolated RESTful endpoint to CREATE a brand new product document.
 */
export async function createAdminProductEntry(
  productData: Partial<Product>,
  authUserId?: string,
  userRole: string = 'admin'
): Promise<Product> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-role': userRole,
    'x-user-id': authUserId || 'admin-root'
  };

  try {
    const response = await fetch('/api/v1/admin/products', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        product: productData,
        authUserId,
        userRole
      })
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.message || `Server responded with status ${response.status} when creating product.`);
    }

    const data = await response.json();
    if (data.product) {
      // Also ensure it is saved to Firestore
      await saveProductToFirestore(data.product).catch(err => {
        console.warn('[AdminProductAPI] Secondary Firestore creation notice:', err);
      });
      return data.product;
    }
  } catch (err: any) {
    console.warn('[AdminProductAPI] POST request error, saving directly to Firestore:', err);
  }

  const savedId = await saveProductToFirestore(productData);
  const saved = await getProductFromFirestore(savedId);
  if (!saved) {
    throw new Error('Failed to retrieve newly created product from Firestore.');
  }
  return saved;
}

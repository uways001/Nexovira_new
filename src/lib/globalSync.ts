/**
 * Global Real-Time Synchronization Hub
 * Ensures changes to courses, prices, images, logos, descriptions, services, products,
 * and settings propagate instantly across all open tabs, windows, devices, and sessions.
 */

export type SyncEventType = 
  | 'COURSE_UPDATED'
  | 'COURSE_DELETED'
  | 'BRANDING_UPDATED'
  | 'CONTENT_UPDATED'
  | 'PRODUCT_UPDATED'
  | 'PRODUCT_DELETED'
  | 'SERVICE_UPDATED'
  | 'SERVICE_DELETED'
  | 'CATEGORY_UPDATED'
  | 'CATEGORY_DELETED'
  | 'SETTINGS_UPDATED';

export interface GlobalSyncPayload {
  type: SyncEventType;
  id?: string;
  data?: any;
  timestamp: string;
  sourceTabId?: string;
}

const TAB_ID = typeof window !== 'undefined' 
  ? `tab_${Math.random().toString(36).substring(2, 9)}_${Date.now()}` 
  : 'server';

let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('nexovira_global_sync_channel');
  } catch (e) {
    broadcastChannel = null;
  }
}

/**
 * Broadcast a synchronization event across the current window, all open browser tabs,
 * and triggers immediate local listeners.
 */
export function broadcastGlobalChange(type: SyncEventType, id?: string, data?: any): void {
  if (typeof window === 'undefined') return;

  const payload: GlobalSyncPayload = {
    type,
    id,
    data,
    timestamp: new Date().toISOString(),
    sourceTabId: TAB_ID
  };

  // 1. Cross-tab BroadcastChannel
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {}
  }

  // 2. Window CustomEvent (Same Tab)
  try {
    window.dispatchEvent(new CustomEvent('nexovira:global-sync', { detail: payload }));
  } catch (e) {}

  // 3. Entity-specific events for backwards-compatibility
  try {
    if (type.startsWith('COURSE_')) {
      window.dispatchEvent(new CustomEvent('nexovira:courses-changed', { detail: payload }));
    } else if (type.startsWith('PRODUCT_')) {
      window.dispatchEvent(new CustomEvent('nexovira:products-changed', { detail: payload }));
    } else if (type.startsWith('SERVICE_')) {
      window.dispatchEvent(new CustomEvent('nexovira:services-changed', { detail: payload }));
      window.dispatchEvent(new CustomEvent('nexovira:providers-changed', { detail: payload }));
    } else if (type.startsWith('BRANDING_') || type.startsWith('CONTENT_')) {
      window.dispatchEvent(new CustomEvent('nexovira:branding-changed', { detail: payload }));
    }
  } catch (e) {}

  // 4. LocalStorage event trigger for cross-tab fallback
  try {
    localStorage.setItem('nexovira_last_sync_event', JSON.stringify(payload));
  } catch (e) {}
}

/**
 * Subscribe to global synchronization events across all tabs and components
 */
export function subscribeToGlobalSyncEvents(
  callback: (event: GlobalSyncPayload) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvt = e as CustomEvent<GlobalSyncPayload>;
    if (customEvt.detail) {
      callback(customEvt.detail);
    }
  };

  const handleBroadcastMessage = (e: MessageEvent) => {
    if (e.data && e.data.type) {
      callback(e.data as GlobalSyncPayload);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'nexovira_last_sync_event' && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        if (parsed.sourceTabId !== TAB_ID) {
          callback(parsed);
        }
      } catch (err) {}
    }
  };

  window.addEventListener('nexovira:global-sync', handleCustomEvent);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('nexovira:global-sync', handleCustomEvent);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    window.removeEventListener('storage', handleStorageEvent);
  };
}

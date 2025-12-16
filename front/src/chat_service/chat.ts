// Chat WebSocket client for ft_transcendence
// Main orchestration module

import { initializeChatUI } from './uiRenderer.js';
import { connectChat, disconnectChat, reconnectChat, setShouldReconnect } from './websocket.js';

let storageListener: ((e: StorageEvent) => void) | null = null;

/**
 * Initialize and render the chat UI (starts as bubble)
 */
export function renderChat() {
  initializeChatUI();

  // Connect to chat WebSocket
  setShouldReconnect(true);
  connectChat();

  // Setup storage listener for auth changes
  if (storageListener) {
    window.removeEventListener('storage', storageListener);
  }

  storageListener = (e: StorageEvent) => {
    console.log('🔔 Storage event fired!', e.key, 'new:', e.newValue, 'old:', e.oldValue);
    if (e.key === 'accessToken') {
      if (!e.newValue) {
        console.log('🔔 Access token removed, disconnecting chat');
        disconnectChat();
      } else {
        console.log('🔔 Access token added/changed, reconnecting chat');
        reconnectChat();
      }
    }
  };

  window.addEventListener('storage', storageListener);
}

/**
 * Disconnect from chat
 */
export { disconnectChat, reconnectChat };


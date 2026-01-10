// Chat WebSocket client for ft_transcendence
// Main orchestration module

import { initializeChatUI } from './uiRenderer.js';
import { disconnectChat, reconnectChat } from './websocket.js';

/**
 * Initialize and render the chat UI (starts as bubble)
 */
export function renderChat() {
	initializeChatUI();

	// Listen for localStorage changes (logout/login in other tabs)
	const storageListener = (e: StorageEvent) => {
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


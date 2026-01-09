// Game invitation UI and functionality

import { getWebSocket } from './websocket.js';
import { joinMatchDirectly } from '../match_service/render_remote.js';

/**
 * Show game invitation confirmation modal and create match
 */
export async function showGameInvitationModal(recipientUsername: string, recipientUserId: number) {
    // Get current user info
    const currentUserId = getCurrentUserId();
    const currentUsername = getCurrentUsername();

    if (!currentUserId || !currentUsername) {
        showError('Unable to get user information');
        return;
    }

    // Create confirmation modal
    const modal = document.createElement('div');
    modal.id = 'game-invitation-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50';
    modal.innerHTML = renderConfirmationModal(recipientUsername);

    document.body.appendChild(modal);

    // Setup event handlers
    setupModalHandlers(modal, currentUserId, currentUsername, recipientUserId, recipientUsername);
}

function renderConfirmationModal(recipientUsername: string): string {
    return `
        <div class="
            bg-gray-200
            border-4 border-black
            w-[450px]
            shadow-[8px_8px_0_0_#000000]
        ">
            <!-- Header -->
            <div class="
                bg-purple-600 text-white
                px-4 py-3
                border-b-4 border-black
                flex justify-between items-center
            ">
                <h3 class="font-bold tracking-wider text-sm">
                    🎮 INVITE TO GAME
                </h3>
                <button id="modal-close" class="text-xl hover:text-pink-400">✕</button>
            </div>

            <!-- Content -->
            <div class="p-6 bg-gray-800 text-center">
                <div class="mb-6">
                    <p class="text-white font-mono text-lg mb-2">
                        Challenge <span class="text-pink-400 font-bold">@${escapeHtml(recipientUsername)}</span> to a game?
                    </p>
                    <p class="text-gray-400 font-mono text-xs">
                        A 1v1 match will be created
                    </p>
                </div>

                <div class="flex gap-3 justify-center">
                    <button id="cancel-btn" class="
                        bg-gray-600 text-white font-bold
                        px-6 py-3
                        border-2 border-black
                        hover:bg-gray-700
                        transition-all
                    ">
                        CANCEL
                    </button>
                    <button id="send-invitation-btn" class="
                        bg-pink-500 text-black font-bold
                        px-6 py-3
                        border-2 border-black
                        shadow-[4px_4px_0_0_#000000]
                        hover:bg-pink-400
                        active:shadow-none active:translate-x-[2px] active:translate-y-[2px]
                        transition-all
                    ">
                        SEND INVITATION
                    </button>
                </div>
            </div>
        </div>
    `;
}

function setupModalHandlers(
    modal: HTMLElement,
    currentUserId: number,
    currentUsername: string,
    recipientUserId: number,
    recipientUsername: string
) {
    // Close button
    modal.querySelector('#modal-close')?.addEventListener('click', () => {
        modal.remove();
    });

    // Cancel button
    modal.querySelector('#cancel-btn')?.addEventListener('click', () => {
        modal.remove();
    });

    // Send invitation button
    modal.querySelector('#send-invitation-btn')?.addEventListener('click', async () => {
        try {
            await createAndSendInvitation(currentUserId, currentUsername, recipientUserId, recipientUsername);
            modal.remove();
            showSuccess(`Game invitation sent to @${recipientUsername}`);
        } catch (error) {
            console.error('Failed to send invitation:', error);
            showError('Failed to send invitation');
        }
    });

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

/**
 * Send game invitation (match will be created when both players are ready)
 */
async function createAndSendInvitation(
    senderId: number,
    senderUsername: string,
    recipientId: number,
    recipientUsername: string
) {
    const ws = getWebSocket();
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        showError('Chat is not connected');
        return;
    }

    // Generate unique match name
    const matchName = `${senderUsername}_vs_${recipientUsername}_${Date.now()}`;

    // Send invitation through chat websocket (match will be created later)
    const invitationMessage = {
        type: 'game_invitation',
        recipientId: recipientId,
        invitationData: {
            invitation_type: 'direct_match',
            match_name: matchName,
            sender_username: senderUsername,
            sender_id: senderId,
            recipient_id: recipientId,
            recipient_username: recipientUsername,
        }
    };

    ws.send(JSON.stringify(invitationMessage));
    console.log('Game invitation sent:', invitationMessage);

    // Auto-join the sender to the match lobby
    await joinMatchDirectly(matchName);
}

/**
 * Handle clicking on an invitation (recipient side)
 */
export async function handleInvitationClick(matchName: string, senderUsername: string) {
    // Show confirmation modal
    const confirmed = confirm(`Join game with ${senderUsername}?`);
    if (confirmed) {
        // Join the match lobby
        joinMatchDirectly(matchName);
    }
}

/**
 * Get current user ID from token
 */
function getCurrentUserId(): number | null {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.sub || null;
    } catch (err) {
        console.error('Failed to decode token:', err);
        return null;
    }
}

/**
 * Get current username from localStorage or token
 */
function getCurrentUsername(): string | null {
    // Try localStorage first
    const username = localStorage.getItem('username');
    if (username) return username;

    // Try token
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.username || null;
    } catch (err) {
        console.error('Failed to decode token:', err);
        return null;
    }
}

function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showError(message: string) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded border-2 border-black shadow-lg z-[200] font-mono text-sm';
    errorDiv.textContent = `❌ ${message}`;
    document.body.appendChild(errorDiv);

    setTimeout(() => errorDiv.remove(), 3000);
}

function showSuccess(message: string) {
    const successDiv = document.createElement('div');
    successDiv.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded border-2 border-black shadow-lg z-[200] font-mono text-sm';
    successDiv.textContent = `✓ ${message}`;
    document.body.appendChild(successDiv);

    setTimeout(() => successDiv.remove(), 3000);
}

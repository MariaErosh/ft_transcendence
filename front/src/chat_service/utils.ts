// Utility functions for chat

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format timestamp for display
 */
export function formatTime(timestamp: string | number | undefined): string {
  return new Date(timestamp || Date.now())
    .toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Check if username is a temporary username
 */
export function isTempUsername(username: string): boolean {
	if (username.startsWith('temp_') && username.length === 13)
		return true;
	return false;
}

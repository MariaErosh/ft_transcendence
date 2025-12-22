// Chat type definitions

export interface ChatMessage {
  type: "message" | "system" | "error" | "game_invitation" | "invitation_response" | "auth_success" | "auth_error";
  id?: number;
  conversation_id?: number;
  sender_id?: number;
  sender_username?: string;
  user_id?: number; // Legacy support
  username?: string; // Legacy support
  content: string;
  created_at?: string | number;
  timestamp?: number;
  recipient_id?: number | null;
  isDM?: boolean;
  delivered?: boolean;
}

export interface User {
  userId?: number;
  username: string;
  isOnline?: boolean;
}

export type StatusType = "success" | "error" | "info";

export interface ChatState {
	isConnected: boolean;
	isChatOpen: boolean;
	messageHistory: ChatMessage[];
	allUsers: User[];
	onlineUsers: User[];
	currentRecipient: User | null;
	isUserListOpen: boolean;
}

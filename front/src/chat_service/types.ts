// Chat type definitions

export interface ChatMessage {
  type: "message" | "system" | "error" | "game_invitation" | "invitation_response" | "typing" | "read_receipt";
  id?: number;
  conversation_id?: number;
  sender_id?: number;
  sender_username?: string;
  user_id?: number; // Legacy support
  username?: string; // Legacy support
  content?: string;
  isTyping?: boolean;
  read_by_user_id?: number;
  is_read?: number;
  read_at?: string;
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
  unreadCount?: number;
}

export type StatusType = "success" | "error" | "info";

export type ChatView = 'home' | 'dm';

export interface ChatData {
	isConnected: boolean;
	isChatOpen: boolean;
	currentView: ChatView;
	messageHistory: ChatMessage[];
	allUsers: User[];
	onlineUsers: User[];
	friends: User[];
	blockedUsers: number[];
	currentRecipient: User | null;
	isUserListOpen: boolean;
	isTyping: boolean;
	lastTypingTime: number;
	recipientIsTyping: boolean;
}

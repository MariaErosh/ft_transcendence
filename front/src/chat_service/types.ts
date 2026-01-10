// Chat type definitions

export interface ChatMessage {
  type: "message" | "system" | "error" | "game_invitation" | "invitation_response" | "typing" | "read_receipt";
  id?: number;
  conversation_id?: number;
  sender_id?: number;
  sender_username?: string;
  user_id?: number;
  username?: string;
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
  // Game invitation fields
  invitation_id?: number; // ID from game_invitations table
  invitation_type?: 'tournament' | 'direct_match'; // Maybe we need this
  invitation_data?: {
    // Game details (provided by client)
    match_id?: number;
    match_name?: string;
    tournament_id?: number;
    tournament_name?: string;
    invitation_type?: string;
    join_url?: string;
    expires_at?: number;
    game_mode?: string;
    custom_data?: any;
    // added by backend from authenticated user
    sender_username?: string;
    sender_id?: number;
  };
  join_url?: string;
}

export interface User {
  userId?: number;
  username: string;
  isOnline?: boolean;
  unreadCount?: number;
}

export interface Tournament {
  id: number;
  name: string;
  type: string;
  status: string;
  round: number;
  owner: string;
  created_at: string;
  player_count: number;
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

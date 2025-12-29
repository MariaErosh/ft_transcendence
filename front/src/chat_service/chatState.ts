// Centralized chat data management

import type { ChatMessage, User, ChatData as IChatData, ChatView } from './types.js';

class ChatDataManager {
	private state: IChatData = {
		isConnected: false,
		isChatOpen: false,
		currentView: 'home',
		messageHistory: [],
		allUsers: [],
		onlineUsers: [],
		friends: [],
		blockedUsers: [],
		currentRecipient: null,
    isUserListOpen: true,
    isTyping: false,
    lastTypingTime: 0,
    recipientIsTyping: false,
  };  // Getters
  isConnected(): boolean {
    return this.state.isConnected;
  }

  isChatOpen(): boolean {
    return this.state.isChatOpen;
  }

  getMessageHistory(): ChatMessage[] {
    return this.state.messageHistory;
  }

  getAllUsers(): User[] {
    return this.state.allUsers;
  }

  getOnlineUsers(): User[] {
    return this.state.onlineUsers;
  }

  getCurrentRecipient(): User | null {
    return this.state.currentRecipient;
  }

  isUserListOpen(): boolean {
    return this.state.isUserListOpen;
  }

  getCurrentView(): ChatView {
    return this.state.currentView;
  }

  getFriends(): User[] {
    return this.state.friends;
  }

  getBlockedUsers(): number[] {
    return this.state.blockedUsers;
  }

  isTyping(): boolean {
    return this.state.isTyping;
  }

  getLastTypingTime(): number {
    return this.state.lastTypingTime;
  }

  getRecipientIsTyping(): boolean {
    return this.state.recipientIsTyping;
  }

  // Setters
  setConnected(value: boolean): void {
    this.state.isConnected = value;
  }

  setTyping(value: boolean): void {
    this.state.isTyping = value;
  }

  setLastTypingTime(time: number): void {
    this.state.lastTypingTime = time;
  }

  setRecipientIsTyping(value: boolean): void {
    this.state.recipientIsTyping = value;
  }

  setCurrentView(view: ChatView): void {
    this.state.currentView = view;
  }

  setFriends(friends: User[]): void {
    this.state.friends = friends;
  }

  setBlockedUsers(blockedUsers: number[]): void {
    this.state.blockedUsers = blockedUsers;
  }

  addBlockedUser(userId: number): void {
    if (!this.state.blockedUsers.includes(userId)) {
      this.state.blockedUsers.push(userId);
    }
  }

  removeBlockedUser(userId: number): void {
    this.state.blockedUsers = this.state.blockedUsers.filter(id => id !== userId);
  }

  setChatOpen(value: boolean): void {
    this.state.isChatOpen = value;
  }

  setMessageHistory(messages: ChatMessage[]): void {
    this.state.messageHistory = messages;
  }

  addMessage(message: ChatMessage): void {
    this.state.messageHistory.push(message);
  }

  clearMessages(): void {
    this.state.messageHistory = [];
  }

  setAllUsers(users: User[]): void {
    this.state.allUsers = users;
  }

  setOnlineUsers(users: User[]): void {
    this.state.onlineUsers = users;
  }

  setCurrentRecipient(user: User | null): void {
    this.state.currentRecipient = user;
  }

  toggleUserList(): void {
    this.state.isUserListOpen = !this.state.isUserListOpen;
  }

  setUserListOpen(value: boolean): void {
    this.state.isUserListOpen = value;
  }
}

// Export singleton instance
export const ChatData = new ChatDataManager();

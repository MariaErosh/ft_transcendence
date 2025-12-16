// Centralized chat state management

import type { ChatMessage, User, ChatState as IChatState } from './types.js';

class ChatStateManager {
  private state: IChatState = {
    isConnected: false,
    isChatOpen: false,
    messageHistory: [],
    allUsers: [],
    onlineUsers: [],
    currentRecipient: null,
    isUserListOpen: true,
  };

  // Getters
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

  // Setters
  setConnected(value: boolean): void {
    this.state.isConnected = value;
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
export const ChatState = new ChatStateManager();

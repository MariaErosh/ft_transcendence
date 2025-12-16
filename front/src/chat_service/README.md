# Chat Service Module Structure

This directory contains the refactored chat service implementation, organized using a modular architecture pattern for better maintainability and separation of concerns.

## Architecture Overview

The chat service follows a **modular pattern** with clear separation between:
- **State Management** - Centralized state using singleton pattern
- **UI Rendering** - DOM manipulation and view logic
- **WebSocket Communication** - Network layer and connection handling
- **Business Logic** - User management and message handling
- **Utilities** - Shared helper functions
- **Type Definitions** - TypeScript interfaces and types

## File Structure

```
chat_service/
├── chat.ts              # Main entry point and orchestration
├── types.ts             # TypeScript type definitions
├── chatState.ts         # Centralized state management
├── websocket.ts         # WebSocket connection handling
├── uiRenderer.ts        # UI rendering and DOM manipulation
├── userManager.ts       # User-related operations
├── messageHandler.ts    # Message display and history
└── utils.ts            # Utility functions
```

## Module Descriptions

### `chat.ts` (Main Entry Point)
- **Purpose**: Orchestrates the chat system initialization
- **Responsibilities**:
  - Initialize UI
  - Connect WebSocket
  - Handle storage events for authentication changes
- **Exports**: `renderChat()`, `disconnectChat()`, `reconnectChat()`

### `types.ts` (Type Definitions)
- **Purpose**: Central location for all TypeScript types and interfaces
- **Contains**:
  - `ChatMessage` - Message structure
  - `User` - User data structure
  - `StatusType` - Status indicator types
  - `ChatState` - Application state interface

### `chatState.ts` (State Management)
- **Purpose**: Singleton state manager for the entire chat module
- **Pattern**: Centralized state with getter/setter methods
- **Benefits**:
  - Single source of truth
  - Predictable state updates
  - Easy to debug and test
- **Key Methods**:
  - Connection state: `isConnected()`, `setConnected()`
  - UI state: `isChatOpen()`, `setChatOpen()`
  - Messages: `getMessageHistory()`, `addMessage()`, `clearMessages()`
  - Users: `getAllUsers()`, `setAllUsers()`, `getCurrentRecipient()`

### `websocket.ts` (WebSocket Layer)
- **Purpose**: Handles all WebSocket communication
- **Responsibilities**:
  - Connect/disconnect from WebSocket
  - Handle WebSocket events (open, message, close, error)
  - Send messages
  - Auto-reconnection logic
- **Exports**: `connectChat()`, `disconnectChat()`, `reconnectChat()`, `sendMessage()`

### `uiRenderer.ts` (UI Layer)
- **Purpose**: All DOM manipulation and rendering logic
- **Responsibilities**:
  - Render chat bubble (minimized state)
  - Render chat window (expanded state)
  - Update status messages
  - Enable/disable inputs
  - Event listener setup
- **Exports**: `initializeChatUI()`, `openChat()`, `closeChat()`, `updateStatus()`, `enableInput()`

### `userManager.ts` (User Operations)
- **Purpose**: User-related business logic
- **Responsibilities**:
  - Load users from API
  - Render user list
  - Handle user selection
  - Track online/offline status
- **Exports**: `loadUsers()`, `selectUser()`, `renderUserList()`

### `messageHandler.ts` (Message Operations)
- **Purpose**: Message display and history management
- **Responsibilities**:
  - Load message history from API
  - Display individual messages
  - Clear message display
  - Format messages for different types (system, error, user)
- **Exports**: `loadMessageHistory()`, `displayMessage()`, `displayStoredMessages()`

### `utils.ts` (Utilities)
- **Purpose**: Shared helper functions
- **Functions**:
  - `escapeHtml()` - XSS prevention
  - `formatTime()` - Timestamp formatting

## Data Flow

```
User Action
    ↓
chat.ts (Entry Point)
    ↓
uiRenderer.ts (UI Events)
    ↓
websocket.ts (Network) ←→ chatState.ts (State) ←→ messageHandler.ts (Display)
    ↓                                    ↓
userManager.ts (Users)              utils.ts (Helpers)
```

## Benefits of This Architecture

1. **Separation of Concerns**: Each module has a single, well-defined responsibility
2. **Maintainability**: Easy to locate and modify specific functionality
3. **Testability**: Modules can be tested independently
4. **Reusability**: Utility functions and state management can be reused
5. **Scalability**: Easy to add new features without affecting existing code
6. **Type Safety**: Centralized types ensure consistency across modules

## Usage Example

```typescript
// In your main application file
import { renderChat, disconnectChat } from './chat_service/chat.js';

// Initialize chat
renderChat();

// Later, when user logs out
disconnectChat();
```

## Design Patterns Used

1. **Singleton Pattern**: `ChatState` class ensures single state instance
2. **Module Pattern**: Each file is a self-contained module with clear exports
3. **Observer Pattern**: Storage listener watches for auth changes
4. **Facade Pattern**: `chat.ts` provides simple interface to complex subsystem

## Future Improvements

- Add unit tests for each module
- Implement error boundaries
- Add logging service
- Consider using a state management library (e.g., Redux, MobX)
- Add TypeScript strict mode
- Implement message queuing for offline support

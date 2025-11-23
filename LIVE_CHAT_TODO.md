# Live Chat Service - Development Todo List

**Project**: ft_transcendence  
**Feature**: Real-time Live Chat Microservice  
**Developer**: smanriqu  
**Date Started**: November 23, 2025

---

## 📋 Table of Contents
**🚀 TODAY'S WORK (MVP)**
0. [Phase 0: Minimal Chat MVP](#phase-0-minimal-chat-mvp) ⭐ **START HERE**

**📚 FUTURE REFERENCE (Full Implementation)**
1. [Current Architecture Overview](#1-current-architecture-overview)
2. [Backend: Chat Microservice](#2-backend-chat-microservice)
3. [Frontend: Chat UI Component](#3-frontend-chat-ui-component)
4. [Gateway Integration](#4-gateway-integration)
5. [Authentication & Authorization](#5-authentication--authorization)
6. [Testing & Validation](#6-testing--validation)
7. [Deployment & Documentation](#7-deployment--documentation)

---

# 🚀 PHASE 0: MINIMAL CHAT MVP (TODAY'S WORK)

## Development Strategy
**Goal**: Get a working real-time persistent chat in 2-4 hours

**Approach**: Standalone minimal chat-service
- Create lightweight chat-service with WebSocket + REST + SQLite
- Service handles auth, connections, messages, and persistence
- Gateway only proxies WebSocket (no chat logic in gateway)
- Build minimal frontend UI
- **Result**: Clean architecture, persistent chat, ready to extend

---

## Step 1: Create Minimal Chat Service Backend


### 1.1 Setup Project Files

- [ ] **Create `/back/chat-service/package.json`**
  ```json
  {
    "name": "chat-service",
    "version": "1.0.0",
    "scripts": {
      "build": "tsc",
      "start": "node dist/index.js",
      "dev": "ts-node src/index.ts"
    },
    "dependencies": {
      "fastify": "^4.25.0",
      "@fastify/cors": "^8.4.0",
      "@fastify/websocket": "^10.0.0",
      "@fastify/jwt": "^8.0.0",
      "better-sqlite3": "^9.2.0",
      "dotenv": "^16.3.1",
      "ws": "^8.16.0"
    },
    "devDependencies": {
      "typescript": "^5.3.0",
      "@types/node": "^20.10.0",
      "@types/better-sqlite3": "^7.6.8",
      "@types/ws": "^8.5.10",
      "ts-node": "^10.9.2"
    }
  }
  ```

- [ ] **Create `/back/chat-service/tsconfig.json`**
  ```json
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "commonjs",
      "lib": ["ES2020"],
      "outDir": "./dist",
      "rootDir": "./src",
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "resolveJsonModule": true,
      "moduleResolution": "node"
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
  }
  ```

- [ ] **Create `/back/chat-service/.env`**
  ```env
  PORT=3005
  JWT_SECRET=<copy-from-gateway-.env>
  DATABASE_PATH=./data/database.sqlite
  ```

- [ ] **Create `/back/chat-service/.gitignore`**
  ```
  node_modules/
  dist/
  data/
  .env
  ```

### 1.2 Database Setup

- [ ] **Create `/back/chat-service/src/db/database.ts`**
  ```typescript
  import Database from "better-sqlite3";
  import path from "path";

  const dbPath = path.join(__dirname, "../../data/database.sqlite");
  export const db = new Database(dbPath);

  export function initDB() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_messages_created 
      ON messages(created_at DESC);
    `);
    console.log("Chat database initialized at", dbPath);
  }
  ```

- [ ] **Create `/back/chat-service/data/` directory**

### 1.3 Main Chat Service (WebSocket + REST + Persistence)

- [ ] **Create `/back/chat-service/src/index.ts`**
  ```typescript
  import Fastify from "fastify";
  import cors from "@fastify/cors";
  import websocketPlugin from "@fastify/websocket";
  import jwt from "@fastify/jwt";
  import dotenv from "dotenv";
  import { WebSocket } from "ws";
  import { db, initDB } from "./db/database";

  dotenv.config();

  const PORT = Number(process.env.PORT || 3005);
  const JWT_SECRET = process.env.JWT_SECRET as string;

  interface ChatMessage {
    id: number;
    userId: number;
    username: string;
    content: string;
    timestamp: number;
  }

  const server = Fastify({ logger: true });

  // Register plugins
  server.register(cors, { origin: true });
  server.register(jwt, { secret: JWT_SECRET });
  server.register(websocketPlugin);

  // Initialize database
  initDB();

  // Track active WebSocket connections
  const userSockets = new Map<number, Set<WebSocket>>();

  // REST: Get recent messages
  server.get("/chat/messages", async (request, reply) => {
    const { limit = 50 } = request.query as { limit?: number };
    
    const stmt = db.prepare(`
      SELECT 
        id, 
        user_id as userId, 
        username, 
        content, 
        created_at as timestamp
      FROM messages
      ORDER BY created_at DESC
      LIMIT ?
    `);
    
    const messages = stmt.all(limit).reverse();
    return { messages };
  });

  // WebSocket endpoint
  server.get("/ws", { websocket: true }, (socket, req) => {
    // Validate JWT token
    const token = (req.query as any).token;
    if (!token) {
      socket.send(JSON.stringify({ type: "error", message: "No token provided" }));
      socket.close();
      return;
    }

    let userId: number;
    let username: string;

    try {
      const payload = server.jwt.verify<{ sub: number; username: string }>(token);
      userId = payload.sub;
      username = payload.username;
    } catch (err) {
      socket.send(JSON.stringify({ type: "error", message: "Invalid token" }));
      socket.close();
      return;
    }

    // Register user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket);
    
    console.log(`Chat: User ${username} (ID: ${userId}) connected`);

    // Send message history
    try {
      const stmt = db.prepare(`
        SELECT 
          id, 
          user_id as userId, 
          username, 
          content, 
          created_at as timestamp
        FROM messages
        ORDER BY created_at DESC
        LIMIT 50
      `);
      const messages = stmt.all().reverse();
      socket.send(JSON.stringify({ type: "history", messages }));
    } catch (err) {
      console.error("Failed to load message history:", err);
    }

    // Handle incoming messages
    socket.on("message", (msg: Buffer) => {
      try {
        const data = JSON.parse(msg.toString("utf8"));

        if (data.type === "send_message") {
          const content = data.content?.trim();
          if (!content) return;

          // Save to database
          const stmt = db.prepare(`
            INSERT INTO messages (user_id, username, content, created_at)
            VALUES (?, ?, ?, ?)
          `);
          const result = stmt.run(userId, username, content, Date.now());

          const message: ChatMessage = {
            id: result.lastInsertRowid as number,
            userId,
            username,
            content,
            timestamp: Date.now(),
          };

          // Broadcast to all connected users
          userSockets.forEach((sockets) => {
            sockets.forEach((ws) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: "message", message }));
              }
            });
          });
        }
      } catch (err) {
        console.error("Chat message error:", err);
        socket.send(JSON.stringify({ type: "error", message: "Failed to process message" }));
      }
    });

    // Handle disconnect
    socket.on("close", () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
      console.log(`Chat: User ${username} disconnected`);
    });

    socket.on("error", (error) => {
      console.error(`Chat WebSocket error for user ${username}:`, error);
    });
  });

  // Health check
  server.get("/health", async () => ({ status: "ok", service: "chat" }));

  // Start server
  server.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`Chat service running on http://localhost:${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  });
  ```

### 1.4 Docker Setup

- [ ] **Create `/back/chat-service/Dockerfile`**
  ```dockerfile
  FROM node:20-alpine AS base
  WORKDIR /app
  COPY package*.json ./

  FROM base AS prod
  WORKDIR /app
  COPY package*.json ./
  RUN npm install || npm install --legacy-peer-deps
  COPY . .
  RUN npm run build
  CMD ["npm", "start"]
  ```

### 1.5 Install Dependencies

- [ ] **Run npm install**
  ```bash
  cd /home/smanriqu/projects/ft_transcendence/back/chat-service
  npm install
  ```

---

## Step 2: Update Gateway to Proxy Chat Service

### 2.1 Add Chat Proxy to Gateway

- [ ] **Update `/back/gateway/.env`**
  ```env
  CHAT_URL=http://chat:3005
  ```

- [ ] **Update `/back/gateway/src/index.ts`**
  
  Add environment variable (near the top with other URLs):
  ```typescript
  const CHAT_URL = process.env.CHAT_URL ?? "http://localhost:3005";
  ```

  Add WebSocket proxy for chat (after game WebSocket registration):
  ```typescript
  // After: await registerGameWebSocket(server);
  
  // Proxy chat WebSocket (simple pass-through)
  server.register(async (fastify) => {
    fastify.register(websocketPlugin);
    
    fastify.get("/ws/chat", { websocket: true }, async (socket, request) => {
      const token = (request.query as any).token;
      const chatWsUrl = `${CHAT_URL.replace('http', 'ws')}/ws?token=${token}`;
      
      const chatSocket = new WebSocket(chatWsUrl);
      
      chatSocket.on("open", () => {
        socket.on("message", (msg) => {
          if (chatSocket.readyState === WebSocket.OPEN) {
            chatSocket.send(msg);
          }
        });
        
        chatSocket.on("message", (msg) => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(msg);
          }
        });
      });
      
      socket.on("close", () => chatSocket.close());
      chatSocket.on("close", () => socket.close());
    });
  });
  ```

  Add REST API proxy (with other proxy registrations):
  ```typescript
  await server.register(proxy, {
    upstream: CHAT_URL,
    prefix: "/chat",
    rewritePrefix: "/chat",
    http2: false,
  });
  ```

### 2.2 Update Docker Compose

- [ ] **Update `/infrastructure/docker-compose.yml`**
  
  Add chat service (after match service):
  ```yaml
  chat:
    build:
      context: ../back/chat-service
      dockerfile: Dockerfile
      target: prod
    container_name: chat
    ports:
      - "3005:3005"
    volumes:
      - ../back/chat-service/data/:/app/data
    env_file:
      - ../back/chat-service/.env
  ```

  Update gateway dependencies:
  ```yaml
  gateway:
    # ... existing config
    depends_on:
      - auth
      - user
      - chat  # Add this
  ```

---

## Step 3: Create Frontend Chat UI
- [ ] **Create `/back/gateway/src/chatSockets.ts`**
  ```typescript
  // Simple in-memory chat - no rooms, just global chat
  import { FastifyInstance } from "fastify";
  import websocketPlugin from "@fastify/websocket";
  import { WebSocket } from "ws";

  interface ChatMessage {
    id: number;
    userId: number;
    username: string;
    content: string;
    timestamp: number;
  }

  const messages: ChatMessage[] = []; // In-memory storage
  const userSockets = new Map<number, Set<WebSocket>>();
  let messageIdCounter = 1;

  export async function registerChatWebSocket(server: FastifyInstance) {
    server.get("/ws/chat", { websocket: true }, (socket, req) => {
      // Validate token (same pattern as management_sockets.ts)
      const token = (req.query as any).token;
      if (!token) {
        socket.send(JSON.stringify({ type: "error", message: "Unauthorized" }));
        socket.close();
        return;
      }

      let userId: number;
      let username: string;
      try {
        const payload = server.jwt.verify<{ sub: number; username: string }>(token);
        userId = payload.sub;
        username = payload.username;
      } catch (err) {
        socket.send(JSON.stringify({ type: "error", message: "Invalid token" }));
        socket.close();
        return;
      }

      // Register socket
      if (!userSockets.has(userId)) userSockets.set(userId, new Set());
      userSockets.get(userId)!.add(socket);
      console.log(`Chat: User ${username} (${userId}) connected`);

      // Send recent messages (last 50)
      const recentMessages = messages.slice(-50);
      socket.send(JSON.stringify({ type: "history", messages: recentMessages }));

      // Handle incoming messages
      socket.on("message", (msg: Buffer) => {
        try {
          const data = JSON.parse(msg.toString('utf8'));
          
          if (data.type === "send_message") {
            const message: ChatMessage = {
              id: messageIdCounter++,
              userId,
              username,
              content: data.content,
              timestamp: Date.now()
            };
            messages.push(message);

            // Broadcast to all connected users
            userSockets.forEach((sockets) => {
              sockets.forEach((ws) => {
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(JSON.stringify({ type: "message", message }));
                }
              });
            });
          }
        } catch (err) {
          console.error("Chat message parse error:", err);
        }
      });

      socket.on("close", () => {
        const sockets = userSockets.get(userId);
        if (sockets) {
          sockets.delete(socket);
          if (sockets.size === 0) userSockets.delete(userId);
        }
        console.log(`Chat: User ${username} disconnected`);
      });
    });

    console.log("Chat WebSocket registered at /ws/chat");
  }
  ```

- [ ] **Update `/back/gateway/src/index.ts`**
  - Import: `import { registerChatWebSocket } from "./chatSockets";`
  - Register after other WebSockets:
    ```typescript
    await registerGatewayWebSocket(server);
    await registerGameWebSocket(server);
    await registerChatWebSocket(server); // Add this line
    ```

- [ ] **Restart gateway container**
  ```bash
  cd infrastructure
  docker compose restart gateway
  docker compose logs -f gateway  # Verify "Chat WebSocket registered"
  ```

## Step 3: Create Frontend Chat UI

### 3.1 Chat WebSocket Client

- [ ] **Create `/front/src/chat/chatSocket.ts`**
  ```typescript
  // WebSocket manager for chat
  export interface ChatMessage {
    id: number;
    userId: number;
    username: string;
    content: string;
    timestamp: number;
  }

  type MessageCallback = (msg: ChatMessage) => void;
  type HistoryCallback = (messages: ChatMessage[]) => void;

  export class ChatSocket {
    private ws: WebSocket | null = null;
    private messageCallbacks: MessageCallback[] = [];
    private historyCallbacks: HistoryCallback[] = [];
    private token: string;

    constructor(token: string) {
      this.token = token;
    }

    connect() {
      const wsUrl = `ws://localhost:3000/ws/chat?token=${this.token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("Chat connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "message") {
            this.messageCallbacks.forEach(cb => cb(data.message));
          } else if (data.type === "history") {
            this.historyCallbacks.forEach(cb => cb(data.messages));
          } else if (data.type === "error") {
            console.error("Chat error:", data.message);
          }
        } catch (err) {
          console.error("Failed to parse chat message:", err);
        }
      };

      this.ws.onerror = (err) => {
        console.error("Chat WebSocket error:", err);
      };

      this.ws.onclose = () => {
        console.log("Chat disconnected");
        // Reconnect after 3 seconds
        setTimeout(() => this.connect(), 3000);
      };
    }

    sendMessage(content: string) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "send_message", content }));
      }
    }

    onMessage(callback: MessageCallback) {
      this.messageCallbacks.push(callback);
    }

    onHistory(callback: HistoryCallback) {
      this.historyCallbacks.push(callback);
    }

    disconnect() {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    }
  }
  ```

### 3.2 Chat UI Component

- [ ] **Create `/front/src/chat/chatUI.ts`**
  ```typescript
  import { ChatSocket, ChatMessage } from "./chatSocket";

  export function renderChatUI(container: HTMLElement, token: string, currentUserId: number) {
    container.innerHTML = `
      <div class="flex flex-col h-screen bg-gray-100">
        <!-- Header -->
        <div class="bg-blue-600 text-white p-4 shadow-md">
          <h1 class="text-2xl font-bold">Live Chat</h1>
        </div>

        <!-- Messages Container -->
        <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-2">
          <!-- Messages will be inserted here -->
        </div>

        <!-- Input Area -->
        <div class="bg-white border-t p-4">
          <div class="flex gap-2">
            <input 
              type="text" 
              id="chat-input" 
              placeholder="Type a message..." 
              class="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              id="chat-send" 
              class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    `;

    const messagesContainer = container.querySelector("#chat-messages") as HTMLElement;
    const input = container.querySelector("#chat-input") as HTMLInputElement;
    const sendBtn = container.querySelector("#chat-send") as HTMLButtonElement;

    const chatSocket = new ChatSocket(token);

    // Display message in UI
    function displayMessage(msg: ChatMessage) {
      const isOwnMessage = msg.userId === currentUserId;
      const messageEl = document.createElement("div");
      messageEl.className = `flex ${isOwnMessage ? "justify-end" : "justify-start"}`;
      
      const time = new Date(msg.timestamp).toLocaleTimeString();
      
      messageEl.innerHTML = `
        <div class="max-w-xs lg:max-w-md">
          <div class="${isOwnMessage ? "bg-blue-500 text-white" : "bg-white"} rounded-lg p-3 shadow">
            <div class="font-semibold text-sm mb-1">${msg.username}</div>
            <div class="text-sm">${escapeHtml(msg.content)}</div>
            <div class="text-xs opacity-70 mt-1">${time}</div>
          </div>
        </div>
      `;
      
      messagesContainer.appendChild(messageEl);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Load history
    chatSocket.onHistory((messages) => {
      messages.forEach(msg => displayMessage(msg));
    });

    // New messages
    chatSocket.onMessage((msg) => {
      displayMessage(msg);
    });

    // Send message
    function sendMessage() {
      const content = input.value.trim();
      if (content) {
        chatSocket.sendMessage(content);
        input.value = "";
      }
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    chatSocket.connect();

    // Cleanup on navigation away
    return () => {
      chatSocket.disconnect();
    };
  }

  function escapeHtml(text: string): string {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
  ```

### 3.3 Integration into Main App

- [ ] **Add chat route to `/front/src/main.ts`** (or wherever routing is handled)
  ```typescript
  // Example integration - adjust based on your routing setup
  import { renderChatUI } from "./chat/chatUI";

  // After login, when you have token and userId:
  if (currentPage === "chat") {
    const token = localStorage.getItem("accessToken");
    const userId = parseInt(localStorage.getItem("userId") || "0");
    renderChatUI(appContainer, token!, userId);
  }
  ```

---

## Step 4: Build and Test

### 4.1 Build Chat Service

- [ ] **Build and start all services**
  ```bash
  cd /home/smanriqu/projects/ft_transcendence/infrastructure
  docker compose down
  docker compose up --build
  ```

- [ ] **Verify chat service is running**
  ```bash
  docker compose logs chat
  # Should see: "Chat service running on http://localhost:3005"
  ```

- [ ] **Test health endpoint**
  ```bash
  curl http://localhost:3005/health
  # Should return: {"status":"ok","service":"chat"}
  ```

### 4.2 Test Frontend

- [ ] **Open chat in browser**
  - Navigate to chat page
  - Verify connection in browser console: "Chat connected"
  - Check chat service logs for connection message

- [ ] **Test real-time messaging**
  - Open two browser tabs/windows
  - Login as different users in each
  - Send messages from one tab
  - Verify they appear in both tabs instantly

- [ ] **Test message persistence**
  - Send several messages
  - Restart chat service: `docker compose restart chat`
  - Reload browser
  - Verify message history loads

---

## ✅ Phase 0 Complete!

After completing these steps, you will have:
- ✅ **Standalone chat microservice** with WebSocket + REST + SQLite
- ✅ **Real-time messaging** between multiple users
- ✅ **Persistent message history** across restarts
- ✅ **Clean architecture** (gateway only proxies, chat owns all logic)
- ✅ **Production-ready base** for adding rooms, DMs, and features later

**Next Steps**: Once this is working, you can add features from sections 2-7:
- Add rooms/channels
- Add direct messages
- Add member management
- Add typing indicators
- Add read receipts
- And more!

---

## 1. Current Architecture Overview

### 1.1 Understand Existing Microservices Structure
- [ ] **Review Backend Services** (`/back/`)
  - **auth-service** (port 3001): User authentication, JWT tokens, 2FA
  - **user-service** (port 3002): User profiles, email management
  - **game-engine** (port 3003): Game logic and WebSocket connections
  - **match-service** (port 3004): Match creation and management
  - **gateway** (port 3000): API Gateway with JWT validation, proxy, and WebSocket routing

### 1.2 Key Architecture Patterns Identified
- [ ] **Technology Stack**
  - Framework: Fastify (Node.js)
  - Language: TypeScript
  - Database: SQLite (per-service databases in `/data/`)
  - Authentication: JWT (access tokens + refresh tokens)
  - Real-time: WebSockets via `@fastify/websocket`
  - Containerization: Docker + Docker Compose

- [ ] **Gateway Pattern** (`/back/gateway/src/index.ts`)
  - Acts as single entry point for all services
  - JWT validation via `onRequest` hook for protected routes
  - Adds custom headers: `x-user-id`, `x-username`, `x-gateway-secret`
  - Proxies requests to microservices using `@fastify/http-proxy`
  - WebSocket connections authenticated via query parameter `?token=<jwt>`
  
- [ ] **Authentication Flow** (`/back/auth-service/`)
  - Registration creates user in both auth-service AND user-service (using system token)
  - Login returns `accessToken` (15min) and `refreshToken`
  - 2FA support with QR code generation
  - Gateway validates JWT and injects user context into headers

- [ ] **Database Pattern**
  - Each service has its own SQLite database in `./data/database.sqlite`
  - Database initialization in `src/db/database.ts`
  - Services are loosely coupled (communicate via HTTP/REST)

- [ ] **Docker Setup** (`/infrastructure/docker-compose.yml`)
  - Each service has its own Dockerfile with multi-stage builds (base, dev, prod)
  - Services connected via Docker network
  - Environment variables stored in `.env` files per service
  - Volume mounts for persistent data (`./data/`)

### 1.3 WebSocket Implementation Pattern
- [ ] **Review WebSocket Setup** (`/back/gateway/src/management_sockets.ts`)
  - WebSocket registered at `/ws` endpoint on gateway
  - Token validation: `?token=<jwt>` in connection URL
  - User tracking: `Map<userId, Set<WebSocket>>` for multiple connections per user
  - Message types: JSON with `{ type: "...", ...data }`
  - Broadcasting pattern: iterate user sockets and send to open connections
  - Connection lifecycle: `on('message')`, `on('close')`, `on('error')`

---

## 2. Backend: Chat Microservice

### 2.1 Project Setup
- [ ] **Create service directory structure**
  ```
  back/chat-service/
  ├── Dockerfile
  ├── package.json
  ├── tsconfig.json
  ├── .env.example
  ├── data/                    # SQLite database (gitignored)
  ├── src/
  │   ├── index.ts            # Main entry point
  │   ├── db/
  │   │   └── database.ts     # SQLite setup & migrations
  │   ├── plugins/
  │   │   └── authPlugin.ts   # Gateway secret validation
  │   ├── routes/
  │   │   └── chat.ts         # REST endpoints
  │   ├── services/
  │   │   └── chatService.ts  # Business logic
  │   └── websocket/
  │       └── chatSocket.ts   # WebSocket handler
  ```

- [ ] **Initialize package.json**
  - Dependencies: `fastify`, `@fastify/cors`, `@fastify/websocket`, `@fastify/jwt`, `better-sqlite3`, `dotenv`
  - DevDependencies: `typescript`, `@types/node`, `@types/better-sqlite3`, `ts-node`
  - Scripts: `build`, `start`, `dev`

- [ ] **Create tsconfig.json** (copy from existing services)

- [ ] **Create Dockerfile** (follow pattern from auth-service/game-engine)
  - Multi-stage build: base → prod
  - Copy pattern: package.json → install → copy src → build

### 2.2 Database Schema Design
- [ ] **Design Chat Tables** (`src/db/database.ts`)
  ```sql
  -- Rooms (DMs, group chats, or channels)
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,                          -- null for DMs, named for groups
    type TEXT NOT NULL,                 -- 'DM', 'GROUP', 'CHANNEL'
    created_at INTEGER NOT NULL,
    created_by INTEGER NOT NULL         -- user_id from auth
  );

  -- Room Members
  CREATE TABLE IF NOT EXISTS room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at INTEGER NOT NULL,
    role TEXT DEFAULT 'member',         -- 'admin', 'member', 'owner'
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    UNIQUE(room_id, user_id)
  );

  -- Messages
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,             -- denormalized for performance
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  -- Indexes for performance
  CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_room_members_user ON room_members(user_id);
  ```

- [ ] **Implement database initialization function** (pattern: `initDB()`)

### 2.3 Authentication Plugin
- [ ] **Create authPlugin.ts** (copy from user-service pattern)
  - Validate `x-gateway-secret` header matches `GATEWAY_SECRET` env var
  - Extract `x-user-id` and `x-username` from headers
  - Decorate request with `request.userId` and `request.username`

### 2.4 Chat Service Logic
- [ ] **Implement ChatService class** (`src/services/chatService.ts`)
  - `createRoom(creatorId, type, name?, memberIds?)`
  - `getRoomsByUser(userId)` - return all rooms user is member of
  - `getRoomMessages(roomId, userId, limit, offset)` - with auth check
  - `sendMessage(roomId, userId, username, content)` - with auth check
  - `addMemberToRoom(roomId, userId, addedBy)` - with permission check
  - `removeMemberFromRoom(roomId, userId, removedBy)` - with permission check
  - `getUsersInRoom(roomId)` - return user IDs for broadcasting

### 2.5 REST API Routes
- [ ] **Implement REST endpoints** (`src/routes/chat.ts`)
  - `POST /chat/rooms` - Create new room (DM or group)
  - `GET /chat/rooms` - List user's rooms
  - `GET /chat/rooms/:id/messages?limit=50&offset=0` - Get message history
  - `POST /chat/rooms/:id/members` - Add member to room
  - `DELETE /chat/rooms/:id/members/:userId` - Remove member
  - `GET /chat/rooms/:id/members` - List room members

### 2.6 WebSocket Chat Handler
- [ ] **Implement WebSocket endpoint** (`src/websocket/chatSocket.ts`)
  - Endpoint: `/ws/chat?token=<jwt>` (will be proxied via gateway)
  - Track connections: `Map<userId, Set<WebSocket>>`
  - Track user-to-rooms: `Map<userId, Set<roomId>>` for efficient broadcasting

- [ ] **Message Types**
  ```typescript
  // Client → Server
  { type: "join_room", roomId: number }
  { type: "leave_room", roomId: number }
  { type: "send_message", roomId: number, content: string }
  { type: "typing", roomId: number, isTyping: boolean }

  // Server → Client
  { type: "message", roomId: number, message: { id, userId, username, content, created_at } }
  { type: "user_joined", roomId: number, userId: number, username: string }
  { type: "user_left", roomId: number, userId: number }
  { type: "typing", roomId: number, userId: number, username: string, isTyping: boolean }
  { type: "error", message: string }
  ```

- [ ] **Implement Broadcasting Logic**
  - When message received: save to DB, then broadcast to all room members
  - Handle user disconnect: remove from all active room subscriptions
  - Handle reconnection: re-subscribe to rooms on join_room messages

### 2.7 Environment Configuration
- [ ] **Create .env file**
  ```
  PORT=3005
  JWT_SECRET=<same-as-gateway>
  GATEWAY_SECRET=<same-as-gateway>
  DATABASE_PATH=./data/database.sqlite
  ```

---

## 3. Frontend: Chat UI Component

### 3.1 Architecture Analysis
- [ ] **Review frontend structure** (`/front/`)
  - Tech: TypeScript, Vite bundler
  - Styling: Tailwind CSS
  - WebSocket pattern: See `src/match_service/lobbySocket.ts` and `gameSocket.ts`
  - API calls: See `src/api.ts`

### 3.2 Create Chat UI Files
- [ ] **File structure**
  ```
  front/src/chat/
  ├── chatSocket.ts          # WebSocket connection manager
  ├── chatApi.ts             # REST API calls
  ├── chatUI.ts              # Main chat interface rendering
  ├── roomList.ts            # Sidebar with room list
  ├── messageList.ts         # Message history display
  └── messageInput.ts        # Input box with send button
  ```

### 3.3 Chat WebSocket Client
- [ ] **Implement chatSocket.ts** (pattern from `lobbySocket.ts`)
  - Connect to `ws://localhost:3000/ws/chat?token=<jwt>`
  - Handle reconnection logic
  - Message queue for offline messages
  - Event emitter pattern for UI updates

- [ ] **WebSocket Events**
  ```typescript
  - onMessage(callback: (msg: ChatMessage) => void)
  - onUserJoined(callback: (roomId, userId, username) => void)
  - onUserLeft(callback: (roomId, userId) => void)
  - onTyping(callback: (roomId, userId, username, isTyping) => void)
  - onError(callback: (error: string) => void)
  ```

### 3.4 Chat REST API Client
- [ ] **Implement chatApi.ts** (pattern from `api.ts`)
  ```typescript
  - getRooms(): Promise<Room[]>
  - createRoom(type, name?, memberIds?): Promise<Room>
  - getRoomMessages(roomId, limit, offset): Promise<Message[]>
  - addMemberToRoom(roomId, userId): Promise<void>
  - removeMemberFromRoom(roomId, userId): Promise<void>
  - getRoomMembers(roomId): Promise<User[]>
  ```

### 3.5 UI Components
- [ ] **Room List Component** (`roomList.ts`)
  - Display all user rooms in sidebar
  - Show unread count per room (if implemented)
  - Highlight active room
  - "New Chat" button to create DM or group

- [ ] **Message List Component** (`messageList.ts`)
  - Display messages in chronological order
  - Auto-scroll to bottom on new message
  - Load more messages on scroll up (pagination)
  - Show sender name and timestamp
  - Different styling for own messages vs others

- [ ] **Message Input Component** (`messageInput.ts`)
  - Text input with "Send" button
  - Send on Enter key (Shift+Enter for newline)
  - "Typing..." indicator (debounced)
  - Character limit validation

- [ ] **Main Chat UI** (`chatUI.ts`)
  - Layout: Sidebar (room list) + Main (messages + input)
  - Responsive design with Tailwind
  - Handle room selection
  - Integrate all sub-components

### 3.6 Integration into Main App
- [ ] **Add chat page to navigation** (`src/main.ts` or router)
- [ ] **Add "Chat" link in UI**
- [ ] **Ensure token is passed from login flow**

---

## 4. Gateway Integration

### 4.1 Register Chat Service in Gateway
- [ ] **Update `/back/gateway/src/index.ts`**
  - Add environment variable: `CHAT_URL = process.env.CHAT_URL ?? "http://localhost:3005"`
  - Register HTTP proxy for REST endpoints:
    ```typescript
    await server.register(proxy, {
      upstream: CHAT_URL,
      prefix: "/chat",
      rewritePrefix: "/chat",
      http2: false,
    });
    ```
  - Add `/chat` to `PROTECTED_PREFIXES` array for JWT validation

### 4.2 Register Chat WebSocket in Gateway
- [ ] **Update `/back/gateway/src/index.ts`** (or create new file)
  - Option 1: Proxy WebSocket to chat-service (if chat-service handles auth)
  - Option 2: Handle WebSocket in gateway and forward events to chat-service via HTTP/REST
  - **Recommended**: Handle in gateway for consistency with existing pattern

- [ ] **Create `/back/gateway/src/chatSockets.ts`** (pattern from `management_sockets.ts`)
  - Register WebSocket at `/ws/chat`
  - Validate token on connection
  - Forward messages to chat-service REST API
  - Broadcast responses to connected clients in same room
  - Track: `Map<roomId, Set<userId>>` and `Map<userId, Set<WebSocket>>`

- [ ] **Import and register in gateway index**
  ```typescript
  import { registerChatWebSocket } from "./chatSockets";
  await registerChatWebSocket(server);
  ```

### 4.3 Update Gateway Environment
- [ ] **Add to `/back/gateway/.env`**
  ```
  CHAT_URL=http://chat:3005
  ```

---

## 5. Authentication & Authorization

### 5.1 Understand Current Auth Flow
- [ ] **Review JWT structure**
  - Payload: `{ sub: userId, username: string, iat, exp }`
  - Signed with `JWT_SECRET` (shared across services)
  - Access token: 15min expiry
  - Refresh token: stored in DB with longer expiry

- [ ] **Review Gateway Auth Hook** (`/back/gateway/src/index.ts`)
  - Protected routes require `Authorization: Bearer <token>` header
  - Gateway validates JWT via `request.jwtVerify()`
  - Injects headers: `x-user-id`, `x-username`, `x-gateway-secret`
  - Chat service receives these headers and trusts them

### 5.2 Implement Chat Authorization
- [ ] **Room Access Control** (in ChatService)
  - Check if user is member of room before:
    - Fetching messages
    - Sending messages
    - Adding/removing members
  - Return 403 Forbidden if not authorized

- [ ] **WebSocket Authorization**
  - Validate token on initial connection (done by gateway)
  - Validate room membership on `join_room` message
  - Send error message if user tries to join unauthorized room

### 5.3 User Identity Resolution
- [ ] **Design Decision**: How to get username for chat messages?
  - Option 1: Store in JWT payload (current pattern) → **Recommended**
  - Option 2: Call user-service API on each message (slow)
  - Option 3: Cache user info in chat-service (stale data risk)

- [ ] **Implement chosen pattern**
  - If Option 1: Ensure `username` is in JWT payload (already done)
  - Extract from `x-username` header in REST endpoints
  - Extract from JWT in WebSocket handler

### 5.4 Cross-Service Communication
- [ ] **Understand service-to-service auth** (from auth-service registration flow)
  - Services can generate "system tokens" with `{ service: "serviceName", sub: id }`
  - Use short expiry (1min) for one-time operations
  - Include in `Authorization: Bearer <systemToken>` header

- [ ] **Optional**: If chat needs to query user-service
  - Generate system token in chat-service
  - Call user-service via gateway: `GET ${GATEWAY_URL}/users/:id`

---

## 6. Testing & Validation

### 6.1 Backend Testing
- [ ] **Manual Testing with curl/Postman**
  - Test all REST endpoints with valid JWT
  - Test authorization: try accessing other users' rooms (should fail)
  - Test WebSocket: connect with valid/invalid token
  - Test message broadcasting: open multiple WebSocket connections

- [ ] **Test Scenarios**
  - Create DM room between two users
  - Send messages and verify both users receive
  - Create group room with 3+ users
  - Add/remove members from group
  - Test message history pagination
  - Test typing indicators
  - Test user disconnect/reconnect

### 6.2 Frontend Testing
- [ ] **UI Testing**
  - Open chat in two browser tabs (different users)
  - Send messages and verify real-time updates
  - Test room creation flow
  - Test message scrolling and pagination
  - Test responsive design on mobile viewport

### 6.3 Integration Testing
- [ ] **End-to-End Flow**
  - Register new user → login → open chat → create room → send message
  - Verify message appears in database
  - Verify message appears in other user's UI
  - Test logout → login → verify message history persists

### 6.4 Error Handling
- [ ] **Test Error Cases**
  - Expired JWT token
  - WebSocket disconnect during message send
  - Invalid room ID
  - Unauthorized room access
  - Duplicate room creation
  - Network interruption and reconnection

---

## 7. Deployment & Documentation

### 7.1 Docker Integration
- [ ] **Update `/infrastructure/docker-compose.yml`**
  ```yaml
  chat:
    build:
      context: ../back/chat-service
      dockerfile: Dockerfile
      target: prod
    container_name: chat
    ports:
      - "3005:3005"
    volumes:
      - ../back/chat-service/data/:/app/data
    env_file:
      - ../back/chat-service/.env
    depends_on:
      - auth
      - user
  ```

- [ ] **Update gateway service**
  ```yaml
  gateway:
    depends_on:
      - auth
      - user
      - chat  # Add chat dependency
  ```

### 7.2 Environment Setup
- [ ] **Create `.env` files**
  - `/back/chat-service/.env`
  - Update `/back/gateway/.env` with `CHAT_URL`

- [ ] **Create `.env.example` files** (gitignored secrets removed)

### 7.3 Documentation
- [ ] **Update main README.md**
  - Add chat-service to architecture diagram
  - Document chat API endpoints
  - Add usage instructions

- [ ] **Create `/back/chat-service/README.md`**
  - Service description
  - API documentation (REST + WebSocket)
  - Database schema
  - Environment variables
  - Development setup instructions

### 7.4 Code Cleanup
- [ ] **Remove console.logs** (replace with proper logging)
- [ ] **Add TypeScript types** for all functions
- [ ] **Add error handling** for all async operations
- [ ] **Add input validation** for all endpoints

### 7.5 Build & Deploy
- [ ] **Test Docker build**
  ```bash
  cd infrastructure
  docker compose build chat
  ```

- [ ] **Test full stack startup**
  ```bash
  docker compose down
  docker compose up --build
  ```

- [ ] **Verify all services healthy**
  - Check logs for errors
  - Test health endpoints
  - Test chat functionality

---

## 🎯 Success Criteria

- [ ] ✅ Users can create DM and group chat rooms
- [ ] ✅ Users can send and receive messages in real-time
- [ ] ✅ Message history is persistent and paginated
- [ ] ✅ Only room members can see messages (authorization works)
- [ ] ✅ WebSocket reconnection works seamlessly
- [ ] ✅ UI is responsive and user-friendly
- [ ] ✅ All services start successfully with `docker compose up`
- [ ] ✅ Code is documented and follows project patterns

---

## 📝 Notes & Decisions

### Design Decisions Made:
1. **Service Port**: 3005 (follows sequential pattern)
2. **Database**: SQLite (consistent with other services)
3. **WebSocket Handling**: Gateway handles WS, forwards to chat-service REST API
4. **Authentication**: JWT validation in gateway, trusted headers pattern
5. **Room Types**: DM (1-on-1), GROUP (multiple users), CHANNEL (public/broadcast)

### Questions to Resolve:
- [ ] Should chat support file/image uploads? (Future enhancement)
- [ ] Should chat support message editing/deletion? (Future enhancement)
- [ ] Should chat support read receipts? (Future enhancement)
- [ ] Should chat support emoji reactions? (Future enhancement)
- [ ] Should chat support search functionality? (Future enhancement)

### Resources:
- Fastify Docs: https://www.fastify.io/
- Fastify WebSocket: https://github.com/fastify/fastify-websocket
- Better SQLite3: https://github.com/WiseLibs/better-sqlite3
- JWT: https://jwt.io/

---

**Last Updated**: November 23, 2025  
**Current Phase**: Phase 0 - Minimal Standalone Chat Service  
**Next Steps**: 
1. ✅ Directory `/back/chat-service` created
2. Start with Step 1.1 - Setup project files (package.json, tsconfig, .env)
3. Step 1.2 - Create database setup
4. Step 1.3 - Create main service (WebSocket + REST in one file!)
5. Step 2 - Update gateway to proxy chat service
6. Step 3 - Create frontend UI
7. Step 4 - Build and test!

**Status**: 
- ✅ Directory `/back/chat-service` created
- ⏳ **TODAY**: Build standalone minimal chat service (WebSocket + REST + SQLite)
- ⏳ Gateway proxies chat (no chat logic in gateway)
- ⏳ Frontend chat UI
- 📚 Full implementation (sections 2-7): Reference for future enhancements

---

## 📋 Development Commands Reference

| Command | When | What It Does |
|---------|------|-------------|
| `npm install` | Once, after creating package.json | Downloads all dependencies to `node_modules/` |
| `npm run build` | After changing TypeScript code | Compiles `.ts` → `.js` into `dist/` |
| `npm run dev` | During development | Runs code with auto-reload (needs Node 14+) |
| `npm start` | In production | Runs compiled JavaScript: `node dist/index.js` |
| `docker build -t chat-service .` | After code changes | Builds a Docker image with compiled code |
| `docker run -p 3005:3005 chat-service` | To test the service | Runs the service in a container |
| `docker run -p 3005:3005 --env-file .env chat-service` | To test with environment variables | Runs with .env file loaded |
| `docker run -p 3005:3005 -v $(pwd)/data:/app/data chat-service` | To test with persistent database | Mounts local data directory (survives restarts) |



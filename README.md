*This project has been created as part of the 42 curriculum by alvutina, auspensk, hzimmerm, meroshen, smanriqu.*

# 🏓 ft_transcendence

![Project Status](https://img.shields.io/badge/status-complete-success)
![Architecture](https://img.shields.io/badge/architecture-microservices-blueviolet)
![Docker](https://img.shields.io/badge/containerization-docker-2496ED)

**A real-time multiplayer Pong game built with microservices.**

---

## Description

**ft_transcendence** is our final project at 42. We wanted to do more than just build a game; we wanted to build it the right way, using modern tools. Instead of a single, large application, we built it as a set of small, independent microservices that talk to each other. This includes everything from user login to the game's physics. Our goal was to create a smooth, real-time multiplayer game that's also secure, fast, and easy to monitor.

## 🏗️ Architecture & Microservices

The system is orchestrated via **Docker Compose**, connecting the following specialized services:

### 🛡️ API Gateway
The main entry point for the app. It receives requests from the frontend and sends them to the correct service.
- **Routing:** Sends traffic to Auth, User, Matchmaking, and Game services.
- **Security:** Checks if you are logged in (validates JWTs) and adds internal security headers.
- **Lobby:** Manages the queue of players waiting to play.
- **Game Proxy:** Connects players directly to the Game Engine using WebSockets.


### 🔐 Auth Service
The security backbone.
- Implements secure **Local Authentication** with password hashing (Bcrypt).
- Issues and validates **JWTs** (JSON Web Tokens) for stateless session management.
- Manages **Two-Factor Authentication (2FA)** using TOTP and QR codes.

### 👤 User Service
The social core.
- **Tech:** Built with **Fastify** and **SQLite**.
- **Internal Security:** Validates requests using the `x-gateway-secret` to prevent unauthorized direct access.
- Manages user profiles.

### ⚔️ Matchmaking Service
The tournament organizer.
- **Lifecycle Management:** Orchestrates the entire flow of matches and tournaments, from creation to final results.
- **State Persistence:** Stores detailed history of matches, rounds, and player performance.
- **Event Driven:** Reacts to game results to automatically generate next-round pairings or declare tournament winners, communicating updates back to the Gateway.

### 🎮 Gengine (Game Engine)
The physics server.
- **Fair Play:** Calculates all ball movements and collisions on the server to prevent cheating.
- **Modes:** Supports both online multiplayer and local play on the same keyboard.

### 💬 Chat Service
**The Social Hub.**
- **Advanced Messaging:** Features typing indicators, read receipts, and message history persistence.
- **Game Integration:** Send direct game invites and receive tournament notifications directly within the chat.
- **User Control:** Includes blocking capabilities and direct access to user profiles from the chat interface.

### 📊 Observability Stack
Tools we use to monitor the app.
- **ELK Stack:** Collects logs from all services so we can search through them easily.
- **Prometheus:** Collects metrics like CPU usage and request counts.
- **Grafana:** Shows graphs and dashboards based on the data from Prometheus.

---

## 🗄️ Database Schemas

Here are the SQLite schemas for our microservices. Click to expand.

<details>
<summary><b>🔐 Auth Service</b></summary>

Manages user credentials and session tokens.
- **users**: Stores authentication data and 2FA settings.
- **refresh_tokens**: Linked to users (One-to-Many) for secure session management.

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    two_factor_secret TEXT,
    two_factor_enabled BOOLEAN DEFAULT 0,
    two_factor_set BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```
</details>

<details>
<summary><b>👤 User Service</b></summary>

Stores public user profiles and game statistics.
- **users**: Maps authentication IDs to public profiles.

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth_user_id INTEGER NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    games_played INTEGER NOT NULL DEFAULT 0,
    games_won INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```
</details>

<details>
<summary><b>💬 Chat Service</b></summary>

Handles real-time messaging and social interactions.
- **conversations** & **participants**: Manage chat rooms and their members (Many-to-Many).
- **messages**: Stores message content and metadata.
- **notifications**: Asynchronous user alerts.
- **blocks**: User blocking relationships.

```sql
CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_participants (
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    metadata TEXT,
    created_at TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    read_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    payload TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blocker_id INTEGER NOT NULL,
    blocked_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id)
);
```
</details>

<details>
<summary><b>🤝 Interact Service</b></summary>

Manages the social graph and extended profiles.
- **friends**: Tracks friendships between users.
- **profiles**: Stores bios, avatars, and online status.

```sql
CREATE TABLE IF NOT EXISTS friends (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    friend_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    bio TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'online',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```
</details>

<details>
<summary><b>⚔️ Match Service</b></summary>

Orchestrates tournaments and match history.
- **matches**: Top-level tournament or match entities.
- **players**: Participants linked to matches.
- **games**: Individual game sessions and results within a match.

```sql
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    status TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    round INTEGER,
    owner TEXT
);

CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    alias TEXT NOT NULL,
    match_id INTEGER NOT NULL,
    status TEXT,
    FOREIGN KEY(match_id) REFERENCES matches(id)
);

CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    left_player_id INTEGER,
    left_player_alias TEXT NOT NULL,
    right_player_id INTEGER,
    right_player_alias TEXT NOT NULL,
    match_id INTEGER NOT NULL,
    round INTEGER NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    winner TEXT,
    loser TEXT,
    owner TEXT,
    FOREIGN KEY(match_id) REFERENCES matches(id)
);
```
</details>

---

## Instructions


### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MariaErosh/ft_transcendence
   cd ft_transcendence
   ```

2. **Configure Environment:**
   Create the `.env` file from the example and copy it to each microservice directory.
   ```bash
   cp .env.example .env
   # Copy .env to back/gateway, back/auth-service, back/user-service, back/match-service, back/game-engine, back/chat-service, infrastructure
   # Fill in your credentials in .env
   ```

3. **Execution:**
   ```bash
   cd infrastructure
   docker-compose up --build
   ```

The application will be available at `https://localhost` on the host machine
and on any other machine in the same network at `https://< ipaddress_of_hostmachine >`

---

## 👥 The Team

This project was brought to life by a team of 5 dedicated developers.

| GitHub      | 42 Intra |
| :---        | :---       |
| @AnnLvu     | `alvutina` |
| @auspens    | `auspensk` |
| @Henrizz    | `hzimmerm` |
| @MariaErosh | `meroshen` |
| @StephNova  | `smanriqu` |

---

## 🛠️ Tech Stack

<div align="center">

**Frontend**
<br>
`TypeScript` • `TailwindCSS`

**Backend**
<br>
`Fastify` • `Node.js` • `WebSockets`

**Data & DevOps**
<br>
`SQLite` • `Elasticsearch` • `Logstash` • `Kibana` • `Prometheus` • `Grafana` • `Docker`

</div>

---

## Resources

- **Fastify Documentation:** https://fastify.dev/docs/latest/
- **Docker Documentation:** https://docs.docker.com/
- **ELK Stack Guide:** https://www.elastic.co/what-is/elk-stack
- **Prometheus Documentation:** https://prometheus.io/docs/introduction/overview/
- **Grafana Documentation:** https://grafana.com/docs/grafana/latest/

**AI Usage:**
We used AI tools (Gemini, ChatGPT) to help with:
- **Debugging:** Fixing errors in Docker configurations and TypeScript types.
- **Boilerplate:** Generating basic code structures for components.
- **Learning:** Understanding how to implement JWT rotation, 2FA, and the monitoring and logging stack.

## 📝 License

This project is developed for educational purposes at 42 School.

---

*Made with ❤️ and ☕ by the ft_transcendence team.*

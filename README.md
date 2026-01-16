*This project has been created as part of the 42 curriculum by alvutina, auspensk, hzimmerm, meroshen, smanriqu.*

# 🏓 ft_transcendence

![Project Status](https://img.shields.io/badge/status-complete-success)
![Architecture](https://img.shields.io/badge/architecture-microservices-blueviolet)
![Docker](https://img.shields.io/badge/containerization-docker-2496ED)

**A real-time multiplayer Pong game built with microservices.**

---

## Description

**ft_transcendence** is our final project at 42 Berlin. It consists of building a Single Page Application that allows users to play PONG, the classic game from the 1970s. The subject offers several optional modules, allowing teams to decide the direction and scope of their implementation.

Our team chose to focus primarily on the backend, placing less emphasis on frontend complexity. As a result, the user interface remains simple, while the backend is designed to be robust and scalable. The application is built using a microservices architecture with integrated databases, supporting both local and remote Pong tournaments, enabling players on different machines within the same network to compete.

Users can sign up and log in securely using JWT-based authentication. The platform also includes social features such as real-time chat, friend management, and the ability to invite other players to matches. In addition, we implemented a comprehensive monitoring and observability stack using ELK, Grafana, and Prometheus to track system health and performance.

As required by the project specifications, the frontend is developed using TypeScript with Tailwind CSS, while the backend is built with Node.js and Fastify.


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

### 🎮 Game Engine
The game engine is the core service responsible for running a single match within a tournament. It communicates with the frontend via WebSockets and with the match service through REST API requests.

When a new game is about to start, the game engine requests the necessary game data from the match service and triggers the rendering of the game board on the frontend. It then sends the state of the paddles and the ball at a rate of 60 updates per second to the WebSocket connections of the participants in the respective game, allowing the frontend to continuously update the game board.

The frontend sends keyboard input events to the backend, which maps each input to the corresponding player and game instance and updates the game state accordingly. All collision detection, hit calculations, and speed calculations are handled on the backend. Game results, including wins and losses, are then communicated both to the frontend and back to the match service for processing and persistence.


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
   Create the `.env` file from the example and copy it to infrastructure directory.
   ```bash
   cp .env.example .env
   # Copy .env to  infrastructure
   # Fill in your credentials in .env
   ```

3. **Execution:**
   ```bash
   cd infrastructure
   docker-compose up --build
   ```

The application will be available at `https://localhost:8443` on the host machine
and on any other machine in the same network at `https://<ip_address_of_host_machine>:8443`

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

## 👥 Individual Contributions

| @AnnLvu     | `alvutina` |
- Monitoring: Set up ELK, Prometheus, and Grafana to keep track of system health and logs.
- Logs: Configured Logstash to collect logs from all services so they are easy to read in Kibana.
- Documentation: Wrote the README to explain how the project works and how to install it.
- Challenges faced: Mastering the ELK stack was challenging, as my previous experience was with OpenTelemetry and Datadog. Additionally, creating and configuring the Grafana dashboards in JSON format required a significant amount of time. It was also difficult to switch back and forth between Python (at work) and TypeScript (for this project).

| @auspens    | `auspensk` |
- Game management service and its connection to game engine service and frontend.
- Lobby for the players during the tournament creation.
- Websockets between frontend and gateway for tournament management and for frontend-gateway-game engine connection
- Temp user creation and token management for console tournament
- 2FA flow setup on the frontend
- Challenges faced: at the very start of the preparation to the project it took a while to grasp the concept of frontend-backend interaction and specifically of how the tokens and user authentication works. Understanding Java Script (async/await call specifically) also required some effort. Later on there were a few stumbles with the websokets, specifically when checking if the socket was connected successfully. In the end I made a seprate endpoint on the gateway for checking if the user is authenticated, so that the attemt to open the socket is only made with logged in user.

| @Henrizz    | `hzimmerm` |
- Game engine service and game board rendering in the frontend.
- SPA navigation with the back and forth arrows of the browser through history push state.
- Functionality of the arena section of the frontend, which acts as a waiting room before and after a game of the tournament.
- Setup of HTTPS and Nginx config so that clients on other machines than the host machine can be forwarded to the local gateway by Nginx.
- Challenges faced: It was tricky to avoid race conditions in the communication between frontend and the backend services, so that the game board would not be rendered without having received the specs, or a new game not started without having received the new game data. This was solved with async functions and await calls, as well as a message buffer for the game engine WebSockets that could store a message until the socket is open, so the input does not get lost.

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

## 📅 Project Management

**Organization & Workflow**
- **Kick-off:** We started with an in-person meeting at school to brainstorm, define the architecture, and break down the project into modular microservices.
- **Task Distribution:** Tasks were distributed based on individual interests and learning goals.
- **Tracking:** We used **GitHub Issues** to track progress, assign tasks, and manage the backlog.

**Quality Assurance & CI/CD**
- **Code Review:** We enforced a strict workflow where no Pull Request (PR) could be merged without at least one approval from another team member.
- **CI/CD:** Automated pipelines were set up to run checks on every push, ensuring code quality and build stability.

**Tools & Communication**
- **Miro:** Used for brainstorming, designing the microservices architecture, and mapping out database schemas.
- **Slack & Google Meet:** Our primary channels for daily communication, stand-ups, and remote pair programming sessions.

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

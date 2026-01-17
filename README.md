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


## Instructions


### Installation

0. **Prerequisites**
    have Docker installed (otherwise please refer to a Docker install guide for your respective machine)

1. **Clone the repository:**
   ```bash
   git clone <URL_of_project_repository>
   cd ft_transcendence
   ```

2. **Configure Environment:**
   Create the `.env` file from the example and copy it to infrastructure directory.
   ```bash
   cp .env.example .env
   # Copy .env to  infrastructure
   # Fill in your credentials and service port numbers in .env
   ```

3. **Execution:**
   ```bash
   cd infrastructure
   docker-compose up --build
   ```

The application will be available at `https://localhost:8443` on the host machine
and on any other machine in the same network at `https://<ip_address_of_host_machine>:8443`

---


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

### 🤝 Interact Service
Together with the chat is the social layer of the application.
Like the other services was built with **Fastify** and **SQLite**, it includes two systems:
- **Profile System:** Creates a "Master View" of the user. It combines basic info (username/email) with game stats pulled from the Matchmaking Service.
- **Friend System:** Implements friend relationship management with add/remove capabilities. Integrated with the chat service to display friend lists and enable quick direct messaging.

**Frontend Integration:** Profile viewing is accessible throughout the application, from chat conversations. Friend management is primarily handled through the chat interface with future expansion planned for profile-based management.

### 💬 Chat Service
Handles all live communication. Uses **Fastify** and **WebSockets** for "instant-on" communication without refreshing the page.
- **Messaging:** Includes modern features like typing indicators and read receipts.
	Persistence: If a friend is offline, messages are saved to the database and delivered the moment they log back in.
- **Game Integration:** In-chat game invitations with match details and expiration tracking. Players can challenge other users directly from conversations, creating instant 1v1 matches. System notifications deliver tournament updates (match joined, round completion, game results) directly to user inboxes.
- **Social Features:** User blocking system prevents unwanted communication bidirectionally. Direct profile access from conversations. Friend list integration for quick messaging access.
- **Security:** Gateway-authenticated WebSocket connections and REST endpoints protected with headers.
- **Frontend:** Minimizable chat bubble interface with conversation list, direct messaging, and system notification inbox. Supports reconnection on token changes and maintains state across page navigation.

### 📊 Observability Stack
Tools we use to monitor the app.
- **ELK Stack:** Collects logs from all services so we can search through them easily. [Elastic/Kibana](http://localhost:5601)
- **Prometheus:** Collects metrics like CPU usage and request counts. [Prometheus Targets](http://localhost:9090/targets)
- **Grafana:** Shows graphs and dashboards based on the data from Prometheus. [Grafana](http://localhost:3100)

#### 🪵 ELK Stack (Logs)
**Access:** [Kibana](http://localhost:5601)

**1. Initial Setup:**
- Go to **Management → Stack Management → Index Patterns**.
- Create a new pattern named `logstash-*` (or `ft_transcendence-*`) and select `@timestamp`.

**2. Viewing Logs:**
- Go to **Analytics → Discover**.
- Use filters (KQL):
  - `service.name : "auth-service"`
  - `level : "ERROR"`
  - `msg : "user created"`

#### 📈 Prometheus & Grafana (Metrics)
**Access:** Grafana | Prometheus Targets

**Key Features:**
- **Infrastructure:** Prometheus (15d retention), Grafana (auto-provisioning), and Node Exporter.
- **Dashboard:** "FT_Transcendence Overview" displays Service Status, CPU/RAM usage, RPS, and Event Loop Lag.
- **Alerting:** Active alerts (e.g., `InstanceDown`) if services are unreachable.

**How to Test:**
1. **Verify:** Ensure all targets are UP in Prometheus.
2. **Visualize:** Log in to Grafana (admin/admin) and check the dashboard.
3. **Alert:** Run `docker stop match` and watch the dashboard status turn red.

---

## ️🗄️ Database Schemas

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
- **conversations** & **conversation_participants**: Manage direct messages and their members (Many-to-Many relationship).
- **messages**: Stores all message types including text, game invitations, and system notifications. Uses `message_type` field to distinguish between types.
- **system_conversations**: Maps each user to their dedicated conversation with the system user (ID: 0) for receiving tournament and game notifications.
- **blocks**: User blocking relationships with bidirectional enforcement.

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

CREATE TABLE IF NOT EXISTS system_conversations (
    user_id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
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

## 👥 The Team

This project was brought to life by a team of 5 dedicated developers.
All architectural and organizational decisions were made as a team. There were no dedicated roles other than the focus on the chosen modules and the collaboration in between. 

| GitHub      | 42 Intra |
| :---        | :---       |
| @AnnLvu     | `alvutina` |
| @auspens    | `auspensk` |
| @Henrizz    | `hzimmerm` |
| @MariaErosh | `meroshen` |
| @StephNova  | `smanriqu` |

---

## 📅 Project Management

**Organization & Workflow**
- **Kick-off:** We started with an in-person meeting at school to brainstorm, define the architecture, and break down the project into modular microservices.
- **Task Distribution:** Tasks were distributed based on individual interests and learning goals.
- **Tracking:** We used **GitHub Issues** to track progress, assign tasks, and manage the backlog.

**Quality Assurance & CI/CD**
- **Code Review:** We enforced a strict workflow where no Pull Request (PR) could be merged without at least one approval from another team member.
- **CI:** Automated pipelines were set up to run checks on every push, ensuring code quality and build stability.

**Tools & Communication**
- **42 school:** For on-site meetings and pair programmings sessions.
- **Miro:** Used for brainstorming, designing the user experience and communication with the microservices architecture.
- **Miro/Lucidchart**  Used for mapping out database schemas.
- **Slack & Google Meet:** Our primary channels for daily communication, stand-ups, and remote pair programming sessions.

---

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
- API Gateway as the single entry point, handling routing, JWT validation, and internal security headers.
- Auth Service, including registration, login, JWT access/refresh tokens, and 2FA.
- User Service for public profiles and game statistics.
- Designed SQLite schemas for all services I've implemented and used parameterized queries to prevent SQL injection.
- Configured Docker internal networking to isolate backend services from external access.
- Challenges faced: Initially, designing a robust microservices architecture from scratch and navigating an entirely new tech stack.

| @StephNova  | `smanriqu` | 
- When I joined the project, the core infrastructure (Auth, Gateway, and Game Engine) was already in place. My mission was to build the chat and later one I decided to add the Interact service.
- Chat Service: Developed using WebSockets, managing everything from backend logic to the frontend interface. To maintain security standards, I ensured all WebSocket traffic was routed through the Gateway and validated via the existing JWT system.
- Interact Service: Designed and implemented the user profile and friend systems.
- Challenges and insights: After having a basic chat where the backend updated the database and communicated via WebSockets, the real challenge was the user experience. Integrating the friend system, real-time game invitations, and a cohesive notification system required careful planning to ensure everything felt reactive and interconnected rather than a set of isolated features.
- I also spent a significant amount of time architecting the chat's "state." It was important to me that users could switch between the Home view and DMs without losing their place or data. Adopting an "event → action → render" workflow was key. It allowed me to implement all the features and synchronize these parts into one smooth, integrated application.

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
## 🚀 List of Features

### 🎮 Gameplay & Matchmaking
- **Real-time Pong Engine:** Basic physics implementation with ball-paddle collision, score tracking, and 60 FPS rendering.
- **Match Types:** Supports Remote within the same network and Console (local) player modes.
- **Matchmaking & Lobby:** Systems for creating/joining matches, a “Ready” indicator, and waiting rooms for participants.
- **Input & Controls:** Keyboard-based paddle movement (Arrow/WASD keys) and responsive canvas sizing.

### 🔐 Authentication & Security
- **User Access:** Secure registration, login, and session management using JWT and refresh tokens.
- **Two-Factor Authentication (2FA):** TOTP-based security with QR code generation and verification.
- **Data Protection:** Bcrypt password hashing, internal gateway secrets, and CORS configuration.

### 💬 Social & Interaction
- **Real-time Chat:** WebSocket-based messaging featuring private conversations, unread tracking, and history.
- **Friend System:** Functionality to add and delete friends.
- **Game Invitations:** The ability to send and receive match challenges directly through the chat interface.
- **User Management:** Presence tracking (Online/Status), typing indicators, and a user blocking system.

### 👤 Profiles & Statistics
- **User Profiles:** Basic profile information accessible from the menu avatar and the chat. Showing name, email, bio and stats.
- **Statistics Tracking:** Automatic recording of games played, wins, and win/loss ratio calculations.

### 🛠️ Architecture & Infrastructure
- **Microservices Architecture:** Seven independent backend services managed via a centralized API Gateway.
- **Containerization:** Full Docker integration using Docker Compose for service isolation and volume mounting.
- **Observability:** Centralized logging (Logstash/Pino) and metrics collection (Prometheus/Grafana).
- **Single Page Application:** Client-side routing for a seamless UI without page reloads.

### 🧪 Testing & Legal
- **Automated Testing:** Github actions for CI testing.
- **Policy Pages:** Dedicated sections for Privacy Policy and Terms of Service.

--- 

## List of chosen modules

### IV.1 Web
- **Major: Use a framework for both the frontend and backend (2 points)**
  - 📝 **Justification:** In the subject version we worked on, the frontend and backend modules were required to be Node.js with Fastify for the backend and Typescript with Tailwind CSS for the frontend.
  - ⚙️ **Implementation:** Implemented everywhere.
  - 👥 **Team:** everyone

- **Major: Implement real-time features using WebSockets or similar technology (2 points)**
  - 📝 **Justification:** Essential for the high-frequency updates required by the Pong game (60 ticks/sec) and instant chat messaging.
  - ⚙️ **Implementation:** We utilized the native WebSocket API on the frontend and the 'ws' library on the backend. The API Gateway acts as a secure proxy, routing WebSocket connections to the appropriate microservice (Game or Chat). We have 3 types of sockets: the lobbysocket is used for tournament orchestration (frontend to gateway), the game socket is used to handle and render the game flow (frontend to gateway to game-engine) and the chat socket is used for the chat (frontend to gateway to chat).
  - 👥 **Team:** auspensk, hzimmerm, smanriqu

- **Major: Allow users to interact with other users (2 points)**
  - 📝 **Justification:** So users can chat and invite each other to games and see their stats.
  - ⚙️ **Implementation:** Users can manage friends and block users. This is handled by the Interact Service, which maintains 'friends' and 'blocks' tables in SQLite, ensuring bidirectional relationship enforcement.
  - 👥 **Team:** smanriqu

### IV.2 Accessibility and Internationalization
- **Minor: Support for additional browsers (1 point)**
  - 📝 **Justification:** To ensure accessibility across different platforms.
  - ⚙️ **Implementation:** We utilized standard HTML5, CSS3 (Tailwind), and TypeScript, ensuring full compatibility and testing on both Google Chrome and Mozilla Firefox.
  - 👥 **Team:** everyone

### IV.3 User Management
- **Minor: Implement a complete 2FA (Two-Factor Authentication) system for the users (1 point)**
  - 📝 **Justification:** To enhance account security.
  - ⚙️ **Implementation:** We implemented TOTP (Time-based One-Time Password). The Auth Service generates a QR code for setup and validates the user's code against a stored secret before issuing a JWT.
  - 👥 **Team:** auspensk, meroshen

### IV.6 Gaming and user experience
- **Major: Implement a complete web-based game where users can play against each other (2 points)**
  - 📝 **Justification:** The core requirement of the project.
  - ⚙️ **Implementation:** A server-authoritative architecture where the Game Engine calculates physics and collisions to prevent cheating. The frontend simply renders the state received via WebSockets on an HTML5 Canvas.
  - 👥 **Team:** auspensk, hzimmerm

- **Major: Remote players — Enable two players on separate computers to play the same game in real-time (2 points)**
  - 📝 **Justification:** To enable multiplayer gameplay across the network.
  - ⚙️ **Implementation:** The Gateway and Nginx are configured to accept connections from external IPs. The Game Engine synchronizes state between two remote clients via WebSockets, handling input latency.
  - 👥 **Team:** auspensk, hzimmerm

- **Minor: Advanced chat features (enhances the basic chat from "User interaction" module) (1 point)**
  - 📝 **Justification:** To provide a rich user experience comparable to modern messaging apps.
  - ⚙️ **Implementation:** We implemented typing indicators, read receipts, and interactive game invitations. These are handled via specific WebSocket event types and state management in the frontend.
  - 👥 **Team:** smanriqu

- **Minor: Implement a tournament system (1 point)**
  - 📝 **Justification:** To support organized competitive play.
  - ⚙️ **Implementation:** The Match Service manages tournament brackets and state. It coordinates with the Game Engine to launch matches automatically as players advance through the rounds.
  - 👥 **Team:** auspensk

### IV.7 Devops
- **Major: Infrastructure for log management using ELK (Elasticsearch, Logstash, Kibana) (2 points)**
  - 📝 **Justification:** To aggregate logs from distributed microservices for efficient debugging.
  - ⚙️ **Implementation:** Services send logs to a Logstash pipeline, which indexes them in Elasticsearch. We use Kibana to visualize and filter logs by service, severity, or message content.
  - 👥 **Team:** alvutina

- **Major: Monitoring system with Prometheus and Grafana. (2 points)**
  - 📝 **Justification:** To observe system health and resource usage in real-time.
  - ⚙️ **Implementation:** Each service exposes metrics via an endpoint. Prometheus scrapes these metrics, and Grafana visualizes them on a dashboard, tracking CPU, RAM, and Event Loop Lag.
  - 👥 **Team:** alvutina

- **Major: Backend as microservices (2 points)**
  - 📝 **Justification:** To ensure scalability, maintainability, and separation of concerns.
  - ⚙️ **Implementation:** The application is divided into specialized services (Auth, User, Chat, Game, Match, Interact), each running in its own Docker container and communicating via the API Gateway.
  - 👥 **Team:** everyone

### IV.10 Modules of choice
- **Major: Implement a custom module that is not listed above. (2 points)**
  - 📝 **Justification:** To enhance security and user authentication by utilizing JSON Web Tokens (JWT).
  - ⚙️ **Implementation:** We utilize JWTs as a secure method for authentication and authorization, ensuring that user sessions and access to resources are managed securely. Without an active token, the user cannot use the chat, play a remote tournament, or check their profile. We also implemented a "guest token" system, allowing users to play games and tournaments on the console without logging in.
  - 👥 **Team:** auspensk, meroshen


---

## Resources

- **Fastify Documentation:** https://fastify.dev/docs/latest/
- **Docker Documentation:** https://docs.docker.com/
- **ELK Stack Guide:** https://www.elastic.co/what-is/elk-stack
- **Prometheus Documentation:** https://prometheus.io/docs/introduction/overview/
- **Grafana Documentation:** https://grafana.com/docs/grafana/latest/

**AI Usage:**
We used AI tools (Gemini, ChatGPT, Claude) to help with:
- **Debugging:** Fixing errors in Docker configurations and TypeScript types.
- **Boilerplate:** Generating basic code structures for components.
- **Learning:** The tech stack was new for all of us, so after learning the basics with online tutorials, we leaned on AI as an assistant and tutor to clarify details and further questions.

## 📝 License

This project is developed for educational purposes at 42 School.

---

*Made with ❤️ and ☕ by the ft_transcendence team.*

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

The application will be available at `https://localhost:8443` on the host machine 
and on any other machine in the same network at `https://<ipaddress_of_hostmachine>:8443`

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

## 👥 Individual Contrubutions 

| @AnnLvu     | `alvutina` |
| @auspens    | `auspensk` |

| @Henrizz    | `hzimmerm` |
- game engine service and game board rendering in the frontend 
- SPA navigation with the back and forth arrows of the browser through history push state
- functionality of the arena section of the frontend, which acts as a waiting room before and after a game of the tournament
- setup of https and nginx config so that clients on other machines than the host machine can be forwarded to the local gateway by nginx
- challenges faced: it was tricky to avoid race conditions in the communication between frontend and the backend services, so that the game board would not be rendered without having received the specs, or a new game not started without having received the new game data. this was solved with async functions and await calls, as well as a message buffer for the game engine websockets that could store a message until the socket is open, so the input does not get lost. 

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

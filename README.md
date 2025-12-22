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

The application will be available at `http://localhost:8080` (or your configured port).

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

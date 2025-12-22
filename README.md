# 🏓 ft_transcendence

![Project Status](https://img.shields.io/badge/status-complete-success)
![Architecture](https://img.shields.io/badge/architecture-microservices-blueviolet)
![Docker](https://img.shields.io/badge/containerization-docker-2496ED)

**The ultimate multiplayer Pong experience, re-imagined as a robust, scalable microservices ecosystem.**

---

## 🌟 Overview

**ft_transcendence** is our final capstone project. It is not just a game; it is a demonstration of modern software engineering principles. We moved beyond the monolithic approach to build a distributed system where every component—from authentication to real-time physics—operates as an independent, containerized service.

Our goal was to create a seamless, real-time multiplayer platform that is secure, performant, and observable.

## 🏗️ Architecture & Microservices

The system is orchestrated via **Docker Compose**, connecting the following specialized services:

### 🛡️ API Gateway
**The Central Nervous System.**
Built with **Fastify** for high performance, this service acts as the unified facade for our distributed architecture.
- **Smart Routing:** Proxies HTTPS requests to Auth, User, Matchmaking, and Game services.
- **Edge Security:** Validates **JWTs** and injects internal security headers (`x-gateway-secret`, `x-user-id`) to ensure microservices only accept authorized traffic.
- **Lobby Orchestration:** Manages real-time matchmaking queues and state in-memory via WebSockets before offloading confirmed matches to the Match Service.
- **Game Proxy:** Establishes a direct, low-latency WebSocket pipe between the client and the Game Engine.
- **Observability:** Exposes real-time metrics via **Prometheus** and ships structured logs to **Logstash**.

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
**The Physics Core.**
- **Authoritative Simulation:** Runs a custom 60Hz(setInterval) server-side physics loop, calculating precise collision vectors and ball dynamics to prevent client-side manipulation.
- **Versatile Gameplay:** Supports both **Remote** (online multiplayer) and **Console** (local shared-keyboard) modes.

### 💬 Chat Service
**The Social Hub.**
- **Advanced Messaging:** Features typing indicators, read receipts, and message history persistence.
- **Game Integration:** Send direct game invites and receive tournament notifications directly within the chat.
- **User Control:** Includes blocking capabilities and direct access to user profiles from the chat interface.

### 📊 Observability Stack
We don't just run code; we monitor it.
- **ELK Stack (Elasticsearch, Logstash, Kibana):** A robust pipeline where logs are shipped via TCP to Logstash, indexed in Elastic, and analyzed in Kibana.
- **Prometheus:** Scrapes real-time metrics from the Gateway and microservices.
- **Grafana:** Visualizes system health, request rates, and game statistics in custom dashboards.

---

## 🚀 Getting Started


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

3. **Launch the System:**
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

## 📝 License

This project is developed for educational purposes at 42 School.

---

*Made with ❤️ and ☕ by the ft_transcendence team.*

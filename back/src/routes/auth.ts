import { FastifyInstance } from "fastify";
import bcrypt from "bcrypt";
import { db } from "../db/database";

interface User {
  id: number;
  username: string;
  password: string;
}

export async function authRoutes(fastify: FastifyInstance) {
  // Registration
  fastify.post("/auth/register", async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string };

    if (!username || !password) {
      return reply.status(400).send({ error: "Username and password required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    return new Promise((resolve) => {
      db.run(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        [username, hashedPassword],
        function (err) {
          if (err) {
            reply.status(400).send({ error: "Username already exists" });
            return resolve(null);
          } else {
            reply.send({ message: "User registered", id: this.lastID });
            return resolve(null);
          }
        }
      );
    });
  });

  // Login
  fastify.post("/auth/login", async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string };

    if (!username || !password) {
      return reply.status(400).send({ error: "Username and password required" });
    }

    return new Promise((resolve) => {
      db.get("SELECT * FROM users WHERE username = ?", [username], async (err: Error | null, row?: { id: number; username: string; password: string }) => {
        if (err || !row) {
          reply.status(401).send({ error: "Invalid credentials" });
          return resolve(null);
        }

        const passwordMatch = await bcrypt.compare(password, row.password);

        if (!passwordMatch) {
          reply.status(401).send({ error: "Invalid credentials" });
          return resolve(null);
        }

        const token = fastify.jwt.sign({ id: row.id, username: row.username });
        reply.send({ token });
        return resolve(null);
      });
    });
  });

  
  // ****** PROTECTED ROUTES: *******
  fastify.register(async (f) => {
	f.addHook("onRequest", async (request, reply) => {
		await request.jwtVerify();
	});

	f.get("/profile", async (request, reply) => {
		return { user: request.user };
	});
  });

}

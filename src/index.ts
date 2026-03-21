import "dotenv/config";

import fastifyCors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifyApiReference from "@scalar/fastify-api-reference";
import Fastify, { type FastifyRequest } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from "fastify-type-provider-zod";
import z from "zod";

import { auth } from "./lib/auth.js";
import { env } from "./lib/env.js";
import { aiRoutes } from "./routes/ai.js";
import { homeRoutes } from "./routes/home.js";
import { meRoutes } from "./routes/me.js";
import { statsRoutes } from "./routes/stats.js";
import { workoutPlanRoutes } from "./routes/workout-plan.js";

function fastifyHeadersToWeb(request: FastifyRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const part of value) headers.append(key, part);
    } else {
      headers.append(key, value);
    }
  }
  return headers;
}

function serializeRequestBody(request: FastifyRequest): string | undefined {
  const method = request.method;
  if (method === "GET" || method === "HEAD") return undefined;
  const raw = request.body;
  if (raw === undefined || raw === null) return undefined;

  const contentType = String(
    request.headers["content-type"] ?? "",
  ).toLowerCase();

  if (contentType.includes("application/x-www-form-urlencoded")) {
    if (typeof raw === "string") return raw;
    if (typeof raw === "object" && !Buffer.isBuffer(raw)) {
      return new URLSearchParams(
        raw as Record<string, string>,
      ).toString();
    }
  }

  if (typeof raw === "string") return raw;
  if (Buffer.isBuffer(raw)) return raw.toString("utf8");
  return JSON.stringify(raw);
}

const envToLogger = {
  development: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
  production: true,
  test: false,
};

const app = Fastify({
  logger: envToLogger[env.NODE_ENV],
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "GYMBRO API",
      description: "API para o GYMBRO treinos",
      version: "1.0.0",
    },
    servers: [
      {
        description: "API Base URL",
        url: env.API_BASE_URL,
      },
    ],
  },
  transform: jsonSchemaTransform,
});

await app.register(fastifyCors, {
  origin: [env.WEB_APP_BASE_URL],
  credentials: true,
});

await app.register(fastifyApiReference, {
  routePrefix: "/docs",
  configuration: {
    sources: [
      {
        title: "GYMBRO Treinos API",
        slug: "GYMBRO-treinos-api",
        url: "/swagger.json",
      },
      {
        title: "Auth API",
        slug: "auth-api",
        url: "/api/auth/open-api/generate-schema",
      },
    ],
  },
});

// RESTful
// Routes
await app.register(homeRoutes, { prefix: "/home" });
await app.register(meRoutes, { prefix: "/me" });
await app.register(statsRoutes, { prefix: "/stats" });
await app.register(workoutPlanRoutes, { prefix: "/workout-plans" });
await app.register(aiRoutes, { prefix: "/ai" });

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/swagger.json",
  schema: {
    hide: true,
  },
  handler: async () => {
    return app.swagger();
  },
});

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/",
  schema: {
    description: "Hello world",
    tags: ["Hello World"],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },
  handler: () => {
    return {
      message: "Hello World",
    };
  },
});

app.route({
  method: ["GET", "POST", "OPTIONS"],
  url: "/api/auth/*",
  schema: {
    hide: true,
  },
  async handler(request, reply) {
    try {
      const host = request.headers.host;
      if (!host) {
        return reply.status(400).send({ error: "Missing Host header" });
      }

      const url = new URL(request.url, `http://${host}`);
      const body = serializeRequestBody(request);
      const req = new Request(url.toString(), {
        method: request.method,
        headers: fastifyHeadersToWeb(request),
        ...(body !== undefined ? { body } : {}),
      });

      const response = await auth.handler(req);

      reply.status(response.status);

      const setCookies = response.headers.getSetCookie?.() ?? [];
      for (const cookie of setCookies) {
        reply.header("set-cookie", cookie);
      }

      response.headers.forEach((value, key) => {
        if (key.toLowerCase() === "set-cookie") return;
        reply.header(key, value);
      });

      const payload =
        response.body == null ? null : await response.text();
      return reply.send(payload);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        error: "Internal authentication error",
        code: "AUTH_FAILURE",
      });
    }
  },
});

try {
  await app.listen({ host: "0.0.0.0", port: env.PORT });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
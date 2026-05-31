import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { json } from "body-parser";
import { typeDefs } from "./graphql/schema";
import { resolvers } from "./graphql/resolvers";
import { buildContext } from "./graphql/context";
import { formatGraphQLError } from "./errors/formatGraphQLError";
import { env } from "./config/env";

export async function createApp() {
  const app = express();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    formatError: formatGraphQLError,
  });

  await server.start();

  app.use(
    "/graphql",
    cors<cors.CorsRequest>({ origin: env.CORS_ORIGIN, credentials: true }),
    json(),
    expressMiddleware(server, {
      context: buildContext,
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}

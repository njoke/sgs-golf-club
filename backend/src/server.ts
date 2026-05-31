import { createApp } from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";

async function bootstrap() {
  await connectDatabase();

  const app = await createApp();

  app.listen(env.PORT, () => {
    console.log(`GraphQL server ready at http://localhost:${env.PORT}/graphql`);
    console.log(`Health check at http://localhost:${env.PORT}/health`);
  });
}

bootstrap().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

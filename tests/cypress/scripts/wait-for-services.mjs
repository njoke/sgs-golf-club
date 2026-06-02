const baseUrl = process.env.CYPRESS_BASE_URL ?? "http://localhost:3000";
const backendHealthUrl =
  process.env.CYPRESS_BACKEND_HEALTH_URL ?? "http://localhost:4000/health";
const waitTimeoutMs = Number(process.env.CYPRESS_WAIT_TIMEOUT_MS ?? "180000");
const waitIntervalMs = Number(process.env.CYPRESS_WAIT_INTERVAL_MS ?? "2000");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(url, label) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < waitTimeoutMs) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        console.log(`[cypress-wait] ${label} ready at ${url}`);
        return;
      }

      console.log(`[cypress-wait] ${label} returned ${response.status}, retrying...`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.log(`[cypress-wait] ${label} unavailable (${message}), retrying...`);
    }

    await sleep(waitIntervalMs);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}`);
}

await waitFor(backendHealthUrl, "backend");
await waitFor(`${baseUrl}/login`, "frontend");

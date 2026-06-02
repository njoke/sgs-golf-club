const logPrefix = process.env.WAIT_LOG_PREFIX ?? "service-wait";
const frontendBaseUrl = process.env.WAIT_FRONTEND_BASE_URL ?? "http://localhost:3000";
const frontendPath = process.env.WAIT_FRONTEND_PATH ?? "/login";
const frontendUrl = `${frontendBaseUrl}${frontendPath}`;
const backendHealthUrl = process.env.WAIT_BACKEND_HEALTH_URL ?? "http://localhost:4000/health";
const waitTimeoutMs = Number(process.env.WAIT_TIMEOUT_MS ?? "180000");
const waitIntervalMs = Number(process.env.WAIT_INTERVAL_MS ?? "2000");

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
        console.log(`[${logPrefix}] ${label} ready at ${url}`);
        return;
      }

      console.log(`[${logPrefix}] ${label} returned ${response.status}, retrying...`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.log(`[${logPrefix}] ${label} unavailable (${message}), retrying...`);
    }

    await sleep(waitIntervalMs);
  }

  throw new Error(`Timed out waiting for ${label} at ${url}`);
}

await waitFor(backendHealthUrl, "backend");

if (process.env.WAIT_SKIP_FRONTEND !== "true") {
  await waitFor(frontendUrl, "frontend");
}

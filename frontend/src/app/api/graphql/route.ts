export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const GRAPHQL_UPSTREAM_URL =
  process.env.GRAPHQL_UPSTREAM_URL ?? "http://localhost:4000/graphql";

async function proxyGraphQL(request: Request): Promise<Response> {
  const upstreamUrl = new URL(GRAPHQL_UPSTREAM_URL);
  const requestUrl = new URL(request.url);
  upstreamUrl.search = requestUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.text(),
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) {
    responseHeaders.set("content-type", contentType);
  }

  return new Response(await response.text(), {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(request: Request) {
  return proxyGraphQL(request);
}

export async function POST(request: Request) {
  return proxyGraphQL(request);
}

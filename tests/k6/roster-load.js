import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 50,
  duration: "30s",
};

const GRAPHQL_URL = __ENV.GRAPHQL_URL || "http://localhost:4000/graphql";
const TOKEN = __ENV.TOKEN || "";

export default function () {
  const payload = JSON.stringify({
    query: `query {
      golfers(clubId: "CLUB_ID") {
        id firstName lastName handicapIndex
      }
    }`,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
  };

  const res = http.post(GRAPHQL_URL, payload, params);

  check(res, {
    "status 200": (r) => r.status === 200,
    "no errors": (r) => !JSON.parse(r.body).errors,
    "p95 < 500ms": (r) => r.timings.duration < 500,
  });

  sleep(1);
}

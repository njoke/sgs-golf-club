import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 50,
  duration: "30s",
};

const GRAPHQL_URL = __ENV.GRAPHQL_URL || "http://localhost:4000/graphql";
const TOKEN = __ENV.TOKEN || "";
const CLUB_ID = __ENV.CLUB_ID || "CLUB_ID";

export default function () {
  const payload = JSON.stringify({
    query: `query Roster($clubId: ID!) {
      golfers(filter: { clubId: $clubId, pageSize: 25 }) {
        nodes { id firstName lastName currentHandicapIndex }
        pageInfo { totalCount }
      }
    }`,
    variables: { clubId: CLUB_ID },
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

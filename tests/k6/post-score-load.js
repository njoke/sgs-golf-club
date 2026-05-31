import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "30s",
};

const GRAPHQL_URL = __ENV.GRAPHQL_URL || "http://localhost:4000/graphql";
const TOKEN = __ENV.TOKEN || "";

export default function () {
  const payload = JSON.stringify({
    query: `mutation PostScore($input: PostScoreInput!) {
      postScore(input: $input) {
        id adjustedGrossScore scoreDifferential
      }
    }`,
    variables: {
      input: {
        golferId: "GOLFER_ID",
        courseId: "COURSE_ID",
        teeId: "TEE_ID",
        datePlayed: "2026-05-30",
        adjustedGrossScore: 82,
        numberOfHoles: 18,
      },
    },
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
    "p95 < 800ms": (r) => r.timings.duration < 800,
  });

  sleep(1);
}

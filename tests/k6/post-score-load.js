import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "30s",
};

const GRAPHQL_URL = __ENV.GRAPHQL_URL || "http://localhost:4000/graphql";
const TOKEN = __ENV.TOKEN || "";
const CLUB_ID = __ENV.CLUB_ID || "CLUB_ID";
const GOLFER_ID = __ENV.GOLFER_ID || "GOLFER_ID";
const COURSE_ID = __ENV.COURSE_ID || "COURSE_ID";
const TEE_ID = __ENV.TEE_ID || "white-m";
const COURSE_NAME = __ENV.COURSE_NAME || "Cedar Irons Golf Club";
const TEE_NAME = __ENV.TEE_NAME || "White";

export default function () {
  const payload = JSON.stringify({
    query: `mutation PostScore($input: PostScoreInput!) {
      postScore(input: $input) {
        id adjustedGrossScore differential status
      }
    }`,
    variables: {
      input: {
        clubId: CLUB_ID,
        golferId: GOLFER_ID,
        courseId: COURSE_ID,
        teeId: TEE_ID,
        datePlayed: "2026-06-01T00:00:00.000Z",
        scoreType: "HOME",
        holes: 18,
        entryMode: "TOTAL_SCORE",
        courseName: COURSE_NAME,
        teeName: TEE_NAME,
        grossScore: 82,
        adjustedGrossScore: 82,
        courseRating: 68.5,
        slopeRating: 121,
        par: 72,
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

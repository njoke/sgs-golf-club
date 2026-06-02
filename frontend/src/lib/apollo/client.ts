import { ApolloClient, InMemoryCache, createHttpLink, from } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { AUTH_COOKIE_NAME, getClientCookie } from "@/lib/auth/session";

const GRAPHQL_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "/api/graphql";

const httpLink = createHttpLink({
  uri: GRAPHQL_URL,
  credentials: "include",
});

const authLink = setContext((_, { headers }) => {
  const token = getClientCookie(AUTH_COOKIE_NAME);
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});

export const apolloClient = new ApolloClient({
  link: from([authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          golfers: { keyArgs: ["filter", ["clubId"]] },
          golferScores: { keyArgs: ["filter", ["golferId"]] },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: { fetchPolicy: "cache-and-network" },
    query: { fetchPolicy: "network-only" },
  },
});

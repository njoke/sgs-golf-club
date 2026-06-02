interface LoginOptions {
  email: string;
  password: string;
  path: string;
}

interface LoginResponse {
  data?: {
    login?: {
      token: string;
      user: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: string;
        clubIds?: string[];
        golferId?: string | null;
        status?: string | null;
      };
    };
  };
  errors?: Array<{ message?: string }>;
}

const AUTH_COOKIE_NAME = "sgs_token";
const USER_STORAGE_KEY = "sgs_user";
const GRAPHQL_URL = Cypress.env("graphqlUrl") || "http://localhost:4000/graphql";

function loginWithGraphQL({ email, password, path }: LoginOptions) {
  cy.request({
    method: "POST",
    url: GRAPHQL_URL,
    body: {
      query: `mutation Login($input: LoginInput!) {
        login(input: $input) {
          token
          user {
            id
            email
            firstName
            lastName
            role
            clubIds
            golferId
            status
          }
        }
      }`,
      variables: {
        input: { email, password },
      },
    },
  }).then((res) => {
    const body = res.body as LoginResponse;
    const loginPayload = body.data?.login;

    expect(loginPayload, body.errors?.[0]?.message ?? "login payload missing").to.exist;

    const token = loginPayload?.token ?? "";
    const user = loginPayload?.user;
    const sessionUser = {
      id: user?.id,
      email: user?.email,
      firstName: user?.firstName,
      lastName: user?.lastName,
      role: user?.role,
      clubIds: user?.clubIds ?? [],
      golferId: user?.golferId ?? null,
      status: user?.status ?? undefined,
    };

    expect(token, "auth token").to.not.equal("");
    expect(user, "auth user").to.exist;

    cy.visit("/", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sessionUser));
      },
    });

    cy.setCookie(AUTH_COOKIE_NAME, token);
    cy.visit(path);
  });
}

Cypress.Commands.add("loginAsAdmin", (path = "/dashboard") => {
  loginWithGraphQL({
    email: "admin@sgs.golf",
    password: "Admin123!",
    path,
  });
});

Cypress.Commands.add("loginAsMember", (path = "/member/dashboard") => {
  loginWithGraphQL({
    email: "jared@sgs.golf",
    password: "Member123!",
    path,
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(path?: string): Chainable<void>;
      loginAsMember(path?: string): Chainable<void>;
    }
  }
}

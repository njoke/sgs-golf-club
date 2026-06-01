interface LoginOptions {
  email: string;
  password: string;
}

function loginWithGraphQL({ email, password }: LoginOptions) {
  cy.request({
    method: "POST",
    url: "http://localhost:4000/graphql",
    body: {
      query: `mutation Login($email: String!, $password: String!) {
        login(input: { email: $email, password: $password }) {
          token
          user { id email role clubIds golferId }
        }
      }`,
      variables: { email, password },
    },
  }).then((res) => {
    const token = res.body.data.login.token;
    const user = res.body.data.login.user;
    cy.window().then((win) => {
      win.localStorage.setItem("token", token);
      win.localStorage.setItem(
        "user",
        JSON.stringify({
          userId: user.id,
          email: user.email,
          role: user.role,
          clubId: user.clubIds?.[0],
          golferId: user.golferId,
        })
      );
    });
  });
}

Cypress.Commands.add("loginAsAdmin", () => {
  loginWithGraphQL({
    email: "admin@sgs.golf",
    password: "Admin123!",
  });
});

Cypress.Commands.add("loginAsMember", () => {
  loginWithGraphQL({
    email: "jared@sgs.golf",
    password: "Member123!",
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>;
      loginAsMember(): Chainable<void>;
    }
  }
}

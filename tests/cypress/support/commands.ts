// Custom Cypress commands — expanded per feature spec

Cypress.Commands.add("loginAsAdmin", () => {
  cy.request({
    method: "POST",
    url: "http://localhost:4000/graphql",
    body: {
      query: `mutation {
        login(input: { email: "admin@safarigolfseattle.org", password: "Admin123!" }) {
          token
          user { email role }
        }
      }`,
    },
  }).then((res) => {
    const token = res.body.data.login.token;
    localStorage.setItem("token", token);
  });
});

declare global {
  namespace Cypress {
    interface Chainable {
      loginAsAdmin(): Chainable<void>;
    }
  }
}

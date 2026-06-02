describe("Admin Login", () => {
  beforeEach(() => {
    cy.visit("/login", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.document.cookie = "sgs_token=; Max-Age=0; Path=/; SameSite=Lax";
      },
    });
  });

  it("renders login page", () => {
    cy.contains("Safari Golf Seattle").should("be.visible");
    cy.contains("One sign-in.").should("be.visible");
    cy.contains("Portal sign-in").should("be.visible");
  });

  it("redirects to dashboard on valid admin credentials", () => {
    cy.contains("button", "Sign in").click();

    cy.location("pathname", { timeout: 20000 }).should("eq", "/dashboard");
    cy.contains("Admin dashboard", { timeout: 20000 }).should("be.visible");
  });

  it("shows error on invalid credentials", () => {
    cy.contains("span", "Password").parent().find("input").clear().type("WrongPassword!");
    cy.contains("button", "Sign in").click();

    cy.contains("Invalid email or password").should("be.visible");
  });
});

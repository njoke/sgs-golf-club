describe("auth smoke", () => {
  it("hydrates seeded admin auth using current session keys", () => {
    cy.loginAsAdmin("/dashboard");

    cy.location("pathname", { timeout: 20000 }).should("eq", "/dashboard");
    cy.contains("Admin dashboard", { timeout: 20000 }).should("be.visible");
    cy.getCookie("sgs_token").should("exist");
    cy.window().then((win) => {
      const storedUser = JSON.parse(win.localStorage.getItem("sgs_user") || "{}");
      expect(storedUser.email).to.equal("admin@sgs.golf");
      expect(storedUser.role).to.equal("CLUB_ADMIN");
      expect(storedUser.clubIds).to.have.length.greaterThan(0);
    });
  });

  it("signs a member into the member dashboard from the login form", () => {
    cy.visit("/login", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.document.cookie = "sgs_token=; Max-Age=0; Path=/; SameSite=Lax";
      },
    });

    cy.contains("span", "Email").parent().find("input").clear().type("jared@sgs.golf");
    cy.contains("span", "Password").parent().find("input").clear().type("Member123!");
    cy.contains("button", "Sign in").click();

    cy.location("pathname", { timeout: 20000 }).should("eq", "/member/dashboard");
    cy.contains("Member dashboard", { timeout: 20000 }).should("be.visible");
  });
});

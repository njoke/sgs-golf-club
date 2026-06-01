describe("auth smoke", () => {
  it("renders login placeholder page", () => {
    cy.visit("/login");
    cy.contains("SGS Golf Club").should("be.visible");
    cy.contains("Login page").should("be.visible");
  });

  it("stores admin auth session in localStorage", () => {
    cy.visit("/login");
    cy.loginAsAdmin();
    cy.window().then((win) => {
      expect(win.localStorage.getItem("token")).to.be.a("string");
      const storedUser = JSON.parse(win.localStorage.getItem("user") || "{}");
      expect(storedUser.email).to.equal("admin@sgs.golf");
      expect(storedUser.role).to.equal("CLUB_ADMIN");
    });
  });
});

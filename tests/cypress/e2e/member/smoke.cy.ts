describe("member smoke", () => {
  it("renders member dashboard and posts a score", () => {
    const grossScore = String(101 + (Date.now() % 7));

    cy.loginAsMember("/member/dashboard");
    cy.location("pathname", { timeout: 20000 }).should("eq", "/member/dashboard");
    cy.contains("Member dashboard", { timeout: 20000 }).should("be.visible");
    cy.contains("Latest postings", { timeout: 20000 }).should("be.visible");

    cy.visit("/member/scores/post");
    cy.contains("Member posting flow", { timeout: 20000 }).should("be.visible");
    cy.contains("span", "Facility").parent().find("select").select("Cedar Irons Golf Club");
    cy.contains("span", "Tee")
      .parent()
      .find("select")
      .should(($select) => {
        expect(String($select.val() ?? "")).to.not.equal("");
      });
    cy.contains("button", "Continue").click();

    cy.contains("span", "Gross score").parent().find("input").type(grossScore);
    cy.contains("button", "Continue").click();

    cy.contains("Review", { timeout: 20000 }).should("be.visible");
    cy.contains("button", "Post score").click();

    cy.location("pathname", { timeout: 20000 }).should("eq", "/member/scores/history");
    cy.location("search", { timeout: 20000 }).should("include", "posted=1");
    cy.contains("Score posted. Handicap index recalculation is in motion.", { timeout: 20000 }).should("be.visible");
    cy.contains(grossScore).should("be.visible");
  });
});

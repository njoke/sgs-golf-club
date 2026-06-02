describe("member smoke", () => {
  it("renders member dashboard and posts a score", () => {
    const grossScore = String(101 + (Date.now() % 7));

    cy.loginAsMember("/member/dashboard");
    cy.contains("Member dashboard").should("be.visible");
    cy.contains("Latest postings").should("be.visible");

    cy.visit("/member/scores/post");
    cy.contains("Member posting flow").should("be.visible");
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

    cy.contains("Review").should("be.visible");
    cy.contains("button", "Post score").click();

    cy.url().should("include", "/member/scores/history?posted=1");
    cy.contains("Score posted. Handicap index recalculation is in motion.").should("be.visible");
    cy.contains(grossScore).should("be.visible");
  });
});

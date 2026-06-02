function getStoredClubId() {
  return cy.window().then((win) => {
    const storedUser = JSON.parse(win.localStorage.getItem("sgs_user") || "{}");
    expect(storedUser.clubIds?.[0], "primary club id").to.be.a("string");
    return storedUser.clubIds[0] as string;
  });
}

describe("admin account management", () => {
  it("manages membership types and club contacts", () => {
    const membershipType = `TMP${Date.now()}`;
    const contactName = "Cypress Contact";
    const contactEmail = `cypress-${Date.now()}@example.com`;

    cy.loginAsAdmin("/dashboard");
    cy.location("pathname", { timeout: 20000 }).should("eq", "/dashboard");

    getStoredClubId().then((clubId) => {
      cy.visit(`/manage/${clubId}/account`);
      cy.contains("Account workspace", { timeout: 20000 }).should("be.visible");
      cy.contains("button", "Edit").click();

      cy.get('input[placeholder="Add code like JR or ASSOC"]').type(membershipType);
      cy.contains("button", "Add type").click();
      cy.contains("button", `${membershipType} ×`).should("be.visible");

      cy.contains("button", "Add contact").click();
      cy.get('input[placeholder="Name"]').last().type(contactName);
      cy.get('input[placeholder="Email"]').last().type(contactEmail);
      cy.get('input[placeholder="Phone"]').last().type("(206) 555-0101");
      cy.get('input[placeholder="City"]').last().type("Seattle");
      cy.get('input[placeholder="State"]').last().type("WA");
      cy.get('input[placeholder="Postal code"]').last().type("98101");

      cy.contains("button", "Save").click();
      cy.contains("Club account updated.", { timeout: 20000 }).should("be.visible");
      cy.contains(membershipType).should("be.visible");
      cy.contains(contactName).should("be.visible");
      cy.contains(contactEmail).should("be.visible");

      cy.contains("button", "Edit").click();
      cy.contains("button", `${membershipType} ×`).click();
      cy.get(`input[value="${contactEmail}"]`).closest("article").within(() => {
        cy.contains("button", "Remove").click();
      });
      cy.contains("button", "Save").click();

      cy.contains("Club account updated.", { timeout: 20000 }).should("be.visible");
      cy.contains(membershipType).should("not.exist");
      cy.contains(contactEmail).should("not.exist");
    });
  });
});

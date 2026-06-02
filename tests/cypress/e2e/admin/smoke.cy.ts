function isoDateOffset(daysFromToday: number): string {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + daysFromToday);
  return value.toISOString().slice(0, 10);
}

function getStoredClubId() {
  return cy.window().then((win) => {
    const storedUser = JSON.parse(win.localStorage.getItem("sgs_user") || "{}");
    expect(storedUser.clubIds?.[0], "primary club id").to.be.a("string");
    return storedUser.clubIds[0] as string;
  });
}

function getCedarIronsMaleTeeSelect() {
  return cy
    .contains("h3", "Cedar Irons Golf Club")
    .closest("article")
    .contains("span", "Default male tee")
    .parent()
    .find("select");
}

describe("admin smoke", () => {
  it("renders admin lanes and updates club plus home-course settings", () => {
    const temporaryWebsite = `https://smoke-${Date.now()}.example.com`;

    cy.loginAsAdmin("/dashboard");
    cy.contains("Admin dashboard").should("be.visible");
    cy.contains("View roster").click();
    cy.contains("Club membership").should("be.visible");

    getStoredClubId().then((clubId) => {
      cy.visit(`/manage/${clubId}/account`);
      cy.contains("Account workspace").should("be.visible");
      cy.contains("button", "Edit").click();

      cy.contains("span", "Website")
        .parent()
        .find("input")
        .invoke("val")
        .then((rawValue) => {
          const originalWebsite = String(rawValue ?? "");

          cy.contains("span", "Website").parent().find("input").clear();
          cy.contains("span", "Website").parent().find("input").type(temporaryWebsite);
          cy.contains("button", "Save").click();
          cy.contains("Club account updated.").should("be.visible");

          cy.contains("button", "Edit").click();
          cy.contains("span", "Website").parent().find("input").clear();
          if (originalWebsite) {
            cy.contains("span", "Website").parent().find("input").type(originalWebsite);
          }
          cy.contains("button", "Save").click();
          cy.contains("Club account updated.").should("be.visible");
        });

      cy.contains("a", "Home courses").click();
      cy.contains("Facility and tee defaults").should("be.visible");

      getCedarIronsMaleTeeSelect()
        .invoke("val")
        .then((rawValue) => {
          const originalValue = String(rawValue ?? "");

          getCedarIronsMaleTeeSelect()
            .find("option")
            .then(($options) => {
              const alternateValue = Array.from($options)
                .map((option) => option.value)
                .find((value) => value && value !== originalValue);

              expect(alternateValue, "alternate male tee").to.be.a("string");

              getCedarIronsMaleTeeSelect().select(alternateValue as string);
              getCedarIronsMaleTeeSelect().should("have.value", alternateValue as string);
              getCedarIronsMaleTeeSelect().select(originalValue);
              getCedarIronsMaleTeeSelect().should("have.value", originalValue);
            });
        });
    });
  });

  it("creates a tournament, registers a member, and manages registrations", () => {
    const tournamentName = `Cypress Smoke ${Date.now()}`;
    const startDate = isoDateOffset(21);
    const endDate = isoDateOffset(22);
    const registrationOpenAt = isoDateOffset(-1);
    const registrationCloseAt = isoDateOffset(14);

    cy.loginAsAdmin("/tournaments/create");
    cy.contains("Set event, window, eligibility").should("be.visible");

    cy.contains("span", "Name").parent().find("input").type(tournamentName);
    cy.contains("span", "Description")
      .parent()
      .find("textarea")
      .type("Cypress smoke test tournament");
    cy.contains("span", "Start date").parent().find("input").type(startDate);
    cy.contains("span", "End date").parent().find("input").type(endDate);
    cy.contains("span", "Course").parent().find("select").select("Cedar Irons Golf Club");
    cy.contains("span", "Registration open").parent().find("input").type(registrationOpenAt);
    cy.contains("span", "Registration close").parent().find("input").type(registrationCloseAt);
    cy.contains("span", "Max players").parent().find("input").type("24");
    cy.contains("span", "Entry fee").parent().find("input").type("45");
    cy.contains("button", "Publish and open").click();

    cy.url().should("match", /\/tournaments\/[^/]+\/registrations$/);
    cy.contains("Registration management").should("be.visible");
    cy.contains(tournamentName).should("be.visible");
    cy.url().then((url) => {
      cy.wrap(new URL(url).pathname).as("registrationPath");
    });

    cy.loginAsMember("/member/tournaments");
    cy.contains("Browse and register").should("be.visible");
    cy.contains(tournamentName)
      .closest("article")
      .contains("Register now")
      .click();

    cy.contains("Registration form").should("be.visible");
    cy.contains("I agree to tournament terms and conditions.").click();
    cy.contains("button", "Register").click();

    cy.url().should("include", "/member/tournaments?registered=");
    cy.contains("Registration submitted. Status:").should("be.visible");
    cy.contains(tournamentName).should("be.visible");

    cy.get("@registrationPath").then((registrationPath) => {
      cy.loginAsAdmin(String(registrationPath));
      cy.contains("Registration management").should("be.visible");
      cy.contains("Jared Abwawo").should("be.visible");
      cy.contains("Close registration").click();
      cy.contains("Close registration").should("not.exist");
    });
  });
});

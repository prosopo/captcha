/// <reference types="cypress" />
/// <reference types="cypress-promise/register" />

describe("Captchas", () => {
  beforeEach(() => {
    cy.visit("http://localhost:3001");
  });

  it("Captchas load when 'I am human' is pressed", async () => {
    const captchas = await cy.clickIAmHuman().promisify();

    expect(captchas.length).to.be.gt(0);
  });

  it("Number of displayed captchas equals number received in response", async () => {
    const captchas = await cy.clickIAmHuman().promisify();

    cy.get("[data-cy='dots-captcha']")
      .find("div")
      .should("have.length", captchas.length);
  });

  it("Data hashes exist on images and are in the same order as in response", async () => {
    const captchas = await cy.clickIAmHuman().promisify();

    let captchasMatch = true;

    cy.get('[data-cy="captcha-0"]')
      .find("[data-cy='captcha-item']")
      .should("have.length", captchas[0].items.length)
      .each(
        ($el, index) =>
          (captchasMatch =
            captchasMatch && $el.data("hash") === captchas[0].items[index].hash)
      )
      .then(() => expect(captchasMatch).to.be.true);
  });

  // move to component testing later
  it("Can select an item", () => {
    cy.clickIAmHuman();

    cy.get('[data-cy="captcha-0"]')
      .find("[data-cy='captcha-item']")
      .first()
      .click();

    cy.get('[data-cy="captcha-0"]')
      .find("[data-cy='captcha-item']")
      .first()
      .should("have.attr", "class")
      .and("match", /.captchaItemSelected./);
  });

  it("Selected item is added to selected items", () => {
    cy.clickIAmHuman();

    cy.get('[data-cy="button-next"]').click();

    let hash = "";

    cy.get('[data-cy="captcha-1"]')
      .find("[data-cy='captcha-item']")
      .first()
      .click()
      .then(($el) => (hash = $el.data("hash")));

    cy.intercept("POST", "**/solution").as("postSolution");
    cy.get('[data-cy="button-next"]').click();

    cy.wait("@postSolution").then((interception) => {
      const solution = interception.request.body.captchas[1].solution;
      expect(solution).to.have.length(1);
      expect(solution[0]).to.be.eq(hash);
    });
  });

  it("Solution is rejected when incorrect", async () => {
    const captchas = await cy.clickIAmHuman().promisify();

    cy.intercept("POST", "**/solution").as("postSolution");

    captchas.forEach((_, index) => {
      cy.get(`[data-cy='captcha-${index}'] > [data-cy='captcha-item']`).each(
        ($el) => $el.trigger("click")
      );

      cy.get('[data-cy="button-next"]').click();
    });
    
    cy.wait("@postSolution").then(
      (interception) =>
        expect(interception.response!.body.solutionApproved).to.be.false
    );
  });
});

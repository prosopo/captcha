/// <reference types="cypress" />
/// <reference types="cypress-promise/register" />

export {};

declare global {
  namespace Cypress {
    interface Chainable {
      clickIAmHuman(): Cypress.Chainable<any[]>;
    }
  }
}

function clickIAmHuman() {
  cy.intercept("GET", "**/captcha/**").as("getCaptcha");
  cy.get("[data-cy='button-human']").click();

  return cy
    .wait("@getCaptcha")
    .then((interception) =>
      interception.response!.body.captchas.map(({ captcha }) => captcha)
    )
}

Cypress.Commands.addAll({ clickIAmHuman });

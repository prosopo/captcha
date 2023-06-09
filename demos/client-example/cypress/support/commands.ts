/// <reference types="cypress" />
/// <reference types="cypress-promise/register" />

export {}

declare global {
    namespace Cypress {
        interface Chainable {
            clickIAmHuman(): Cypress.Chainable<any[]>
        }
    }
}

const buttonXPath = '//*[@id="root"]/div/div/div/div/div/div[3]/div[2]/div/div[1]/div/div[1]/div[1]/span/input'

function clickIAmHuman() {
    cy.intercept('GET', '**/captcha/**').as('getCaptcha')
    cy.xpath(buttonXPath).click()

    return cy
        .wait('@getCaptcha')
        .then((interception) => interception.response!.body.captchas.map(({ captcha }) => captcha))
}

Cypress.Commands.addAll({ clickIAmHuman })

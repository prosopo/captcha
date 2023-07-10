// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
/// <reference types="cypress" />
/// <reference types="cypress-promise/register" />

export {}

declare global {
    namespace Cypress {
        interface Chainable {
            clickIAmHuman(): Cypress.Chainable<any[]>
            captchaImages(): Cypress.Chainable<JQuery<HTMLElement[]>>
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

function captchaImages() {
    cy.xpath("//p[contains(text(),'images containing')]")
        .should('be.visible')
        .wait(2000)
        .parent()
        .parent()
        .children()
        .next()
        .next()
        .children()
        .first()
        .children()
        .as('captchaImages')
    return cy.get('@captchaImages')
}

Cypress.Commands.addAll({ clickIAmHuman, captchaImages })

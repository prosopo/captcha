// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { Captcha, CaptchaWithProof } from '@prosopo/types'
import { at } from '@prosopo/util'
import Chainable = Cypress.Chainable
import { SolutionRecord } from '@prosopo/types-database'

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable<Subject = any> {
            clickIAmHuman(): Cypress.Chainable<Captcha[]>
            captchaImages(): Cypress.Chainable<JQuery<HTMLElement>>
            clickCorrectCaptchaImages(captcha: Captcha): Chainable<JQuery<Node>>
            getSelectors(captcha: Captcha): Cypress.Chainable<string[]>
            clickNextButton(): Cypress.Chainable<JQuery<Node>>
            honeypotExists(): Chainable<boolean>
            checkHoneypot(): Chainable<boolean>
            stubBotdDetect(): Chainable<void>
        }
    }
}

export const checkboxClass = '[type="checkbox"]'
function clickIAmHuman(): Cypress.Chainable<Captcha[]> {
    cy.intercept('GET', '**/prosopo/provider/captcha/**').as('getCaptcha')
    cy.log('Clicking I am human checkbox')
    cy.get(checkboxClass, { timeout: 12000 }).first().click()

    return cy
        .wait('@getCaptcha', { timeout: 36000 })
        .its('response')
        .then((response) => {
            expect(response).to.not.be.undefined
            expect(response?.statusCode).to.equal(200)
            expect(response?.body).to.have.property('captchas')
            const captchas = response?.body.captchas.map(({ captcha }: { captcha: CaptchaWithProof }) => captcha)
            console.log('-----------------------------captchas', captchas, 'length', captchas.length)
            expect(captchas).to.have.lengthOf(2)
            expect(captchas[0]).to.have.property('items')
            console.log(
                '-----------------------------captchas[0].items',
                captchas[0].items,
                'length',
                captchas[0].items.length
            )
            expect(captchas[0].items).to.have.lengthOf(9)
            return captchas
        })
        .as('captchas')
}

function captchaImages(): Cypress.Chainable<JQuery<HTMLElement>> {
    return (
        cy
            .xpath("//p[contains(text(),'images containing')]", { timeout: 4000 })
            .should('be.visible')
            .parent()
            .parent()
            .children()
            .next()
            //.next()
            .children()
            .first()
            .children()
            .as('captchaImages')
    )
}

function getSelectors(captcha: Captcha) {
    cy.wrap({ captcha })
        .then(({ captcha }) => {
            cy.get<SolutionRecord[]>('@solutions').then((solutions) => {
                let selectors: string[] = []
                // Get the index of the captcha in the solution records array
                const captchaIndex = solutions.findIndex(
                    (testSolution) => testSolution.captchaContentId === captcha.captchaContentId
                )
                if (captchaIndex !== -1) {
                    const solution = at(solutions, captchaIndex).solution
                    selectors = captcha.items
                        .filter((item) => solution.includes(item.hash))
                        // create a query selector for each image that is a solution
                        // drop https from the urls as this is what procaptcha does (avoids mixed-content warnings, e.g. resources loaded via a mix of http / https)
                        .map((item) => `img[src="${item.data.replace(/^http(s)*:\/\//, '//')}"]`)
                } else {
                    console.log('Unsolved captcha or captcha with zero solutions')
                }
                return selectors
            })
        })
        .as('selectors')
    return cy.get('@selectors')
}

function clickCorrectCaptchaImages(captcha: Captcha): Chainable<JQuery<HTMLElement>> {
    return cy.captchaImages().then(() => {
        cy.getSelectors(captcha).then((selectors: string[]) => {
            console.log('captchaId', captcha.captchaId, 'selectors', selectors)
            // Click the correct images
            return cy.get(selectors.join(', ')).then((elements) => {
                if (elements.length > 0) {
                    return cy
                        .wrap(elements)
                        .click({ multiple: true })
                        .then(() => {
                            cy.clickNextButton()
                        })
                } else {
                    console.log('No images to select')
                    return cy.clickNextButton()
                }
            })
        })
    })
}

function checkHoneypot(): Chainable<boolean> {
    return cy.get('input#firstname').then((input) => {
        const value = input.val() as string
        return value.trim() !== ''
    })
}

function honeypotExists(): Chainable<boolean> {
    return cy.document().then((doc) => {
        return cy
            .window()
            .should('have.property', 'document')
            .then(() => {
                const elementExists = doc.querySelector('input#firstname') !== null
                return elementExists
            })
    })
}

function clickNextButton() {
    cy.intercept('POST', '**/prosopo/provider/solution').as('postSolution')
    // Go to the next captcha or submit solution
    return cy.get('[data-cy="button-next"]').click()
}

function stubBotdDetect(): void {
    // Passing a fixture .js filed does not work as cypress does not know how to interpret it
    // https://github.com/cypress-io/cypress/issues/1271
    cy.intercept('GET', '**/procaptcha-frictionless/dist/botDetection.js*', {
        headers: {
            'content-type': 'application/javascript',
        },
        body: 'export const botDetection = { detectBot: async () => { return false }};',
    }).as('mockBotDetection')
}

Cypress.Commands.addAll({
    clickIAmHuman,
    captchaImages,
    clickCorrectCaptchaImages,
    getSelectors,
    clickNextButton,
    checkHoneypot,
    stubBotdDetect,
    honeypotExists,
})

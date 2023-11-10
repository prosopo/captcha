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
import { CaptchaSolutionBodyType, CaptchaWithProof } from '@prosopo/types'
import { at } from '@prosopo/util'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Cypress {
        interface Chainable<Subject = any> {
            clickIAmHuman(): Cypress.Chainable<CaptchaWithProof[]>
            captchaImages(): Cypress.Chainable<JQuery<Node>>
            clickCorrectCaptchaImages(
                solutions: { captchaContentId: string; solution: string[] }[],
                captchas: any[]
            ): Cypress.Chainable<string[][]>
            submitCaptchaSolution(): Cypress.Chainable<CaptchaSolutionBodyType>
        }
    }
}

const buttonXPath = '//*[@id="root"]/div/div/div/div/div/div[3]/div[2]/div/div[1]/div/div[1]/div[1]/span/input'

function clickIAmHuman(): Cypress.Chainable<CaptchaWithProof[]> {
    cy.intercept('GET', '**/captcha/**').as('getCaptcha')

    return (
        cy
            .xpath(buttonXPath)
            .click()
            .wait('@getCaptcha')
            .its('request.body')
            .should('include', 'captchas')
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            .then((interception) => interception.response?.body.captchas.map(({ captcha }) => captcha))
    )
}

function captchaImages(): Cypress.Chainable<JQuery<Node>> {
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

function clickCorrectCaptchaImages(
    solutions: { captchaContentId: string; solution: string[] }[],
    captchas: any[]
): Cypress.Chainable<string[][]> {
    const foundSolutions: string[][] = []
    // Get the second captcha content Id
    for (const captcha of captchas) {
        const captchaIndex = solutions.findIndex(
            (testSolution) => testSolution.captchaContentId === captcha.captchaContentId
        )
        let solution: string[] = []
        if (captchaIndex !== -1) {
            solution = at(solutions, captchaIndex).solution
            for (const item of captcha.items) {
                if (solution.includes(item.hash)) {
                    // get the image based on the image src
                    cy.get(`img[src="${item.data}"]`).click()
                }
            }
        }
        foundSolutions.push(solution)
        // break if we're on the last captcha
        if (captcha === captchas[captchas.length - 1]) {
            break
        }

        // Go to the next captcha
        cy.get('[data-cy="button-next"]').click()
    }
    return cy.wrap(foundSolutions)
}

function submitCaptchaSolution(): Cypress.Chainable<CaptchaSolutionBodyType> {
    cy.intercept('POST', '**/solution').as('postSolution')
    // Submit the solution
    return cy
        .get('[data-cy="button-next"]')
        .click()
        .wait('@postSolution')
        .its('request.body')
        .should('include', 'captchas')
        .then((interception) => {
            return interception.request.body as CaptchaSolutionBodyType
        })
}

Cypress.Commands.addAll({ clickIAmHuman, captchaImages, clickCorrectCaptchaImages, submitCaptchaSolution })

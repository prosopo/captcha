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
import '@cypress/xpath'
import { ProsopoDatasetError } from '@prosopo/common'
import { datasetWithSolutionHashes } from '@prosopo/datasets'
import type { Captcha } from '@prosopo/types'
import { at } from '@prosopo/util'
import { checkboxClass } from '../support/commands.js'

describe('Captchas', () => {
    beforeEach(() => {
        const solutions = datasetWithSolutionHashes.captchas.map((captcha) => ({
            captchaContentId: captcha.captchaContentId,
            solution: captcha.solution,
        }))

        if (!solutions) {
            throw new ProsopoDatasetError('DATABASE.DATASET_WITH_SOLUTIONS_GET_FAILED', {
                context: { datasetWithSolutionHashes },
            })
        }
        cy.intercept('/dummy').as('dummy')

        // visit the base URL specified on command line when running cypress
        return cy.visit(Cypress.env('default_page')).then(() => {
            cy.get(checkboxClass).should('be.visible')
            // wrap the solutions to make them available to the tests
            cy.wrap(solutions).as('solutions')
        })
    })

    it("Captchas load when 'I am human' is pressed", () => {
        cy.clickIAmHuman().then((captchas) => {
            expect(captchas.length).to.be.gt(0)
        })
    })

    it('Number of displayed captchas equals number received in response', () => {
        cy.clickIAmHuman().then((captchas: Captcha[]) => {
            cy.wait(2000)
            cy.captchaImages().then(() => {
                console.log("captchas in 'Number of displayed captchas equals number received in response'", captchas)
                cy.get('@captchaImages').should('have.length', at(captchas, 0).items.length)
            })
        })
    })

    // move to component testing later
    it('Can select an item', () => {
        cy.clickIAmHuman().then(() => {
            cy.wait(2000)
            cy.captchaImages().then(() => {
                cy.get('@captchaImages').first().click()
                cy.get('@captchaImages').first().siblings().first().should('have.css', 'opacity', '1')
            })
        })
    })

    //
    // it('Solution is rejected when incorrect', () => {
    //     const captchas = await cy.clickIAmHuman().promisify()
    //
    //     cy.intercept('POST', '**/solution').as('postSolution')
    //
    //     captchas.forEach((_, index) => {
    //         cy.get(`[data-cy='captcha-${index}'] > [data-cy='captcha-item']`).each(($el) => $el.trigger('click'))
    //
    //         cy.get('[data-cy="button-next"]').click()
    //     })
    //
    //     cy.wait('@postSolution').then(
    //         (interception) => expect(interception.response!.body.solutionApproved).to.be.false
    //     )
    // })
})

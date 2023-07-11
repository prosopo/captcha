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
import '@cypress/xpath'
describe('Captchas', () => {
    beforeEach(() => {
        cy.visit('http://localhost:3001')
    })

    it("Captchas load when 'I am human' is pressed", async () => {
        const captchas = await cy.clickIAmHuman().promisify()
        expect(captchas.length).to.be.gt(0)
    })

    it('Number of displayed captchas equals number received in response', async () => {
        const captchas = await cy.clickIAmHuman().promisify()
        cy.wait(2000)
        cy.captchaImages().should('have.length', captchas.length)
    })

    // it('Data hashes exist on images and are in the same order as in response', async () => {
    //     const captchas = await cy.clickIAmHuman().promisify()
    //
    //     let captchasMatch = true
    //
    //     cy.get('[data-cy="captcha-0"]')
    //         .find("[data-cy='captcha-item']")
    //         .should('have.length', captchas[0].items.length)
    //         .each(($el, index) => (captchasMatch = captchasMatch && $el.data('hash') === captchas[0].items[index].hash))
    //         .then(() => expect(captchasMatch).to.be.true)
    // })

    // move to component testing later
    it('Can select an item', async () => {
        await cy.clickIAmHuman().promisify()
        cy.wait(2000)
        cy.captchaImages().first().click()
        cy.captchaImages().first().siblings().first().should('have.css', 'opacity', '1')
    })

    // it('Selected item is added to selected items', () => {
    //     cy.clickIAmHuman()
    //
    //     cy.get('[data-cy="button-next"]').click()
    //
    //     let hash = ''
    //
    //     cy.get('[data-cy="captcha-1"]')
    //         .find("[data-cy='captcha-item']")
    //         .first()
    //         .click()
    //         .then(($el) => (hash = $el.data('hash')))
    //
    //     cy.intercept('POST', '**/solution').as('postSolution')
    //     cy.get('[data-cy="button-next"]').click()
    //
    //     cy.wait('@postSolution').then((interception) => {
    //         const solution = interception.request.body.captchas[1].solution
    //         expect(solution).to.have.length(1)
    //         expect(solution[0]).to.be.eq(hash)
    //     })
    // })
    //
    // it('Solution is rejected when incorrect', async () => {
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

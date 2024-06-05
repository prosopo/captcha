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
import '@cypress/xpath'
import { Captcha } from '@prosopo/types'
import { ProsopoDatasetError } from '@prosopo/common'
import { checkboxClass, honeypotSelector } from '../support/commands.js'
import { datasetWithSolutionHashes } from '@prosopo/datasets'

const checkAndClickCaptchas = () => {
    cy.captchaImages().then(() => {
        cy.get('@captchas')
            .each((captcha: Captcha) => {
                cy.clickCorrectCaptchaImages(captcha)
            })
            .then(() => {
                cy.get("input[type='checkbox']").first().should('be.checked')
            })
    })
}

describe('Honeypot Field Tests', () => {
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
        cy.wrap(solutions).as('solutions')
    })

    it('BotD catch (no mocks, do not fill honeypot)', () => {
        cy.visit(Cypress.env('default_page')).then(() => {
            cy.get(checkboxClass).should('be.visible')
            cy.get(honeypotSelector).should('have.value', '')
            cy.window().its('__botDetected').should('be.true')
            cy.clickIAmHuman().then(checkAndClickCaptchas)
        })
    })

    it('Not bot from BotD but caught by honeypot (mock BotD, fill honeypot)', () => {
        cy.stubBotdDetect()
        cy.visit(Cypress.env('default_page')).then(() => {
            cy.get(checkboxClass).should('be.visible')
            cy.wait('@mockBotDetection')
            cy.window().its('__botDetected').should('be.false')
            cy.get(honeypotSelector).type('I am a bot', { force: true })
            cy.get(checkboxClass, { timeout: 12000 }).first().click()
            cy.get(honeypotSelector).should('have.value', 'I am a bot')
            cy.clickIAmHuman().then(checkAndClickCaptchas)
        })
    })

    it('Not caught by BotD or honeypot (mock BotD, do not fill honeypot)', () => {
        cy.stubBotdDetect()
        cy.visit(Cypress.env('default_page')).then(() => {
            cy.get(checkboxClass).should('be.visible')
            cy.wait('@mockBotDetection')
            cy.window().its('__botDetected').should('be.false')
            cy.get(honeypotSelector).should('have.value', '')
            cy.get(checkboxClass, { timeout: 12000 }).first().click()
        })
    })
})

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
import { at } from '@prosopo/util'

export const TESTSOLUTIONS = [
    {
        captchaContentId: '0x77ba6bdfedc563a34580c8b9cbcdec64608fda0ebf93649797af751d91b8e7a2',
        solution: [
            '0x369734d30701d97ded13c95b34bcd81fc63160fce136ae0c2eb7a2457b5b96c5',
            '0x3be8ae584fa11426b8eeac21c87e9f2ab751ab380ec9298b7cd7aed713007ca8',
            '0x967a0107da9f2b1658fea482111dcae32b1bc544da0ee5a3797d758937872ceb',
        ],
    },
    {
        captchaContentId: '0x0460173e77b2280224c8bc409cfdfcae8f77314e535a52db38258fafeb7e4670',
        solution: [
            '0x0e5279ccf0f0f956d510b15af0b7a2c2c99b6f28a565ea0d5a367c7dbf992495',
            '0x5a9f32b7cb8b55a7ec138d21260df31a401ed4fbaa67550ede344e240bf277ee',
            '0x7f4313a6d4240e206d7c7f16d368ddf12d5f1d78296fd3de7e91df1d7739a35f',
        ],
    },
    {
        captchaContentId: '0x36b991ffb57cdcb6d5e5b3ec8d34855069357c4d7409e98af6cd9503c6504f60',
        solution: [
            '0x2ee5bac3c390ebff1f400d4da87a877e3efa1054625bd03102596babd3021589',
            '0x7291367a7273dcdd07506634f19679679f4c2b3cfb25e3b662c74a4c75ab2d41',
            '0xef306d5ae594772d9d5bb0729ff7f9ecdff016c21cd07ea9008856b16698dd06',
        ],
    },
    {
        captchaContentId: '0xa3cf080335408e6cb29415ac3bdbf57d9dca2c24b52b7a9e682b209e65d586aa',
        solution: [
            '0x0138ab8b1951c2b36284f6abacfc40cc3ec8280adc38462cc5f6b852e17ffe59',
            '0x0b1539673d659a02a13782745ca98bbb2fed8c95f04621b0aa86e464e4b6773f',
            '0x42f21fc48111aa49236db34cc4c98571dfb145f146a5672640b9c5568edb77c1',
        ],
    },
    {
        captchaContentId: '0xa45af7caacd6a2c19219f0a733c8febf453ef62258f6afa22f7f830f6125d9f2',
        solution: [
            '0x2040f9ce95c6efba06556a3c9a49538a23f0e1d8ace67d06e1bd7a4538fbc014',
            '0x6e0784791bf2edbb348ed69fb8080f69f4c38d3a8169f9204b5600a44bdaa600',
        ],
    },
    {
        captchaContentId: '0xf4416f464d8df14718f0f1dac447d8b7403c9c8eaa3c5da8cf0019a06197b5f3',
        solution: [
            '0x4900a1b4ca395af1c4ea13c52358c8a98d89494ca0a20b251ac9ac16a4fd5377',
            '0x5c7b92f11474f9e2f945652eac2e1a603b81adc470480c49e63bb109e62f6624',
            '0xbafe726567fc5b1b67468f77298e80fcee7c7499c499742328aa025b832bf192',
        ],
    },
    {
        captchaContentId: '0x89916d3a386b0dd3942aa659245bca778467d14ebe509312779c56b8a003f4bc',
        solution: [
            '0x51fd7b3ae31b6141b37cc063626abd5e1823c40d5da988f087bb3fce4a58d05e',
            '0x777ec78a400afa334f16d283803461cbbf814601aea9755b8350683567208172',
            '0xe3166f5e1e6e4445e3dce0e69f9d82306e4727019fde875b94a7a6c617eee119',
        ],
    },
    {
        captchaContentId: '0x7c08a0e5636efa5dff2f8815095ec4390e844e50bfbe63d8e1e1c75ec6540592',
        solution: [
            '0x15a422800b166cde2e9d5ac4ab76bf06909737d7896246a5662f341b8b4f02dc',
            '0x69a472be6e13e4a9b0308b676e4611d45612c684e544758a926b680d74f2a845',
            '0xc0d85d32dffcbf5803e198c30f8fb09fdc9483d799a37383e89011da233744e0',
        ],
    },
    {
        captchaContentId: '0x2089b6232685100ad4318d75f9cc2d5909a0cd2ef49e7b3e314726b25a71c807',
        solution: [
            '0x2b2f347f9ab0799ee4c2f771c7b7e31489fbb03ba14ad609e23cc9ce87ebc40e',
            '0x3d2b4cbb43eb98df71bc9ee3d7665e7937b17771718dd096342ccf9e199596e5',
            '0x61c761e6d4ddd18a685ff1e807f0e078817c09ba1342c2f6621feabb0a1c8c42',
        ],
    },
    {
        captchaContentId: '0x466dcd81d4e1d271cf3b5b0cdacb7417119ce11b2843aea517eb3dda847392a9',
        solution: [
            '0x1bd28987173b26558d5a6abb3bbb7d411eebfdf5a54ff579b2720677883b7538',
            '0x5b1b6833cf2f199e8eacbdd8dd9058de59758ba87e9f3f05e273ad290313d42b',
            '0xc74ef4ec7a5f3d63fca003c0cc687540bf224450c4bc6cd8767b6eff4a4d8ab3',
        ],
    },
    {
        captchaContentId: '0xc96b489a3996dd72f9b58b6bc99b1dc3b1a5c21924163ddf986198e613b12f57',
        solution: [
            '0x021a8d88f76f5f01251695a8e488f676dc970f1e2f7ab8af43b12d2b03b5ae54',
            '0x15a422800b166cde2e9d5ac4ab76bf06909737d7896246a5662f341b8b4f02dc',
            '0xc0d85d32dffcbf5803e198c30f8fb09fdc9483d799a37383e89011da233744e0',
        ],
    },
    {
        captchaContentId: '0x11d9e9d4d6fa3b691c03f52d6eefa6132537a2617f93be0ede03e73ced4ea46b',
        solution: [
            '0x0ff5e407e8964bc59be44e7c69e36ae4bec27e7b2cc4c9145f0d578ac81d2a70',
            '0xacac4785d2d7e298af5479c771f3e3035207a47c814901a8c1c788ebee2c73e6',
            '0xd0b4b9447604200567c67f635d19a1702c7392a42264e90b7f63816eb15adf8a',
        ],
    },
]

describe('Captchas', () => {
    beforeEach(() => {
        // visit the base URL specified on command line when running cypress
        cy.visit('/')
    })

    it("Captchas load when 'I am human' is pressed", async () => {
        cy.clickIAmHuman().then((result: Record<any, any>) => {
            expect(result.length.to.be.gt(0))
        })
    })

    it('Number of displayed captchas equals number received in response', async () => {
        cy.clickIAmHuman().then((captchas) => {
            cy.wait(2000)
            cy.captchaImages().should('have.length', captchas.length)
        })
    })

    // move to component testing later
    it('Can select an item', async () => {
        cy.clickIAmHuman().then(() => {
            cy.wait(2000)
            cy.captchaImages().first().click()
            cy.captchaImages().first().siblings().first().should('have.css', 'opacity', '1')
        })
    })

    it('Selecting the correct images passes the captcha', () => {
        cy.clickIAmHuman().then((captchasResponse) => {
            const captchas = captchasResponse
            const imgSrc = at(at(captchas, 0).captcha.items, 0).data
            // Make sure the images are loaded
            cy.get(`img[src="${imgSrc}"]`).then(() => {
                // solve the captchas
                cy.clickCorrectCaptchaImages(TESTSOLUTIONS, captchas).then((foundSolutions) => {
                    cy.intercept('POST', '**/solution').as('postSolution')
                    // Submit the solution
                    cy.submitCaptchaSolution().then((body) => {
                        for (const [captchaIndex, captcha] of body.captchas.entries()) {
                            if ('solution' in captcha) {
                                const solution: string[] = captcha.solution
                                expect(solution).to.have.length(at(foundSolutions, captchaIndex).length)
                                if (solution && solution.length > 0) {
                                    solution.sort().map((element, solutionIndex) => {
                                        expect(element).to.equal(at(foundSolutions, captchaIndex)[solutionIndex])
                                    })
                                }
                                // get inputs of type checkbox
                                cy.get("input[type='checkbox']").then((checkboxes) => {
                                    expect(Array.from(checkboxes)).to.have.length(1)
                                })
                            }
                        }
                    })
                })
            })
        })
    })
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

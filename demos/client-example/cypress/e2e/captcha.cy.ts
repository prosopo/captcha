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

// This db representation of captchas.json that we use in the demo
const TESTDATASET = {
    datasetId: '0x509c89f39c08a4848ce1968c64a4b8c9639051054c6d01a21d3f8e4561051d39',
    contentTree: [
        [
            '0x77ba6bdfedc563a34580c8b9cbcdec64608fda0ebf93649797af751d91b8e7a2',
            '0x0460173e77b2280224c8bc409cfdfcae8f77314e535a52db38258fafeb7e4670',
            '0x733280d7fe969132786cae78e7414d4f400dd489da2b75739a74288ca8b16b52',
            '0x5073c70e3c1a89f69b00bd32c06857dbd045d345c2c2be7970c12bba8edaff82',
            '0x36b991ffb57cdcb6d5e5b3ec8d34855069357c4d7409e98af6cd9503c6504f60',
            '0xa3cf080335408e6cb29415ac3bdbf57d9dca2c24b52b7a9e682b209e65d586aa',
            '0x5d07c582890d4a90b021e2c77b5a8341ec65e5ce31e8b59670b9378ed33a7f31',
            '0xa45af7caacd6a2c19219f0a733c8febf453ef62258f6afa22f7f830f6125d9f2',
            '0xf4416f464d8df14718f0f1dac447d8b7403c9c8eaa3c5da8cf0019a06197b5f3',
            '0x89916d3a386b0dd3942aa659245bca778467d14ebe509312779c56b8a003f4bc',
            '0xe36eb6b306154f44fcdbe793a60257c474401e8bd8e63da15f9654e831c08eb2',
            '0x7c08a0e5636efa5dff2f8815095ec4390e844e50bfbe63d8e1e1c75ec6540592',
            '0x2089b6232685100ad4318d75f9cc2d5909a0cd2ef49e7b3e314726b25a71c807',
            '0x466dcd81d4e1d271cf3b5b0cdacb7417119ce11b2843aea517eb3dda847392a9',
            '0xe286bba23407a9036b9e60eec7ea41ebfe7f2b1452443da1e9561909534c719d',
            '0x452063fa194844cf1f8f622aa7de46b7c948b1fc38fe87426b3443487a5104ce',
            '0x78374f5795a85c1ff01fc13e60da3992b7054bcc16945a0820e4a58ba881b9ed',
        ],
        [
            '0xfd87321affde04a6ec7bf3144caf399fbbdf827cc5da78b0de40b7babbf3e2b5',
            '0x0e14d3c1d5097c0de854beb33a0a092c88cba0fdb436169e0816146962ae1bc9',
            '0x3cd08790c74c8d21c845697674a49e62e7ffb5c404fb10035614c71f83073b0e',
            '0x12ca33cea794d558fdf6781c77631f784ac1f0d4404e3793f4f03eea65d71d7f',
            '0xbc9311ab9e9d59290d560d68b1202055f7822f131e467f578ced5883d872258f',
            '0xf00b61d2bda3fa24237a69a95058e2b04ab98a3e4d488ed78b30675a8dc71b60',
            '0x8e20454b415095f8e63ae228c03f20f9b43a6fac0069aee05dd4e1f7fa855c27',
            '0x47b85cb3608606821346520902d4d5315bd0d1d1c207de889ec815c29a353977',
            '0x3949da7d36b4419db8d999bc04fbe2f8282bf41e995713b26753ee94a098b10a',
        ],
        [
            '0xf71e227b32c774aeb34913c3253e3a6ead8486ad3bfb3dfcea18c7b4073bca6d',
            '0x64df38bf3eaabb1296e0296f57731007599768d1f603409e341003bb706af25d',
            '0xe2115d09d60feb692881ba976de0ed9a0a9875c6c4d91da5cb7f0a3af0259305',
            '0xbf868fac9f13f106a093608641c5160aab1165d750711cf699f6909a251870e9',
            '0x468c56bddc898d67ea3d2fc9328365ef54edc8d98d79cfbbe2d8194fed694040',
        ],
        [
            '0xa0d135202e510fbc014bfb4d988f104a088b9be7d6c8f754980cf05fd98ef755',
            '0x6897bdf64c97483f61349695ad1e35fd254002ff3aec187fca33d1b735b551b0',
            '0xe5ad279faead5f79ba4b9db2381144f82c14b12de4e68ca0efac7e6eb9fedf9a',
        ],
        [
            '0x1ad2d9ec9ce6ef08ece695fe8a57dddac07eefd0ee7b52dd43802ce64ffb0f7a',
            '0x43412e15a86e314b205c63b890507a892dc726471e677241c9d6900c04f166b6',
        ],
        ['0xd205d9428ab45ba9cb22b6d8c96378afc1529dc8bcbbf23a998e5c713d0e04da'],
    ],
    datasetContentId: '0xfdb5c26d6300e44a15db0e8b24a19f61fa4042c796ef5c20cd85afb12a7fcbfe',
    format: 'SelectAll',
    solutionTree: [
        [
            '0xf96f89b2792512ec092ead208301f55ba18023ab7e02bec26c32fe888277cc45',
            '0x5d417991939a866abddffec672850be406e31985221914e9b3bbb4eeed57d13b',
            '0xe8b23c8c586d8690ca041f08e3b095d42f4bae64889d9ec02ad8567ac14a0b3f',
            '0x3a2b2f78e044f1e31ce07546b11f4653084629980fc96366e8cb8ac4104638ab',
            '0x683292a791c937e5e9be6f2fe0ac708deb4726af4e37c71cacc36f6371c3a088',
            '0x9ad2b46ce33db79f62679a0d0c4262dfff9b359337243d50e47479ae46e4ca8e',
            '0xe432cccade22ef8f9d3bfa97d706cae0e2c8138dddcb563ffdc05522dcad864d',
            '0x6cb3449c723ca8f419104446ccda1f98f7cf9eb06a88ecebdf1ba0f5d9228c40',
            '0x3bacf645655004bd36c56d3215ff0e1925fdc4241a41fdbb711d4222d3b56af3',
            '0x723e7c158ce1621dafd2785996fce297ead3bcf6efb2e3f77a090bd83c8b9362',
            '0x948e46a1311e9a89ff1bbbaf79ac682c9a0c74ab64f742f4501364a1e82dca15',
            '0xc9d80c281e124d55441b394bec7d6a64e35c4409d57e37bcb9b9748066b095d6',
            '0xd0d357d973f3971fa5431d6bcec9819cb2363b1e6d5d585d5bf97f4f18ac76a5',
            '0x8683a18e05a9eefb959ba41374f2ef208484079405e9c098910f9d9a4cf60ddf',
            '0x43828174c4c62e82cd7be31465df33f10c6de4301d02feeff8ca15cc26ecd3bb',
            '0xfbc6d9acb0bc751f3a63682e1a960b74f97fd30b20b633b0acd39e2a4aba1a9c',
            '0x02023d68601bf5a2dc97cf62a7c9349a91132d855f320693c3372546ce21f0d1',
        ],
        [
            '0x38054dca5f875ca7046b0e41c66268c63e51bd8aae96c9f28d3411c2663af043',
            '0x92f56c8cf7802cbc975af6cb9d64d512c498920d011a60d3dee4ed6695635d00',
            '0xe8d92277ee249470d8fc81fda881fa1730935b226ded3203a60b766fd946e76b',
            '0x3012c70e83d44bd773a244c93d14b9596669dcdfd7844cb5f48802bdb6863d0a',
            '0x8cc106f74d57de1327824ac9f47a14605cfdcb48f301a256ebe98044d041b0c5',
            '0xc649acab9bb04ac1ff3dbdc9b60e77de0186575a1591d4b6b714020973daa078',
            '0xfc89de475439f142a4183e94c12b6e8f7e80d9a298756a6c72f47cb46e5f80ee',
            '0x55045b28a37e39c737b19c0eedd3e7ac4d72c2006d65a4d01eee54dd0dd2595c',
            '0x898942439cb839bb42135d4eab681755b1a01b0bced08bafdbfe2c289cb57d0b',
        ],
        [
            '0x290a913532afd0a76d077f926f854f60ee025dc122f325ed5d8e42786b3c99d8',
            '0xfd69b6abbed9ad132a4fdc5dc54288d9a1344e7c4ebbfac19a8d36f08d0f5396',
            '0x5706a56de846847b581401197c98885a52af2bdb6f24a4a64b5c9403e3ebea14',
            '0x7172278e164d0241278fda6240792aa9445d10cc0ce9c5dc3450486ac6afcfa6',
            '0xe07260a9bde1d07295a56a5b0ec097c85b45e8d69b8e47ca8b2f07c2f6dd06a6',
        ],
        [
            '0x0f6dec832ac9260889a02f877acc18da138ade688f42d49e7070592e444a5705',
            '0x1025f358010beb66b526da3d3fdac2d0b21dc3f0e8ab7d29106264839cea0c6d',
            '0x6e73362cf08112d4dcaa2cfd5f2a6f918fda58dc42d6c1901eb9e461767f455d',
        ],
        [
            '0x29f737d6bf117c90c45ccaaba514aa63a0e792f80a7d855b14507d0cd2826e02',
            '0x46e2790e5b0ae6277f71acc40c28d89ca3c1ad9130fd1b1d51e965ffcbc89d88',
        ],
        ['0x019e4ee46cd8f3f0e28d6e6c54c56116063ff404d0e685c4cfba7b19c932465c'],
    ],
}

const TESTSOLUTIONS = [
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
        cy.visit('http://localhost:9230')
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

    it('Selecting the correct images passes the captcha', () => {
        let captchas
        cy.clickIAmHuman().then((captchasResponse) => {
            captchas = captchasResponse
            // solve the captchas
            cy.clickCorrectCaptchaImages(TESTSOLUTIONS, captchas).then((foundSolutions) => {
                cy.intercept('POST', '**/solution').as('postSolution')
                // Submit the solution
                cy.get('[data-cy="button-next"]').click()
                cy.wait('@postSolution').then((interception) => {
                    for (const [captchaIndex, captcha] of interception.request.body.captchas.entries()) {
                        if ('solution' in captcha) {
                            const solution = captcha.solution
                            expect(solution).to.have.length(foundSolutions[captchaIndex].length)
                            if (solution && solution.length > 0) {
                                // Only way to debug is by throwing an error
                                // throw new Error(
                                //     `solution: ${JSON.stringify(solution)} foundSolutions: ${JSON.stringify(
                                //         foundSolutions[index]
                                //     )}`
                                // )
                                solution.sort().map((element, solutionIndex) => {
                                    expect(element).to.equal(foundSolutions[captchaIndex][solutionIndex])
                                })
                            }
                            // get inputs of type checkbox
                            cy.get("input[type='checkbox']").then((checkboxes) => {
                                expect(checkboxes).to.have.length(1)
                                // make sure the first checkbox is checked
                                //TODO identify why this doesn't work in GitHub actions
                                // expect(checkboxes[0]).to.be.checked
                            })
                        }
                    }
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

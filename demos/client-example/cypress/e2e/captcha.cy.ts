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
            '0xc96b489a3996dd72f9b58b6bc99b1dc3b1a5c21924163ddf986198e613b12f57',
            '0x11d9e9d4d6fa3b691c03f52d6eefa6132537a2617f93be0ede03e73ced4ea46b',
            '0xabf3fb82889ee8fccb7898e2aa579306dc60c7c9d931c8c620fbbd1c89402b40',
        ],
        [
            '0xfd87321affde04a6ec7bf3144caf399fbbdf827cc5da78b0de40b7babbf3e2b5',
            '0x0e14d3c1d5097c0de854beb33a0a092c88cba0fdb436169e0816146962ae1bc9',
            '0x3cd08790c74c8d21c845697674a49e62e7ffb5c404fb10035614c71f83073b0e',
            '0x12ca33cea794d558fdf6781c77631f784ac1f0d4404e3793f4f03eea65d71d7f',
            '0xbc9311ab9e9d59290d560d68b1202055f7822f131e467f578ced5883d872258f',
            '0xf00b61d2bda3fa24237a69a95058e2b04ab98a3e4d488ed78b30675a8dc71b60',
            '0x8e20454b415095f8e63ae228c03f20f9b43a6fac0069aee05dd4e1f7fa855c27',
            '0x7081745a48d933d70bba7ab54f988273e33c427237fa98b6377a466b865d0fd6',
            '0xa34401ce70c82d6d7f545b2cfcdd578133b663577d7bc74e1d2374b9098092a5',
        ],
        [
            '0xf71e227b32c774aeb34913c3253e3a6ead8486ad3bfb3dfcea18c7b4073bca6d',
            '0x64df38bf3eaabb1296e0296f57731007599768d1f603409e341003bb706af25d',
            '0xe2115d09d60feb692881ba976de0ed9a0a9875c6c4d91da5cb7f0a3af0259305',
            '0x3f1d63b59205e4c2c62d65ef962bc100981f7763d5581b6ddb7df00b8580eb34',
            '0xd3f4212ce78d694753bd09665510c6158a1bb0001976daae5c404fa5b9816782',
        ],
        [
            '0xa0d135202e510fbc014bfb4d988f104a088b9be7d6c8f754980cf05fd98ef755',
            '0x8fbdbf3b8fee4535e50a92e2d78ee9a8932085a960c987282208f93dc2ddd9c6',
            '0xcf1f6ae73794299197c01ac7b2e08099f98cd7a729ce71a4898e5fcc7ef1a161',
        ],
        [
            '0x5055ec73d52dca5f64c2aac6cc1da52eaada92ac4767d9724b366e0b6eb693e8',
            '0xd3f1e6bee1d1bedee23980ad8e08ec3bb095f6ba1a7c82f62423b545c05751af',
        ],
        ['0xfdb5c26d6300e44a15db0e8b24a19f61fa4042c796ef5c20cd85afb12a7fcbfe'],
    ],
    datasetContentId: '0xfdb5c26d6300e44a15db0e8b24a19f61fa4042c796ef5c20cd85afb12a7fcbfe',
    format: 'SelectAll',
    solutionTree: [
        [
            '0x9d4380dcf2e4b1dc7e864a04364dc48ea84245836209ceb2b7a817ea95c82d11',
            '0x9bc561c35fe71cdea1cea7b42357ce4ca496689bab536370eae8192146944e0a',
            '0xaea6e0a8d82c55fdd51b403d3c9d4f2241fdceaf062e2a6a666781e43e31442d',
            '0x0ed51a53a2e22d7a13bdb476bf9e0074808faabab56ebbd5f70c87d4c1c16c75',
            '0x0c0a21839390cbcb62895d67143ec960fa107ce062af3064ccc9782f2778a460',
            '0x63f8be7a53d91f9ae2e529c76309527f5d288518834efb74b76c5b6054e9adc5',
            '0x29d4808946352ae74979a132cc3cfcf21c253ebb2f2d594efcb104a2eda026da',
            '0xf8b81534cf9e7f0a13dc11056da8cce9201d59d5a8f98492017f19afffe4a005',
            '0x627e61a9db5e19d94d93b4c3d179b10cb029bf6f9c9da420ac417e56cc696543',
            '0x62f298445021c8331afca4ed27ce37214ce281689d37b097b47171c20c5c2906',
            '0xbc158df0f4fbcd689cd5f2949fda1257f79a1a2dc91787f7c782914630188c75',
            '0xb6ed3b24ec02fe618332cb4eb1c2adb5e5db9c71a416dec609a60bff36553e59',
            '0xda1fa7dd2a9076331680cc196ab05a84b2cdb46ecf783dbd7e5db0129814f9d9',
            '0xfc6962d8630e1f3f356b15367875039b0ee038f665df41d56e81e6accf013544',
            '0x7aeb4907722a69f451960ef3737205e6bdc4c462b2507fdcedd00fe5e5b4f8c4',
            '0x10e1652db4155c516f48d46f15534d2b02e8bb898dc8ba596847c14585621307',
            '0x1080f19ac4bfb8685cd2a79837b34e5c022fb496c3d5c6bfe1639a408af6b76f',
        ],
        [
            '0x291196b6e93c2b345a9b3e444074a5375557522454e824f43d6b3b7e8749903e',
            '0x3a727fbaf938bf55b8a1db5ff2d4acc95725134f38cc20d98dd7f67ea68a924c',
            '0x54c2aa87cd7dada36cd072d9e1148f269713c879f580b8c2b9e73ea49a2177d3',
            '0xd9f3cbeb720ccb8c0397671ad0447fd788264ecdf9f43f1e6a5e7a62dc662914',
            '0xca14008a64f7024d1ac2f3c3ec830d2a801a70a0b0d7eb5ac7caa4d268fa999a',
            '0x12c7583675b9a8c417aad14d3cc0f9cf502497f40c4ee770c5b9a9f7a19c673c',
            '0x182c09fc3c29ccdea1160b22fce15282e79d95cee3c1b6c2ada294409cb4a835',
            '0x60a0d064b64ad19243c21597a2c07ca133b238a647e2790a02f454a5359139f9',
            '0x6aa43b4d003329f864585f2ac35f767347f9d06117af944185af2770c08f8703',
        ],
        [
            '0x1b96c56233f5f4063ed0df2d7b779c27d523dd537c68b55a89e56842aa74250d',
            '0xefa0745fb1bb586ff406e57e95fbe326783c474edf3f7d919051a43ec8fe234e',
            '0x14ae9bca70d9e261f611c260f04b95339bd9529ddf99dfa6dddbfcb53273bed6',
            '0xe7eaa6a1d1ce9d9a9b141db53a6aa554475eed9e737817d1f82e24170b1ff23f',
            '0x6c67ca17c6b649b727835d5b8f1cd995582deea8e66c0d61f583b29f37a415fb',
        ],
        [
            '0xe750f00149301bed8539b0a92c127670191144720528524fe6de340d963d9fed',
            '0x307603f222480648db507a57d7c12ddc2933b5779024afca26b08e83efd30818',
            '0xad6ec5d9aeb63b69b0fe9cbb667e0b04b5500aa4b899fb837fa5a98d79424239',
        ],
        [
            '0x0ca7c145a0cd1ecefe8c56af38dde8e4e56c298bdd2848737188750bd1ef414c',
            '0x111335168aff9c5ca573bf1b963b8b71932487a0bd787e864a607700f0da3aea',
        ],
        ['0x509c89f39c08a4848ce1968c64a4b8c9639051054c6d01a21d3f8e4561051d39'],
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

    it.only('Selecting the correct images passes the captcha', () => {
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
                                // make sure the first checkbox is checked
                                expect(checkboxes[0]).to.be.checked
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

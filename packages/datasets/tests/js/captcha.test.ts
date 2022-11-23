// Copyright 2021-2022 Prosopo (UK) Ltd.
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
import { expect } from 'chai'
import {
    Captcha,
    CaptchaItemTypes,
    CaptchaSolution,
    CaptchaTypes,
    CaptchaWithoutId,
    Dataset,
    Item,
    calculateItemHashes,
    compareCaptchaSolutions,
    computeCaptchaHash,
    computeCaptchaSolutionHash,
    computePendingRequestHash,
    matchItemsToSolutions,
    parseAndSortCaptchaSolutions,
    parseCaptchaDataset,
    sortAndComputeHashes,
    verifyProof,
} from '@prosopo/datasets'
import path from 'path'
import { after, it } from 'mocha'

describe('CAPTCHA FUNCTIONS', () => {
    let MOCK_ITEMS: Item[]
    let DATASET: Dataset
    let RECEIVED: CaptchaSolution[]
    let STORED: Captcha[]
    before(async () => {
        MOCK_ITEMS = await calculateItemHashes(
            new Array(9).fill(0).map((_, i) => ({
                data: path.join('http://localhost', `/tests/js/mocks/data/img/01.0${i + 1}.jpeg`),
                type: CaptchaItemTypes.Text,
            }))
        )
        console.log(MOCK_ITEMS)

        const ITEMS = [
            {
                type: CaptchaItemTypes.Text,
                data: 'blah1',
                hash: '0xf50c63a914dac984e8e0ad16673f0c7224422d439ec19342d89ea985bc439040',
            },
            {
                type: CaptchaItemTypes.Text,
                data: 'blah2',
                hash: '0xb22ba232374e4970ff72533bd84a0f4a86a31323518448a7820d08639bdec2f5',
            },
            {
                type: CaptchaItemTypes.Text,
                data: 'blah3',
                hash: '0xe67b75b0c213c04693d9be4992319912ae9317039570221c640e243040b222ac',
            },
            {
                type: CaptchaItemTypes.Text,
                data: 'blah4',
                hash: '0x95bd4e306b9ea73216179900e16a62b247e5f371a60fca72f7af84b314998bf6',
            },
            {
                type: CaptchaItemTypes.Text,
                data: 'blah5',
                hash: '0x70bbf5a7aec5a3bb7109310ff5c4bf0915a504a3c0c7a69f3b514c67bd53f8ca',
            },
            {
                type: CaptchaItemTypes.Text,
                data: 'blah6',
                hash: '0x66e6e346cfb7ecc73d64c5bbc10bd6eea3f55e0ef33037e2ebf8111f59b809be',
            },
            {
                type: CaptchaItemTypes.Text,
                data: 'blah7',
                hash: '0xcf00c099c10c8d8678b29a166798e5720801053a9ac35b52ba623d3a0cebe468',
            },
            {
                type: CaptchaItemTypes.Text,
                data: 'blah8',
                hash: '0x5981107cf8d5ab3a562d79b489ffd2b5b9e5fc0fce67aea550eab292069bbbee',
            },
            {
                type: CaptchaItemTypes.Text,
                data: 'blah9',
                hash: '0x7f54f8853ac73d0590c038075895c59d0c4ef5c31340b34c1dc65cbe1765e0d0',
            },
        ]

        DATASET = {
            format: CaptchaTypes.SelectAll,
            captchas: [
                {
                    captchaId: '0xc3a68449e450122480b498f67779aedbb406346382a48d35f6db8780afe9920d',
                    captchaContentId: '0x01',
                    solution: [],
                    salt: '0x01',
                    target: 'bus',
                    items: ITEMS,
                },
                {
                    captchaId: '0xc904ae6a26bdf248d88dc878fee3fbb2af70e4fb41986b9a42fefb434e2a929b',
                    captchaContentId: '0x01',
                    salt: '0x02',
                    target: 'train',
                    items: ITEMS,
                },
            ],
        }

        RECEIVED = [
            {
                captchaId: '0x65389f35bfda0ce10a80baea75e34c8defc5ec22931ccc5ef66f3c273ba4ec38',
                captchaContentId: '0x01',
                solution: matchItemsToSolutions([0, 1, 2], MOCK_ITEMS),
                salt: '',
            },
            {
                captchaId: '0x138c099916b1877ceba74fbd93a441bc561103b087e3dbe751d486bd854644d3',
                captchaContentId: '0x01',
                solution: matchItemsToSolutions([0, 1, 2], MOCK_ITEMS),
                salt: '',
            },
        ]

        STORED = [
            {
                captchaId: '0x65389f35bfda0ce10a80baea75e34c8defc5ec22931ccc5ef66f3c273ba4ec38',
                captchaContentId: '0x01',
                salt: '0x1',
                items: MOCK_ITEMS,
                target: '',
                solved: true,
            },
            {
                captchaId: '0x138c099916b1877ceba74fbd93a441bc561103b087e3dbe751d486bd854644d3',
                captchaContentId: '0x01',
                salt: '0x2',
                items: MOCK_ITEMS,
                target: '',
                solved: true,
            },
        ]
        console.log(RECEIVED)
    })

    after(async () => {
        process.exit()
    })

    it('Parses a captcha dataset correctly', () => {
        expect(function () {
            parseCaptchaDataset(JSON.parse(JSON.stringify({ ...DATASET })) as JSON)
        }).to.not.throw()
    })

    it('Captcha data set is hashed correctly', () => {
        const dataset = {
            ...DATASET,
            captchas: DATASET.captchas.map((captcha) => ({
                ...captcha,
                items: calculateItemHashes(captcha.items),
            })),
        }
        console.log(dataset)
        const captchaHashes = dataset.captchas.map((captcha) => computeCaptchaHash(captcha, true, true, false))
        expect(captchaHashes[0]).to.equal(dataset.captchas[0].captchaId)
        expect(captchaHashes[1]).to.equal(dataset.captchas[1].captchaId)
    })

    it('Captcha solutions are successfully parsed', () => {
        const captchaSolutions = JSON.parse(
            '[{ "captchaId": "1", "captchaContentId": "1", "solution": ["0x1", "0x2", "0x3"], "salt" : "salt" }, { "captchaId": "2", "captchaContentId": "2", "solution": ["0x1", "0x2", "0x3"], "salt" : "salt" }]'
        ) as JSON

        expect(parseAndSortCaptchaSolutions(captchaSolutions).length).to.equal(2)
    })

    it('Invalid Captcha solutions are not successfully parsed', () => {
        const captchaSolutions = JSON.parse(
            '[{ "captchaId": "1", "salt" : "salt" }, { "captchaId": "2", "solution": ["1", "2", "3"], "salt" : "salt" }]'
        ) as JSON

        expect(function () {
            parseAndSortCaptchaSolutions(captchaSolutions)
        }).to.throw()
    })

    it('Captchas are hashed properly', () => {
        const captcha = {
            solution: matchItemsToSolutions([0], MOCK_ITEMS),
            salt: '0x03',
            target: 'plane',
            items: MOCK_ITEMS,
        } as CaptchaWithoutId

        expect(computeCaptchaHash(captcha, true, true, false)).to.be.a('string')
    })

    it('Captcha solutions are correctly sorted and computed', () => {
        const idsAndHashes = sortAndComputeHashes(RECEIVED, STORED)
        expect(idsAndHashes.every(({ hash, captchaId }) => hash === captchaId)).to.be.true
    })

    it('Captcha solutions are correctly sorted and computed - non matching order', () => {
        const idsAndHashes = sortAndComputeHashes(RECEIVED, [STORED[1], STORED[0]])

        expect(idsAndHashes.every(({ hash, captchaId }) => hash === captchaId)).to.be.true
    })

    it('Matching captcha solutions are correctly compared, returning true', () => {
        expect(compareCaptchaSolutions(RECEIVED, STORED)).to.be.true
    })

    it('Non-matching captcha solutions are correctly compared, throwing an error', () => {
        const stored = [
            {
                ...STORED[0],
                captchaId: '0xe8cc1f7a69f8a073db20ab3a391f38014d299298c2f5b881628592b48df7fbeb',
            },
            STORED[1],
        ]

        expect(() => compareCaptchaSolutions(RECEIVED, stored)).to.throw()
    })

    it('Mismatched length captcha solutions returns false', () => {
        const received = [
            {
                captchaId: '0xe8cc1f7a69f8a073db20ab3a391f38014d299298c2f5b881628592b48df7fbeb',
                captchaContentId: '',
                solution: matchItemsToSolutions([1, 2, 3], MOCK_ITEMS),
                salt: '',
            },
            ...RECEIVED,
        ]
        const stored = [
            {
                captchaId: '0xe8cc1f7a69f8a073db20ab3a391f38014d299298c2f5b881628592b48df7fbeb',
                captchaContentId: '',
                salt: '0x1',
                items: [],
                target: '',
                solved: true,
            },
            STORED[0],
        ]

        expect(compareCaptchaSolutions(received, stored)).to.be.false
    })

    it('Captchas with mismatching solution lengths are marked as incorrect', () => {
        const noSolutions = [
            {
                captchaId: '0xa96deea330d68be31b27b53167842e4ad975b72a8555d607c9cfa16b416848af',
                captchaContentId: '',
                solution: [],
                salt: '',
            },
            {
                captchaId: '0x908747ea61b5920c6bcfe22861adba42ba10dbfbf7daa916b1e94ed43791a43b',
                captchaContentId: '',
                solution: [],
                salt: '',
            },
        ]
        const solutions = [
            {
                // created using [ 2, 5, 7 ] as solution
                captchaId: '0xa96deea330d68be31b27b53167842e4ad975b72a8555d607c9cfa16b416848af',
                captchaContentId: '',
                datasetId: '0xa96deea330d68be31b27b53167842e4ad975b72a8555d607c9cfa16b416848af',
                index: 13,
                items: [],
                salt: '0x01',
                target: 'car',
                solved: true,
            },
            {
                captchaId: '0x908747ea61b5920c6bcfe22861adba42ba10dbfbf7daa916b1e94ed43791a43b',
                captchaContentId: '',
                datasetId: '0x908747ea61b5920c6bcfe22861adba42ba10dbfbf7daa916b1e94ed43791a43b',
                index: 3,
                items: [],
                salt: '0x05',
                target: 'plane',
                solved: true,
            },
        ]
        expect(compareCaptchaSolutions(noSolutions, solutions)).to.be.false
    })

    it('Pending request hash is calculated properly', () => {
        const hash = computePendingRequestHash(['1', '2', '3'], '0x01', '0x02')
        expect(hash).to.equal('0x0c85e41f84c1b6b29ee2f7eae88512caa28fa82c3389fad3b875fd06dcab9da5')
    })

    it('Computes a captcha solution hash correctly', () => {
        const captchaSolution = {
            captchaId: '1',
            salt: '0x01',
            solution: matchItemsToSolutions([1, 2], MOCK_ITEMS),
        } as CaptchaSolution
        const hash = computeCaptchaSolutionHash(captchaSolution)
        expect(hash).to.be.equal('0xebd5fd09ee37613693e6739b75ab38529b4ad77372440de55628945588ce3b1d')
    })

    it('Verifies a valid merkle proof', () => {
        const proof = [
            [
                '0xb2b33ccc7d240ab8ed24b8f77a32fd2825e78972c8a8cea359f11edc9ac26734',
                '0x946e6735cf57db19ed353dfc9b9fb515e219438225706bfcf20366739eb07176',
            ],
            [
                '0xa6597728483934391c473f854ccfbce98c2f93edd9984ea7c473d3c4d86574b5',
                '0x208f6d9d66f06b6859ea00921fe46dc775610330c746f6fa9d9da9bb9cce1409',
            ],
            [
                '0xc0a845f2457f68504398277783c1d4c35ace06296e7ae599114f314cd1168137',
                '0x4d865bc0d29808adac611017b690bc685d8dd166b757cf95b11207ba9510d6b5',
            ],
            [
                '0xc9400eaa4374786917ac6df0ee2481f63a008486d8e10fe00e88f267f9d2a5dd',
                '0xdf2f96bd502a7b1e075f9e8e70ce70a778dbaf81a56ab5bb6570b70afbf626af',
            ],
            [
                '0xa2224c0acf395506f8bbc2635e03abb2ea4b239c3bf93c95379b4823764e0494',
                '0x2add79b6e2c7253a98d751df9df8fae644c3ff761fe4684b836a4338804e017b',
            ],
            ['0xeee6c87e8ad5cd1fc05ea0d8874067d87918f1b141fdabd12352ad59b779cc80'],
        ]
        const leaf = '0xb2b33ccc7d240ab8ed24b8f77a32fd2825e78972c8a8cea359f11edc9ac26734'
        const verification = verifyProof(leaf, proof)
        expect(verification).to.be.true
    })
    it('Fails to verify an invalid merkle proof', () => {
        const proof = [
            [
                '0x41a5470f491204aefc954d5aeec744d30b0a1112c4a86397afe336807f115c16',
                '0xff4b64779f85d48204aea342d1b976a57a31f5f8eaa0f264fc5308f098b0e887',
            ],
            [
                '0x23eef831153a067d5b4376ea7e933bbe21d7382d9c0ce79d7018a05c3281d69a',
                '0xb9f0bdbeff385c4b39172fd7fa9282d136468bee4c35fe55d04bc21010b975aa',
            ],
            [
                '0x867a0a6b3e67c083233988d912ea93a0f71ed01f07e74d720e27e041fb4a229b',
                '0x26698f2a3fc5f93fd51dd8153c8d246eaafa7dd0f215b9c0135d3e41710a14e9',
            ],
            [
                '0x8230f43abcd6e97c6748affa840d31a9ead5733e3c4063e217c6621cd0f98b84',
                '0x97f0025c96ac960a33c551ae6a2a50a3c39045006eed5a896fa8a9463e44ee29',
            ],
            [
                '0xd173b71900767ac305747c2c627dee7d0b95aaeb2324c74ef9316edf2b072de9',
                '0x4d487ca588902640e2867a0da3c1d8525527eb89c8271a8908ee1c4cd642d61c',
            ],
            ['INVALID'],
        ]
        const leaf = '0x41a5470f491204aefc954d5aeec744d30b0a1112c4a86397afe336807f115c16'
        const verification = verifyProof(leaf, proof)
        expect(verification).to.be.false
    })
    it('Fails to verify junk data', () => {
        const proof = 'junk'
        const leaf = '0x41a5470f491204aefc954d5aeec744d30b0a1112c4a86397afe336807f115c16'
        const verification = verifyProof(leaf, [[proof]])
        expect(verification).to.be.false
    })
})

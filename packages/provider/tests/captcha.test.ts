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
import { CaptchaMerkleTree, CaptchaSolution, CaptchaTypes, CaptchaWithoutId, Dataset } from '@prosopo/contract';
import { expect } from 'chai';
import * as path from 'path';
import {
    addHashesToDataset, compareCaptchaSolutions,
    computeCaptchaHash, computeCaptchaHashes, computeCaptchaSolutionHash, computePendingRequestHash,
    parseCaptchaDataset, parseCaptchas, parseCaptchaSolutions
} from '@prosopo/contract';


const DATASET = {
    format: 'SelectAll' as CaptchaTypes,
    captchas: [
        {
            solved: true,
            salt: '0x01',
            target: 'bus',
            items: [
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' }

            ]
        },
        {
            salt: '0x02',
            target: 'train',
            items: [
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' },
                { type: 'text', text: 'blah' }
            ]
        }]
};

describe('CAPTCHA FUNCTIONS', () => {
    it('Parses a captcha dataset correctly', () => {
        expect(function () { parseCaptchaDataset(JSON.parse(JSON.stringify(DATASET)) as JSON); }).to.not.throw();
    });

    it('Captcha data set is hashed correctly', async () => {
        const captchasWithHashes = await computeCaptchaHashes(DATASET.captchas);

        expect(captchasWithHashes[0].captchaId).to.equal('0x5ca830bbf3dcb0b080f6a03636c348a86a045a094ba58d687d347c53d2c9524a');
        expect(captchasWithHashes[1].captchaId).to.equal('0xf371668e49f2b9bfe48e6a1066f0a4155e6604cb721b1aedfc8f50de22fad67b');
    });

    it('Captcha solutions are successfully parsed', () => {
        const captchaSolutions = JSON.parse('[{ "captchaId": "1", "solution": ["0x1", "0x2", "0x3"], "salt" : "salt" }, { "captchaId": "2", "solution": ["0x1", "0x2", "0x3"], "salt" : "salt" }]') as JSON;

        expect(parseCaptchaSolutions(captchaSolutions).length).to.equal(2);
    });

    it('Invalid Captcha solutions are not successfully parsed', () => {
        const captchaSolutions = JSON.parse('[{ "captchaId": "1", "salt" : "salt" }, { "captchaId": "2", "solution": [1, 2, 3], "salt" : "salt" }]') as JSON;

        expect(function () {
            parseCaptchaSolutions(captchaSolutions);
        }).to.throw();
    });

    it('Text Captchas are successfully parsed', () => {
        const captchas = JSON.parse('[{ "captchaId": "1", "solution": [1, 2, 3], "salt" : "salt", "items":[{"text":"a", "type":"text"},{"text":"b", "type":"text"}], "target": "vowels" }, { "captchaId": "2", "salt" : "salt", "items":[{"text":"a", "type":"text"},{"text":"b", "type":"text"}], "target": "vowels" }]') as JSON;

        expect(parseCaptchas(captchas).length).to.equal(2);
    });

    it('Image Captchas are successfully parsed', () => {
        const captchas = JSON.parse('[{ "captchaId": "1", "solution": [1, 2, 3], "salt" : "salt", "items":[{"path": "path", "type": "image"}, {"path": "path", "type": "image"}], "target": "vowels" }, { "captchaId": "2", "salt" : "salt", "items":[{"path": "path", "type": "image"}, {"path": "path", "type": "image"}], "target": "vowels" }]') as JSON;

        expect(parseCaptchas(captchas).length).to.equal(2);
    });

    it('Invalid Captchas are not successfully parsed', () => {
        const captchas = JSON.parse('[{ "captchaId": "1", "solution": [1, 2, 3], "salt" : "salt"}]') as JSON;

        expect(function () {
            parseCaptchas(captchas);
        }).to.throw(/error parsing captcha/);
    });

    it('Captchas are hashed properly', async () => {
        const captcha = {
            solution: [
                5,
                6,
                7
            ],
            salt: '0x03',
            target: 'plane',
            items: [
                {
                    // This test is expected to run in the integration Provider container
                    path: path.join(process.cwd(), '/tests/mocks/data/img/01.01.jpeg'),
                    type: 'image'
                }]
        } as CaptchaWithoutId;

        expect(await computeCaptchaHash(captcha)).to.be.a('string');
    });

    it('Captcha hashes are successfully added to dataset', () => {
        const captchasWithHashes = [
            {
                captchaId: '0x83f378619ef1d3cced90ad760b33d24995e81583b4cd269358fa53b690d560b5',
                salt: '',
                solution: []
            },
            {
                captchaId: '0x0977061f4bca26f49f2657b582944ce7c549862a4be7e0fc8f9a9a6cdb788475',
                salt: '',
                solution: []
            }
        ];
        const tree = new CaptchaMerkleTree();

        tree.build(captchasWithHashes.map((c) => c.captchaId));
        // tree is not required anymore, this could be changed to addHashesToDataset(DATASET, captchasWithHashes)
        const dataset = addHashesToDataset(DATASET, tree);

        expect(dataset.captchas[0].captchaId).to.equal('0x83f378619ef1d3cced90ad760b33d24995e81583b4cd269358fa53b690d560b5');
        expect(dataset.captchas[1].captchaId).to.equal('0x0977061f4bca26f49f2657b582944ce7c549862a4be7e0fc8f9a9a6cdb788475');
    });

    it('Empty dataset and tree throws error', () => {
        expect(function () {
            addHashesToDataset({} as Dataset, new CaptchaMerkleTree());
        }).to.throw(/error hashing dataset/);
    });

    it('Matching captcha solutions are correctly compared, returning true', async () => {
        const received = [
            {
                captchaId:
                    "0xe0a072447a0d212f144d5bc3aad77ef00b3be710605f7a53434c6c6d548549ad",
                solution: [42],
                salt: "",
            },
            {
                captchaId:
                    "0x8a8c81c8baebcda5061a34f25ef9853477d0d78cf4f4712a8cfdf0f79ae2844d",
                solution: [42],
                salt: "",
            },
        ];
        const stored = [
            {
                captchaId:
                    "0xe0a072447a0d212f144d5bc3aad77ef00b3be710605f7a53434c6c6d548549ad",
                salt: "0x1",
                items: [],
                target: "",
                solved: true,
            },
            {
                captchaId:
                    "0x8a8c81c8baebcda5061a34f25ef9853477d0d78cf4f4712a8cfdf0f79ae2844d",
                salt: "0x2",
                items: [],
                target: "",
                solved: true,
            },
        ];

        expect(await compareCaptchaSolutions(received, stored)).to.be.true;
    });

    it('Non-matching captcha solutions are correctly compared, returning false', async () => {
        const received = [
            {
                captchaId:
                    "0xe0a072447a0d212f144d5bc3aad77ef00b3be710605f7a53434c6c6d548549ad",
                solution: [42],
                salt: "",
            },
            {
                captchaId:
                    "0x8a8c81c8baebcda5061a34f25ef9853477d0d78cf4f4712a8cfdf0f79ae2844d",
                solution: [42],
                salt: "",
            },
        ];
        const stored = [
            {
                captchaId:
                    "0x2b0f2acf1f143a938115203ef0b056d02008cc396e0467bce14162477d546bcf",
                salt: "0x1",
                items: [],
                target: "",
                solved: true,
            },
            {
                captchaId:
                    "0x8a8c81c8baebcda5061a34f25ef9853477d0d78cf4f4712a8cfdf0f79ae2844d",
                salt: "0x2",
                items: [],
                target: "",
                solved: true,
            },
        ];

        expect(await compareCaptchaSolutions(received, stored)).to.be.false;
    });

    it('Mismatched length captcha solutions returns false', async () => {
        const received = [
            {
                captchaId:
                    "0x2b0f2acf1f143a938115203ef0b056d02008cc396e0467bce14162477d546bcf",
                solution: [21],
                salt: "",
            },
            {
                captchaId:
                    "0x8a8c81c8baebcda5061a34f25ef9853477d0d78cf4f4712a8cfdf0f79ae2844d",
                solution: [42],
                salt: "",
            },
            {
                captchaId:
                    "0xe0a072447a0d212f144d5bc3aad77ef00b3be710605f7a53434c6c6d548549ad",
                solution: [42],
                salt: "",
            },
        ];
        const stored = [
            {
                captchaId:
                    "0x2b0f2acf1f143a938115203ef0b056d02008cc396e0467bce14162477d546bcf",
                salt: "0x1",
                items: [],
                target: "",
                solved: true,
            },
            {
                captchaId:
                    "0x8a8c81c8baebcda5061a34f25ef9853477d0d78cf4f4712a8cfdf0f79ae2844d",
                salt: "0x2",
                items: [],
                target: "",
                solved: true,
            },
        ];

        expect(await compareCaptchaSolutions(received, stored)).to.be.false;
    });

    it('Captchas with mismatching solution lengths are marked as incorrect', async () => {
        const noSolutions = [
            {
                captchaId: '0xa96deea330d68be31b27b53167842e4ad975b72a8555d607c9cfa16b416848af',
                solution: [],
                salt: ''
            },
            {
                captchaId: '0x908747ea61b5920c6bcfe22861adba42ba10dbfbf7daa916b1e94ed43791a43b',
                solution: [],
                salt: ''
            }
        ]
        const solutions =   [
            {
                // created using [ 2, 5, 7 ] as solution
                captchaId: '0xa96deea330d68be31b27b53167842e4ad975b72a8555d607c9cfa16b416848af',
                datasetId: '0xa96deea330d68be31b27b53167842e4ad975b72a8555d607c9cfa16b416848af',
                index: 13,
                items: [],
                salt: '0x01',
                target: 'car',
                solved: true
            },
            {
                captchaId: '0x908747ea61b5920c6bcfe22861adba42ba10dbfbf7daa916b1e94ed43791a43b',
                datasetId: '0x908747ea61b5920c6bcfe22861adba42ba10dbfbf7daa916b1e94ed43791a43b',
                index: 3,
                items: [],
                salt: '0x05',
                target: 'plane',
                solved: true
            }
        ]
        expect(await compareCaptchaSolutions(noSolutions, solutions )).to.be.false;

    })

    it('Pending request hash is calculated properly', () => {
        const hash = computePendingRequestHash(['1', '2', '3'], '0x01', '0x02');

        expect(hash).to.equal('0xc9fcde85cfc0267d8717b5276257022e22e2873c505d8dc3b3d3f972a37c53e9');
    });

    it('Computes a captcha solution hash correctly', () => {
        const captchaSolution = { captchaId: '1', salt: '', solution: [1, 2] } as CaptchaSolution;
        const hash = computeCaptchaSolutionHash(captchaSolution);

        expect(hash).to.be.equal('0x062117d2877e321aed62daa37674fbe3169761dd9d6c6ee0bd4f1301d1d95c36');
    });
});

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
import { calculateItemHashes, CaptchaMerkleTree, CaptchaSolution, CaptchaTypes, CaptchaWithoutId, Dataset, matchItemsToSolutions } from '@prosopo/contract';
import chai from "chai";
import chaiAsPromised from "chai-as-promised";import * as path from 'path';
import {
    addHashesToDataset, compareCaptchaSolutions,
    computeCaptchaHash, computeCaptchaSolutionHash, computePendingRequestHash,
    parseCaptchaDataset, parseCaptchaSolutions, sortAndComputeHashes
} from '@prosopo/contract';

chai.should();
chai.use(chaiAsPromised);
const expect = chai.expect;

const MOCK_ITEMS = new Array(9).fill(0).map((_, i) => ({
    path: path.join(process.cwd(), `/tests/mocks/data/img/01.0${i + 1}.jpeg`),
    type: "image",
}));

let MOCK_ITEMS_HASHED: any[] = [];

const DATASET = {
    format: 'SelectAll' as CaptchaTypes,
    captchas: [
        {
            solution: [],
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

const RECEIVED = [
    {
        captchaId:
            "0x29aa041cdf88e02a27ea3ef9019413112b0184d73f0f44d9b7c753ef00071c16",
        solution: [] as string[],
        salt: "",
    },
    {
        captchaId:
            "0xb7e53094e138f1048f4f23f08da14296d4b20e05dd13121f8bc24c94b9a605fc",
        solution: [] as string[],
        salt: "",
    },
];

const STORED = [
    {
        captchaId:
            "0x29aa041cdf88e02a27ea3ef9019413112b0184d73f0f44d9b7c753ef00071c16",
        salt: "0x1",
        items: [] as any[],
        target: "",
        solved: true,
    },
    {
        captchaId:
            "0xb7e53094e138f1048f4f23f08da14296d4b20e05dd13121f8bc24c94b9a605fc",
        salt: "0x2",
        items: [] as any[],
        target: "",
        solved: true,
    },
];

describe('CAPTCHA FUNCTIONS', () => {
    before(async () => {
        MOCK_ITEMS_HASHED = await calculateItemHashes(MOCK_ITEMS);
        STORED.forEach((item) => (item.items = MOCK_ITEMS_HASHED));
        RECEIVED.forEach(
            (item) =>
                (item.solution = matchItemsToSolutions(
                    [0, 1, 2],
                    MOCK_ITEMS_HASHED
                ))
        );
    });

    it('Parses a captcha dataset correctly', () => {
        expect(function () { parseCaptchaDataset(JSON.parse(JSON.stringify(DATASET)) as JSON); }).to.not.throw();
    });

    it('Captcha data set is hashed correctly', async () => {
        const dataset = {
            ...DATASET,
            captchas: await Promise.all(
                DATASET.captchas.map(async (captcha) => ({
                    ...captcha,
                    items: await calculateItemHashes(captcha.items),
                }))
            ),
        };
        const captchaHashes = await Promise.all(dataset.captchas.map(computeCaptchaHash));

        expect(captchaHashes[0]).to.equal('0x5ca830bbf3dcb0b080f6a03636c348a86a045a094ba58d687d347c53d2c9524a');
        expect(captchaHashes[1]).to.equal('0xf371668e49f2b9bfe48e6a1066f0a4155e6604cb721b1aedfc8f50de22fad67b');
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

    it('Captchas are hashed properly', async () => {
        const captcha = {
            solution: matchItemsToSolutions([0], MOCK_ITEMS_HASHED),
            salt: "0x03",
            target: "plane",
            items: MOCK_ITEMS_HASHED,
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
        }).to.throw();
    });

    it('Captcha solutions are correctly sorted and computed', async () => {
        const idsAndHashes = await sortAndComputeHashes(RECEIVED, STORED);

        expect(idsAndHashes.every(({ hash, captchaId }) => hash === captchaId)).to.be.true;
    });

    it('Captcha solutions are correctly sorted and computed - non matching order', async () => {
        const idsAndHashes = await sortAndComputeHashes(RECEIVED, [STORED[1], STORED[0]]);

        expect(idsAndHashes.every(({ hash, captchaId }) => hash === captchaId)).to.be.true;
    });

    it('Matching captcha solutions are correctly compared, returning true', async () => {
        expect(await compareCaptchaSolutions(RECEIVED, STORED)).to.be.true;
    });

    it('Non-matching captcha solutions are correctly compared, returning false', async () => {
        const stored = [
            {
                ...STORED[0],
                captchaId:
                    "0xe8cc1f7a69f8a073db20ab3a391f38014d299298c2f5b881628592b48df7fbeb",
            },
            STORED[1],
        ];

        await expect(compareCaptchaSolutions(RECEIVED, stored)).to.eventually.be
            .rejected;
    });

    it('Mismatched length captcha solutions returns false', async () => {
        const received = [
            {
                captchaId:
                    "0xe8cc1f7a69f8a073db20ab3a391f38014d299298c2f5b881628592b48df7fbeb",
                solution: matchItemsToSolutions([1, 2, 3], MOCK_ITEMS_HASHED),
                salt: "",
            },
            ...RECEIVED
        ];
        const stored = [
            {
                captchaId:
                    "0xe8cc1f7a69f8a073db20ab3a391f38014d299298c2f5b881628592b48df7fbeb",
                salt: "0x1",
                items: [],
                target: "",
                solved: true,
            },
            STORED[0],
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
        const captchaSolution = { captchaId: '1', salt: '', solution: matchItemsToSolutions([1, 2], MOCK_ITEMS_HASHED) } as CaptchaSolution;
        const hash = computeCaptchaSolutionHash(captchaSolution);
        expect(hash).to.be.equal('0x9598cced23411f819404454b7c0e256e697d20dc3e108b8394518d5ada976648');
    });
});

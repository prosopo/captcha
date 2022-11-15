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
import {
    CaptchaMerkleTree,
    CaptchaTypes,
    Dataset,
    calculateItemHashes,
    computeCaptchaHash,
    matchItemsToSolutions,
} from '@prosopo/contract'
import { expect } from 'chai'
import { hexHashArray } from '@prosopo/datasets'

const DATASET: Dataset = {
    datasetId: '0x01',
    captchas: [
        {
            salt: '0x01020304',
            items: calculateItemHashes([
                { type: 'text', text: '1' },
                { type: 'text', text: 'b' },
                { type: 'text', text: 'c' },
            ]),
            target: 'letters',
            solution: [] as any[],
        },
        {
            salt: '0x02020304',
            items: calculateItemHashes([
                { type: 'text', text: 'c' },
                { type: 'text', text: 'e' },
                { type: 'text', text: '3' },
            ]),
            target: 'letters',
        },
        {
            salt: '0x03020304',
            items: calculateItemHashes([
                { type: 'text', text: 'h' },
                { type: 'text', text: 'f' },
                { type: 'text', text: '5' },
            ]),
            target: 'letters',
            solution: [] as any[],
        },
    ],
    format: CaptchaTypes.SelectAll,
}

describe('PROVIDER MERKLE TREE', () => {
    before(() => {
        DATASET.captchas[0].solution = matchItemsToSolutions([1, 2], DATASET.captchas[0].items)
        DATASET.captchas[1].solution = matchItemsToSolutions([2], DATASET.captchas[1].items)
    })

    it('Tree contains correct leaf hashes when computing leaf hashes', () => {
        const dataset = DATASET
        const tree = new CaptchaMerkleTree()
        const captchaHashes = dataset.captchas.map(computeCaptchaHash)

        tree.build(captchaHashes)
        const leafHashes = tree.leaves.map((leaf) => leaf.hash)

        expect(leafHashes).to.deep.equal([
            '0xea255faf38902386cdde900db14f633ba75d28695636efc1a3164284ea1b6d50',
            '0x448236c56c0ca484c545395acffc4b3c7358725dc84d2bd9d3ba099873913356',
            '0xc1c2b16f0e979b65b53c080f1bb787d0492248d388234d2aab149ef20ddbfe77',
        ])
    })
    it('Tree root is correct when computing leaf hashes', () => {
        const dataset = DATASET
        const tree = new CaptchaMerkleTree()
        const captchaHashes = dataset.captchas.map(computeCaptchaHash)

        tree.build(captchaHashes)
        expect(tree.root!.hash).to.equal('0x6b789beb90a4b7cda7c5e8ea863f114a122241a5278884bad94575089645d36e')
    })
    it('Tree proof works when computing leaf hashes', () => {
        const dataset = DATASET
        const tree = new CaptchaMerkleTree()
        const captchaHashes = dataset.captchas.map(computeCaptchaHash)

        tree.build(captchaHashes)
        const proof = tree.proof('0x0712abea4b4307c161ea64227ae1f9400f6844287ec4d574b9facfddbf5f542a')
        const layerZeroHash = hexHashArray(proof[0])

        expect(tree.layers[1].indexOf(layerZeroHash) > -1)
        const layerOneHash = hexHashArray(proof[1])

        expect(tree.layers[2].indexOf(layerOneHash) > -1)
    })
    it('Tree contains correct leaf hashes when not computing leaf hashes', () => {
        const tree = new CaptchaMerkleTree()

        tree.build(['1', '2', '3'])
        const leafHashes = tree.leaves.map((leaf) => leaf.hash)

        expect(leafHashes).to.deep.equal(['1', '2', '3'])
    })
    it('Tree root is correct when not computing leaf hashes', () => {
        const tree = new CaptchaMerkleTree()

        tree.build(['1', '2', '3'])
        expect(tree.root!.hash).to.equal('0x940abe0b0c80705b3a2563f171adf819a946a4d1b353755afc44e6c5a4224a8a')
    })
    it('Tree proof works when not computing leaf hashes', () => {
        const tree = new CaptchaMerkleTree()

        tree.build(['1', '2', '3'])
        const proof = tree.proof('1')
        const layerZeroHash = hexHashArray(proof[0])

        expect(tree.layers[1].indexOf(layerZeroHash) > -1)
        const layerOneHash = hexHashArray(proof[1])

        expect(tree.layers[2].indexOf(layerOneHash) > -1)
    })

    it('Tree proof works when there is only one leaf', () => {
        const tree = new CaptchaMerkleTree()

        tree.build(['1'])
        const proof = tree.proof('1')

        expect(proof).to.deep.equal([['1']])
    })
})

import { expect } from 'chai'
import { CaptchaTypes, Dataset } from '../src/types/captcha'
import { addHashesToDataset, compareCaptcha, compareCaptchaSolutions, computeCaptchaHashes } from '../src/captcha'
import { CaptchaMerkleTree } from '../src/merkle'

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
}

describe('PROVIDER CAPTCHA', () => {
    it('Captcha data set is hashed correctly', async () => {
        const captchasWithHashes = await computeCaptchaHashes(DATASET.captchas)
        expect(captchasWithHashes[0].captchaId).to.equal('0x5ca830bbf3dcb0b080f6a03636c348a86a045a094ba58d687d347c53d2c9524a')
        expect(captchasWithHashes[1].captchaId).to.equal('0xf371668e49f2b9bfe48e6a1066f0a4155e6604cb721b1aedfc8f50de22fad67b')
    })

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
        ]
        const tree = new CaptchaMerkleTree()
        tree.build(captchasWithHashes.map(c => c.captchaId))
        // tree is not required anymore, this could be changed to addHashesToDataset(DATASET, captchasWithHashes)
        const dataset = addHashesToDataset(DATASET, tree)
        expect(dataset.captchas[0].captchaId).to.equal('0x83f378619ef1d3cced90ad760b33d24995e81583b4cd269358fa53b690d560b5')
        expect(dataset.captchas[1].captchaId).to.equal('0x0977061f4bca26f49f2657b582944ce7c549862a4be7e0fc8f9a9a6cdb788475')
    })

    it('Empty dataset and tree throws error', () => {
        expect(function () {
            addHashesToDataset({} as Dataset, new CaptchaMerkleTree())
        }).to.throw(/error hashing dataset/)
    })

    it('Matching captcha solutions are correctly compared, returning true', () => {
        const received = [{ captchaId: '1', solution: [42], salt: '' }, { captchaId: '2', solution: [42], salt: '' }]
        const stored = [
            { captchaId: '1', solution: [42], salt: '', items: [], target: '' },
            { captchaId: '2', solution: [42], salt: '', items: [], target: '' }
        ]
        return expect(compareCaptchaSolutions(received, stored)).to.be.true
    })

    it('Non-matching captcha solutions are correctly compared, returning false', () => {
        const received = [{ captchaId: '1', solution: [42], salt: '' }, { captchaId: '2', solution: [42], salt: '' }]
        const stored = [
            { captchaId: '1', solution: [21], salt: '', items: [], target: '' },
            { captchaId: '2', solution: [42], salt: '', items: [], target: '' }
        ]
        return expect(compareCaptchaSolutions(received, stored)).to.be.false
    })

    it('Mismatched length captcha solutions returns false', () => {
        const received = [
            { captchaId: '1', solution: [42], salt: '' },
            { captchaId: '2', solution: [42], salt: '' },
            { captchaId: '3', solution: [42], salt: '' }
        ]
        const stored = [
            { captchaId: '1', solution: [21], salt: '', items: [], target: '' },
            { captchaId: '2', solution: [42], salt: '', items: [], target: '' }
        ]
        return expect(compareCaptchaSolutions(received, stored)).to.be.false
    })

    it('Two captchas are correctly compared when solutions and captchaIds are identical', () => {
        const c1 = { solution: [1, 2, 3, 4], captchaId: '1', salt: '' }
        const c2 = { solution: [1, 3, 2, 4], captchaId: '1', salt: '', items: [], target: '' }
        return expect(compareCaptcha(c1, c2)).to.be.true
    })

    it('Two captchas are correctly compared when solutions and captchaIds are different', () => {
        const c1 = { solution: [1, 2, 3, 4], captchaId: '1', salt: '' }
        const c2 = { solution: [1, 3], captchaId: '1', salt: '', items: [], target: '' }
        return expect(compareCaptcha(c1, c2)).to.be.false
    })

    it('Mismatched captchas are correctly compared', () => {
        const c1 = { solution: [1, 2, 3, 4], captchaId: '1', salt: '' }
        const c2 = { solution: [1, 3, 2, 4], captchaId: '2', salt: '', items: [], target: '' }
        return expect(compareCaptcha(c1, c2)).to.be.false
    })

    it('Captchas with zero length solutions are automatically assumed to be correct', () => {
        const c1 = { solution: [1, 2, 3, 4], captchaId: '1', salt: '' }
        const c2 = { solution: [], captchaId: '2', salt: '', items: [], target: '' }
        return expect(compareCaptcha(c1, c2)).to.be.true
    })

    it('Captchas with no solutions are automatically assumed to be correct', () => {
        const c1 = { solution: [1, 2, 3, 4], captchaId: '1', salt: '' }
        const c2 = { solution: undefined, captchaId: '2', salt: '', items: [], target: '' }
        return expect(compareCaptcha(c1, c2)).to.be.true
    })
})

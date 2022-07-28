// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
import { CaptchaMerkleTree, CaptchaSolution, CaptchaTypes, CaptchaWithoutId, Dataset } from '@prosopo/contract';
import { expect } from 'chai';
import * as path from 'path';
import {
  addHashesToDataset, compareCaptcha, compareCaptchaSolutions,
  computeCaptchaHash, computeCaptchaHashes, computeCaptchaSolutionHash, computePendingRequestHash,
  parseCaptchaDataset, parseCaptchas, parseCaptchaSolutions
} from '@prosopo/contract';


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
    const captchaSolutions = JSON.parse('[{ "captchaId": "1", "solution": [1, 2, 3], "salt" : "salt" }, { "captchaId": "2", "solution": [1, 2, 3], "salt" : "salt" }]') as JSON;

    return expect(parseCaptchaSolutions(captchaSolutions).length).to.equal(2);
  });

  it('Invalid Captcha solutions are not successfully parsed', () => {
    const captchaSolutions = JSON.parse('[{ "captchaId": "1", "salt" : "salt" }, { "captchaId": "2", "solution": [1, 2, 3], "salt" : "salt" }]') as JSON;

    return expect(function () {
      parseCaptchaSolutions(captchaSolutions);
    }).to.throw();
  });

  it('Text Captchas are successfully parsed', () => {
    const captchas = JSON.parse('[{ "captchaId": "1", "solution": [1, 2, 3], "salt" : "salt", "items":[{"text":"a", "type":"text"},{"text":"b", "type":"text"}], "target": "vowels" }, { "captchaId": "2", "salt" : "salt", "items":[{"text":"a", "type":"text"},{"text":"b", "type":"text"}], "target": "vowels" }]') as JSON;

    return expect(parseCaptchas(captchas).length).to.equal(2);
  });

  it('Image Captchas are successfully parsed', () => {
    const captchas = JSON.parse('[{ "captchaId": "1", "solution": [1, 2, 3], "salt" : "salt", "items":[{"path": "path", "type": "image"}, {"path": "path", "type": "image"}], "target": "vowels" }, { "captchaId": "2", "salt" : "salt", "items":[{"path": "path", "type": "image"}, {"path": "path", "type": "image"}], "target": "vowels" }]') as JSON;

    return expect(parseCaptchas(captchas).length).to.equal(2);
  });

  it('Invalid Captchas are not successfully parsed', () => {
    const captchas = JSON.parse('[{ "captchaId": "1", "solution": [1, 2, 3], "salt" : "salt"}]') as JSON;

    return expect(function () {
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

  it('Matching captcha solutions are correctly compared, returning true', () => {
    const received = [{ captchaId: '1', solution: [42], salt: '' }, { captchaId: '2', solution: [42], salt: '' }];
    const stored = [
      { captchaId: '1', solution: [42], salt: '', items: [], target: '' },
      { captchaId: '2', solution: [42], salt: '', items: [], target: '' }
    ];

    return expect(compareCaptchaSolutions(received, stored)).to.be.true;
  });

  it('Non-matching captcha solutions are correctly compared, returning false', () => {
    const received = [{ captchaId: '1', solution: [42], salt: '' }, { captchaId: '2', solution: [42], salt: '' }];
    const stored = [
      { captchaId: '1', solution: [21], salt: '', items: [], target: '' },
      { captchaId: '2', solution: [42], salt: '', items: [], target: '' }
    ];

    return expect(compareCaptchaSolutions(received, stored)).to.be.false;
  });

  it('Mismatched length captcha solutions returns false', () => {
    const received = [
      { captchaId: '1', solution: [42], salt: '' },
      { captchaId: '2', solution: [42], salt: '' },
      { captchaId: '3', solution: [42], salt: '' }
    ];
    const stored = [
      { captchaId: '1', solution: [21], salt: '', items: [], target: '' },
      { captchaId: '2', solution: [42], salt: '', items: [], target: '' }
    ];

    return expect(compareCaptchaSolutions(received, stored)).to.be.false;
  });

  it('Captchas with mismatching solution lengths are marked as incorrect', () => {
    const noSolutions = [
      {
        captchaId: '0x6b652a7b4ad66c1b1bd07eb7eac72b59c8c0875bbcc0cfe9b72a519353dee5e5',
        solution: [],
        salt: '0x43692b4b9bc7c685a8852a419965fe6f9aa894df8a0ae88a4fc9d24ae0993276'
      },
      {
        captchaId: '0x84cd658a2023252b529515d4792d98e073d786037b6169ad387f43eb7bb3c190',
        solution: [],
        salt: '0x43692b4b9bc7c685a8852a419965fe6f9aa894df8a0ae88a4fc9d24ae0993276'
      }
    ]
    const solutions =   [
      {
        captchaId: '0x6b652a7b4ad66c1b1bd07eb7eac72b59c8c0875bbcc0cfe9b72a519353dee5e5',
        datasetId: '0xaa3a5a1e63a195bd2262a8e39992b6da43b40e8194a388d3f1440e3fe8744428',
        index: 13,
        items: [
        ],
        salt: '0x01',
        solution: [ 2, 5, 7 ],
        target: 'car'
      },
      {
        captchaId: '0x84cd658a2023252b529515d4792d98e073d786037b6169ad387f43eb7bb3c190',
        datasetId: '0xaa3a5a1e63a195bd2262a8e39992b6da43b40e8194a388d3f1440e3fe8744428',
        index: 3,
        items: [
        ],
        salt: '0x05',
        target: 'plane',
      }
    ]
    return expect(compareCaptchaSolutions(noSolutions, solutions )).to.be.false;

  })

  it('Two captchas are correctly compared when solutions and captchaIds are identical', () => {
    const c1 = { solution: [1, 2, 3, 4], captchaId: '1', salt: '' };
    const c2 = { solution: [1, 3, 2, 4], captchaId: '1', salt: '', items: [], target: '' };

    return expect(compareCaptcha(c1, c2)).to.be.true;
  });

  it('Two captchas are correctly compared when solutions and captchaIds are different', () => {
    const c1 = { solution: [1, 2, 3, 4], captchaId: '1', salt: '' };
    const c2 = { solution: [1, 3], captchaId: '1', salt: '', items: [], target: '' };

    return expect(compareCaptcha(c1, c2)).to.be.false;
  });

  it('Mismatched captchas are correctly compared', () => {
    const c1 = { solution: [1, 2, 3, 4], captchaId: '1', salt: '' };
    const c2 = { solution: [1, 3, 2, 4], captchaId: '2', salt: '', items: [], target: '' };

    return expect(compareCaptcha(c1, c2)).to.be.false;
  });

  it('Captchas with zero length solutions are automatically assumed to be correct', () => {
    const c1 = { solution: [1, 2, 3, 4], captchaId: '1', salt: '' };
    const c2 = { solution: [], captchaId: '2', salt: '', items: [], target: '' };

    return expect(compareCaptcha(c1, c2)).to.be.true;
  });

  it('Captchas with no solutions are automatically assumed to be correct', () => {
    const c1 = { solution: [1, 2, 3, 4], captchaId: '1', salt: '' };
    const c2 = { solution: undefined, captchaId: '2', salt: '', items: [], target: '' };

    return expect(compareCaptcha(c1, c2)).to.be.true;
  });

  it('Pending request hash is calculated properly', () => {
    const hash = computePendingRequestHash(['1', '2', '3'], '0x01', '0x02');

    return expect(hash).to.equal('0xc9fcde85cfc0267d8717b5276257022e22e2873c505d8dc3b3d3f972a37c53e9');
  });

  it('Computes a captcha solution hash correctly', () => {
    const captchaSolution = { captchaId: '1', salt: '', solution: [1, 2] } as CaptchaSolution;
    const hash = computeCaptchaSolutionHash(captchaSolution);

    return expect(hash).to.be.equal('0x062117d2877e321aed62daa37674fbe3169761dd9d6c6ee0bd4f1301d1d95c36');
  });
});

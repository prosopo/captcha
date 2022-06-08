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
import { CaptchaMerkleTree, CaptchaTypes, Dataset, hexHash, computeCaptchaHash } from '@prosopo/contract';
import { expect } from 'chai';


describe('PROVIDER MERKLE TREE', () => {
  const DATASET: Dataset = {
    datasetId: '0x01',
    captchas: [
      {
        salt: '0x01020304',
        items: [
          { type: 'text', text: '1' },
          { type: 'text', text: 'b' },
          { type: 'text', text: 'c' }
        ],
        target: 'letters',
        solution: [1, 2]
      },
      {
        salt: '0x02020304',
        items: [
          { type: 'text', text: 'c' },
          { type: 'text', text: 'e' },
          { type: 'text', text: '3' }
        ],
        target: 'letters'
      },
      {
        salt: '0x03020304',
        items: [
          { type: 'text', text: 'h' },
          { type: 'text', text: 'f' },
          { type: 'text', text: '5' }
        ],
        target: 'letters',
        solution: [2]
      }

    ],
    format: CaptchaTypes.SelectAll
  };

  it('Tree contains correct leaf hashes when computing leaf hashes', async () => {
    const dataset = DATASET;
    const tree = new CaptchaMerkleTree();
    const captchaHashes = await Promise.all(dataset.captchas.map(computeCaptchaHash));

    tree.build(captchaHashes);
    const leafHashes = tree.leaves.map((leaf) => leaf.hash);

    expect(leafHashes).to.deep.equal([
      '0x20dad7322b9b7a12f6ccaa6171cb85f2ad095e6fff2dc6050d9fb47092cb4b1a',
      '0xda4d2b3bfd078084e2a127b6f9e2b7ac8f8d434f9c20be5ac2c1e2e70046e4dd',
      '0x16357d26d412fcf32335f0820691b623ab90ace94f1463ef81bc335d3a3dbe1d'
    ]
    );
  }
  );
  it('Tree root is correct when computing leaf hashes', async () => {
    const dataset = DATASET;
    const tree = new CaptchaMerkleTree();
    const captchaHashes = await Promise.all(dataset.captchas.map(computeCaptchaHash));

    tree.build(captchaHashes);
    expect(tree.root!.hash).to.equal('0x6c301d8dcc54d6836d6cf3845f09647845aeb44159853cb46ed30a5b683874e6');
  }
  );
  it('Tree proof works when computing leaf hashes', async () => {
    const dataset = DATASET;
    const tree = new CaptchaMerkleTree();
    const captchaHashes = await Promise.all(dataset.captchas.map(computeCaptchaHash));

    tree.build(captchaHashes);
    const proof = tree.proof('0x0712abea4b4307c161ea64227ae1f9400f6844287ec4d574b9facfddbf5f542a');
    const layerZeroHash = hexHash(proof[0].join());

    expect(tree.layers[1].indexOf(layerZeroHash) > -1);
    const layerOneHash = hexHash(proof[1].join());

    expect(tree.layers[2].indexOf(layerOneHash) > -1);
  }
  );
  it('Tree contains correct leaf hashes when not computing leaf hashes', () => {
    const tree = new CaptchaMerkleTree();

    tree.build(['1', '2', '3']);
    const leafHashes = tree.leaves.map((leaf) => leaf.hash);

    expect(leafHashes).to.deep.equal([
      '1',
      '2',
      '3'
    ]
    );
  }
  );
  it('Tree root is correct when not computing leaf hashes', () => {
    const tree = new CaptchaMerkleTree();

    tree.build(['1', '2', '3']);
    expect(tree.root!.hash).to.equal('0x940abe0b0c80705b3a2563f171adf819a946a4d1b353755afc44e6c5a4224a8a');
  }
  );
  it('Tree proof works when not computing leaf hashes', () => {
    const tree = new CaptchaMerkleTree();

    tree.build(['1', '2', '3']);
    const proof = tree.proof('1');
    const layerZeroHash = hexHash(proof[0].join());

    expect(tree.layers[1].indexOf(layerZeroHash) > -1);
    const layerOneHash = hexHash(proof[1].join());

    expect(tree.layers[2].indexOf(layerOneHash) > -1);
  }
  );

  it('Tree proof works when there is only one leaf', () => {
    const tree = new CaptchaMerkleTree();

    tree.build(['1']);
    const proof = tree.proof('1');

    expect(proof).to.deep.equal([['1']]);
  }
  );
});

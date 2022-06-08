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
import { hexHash } from '@prosopo/contract';
import { expect } from 'chai';
import { encodeStringAddress, shuffleArray } from '../src/util';

describe('UTIL FUNCTIONS', () => {
  it('does not modify an already encoded address', () => {
    expect(encodeStringAddress('5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL')).to.equal('5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL');
  });
  it('fails on an invalid address', () => {
    expect(function () { encodeStringAddress('xx'); }).to.throw();
  });
  it('correctly encodes a hex string address', () => {
    expect(encodeStringAddress('0x1cbd2d43530a44705ad088af313e18f80b53ef16b36177cd4b77b846f2a5f07c')).to.equal('5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL');
  });
  it('shuffle function shuffles array', () => {
    expect(shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9])).to.not.deep.equal([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
  it('correctly hex hashes a string', () => {
    expect(hexHash('https://localhost:8282')).to.equal('0x09fd51a0d9e0d07be9aaab0643e1152c22cd11d9d128235552d476256b7351de');
  });
});

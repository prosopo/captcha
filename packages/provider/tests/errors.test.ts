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
// [object Object]
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';

import { BadRequest } from '../src/errors';

describe('ERRORS', () => {
  it('Returns 500 for a BadRequest', () => {
    const msg = 'This is a bad request';
    const theError = new BadRequest(msg);

    expect(theError.getCode()).to.equal(500);
  });
});

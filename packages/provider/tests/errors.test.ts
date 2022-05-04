// [object Object]
// SPDX-License-Identifier: Apache-2.0

import { expect } from 'chai';

import { BadRequest } from '../src/errors';

describe('ERRORS', () => {
  it('Returns 400 for a BadRequest', () => {
    const msg = 'This is a bad request';
    const theError = new BadRequest(msg);

    expect(theError.getCode()).to.equal(400);
  });
});

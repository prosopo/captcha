import { BadRequest } from '../src/errors'
import { expect } from 'chai'

describe('ERRORS', () => {
    it('Returns 400 for a BadRequest', () => {
        const msg = 'This is a bad request'
        const theError = new BadRequest(msg)
        expect(theError.getCode()).to.equal(400)
    })
})

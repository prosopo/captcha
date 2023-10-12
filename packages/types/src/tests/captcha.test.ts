import { fail } from "assert"
import { CaptchaSchema } from "../index.js"

describe('captcha', () => {
    it('throws error on non-distinct solutions and unlabelled arrays', () => {
        const captcha = {
            captchaId: '0',
            captchaContentId: '0',
            salt: '0x0123456789012345678901234567890123456789',
            timeLimit: 30,
            solution: [0, 1, 2],
            unlabelled: [2, 3, 4],
        }
        try {
            CaptchaSchema.parse(captcha)
            // expect error
            fail('expected error')
        } catch (err: any) {
            err.issues[0].message === 'the solution array and unlabelled array should be distinct'
        }
    })
})
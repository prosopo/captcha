import { u8aToHex } from '@polkadot/util'
import { PoWCaptcha } from '@prosopo/types'
import { Database } from '@prosopo/types-database'
import { ProsopoEnvError } from '@prosopo/common'
import { stringToHex } from '@polkadot/util'
import { checkRecentPowSolution as checkRecentPow, checkPowSignature, checkPowSolution } from './powTasksUtils.js'

export class PowCaptchaManager {
    pair: any
    db: Database
    POW_SEPARATOR: string

    constructor(pair: any, db: Database) {
        this.pair = pair
        this.db = db
        this.POW_SEPARATOR = '___'
    }

    async getPowCaptchaChallenge(userAccount: string, dappAccount: string, origin: string): Promise<PoWCaptcha> {
        const difficulty = 4
        const timestamp = Date.now().toString()

        // Use blockhash, userAccount and dappAccount for string for challenge
        const challenge = `${timestamp}___${userAccount}___${dappAccount}`
        const signature = u8aToHex(this.pair.sign(stringToHex(challenge)))

        return { challenge, difficulty, signature }
    }

    async verifyPowCaptchaSolution(
        challenge: string,
        difficulty: number,
        signature: string,
        nonce: number,
        timeout: number
    ): Promise<boolean> {
        checkRecentPow(challenge, timeout)
        checkPowSignature(challenge, signature, this.pair.providerAddress)
        checkPowSolution(nonce, challenge, difficulty)

        await this.db.storePowCaptchaRecord(challenge, false)
        return true
    }

    async serverVerifyPowCaptchaSolution(dappAccount: string, challenge: string, timeout: number): Promise<boolean> {
        const challengeRecord = await this.db.getPowCaptchaRecordByChallenge(challenge)

        if (!challengeRecord) {
            throw new ProsopoEnvError('DATABASE.CAPTCHA_GET_FAILED', {
                context: { failedFuncName: this.serverVerifyPowCaptchaSolution.name, challenge },
            })
        }

        if (challengeRecord.checked) return false

        const challengeDappAccount = challengeRecord.challenge.split(this.POW_SEPARATOR)[2]

        if (dappAccount !== challengeDappAccount) {
            throw new ProsopoEnvError('CAPTCHA.DAPP_USER_SOLUTION_NOT_FOUND', {
                context: {
                    failedFuncName: this.serverVerifyPowCaptchaSolution.name,
                    dappAccount,
                    challengeDappAccount,
                },
            })
        }

        checkRecentPow(challenge, timeout)

        await this.db.updatePowCaptchaRecord(challengeRecord.challenge, true)
        return true
    }
}

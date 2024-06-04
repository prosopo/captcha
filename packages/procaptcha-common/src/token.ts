import { ApiParams, ProcaptchaOutput, ProcaptchaToken, ProcaptchaTokenCodec } from '@prosopo/types'
import { hexToU8a, u8aToHex } from '@polkadot/util'

export const encodeOutput = (procaptchaOutput: ProcaptchaOutput): ProcaptchaToken => {
    return u8aToHex(
        ProcaptchaTokenCodec.enc({
            [ApiParams.commitmentId]: undefined,
            [ApiParams.providerUrl]: undefined,
            [ApiParams.blockNumber]: undefined,
            [ApiParams.challenge]: undefined,
            [ApiParams.nonce]: undefined,
            // override any optional fields by spreading the procaptchaOutput
            ...procaptchaOutput,
        })
    )
}

export const decodeOutput = (procaptchaToken: ProcaptchaToken): ProcaptchaOutput => {
    return ProcaptchaTokenCodec.dec(hexToU8a(procaptchaToken))
}

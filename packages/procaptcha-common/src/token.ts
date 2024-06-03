import { u8aToHex } from '@polkadot/util'
import { ApiParams, ProcaptchaOutput, ProcaptchaToken, ProcaptchaTokenCodec } from '@prosopo/types'

export const encodeOutput = (procaptchaOutput: ProcaptchaOutput): ProcaptchaToken => {
    return u8aToHex(
        ProcaptchaTokenCodec.enc({
            [ApiParams.commitmentId]: undefined,
            [ApiParams.providerUrl]: undefined,
            [ApiParams.blockNumber]: undefined,
            [ApiParams.challenge]: undefined,
            // override any optional fields by spreading the procaptchaOutput
            ...procaptchaOutput,
        })
    )
}

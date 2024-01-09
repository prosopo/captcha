// import { i128, u8 } from 'scale-ts'
// import {
//     hexToU8a,
//     u8aToHex,
// } from '@polkadot/util'

// console.log(u8aToHex(i128.enc(-18676936063680574795862633153229949450n)))
// console.log(i128.dec(hexToU8a('0xf6f5f4f3f2f1f0f9f8f7f6f5f4f3f2f1')))

const accountToU8a = (account: string): Uint8Array => {
    // This should be done as a codec from scale-ts
    throw new Error('Not implemented') // TODO
}

class CaptchaContract {
    constructor(
        public readonly address: string,
    ) {

    }

    public getRandomActiveProvider(userAccount: string, dappContract: string) {
        const userAccountU8a = accountToU8a(userAccount)
        const dappContractU8a = accountToU8a(dappContract)
        const body = {
            id: 9,
            jsonrpc: '2.0',
            method: 'state_call',
            params: [
                'ContractsApi_call',
                //origin//destination//value//storageDepositLimit//weight//inputData
                '0x76058cdd6d2736982650893b737e457df52dbc3053845acbdd17dd2d06a5487ec652db019a0c1d12b49b1d12d4649930f6873a26c7e8e1fbcbd4d86cad09f13b00000000000000000000000000000000010b0000f2052a010bff4f39278c040010c9834fee',
            ],
        }
    }
}


console.log("d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d4d3688a12118abda266666e074112b4dafe14053461fae0e71706f30a4726b18000000000000000000000000000000000107c036d4431e1366666666666666a600100a7ff7cd".substr(128 + 7*2 + 6*2 + 2))

// 0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d4d3688a12118abda266666e074112b4dafe14053461fae0e71706f30a4726b18000000000000000000000000000000000107c036d4431e1366666666666666a600100a7ff7cd

// calling acc: d43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d
// contract acc: 4d3688a12118abda266666e074112b4dafe14053461fae0e71706f30a4726b18
// balance: 00000000000000
// gas: 000000000000
// optional storageDepositLimit: 00
// ?: 00000107c036d4431e1366666666666666a600100a7ff7cd

// chris to check everything pushed on subshape brnach
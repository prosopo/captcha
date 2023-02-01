// Copyright 2017-2023 @polkadot/react-hooks authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type { Weight, WeightV2 } from '@polkadot/types/interfaces'
import type { BN } from '@polkadot/util'
import type { UseWeight } from '../types'
import { BN_MILLION, BN_ONE, BN_TEN, BN_ZERO } from '@polkadot/util'
import { ApiPromise } from '@polkadot/api'
import { convertWeight } from '@polkadot/api-contract/base/util'

export function useWeightImpl(api: ApiPromise, blockTime: BN): Promise<UseWeight> {
    const isWeightV2 = !!api.registry.createType<WeightV2>('Weight').proofSize
    const megaGas = <BN>convertWeight(
        api.consts.system.blockWeights
            ? api.consts.system.blockWeights.maxBlock
            : (api.consts.system.maximumBlockWeight as Weight)
    )
        .v1Weight.div(BN_MILLION)
        .div(BN_TEN)
    const megaRefTime = <BN>(api.consts.system.blockWeights
        ? api.consts.system.blockWeights.perClass.normal.maxExtrinsic
              .unwrapOrDefault()
              // @ts-ignore
              .refTime.toBn()
              .div(BN_MILLION)
              .div(BN_TEN)
        : BN_ZERO)
    const proofSize = <BN>(api.consts.system.blockWeights
        ? // @ts-ignore
          api.consts.system.blockWeights.perClass.normal.maxExtrinsic.unwrapOrDefault().proofSize.toBn()
        : BN_ZERO)
    const isEmpty = false

    return new Promise((resolve, reject) => {
        let executionTime = 0
        let percentage = 0
        let weight = BN_ZERO
        let weightV2 = api.registry.createType('WeightV2', {
            proofSize: BN_ZERO,
            refTime: BN_ZERO,
        })
        let isValid = false

        if (megaGas) {
            weight = megaGas.mul(BN_MILLION)
            executionTime = weight
                .mul(blockTime)
                .div(
                    convertWeight(
                        api.consts.system.blockWeights
                            ? api.consts.system.blockWeights.maxBlock
                            : (api.consts.system.maximumBlockWeight as Weight)
                    ).v1Weight
                )
                .toNumber()
            percentage = (executionTime / blockTime.toNumber()) * 100

            // execution is 2s of 6s blocks, i.e. 1/3
            executionTime = executionTime / 3000
            isValid = !megaGas.isZero() && percentage < 65
        }

        if (isWeightV2 && megaRefTime && proofSize) {
            weightV2 = api.registry.createType('WeightV2', {
                proofSize: proofSize,
                refTime: megaRefTime.mul(BN_MILLION),
            })

            executionTime = megaRefTime
                .mul(BN_MILLION)
                .mul(blockTime)
                .div(
                    api.consts.system.blockWeights
                        ? // @ts-ignore
                          api.consts.system.blockWeights.perClass.normal.maxExtrinsic.unwrapOrDefault().refTime.toBn()
                        : BN_ONE
                )
                .toNumber()
            percentage = (executionTime / blockTime.toNumber()) * 100

            // execution is 2s of 6s blocks, i.e. 1/3
            executionTime = executionTime / 3000
            isValid = !megaRefTime.isZero() // && percentage < 65;
        }

        resolve({
            executionTime,
            isEmpty,
            isValid: isEmpty || isValid,
            isWeightV2,
            megaGas: megaGas || BN_ZERO,
            megaRefTime: megaRefTime || BN_ZERO,
            percentage,
            proofSize: proofSize || BN_ZERO,
            weight,
            // @ts-ignore
            weightV2,
        })
    })
}

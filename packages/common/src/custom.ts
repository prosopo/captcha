// Copyright 2021-2023 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import type { DefaultNamespace, Namespace, TFuncReturn } from 'react-i18next'
import type { TranslationKey } from './utils.js'

declare module 'i18next' {
    interface TFunction<
        N extends Namespace = DefaultNamespace,
        TKPrefix = undefined,
    > {
        <
            TKeys extends TranslationKey,
            TDefaultResult extends TFunctionResult | React.ReactNode = string,
            TInterpolationMap extends object = StringMap,
        >(
            key: TKeys | TKeys[],
            options?: TOptions<TInterpolationMap> | string
        ): TFuncReturn<N, TKeys, TDefaultResult, TKPrefix>
        <
            TKeys extends TranslationKey,
            TDefaultResult extends TFunctionResult | React.ReactNode = string,
            TInterpolationMap extends object = StringMap,
        >(
            key: TKeys | TKeys[],
            defaultValue?: string,
            options?: TOptions<TInterpolationMap> | string
        ): TFuncReturn<N, TKeys, TDefaultResult, TKPrefix>
    }
}

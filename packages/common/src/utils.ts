import { hexToString } from '@polkadot/util/hex'
import type { TFunction } from 'i18next'
// Copyright 2021-2024 Prosopo (UK) Ltd.
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
import { ProsopoError } from './error.js'
import translationEn from './locales/en.json' assert { type: 'json' }

export function isClientSide(): boolean {
    return !!(typeof window !== 'undefined' && window.document && window.document.createElement)
}

export type TFunctionParams = Parameters<TFunction>

// https://medium.com/xgeeks/typescript-utility-keyof-nested-object-fa3e457ef2b2
// slightly modified since we only need string keys, number is there so IDE/Typescript doesn't complain
type NestedKeyOf<ObjectType extends object> = {
    [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
        ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
        : `${Key}`
}[keyof ObjectType & (string | number)]

type Node =
    | {
          [key: string]: Node | string
      }
    | string

function getLeafFieldPath(obj: Node): string[] {
    if (typeof obj === 'string') {
        return [obj]
    }

    return Object.keys(obj).reduce((arr, key) => {
        const value = obj[key]
        if (value === undefined) {
            throw new ProsopoError('DEVELOPER.KEY_ERROR', { context: { error: `Undefined value for key ${key}` } })
        }
        const children = getLeafFieldPath(value)

        return arr.concat(
            children.map((child) => {
                return `${key}.${child}`
            })
        )
    }, [] as string[])
}

export type TranslationKey = NestedKeyOf<typeof translationEn>
export const translationKeys = getLeafFieldPath(translationEn) as TranslationKey[]

// String utils

export const trimProviderUrl = (url: string) => {
    return hexToString(url).replace(/\0/g, '')
}

export function snakeToCamelCase(str: string): string {
    return str.replace(/([-_][a-z])/g, (group) => group.toUpperCase().replace('-', '').replace('_', ''))
}

export function reverseHexString(str: string): `0x${string}` {
    return `0x${
        str
            .match(/.{1,2}/g)
            ?.reverse()
            .join('') || ''
    }`
}

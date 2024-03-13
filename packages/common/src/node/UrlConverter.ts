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

import { ProsopoError } from '../index.js'

// limitations under the License.
export class UrlConverter {
    private readonly symbols = [
        '', // empty string == termination symbol / noop. This may occur at the end of a byte array where the first 2 bits are used in the final symbol and the remaining 6 bits are ignored. But, because of the spacing, the remaining 6 bits appear to be a symbol. These 6 bits will be set to 000000. Thus we map 000000 (decimal number 0) to the empty string here.
        '0',
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
        '7',
        '8',
        '9',
        'a',
        'b',
        'c',
        'd',
        'e',
        'f',
        'g',
        'h',
        'i',
        'j',
        'k',
        'l',
        'm',
        'n',
        'o',
        'p',
        'q',
        'r',
        's',
        't',
        'u',
        'v',
        'w',
        'x',
        'y',
        'z',
        '/',
        '.',
        '-',
        '_',
        '%',
        ':',
        'http://',
        'https://',
        'www.',
        '.com',
        '.net',
        '.org',
        '.co.uk',
        '.io',
    ] as const

    private symbolToNumMap: {
        [key: string]: number
    }
    private numToSymbolMap: {
        [key: number]: string
    }
    private readonly longestSymbolLength: number
    private readonly symbolNBits = 6
    private readonly byteNBits = 8

    constructor() {
        this.symbolToNumMap = this.symbols.reduce(
            (obj, symb, i, arr) => {
                obj[symb] = i
                return obj
            },
            {} as {
                [key: string]: number
            }
        )
        this.numToSymbolMap = this.symbols.reduce(
            (obj, symb, i, arr) => {
                obj[i] = symb
                return obj
            },
            {} as {
                [key: number]: string
            }
        )
        this.longestSymbolLength = this.symbols.reduce((longest, symb) => {
            return Math.max(longest, symb.length)
        }, 0)
        const maxSymbols = 2 ** this.symbolNBits
        if (this.symbols.length > maxSymbols) {
            throw new ProsopoError('DEVELOPER.GENERAL', {
                context: {
                    error: `Cannot encode more than ${maxSymbols} symbols`,
                    context:
                        'only built to encode 64 symbols. Need to adjust the encoding and decoding scheme for more symbols',
                },
            })
        }
        const symbols = this.getSymbols()
        if (symbols.length !== new Set(symbols).size) {
            throw new ProsopoError('DEVELOPER.GENERAL', {
                context: { error: 'Symbols must be unique' },
            })
        }
    }

    public symbolToNum(symb: string): number | undefined {
        const num = this.symbolToNumNull(symb)
        if (num === undefined) {
            throw new ProsopoError('DEVELOPER.GENERAL', {
                context: {
                    error: `Could not find number for symbol '${symb}'`,
                },
            })
        }
        return num
    }

    public symbolToNumNull(symb: string): number | undefined {
        symb = symb.toLowerCase()
        const num = this.symbolToNumMap[symb]
        return num
    }

    public numToSymbol(num: number): string {
        const symb = this.numToSymbolNull(num)
        if (symb === undefined) {
            throw new ProsopoError('DEVELOPER.GENERAL', {
                context: { error: `Could not find symbol for number ${num}` },
            })
        }
        return symb
    }

    public numToSymbolNull(num: number): string | undefined {
        const symb = this.numToSymbolMap[num]
        return symb
    }

    public encode(url: string): Uint8Array {
        url = url.toLowerCase()
        // a symbol is a string of characters which can be mapped to a number
        // symbols must be unique, likewise with their number mapping
        // convert url symbols to numbers (like looking up ascii char symbols against their ascii codes)
        const nums: number[] = []
        const origUrl = url
        // loop through the url until it is empty
        while (url.length > 0) {
            let len = Math.min(url.length, this.longestSymbolLength)
            let num: number | undefined = undefined
            // char by char trim down the next n chars of the url attempting to find a matching symbols
            while (num === undefined && len > 0) {
                const str = url.slice(0, len)
                num = this.symbolToNumNull(str)
                if (num === undefined) {
                    len--
                }
            }
            // check if couldn't find matching symbol
            if (num === undefined) {
                throw new ProsopoError('DEVELOPER.GENERAL', {
                    context: {
                        error: `Could not find symbol at '${url}' of '${origUrl}'`,
                    },
                })
            }
            // record the number of the symbol and slice the symbol from the url
            nums.push(num)
            url = url.slice(len)
        }
        // numbers will range between 0-63 because there are max 64 symbols so need 6 bits to represent
        // 6 bits can be fit in 1 byte, leaving 2 bits as remainder
        // hence 3 bytes can house 4 symbols using the left over remainder bits
        // loop through every 4 symbols worth of numbers
        const nBits = nums.length * this.symbolNBits
        const nBytes = Math.ceil(nBits / this.byteNBits)
        const bytes = new Uint8Array(nBytes)
        for (let bitCount = 0; bitCount < nBits; ) {
            // we need to shift a different amount of bits to pack into bytes
            // e.g.
            // [0, 0, 0, 0, 0, 0,  0, 0] [0, 0, 0, 0,  0, 0, 0, 0] [0, 0,  0, 0, 0, 0, 0, 0] // 3 8-bit bytes
            // [0, 0, 0, 0, 0, 0] [0, 0,  0, 0, 0, 0] [0, 0, 0, 0,  0, 0] [0, 0, 0, 0, 0, 0] // 4 6-bit numbers corresponding to symbols
            //
            // symbol 1 uses the first 6 bits of the first byte
            // symbol 2 uses the last 2 bits of the first byte and the first 4 bits of the second byte
            // symbol 3 uses the last 4 bits of the second byte and the first 2 bits of the third byte
            // symbol 4 uses the last 6 bits of the third byte
            const numIndex = (bitCount / this.symbolNBits) | 0
            const num = nums[numIndex]
            if (num === undefined) {
                throw new ProsopoError('DEVELOPER.GENERAL', {
                    context: {
                        error: `Could not find number at index ${numIndex} of '${nums}'`,
                    },
                })
            }
            const byteIndex = (bitCount / this.byteNBits) | 0
            const usedBitsInByte = bitCount % this.byteNBits
            const unusedBitsInByte = this.byteNBits - usedBitsInByte

            const shift = this.symbolNBits - unusedBitsInByte
            if (shift < 0) {
                // can fit the unused bits of the number into the start of the byte
                const usedBitsInSymbol = bitCount % this.symbolNBits
                const unusedBitsInSymbol = this.symbolNBits - usedBitsInSymbol
                // truncate the number by bits used
                const max = 2 ** unusedBitsInSymbol
                const remNum = num % max
                // make num occupy left most bits of a byte
                const shift = this.byteNBits - unusedBitsInSymbol
                const shiftedNum = remNum << shift
                // pack X bits from the symbol into the unused bits of the byte
                bytes[byteIndex] |= shiftedNum
                // filled the unused bits in the byte
                bitCount += unusedBitsInSymbol
            } else {
                // can only fit part of the start of the number into the remainder of the byte
                bytes[byteIndex] |= num >> shift
                bitCount += unusedBitsInByte
            }
        }

        return bytes
    }

    public decode(bytes: Uint8Array): string {
        const arr: string[] = []
        // loop through every 6 bits
        // any remainder bits are ignored (e.g. 4 bytes == 32 bits, only first 30 bits are used to represent 5 6-bit symbols)
        const nBits = bytes.length * this.byteNBits
        let num = 0
        let nBitsNum = 0
        for (let bitCount = 0; bitCount < nBits; ) {
            const byteIndex = (bitCount / this.byteNBits) | 0
            const byte = bytes[byteIndex]
            if (byte === undefined) {
                throw new ProsopoError('DEVELOPER.GENERAL', {
                    context: {
                        error: `Could not find byte at index ${byteIndex} of '${bytes}'`,
                    },
                })
            }
            const usedBitsInByte = bitCount % this.byteNBits
            const unusedBitsInByte = this.byteNBits - usedBitsInByte
            // unused bits correspond to the current symbol, so consume up to 6 bits
            const unusedBitsInSymbol = this.symbolNBits - nBitsNum
            const consumeNBits = Math.min(unusedBitsInByte, unusedBitsInSymbol)
            // consume the bits from the byte
            const slice = this.bitSlice(byte, usedBitsInByte, consumeNBits)
            // add to num
            num = (num << consumeNBits) | slice
            nBitsNum += consumeNBits
            if (nBitsNum >= this.symbolNBits) {
                // collected enough bits for a symbol
                const symbol = this.numToSymbol(num)
                arr.push(symbol)
                // reset num to empty
                num = 0
                nBitsNum = 0
            }
            bitCount += consumeNBits
        }
        return arr.join('')
    }

    private bitSlice(num: number, startBit: number, lenBit: number) {
        const truncedLeft = this.bitTruncLeft(num, startBit)
        const truncedLen = this.bitTruncRight(truncedLeft, Math.max(0, this.byteNBits - lenBit - startBit))
        return truncedLen
    }

    private bitTruncRight(num: number, nBits: number) {
        return num >> nBits
    }

    private bitTruncLeft(num: number, nBits: number) {
        const threshNBits = this.byteNBits - nBits
        const thresh = 2 ** threshNBits
        return thresh <= 0 ? 0 : num % thresh
    }

    public getSymbols(): readonly string[] {
        return this.symbols
    }
}

export default UrlConverter

// const converter = new UrlConverter()
// // const url = '9p1:h.comxwww.r/6dhttp:///https://0fe9rywww.s0'
// // const outBytes = new Uint8Array([37,144,105,70,216,108,110,65,141,170,74,192,60,226,91,138,199,0])
// // console.log(url)
// // const bytes = converter.encode(url)
// // const str = converter.decode(bytes)
// // console.log(str)

// for(let i = 0; i < 10; i++) {
//     const len = Math.random() * 100 + 1 // url lengths between 1-100
//     const symbols = converter.getSymbols()
//     const url = Array.from({length: len}, () => symbols[Math.round(Math.random() * symbols.length)]).join('') // random url chars
//     const bytes = converter.encode(url)
//     const decodedUrl = converter.decode(bytes)
//     if(url !== decodedUrl) {
//         console.log(bytes)
//         console.log(url)
//         console.log(decodedUrl)
//         converter.decode(bytes)
//     }
// }

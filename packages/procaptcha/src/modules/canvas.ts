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
import { ProsopoEnvError } from '@prosopo/common'

function x64Add(m, n) {
    m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff]
    n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff]
    const o = [0, 0, 0, 0]
    o[3] += m[3] + n[3]
    o[2] += o[3] >>> 16
    o[3] &= 0xffff
    o[2] += m[2] + n[2]
    o[1] += o[2] >>> 16
    o[2] &= 0xffff
    o[1] += m[1] + n[1]
    o[0] += o[1] >>> 16
    o[1] &= 0xffff
    o[0] += m[0] + n[0]
    o[0] &= 0xffff
    return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]]
}

function x64Multiply(m, n) {
    m = [m[0] >>> 16, m[0] & 0xffff, m[1] >>> 16, m[1] & 0xffff]
    n = [n[0] >>> 16, n[0] & 0xffff, n[1] >>> 16, n[1] & 0xffff]
    const o = [0, 0, 0, 0]
    o[3] += m[3] * n[3]
    o[2] += o[3] >>> 16
    o[3] &= 0xffff
    o[2] += m[2] * n[3]
    o[1] += o[2] >>> 16
    o[2] &= 0xffff
    o[2] += m[3] * n[2]
    o[1] += o[2] >>> 16
    o[2] &= 0xffff
    o[1] += m[1] * n[3]
    o[0] += o[1] >>> 16
    o[1] &= 0xffff
    o[1] += m[2] * n[2]
    o[0] += o[1] >>> 16
    o[1] &= 0xffff
    o[1] += m[3] * n[1]
    o[0] += o[1] >>> 16
    o[1] &= 0xffff
    o[0] += m[0] * n[3] + m[1] * n[2] + m[2] * n[1] + m[3] * n[0]
    o[0] &= 0xffff
    return [(o[0] << 16) | o[1], (o[2] << 16) | o[3]]
}

function x64Rotl(m, n) {
    n %= 64
    if (n === 32) {
        return [m[1], m[0]]
    } else if (n < 32) {
        return [(m[0] << n) | (m[1] >>> (32 - n)), (m[1] << n) | (m[0] >>> (32 - n))]
    } else {
        n -= 32
        return [(m[1] << n) | (m[0] >>> (32 - n)), (m[0] << n) | (m[1] >>> (32 - n))]
    }
}

function x64LeftShift(m, n) {
    n %= 64
    if (n === 0) {
        return m
    } else if (n < 32) {
        return [(m[0] << n) | (m[1] >>> (32 - n)), m[1] << n]
    } else {
        return [m[1] << (n - 32), 0]
    }
}

function x64Xor(m, n) {
    return [m[0] ^ n[0], m[1] ^ n[1]]
}

function x64Fmix(h) {
    h = x64Xor(h, [0, h[0] >>> 1])
    h = x64Multiply(h, [0xff51afd7, 0xed558ccd])
    h = x64Xor(h, [0, h[0] >>> 1])
    h = x64Multiply(h, [0xc4ceb9fe, 0x1a85ec53])
    h = x64Xor(h, [0, h[0] >>> 1])
    return h
}

function x64hash128(key, seed) {
    key = key || ''
    seed = seed || 0
    const remainder = key.length % 16
    const bytes = key.length - remainder
    let h1 = [0, seed]
    let h2 = [0, seed]
    let k1 = [0, 0]
    let k2 = [0, 0]
    const c1 = [0x87c37b91, 0x114253d5]
    const c2 = [0x4cf5ad43, 0x2745937f]
    let i = 0
    for (i = 0; i < bytes; i = i + 16) {
        k1 = [
            (key.charCodeAt(i + 4) & 0xff) |
                ((key.charCodeAt(i + 5) & 0xff) << 8) |
                ((key.charCodeAt(i + 6) & 0xff) << 16) |
                ((key.charCodeAt(i + 7) & 0xff) << 24),
            (key.charCodeAt(i) & 0xff) |
                ((key.charCodeAt(i + 1) & 0xff) << 8) |
                ((key.charCodeAt(i + 2) & 0xff) << 16) |
                ((key.charCodeAt(i + 3) & 0xff) << 24),
        ]
        k2 = [
            (key.charCodeAt(i + 12) & 0xff) |
                ((key.charCodeAt(i + 13) & 0xff) << 8) |
                ((key.charCodeAt(i + 14) & 0xff) << 16) |
                ((key.charCodeAt(i + 15) & 0xff) << 24),
            (key.charCodeAt(i + 8) & 0xff) |
                ((key.charCodeAt(i + 9) & 0xff) << 8) |
                ((key.charCodeAt(i + 10) & 0xff) << 16) |
                ((key.charCodeAt(i + 11) & 0xff) << 24),
        ]
        k1 = x64Multiply(k1, c1)
        k1 = x64Rotl(k1, 31)
        k1 = x64Multiply(k1, c2)
        h1 = x64Xor(h1, k1)
        h1 = x64Rotl(h1, 27)
        h1 = x64Add(h1, h2)
        h1 = x64Add(x64Multiply(h1, [0, 5]), [0, 0x52dce729])
        k2 = x64Multiply(k2, c2)
        k2 = x64Rotl(k2, 33)
        k2 = x64Multiply(k2, c1)
        h2 = x64Xor(h2, k2)
        h2 = x64Rotl(h2, 31)
        h2 = x64Add(h2, h1)
        h2 = x64Add(x64Multiply(h2, [0, 5]), [0, 0x38495ab5])
    }
    k1 = [0, 0]
    k2 = [0, 0]
    switch (remainder) {
        case 15:
            k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 14)], 48))
            break
        case 14:
            k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 13)], 40))
            break
        case 13:
            k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 12)], 32))
            break
        case 12:
            k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 11)], 24))
            break
        case 11:
            k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 10)], 16))
            break
        case 10:
            k2 = x64Xor(k2, x64LeftShift([0, key.charCodeAt(i + 9)], 8))
            break
        case 9:
            k2 = x64Xor(k2, [0, key.charCodeAt(i + 8)])
            k2 = x64Multiply(k2, c2)
            k2 = x64Rotl(k2, 33)
            k2 = x64Multiply(k2, c1)
            h2 = x64Xor(h2, k2)
            break
        case 8:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 7)], 56))
            break
        case 7:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 6)], 48))
            break
        case 6:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 5)], 40))
            break
        case 5:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 4)], 32))
            break
        case 4:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 3)], 24))
            break
        case 3:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 2)], 16))
            break
        case 2:
            k1 = x64Xor(k1, x64LeftShift([0, key.charCodeAt(i + 1)], 8))
            break
        case 1:
            k1 = x64Xor(k1, [0, key.charCodeAt(i)])
            k1 = x64Multiply(k1, c1)
            k1 = x64Rotl(k1, 31)
            k1 = x64Multiply(k1, c2)
            h1 = x64Xor(h1, k1)
    }
    h1 = x64Xor(h1, [0, key.length])
    h2 = x64Xor(h2, [0, key.length])
    h1 = x64Add(h1, h2)
    h2 = x64Add(h2, h1)
    h1 = x64Fmix(h1)
    h2 = x64Fmix(h2)
    h1 = x64Add(h1, h2)
    h2 = x64Add(h2, h1)
    return (
        ('00000000' + (h1[0] >>> 0).toString(16)).slice(-8) +
        ('00000000' + (h1[1] >>> 0).toString(16)).slice(-8) +
        ('00000000' + (h2[0] >>> 0).toString(16)).slice(-8) +
        ('00000000' + (h2[1] >>> 0).toString(16)).slice(-8)
    )
}

export function picassoCanvas(roundNumber, seed, params) {
    const { area, offsetParameter, multiplier, fontSizeFactor, maxShadowBlur } = params

    class Prng {
        currentNumber: number

        constructor(seed) {
            this.currentNumber = seed % offsetParameter
            if (this.currentNumber <= 0) {
                this.currentNumber += offsetParameter
            }
        }

        getNext() {
            this.currentNumber = (multiplier * this.currentNumber) % offsetParameter
            return this.currentNumber
        }
    }

    function adaptRandomNumberToContext(randomNumber, maxBound, floatAllowed) {
        randomNumber = (randomNumber - 1) / offsetParameter
        if (floatAllowed) {
            return randomNumber * maxBound
        }

        return Math.floor(randomNumber * maxBound)
    }

    function addRandomCanvasGradient(prng, context, area) {
        const canvasGradient = context.createRadialGradient(
            adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
            adaptRandomNumberToContext(prng.getNext(), area.height, undefined),
            adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
            adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
            adaptRandomNumberToContext(prng.getNext(), area.height, undefined),
            adaptRandomNumberToContext(prng.getNext(), area.width, undefined)
        )
        canvasGradient.addColorStop(0, colors[adaptRandomNumberToContext(prng.getNext(), colors.length, undefined)])
        canvasGradient.addColorStop(1, colors[adaptRandomNumberToContext(prng.getNext(), colors.length, undefined)])
        context.fillStyle = canvasGradient
    }

    function generateRandomWord(prng, wordLength) {
        const minAscii = 65
        const maxAscii = 126
        const wordGenerated: string[] = []
        for (let i = 0; i < wordLength; i++) {
            const asciiCode = minAscii + (prng.getNext() % (maxAscii - minAscii))
            wordGenerated.push(String.fromCharCode(asciiCode))
        }

        return wordGenerated.join('')
    }

    if (!window.CanvasRenderingContext2D) {
        return 'unknown'
    }

    const colors = [
        '#FF6633',
        '#FFB399',
        '#FF33FF',
        '#FFFF99',
        '#00B3E6',
        '#E6B333',
        '#3366E6',
        '#999966',
        '#99FF99',
        '#B34D4D',
        '#80B300',
        '#809900',
        '#E6B3B3',
        '#6680B3',
        '#66991A',
        '#FF99E6',
        '#CCFF1A',
        '#FF1A66',
        '#E6331A',
        '#33FFCC',
        '#66994D',
        '#B366CC',
        '#4D8000',
        '#B33300',
        '#CC80CC',
        '#66664D',
        '#991AFF',
        '#E666FF',
        '#4DB3FF',
        '#1AB399',
        '#E666B3',
        '#33991A',
        '#CC9999',
        '#B3B31A',
        '#00E680',
        '#4D8066',
        '#809980',
        '#E6FF80',
        '#1AFF33',
        '#999933',
        '#FF3380',
        '#CCCC00',
        '#66E64D',
        '#4D80CC',
        '#9900B3',
        '#E64D66',
        '#4DB380',
        '#FF4D4D',
        '#99E6E6',
        '#6666FF',
    ]

    const primitives = [
        function arc(prng, context, area) {
            context.beginPath()
            context.arc(
                adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.height, undefined),
                adaptRandomNumberToContext(prng.getNext(), Math.min(area.width, area.height), undefined),
                adaptRandomNumberToContext(prng.getNext(), 2 * Math.PI, true),
                adaptRandomNumberToContext(prng.getNext(), 2 * Math.PI, true)
            )
            context.stroke()
        },
        function text(prng, context, area) {
            const wordLength = Math.max(1, adaptRandomNumberToContext(prng.getNext(), 5, undefined))
            const textToStroke = generateRandomWord(prng, wordLength)
            context.font = `${area.height / fontSizeFactor}px aafakefontaa`

            context.strokeText(
                textToStroke,
                adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.height, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.width, undefined)
            )
        },
        function bezierCurve(prng, context, area) {
            context.beginPath()
            context.moveTo(
                adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.height, undefined)
            )
            context.bezierCurveTo(
                adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.height, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.height, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.height, undefined)
            )
            context.stroke()
        },
        function quadraticCurve(prng, context, area) {
            context.beginPath()
            context.moveTo(
                adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.height, undefined)
            )
            context.quadraticCurveTo(
                adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.height, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.height, undefined)
            )
            context.stroke()
        },
        function ellipse(prng, context, area) {
            context.beginPath()
            context.ellipse(
                adaptRandomNumberToContext(prng.getNext(), area.width, undefined),
                adaptRandomNumberToContext(prng.getNext(), area.height, undefined),
                adaptRandomNumberToContext(prng.getNext(), Math.floor(area.width / 2), undefined),
                adaptRandomNumberToContext(prng.getNext(), Math.floor(area.height / 2), undefined),
                adaptRandomNumberToContext(prng.getNext(), 2 * Math.PI, true),
                adaptRandomNumberToContext(prng.getNext(), 2 * Math.PI, true),
                adaptRandomNumberToContext(prng.getNext(), 2 * Math.PI, true)
            )

            context.stroke()
        },
    ]

    try {
        const prng = new Prng(seed)
        const canvasElt = document.createElement('canvas')
        canvasElt.width = area.width
        canvasElt.height = area.height
        canvasElt.style.display = 'none'
        const context = canvasElt.getContext('2d')
        if (context !== null) {
            for (let i = 0; i < roundNumber; i++) {
                addRandomCanvasGradient(prng, context, area)
                context.shadowBlur = adaptRandomNumberToContext(prng.getNext(), maxShadowBlur, undefined)
                context.shadowColor = colors[adaptRandomNumberToContext(prng.getNext(), colors.length, undefined)]
                const randomPrimitive =
                    primitives[adaptRandomNumberToContext(prng.getNext(), primitives.length, undefined)]
                randomPrimitive(prng, context, area)
                context.fill()
            }
        }
        return x64hash128(canvasElt.toDataURL(), seed)
    } catch (e) {
        console.log(e)
        // TODO fix / improve error handling
        throw new ProsopoEnvError(e as Error)
    }
}

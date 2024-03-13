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
import _lodash from 'lodash'
import seedrandom from 'seedrandom'

// create a new rng with the given seed
export const rng = (seed: number | string) => {
    const rng = seedrandom(seed.toString())
    return {
        double: () => rng.double(),
        float: () => rng.quick(),
        int: () => {
            // js only has 53 bits of precision for integers, so we can't use the full 64 bits of the rng
            // take two 32 bit integers and combine them into a 53 bit integer
            const a = rng.int32()
            const b = rng.int32()
            return (a << 21) + b
        },
        int32: () => rng.int32(),
        bool: () => rng.int32() % 2 === 0,
    }
}

// set the seed for the global rng, i.e. seed `Math.random()`
export const setSeedGlobal = (seed: number | string) => {
    seedrandom(seed.toString(), { global: true })
}

// create a new lodash instance with the current Math.random() and other global state
export const lodash = () => {
    return _lodash.runInContext()
}

// create a new lodash instance with the given seed
export const seedLodash = (seed: number | string) => {
    // take a snapshot of the current Math.random() fn
    const orig = Math.random
    // replace Math.random with the seeded random
    seedrandom(seed.toString(), { global: true })
    // runInContext() creates a new lodash instance using the seeded Math.random()
    // the context is a snapshot of the state of the global javascript environment, i.e. Math.random() updated to the seedrandom instance
    const lodash = _lodash.runInContext()
    // restore the original Math.random() fn
    Math.random = orig
    // return the lodash instance with the seeded Math.random()
    return lodash
}

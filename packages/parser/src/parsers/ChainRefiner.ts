// import { Refiner } from "./Refiner.js";

// export type Options<T> = {
//     refiners: Refiner<T>[]
//     name?: string
// }

// export class ChainRefiner<T> extends Refiner<T> {
//     private _refiners: Refiner<T>[]
//     private _name?: string

//     constructor(private options: Options<T>) {
//         super()
//         this._name = options.name
//         this._refiners = options.refiners
//         this._refiners = this.refiners // defensive clone
//     }

//     public get refiners(): Refiner<T>[] {
//         return this._refiners.map(r => r.clone()) // defensive clone
//     }

//     public override refine(value: T): T {
//         for (const refiner of this.refiners) {
//             value = refiner.refine(value)
//         }
//         return value
//     }

//     public override clone(): ChainRefiner<T> {
//         return new ChainRefiner({
//             refiners: this.refiners,
//             name: this._name
//         })
//     }

//     public override get name(): string {
//         if (this._name !== undefined) {
//             return this._name
//         }
//         return this.refiners.map(r => r.name).join(',')
//     }
// }

// export const pChain = <T>(options: Options<T>) => new ChainRefiner(options)
// export const chain = pChain
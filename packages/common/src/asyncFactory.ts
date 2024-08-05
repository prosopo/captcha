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
import { ProsopoEnvError } from './error.js'

export abstract class AsyncFactory {
    constructor() {
        throw new ProsopoEnvError('GENERAL.ASYNC_FACTORY_CREATE')
    }

    // biome-ignore lint/suspicious/noExplicitAny: has to be any type to represent any args
    public static async create(...args: any[]) {
        return await Object.create(AsyncFactory.prototype).init(...args)
    }

    // biome-ignore lint/suspicious/noExplicitAny: has to be any type to represent any args
    public abstract init(...args: any[]): Promise<this>
}

export default AsyncFactory

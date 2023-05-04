// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo/procaptcha>.
//
// procaptcha is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// procaptcha is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with procaptcha.  If not, see <http://www.gnu.org/licenses/>.
import { ProsopoEnvError } from '@prosopo/common'

export abstract class AsyncFactory {
    constructor() {
        throw new ProsopoEnvError('GENERAL.ASYNC_FACTORY_CREATE')
    }

    public static async create(...args: any[]) {
        return await Object.create(this.prototype).init(...args)
    }

    public abstract init(...args: any[]): Promise<this>
}

export default AsyncFactory

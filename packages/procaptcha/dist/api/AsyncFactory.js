"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsyncFactory = void 0;
// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of procaptcha <https://github.com/prosopo-io/procaptcha>.
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
const contract_1 = require("@prosopo/contract");
class AsyncFactory {
    constructor() {
        throw new contract_1.ProsopoEnvError("Use `create` factory method");
    }
    static async create(...args) {
        return await Object.create(this.prototype).init(...args);
    }
}
exports.AsyncFactory = AsyncFactory;
exports.default = AsyncFactory;
//# sourceMappingURL=AsyncFactory.js.map
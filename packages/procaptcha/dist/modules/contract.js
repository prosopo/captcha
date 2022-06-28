"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProsopoContract = exports.getWsProvider = void 0;
const tslib_1 = require("tslib");
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
const ProsopoContract_1 = tslib_1.__importDefault(require("../api/ProsopoContract"));
const rpc_provider_1 = require("@polkadot/rpc-provider");
function getWsProvider(url) {
    return new rpc_provider_1.WsProvider(url);
}
exports.getWsProvider = getWsProvider;
async function getProsopoContract(address, dappAddress, account, providerInterface) {
    return await ProsopoContract_1.default.create(address, dappAddress, account, providerInterface ?? getWsProvider());
}
exports.getProsopoContract = getProsopoContract;
//# sourceMappingURL=contract.js.map
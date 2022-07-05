"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProsopoContract = void 0;
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
// import {Hash} from '@polkadot/types/interfaces';
const ProsopoContractBase_1 = tslib_1.__importDefault(require("./ProsopoContractBase"));
// TODO: import return types from provider: separate types/common package.
class ProsopoContract extends ProsopoContractBase_1.default {
    async getRandomProvider() {
        return await this.query('getRandomActiveProvider', [this.account.address, this.dappAddress]);
    }
    async getCaptchaSolutionCommitment(commitmentId) {
        return await this.query('getCaptchaSolutionCommitment', [commitmentId]);
    }
    async dappUserCommit(signer, captchaDatasetId, userMerkleTreeRoot, providerAddress) {
        return await this.transaction(signer, 'dappUserCommit', [this.dappAddress, captchaDatasetId, userMerkleTreeRoot, providerAddress]);
    }
    async dappOperatorIsHumanUser(threshold) {
        // TODO get threshold from dapp contract using getStorage or allow override in UI and fallback on contract protection layer?
        return await this.query('dappOperatorIsHumanUser', [this.account.address, threshold]);
    }
}
exports.ProsopoContract = ProsopoContract;
exports.default = ProsopoContract;
//# sourceMappingURL=ProsopoContract.js.map
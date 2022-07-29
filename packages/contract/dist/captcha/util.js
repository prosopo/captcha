"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.imageHash = exports.hexHash = void 0;
const tslib_1 = require("tslib");
// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo-io/provider>.
//
// provider is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// provider is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with provider.  If not, see <http://www.gnu.org/licenses/>.
const util_crypto_1 = require("@polkadot/util-crypto");
function hexHash(data) {
    return (0, util_crypto_1.blake2AsHex)(data);
}
exports.hexHash = hexHash;
function imageHash(path) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        // data must remain in the same order so load images synchronously
        // const fileBuffer = await readFile(path)
        return hexHash(path);
    });
}
exports.imageHash = imageHash;
//# sourceMappingURL=util.js.map
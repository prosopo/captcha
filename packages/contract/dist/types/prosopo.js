"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payee = exports.PayeeSchema = exports.GovernanceStatus = void 0;
// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of contract <https://github.com/prosopo-io/contract>.
//
// contract is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// contract is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with contract. If not, see <http://www.gnu.org/licenses/>.
const zod_1 = require("zod");
var GovernanceStatus;
(function (GovernanceStatus) {
    GovernanceStatus["Active"] = "Active";
    GovernanceStatus["Inactive"] = "Inactive";
    GovernanceStatus["Deactivated"] = "Deactivated";
})(GovernanceStatus = exports.GovernanceStatus || (exports.GovernanceStatus = {}));
exports.PayeeSchema = zod_1.z.enum(['Provider', 'Dapp', 'None']);
exports.Payee = exports.PayeeSchema.Values;
//# sourceMappingURL=prosopo.js.map
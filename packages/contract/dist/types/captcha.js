"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatasetWithIdsAndTreeSchema = exports.DatasetWithIdsSchema = exports.DatasetSchema = exports.CaptchasSolvedSchema = exports.CaptchaSolutionSchema = exports.CaptchaSolution = exports.CaptchasWithIdSchema = exports.CaptchasSchema = exports.SelectAllSolvedCaptchaSchema = exports.SelectAllCaptchaSchema = exports.CaptchaTextSchema = exports.CaptchaImageSchema = exports.CaptchaWithIdAndSolutionSchema = exports.CaptchaWithIdSchema = exports.CaptchaSchema = exports.CaptchaStatus = exports.CaptchaStates = exports.CaptchaItemTypes = exports.CaptchaTypes = void 0;
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
const zod_1 = require("zod");
// import {ProsopoConfigSchema} from "./config";
var CaptchaTypes;
(function (CaptchaTypes) {
    CaptchaTypes["SelectAll"] = "SelectAll";
})(CaptchaTypes = exports.CaptchaTypes || (exports.CaptchaTypes = {}));
var CaptchaItemTypes;
(function (CaptchaItemTypes) {
    CaptchaItemTypes["Text"] = "text";
    CaptchaItemTypes["Image"] = "image";
})(CaptchaItemTypes = exports.CaptchaItemTypes || (exports.CaptchaItemTypes = {}));
var CaptchaStates;
(function (CaptchaStates) {
    CaptchaStates["Solved"] = "solved";
    CaptchaStates["Unsolved"] = "unsolved";
})(CaptchaStates = exports.CaptchaStates || (exports.CaptchaStates = {}));
const CaptchaItemTypesZod = zod_1.z.nativeEnum(CaptchaItemTypes);
var CaptchaStatus;
(function (CaptchaStatus) {
    CaptchaStatus["Pending"] = "Pending";
    CaptchaStatus["Approved"] = "Approved";
    CaptchaStatus["Disapproved"] = "Disapproved";
})(CaptchaStatus = exports.CaptchaStatus || (exports.CaptchaStatus = {}));
exports.CaptchaSchema = zod_1.z.object({
    captchaId: zod_1.z.union([zod_1.z.string(), zod_1.z.undefined()]),
    salt: zod_1.z.string(),
    solution: zod_1.z.number().array().optional(),
    timeLimit: zod_1.z.number().optional()
});
exports.CaptchaWithIdSchema = zod_1.z.object({
    captchaId: zod_1.z.string(),
    salt: zod_1.z.string(),
    solution: zod_1.z.number().array().optional()
});
exports.CaptchaWithIdAndSolutionSchema = zod_1.z.object({
    captchaId: zod_1.z.string(),
    salt: zod_1.z.string(),
    solution: zod_1.z.number().array()
});
exports.CaptchaImageSchema = zod_1.z.object({
    path: zod_1.z.string(),
    type: CaptchaItemTypesZod
});
exports.CaptchaTextSchema = zod_1.z.object({
    text: zod_1.z.string(),
    type: CaptchaItemTypesZod
});
exports.SelectAllCaptchaSchema = exports.CaptchaSchema.extend({
    solution: zod_1.z.number().array().optional(),
    items: zod_1.z.union([zod_1.z.array(exports.CaptchaImageSchema), zod_1.z.array(exports.CaptchaTextSchema)]),
    target: zod_1.z.string()
});
exports.SelectAllSolvedCaptchaSchema = exports.CaptchaWithIdAndSolutionSchema.extend({
    solution: zod_1.z.number().array(),
    items: zod_1.z.union([zod_1.z.array(exports.CaptchaImageSchema), zod_1.z.string().array()]),
    target: zod_1.z.string()
});
exports.CaptchasSchema = zod_1.z.array(exports.SelectAllCaptchaSchema);
exports.CaptchasWithIdSchema = zod_1.z.array(exports.CaptchaWithIdSchema);
exports.CaptchaSolution = zod_1.z.object({
    captchaId: zod_1.z.string(),
    solution: zod_1.z.number().array(),
    salt: zod_1.z.string(),
});
exports.CaptchaSolutionSchema = zod_1.z.array(exports.CaptchaSolution);
exports.CaptchasSolvedSchema = zod_1.z.array(exports.SelectAllSolvedCaptchaSchema);
exports.DatasetSchema = zod_1.z.object({
    datasetId: zod_1.z.string().optional(),
    captchas: exports.CaptchasSchema,
    format: zod_1.z.nativeEnum(CaptchaTypes),
    tree: zod_1.z.array(zod_1.z.array(zod_1.z.string())).optional(),
    timeLimit: zod_1.z.number().optional()
});
exports.DatasetWithIdsSchema = zod_1.z.object({
    datasetId: zod_1.z.string(),
    captchas: zod_1.z.array(exports.SelectAllCaptchaSchema),
    format: zod_1.z.nativeEnum(CaptchaTypes),
    tree: zod_1.z.array(zod_1.z.array(zod_1.z.string())).optional()
});
exports.DatasetWithIdsAndTreeSchema = exports.DatasetWithIdsSchema.extend({
    tree: zod_1.z.array(zod_1.z.array(zod_1.z.string()))
});
//# sourceMappingURL=captcha.js.map
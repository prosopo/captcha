"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCaptchaAssets = exports.computePendingRequestHash = exports.computeCaptchaSolutionHash = exports.matchItemsToSolutions = exports.computeItemHash = exports.computeCaptchaHash = exports.compareCaptchaSolutions = exports.sortAndComputeHashes = exports.captchaSort = exports.parseAndSortCaptchaSolutions = exports.parseCaptchaDataset = void 0;
// Copyright (C) 2021-2022 Prosopo (UK) Ltd.
// This file is part of provider <https://github.com/prosopo/provider>.
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
var types_1 = require("@prosopo/types");
var common_1 = require("@prosopo/common");
var util_1 = require("./util");
var util_2 = require("@polkadot/util");
// import {encodeAddress} from "@polkadot/util-crypto";
/**
 * Parse a dataset
 * @return {JSON} captcha dataset, stored in JSON
 * @param datasetJSON
 */
function parseCaptchaDataset(datasetJSON) {
    try {
        return types_1.DatasetSchema.parse(datasetJSON);
    }
    catch (err) {
        throw new common_1.ProsopoEnvError(err, 'ERRORS.DATASET.PARSE_ERROR');
    }
}
exports.parseCaptchaDataset = parseCaptchaDataset;
/**
 * Make sure captcha solutions are in the correct format
 * @param {JSON} captchaJSON captcha solutions received from the api
 * @return {CaptchaSolution[]} an array of parsed and sorted captcha solutions
 */
function parseAndSortCaptchaSolutions(captchaJSON) {
    try {
        var parsed = types_1.CaptchaSolutionArraySchema.parse(captchaJSON);
        parsed.map(function (captcha) { return (__assign(__assign({}, captcha), { solution: captcha.solution.sort() })); });
        return parsed;
    }
    catch (err) {
        throw new common_1.ProsopoEnvError(err, 'ERRORS.CAPTCHA.PARSE_ERROR');
    }
}
exports.parseAndSortCaptchaSolutions = parseAndSortCaptchaSolutions;
function captchaSort(a, b) {
    return a.captchaId.localeCompare(b.captchaId);
}
exports.captchaSort = captchaSort;
function sortAndComputeHashes(received, stored) {
    received.sort(captchaSort);
    stored.sort(captchaSort);
    return stored.map(function (_a, index) {
        var salt = _a.salt, _b = _a.items, items = _b === void 0 ? [] : _b, _c = _a.target, target = _c === void 0 ? '' : _c, captchaId = _a.captchaId, solved = _a.solved;
        if (captchaId != received[index].captchaId) {
            throw new common_1.ProsopoEnvError('CAPTCHA.ID_MISMATCH');
        }
        return {
            hash: computeCaptchaHash({
                solution: solved ? received[index].solution : [],
                salt: salt,
                items: items,
                target: target,
            }, true, true, false),
            captchaId: captchaId,
        };
    });
}
exports.sortAndComputeHashes = sortAndComputeHashes;
/**
 * Take an array of CaptchaSolutions and Captchas and check if the solutions are the same for each pair
 * @param  {CaptchaSolution[]} received
 * @param  {Captcha[]} stored
 * @return {boolean}
 */
function compareCaptchaSolutions(received, stored) {
    if (received.length && stored.length && received.length === stored.length) {
        var hashes = sortAndComputeHashes(received, stored);
        return hashes.every(function (_a) {
            var hash = _a.hash, captchaId = _a.captchaId;
            return hash === captchaId;
        });
    }
    return false;
}
exports.compareCaptchaSolutions = compareCaptchaSolutions;
/**
 * Compute the hash of various types of captcha
 * @param  {Captcha} captcha
 * @param  {boolean} includeSolution
 * @param  {boolean} includeSalt
 * @param  {boolean} sortItemHashes
 * @return {string} the hex string hash
 */
function computeCaptchaHash(captcha, includeSolution, includeSalt, sortItemHashes) {
    if (includeSolution === void 0) { includeSolution = false; }
    if (includeSalt === void 0) { includeSalt = false; }
    try {
        var itemHashes = captcha.items.map(function (item, index) {
            if (item.hash) {
                return item.hash;
            }
            else {
                throw new common_1.ProsopoEnvError('CAPTCHA.MISSING_ITEM_HASH', computeCaptchaHash.name, undefined, index);
            }
        });
        return (0, common_1.hexHashArray)(__spreadArray(__spreadArray([
            captcha.target
        ], (includeSolution && captcha.solution ? captcha.solution.sort() : []), true), [
            includeSalt ? captcha.salt : '',
            sortItemHashes ? itemHashes.sort() : itemHashes,
        ], false));
    }
    catch (err) {
        throw new common_1.ProsopoEnvError(err);
    }
}
exports.computeCaptchaHash = computeCaptchaHash;
/** Compute the hash of a captcha item, downloading the image if necessary
 * @param  {Item} item
 * @return {Promise<HashedItem>} the hex string hash of the item
 */
function computeItemHash(item) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b;
        var _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!(item.type === 'text')) return [3 /*break*/, 1];
                    return [2 /*return*/, __assign(__assign({}, item), { hash: (0, common_1.hexHash)(item.data) })];
                case 1:
                    if (!(item.type === 'image')) return [3 /*break*/, 3];
                    _a = [__assign({}, item)];
                    _c = {};
                    _b = common_1.hexHash;
                    return [4 /*yield*/, (0, util_1.downloadImage)(item.data)];
                case 2: return [2 /*return*/, __assign.apply(void 0, _a.concat([(_c.hash = _b.apply(void 0, [_d.sent()]), _c)]))];
                case 3: throw new common_1.ProsopoEnvError('CAPTCHA.INVALID_ITEM_FORMAT');
            }
        });
    });
}
exports.computeItemHash = computeItemHash;
/**
 * Converts an indexed captcha solution to a hashed captcha solution or simply returns the hash if it is already hashed
 * @return {HashedSolution[]}
 * @param {RawSolution[] | HashedSolution[]} solutions
 * @param {Item[]} items
 */
function matchItemsToSolutions(solutions, items) {
    return ((solutions === null || solutions === void 0 ? void 0 : solutions.map(function (solution) {
        var hash = items && items[solution] && items[solution].hash ? items[solution].hash : solution;
        if (!hash) {
            throw new common_1.ProsopoEnvError('CAPTCHA.MISSING_ITEM_HASH');
        }
        if (!(0, util_2.isHex)(hash)) {
            throw new common_1.ProsopoEnvError('CAPTCHA.INVALID_ITEM_HASH');
        }
        return hash;
    })) || []);
}
exports.matchItemsToSolutions = matchItemsToSolutions;
/**
 * Create a unique solution commitment
 * @param  {CaptchaSolution} captcha
 * @return {string} the hex string hash
 */
function computeCaptchaSolutionHash(captcha) {
    // TODO: should the captchaContentId be validated?
    return (0, common_1.hexHashArray)([captcha.captchaId, captcha.captchaContentId, __spreadArray([], captcha.solution, true).sort(), captcha.salt]);
}
exports.computeCaptchaSolutionHash = computeCaptchaSolutionHash;
/**
 * Compute hash for an array of captcha ids, userAccount, and salt, which serves as the identifier for a pending request
 * @param  {string[]} captchaIds
 * @param  {string} userAccount
 * @param  {string} salt
 * @return {string}
 */
function computePendingRequestHash(captchaIds, userAccount, salt) {
    return (0, common_1.hexHashArray)(__spreadArray(__spreadArray([], captchaIds.sort(), true), [userAccount, salt], false));
}
exports.computePendingRequestHash = computePendingRequestHash;
/**
 * Parse the image items in a captcha and pass back a URI if they exist
 */
function parseCaptchaAssets(item, assetsResolver) {
    return __assign(__assign({}, item), { path: (assetsResolver === null || assetsResolver === void 0 ? void 0 : assetsResolver.resolveAsset(item.data).getURL()) || item.data });
}
exports.parseCaptchaAssets = parseCaptchaAssets;

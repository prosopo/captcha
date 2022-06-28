"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCaptchaAssets = exports.computePendingRequestHash = exports.convertCaptchaToCaptchaSolution = exports.computeCaptchaHashes = exports.computeCaptchaSolutionHash = exports.computeCaptchaHash = exports.compareCaptcha = exports.compareCaptchaSolutions = exports.parseCaptchaSolutions = exports.parseCaptchas = exports.parseCaptchaDataset = exports.addHashesToDataset = void 0;
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
const errors_1 = require("../errors");
const types_1 = require("../types");
const util_1 = require("./util");
// import {encodeAddress} from "@polkadot/util-crypto";
function addHashesToDataset(dataset, tree) {
    try {
        dataset.captchas = dataset.captchas.map((captcha, index) => (Object.assign(Object.assign({}, captcha), { captchaId: tree.leaves[index].hash })));
        return dataset;
    }
    catch (err) {
        throw new Error(`${errors_1.ERRORS.DATASET.HASH_ERROR.message}:\n${err}`);
    }
}
exports.addHashesToDataset = addHashesToDataset;
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
        throw new Error(`${errors_1.ERRORS.DATASET.PARSE_ERROR.message}:\n${err}`);
    }
}
exports.parseCaptchaDataset = parseCaptchaDataset;
/**
 * Make sure captchas are in the correct format
 * @param {JSON} captchaJSON captchas that have been passed in via dataset file
 * @return {CaptchaWithoutId[]} an array of parsed captchas that have not yet been hashed and have no IDs
 */
function parseCaptchas(captchaJSON) {
    try {
        return types_1.CaptchasSchema.parse(captchaJSON);
    }
    catch (err) {
        throw new Error(`${errors_1.ERRORS.CAPTCHA.PARSE_ERROR.message}:\n${err}`);
    }
}
exports.parseCaptchas = parseCaptchas;
/**
 * Make sure captcha solutions are in the correct format
 * @param {JSON} captchaJSON captcha solutions received from the api
 * @return {CaptchaSolution[]} an array of parsed captcha solutions
 */
function parseCaptchaSolutions(captchaJSON) {
    try {
        return types_1.CaptchaSolutionSchema.parse(captchaJSON);
    }
    catch (err) {
        throw new Error(`${errors_1.ERRORS.CAPTCHA.PARSE_ERROR.message}:\n${err}`);
    }
}
exports.parseCaptchaSolutions = parseCaptchaSolutions;
/**
 * Take an array of CaptchaSolutions and Captchas and check if the solutions are the same for each pair
 * @param  {CaptchaSolution[]} received
 * @param  {Captcha[]} stored
 * @return {boolean}
 */
function compareCaptchaSolutions(received, stored) {
    if (received.length && stored.length && received.length === stored.length) {
        const arr1Sorted = received.sort((a, b) => (a.captchaId > b.captchaId ? 1 : -1));
        const arr2Sorted = stored.sort((a, b) => (a.captchaId > b.captchaId ? 1 : -1));
        const successArr = arr1Sorted.map((captcha, idx) => compareCaptcha(captcha, arr2Sorted[idx]));
        return successArr.every((val) => val);
    }
    return false;
}
exports.compareCaptchaSolutions = compareCaptchaSolutions;
/**
 * Check whether the `solution` arrays in a CaptchaSolution and stored Captcha are equivalent
 * @param  {CaptchaSolution} received
 * @param  {Captcha} stored
 * @return {boolean}
 */
function compareCaptcha(received, stored) {
    if (stored.solution && stored.solution.length > 0) {
        // this is a captcha we know the solution for
        const arr1 = received.solution.sort();
        const arr2 = stored.solution.sort();
        return arr1.every((value, index) => value === arr2[index]) && received.captchaId === stored.captchaId;
    }
    // we don't know the solution so just assume it's correct
    return true;
}
exports.compareCaptcha = compareCaptcha;
/**
 * Compute the hash of various types of captcha, loading any images and hashing them in the process
 * @param  {Captcha} captcha
 * @return {string} the hex string hash
 */
function computeCaptchaHash(captcha) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const itemHashes = [];
        for (const item of captcha.items) {
            if (item.type === 'image') {
                itemHashes.push(yield (0, util_1.imageHash)(item.path));
            }
            else if (item.type === 'text') {
                itemHashes.push((0, util_1.hexHash)(item.text));
            }
            else {
                throw (new Error('NotImplemented: only image and text item types allowed'));
            }
        }
        return (0, util_1.hexHash)([captcha.target, captcha.solution, captcha.salt, itemHashes].join());
    });
}
exports.computeCaptchaHash = computeCaptchaHash;
/**
 * Create a unique solution commitment
 * @param  {CaptchaSolution} captcha
 * @return {string} the hex string hash
 */
function computeCaptchaSolutionHash(captcha) {
    return (0, util_1.hexHash)([captcha.captchaId, captcha.solution, captcha.salt].join());
}
exports.computeCaptchaSolutionHash = computeCaptchaSolutionHash;
/**
 * Compute hashes for an array of captchas
 * @param  {Captcha[]} captchas
 * @return {Promise<CaptchaSolution[]>} captchasWithHashes
 */
function computeCaptchaHashes(captchas) {
    return tslib_1.__awaiter(this, void 0, void 0, function* () {
        const captchasWithHashes = [];
        for (const captcha of captchas) {
            const captchaId = yield computeCaptchaHash(captcha);
            const captchaWithId = Object.assign({ captchaId }, captcha);
            const captchaSol = convertCaptchaToCaptchaSolution(captchaWithId);
            captchasWithHashes.push(captchaSol);
        }
        return captchasWithHashes;
    });
}
exports.computeCaptchaHashes = computeCaptchaHashes;
/**
 * Map a Captcha to a Captcha solution (drop items, target, etc.)
 * @param  {Captcha} captcha
 * @return {CaptchaSolution}
 */
function convertCaptchaToCaptchaSolution(captcha) {
    return { captchaId: captcha.captchaId, salt: captcha.salt, solution: captcha.solution };
}
exports.convertCaptchaToCaptchaSolution = convertCaptchaToCaptchaSolution;
/**
 * Compute hash for an array of captcha ids, userAccount, and salt, which serves as the identifier for a pending request
 * @param  {string[]} captchaIds
 * @param  {string} userAccount
 * @param  {string} salt
 * @return {string}
 */
function computePendingRequestHash(captchaIds, userAccount, salt) {
    return (0, util_1.hexHash)([...captchaIds.sort(), userAccount, salt].join());
}
exports.computePendingRequestHash = computePendingRequestHash;
/**
 * Parse the image items in a captcha and pass back a URI if they exist
 */
function parseCaptchaAssets(item, assetsResolver) {
    return Object.assign(Object.assign({}, item), { path: (assetsResolver === null || assetsResolver === void 0 ? void 0 : assetsResolver.resolveAsset(item.path).getURL()) || item.path });
}
exports.parseCaptchaAssets = parseCaptchaAssets;
//# sourceMappingURL=captcha.js.map
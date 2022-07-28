import { CaptchaMerkleTree } from './merkle';
import { AssetsResolver, Captcha, CaptchaImage, CaptchaSolution, CaptchaWithoutId, Dataset, DatasetWithIds } from '../types';
export declare function addHashesToDataset(dataset: Dataset, tree: CaptchaMerkleTree): DatasetWithIds;
/**
 * Parse a dataset
 * @return {JSON} captcha dataset, stored in JSON
 * @param datasetJSON
 */
export declare function parseCaptchaDataset(datasetJSON: JSON): Dataset;
/**
 * Make sure captchas are in the correct format
 * @param {JSON} captchaJSON captchas that have been passed in via dataset file
 * @return {CaptchaWithoutId[]} an array of parsed captchas that have not yet been hashed and have no IDs
 */
export declare function parseCaptchas(captchaJSON: JSON): CaptchaWithoutId[];
/**
 * Make sure captcha solutions are in the correct format
 * @param {JSON} captchaJSON captcha solutions received from the api
 * @return {CaptchaSolution[]} an array of parsed captcha solutions
 */
export declare function parseCaptchaSolutions(captchaJSON: JSON): CaptchaSolution[];
/**
 * Take an array of CaptchaSolutions and Captchas and check if the solutions are the same for each pair
 * @param  {CaptchaSolution[]} received
 * @param  {Captcha[]} stored
 * @return {boolean}
 */
export declare function compareCaptchaSolutions(received: CaptchaSolution[], stored: Captcha[]): boolean;
/**
 * Check whether the `solution` arrays in a CaptchaSolution and stored Captcha are equivalent
 * @param  {CaptchaSolution} received
 * @param  {Captcha} stored
 * @return {boolean}
 */
export declare function compareCaptcha(received: CaptchaSolution, stored: Captcha): boolean;
/**
 * Compute the hash of various types of captcha, loading any images and hashing them in the process
 * @param  {Captcha} captcha
 * @return {string} the hex string hash
 */
export declare function computeCaptchaHash(captcha: CaptchaWithoutId): Promise<string>;
/**
 * Create a unique solution commitment
 * @param  {CaptchaSolution} captcha
 * @return {string} the hex string hash
 */
export declare function computeCaptchaSolutionHash(captcha: CaptchaSolution): string;
/**
 * Compute hashes for an array of captchas
 * @param  {Captcha[]} captchas
 * @return {Promise<CaptchaSolution[]>} captchasWithHashes
 */
export declare function computeCaptchaHashes(captchas: CaptchaWithoutId[]): Promise<CaptchaSolution[]>;
/**
 * Map a Captcha to a Captcha solution (drop items, target, etc.)
 * @param  {Captcha} captcha
 * @return {CaptchaSolution}
 */
export declare function convertCaptchaToCaptchaSolution(captcha: Captcha): CaptchaSolution;
/**
 * Compute hash for an array of captcha ids, userAccount, and salt, which serves as the identifier for a pending request
 * @param  {string[]} captchaIds
 * @param  {string} userAccount
 * @param  {string} salt
 * @return {string}
 */
export declare function computePendingRequestHash(captchaIds: string[], userAccount: string, salt: string): string;
/**
 * Parse the image items in a captcha and pass back a URI if they exist
 */
export declare function parseCaptchaAssets(item: CaptchaImage, assetsResolver: AssetsResolver | undefined): {
    path: string;
    type: import("../types").CaptchaItemTypes;
};
//# sourceMappingURL=captcha.d.ts.map
import {
    Captcha,
    Dataset,
    DatasetSchema,
    CaptchasSchema,
    CaptchaSolutionSchema,
    CaptchaSolution, CaptchaWithoutId, DatasetWithIds
} from "./types/captcha";
import {ERRORS} from './errors'
import {CaptchaMerkleTree} from "./merkle";
import {hexHash, imageHash, readFile} from "./util";


export function addHashesToDataset(dataset: Dataset, tree: CaptchaMerkleTree): DatasetWithIds {
    try {
        dataset['captchas'] = dataset['captchas'].map((captcha, index) => (
                {...captcha, captchaId: tree.leaves[index].hash} as Captcha
            )
        ) as Captcha[]
        return <DatasetWithIds>dataset
    } catch (err) {
        throw(`${ERRORS.DATASET.HASH_ERROR.message}:\n${err}`);
    }

}

export function parseCaptchaDataset(datasetJSON: JSON): Dataset {
    try {
        return DatasetSchema.parse(datasetJSON)
    } catch (err) {
        throw(`${ERRORS.DATASET.PARSE_ERROR.message}:\n${err}`);
    }
}


export function parseCaptchas(captchaJSON: JSON): CaptchaWithoutId[] {
    try {
        return CaptchasSchema.parse(captchaJSON)
    } catch (err) {
        throw(`${ERRORS.CAPTCHA.PARSE_ERROR.message}:\n${err}`);
    }
}

export function parseCaptchaSolutions(captchaJSON: JSON): CaptchaSolution[] {
    try {
        return CaptchaSolutionSchema.parse(captchaJSON)
    } catch (err) {
        throw(`${ERRORS.CAPTCHA.PARSE_ERROR.message}:\n${err}`);
    }
}

export function compareCaptchaSolutions(received: CaptchaSolution[], stored: Captcha[]): boolean {
    if (received.length && stored.length && received.length === stored.length) {
        let arr1Sorted = received.sort((a, b) => a.captchaId > b.captchaId ? 1 : -1);
        let arr2Sorted = stored.sort((a, b) => a.captchaId! > b.captchaId! ? 1 : -1);
        let successArr = arr1Sorted.map((captcha, idx) => compareCaptcha(captcha, arr2Sorted[idx]));
        return successArr.every(val => val)
    } else {
        return false
    }
}

/**
 * Check whether the `solution` arrays in a CaptchaSolution and stored Captcha are equivalent
 * @param  {CaptchaSolution} received
 * @param  {Captcha} stored
 * @return {boolean}
 */
export function compareCaptcha(received: CaptchaSolution, stored: Captcha): boolean {
    if (stored.solution && stored.solution.length > 0) {
        // this is a captcha we know the solution for
        let arr1 = received.solution.sort();
        let arr2 = stored.solution.sort();
        return arr1.every((value, index) => value === arr2[index]) && received.captchaId === stored.captchaId;
    } else {
        // we don't know the solution so just assume it's correct
        return true
    }
}

/**
 * Compute the hash of various types of captcha, loading any images and hashing them in the process
 * @param  {Captcha} captcha
 * @return {string} the hex string hash
 */
export async function computeCaptchaHash(captcha: CaptchaWithoutId) {
    let itemHashes: string[] = [];
    for (let item of captcha['items']) {
        if (item['type'] === 'image') {
            itemHashes.push(await imageHash(item['path']))
        } else if (item['type'] === 'text') {
            itemHashes.push(hexHash(item['text']));
        } else {
            throw(new Error('NotImplemented: only image and text item types allowed'))
        }
    }
    return hexHash([captcha['target'], captcha['solution'], captcha['salt'], itemHashes].join())
}

/**
 * Create a unique solution commitment
 * @param  {CaptchaSolution} captcha
 * @return {string} the hex string hash
 */
export function computeCaptchaSolutionHash(captcha: CaptchaSolution) {
    return hexHash([captcha['captchaId'], captcha['solution'], captcha['salt']].join())
}

/**
 * Compute hashes for an array of captchas
 * @param  {Captcha[]} captchas
 * @return {Promise<CaptchaSolution[]>} captchasWithHashes
 */
export async function computeCaptchaHashes(captchas: CaptchaWithoutId[]): Promise<CaptchaSolution[]> {
    let captchasWithHashes: CaptchaSolution[] = []
    for (let captcha of captchas) {
        let captchaId = await computeCaptchaHash(captcha)
        let captchaWithId: Captcha = {captchaId: captchaId, ...captcha}
        let captchaSol = convertCaptchaToCaptchaSolution(captchaWithId);
        captchasWithHashes.push(captchaSol);
    }
    return captchasWithHashes
}

/**
 * Map a Captcha to a Captcha solution (drop items, target, etc.)
 * @param  {Captcha} captcha
 * @param  {string} captchaId
 * @return {CaptchaSolution}
 */
export function convertCaptchaToCaptchaSolution(captcha: Captcha): CaptchaSolution {
    return {captchaId: captcha.captchaId, salt: captcha.salt, solution: captcha.solution}
}

/**
 * Compute hash for an array of captcha ids, userAccount, and salt, which serves as the identifier for a pending request
 * @param  {string[]} captchaIds
 * @param  {string} userAccount
 * @param  {string} salt
 * @return {string}
 */
export function computePendingRequestHash(captchaIds: string[], userAccount: string, salt: string): string {
    return hexHash([...captchaIds.sort(), userAccount, salt].join())
}

import {MongoClient} from "mongodb";

export type Hash = string;

export type Captcha = {
    captchas: [{
        captchaId: string,
        captchaData: [File],
        merkleTreePath: [Hash]
    }],
    datasetId: string,
    captchaProviderId: string
}

export type CaptchaSolution = {
    captchas: [{
        captchaId: string,
        solution: [number],
        salt: string
    }]
}

export type CaptchaSolutionResponse = {
    captchas: [{
        captchaId: string,
        solved: boolean,
        merkleTreeProof: [Hash]
    }],
    datasetId: string,
    captchaProviderId: string
}


export interface Prosopo {
    datasetGet(db: MongoClient): Promise<Hash>;

    captchaGet(db: MongoClient, userId: string, dappId: string): Promise<Captcha>;

    captchaSolution(db: MongoClient, userId: string, dappId: string, captchaSolution: CaptchaSolution): Promise<CaptchaSolutionResponse>
}
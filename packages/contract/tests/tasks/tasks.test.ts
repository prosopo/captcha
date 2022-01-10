import {expect} from 'chai';
import {Tasks} from '../../src/tasks/tasks'
import {MockEnvironment} from "../mocks/mockenv";
import {Hash} from "@polkadot/types/interfaces";
import {stringToHex, stringToU8a} from "@polkadot/util";
import {blake2AsHex} from "@polkadot/util-crypto";
import {SubmittableExtrinsic} from "@polkadot/api/types";


describe("PROVIDER TASKS", () => {
    after(() => {
        return
    });

    async function setup() {
        const mockEnv = new MockEnvironment()
        await mockEnv.isReady();
        return new Tasks(mockEnv)
    }


    it("Captchas are correctly formatted before being passed to the API layer", async () => {
        const tasks = await setup()
        const datasetId = "0x0282715bd2de51935c8ed3bf101ad150861d91b2af0e6c50281740a0c072650a"
        //const datasetHash  = blake2AsHex(stringToU8a(datasetId), 256);
        const captchas = await tasks.getCaptchaWithProof(datasetId, true, 1);
        expect(captchas[0]).to.deep.equal(
            {
                "captcha": {
                    "captchaId": "0x9e7ef7b1093e1a9a74a6384a773d4e7ee25575d4fecc8a6fd7c9fe3357cbfad3",
                    "datasetId": "0x0282715bd2de51935c8ed3bf101ad150861d91b2af0e6c50281740a0c072650a",
                    "index": 0,
                    "items": [
                        {
                            "path": "/home/user/dev/prosopo/data/img/01.01.jpeg",
                            "type": "image"
                        },
                        {
                            "path": "/home/user/dev/prosopo/data/img/01.02.jpeg",
                            "type": "image"
                        },
                        {
                            "path": "/home/user/dev/prosopo/data/img/01.03.jpeg",
                            "type": "image"
                        },
                        {
                            "path": "/home/user/dev/prosopo/data/img/01.04.jpeg",
                            "type": "image"
                        },
                        {
                            "path": "/home/user/dev/prosopo/data/img/01.05.jpeg",
                            "type": "image"
                        },
                        {
                            "path": "/home/user/dev/prosopo/data/img/01.06.jpeg",
                            "type": "image"
                        },
                        {
                            "path": "/home/user/dev/prosopo/data/img/01.07.jpeg",
                            "type": "image"
                        },
                        {
                            "path": "/home/user/dev/prosopo/data/img/01.08.jpeg",
                            "type": "image"
                        },
                        {
                            "path": "/home/user/dev/prosopo/data/img/01.09.jpeg",
                            "type": "image"
                        }
                    ],
                    "salt": "0x01",
                    "target": "bus"
                },
                "proof": [
                    [
                        "0x9e7ef7b1093e1a9a74a6384a773d4e7ee25575d4fecc8a6fd7c9fe3357cbfad3",
                        "0x1b3336e2e69ca56f44e44cef13cc96e87972175a2d48068cb72327c73ca22268"
                    ],
                    [
                        "0xbda6440fa88b657669511c43c3a65785846e636e9d4f7a3dc06c2ce2450cc71a",
                        "0xaec652d7269399a55204e0c9a65e31292ddbf5d53e171529aac216cf1d582e3e"
                    ],
                    [
                        "0x8fa71c22d584c37c5229629ff2ef11719738979593fbb932c80043f80e146843",
                        "0xfcbb80f9cfd73111e50f0317813b4d4ae845d7ce3ecb10f5c5cce0e364b1380c"
                    ],
                    [
                        "0x0282715bd2de51935c8ed3bf101ad150861d91b2af0e6c50281740a0c072650a",
                    ]
                ]
            },
        )
    });

});
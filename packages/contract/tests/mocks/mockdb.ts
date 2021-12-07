import {Database, Table} from "../../src/types";
import {Captcha, Dataset} from "../../src/types/captcha";

const DEFAULT_ENDPOINT = "test"

const SOLVED_CAPTCHA = {
    //"_id" : "0x9e7ef7b1093e1a9a74a6384a773d4e7ee25575d4fecc8a6fd7c9fe3357cbfad3",
    "captchaId" : "0x9e7ef7b1093e1a9a74a6384a773d4e7ee25575d4fecc8a6fd7c9fe3357cbfad3",
    "datasetId" : "0x0282715bd2de51935c8ed3bf101ad150861d91b2af0e6c50281740a0c072650a",
    "index" : 0,
    "items" : [
        {
            "path" : "/home/user/dev/prosopo/data/img/01.01.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.02.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.03.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.04.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.05.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.06.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.07.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.08.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.09.jpeg",
            "type" : "image"
        }
    ],
    "salt" : "0x01",
    "solution" : [
        2,
        3,
        4
    ],
    "target" : "bus"
};





const UNSOLVED_CAPTCHA = {
    //"_id" : "0x1b3336e2e69ca56f44e44cef13cc96e87972175a2d48068cb72327c73ca22268",
    "captchaId" : "0x1b3336e2e69ca56f44e44cef13cc96e87972175a2d48068cb72327c73ca22268",
    "datasetId" : "0x0282715bd2de51935c8ed3bf101ad150861d91b2af0e6c50281740a0c072650a",
    "index" : 1,
    "items" : [
        {
            "path" : "/home/user/dev/prosopo/data/img/01.01.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.02.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.03.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.04.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.05.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.06.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.07.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.08.jpeg",
            "type" : "image"
        },
        {
            "path" : "/home/user/dev/prosopo/data/img/01.09.jpeg",
            "type" : "image"
        }
    ],
    "salt" : "0x02",
    "target" : "train"
};

const DATASET = {
    "_id": "0x0282715bd2de51935c8ed3bf101ad150861d91b2af0e6c50281740a0c072650a",
    "datasetId": "0x0282715bd2de51935c8ed3bf101ad150861d91b2af0e6c50281740a0c072650a",
    "format": "SelectAll",
    "tree": [
        [
            "0x9e7ef7b1093e1a9a74a6384a773d4e7ee25575d4fecc8a6fd7c9fe3357cbfad3",
            "0x1b3336e2e69ca56f44e44cef13cc96e87972175a2d48068cb72327c73ca22268",
            "0xc0876a31d2b5be752acb3f09bf0dc6b33a39f542d195af422711e0a08b87cd69",
            "0xd31b224ecbc65cbc7b549e0cb0740d8d849be9a2049cb95a45b006dfb0535b39",
            "0xb2a2894868a830b1da6af894f5997598186e81fa55f194bde09e7eb191ec7cd5",
            "0xc835b3e0c2245b89bef457abee55418619345831eb05dff4a841a810a26c690e",
            "0x649c325903b5bb57276591e502e008e725d48c31482db555f722a439c58c8106"
        ],
        [
            "0xbda6440fa88b657669511c43c3a65785846e636e9d4f7a3dc06c2ce2450cc71a",
            "0xaec652d7269399a55204e0c9a65e31292ddbf5d53e171529aac216cf1d582e3e",
            "0x410eac62fd0ab595c18b3a963f357d97b0a8adbb931e6f9c9efedabf4448ab06",
            "0x4242d290d454a58c66ecbe521da7dbdf640b3a1e1982b2ae5d7e34e3b6de22e5"
        ],
        [
            "0x8fa71c22d584c37c5229629ff2ef11719738979593fbb932c80043f80e146843",
            "0xfcbb80f9cfd73111e50f0317813b4d4ae845d7ce3ecb10f5c5cce0e364b1380c"
        ],
        [
            "0x0282715bd2de51935c8ed3bf101ad150861d91b2af0e6c50281740a0c072650a"
        ]
    ]
}


export class ProsopoDatabase implements Database {
    dbname: string;
    tables: { captcha?: Table; dataset?: Table };
    readonly url: string;

    constructor(url, dbname) {
        this.url = url || DEFAULT_ENDPOINT;
        this.tables = {};
        this.dbname = dbname;
    }

    connect(): Promise<void> {
        return Promise.resolve(undefined);
    }

    getCaptcha(solved: boolean, datasetId: string, size?: number): Promise<Captcha[] | undefined> {
        if (size && size > 1) {
            throw("NotImplemented");
        }
        if (solved) {
            return Promise.resolve([SOLVED_CAPTCHA]);
        } else {
            return Promise.resolve([UNSOLVED_CAPTCHA]);
        }
    }

    getDatasetDetails(datasetId: string) {
        return Promise.resolve(DATASET);
    }

    loadDataset(dataset: Dataset): Promise<void> {
        return Promise.resolve(undefined);
    }

    updateCaptcha(captcha: Captcha, datasetId: string): Promise<void> {
        return Promise.resolve(undefined);
    }

}

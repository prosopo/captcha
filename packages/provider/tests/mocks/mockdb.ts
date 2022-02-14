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
import {
    Database,
    DatasetRecord,
    DatasetWithIdsAndTreeSchema,
    Tables,
    Captcha,
    CaptchaSolution,
    Dataset,
    UpdateCaptchaSolution,
    CaptchaStates
} from '../../src/types'
import { Hash } from '@polkadot/types/interfaces'
import { ERRORS } from '../../src/errors'

const DEFAULT_ENDPOINT = 'test'

export const SOLVED_CAPTCHAS = [
    {
        // "_id" : "0x73f15c36e0600922aed7d0ea1f4580c188c087e5d8be5470a4ca8382c792e6b9",
        captchaId: '0x73f15c36e0600922aed7d0ea1f4580c188c087e5d8be5470a4ca8382c792e6b9',
        datasetId: '0x4e5b2ae257650340b493e94b4b4a4ac0e0dded8b1ecdad8252fe92bbd5b26605',
        index: 0,
        items: [
            {
                path: '/home/user/dev/prosopo/data/img/01.01.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.02.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.03.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.04.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.05.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.06.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.07.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.08.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.09.jpeg',
                type: 'image'
            }
        ],
        salt: '0x01',
        solution: [
            2,
            3,
            4
        ],
        target: 'bus'
    },
    {
        // "_id": "0x894d733d37d2df738deba781cf6d5b66bd5b2ef1041977bf27908604e7b3e604",
        captchaId: '0x894d733d37d2df738deba781cf6d5b66bd5b2ef1041977bf27908604e7b3e604',
        solution: [
            1,
            8,
            9
        ],
        salt: '0x02',
        target: 'train',
        items: [
            {
                path: '/usr/src/data/img/01.01.jpeg',
                type: 'image'
            },
            {
                path: '/usr/src/data/img/01.02.jpeg',
                type: 'image'
            },
            {
                path: '/usr/src/data/img/01.03.jpeg',
                type: 'image'
            },
            {
                path: '/usr/src/data/img/01.04.jpeg',
                type: 'image'
            },
            {
                path: '/usr/src/data/img/01.05.jpeg',
                type: 'image'
            },
            {
                path: '/usr/src/data/img/01.06.jpeg',
                type: 'image'
            },
            {
                path: '/usr/src/data/img/01.07.jpeg',
                type: 'image'
            },
            {
                path: '/usr/src/data/img/01.08.jpeg',
                type: 'image'
            },
            {
                path: '/usr/src/data/img/01.09.jpeg',
                type: 'image'
            }
        ]
    }
]

const UNSOLVED_CAPTCHAS = [
    {
        // "_id" : "0x1b3336e2e69ca56f44e44cef13cc96e87972175a2d48068cb72327c73ca22268",
        captchaId: '0x1b3336e2e69ca56f44e44cef13cc96e87972175a2d48068cb72327c73ca22268',
        datasetId: '0x4e5b2ae257650340b493e94b4b4a4ac0e0dded8b1ecdad8252fe92bbd5b26605',
        index: 1,
        items: [
            {
                path: '/home/user/dev/prosopo/data/img/01.01.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.02.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.03.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.04.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.05.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.06.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.07.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.08.jpeg',
                type: 'image'
            },
            {
                path: '/home/user/dev/prosopo/data/img/01.09.jpeg',
                type: 'image'
            }
        ],
        salt: '0x02',
        target: 'train'
    }
]

export const DATASET = {
    _id: '0x4e5b2ae257650340b493e94b4b4a4ac0e0dded8b1ecdad8252fe92bbd5b26605',
    datasetId: '0x4e5b2ae257650340b493e94b4b4a4ac0e0dded8b1ecdad8252fe92bbd5b26605',
    format: 'SelectAll',
    tree: [
        [
            '0x73f15c36e0600922aed7d0ea1f4580c188c087e5d8be5470a4ca8382c792e6b9',
            '0x894d733d37d2df738deba781cf6d5b66bd5b2ef1041977bf27908604e7b3e604',
            '0xaeffcc3d1f9f461f43b1db75e366ac8fc231c19d9fdf4a4dbbe6dcb561e9936c',
            '0x51f1f4f0077cf4d5bccbb5bfd6b07bb4d8544cfed3fefb5a4d2a4e0b217b6fbc',
            '0x17ba2bbf5926bdf709f01c822288efa53bb516bd1ba5b13eae807da6505c85a0',
            '0x8a1aa5c298c4d0f7f8d3cc7dd983427a271fb6a5db35e3ea8c47039138af4ea1',
            '0x79bd0f5c97a7098e9784035dae92656b09b2312d1a03ca487e2569f730815212'
        ],
        [
            '0x40ccd7d86bb18860c660a211496e525a3cacc4b506440e56ac85ac824a253378',
            '0x76cb07140a3c9e1108e392386b286d60dd5e302dc59dfa8c049045107f8db854',
            '0x34194f72bedca1ce8edf70d8525517f2d7eb1ee69ab76e235fbf996e8c07fcc3',
            '0xb730f53e3008da99fd51ee3ecf8cc6e974c5da1cf5e94958314025e39a491948'
        ],
        [
            '0x8b12abef36bfa970211495a826922d99f8a01a66f2e633fff4874061f637d814',
            '0xe52b9fc3595ec17f3ad8d7a8095e1b730c9c4f6be21f16a5d5c9ced6b1ef8903'
        ],
        [
            '0x4e5b2ae257650340b493e94b4b4a4ac0e0dded8b1ecdad8252fe92bbd5b26605'
        ]
    ]
}

interface mockDatabase extends Database {
    solved: Captcha[]
    unsolved: Captcha[]
}

export class ProsopoDatabase implements mockDatabase {
    dbname: string;
    tables: Tables
    readonly url: string;
    solved: Captcha[]
    unsolved: Captcha[]

    constructor (url, dbname) {
        this.url = url || DEFAULT_ENDPOINT
        this.tables = {}
        this.dbname = dbname
        this.solved = SOLVED_CAPTCHAS
        this.unsolved = UNSOLVED_CAPTCHAS
    }

    connect (): Promise<void> {
        // @ts-ignore
        this.tables.responses = {}
        // @ts-ignore
        this.tables.dataset = {}
        this.tables.dataset![DATASET.datasetId] = DATASET
        // @ts-ignore
        this.tables.pending = {}

        return Promise.resolve(undefined)
    }

    getCaptcha (solved: boolean, datasetId: string, size?: number): Promise<Captcha[] | undefined> {
        // @ts-ignore
        if (size && size > this.solved.length) {
            throw (new Error('NotImplemented'))
        }
        let cloned
        if (solved) {
            // We clone because `solution` is deleted from the object in the code
            cloned = { ...this.solved[0] }
        } else {
            cloned = { ...this.unsolved[0] }
        }
        return Promise.resolve([cloned])
    }

    getDatasetDetails (datasetId: string): Promise<DatasetRecord> {
        const matching = this.tables.dataset![datasetId] as DatasetRecord
        return Promise.resolve(matching)
    }

    storeDataset (dataset: Dataset): Promise<void> {
        try {
            const parsedDataset = DatasetWithIdsAndTreeSchema.parse(dataset)
            this.tables.dataset![parsedDataset.datasetId.toString()] = {
                datasetId: parsedDataset.datasetId,
                format: parsedDataset.format,
                tree: parsedDataset.tree
            }
            return Promise.resolve(undefined)
        } catch (err) {
            throw new Error(`${ERRORS.DATABASE.DATASET_LOAD_FAILED.message}:\n${err}`)
        }
    }

    updateCaptcha (captcha: Captcha, datasetId: string): Promise<void> {
        return Promise.resolve(undefined)
    }

    getRandomCaptcha (solved: boolean, datasetId: Hash | string | Uint8Array, size?: number): Promise<Captcha[] | undefined> {
        const collection = solved ? this.solved : this.unsolved
        if (size && size > collection.length) {
            throw (new Error('Not Implemented'))
        }
        return Promise.resolve([{ ...collection[0] }])
    }

    getCaptchaById (captchaId: string[]): Promise<Captcha[] | undefined> {
        const matching = captchaId.map(id => ({ ...(this.solved.filter(captcha => captcha.captchaId === id)[0]) }))
        return Promise.resolve(matching)
    }

    storeDappUserSolution (captchas: CaptchaSolution[], treeRoot: string) {
        return Promise.resolve(undefined)
    }

    storeDappUserPending (userAccount: string, responseHash: string, salt: string) {
        this.tables.pending![responseHash] = {
            accountId: userAccount,
            pending: true,
            salt: salt
        }
        return Promise.resolve(undefined)
    }

    updateDappUserPendingStatus (userAccount: string, requestHash: string, approve: boolean) {
        const pendingRequest = this.tables.pending![requestHash]
        pendingRequest.accountId = userAccount
        pendingRequest.pending = false
        pendingRequest.approved = approve
        return Promise.resolve(undefined)
    }

    getDappUserPending (requestHash: string): Promise<any> {
        return Promise.resolve(this.tables.pending![requestHash])
    }

    getAllCaptchas (captchaState?: CaptchaStates): Promise<Captcha[] | undefined> {
        const collection = [...this.unsolved, ...this.solved]
        return Promise.resolve([{ ...collection[0] }])
    }

    getAllSolutions (captchaId: string): Promise<CaptchaSolution[] | undefined> {
        return Promise.resolve([])
    }

    updateCaptchaSolution (captchas: UpdateCaptchaSolution[]) {
        return Promise.resolve(undefined)
    }
}

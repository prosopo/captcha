import { Logger } from '@prosopo/common'
import { ProsopoDatabase as MongoDatabase } from './mongo'
import { MongoMemoryServer } from 'mongodb-memory-server'

export class MongoMemoryDatabase extends MongoDatabase {
    override async init(url: string, dbname: string, logger: Logger, authSource?: string): Promise<this> {
        const mongod = await MongoMemoryServer.create()
        const mongoMemoryURL = mongod.getUri()
        await super.init(mongoMemoryURL, dbname, logger, authSource)
        return this
    }
}

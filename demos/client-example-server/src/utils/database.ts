import { MongoMemoryServer } from "mongodb-memory-server";
export async function memoryServerSetup(): Promise<string> {
    const mongod = MongoMemoryServer.create();
    const memoryServer = await mongod;
    return memoryServer.getUri()
}
export default memoryServerSetup;

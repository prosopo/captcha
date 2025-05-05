import {describe, test, beforeAll, afterAll, expect} from "vitest";
import {createClient, type RedisClientType} from "redis";

describe("redisAccessRules", () => {
    let client: RedisClientType;

    beforeAll(async () => {
        client = await createClient({
            // /docker/redis/redis-stack.docker-compose.yml
            url: "redis://localhost:6379",
            password: "root"
        })
            .on("error", (err) => console.log("Redis Client Error", err))
            .connect() as RedisClientType;

        // fixme create index.

        await client.flushAll();
    });

    describe('reader', () => {
        test("finds rules", async () => {

        });

        test("finds rule ids", () => {
            // todo reuse
        });
    });

    describe('writer', () => {
        test("inserts rule", async () => {
            await client.hSet("name", {
                field: "value"
            });

            expect(await client.hGet("name", "field")).toBe("value");
        });

        test("inserts rule with expiration", () => {
        });

        test("deletes rules", () => {
        });
    });

    afterAll(async () => {
        await client.flushAll();
    });
});

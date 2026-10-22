// Copyright 2021-2026 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Writes schedulers-vectors.json: the scheduled jobs run once each on a live environment (see
// live-harness.ts): the records not yet stored sent to a central database, the sites changed in
// a client database pulled in, and spam email domain lists fetched from a stand-in server on a
// fixed port; with `checkIfTaskIsRunning` for each task over seeded task statuses. The stores
// before and after, and the time each job ran at, are written for the Rust to run at the same
// clock. Run on Node 24 with the live stores up.
import { mkdtempSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CaptchaStatus, CaptchaType, type IUserDataSlim, ScheduledTaskNames, ScheduledTaskStatus, type Session, Tier } from "@prosopo/types";
import mongoose from "mongoose";
import { getCompositeIpAddress } from "../../src/compositeIpAddress.js";
import { updateSpamEmailDomains } from "../../src/tasks/spam/updateSpamEmailDomains.js";
import { Tasks } from "../../src/tasks/tasks.js";
import { checkIfTaskIsRunning } from "../../src/util.js";
import { type Json, MONGO_URL, MONGO_PORT, dumpDatabase, fakeIpapi, liveEnvironment, liveVariables, resetStores } from "./live-harness.js";

if (!process.version.startsWith("v24.")) {
	throw new Error(`this generator must run on Node 24 (the production runtime), not ${process.version}`);
}

process.env.NODE_ENV = "production";
delete process.env.MAINTENANCE_MODE;
const DATABASE = "equivalence_schedulers";
const CENTRAL = "equivalence_schedulers_central";
const CLIENTS = "equivalence_schedulers_clients";
const LIST_PORT = 28124;
const SITE = "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y";
const SITE_B = "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy";
const SITE_C = "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw";
const uri = (database: string) => `mongodb://root:root@127.0.0.1:${MONGO_PORT}/${database}?authSource=admin`;

const lists: Record<string, string> = {
	"/one.txt": "spam.example\n# a comment\n// another\nSPAM.example\n  Mixed.Example.ORG  \nnot a domain\n\nlocalhost\nsub.spam.example\n",
	"/two.txt": "mixed.example.org\nother.example\n",
};
const listServer = createServer((req: IncomingMessage, res: ServerResponse) => {
	const body = lists[req.url ?? ""];
	if (body === undefined) {
		res.writeHead(404);
		res.end();
		return;
	}
	res.writeHead(200, { "Content-Type": "text/plain", ETag: `"${req.url}"` });
	res.end(body);
});
await new Promise<void>((resolve) => listServer.listen(LIST_PORT, "127.0.0.1", () => resolve()));

await resetStores(DATABASE);
const raw = new mongoose.mongo.MongoClient(MONGO_URL);
await raw.connect();
await raw.db(CENTRAL).dropDatabase();
await raw.db(CLIENTS).dropDatabase();
const ipapi = await fakeIpapi({});
const variables = liveVariables(DATABASE, ipapi.url, {
	PROSOPO_MONGO_CAPTCHA_URI: uri(CENTRAL),
	PROSOPO_MONGO_CLIENT_URI: uri(CLIENTS),
});
const env = await liveEnvironment(variables);
const db = env.getDb();

const now = Date.now();
const session = (sessionId: string, extra: Partial<Session> = {}) =>
	({
		sessionId,
		createdAt: new Date(now - 60000),
		token: `token-${sessionId}`,
		score: 0.3,
		threshold: 0.5,
		scoreComponents: { baseScore: 0.3 },
		ipAddress: getCompositeIpAddress("203.0.113.7"),
		captchaType: CaptchaType.pow,
		webView: false,
		iFrame: false,
		decryptedHeadHash: `head-${sessionId}`,
		...extra,
	}) as Session;
for (const sessionId of ["s-1", "s-2", "s-3", "s-4"]) await db.storeSessionRecord(session(sessionId));
for (const [index, challenge] of ["1___a___b___1", "2___a___b___2", "3___a___b___3"].entries()) {
	await db.storePowCaptchaRecord(challenge as never, { requestedAtTimestamp: now - 50000 + index, userAccount: "a", dappAccount: "b" } as never, 4, "0xsig", getCompositeIpAddress("203.0.113.7"), { "user-agent": "x" }, "ja4", `s-${index + 1}`);
	await db.updatePowCaptchaRecordResult(challenge as never, { status: CaptchaStatus.approved }, false, true, "0xuser");
}
for (const [index, status] of [CaptchaStatus.approved, CaptchaStatus.disapproved].entries()) {
	await db.storeUserImageCaptchaSolution([{ captchaId: `0xc${index}`, captchaContentId: `0xcc${index}`, salt: "0xs", solution: ["0xa"] }], {
		userAccount: "a",
		dappAccount: "b",
		datasetId: "0xd",
		providerAccount: "p",
		id: `0xcommitment${index}`,
		result: { status },
		userSignature: "0xu",
		ipAddress: getCompositeIpAddress("203.0.113.7"),
		headers: { "user-agent": "x" },
		ja4: "ja4",
		userSubmitted: true,
		serverChecked: false,
		requestedAtTimestamp: new Date(now - 40000),
		pending: false,
		salt: "0xs",
		requestHash: "0xr",
		deadlineTimestamp: new Date(now + 60000),
		threshold: 0.8,
	} as Parameters<typeof db.storeUserImageCaptchaSolution>[1]);
}
await db.storePowCaptchaRecord("4___a___b___4" as never, { requestedAtTimestamp: now - 45000, userAccount: "a", dappAccount: "b" } as never, 4, "0xsig", getCompositeIpAddress("203.0.113.7"), { "user-agent": "x" }, "ja4", "s-4");
await raw.db(DATABASE).collection("powcaptchas").updateOne({ challenge: "4___a___b___4" }, { $set: { pendingStage: true, lastUpdatedTimestamp: new Date(now - 30000), storedAtTimestamp: new Date(now - 20000) } });
const earlierSweep = await db.createScheduledTaskStatus(ScheduledTaskNames.StoreCommitmentsExternal, ScheduledTaskStatus.Running);
await db.updateScheduledTaskStatus(earlierSweep, ScheduledTaskStatus.Completed, { data: { processedSessionRecords: 0, processedCommitments: 0, processedPowRecords: 0 } });
await db.ensureIndexes();
await raw.db(CLIENTS).collection("accounts").insertMany([
	{ name: "one", tier: Tier.Professional, users: [{ status: "active" }], sites: [{ siteKey: SITE, settings: { domains: ["one.example"], captchaType: "pow" }, updatedAt: now - 1000 }, { siteKey: SITE_B, settings: { domains: ["two.example"] } }] },
	{ name: "inactive", tier: Tier.Free, users: [{ status: "inactive" }], sites: [{ siteKey: SITE_C, settings: { domains: ["three.example"] } }] },
	{ name: "old", tier: Tier.Free, users: [{ status: "active" }], sites: [{ siteKey: SITE_C, settings: { domains: ["old.example"] }, updatedAt: 1 }, { siteKey: "", settings: { domains: ["nokey.example"] } }] },
]);
await db.updateClientRecords([{ account: SITE, settings: { domains: ["stale.example"] }, tier: Tier.Free }] as unknown as IUserDataSlim[]);
const running = await db.createScheduledTaskStatus(ScheduledTaskNames.UpdateSpamEmailDomains, ScheduledTaskStatus.Running);
void running;
await db.createScheduledTaskStatus(ScheduledTaskNames.GetClientList, ScheduledTaskStatus.Running);
const completedRun = await db.createScheduledTaskStatus(ScheduledTaskNames.GetClientList, ScheduledTaskStatus.Running);
await db.updateScheduledTaskStatus(completedRun, ScheduledTaskStatus.Completed, { data: { clientRecords: 0 } });

const seed = await dumpDatabase(DATABASE);
const clientsSeed = await dumpDatabase(CLIENTS);

const names = [ScheduledTaskNames.StoreCommitmentsExternal, ScheduledTaskNames.GetClientList, ScheduledTaskNames.UpdateSpamEmailDomains];
const runningChecks: Json[] = [];
for (const name of names) runningChecks.push({ name, running: await checkIfTaskIsRunning(name, db), at: Date.now() });

const tasks = new Tasks(env);
const ran: Record<string, number> = {};
ran.storeCommitmentsExternal = Date.now();
await tasks.clientTaskManager.storeCommitmentsExternal();
const afterStore = await dumpDatabase(DATABASE);
ran.storeCommitmentsExternalAgain = Date.now();
await tasks.clientTaskManager.storeCommitmentsExternal();
ran.getClientList = Date.now();
await tasks.clientTaskManager.getClientList();
const cacheDir = mkdtempSync(path.join(tmpdir(), "spam-cache-"));
ran.updateSpamEmailDomains = Date.now();
await updateSpamEmailDomains(db, env.logger, [`http://127.0.0.1:${LIST_PORT}/one.txt`, `http://127.0.0.1:${LIST_PORT}/two.txt`], cacheDir);
ran.updateSpamEmailDomainsMissing = Date.now();
const failure = await updateSpamEmailDomains(db, env.logger, [`http://127.0.0.1:${LIST_PORT}/missing.txt`], cacheDir).then(
	() => null,
	(error: Error) => error.message,
);

const after = await dumpDatabase(DATABASE);
const central = await dumpDatabase(CENTRAL);
await raw.close();
await new Promise<void>((resolve) => listServer.close(() => resolve()));
await ipapi.close();

writeFileSync(
	fileURLToPath(new URL("./schedulers-vectors.json", import.meta.url)),
	`${JSON.stringify({
		database: DATABASE,
		central: CENTRAL,
		clients: CLIENTS,
		listPort: LIST_PORT,
		lists,
		variables: { ...variables, PROSOPO_IPAPI_URL: "{{IPAPI_URL}}" },
		seed,
		clientsSeed,
		runningChecks,
		ran,
		failure,
		afterStore,
		after,
		centralAfter: central,
	})}\n`,
);
console.log(`wrote schedulers-vectors.json (failure: ${failure})`);
process.exit(0);

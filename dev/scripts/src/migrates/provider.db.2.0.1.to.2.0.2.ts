import { MongoClient } from "mongodb";
import {
  PoWCaptchaStored,
  UserCommitmentRecord,
} from "@prosopo/types-database";
import { at } from "@prosopo/util";
import { CaptchaStatus } from "@prosopo/types";
import { loadEnv } from "@prosopo/dotenv";

loadEnv();

const MONGO_URL =
  process.env.MONGO_URL ||
  "mongodb://root:root@localhost:27017/migrate?authSource=admin";

const MIGRATE_FROM_DB = process.env.MIGRATE_FROM_DB || "migrate";
const MIGRATE_TO_DB = process.env.MIGRATE_TO_DB || "migrated";

console.log("MONGO_URL: ", MONGO_URL);

// connect to the mongo db
const client = await MongoClient.connect(MONGO_URL);

/*  User Commitments Migration

Get all user commitments from the `usercommitments` collection

User commitments will look like this:

{
	"_id" : ObjectId("6602b25af1369672ae2ed491"),
	"id" : "0x860c75741153846518ab845f05c1a38b685771e4ab1a2650757a377a08b1e111",
	"__v" : 0,
	"batched" : false,
	"completedAt" : 4638574,
	"dappContract" : "5C4hrfjw9DjXZTzV3MwzrrAr9P1MJhSrvWGWqi1eSuyUpnhM",
	"datasetId" : "0xe666b35451f302b9fccfbe783b1de9a6a4420b840abed071931d68a9ccc1c21d",
	"processed" : false,
	"providerAccount" : "5FnBurrfqWgSLJFMsojjEP74mLX1vZZ9ASyNXKfA5YXu8FR2",
	"requestedAt" : 4638572,
	"status" : "Approved",
	"userAccount" : "5F8NZ7huGjaQ7p3pPAJ5cMh736BJrmhp7FDjghbGMSNX5kRe",
	"userSignature" : [
        138,231,58,36,156,179,40,26,60,84,12,233,229,226,6,39,248,41,104,47,86,204,157,49,97,12,181,34,72,196,141,111,242,184,255,104,147,116,85,149,53,144,82,163,37,90,71,85,0,190,23,248,242,197,97,169,165,208,106,90,190,132,90,0
	]
}

They need to made to look like this:

{
    _id: ObjectId('66cedfe728495be1a929aac3'),
    id: '0xc35b0686f7097764b6cc27dff7a091a1f5e1fbd97dcfe99a1fc64f79d36e968c',
    __v: 0,
    dappAccount: '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
    datasetId: '0x9f460e81ac9c71b486f796a21bb36e2263694756a6621134d110da217fd3ef25',
    ipAddress: '::ffff:127.0.0.1',
    lastUpdatedTimestamp: 1724833767163,
    providerAccount: '5EjTA28bKSbFPPyMbUjNtArxyqjwq38r1BapVmLZShaqEedV',
    requestedAtTimestamp: 1724833767140,
    result: { status: 'Approved' },
    serverChecked: false,
    userAccount: '5H9NydeNeQ1Jkr9YehjJDGB1tgc3VuoYGvG7na4zvNDg4k3r',
    userSignature: '0xea128a06d374d94769b126c242a990c68c85c43f4033b594f102dee1b8d9880d2695f5fbf5994d9cb95a16daaada2bfd0c0d95b4684a51513a42f7c8d5ef9c8f',
    userSubmitted: true,
    storedAtTimestamp: 1724835600089
}

- id should remain as is
- dappContract should be renamed to dappAccount
- batched is not required and should be removed
- completedAt is not required and should be removed
- datasetId should remain as is
- processed is not required and should be removed
- providerAccount should remain as is
- requestedAt should be renamed to requestedAtTimestamp and converted to a timestamp with value 0
- status should be moved into a result object
- userAccount should remain as is
- userSignature should be converted to a hex string
- userSubmitted should be added with a value of true
- lastUpdatedTimestamp should be added with a value of 0
- serverChecked should be added with a value of false
- ipAddress should be added with a value of 'NO_IP_ADDRESS'

 */

const rococoDate = { 5359899: new Date("2024-05-23 16:15:22Z") };

const rococoBlock = parseInt(at(Object.keys(rococoDate), 0));

const rococoTime = at(Object.values(rococoDate), 0).getTime();

const migrateUserCommitments = async () => {
  const collection = client.db(MIGRATE_FROM_DB).collection("usercommitments");
  console.log(`${await collection.count()} documents in collection`);

  const userCommitments = await collection.find().toArray();

  console.log("Found user commitments: ", userCommitments.length);

  const newCollection = client.db(MIGRATE_TO_DB).collection("usercommitments");

  const results = [];
  for (const commitment of userCommitments) {
    const {
      _id,
      id,
      dappContract,
      datasetId,
      providerAccount,
      requestedAt,
      status,
      userAccount,
      userSignature,
    } = commitment;

    const secondsDiff = (rococoBlock - requestedAt) * 6;

    const requestedAtTimestamp = new Date(rococoTime - secondsDiff).getTime();

    const userSignatureHex = Buffer.from(userSignature).toString("hex");

    const record: UserCommitmentRecord = {
      id,
      dappAccount: dappContract,
      datasetId,
      ipAddress: "NO_IP_ADDRESS",
      lastUpdatedTimestamp: requestedAtTimestamp,
      providerAccount,
      requestedAtTimestamp,
      result: { status },
      serverChecked: false,
      userAccount,
      userSignature: userSignatureHex,
      userSubmitted: true,
    };

    console.log("updating record: ", id);
    results.push(
      await newCollection.updateOne(
        { id },
        {
          $set: record,
        },
      ),
    );
  }
  await newCollection.updateMany(
    {},
    {
      $unset: {
        status: 1,
        completedAt: 1,
        requestedAt: 1,
        processed: 1,
        batched: 1,
        dappContract: 1,
        storedAtTimestamp: 1,
      },
    },
  );

  return results;
};

/*
  Get all pow captchas from the `powcaptchas` collection

  Pow captchas will look like this:

  {
      "_id" : ObjectId("660049a500b25bf4d6558a30"),
      "challenge" : "4614665___5FzBkUs1KddN4xXHqGGbYMn8AXLgkc2XvkEKHDYCwecY99Bf___5HUBceb4Du6dvMA9BiwN5VzUrzUsX9Zp7z7nSR2cC1TCv5jg",
      "checked" : false,
      "__v" : 0
  }

  They need to look like this:

  {
      _id: ObjectId('66cdc7d671e639ca19b194ec'),
      challenge: '1724762070756___5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL___5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
      dappAccount: '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw',
      userAccount: '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL',
      requestedAtTimestamp: 1724762070756,
      lastUpdatedTimestamp: 1724762070757,
      result: { status: 'Pending' },
      difficulty: 4,
      ipAddress: '::ffff:127.0.0.1',
      userSubmitted: false,
      serverChecked: false,
      __v: 0,
      storedAtTimestamp: 1724762072716
  }

  - checked should be removed
  - dappAccount can be extracted from the challenge by splitting on ___ and taking the last element
  - userAccount can be extracted from the challenge by splitting on ___ and taking the second element
  - requestedAtTimestamp should be extracted from the challenge by splitting on ___ and taking the first element, then converting to a timestamp
  - lastUpdatedTimestamp should be set to the same as requestedAtTimestamp
  - result should be added with a status of 'Approved'
  - difficulty should be added with a value of 4
  - ipAddress should be added with a value of NO_IP_ADDRESS
  - userSubmitted should be added with a value of true
  - serverChecked should be added with a value of false
 */

const migratePowCaptchas = async () => {
  const collection = client.db(MIGRATE_FROM_DB).collection("powcaptchas");
  const newCollection = client.db(MIGRATE_TO_DB).collection("powcaptchas");

  console.log(`${await collection.count()} documents in collection`);

  const powCaptchas = await collection.find().toArray();

  console.log("Found pow captchas: ", powCaptchas.length);

  const results = [];
  for (const captcha of powCaptchas) {
    const { _id, challenge } = captcha;

    const [requestedAt, userAccount, dappAccount] = challenge.split("___");

    const secondsDiff = (parseInt(requestedAt) - requestedAt) * 6;

    const requestedAtTimestamp = new Date(rococoTime - secondsDiff).getTime();

    const record: PoWCaptchaStored = {
      challenge,
      dappAccount,
      userAccount,
      requestedAtTimestamp,
      lastUpdatedTimestamp: requestedAtTimestamp,
      result: { status: CaptchaStatus.approved },
      providerSignature: "NO_SIGNATURE_MIGRATED",
      difficulty: 4,
      ipAddress: "NO_IP_ADDRESS",
      userSubmitted: true,
      serverChecked: false,
    };

    console.log("updating record: ", _id);
    results.push(
      await newCollection.updateOne(
        { _id },
        {
          $set: record,
        },
      ),
    );
  }
  await newCollection.updateMany(
    {},
    {
      $unset: {
        checked: 1,
        storedAtTimestamp: 1,
      },
    },
  );

  return results;
};

const run = async () => {
  const results = [];
  results.push(await migrateUserCommitments());

  results.push(await migratePowCaptchas());

  return results;
};

run()
  .then((result) => {
    console.log(result);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

// get all pow captcha records from the `powcaptchas` collection

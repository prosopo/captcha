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

import {
  ERRORS,
  getEventsFromMethodName,
  TransactionResponse,
} from "@prosopo/contract";
import { hexHash, loadJSONFile, parseBlockNumber } from "@prosopo/provider";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { config } from "dotenv";
import path from "path";

import { randomAsHex } from "@polkadot/util-crypto";

import {
  computeCaptchaSolutionHash,
  computePendingRequestHash,
  parseCaptchaDataset,
} from "../../src/captcha";
import DatabaseAccounts, {
  Account,
  accountAddress,
  accountMnemonic,
} from "../../src/dataUtils/DatabaseAccounts";
import { CaptchaMerkleTree } from "../../src/merkle";
import { Tasks } from "../../src/tasks";
import { CaptchaSolution } from "../../src/types/captcha";
import { DAPP, PROVIDER } from "../mocks/accounts";
import { DATASET, SOLVED_CAPTCHAS } from "../mocks/mockdb";
import { sendFunds } from "../mocks/setup";
import { Environment } from "../../src/env";

// const envPath =
//   process.env.NODE_ENV === "test"
//     ? { override: true, path: "../../.env.test" }
//     : undefined;

// config(envPath);

require("dotenv").config();
require("dotenv").config({path: '../../.env'});

chai.should();
chai.use(chaiAsPromised);
const expect = chai.expect;

describe("CONTRACT TASKS", () => {
  let providerStakeDefault: bigint;
  console.log(process.env.PROVIDER_MNEMONIC);
  const mockEnv = new Environment(process.env.PROVIDER_MNEMONIC);
  const databaseAccounts = new DatabaseAccounts();

  before(async () => {
    await mockEnv.isReady();
    const tasks = new Tasks(mockEnv);

    await mockEnv.contractInterface!.changeSigner("//Alice");

    providerStakeDefault = await tasks.getProviderStakeDefault();
    await databaseAccounts.importDatabaseAccounts();
  });

  /** Gets some static solved captchas and constructions captcha solutions from them
   *  Computes the request hash for these captchas and the dappUser and then stores the request hasn in the mock db
   *  @return {CaptchaSolution[], string} captchaSolutions and requestHash
   */
  async function createMockCaptchaSolutionsAndRequestHash() {
    const account = databaseAccounts.dappUsers.pop()!;
    await mockEnv.isReady();
    await mockEnv.contractInterface!.changeSigner(accountMnemonic(account));

    const captchaSolutions: CaptchaSolution[] = SOLVED_CAPTCHAS.map(
      (captcha) => ({
        captchaId: captcha.captchaId,
        salt: "usersalt",
        solution: captcha.solution,
      })
    );
    const salt = randomAsHex();
    const requestHash = computePendingRequestHash(
      captchaSolutions.map((c) => c.captchaId),
      accountAddress(account),
      salt
    );

    if ("storeDappUserPending" in mockEnv.db!) {
      await mockEnv.db.storeDappUserPending(
        hexHash(accountAddress(account)),
        requestHash,
        salt
      );
    }

    return { account, captchaSolutions, requestHash };
  }

  async function changeSigner (account: Account): Promise<Tasks> {
    await mockEnv.contractInterface!.changeSigner(accountMnemonic(account));

    return new Tasks(mockEnv);
  }

  it("Provider registration", async () => {
    const [providerMnemonic, providerAddress] =
      mockEnv.contractInterface!.createAccountAndAddToKeyring() || ["", ""];

    await sendFunds(
      mockEnv,
      providerAddress,
      "Provider",
      10000000n * providerStakeDefault
    );

    const tasks = await changeSigner([providerMnemonic, providerAddress]);

    const result: TransactionResponse = await tasks.providerRegister(
      PROVIDER.serviceOrigin + randomAsHex().slice(0, 8),
      PROVIDER.fee,
      PROVIDER.payee,
      providerAddress
    );

    expect(result.txHash!).to.not.be.empty;
  });

  it("Provider update", async () => {
    const account = databaseAccounts.providers.pop()!;

    const tasks = await changeSigner(account);

    const value = 1000000n * providerStakeDefault;

    const result: TransactionResponse = await tasks.providerUpdate(
      PROVIDER.serviceOrigin + randomAsHex().slice(0, 8),
      PROVIDER.fee,
      PROVIDER.payee,
      accountAddress(account),
      value
    );

    const eventData = getEventsFromMethodName(result, "providerUpdate");

    expect(eventData![0].args[0]).to.equal(accountAddress(account));
  });

  it("Provider add dataset", async () => {
    const account = databaseAccounts.providersWithStake.pop()!;

    const tasks = await changeSigner(account);

    const captchaFilePath = path.resolve(
      __dirname,
      "../mocks/data/captchas.json"
    );
    const result: TransactionResponse = await tasks.providerAddDataset(
      captchaFilePath
    );
    const eventData = getEventsFromMethodName(result, "providerAddDataset");

    expect(eventData![0].args[0]).to.equal(accountAddress(account));
  });

  it("Inactive Provider cannot add dataset", async () => {
    const account = databaseAccounts.providers.pop()!;

    const tasks = await changeSigner(account);

    const captchaFilePath = path.resolve(
      __dirname,
      "../mocks/data/captchas.json"
    );
    const datasetPromise = tasks.providerAddDataset(captchaFilePath);

    datasetPromise.catch((e) => e.message.should.match("/ProviderInactive/"));
  });

  it("Provider approve", async () => {
    const { account, captchaSolutions } =
      await createMockCaptchaSolutionsAndRequestHash();

    const dappAccount = databaseAccounts.dappsWithStake.pop()!;

    const tasks = await changeSigner(account);

    const salt = randomAsHex();

    const tree = new CaptchaMerkleTree();

    const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
      ...captcha,
      salt: salt,
    }));
    const captchasHashed = captchaSolutionsSalted.map((captcha) =>
      computeCaptchaSolutionHash(captcha)
    );

    tree.build(captchasHashed);
    const commitmentId = tree.root!.hash;

    const providerAccount =
      databaseAccounts.providersWithStakeAndDataset.pop()!;
    const provider = await tasks.getProviderDetails(
      accountAddress(providerAccount)
    );

    await tasks.dappUserCommit(
      accountAddress(dappAccount),
      provider.captcha_dataset_id,
      commitmentId,
      accountAddress(providerAccount)
    );

    const providerTasks = await changeSigner(providerAccount);

    const result = await providerTasks.providerApprove(commitmentId, 0);
    const events = getEventsFromMethodName(result, "providerApprove");

    expect(events![0].args[0]).to.equal(commitmentId);
  });

  it("Provider disapprove", async () => {
    const { account, captchaSolutions } =
      await createMockCaptchaSolutionsAndRequestHash();

    const dappAccount = databaseAccounts.dappsWithStake.pop()!;

    const tasks = await changeSigner(account);

    const salt = randomAsHex();

    const tree = new CaptchaMerkleTree();

    const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
      ...captcha,
      salt: salt,
    }));
    const captchasHashed = captchaSolutionsSalted.map((captcha) =>
      computeCaptchaSolutionHash(captcha)
    );

    tree.build(captchasHashed);
    const commitmentId = tree.root!.hash;

    const providerAccount =
      databaseAccounts.providersWithStakeAndDataset.pop()!;

    const provider = await tasks.getProviderDetails(
      accountAddress(providerAccount)
    );

    await tasks.dappUserCommit(
      accountAddress(dappAccount),
      provider.captcha_dataset_id,
      commitmentId,
      accountAddress(providerAccount)
    );

    const providerTasks = await changeSigner(providerAccount);

    const result = await providerTasks.providerDisapprove(commitmentId);
    const events = getEventsFromMethodName(result, "providerDisapprove");

    expect(events![0].args[0]).to.equal(commitmentId);
  });

  it("Timestamps check", async () => {
    const dappAccount = databaseAccounts.dappsWithStake.pop()!;

    const salt = randomAsHex();

    const tree = new CaptchaMerkleTree();

    const { account, captchaSolutions } =
      await createMockCaptchaSolutionsAndRequestHash();

    const tasks = await changeSigner(account);

    const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
      ...captcha,
      salt: salt,
    }));
    const captchasHashed = captchaSolutionsSalted.map((captcha) =>
      computeCaptchaSolutionHash(captcha)
    );

    tree.build(captchasHashed);
    const commitmentId = tree.root!.hash;

    const providerAccount =
      databaseAccounts.providersWithStakeAndDataset.pop()!;

    const provider = await tasks.getProviderDetails(
      accountAddress(providerAccount)
    );

    await tasks.dappUserCommit(
      accountAddress(dappAccount),
      provider.captcha_dataset_id,
      commitmentId,
      accountAddress(providerAccount)
    );

    const providerTasks = await changeSigner(providerAccount);

    const result = await providerTasks.providerApprove(commitmentId, 0);
    const events = getEventsFromMethodName(result, "providerApprove");

    expect(events![0].args[0]).to.equal(commitmentId);

    const commitment = await providerTasks.getCaptchaSolutionCommitment(
      commitmentId
    );

    // check the timestamp
    const completedAt = parseInt(
      commitment.completed_at.toString().replaceAll(",", "")
    );

    expect(completedAt).to.be.above(0);

    // check how much time passed after successful completion
    const lastCorrectCaptcha =
      await providerTasks.getDappOperatorLastCorrectCaptcha(
        accountAddress(account)
      );

    expect(
      Number.parseInt(lastCorrectCaptcha.before_ms.toString())
    ).to.be.above(0);
  });

  it("Provider details", async () => {
    const account = databaseAccounts.providersWithStakeAndDataset.pop()!;

    const tasks = await changeSigner(account);

    const result = await tasks.getProviderDetails(
      accountAddress(account)
    );

    expect(result).to.have.a.property("status");
  });

  it("Provider accounts", async () => {
    const account = databaseAccounts.providersWithStakeAndDataset.pop()!;

    const tasks = await changeSigner(account);

    const result = await tasks.getProviderAccounts();

    expect(result).to.be.an("array");
  });

  it("Dapp registration", async () => {
    const account =
      mockEnv.contractInterface!.createAccountAndAddToKeyring() || ["", ""];

    const tasks = await changeSigner(account);

    await sendFunds(
      mockEnv,
      accountAddress(account),
      "Dapp",
      10000000n * providerStakeDefault
    );

    const result: TransactionResponse = await tasks.dappRegister(
      DAPP.serviceOrigin + randomAsHex().slice(0, 8),
      accountAddress(account),
      accountAddress(account)
    );

    expect(result.txHash).to.not.be.empty;
  });

  it("Dapp is active", async () => {
    const account = databaseAccounts.dappsWithStake.pop()!;

    const tasks = await changeSigner(account);

    const result: any = await tasks.dappIsActive(accountAddress(account));

    expect(result).to.equal(true);
  });

  it("Dapp details", async () => {
    const account = databaseAccounts.dapps.pop()!;

    const tasks = await changeSigner(account);

    const result: any = await tasks.getDappDetails(accountAddress(account));

    expect(result).to.have.a.property("status");
  });

  it("Dapp fund", async () => {
    const account = databaseAccounts.dappsWithStake.pop()!;

    const tasks = await changeSigner(account);

    const value = 10;

    const result: TransactionResponse = await tasks.dappFund(
      accountAddress(account),
      value
    );
    const events = getEventsFromMethodName(result, "dappFund");
    const decoded = events![0].args.map((arg) => arg.toHuman());

    expect(decoded[0]).to.equal(accountAddress(account));
    const dappStruct = await tasks.getDappDetails(accountAddress(account));

    expect(events![0].args[1].toHuman()).to.equal(dappStruct.balance);
  });

  it("Dapp user commit", async () => {
    const { captchaSolutions, account } =
      await createMockCaptchaSolutionsAndRequestHash();

    const dappAccount = databaseAccounts.dappsWithStake.pop()!;

    const tasks = await changeSigner(account);

    const salt = randomAsHex();

    const tree = new CaptchaMerkleTree();

    const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
      ...captcha,
      salt: salt,
    }));

    const captchasHashed = captchaSolutionsSalted.map((captcha) =>
      computeCaptchaSolutionHash(captcha)
    );

    tree.build(captchasHashed);

    const commitmentId = tree.root!.hash;

    const providerAccount =
      databaseAccounts.providersWithStakeAndDataset.pop()!;

    const provider = await tasks.getProviderDetails(
      accountAddress(providerAccount)
    );

    const result: TransactionResponse = await tasks.dappUserCommit(
      accountAddress(dappAccount),
      provider.captcha_dataset_id,
      commitmentId,
      accountAddress(providerAccount)
    );

    if (!result) {
      throw new Error("Result is null");
    }

    const events = getEventsFromMethodName(result, "dappUserCommit");

    expect(events![0].args[2]).to.equal(accountAddress(dappAccount));
  });

  it("Dapp accounts", async () => {
    const account = databaseAccounts.providers.pop()!;

    const tasks = await changeSigner(account);

    const result = await tasks.getDappAccounts();

    expect(result).to.be.an("array");
  });

  it("Captchas are correctly formatted before being passed to the API layer", async () => {
    const account = databaseAccounts.dappUsers.pop()!;

    const tasks = await changeSigner(account);

    const datasetId = DATASET.datasetId;
    const captchas = await tasks.getCaptchaWithProof(
      datasetId,
      true,
      1
    );
    
    expect(captchas[0]).to.have.nested.property('captcha.captchaId');
    expect(captchas[0]).to.have.nested.property('captcha.datasetId', datasetId);
    expect(captchas[0]).to.have.property('proof');
    expect(captchas[0]).to.not.have.property('solution');
    expect(captchas[0]).to.not.have.nested.property('captcha.solution');
  });

  it("Captcha proofs are returned if commitment found and solution is correct", async () => {
    const { captchaSolutions, requestHash, account } =
      await createMockCaptchaSolutionsAndRequestHash();

    const dappAccount = databaseAccounts.dappsWithStake.pop()!;

    const tasks = await changeSigner(account);

    // salt ensures captcha commitment is different each time
    const salt = randomAsHex();
    const tree = new CaptchaMerkleTree();
    const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
      ...captcha,
      salt: salt,
    }));
    const captchasHashed = captchaSolutionsSalted.map((captcha) =>
      computeCaptchaSolutionHash(captcha)
    );

    tree.build(captchasHashed);
    const commitmentId = tree.root!.hash;

    const providerAccount =
      databaseAccounts.providersWithStakeAndDataset.pop()!;

    const provider = await tasks.getProviderDetails(
      accountAddress(providerAccount)
    );

    const response = await tasks.dappUserCommit(
      accountAddress(dappAccount),
      provider.captcha_dataset_id,
      commitmentId,
      accountAddress(providerAccount)
    );

    // next part contains internal contract calls that must be run by provider
    const providerTasks = await changeSigner(providerAccount);

    const result = await providerTasks.dappUserSolution(
      accountAddress(account),
      accountAddress(dappAccount),
      requestHash,
      JSON.parse(JSON.stringify(captchaSolutionsSalted)) as JSON,
      response.blockHash as string,
      response.result.txHash.toString()
    );

    expect(result.length).to.be.eq(2);
    const expectedProof = tree.proof(captchaSolutionsSalted[0].captchaId);

    expect(result[0].proof).to.deep.eq(expectedProof);
    expect(result[0].captchaId).to.eq(captchaSolutionsSalted[0].captchaId);
  });

  // it('Dapp User sending an invalid captchas causes error', async () => {
  //     const { requestHash } = await createMockCaptchaSolutionsAndRequestHash();
  //
  //     await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
  //     const providerTasks = new Tasks(mockEnv);
  //     const captchaSolutions = [
  //         { captchaId: 'blah', solution: [21], salt: 'blah' }
  //     ];
  //     const tree = new CaptchaMerkleTree();
  //     const captchasHashed = captchaSolutions.map((captcha) =>
  //         computeCaptchaSolutionHash(captcha)
  //     );
  //
  //     tree.build(captchasHashed);
  //     const solutionPromise = providerTasks.dappUserSolution(
  //         dappUser.address,
  //         dapp.contractAccount as string,
  //         requestHash,
  //         JSON.parse(JSON.stringify(captchaSolutions)) as JSON
  //     );
  //
  //     solutionPromise.catch((e) =>
  //         e.message.should.match(`/${ERRORS.CAPTCHA.INVALID_CAPTCHA_ID.message}/`)
  //     );
  // });
  //
  // it('Dapp User sending solutions without committing to blockchain causes error', async () => {
  //     const { captchaSolutions, requestHash } = await createMockCaptchaSolutionsAndRequestHash();
  //
  //     await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
  //     const providerTasks = new Tasks(mockEnv);
  //     const tree = new CaptchaMerkleTree();
  //     const captchasHashed = captchaSolutions.map((captcha) =>
  //         computeCaptchaSolutionHash(captcha)
  //     );
  //
  //     tree.build(captchasHashed);
  //     const solutionPromise = providerTasks.dappUserSolution(
  //         dappUser.address,
  //         dapp.contractAccount as string,
  //         requestHash,
  //         JSON.parse(JSON.stringify(captchaSolutions)) as JSON
  //     );
  //
  //     solutionPromise.catch((e) =>
  //         e.message.should.match(
  //             `/${ERRORS.CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST.message}/`
  //         )
  //     );
  // });
  //
  // it('No proofs are returned if commitment found and solution is incorrect', async () => {
  //     const { captchaSolutions, requestHash } = await createMockCaptchaSolutionsAndRequestHash();
  //     const captchaSolutionsBad = captchaSolutions.map((original) => ({
  //         ...original,
  //         solution: [3]
  //     }));
  //     const tree = new CaptchaMerkleTree();
  //     const salt = randomAsHex();
  //     // Have to salt the solutions with random salt each time otherwise we end up with the same commitment for
  //     // multiple users
  //     const captchaSolutionsSalted = captchaSolutionsBad.map((captcha) => ({
  //         ...captcha,
  //         salt: salt
  //     }));
  //     const solutionsHashed = captchaSolutionsSalted.map((captcha) =>
  //         computeCaptchaSolutionHash(captcha)
  //     );
  //
  //     tree.build(solutionsHashed);
  //     const commitmentId = tree.root!.hash;
  //
  //     await mockEnv.contractInterface!.changeSigner(dappUser.mnemonic);
  //     const dappUserTasks = new Tasks(mockEnv);
  //
  //     await dappUserTasks.dappUserCommit(
  //         dapp.contractAccount as string,
  //         datasetId as string,
  //         commitmentId,
  //         provider.address as string
  //     );
  //     // next part contains internal contract calls that must be run by provider
  //     await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
  //     const providerTasks = new Tasks(mockEnv);
  //     const result = await providerTasks.dappUserSolution(
  //         dappUser.address,
  //         dapp.contractAccount as string,
  //         requestHash,
  //         JSON.parse(JSON.stringify(captchaSolutionsSalted)) as JSON
  //     );
  //
  //     expect(result!.length).to.be.eq(0);
  // });

  it("Validates the received captchas length", async () => {
    const account =
      databaseAccounts.providersWithStakeAndDataset.pop()!;

    const { captchaSolutions } =
      await createMockCaptchaSolutionsAndRequestHash();

    const tasks = await changeSigner(account);

    // All of the captchaIds present in the solutions should be in the database
    expect(async function () {
      await tasks.validateCaptchasLength(
        JSON.parse(JSON.stringify(captchaSolutions)) as JSON
      );
    }).to.not.throw();
  });

  it("Builds the tree and gets the commitment", async () => {
    const { captchaSolutions, account } =
      await createMockCaptchaSolutionsAndRequestHash();

    const dappAccount = databaseAccounts.dappsWithStake.pop()!;

    const tasks = await changeSigner(account);

    const initialTree = new CaptchaMerkleTree();
    const captchasHashed = captchaSolutions.map((captcha) =>
      computeCaptchaSolutionHash(captcha)
    );

    initialTree.build(captchasHashed);
    const initialCommitmentId = initialTree.root!.hash;

    const providerAccount =
      databaseAccounts.providersWithStakeAndDataset.pop()!;

    const provider = await tasks.getProviderDetails(
      accountAddress(providerAccount)
    );

    await tasks.dappUserCommit(
      accountAddress(dappAccount),
      provider.captcha_dataset_id,
      initialCommitmentId,
      accountAddress(providerAccount)
    );
    const { commitment, commitmentId, tree } =
      await tasks.buildTreeAndGetCommitment(captchaSolutions);

    expect(tree).to.deep.equal(initialTree);
    expect(commitment).to.deep.equal(commitment);
    expect(commitmentId).to.equal(initialCommitmentId);
  });

  it("BuildTreeAndGetCommitment throws if commitment does not exist", async () => {
    const { captchaSolutions, account } =
      await createMockCaptchaSolutionsAndRequestHash();

    const tasks = await changeSigner(account);

    const salt = randomAsHex();
    const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
      ...captcha,
      salt: salt,
    }));
    const commitmentPromise = tasks.buildTreeAndGetCommitment(
      captchaSolutionsSalted
    );

    commitmentPromise.catch((e) =>
      e.message.should.match(
        `/${ERRORS.CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST.message}/`
      )
    );
  });

  it("Validates the Dapp User Solution Request is Pending", async () => {
    const { account, captchaSolutions } =
      await createMockCaptchaSolutionsAndRequestHash();

    const tasks = await changeSigner(account);

    const pendingRequestSalt = randomAsHex();
    const captchaIds = captchaSolutions.map((c) => c.captchaId);

    const requestHash = computePendingRequestHash(
      captchaIds,
      accountAddress(account),
      pendingRequestSalt
    );

    await mockEnv.db!.storeDappUserPending(
      hexHash(accountAddress(account)),
      requestHash,
      pendingRequestSalt
    );
    const valid = await tasks.validateDappUserSolutionRequestIsPending(
      requestHash,
      accountAddress(account),
      captchaIds
    );

    expect(valid).to.be.true;
  });

  it("Get random captchas and request hash", async () => {
    const account = databaseAccounts.dappUsers.pop()!;

    const dappAccount = databaseAccounts.dappsWithStake.pop()!;

    const tasks = await changeSigner(account);

    const solvedCaptchaCount = mockEnv.config.captchas.solved.count;
    const unsolvedCaptchaCount = mockEnv.config.captchas.unsolved.count;

    const { provider } = await tasks.getRandomProvider(
      accountAddress(account),
      accountAddress(dappAccount)
    );

    const { captchas, requestHash } =
      await tasks.getRandomCaptchasAndRequestHash(
        provider.captcha_dataset_id as string,
        hexHash(accountAddress(account))
      );

    expect(captchas.length).to.equal(solvedCaptchaCount + unsolvedCaptchaCount);
    const pendingRequest = mockEnv.db?.getDappUserPending(requestHash);

    expect(pendingRequest).to.not.be.null;
  });

  it("Validate provided captcha dataset", async () => {
    const account = databaseAccounts.dappsWithStake.pop()!;

    const dappAccount = databaseAccounts.dappsWithStake.pop()!;

    const tasks = await changeSigner(account);

    const res = await tasks.getRandomProvider(
      accountAddress(account),
      accountAddress(dappAccount)
    );
    const blockNumberParsed = parseBlockNumber(res.block_number);
    const valid = await tasks
      .validateProviderWasRandomlyChosen(
        accountAddress(account),
        accountAddress(dappAccount),
        res.provider.captcha_dataset_id as string,
        blockNumberParsed
      )
      .then(() => true)
      .catch(() => false);

    expect(valid).to.be.true;
  });

  it("Validate provided captcha dataset - fail", async () => {
    const account = databaseAccounts.providers.pop()!;

    const tasks = await changeSigner(account);

    const provider = await tasks.getProviderDetails(accountAddress(account));

    const captchaFilePath = path.resolve(
      __dirname,
      "../mocks/data/captchas.json"
    );

    await tasks.providerUpdate(
      provider.service_origin as string,
      provider.fee as unknown as number,
      provider.payee,
      accountAddress(account),
      providerStakeDefault / 2n
    );

    const insuficientFundsTransaction = await tasks
      .providerAddDataset(captchaFilePath)
      .then(() => false)
      .catch(() => true);

    expect(insuficientFundsTransaction).to.be.true;

    await tasks.providerUpdate(
      provider.service_origin as string,
      provider.fee as unknown as number,
      provider.payee,
      accountAddress(account),
      providerStakeDefault
    );

    await tasks.providerAddDataset(captchaFilePath);

    const dappAccount = databaseAccounts.dappsWithStake.pop()!;
    const dappUser = databaseAccounts.dappUsers.pop()!;

    const dappUserTasks = await changeSigner(dappUser);

    const res = await dappUserTasks.getRandomProvider(
      accountAddress(dappUser),
      accountAddress(dappAccount)
    );
    const blockNumberParsed = parseBlockNumber(res.block_number);
    const valid = await dappUserTasks
      .validateProviderWasRandomlyChosen(
        accountAddress(dappUser),
        accountAddress(dappAccount),
        "0x1dc833d14a257f21967feddafb3b3876b75b3fc9b0a2d071f29da9bfebc84f5a",
        blockNumberParsed
      )
      .then(() => true)
      .catch(() => false);

    expect(valid).to.be.false;
  });

  it("Provider unstake", async () => {
    const account = databaseAccounts.providersWithStake.pop()!;

    const tasks = await changeSigner(account);

    const value = 1;

    const result: TransactionResponse = await tasks.providerUnstake(
      value
    );
    const events = getEventsFromMethodName(result, "providerUnstake");

    expect(events![0].args[0]).to.equal(accountAddress(account));
  });

  it("Provider deregister", async () => {
    const account = databaseAccounts.providersWithStake.pop()!;

    const tasks = await changeSigner(account);

    const result: TransactionResponse = await tasks.providerDeregister(
      accountAddress(account)
    );
    const events = getEventsFromMethodName(result, "providerDeregister");

    expect(events![0].args[0]).to.equal(accountAddress(account));
  });

  it("Calculate captcha solution on the basis of Dapp users provided solutions", async () => {
    const account = databaseAccounts.providersWithStake.pop()!;

    const tasks = await changeSigner(account);

    const captchaFilePath = mockEnv.config.captchaSolutions.captchaFilePath;
    const datsetBeforeCalculation = parseCaptchaDataset(
      loadJSONFile(captchaFilePath) as JSON
    );

    const solvedCaptchasCountBeforeCalculation =
      datsetBeforeCalculation.captchas.filter(
        (captcha) => "solution" in captcha
      ).length;

    const result = await tasks.calculateCaptchaSolutions();

    const datsetAfterCalculation = parseCaptchaDataset(
      loadJSONFile(captchaFilePath) as JSON
    );

    const solvedCaptchasCountAfterCalculation =
      datsetAfterCalculation.captchas.filter(
        (captcha) => "solution" in captcha
      ).length;

    expect(
      solvedCaptchasCountAfterCalculation - solvedCaptchasCountBeforeCalculation
    ).to.equal(result);
  });
});

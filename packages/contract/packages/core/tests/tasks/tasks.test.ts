/* eslint-disable no-unused-expressions */
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

import { getEventsFromMethodName, TransactionResponse } from '@prosopo/contract';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { config } from 'dotenv';
import path from 'path';

import { formatBalance } from '@polkadot/util';
import { randomAsHex } from '@polkadot/util-crypto';

import { computeCaptchaSolutionHash, computePendingRequestHash } from '../../src/captcha';
import DatabaseAccounts, { accountAddress, accountMnemonic, exportDatabaseAccounts } from '../../src/dataUtils/DatabaseAccounts';
import { CaptchaMerkleTree } from '../../src/merkle';
import { Tasks } from '../../src/tasks';
import { CaptchaSolution } from '../../src/types/captcha';
import { PROVIDER } from '../mocks/accounts';
import { SOLVED_CAPTCHAS } from '../mocks/mockdb';
import { MockEnvironment } from '../mocks/mockenv';
import { sendFunds } from '../mocks/setup';

const envPath =
  process.env.NODE_ENV === 'test'
    ? { override: true, path: '../../../../.env.test' }
    : undefined;

config(envPath);

chai.should();
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('CONTRACT TASKS', () => {
  let providerStakeDefault: bigint;
  const mockEnv = new MockEnvironment();
  let tasks: Tasks;
  const databaseAccounts = new DatabaseAccounts();

  before(async () => {
    await mockEnv.isReady();
    tasks = new Tasks(mockEnv);

    await mockEnv.contractInterface!.changeSigner('//Alice');

    providerStakeDefault = await tasks.getProviderStakeDefault();
    await databaseAccounts.importDatabaseAccounts();
  });

  after(async () => {
    await exportDatabaseAccounts(databaseAccounts);
  });

  /** Gets some static solved captchas and constructions captcha solutions from them
   *  Computes the request hash for these captchas and the dappUser and then stores the request hasn in the mock db
   *  @return {CaptchaSolution[], string} captchaSolutions and requestHash
   */
  async function createMockCaptchaSolutionsAndRequestHash () {
    const account = databaseAccounts.registeredDappsWithStake.pop()!;

    await mockEnv.isReady();
    await mockEnv.contractInterface!.changeSigner(accountMnemonic(account));

    const captchaSolutions: CaptchaSolution[] = SOLVED_CAPTCHAS.map(
      (captcha) => ({
        captchaId: captcha.captchaId,
        salt: 'usersalt',
        solution: captcha.solution
      })
    );
    const salt = randomAsHex();
    const requestHash = computePendingRequestHash(
      captchaSolutions.map((c) => c.captchaId),
      accountAddress(account),
      salt
    );

    if ('storeDappUserPending' in mockEnv.db!) {
      await mockEnv.db.storeDappUserPending(
        mockEnv.contractInterface!.signer.address || '',
        requestHash,
        salt
      );
    }

    return { account, captchaSolutions, requestHash };
  }

  it('Provider registration', async () => {
    const [providerMnemonic, providerAddress] =
      mockEnv.contractInterface!.createAccountAndAddToKeyring() || ['', ''];

    console.log(formatBalance(1000000000000000000n));
    console.log(providerAddress, formatBalance(providerStakeDefault));

    await sendFunds(
      mockEnv,
      providerAddress,
      'Provider',
      10000000n * providerStakeDefault
    );

    await mockEnv.contractInterface!.changeSigner(providerMnemonic);

    const result: TransactionResponse = await tasks.providerRegister(
      PROVIDER.serviceOrigin + randomAsHex().slice(0, 8),
      PROVIDER.fee,
      PROVIDER.payee,
      providerAddress
    );

    expect(result.txHash!).to.not.be.empty;

    databaseAccounts.registeredProviders.push([providerMnemonic, providerAddress]);
  });

  it('Provider update', async () => {
    const account = databaseAccounts.registeredProviders.pop()!;

    await mockEnv.contractInterface!.changeSigner(accountMnemonic(account));
    const value = 1000000n * providerStakeDefault;

    console.log(formatBalance(value), formatBalance(providerStakeDefault));

    const result: TransactionResponse = await tasks.providerUpdate(
      PROVIDER.serviceOrigin + randomAsHex().slice(0, 8),
      PROVIDER.fee,
      PROVIDER.payee,
      accountAddress(account),
      value
    );

    const eventData = getEventsFromMethodName(result, 'providerUpdate');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(eventData![0].args[0]).to.equal(accountAddress(account));

    databaseAccounts.registeredProvidersWithStake.push(account);
  });

  it('Provider add dataset', async () => {
    const account = databaseAccounts.registeredProvidersWithStake.pop()!;

    await mockEnv.contractInterface!.changeSigner(accountMnemonic(account));
    const providerTasks = new Tasks(mockEnv);

    const captchaFilePath = path.resolve(
      __dirname,
      '../mocks/data/captchas.json'
    );
    const result: TransactionResponse = await providerTasks.providerAddDataset(
      captchaFilePath
    );
    const eventData = getEventsFromMethodName(result, 'providerAddDataset');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(eventData![0].args[0]).to.equal(accountAddress(account));

    databaseAccounts.registeredProvidersWithStakeAndDataset.push(account);
  });

  it('Inactive Provider cannot add dataset', async () => {
    const account = databaseAccounts.registeredProviders.pop()!;

    await mockEnv.contractInterface!.changeSigner(accountMnemonic(account));

    const captchaFilePath = path.resolve(
      __dirname,
      '../mocks/data/captchas.json'
    );
    const datasetPromise = tasks.providerAddDataset(captchaFilePath);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    datasetPromise.catch((e) => e.message.should.match('/ProviderInactive/'));

    databaseAccounts.registeredProviders.push(account);
  });

  it('Provider approve', async () => {
    const { account, captchaSolutions } = await createMockCaptchaSolutionsAndRequestHash();

    await mockEnv.contractInterface!.changeSigner(accountMnemonic(account));
    const salt = randomAsHex();

    const tree = new CaptchaMerkleTree();

    const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
      ...captcha,
      salt: salt
    }));
    const captchasHashed = captchaSolutionsSalted.map((captcha) =>
      computeCaptchaSolutionHash(captcha)
    );

    tree.build(captchasHashed);
    const commitmentId = tree.root!.hash;

    const providerAccount = databaseAccounts.registeredProvidersWithStakeAndDataset.pop()!;

    const provider = await tasks.getProviderDetails(accountAddress(providerAccount));

    console.log([provider.balance, formatBalance(providerStakeDefault), formatBalance(10000000n)]);
    await tasks.dappUserCommit(
      accountAddress(account),
      provider.captcha_dataset_id,
      commitmentId,
      accountAddress(providerAccount)
    );

    await mockEnv.contractInterface!.changeSigner(accountMnemonic(providerAccount));

    const result = await tasks.providerApprove(commitmentId, 0);
    const events = getEventsFromMethodName(result, 'providerApprove');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(events![0].args[0]).to.equal(commitmentId);

    databaseAccounts.registeredDappsWithStake.push(account);
    databaseAccounts.registeredProvidersWithStakeAndDataset.push(providerAccount);
  });

  it('Provider disapprove', async () => {
    const { account, captchaSolutions } = await createMockCaptchaSolutionsAndRequestHash();

    await mockEnv.contractInterface!.changeSigner(accountMnemonic(account));
    const dappUserTasks = new Tasks(mockEnv);
    const salt = randomAsHex();

    const tree = new CaptchaMerkleTree();

    const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
      ...captcha,
      salt: salt
    }));
    const captchasHashed = captchaSolutionsSalted.map((captcha) =>
      computeCaptchaSolutionHash(captcha)
    );

    tree.build(captchasHashed);
    const commitmentId = tree.root!.hash;

    const providerAccount = databaseAccounts.registeredProvidersWithStakeAndDataset.pop()!;

    const provider = await tasks.getProviderDetails(accountAddress(providerAccount));

    await dappUserTasks.dappUserCommit(
      accountAddress(account),
      provider.captcha_dataset_id,
      commitmentId,
      accountAddress(providerAccount)
    );

    await mockEnv.contractInterface!.changeSigner(accountMnemonic(providerAccount));

    const result = await tasks.providerDisapprove(commitmentId);
    const events = getEventsFromMethodName(result, 'providerDisapprove');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(events![0].args[0]).to.equal(commitmentId);

    databaseAccounts.registeredDappsWithStake.push(account);
    databaseAccounts.registeredProvidersWithStakeAndDataset.push(providerAccount);
  });

  it('Timestamps check', async () => {
    const dappAccount = databaseAccounts.registeredDappsWithStake.pop()!;

    await mockEnv.contractInterface!.changeSigner(accountMnemonic(dappAccount));
    const salt = randomAsHex();

    const tree = new CaptchaMerkleTree();

    const { captchaSolutions } = await createMockCaptchaSolutionsAndRequestHash();

    const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
      ...captcha,
      salt: salt
    }));
    const captchasHashed = captchaSolutionsSalted.map((captcha) =>
      computeCaptchaSolutionHash(captcha)
    );

    tree.build(captchasHashed);
    const commitmentId = tree.root!.hash;

    const providerAccount = databaseAccounts.registeredProvidersWithStakeAndDataset.pop()!;

    const provider = await tasks.getProviderDetails(accountAddress(providerAccount));

    await tasks.dappUserCommit(
      accountAddress(dappAccount),
      provider.captcha_dataset_id,
      commitmentId,
      accountAddress(providerAccount)
    );

    await mockEnv.contractInterface!.changeSigner(accountMnemonic(providerAccount));
    const providerTasks = new Tasks(mockEnv);

    const result = await providerTasks.providerApprove(commitmentId, 0);
    const events = getEventsFromMethodName(result, 'providerApprove');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    expect(events![0].args[0]).to.equal(commitmentId);

    const commitment = await providerTasks.getCaptchaSolutionCommitment(commitmentId);

    // check the timestamp
    const completedAt = parseInt(commitment.completed_at.toString().replaceAll(',', ''));

    expect(completedAt).to.be.above(0);

    // check how much time passed after successful completion
    const lastCorrectCaptcha = await providerTasks.getDappOperatorLastCorrectCaptcha(accountAddress(dappAccount));

    expect(Number.parseInt(lastCorrectCaptcha.before_ms.toString())).to.be.above(0);
  });

  //   it('Provider details', async () => {});

  //   it('Provider accounts', async () => {});

  //   it('Dapp registration', async () => {});

  //   it('Dapp is active', async () => {});

  //   it('Dapp details', async () => {});

  //   it('Dapp fund', async () => {});

  //   it('Dapp user commit', async () => {});

  //   it('Dapp accounts', async () => {});

  //   it('Captchas are correctly formatted before being passed to the API layer', async () => {});

  //   it('Captcha proofs are returned if commitment found and solution is correct', async () => {});

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

  //   it('Validates the received captchas length', async () => {});

  //   it('Builds the tree and gets the commitment', async () => {});

  //   it('BuildTreeAndGetCommitment throws if commitment does not exist', async () => {});

  //   it('Validates the Dapp User Solution Request is Pending', async () => {});

  //   it('Get random captchas and request hash', async () => {});

  //   it('Validate provided captcha dataset', async () => {});

  //   it('Validate provided captcha dataset - fail', async () => {});

  //   it('Provider unstake', async () => {});

  //   it('Provider deregister', async () => {});

//   it('Calculate captcha solution on the basis of Dapp users provided solutions', async () => {});
});

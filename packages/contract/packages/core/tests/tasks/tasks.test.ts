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
import {getEventsFromMethodName, Payee, Provider, TransactionResponse} from '@prosopo/contract';
import {CaptchaSolution} from '@prosopo/provider-core/types';
import path from 'path';

import {AnyJson} from '@polkadot/types/types/codec';
import {randomAsHex} from '@polkadot/util-crypto';

import {computeCaptchaSolutionHash, computePendingRequestHash, parseCaptchaDataset} from '../../src/captcha';
import {ERRORS} from '../../src/errors';
import {CaptchaMerkleTree} from '../../src/merkle';
import {Tasks} from '../../src/tasks/tasks';
import {loadJSONFile, parseBlockNumber, promiseQueue} from '../../src/util';
import {DAPP, DAPP_USER, PROVIDER, TestDapp, TestProvider} from '../mocks/accounts';
import {DATASET, SOLVED_CAPTCHAS} from '../mocks/mockdb';
import {MockEnvironment} from '../mocks/mockenv';
import {sendFunds, setupDapp, setupProvider} from '../mocks/setup';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');

chai.should();
chai.use(chaiAsPromised);
const expect = chai.expect;

describe('CONTRACT TASKS', () => {
  let datasetId;
  let provider;
  let dapp;
  const dappUser = DAPP_USER;
  const registeredProviders: [providerMnemonic: string, providerAddress: string][] = [];
  let providerStakeDefault: bigint;

  const mockEnv = new MockEnvironment();

  before(async () => {
    // Register the dapp
    await mockEnv.isReady();

    // Register a NEW provider otherwise commitments already exist in contract when Dapp User tries to use
    const [providerMnemonic, providerAddress] = mockEnv.contractInterface!.createAccountAndAddToKeyring() || [];

    const providerTasks = new Tasks(mockEnv);
    providerStakeDefault = await providerTasks.getProviderStakeDefault();

    await mockEnv.contractInterface!.changeSigner('//Alice');

    const funds = 10000000n * providerStakeDefault;
    
    await sendFunds(
      mockEnv,
      providerAddress,
      'Provider',
      funds
    );

    provider = { ...PROVIDER } as TestProvider;
    provider.mnemonic = providerMnemonic;
    provider.address = providerAddress;
    // Service origins cannot be duplicated
    provider.serviceOrigin = provider.serviceOrigin + randomAsHex().slice(0, 8);
    datasetId = await setupProvider(mockEnv, provider as TestProvider);
    const [dappMnemonic, dappAddress] = mockEnv.contractInterface!.createAccountAndAddToKeyring() || [];

    dapp = { ...DAPP } as TestDapp;
    await sendFunds(mockEnv, dappAddress, 'Dapp', funds);
    dapp.mnemonic = dappMnemonic;
    dapp.address = dappAddress;
    await setupDapp(mockEnv, dapp as TestDapp);
  });

  after(async () => {

    for (const registeredProvider of registeredProviders) {
      const [providerMnemonic, providerAddress] = registeredProvider;

      await mockEnv.contractInterface!.changeSigner(providerMnemonic as string);
      const providerTasks = new Tasks(mockEnv);

      await providerTasks.providerDeregister(
        providerAddress as string
      );
    }

  });

  /** Gets some static solved captchas and constructions captcha solutions from them
     *  Computes the request hash for these captchas and the dappUser and then stores the request hasn in the mock db
     *  @return {CaptchaSolution[], string} captchaSolutions and requestHash
     */
  async function createMockCaptchaSolutionsAndRequestHash () {
    await mockEnv.isReady();
    await mockEnv.contractInterface!.changeSigner(dappUser.mnemonic);
    const captchaSolutions: CaptchaSolution[] = SOLVED_CAPTCHAS.map(
      (captcha) => ({
        captchaId: captcha.captchaId,
        solution: captcha.solution,
        salt: 'usersalt'
      })
    );
    const salt = randomAsHex();
    const requestHash = computePendingRequestHash(
      captchaSolutions.map((c) => c.captchaId),
      dappUser.address,
      salt
    );

    if ('storeDappUserPending' in mockEnv.db!) {
      await mockEnv.db.storeDappUserPending(
        mockEnv.contractInterface!.signer!.address || '',
        requestHash,
        salt
      );
    }

    return { captchaSolutions, requestHash };
  }

  it('Provider registration', async () => {
    const [providerMnemonic, providerAddress] = mockEnv.contractInterface!.createAccountAndAddToKeyring() || ['', ''];

    await sendFunds(
      mockEnv,
      providerAddress,
      'Provider',
      10000000n * providerStakeDefault,
    );

    await mockEnv.contractInterface!.changeSigner(providerMnemonic);
    const providerTasks = new Tasks(mockEnv);

    const result: TransactionResponse = await providerTasks.providerRegister(
      PROVIDER.serviceOrigin + randomAsHex().slice(0, 8),
      provider.fee as number,
      provider.payee as Payee,
      providerAddress
    );

    registeredProviders.push([providerMnemonic, providerAddress]);

    expect(result.txHash!).to.not.be.empty;
  });

    it('Provider update', async () => {
        await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
        const providerTasks = new Tasks(mockEnv);
        const value = 1;


            const result: TransactionResponse = await providerTasks.providerUpdate(
                provider.serviceOrigin as string,
                provider.fee as number,
                provider.payee as Payee,
                provider.address as string,
                value
            );

            const eventData = getEventsFromMethodName(result, 'providerUpdate');

            expect(eventData![0].args[0]).to.equal(provider.address);
        } );

    it('Provider add dataset', async () => {
        await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
        const providerTasks = new Tasks(mockEnv);


            const captchaFilePath = path.resolve(
                __dirname,
                '../mocks/data/captchas.json'
            );
            const result: TransactionResponse = await providerTasks.providerAddDataset(
                captchaFilePath
            );
            const eventData = getEventsFromMethodName(result, 'providerAddDataset');

             expect(eventData![0].args[0]).to.equal(provider.address);
        } );

    it('Inactive Provider cannot add dataset', async () => {
        const [providerMnemonic, providerAddress] = mockEnv.contractInterface!.createAccountAndAddToKeyring() || [];

        await mockEnv.contractInterface!.changeSigner('//Alice');
        await sendFunds(
            mockEnv,
            providerAddress,
            'Provider',
            10000000n * providerStakeDefault,
        );
        const inactiveProvider = {...PROVIDER} as TestProvider;

        inactiveProvider.mnemonic = providerMnemonic || '';
        inactiveProvider.address = providerAddress || '';
        inactiveProvider.serviceOrigin = inactiveProvider.serviceOrigin + randomAsHex().slice(0, 8);
        await mockEnv.contractInterface!.changeSigner(inactiveProvider.mnemonic);
        const providerTasks = new Tasks(mockEnv);

        await providerTasks.providerRegister(
            inactiveProvider.serviceOrigin,
            inactiveProvider.fee,
            inactiveProvider.payee,
            inactiveProvider.address
        );
    registeredProviders.push([providerMnemonic, providerAddress]);    const captchaFilePath = path.resolve(__dirname, '../mocks/data/captchas.json');
        const datasetPromise = providerTasks.providerAddDataset(captchaFilePath);

        datasetPromise.catch((e) =>
            e.message.should.match('/ProviderInactive/')
        );
    });

    it('Provider approve', async () => {
        const {captchaSolutions} = await createMockCaptchaSolutionsAndRequestHash();

        await mockEnv.contractInterface!.changeSigner(dappUser.mnemonic);
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

        await dappUserTasks.dappUserCommit(
            DAPP.contractAccount,
            datasetId as string,
            commitmentId,
            provider.address as string
        );

        await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
        const providerTasks = new Tasks(mockEnv);


            const result: any = await providerTasks.providerApprove(commitmentId, 0);
            const events = getEventsFromMethodName(result, 'providerApprove');

            expect(events![0].args[0]).to.equal(commitmentId);
        } );

    it('Provider disapprove', async () => {
        const {captchaSolutions} = await createMockCaptchaSolutionsAndRequestHash();

        await mockEnv.contractInterface!.changeSigner(dappUser.mnemonic);
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

        await dappUserTasks.dappUserCommit(
            DAPP.contractAccount,
            datasetId as string,
            commitmentId,
            provider.address as string
        );

        await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
        const providerTasks = new Tasks(mockEnv);


            const result: TransactionResponse = await providerTasks.providerDisapprove(commitmentId);
            const events = getEventsFromMethodName(result, 'providerDisapprove');

            expect(events![0].args[0]).to.equal(commitmentId);
        } );

    it('Timestamps check', async () => {
        await mockEnv.contractInterface!.changeSigner(dappUser.mnemonic)
        const dappUserTasks = new Tasks(mockEnv)
        const salt = randomAsHex()

        const tree = new CaptchaMerkleTree()

        const {captchaSolutions} = await createMockCaptchaSolutionsAndRequestHash();

        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
            ...captcha,
            salt: salt
        }))
        const captchasHashed = captchaSolutionsSalted.map((captcha) =>
            computeCaptchaSolutionHash(captcha)
        )
        tree.build(captchasHashed)
        const commitmentId = tree.root!.hash
        await dappUserTasks.dappUserCommit(
            DAPP.contractAccount,
            datasetId as string,
            commitmentId,
            provider.address as string
        )

        await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string)
        const providerTasks = new Tasks(mockEnv)

            const result = await providerTasks.providerApprove(commitmentId, 0)
            const events = getEventsFromMethodName(result, 'providerApprove')
            expect(events![0].args[0]).to.equal(commitmentId)


        const commitment = await providerTasks.getCaptchaSolutionCommitment(commitmentId);

        // check the timestamp
        const completedAt = parseInt(commitment.completed_at.toString().replaceAll(",", ""));
        expect(completedAt).to.be.above(0);

        // check how much time passed after successful completion
        const lastCorrectCaptcha = await providerTasks.getDappOperatorLastCorrectCaptcha(dappUser.address);
        expect(Number.parseInt(lastCorrectCaptcha.before_ms.toString())).to.be.above(0);
    });

    it('Provider details', async () => {
        await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
        const providerTasks = new Tasks(mockEnv);


            const result: Provider = await providerTasks.getProviderDetails(
                provider.address as string
            );

            expect(result).to.have.a.property('status');
        } );

    it('Provider accounts', async () => {
        await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
        const providerTasks = new Tasks(mockEnv);


            const result: AnyJson = await providerTasks.getProviderAccounts();

            expect(result).to.be.an('array');

    });

    it('Dapp registration', async () => {
        await mockEnv.contractInterface!.changeSigner(dapp.mnemonic as string);
        const dappTasks = new Tasks(mockEnv);


            const result: TransactionResponse = await dappTasks.dappRegister(
                dapp.serviceOrigin as string,
                dapp.contractAccount as string,
                dapp.optionalOwner as string
            );

            expect(result.txHash).to.not.be.empty;

    });

    it('Dapp is active', async () => {
        await mockEnv.contractInterface!.changeSigner(dapp.mnemonic as string);
        const dappTasks = new Tasks(mockEnv);


            const result: any = await dappTasks.dappIsActive(
                dapp.contractAccount as string
            );

            expect(result).to.equal(true);
        } );

    it('Dapp details', async () => {
        await mockEnv.contractInterface!.changeSigner(dapp.mnemonic as string);
        const dappTasks = new Tasks(mockEnv);


            const result: any = await dappTasks.getDappDetails(
                dapp.contractAccount as string
            );

            expect(result).to.have.a.property('status');
        } );

    it('Dapp fund', async () => {
        await mockEnv.contractInterface!.changeSigner(dapp.mnemonic as string);
        const dappTasks = new Tasks(mockEnv);

        const value = 10;


            const result: TransactionResponse = await dappTasks.dappFund(
                dapp.contractAccount as string,
                value
            );
            const events = getEventsFromMethodName(result, 'dappFund');
            const decoded = events![0].args.map((arg) => arg.toHuman());

            expect(decoded[0]).to.equal(dapp.contractAccount);
            const dappStruct = await dappTasks.getDappDetails(dapp.contractAccount as string);

            expect(events![0].args[1].toHuman()).to.equal(dappStruct.balance);

    });

    it('Dapp user commit', async () => {

            const {captchaSolutions} = await createMockCaptchaSolutionsAndRequestHash();

            await mockEnv.contractInterface!.changeSigner(dappUser.mnemonic);
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

            const result: TransactionResponse = await dappUserTasks.dappUserCommit(
                dapp.contractAccount as string,
                datasetId as string,
                commitmentId,
                provider.address as string
            );

            if (!result) {
                throw new Error('Result is null');
            }

            const events = getEventsFromMethodName(result, 'dappUserCommit');

            expect(events![0].args[2]).to.equal(dapp.contractAccount);
        } );

    it('Dapp accounts', async () => {
        await mockEnv.contractInterface!.changeSigner(dapp.mnemonic as string);
        const providerTasks = new Tasks(mockEnv);


            const result: AnyJson = await providerTasks.getDappAccounts();

            expect(result).to.be.an('array');
        } );

    it('Captchas are correctly formatted before being passed to the API layer', async () => {
        await mockEnv.contractInterface!.changeSigner(dappUser.mnemonic);
        const dappUserTasks = new Tasks(mockEnv);
        const datasetId = DATASET.datasetId;
        const captchas = await dappUserTasks.getCaptchaWithProof(datasetId, true, 1);

        expect(captchas[0]).to.deep.equal({
            captcha: {
                captchaId:
                    '0x73f15c36e0600922aed7d0ea1f4580c188c087e5d8be5470a4ca8382c792e6b9',
                datasetId:
                    '0x4e5b2ae257650340b493e94b4b4a4ac0e0dded8b1ecdad8252fe92bbd5b26605',
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
                target: 'bus'
            },
            proof: [
                [
                    '0x73f15c36e0600922aed7d0ea1f4580c188c087e5d8be5470a4ca8382c792e6b9',
                    '0x894d733d37d2df738deba781cf6d5b66bd5b2ef1041977bf27908604e7b3e604'
                ],
                [
                    '0x40ccd7d86bb18860c660a211496e525a3cacc4b506440e56ac85ac824a253378',
                    '0x76cb07140a3c9e1108e392386b286d60dd5e302dc59dfa8c049045107f8db854'
                ],
                [
                    '0x8b12abef36bfa970211495a826922d99f8a01a66f2e633fff4874061f637d814',
                    '0xe52b9fc3595ec17f3ad8d7a8095e1b730c9c4f6be21f16a5d5c9ced6b1ef8903'
                ],
                ['0x4e5b2ae257650340b493e94b4b4a4ac0e0dded8b1ecdad8252fe92bbd5b26605']
            ]
        });
    });

    it('Captcha proofs are returned if commitment found and solution is correct', async () => {
        const {captchaSolutions, requestHash} = await createMockCaptchaSolutionsAndRequestHash();

        await mockEnv.contractInterface!.changeSigner(dappUser.mnemonic);
        const dappUserTasks = new Tasks(mockEnv);
        // salt ensures captcha commitment is different each time
        const salt = randomAsHex();
        const tree = new CaptchaMerkleTree();
        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({...captcha, salt: salt}));
        const captchasHashed = captchaSolutionsSalted.map((captcha) => computeCaptchaSolutionHash(captcha));

        tree.build(captchasHashed);
        const commitmentId = tree.root!.hash;
        const response = await dappUserTasks.dappUserCommit(
            dapp.contractAccount as string,
            datasetId as string,
            commitmentId,
            provider.address as string
        );

        // next part contains internal contract calls that must be run by provider
        await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
        const providerTasks = new Tasks(mockEnv);
        const result = await providerTasks.dappUserSolution(
            dappUser.address,
            dapp.contractAccount as string,
            requestHash,
            JSON.parse(JSON.stringify(captchaSolutionsSalted)) as JSON,
            (response.blockHash) as string,
            (response.result.txHash.toString())
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

    it('Validates the received captchas length', async () => {
        const {captchaSolutions} = await createMockCaptchaSolutionsAndRequestHash();

        await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
        const providerTasks = new Tasks(mockEnv);

        // All of the captchaIds present in the solutions should be in the database
        expect(async function () {
            await providerTasks.validateCaptchasLength(
                JSON.parse(JSON.stringify(captchaSolutions)) as JSON
            );
        }).to.not.throw();
    });

    it('Builds the tree and gets the commitment', async () => {
        const {captchaSolutions} = await createMockCaptchaSolutionsAndRequestHash();

        await mockEnv.contractInterface!.changeSigner(dappUser.mnemonic);
        const dappUserTasks = new Tasks(mockEnv);
        const initialTree = new CaptchaMerkleTree();
        const captchasHashed = captchaSolutions.map((captcha) =>
            computeCaptchaSolutionHash(captcha)
        );

        initialTree.build(captchasHashed);
        const initialCommitmentId = initialTree.root!.hash;

        await dappUserTasks.dappUserCommit(
            dapp.contractAccount as string,
            datasetId as string,
            initialCommitmentId,
            provider.address as string
        );
        const {commitment, commitmentId, tree} = await dappUserTasks.buildTreeAndGetCommitment(captchaSolutions);

        expect(tree).to.deep.equal(initialTree);
        expect(commitment).to.deep.equal(commitment);
        expect(commitmentId).to.equal(initialCommitmentId);
    });

    it('BuildTreeAndGetCommitment throws if commitment does not exist', async () => {
        const {captchaSolutions} = await createMockCaptchaSolutionsAndRequestHash();

        await mockEnv.contractInterface!.changeSigner(dappUser.mnemonic);
        const dappUserTasks = new Tasks(mockEnv);
        const salt = randomAsHex();
        const captchaSolutionsSalted = captchaSolutions.map((captcha) => ({
            ...captcha,
            salt: salt
        }));
        const commitmentPromise = dappUserTasks.buildTreeAndGetCommitment(captchaSolutionsSalted);

        commitmentPromise.catch((e) =>
            e.message.should.match(
                `/${ERRORS.CONTRACT.CAPTCHA_SOLUTION_COMMITMENT_DOES_NOT_EXIST.message}/`
            )
        );
    });

    it('Validates the Dapp User Solution Request is Pending', async () => {
        const {captchaSolutions} = await createMockCaptchaSolutionsAndRequestHash();

        await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
        const providerTasks = new Tasks(mockEnv);
        const pendingRequestSalt = randomAsHex();
        const captchaIds = captchaSolutions.map((c) => c.captchaId);
        const requestHash = computePendingRequestHash(
            captchaIds,
            mockEnv.contractInterface!.signer!.address || '',
            pendingRequestSalt
        );

        await mockEnv.db!.storeDappUserPending(
            mockEnv.contractInterface!.signer!.address || '',
            requestHash,
            pendingRequestSalt
        );
        const valid = await providerTasks.validateDappUserSolutionRequestIsPending(
            requestHash,
            mockEnv.contractInterface!.signer!.address || '',
            captchaIds
        );

         expect(valid).to.be.true;
    });

    it('Get random captchas and request hash', async () => {
        await mockEnv.contractInterface!.changeSigner(dappUser.mnemonic);
        const dappTasks = new Tasks(mockEnv);
        const solvedCaptchaCount = mockEnv.config.captchas.solved.count;
        const unsolvedCaptchaCount = mockEnv.config.captchas.unsolved.count;
        const {captchas, requestHash} =
            await dappTasks.getRandomCaptchasAndRequestHash(datasetId as string, mockEnv.contractInterface!.signer!.address || '');

        expect(captchas.length).to.equal(solvedCaptchaCount + unsolvedCaptchaCount);
        const pendingRequest = mockEnv.db?.getDappUserPending(requestHash);

         expect(pendingRequest).to.not.be.null;
    });

    it('Validate provided captcha dataset', async () => {
        const tasks = new Tasks(mockEnv);
        const queueRes = await promiseQueue(
            new Array(4).fill(0).map(
                (_, datasetIndex) => async () => {
                    const [providerMnemonic, providerAddress] = mockEnv.contractInterface!.createAccountAndAddToKeyring() || ['', ''];

                    await mockEnv.contractInterface!.changeSigner('//Alice');
                    await sendFunds(
                        mockEnv,
                        providerAddress,
                        'Provider',
                        10000000n * providerStakeDefault,
                    );
                    const provider = {...PROVIDER} as TestProvider;

                    provider.mnemonic = providerMnemonic;
                    provider.address = providerAddress;
                    provider.serviceOrigin =
                        provider.serviceOrigin + randomAsHex().slice(0, 8);
                    await mockEnv.contractInterface!.changeSigner(providerMnemonic);
                    await tasks.providerRegister(
                        provider.serviceOrigin,
                        provider.fee,
                        provider.payee,
                        provider.address);

                    registeredProviders.push([providerMnemonic, providerAddress]);

                    await tasks.providerUpdate(
                        provider.serviceOrigin,
                        provider.fee,
                        provider.payee,
                        provider.address,
                        2n * providerStakeDefault,
                    );
                    const captchaFilePath = path.resolve(
                        __dirname,
                        `../mocks/data/captchas${datasetIndex + 1}.json`
                    );

                    await tasks.providerAddDataset(captchaFilePath);
                }
            )
        );

        queueRes.forEach((res) => {
            const _ = expect(res.error).to.not.exist;
        });

        const res = await tasks.getRandomProvider(dappUser.address);
        const blockNumberParsed = parseBlockNumber(res.block_number);
        const valid = await tasks.validateProviderWasRandomlyChosen(dappUser.address, res.provider.captcha_dataset_id as string, blockNumberParsed)
            .then(() => true).catch(() => false);

         expect(valid).to.be.true;
    });

    it('Validate provided captcha dataset - fail', async () => {
        const tasks = new Tasks(mockEnv);

        const [providerMnemonic, providerAddress] =
        mockEnv.contractInterface!.createAccountAndAddToKeyring() || ['', ''];

        await mockEnv.contractInterface!.changeSigner('//Alice');

        await sendFunds(
            mockEnv,
            providerAddress,
            'Provider',
            10000000n * providerStakeDefault,
        );

        const provider = {...PROVIDER} as TestProvider;

        provider.mnemonic = providerMnemonic;
        provider.serviceOrigin = provider.serviceOrigin + randomAsHex().slice(0, 8);
        await mockEnv.contractInterface!.changeSigner(providerMnemonic);
        await tasks.providerRegister(
            provider.serviceOrigin,
            provider.fee,
            provider.payee,
            providerAddress
        );

        registeredProviders.push([providerMnemonic, providerAddress]);

        const captchaFilePath = path.resolve(
            __dirname,
            '../mocks/data/captchas.json'
        );

        await tasks.providerUpdate(
            provider.serviceOrigin,
            provider.fee,
            provider.payee,
            providerAddress,
            providerStakeDefault / 2n,
        );

        const insuficientFundsTransaction = await tasks.providerAddDataset(captchaFilePath).then(() => false).catch(() => true);

        expect(insuficientFundsTransaction).to.be.true;

        await tasks.providerUpdate(
            provider.serviceOrigin,
            provider.fee,
            provider.payee,
            providerAddress,
            providerStakeDefault,
        );

        await tasks.providerAddDataset(captchaFilePath);

        const res = await tasks.getRandomProvider(dappUser.address);
        const blockNumberParsed = parseBlockNumber(res.block_number);
        const valid = await tasks.validateProviderWasRandomlyChosen(dappUser.address, '0x1dc833d14a257f21967feddafb3b3876b75b3fc9b0a2d071f29da9bfebc84f5a', blockNumberParsed)
            .then(() => true)
            .catch(() => false);

        expect(valid).to.be.false;
    });

    it('Provider unstake', async () => {
        await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
        const providerTasks = new Tasks(mockEnv);
        const value = 1;


            const result: TransactionResponse = await providerTasks.providerUnstake(value);
            const events = getEventsFromMethodName(result, 'providerUnstake');

            expect(events![0].args[0]).to.equal(provider.address);
        } );

    it('Provider deregister', async () => {
        await mockEnv.contractInterface!.changeSigner(provider.mnemonic as string);
        const providerTasks = new Tasks(mockEnv);


            const result: TransactionResponse = await providerTasks.providerDeregister(
                provider.address as string
            );
            const events = getEventsFromMethodName(result, 'providerDeregister');

            expect(events![0].args[0]).to.equal(provider.address);
        } );

    it('Calculate captcha solution on the basis of Dapp users provided solutions', async () => {
        const providerTasks = new Tasks(mockEnv);


            const captchaFilePath = mockEnv.config.captchaSolutions.captchaFilePath;
            const datsetBeforeCalculation = parseCaptchaDataset(loadJSONFile(captchaFilePath) as JSON);

            const solvedCaptchasCountBeforeCalculation = datsetBeforeCalculation.captchas.filter((captcha) => 'solution' in captcha).length;

            const result = await providerTasks.calculateCaptchaSolutions();

            const datsetAfterCalculation = parseCaptchaDataset(loadJSONFile(captchaFilePath) as JSON);

            const solvedCaptchasCountAfterCalculation = datsetAfterCalculation.captchas.filter((captcha) => 'solution' in captcha).length;

            expect(solvedCaptchasCountAfterCalculation - solvedCaptchasCountBeforeCalculation).to.equal(result);
        } );

});

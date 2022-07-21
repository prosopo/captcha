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
import { BigNumber, Payee, hexHash } from "@prosopo/contract";
import path from "path";

import { blake2AsHex, decodeAddress, randomAsHex } from "@polkadot/util-crypto";

import { sendFunds as _sendFunds } from "../../src/tasks/setup";
import { Tasks } from "../../src/tasks";
import {
  Account,
  accountAddress,
  accountMnemonic,
  IDatabaseAccounts,
} from "./DatabaseAccounts";
import { Environment } from "../../src/env";

const serviceOriginBase = "http://localhost:";

const PROVIDER_FEE = 10;
const PROVIDER_PAYEE = Payee.Provider;

export enum IDatabasePopulatorMethodNames {
  registerProvider="registerProvider",
  registerProviderWithStake="registerProviderWithStake",
  registerProviderWithStakeAndDataset="registerProviderWithStakeAndDataset",
  registerDapp="registerDapp",
  registerDappWithStake="registerDappWithStake",
  registerDappUser="registerDappUser"
}

export class IDatabasePopulatorMethods {
  registerProvider: (
    serviceOrigin?: string,
    noPush?: boolean
  ) => Promise<Account>;
  registerProviderWithStake: () => Promise<Account>;
  registerProviderWithStakeAndDataset: () => Promise<Account>;
  registerDapp: (serviceOrigin?: string, noPush?: boolean) => Promise<Account>;
  registerDappWithStake: () => Promise<Account>;
  registerDappUser: () => Promise<Account>;
}

class DatabasePopulator
  implements IDatabaseAccounts, IDatabasePopulatorMethods
{
  private mockEnv: Environment

  private _registeredProviders: Account[] = [];

  private _registeredProvidersWithStake: Account[] = [];

  private _registeredProvidersWithStakeAndDataset: Account[] = [];

  private _registeredDapps: Account[] = [];

  private _registeredDappsWithStake: Account[] = [];

  private _registeredDappUsers: Account[] = [];

  private providerStakeDefault = 0n;

  private _isReady: Promise<void>;

  constructor(env) {
    this.mockEnv = env
    this._isReady = this.mockEnv
      .isReady()
      .then(() => {
        const tasks = new Tasks(this.mockEnv);

        return tasks
          .getProviderStakeDefault()
          .then((res) => {
            this.providerStakeDefault = res;
          })
          .catch(console.error);
      })
      .catch(console.error);
  }

  get providers(): Account[] {
    return this._registeredProviders;
  }

  set providers(accounts:Account[]) {
    this._registeredProviders = accounts;
  }

  get providersWithStake(): Account[] {
    return this._registeredProvidersWithStake;
  }

  set providersWithStake(accounts:Account[]) {
    this._registeredProvidersWithStake = accounts;
  }

  get providersWithStakeAndDataset(): Account[] {
    return this._registeredProvidersWithStakeAndDataset;
  }

  set providersWithStakeAndDataset(accounts:Account[]) {
    this._registeredProvidersWithStakeAndDataset = accounts;
  }

  get dapps(): Account[] {
    return this._registeredDapps;
  }

  set dapps(accounts:Account[]) {
    this._registeredDapps = accounts;
  }

  get dappsWithStake(): Account[] {
    return this._registeredDappsWithStake;
  }

  set dappsWithStake(accounts:Account[]) {
    this._registeredDappsWithStake = accounts;
  }

  get dappUsers(): Account[] {
    return this._registeredDappUsers;
  }

  set dappUsers(accounts:Account[]) {
    this._registeredDappUsers = accounts;
  }

  public isReady() {
    return this._isReady;
  }

  private createAccount(): Account {
    const account =
      this.mockEnv.contractInterface?.createAccountAndAddToKeyring();

    if (!account) {
      throw new Error("Could not create an account!");
    }

    return account;
  }

  private sendFunds(account: Account, payee: Payee, amount: BigNumber);
  private sendFunds(address: string, payee: Payee, amount: BigNumber);

  private sendFunds(
    account: Account | string,
    payee: Payee,
    amount: BigNumber
  ) {
    const address =
      typeof account === "string" ? account : accountAddress(account);

    return _sendFunds(this.mockEnv, address, payee, amount);
  }

  private changeSigner(account: Account);
  private changeSigner(mnemonic: string);

  private changeSigner(account: Account | string) {
    const mnemonic =
      typeof account === "string" ? account : accountMnemonic(account);

    if (!this.mockEnv.contractInterface) {
      throw new Error("MockEnvironment not set up");
    }

    return this.mockEnv.contractInterface.changeSigner(mnemonic);
  }

  public async registerProvider(
    serviceOrigin?: string,
    noPush?: boolean
  ): Promise<Account> {
    const _serviceOrigin =
      serviceOrigin || serviceOriginBase + randomAsHex().slice(0, 8);

    const account = this.createAccount();

    await this.sendFunds(
      accountAddress(account),
      "Provider",
      10000000n * this.providerStakeDefault
    );

    await this.changeSigner(accountMnemonic(account));

    const tasks = new Tasks(this.mockEnv);

    await tasks.providerRegister(
      hexHash(_serviceOrigin),
      PROVIDER_FEE,
      PROVIDER_PAYEE,
      accountAddress(account)
    );

    if (!noPush) {
      this._registeredProviders.push(account);
    }

    return account;
  }

  private async updateProvider(account: Account, serviceOrigin: string) {
    await this.changeSigner(account);

    const tasks = new Tasks(this.mockEnv);

    await tasks.providerUpdate(
      hexHash(serviceOrigin),
      PROVIDER_FEE,
      PROVIDER_PAYEE,
      accountAddress(account),
      this.providerStakeDefault
    );
  }

  public async registerProviderWithStake(): Promise<Account> {
    const serviceOrigin = serviceOriginBase + randomAsHex().slice(0, 8);

    const account = await this.registerProvider(serviceOrigin, true);

    await this.updateProvider(account, serviceOrigin);

    this._registeredProvidersWithStake.push(account);

    return account;
  }

  private async addDataset(account: Account) {
    await this.changeSigner(account);

    const tasks = new Tasks(this.mockEnv);

    const captchaFilePath = path.resolve(
      __dirname,
      "../../tests/mocks/data/captchas.json"
    );

    await tasks.providerAddDataset(captchaFilePath);
  }

  public async registerProviderWithStakeAndDataset(): Promise<Account> {
    const serviceOrigin = serviceOriginBase + randomAsHex().slice(0, 8);

    const account = await this.registerProvider(serviceOrigin, true);

    await this.updateProvider(account, serviceOrigin);

    await this.addDataset(account);

    this._registeredProvidersWithStakeAndDataset.push(account);

    return account;
  }

  public async registerDapp(
    serviceOrigin?: string,
    noPush?: boolean
  ): Promise<Account> {
    const _serviceOrigin =
      serviceOrigin || serviceOriginBase + randomAsHex().slice(0, 8);

    const account = this.createAccount();

    await this.sendFunds(
      accountAddress(account),
      "Provider",
      10000000n * this.providerStakeDefault
    );

    await this.changeSigner(accountMnemonic(account));

    const tasks = new Tasks(this.mockEnv);

    await tasks.dappRegister(
      hexHash(_serviceOrigin),
      accountAddress(account),
      blake2AsHex(decodeAddress(accountAddress(account)))
    );

    if (!noPush) {
      this._registeredDapps.push(account);
    }

    return account;
  }

  private async dappFund(account: Account) {
    await this.changeSigner(account);

    const tasks = new Tasks(this.mockEnv);

    await tasks.dappFund(
      accountAddress(account),
      1000000n * this.providerStakeDefault
    );
  }

  public async registerDappWithStake(): Promise<Account> {
    const serviceOrigin = serviceOriginBase + randomAsHex().slice(0, 8);

    const account = await this.registerDapp(serviceOrigin, true);

    await this.dappFund(account);

    this._registeredDappsWithStake.push(account);

    return account;
  }

  public async registerDappUser(): Promise<Account> {
    const account = this.createAccount();

    await this.sendFunds(
      accountAddress(account),
      "Provider",
      10000000n * this.providerStakeDefault
    );

    this._registeredDappUsers.push(account);

    return account;
  }
}

export default DatabasePopulator;

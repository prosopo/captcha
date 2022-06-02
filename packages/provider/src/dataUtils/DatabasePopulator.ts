import { BigNumber, Payee } from "@prosopo/contract";
import path from "path";

import { blake2AsHex, decodeAddress, randomAsHex } from "@polkadot/util-crypto";

import { sendFunds as _sendFunds } from "../../tests/mocks/setup";
import { Tasks } from "../tasks";
import { hexHash } from "../util";
import {
  Account,
  accountAddress,
  accountMnemonic,
  IDatabaseAccounts,
} from "./DatabaseAccounts";
import { Environment } from "../env";

const serviceOriginBase = "http://localhost:";

const PROVIDER_FEE = 10;
const PROVIDER_PAYEE = Payee.Provider;

export interface IDatabasePopulatorMethods {
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
  private mockEnv = new Environment(process.env.PROVIDER_MNEMONIC);

  private _registeredProviders: Account[] = [];

  private _registeredProvidersWithStake: Account[] = [];

  private _registeredProvidersWithStakeAndDataset: Account[] = [];

  private _registeredDapps: Account[] = [];

  private _registeredDappsWithStake: Account[] = [];

  private _registeredDappUsers: Account[] = [];

  private providerStakeDefault = 0n;

  private _isReady: Promise<void>;

  constructor() {
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

  get providersWithStake(): Account[] {
    return this._registeredProvidersWithStake;
  }

  get providersWithStakeAndDataset(): Account[] {
    return this._registeredProvidersWithStakeAndDataset;
  }

  get dapps(): Account[] {
    return this._registeredDapps;
  }

  get dappsWithStake(): Account[] {
    return this._registeredDappsWithStake;
  }

  get dappUsers(): Account[] {
    return this._registeredDappUsers;
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

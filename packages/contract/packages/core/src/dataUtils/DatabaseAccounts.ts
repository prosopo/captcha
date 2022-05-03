import { writeFile, readFile } from "fs";
import path from "path";

export type Account = [mnemonic: string, address: string];

export const accountMnemonic = (account: Account) => account[0];
export const accountAddress = (account: Account) => account[1];

export interface IDatabaseAccounts {
  registeredProviders: Account[];

  registeredProvidersWithStake: Account[];

  registeredProvidersWithStakeAndDataset: Account[];

  registeredDapps: Account[];

  registeredDappsWithStake: Account[];
}

const keys = [
  "registeredProviders",
  "registeredProvidersWithStake",
  "registeredProvidersWithStakeAndDataset",
  "registeredDapps",
  "registeredDappsWithStake",
];

const FILE_PATH = "../../../../database_accounts.json";

export async function exportDatabaseAccounts (database: IDatabaseAccounts) {
  return new Promise((resolve) => {
    const jsonData = keys.reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: database[curr],
      };
    }, {});

    writeFile(FILE_PATH, JSON.stringify(jsonData), function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log(`Exported accounts to ${path.resolve(FILE_PATH)}`);
      }

      resolve(null);
    });
  });
}

class DatabaseAccounts implements IDatabaseAccounts {
  private _registeredProviders: Account[] = [];
  private _registeredProvidersWithStake: Account[] = [];
  private _registeredProvidersWithStakeAndDataset: Account[] = [];
  private _registeredDapps: Account[] = [];
  private _registeredDappsWithStake: Account[] = [];

  get registeredProviders(): Account[] {
    return this._registeredProviders;
  }
  get registeredProvidersWithStake(): Account[] {
    return this._registeredProvidersWithStake;
  }
  get registeredProvidersWithStakeAndDataset(): Account[] {
    return this._registeredProvidersWithStakeAndDataset;
  }
  get registeredDapps(): Account[] {
    return this._registeredDapps;
  }
  get registeredDappsWithStake(): Account[] {
    return this._registeredDappsWithStake;
  }

  public importDatabaseAccounts () {
    const self = this;
    return new Promise((resolve) => {
      readFile(FILE_PATH, {encoding: "utf-8"}, function(err, stringData) {
          if (err) {
            console.log(err);
          } else {
            console.log(`Imported accounts from ${path.resolve(FILE_PATH)}`);
            const data = JSON.parse(stringData);
            keys.forEach(key => {
                self[`_${key}`] = data[key];
            })
          }

          resolve(null)
      })
    });
  }
}

export default DatabaseAccounts;

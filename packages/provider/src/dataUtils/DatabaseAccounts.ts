import { writeFile, readFile } from "fs";
import path from "path";

export type Account = [mnemonic: string, address: string];

export const accountMnemonic = (account: Account) => account[0];
export const accountAddress = (account: Account) => account[1];

export interface IDatabaseAccounts {
  providers: Account[];

  providersWithStake: Account[];

  providersWithStakeAndDataset: Account[];

  dapps: Account[];

  dappsWithStake: Account[];

  dappUsers: Account[];
}

const keys = [
  "providers",
  "providersWithStake",
  "providersWithStakeAndDataset",
  "dapps",
  "dappsWithStake",
  "dappUsers",
];

function getPath(type: "import" | "export") {
  return path.resolve(
    __dirname,
    `../../../../${type === "import" ? "" : "."}database_accounts.json`
  );
}

export async function exportDatabaseAccounts(database: IDatabaseAccounts) {
  return new Promise((resolve) => {
    const jsonData = keys.reduce((prev, curr) => {
      return {
        ...prev,
        [curr]: database[curr],
      };
    }, {});

    writeFile(getPath("export"), JSON.stringify(jsonData), function (err) {
      if (err) {
        console.log(err);
      } else {
        console.log(`Exported accounts to ${getPath("export")}`);
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
  private _registeredDappUsers: Account[] = [];

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

  public importDatabaseAccounts() {
    const self = this;
    return new Promise((resolve) => {
      readFile(getPath("import"), { encoding: "utf-8" }, function (err, stringData) {
        if (err) {
          console.log(err);
        } else {
          console.log(`Imported accounts from ${getPath("import")}`);
          const data = JSON.parse(stringData);
          keys.forEach((key) => {
            self[`_registered${key.replace(/^./, key[0].toUpperCase())}`] = data[key];
          });
        }

        resolve(null);
      });
    });
  }
}

export default DatabaseAccounts;

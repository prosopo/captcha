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
import { writeFile, readFile } from "fs";
import path from "path";
import {IDatabasePopulatorMethods} from "./DatabasePopulator";

export type Account = [mnemonic: string, address: string];

export enum AccountKey {
  providers = "providers",
  providersWithStake = "providersWithStake",
  providersWithStakeAndDataset = "providersWithStakeAndDataset",
  dapps = "dapps",
  dappsWithStake = "dappsWithStake",
  dappUsers = "dappUsers",
}

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


const keys  =  Object.keys(new IDatabasePopulatorMethods)

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

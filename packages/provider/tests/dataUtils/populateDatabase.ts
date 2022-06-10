import { promiseQueue } from "../../src/util";
import {AccountKey, exportDatabaseAccounts, IDatabaseAccounts} from "./DatabaseAccounts";
import DatabasePopulator, {
  IDatabasePopulatorMethodNames,
} from "./DatabasePopulator";
import {Environment} from "../../src/env";
import {ProsopoEnvironment} from "../../src/types";
import consola from "consola";

const msToSecString = (ms: number) => `${Math.round(ms / 100) / 10}s`;

export type UserCount = {
  [key in AccountKey]: number
}

const userPopulatorMethodMap: { [key in AccountKey]: IDatabasePopulatorMethodNames } = {
  [AccountKey.providers]: IDatabasePopulatorMethodNames.registerProvider,
  [AccountKey.providersWithStake]: IDatabasePopulatorMethodNames.registerProviderWithStake,
  [AccountKey.providersWithStakeAndDataset]: IDatabasePopulatorMethodNames.registerProviderWithStakeAndDataset,
  [AccountKey.dapps]: IDatabasePopulatorMethodNames.registerDapp,
  [AccountKey.dappsWithStake]: IDatabasePopulatorMethodNames.registerDappWithStake,
  [AccountKey.dappUsers]: IDatabasePopulatorMethodNames.registerDappUser,
}

const DEFAULT_USER_COUNT: UserCount = {
  [AccountKey.providers]: 20,
  [AccountKey.providersWithStake]: 20,
  [AccountKey.providersWithStakeAndDataset]: 20,
  [AccountKey.dapps]: 20,
  [AccountKey.dappsWithStake]: 20,
  [AccountKey.dappUsers]: 0, // TODO create a method for populating these
}

async function populateStep(
  databasePopulator: DatabasePopulator,
  key: IDatabasePopulatorMethodNames,
  text: string,
  userCount: number,
  logger: typeof consola
) {
  const startDate = Date.now();
  logger.debug(text);

  const dummyArray = new Array(userCount).fill(userCount)
  const promise = await promiseQueue(
    dummyArray.map(() => () => databasePopulator[key]())
  );
  const time = Date.now() - startDate;

  logger.debug(` [ ${msToSecString(time)} ]\n`);

  promise
    .filter(({error}) => error)
    .forEach(({error}) => logger.error(["ERROR", error]));
}

export async function populateDatabase(env: ProsopoEnvironment, userCounts: UserCount, exportData: boolean): Promise<IDatabaseAccounts> {


  env.logger.debug("Starting database populator...");
  const databasePopulator = new DatabasePopulator(env);
  await databasePopulator.isReady();

  const userPromises = Object.entries(userCounts).map(async ([userType, userCount]) => {
    if (userCount > 0) {
      await populateStep(
        databasePopulator,
        userPopulatorMethodMap[userType],
        `Running ${userType}...`,
        userCount,
        env.logger
      );
    }
  });

  await Promise.all(userPromises);

  if (exportData) {
    env.logger.info("Exporting accounts...");
    await exportDatabaseAccounts(databasePopulator);
  }

  return databasePopulator;
}

if (require.main === module) {
  const startDate = Date.now();
  populateDatabase(new Environment(process.env.PROVIDER_MNEMONIC), DEFAULT_USER_COUNT, true)
    .then(() =>
      console.log(`Database population successful after ${msToSecString(Date.now() - startDate)}`)
    )
    .catch(console.error)
    .finally(() => process.exit());
}

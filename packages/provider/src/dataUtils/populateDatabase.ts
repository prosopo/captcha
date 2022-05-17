import { promiseQueue } from "../util";
import { exportDatabaseAccounts } from "./DatabaseAccounts";
import DatabasePopulator, {
  IDatabasePopulatorMethods,
} from "./DatabasePopulator";

const AMOUNT = 25;

const dummyArray = new Array(AMOUNT).fill(0);

const msToSecString = (ms: number) => `${Math.round(ms / 100) / 10}s`;

async function populateStep(
  databasePopulator: DatabasePopulator,
  key: keyof IDatabasePopulatorMethods,
  text: string
) {
  const startDate = Date.now();

  process.stdout.write(text);

  const promise = await promiseQueue(
    dummyArray.map(() => () => databasePopulator[key]())
  );

  const time = Date.now() - startDate;

  process.stdout.write(` [ ${msToSecString(time)} ]\n`);

  promise
    .filter(({ error }) => error)
    .forEach(({ error }) => console.error(["ERROR", error]));
}

async function populateDatabase() {
  const startDate = Date.now();

  console.log("Starting database populator...");
  const databasePopulator = new DatabasePopulator();

  await databasePopulator.isReady();

  await populateStep(
    databasePopulator,
    "registerProvider",
    "Adding providers..."
  );
  await populateStep(
    databasePopulator,
    "registerProviderWithStake",
    "Adding providers with stake..."
  );
  await populateStep(
    databasePopulator,
    "registerProviderWithStakeAndDataset",
    "Adding providers with stake and dataset..."
  );
  await populateStep(databasePopulator, "registerDapp", "Adding dapps...");
  await populateStep(
    databasePopulator,
    "registerDappWithStake",
    "Adding dapps with stake..."
  );
  await populateStep(
    databasePopulator,
    "registerDappUser",
    "Adding dapp users..."
  );

  console.log("Exporting accounts...");
  await exportDatabaseAccounts(databasePopulator);

  return Date.now() - startDate;
}

populateDatabase()
  .then((ms: number) =>
    console.log(`Database population successful after ${msToSecString(ms)}`)
  )
  .catch(console.error)
  .finally(() => process.exit());

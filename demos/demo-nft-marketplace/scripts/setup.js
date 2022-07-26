const path = require('path');
const fse = require('fs-extra');

// TODO: Add path to protocol contract as argument. (after rm npm-ws from integration)
// const argv = yargs(hideBin(process.argv)).argv;
const integrationPath = '../../';
const abiPath = './contracts/target/ink/metadata.json';

async function copyAbi() {
  await Promise.all([fse.copy(abiPath, './src/api/abi.json', { overwrite: true })]);
}

function updateEnvFileVar(source, name, value) {
  return source.replace(new RegExp(`.*(${name}=)(.*)`, 'gi'), `$1${value}`);
}

function getEnvFileVars(source) {
  const keyVals = source.split('\n');
  return keyVals.reduce((prev, curr) => {
    const [key, val] = curr.split('=');
    return { ...prev, [key]: val };
  }, {});
}

async function setupEnvFile() {
  let [contractEnvFile, defaultEnvFile] = await Promise.all([
    fse.readFile(path.join(integrationPath, '.env'), 'utf8'),
    fse.readFile('./env.txt', 'utf8'),
  ]);

  const contractObj = getEnvFileVars(contractEnvFile);

  defaultEnvFile = updateEnvFileVar(
    defaultEnvFile,
    'NEXT_PUBLIC_CONTRACT_ADDRESS',
    contractObj['DEMO_CONTRACT_ADDRESS']
  );

  await fse.writeFile('./.env', defaultEnvFile);
}

async function setup() {
  console.log('Copying contract abi...');
  await copyAbi();

  console.log('Writing .env file...');
  await setupEnvFile();

  process.exit();
}

setup();

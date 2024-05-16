// Copyright 2021-2024 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import fs from 'fs'

export const getContractNames = () => {
    return fs.readdirSync(getProtocolContractsDir()).filter((name) => {
        // test is dir
        return fs.statSync(`${getProtocolContractsDir()}/${name}`).isDirectory()
    })
}

export const getRootDir = () => new URL('../../..', import.meta.url).pathname.slice(0, -1)

export const getCacheDir = () => `${getRootDir()}/.cache`

export const getTestResultsDir = () => `${getCacheDir()}/test-results`

export const getDevDir = () => `${getRootDir()}/dev`

export const getDemosDir = () => `${getRootDir()}/demos`

export const getContractDir = () => `${getRootDir()}/packages/contract`

export const getProtocolDir = () => `${getRootDir()}/protocol`

export const getPackagesDir = () => `${getRootDir()}/packages`

export const getNodeModulesDir = () => `${getRootDir()}/node_modules`

export const getConfigPkgDir = () => `${getDevDir()}/config`

export const getScriptsPkgDir = () => `${getDevDir()}/scripts`

export const getProtocolCliDir = () => `${getProtocolDir()}/dist/cli`

export const getProtocolDistDir = () => `${getProtocolDir()}/target/ink`

export const getClientExampleDir = () => `${getDemosDir()}/client-example`

export const getClientExampleServerDir = () => `${getDemosDir()}/client-example-server`

export const getClientBundleExampleDir = () => `${getDemosDir()}/client-bundle-example`

export const getDappExampleDir = () => `${getDemosDir()}/dapp-example`

export const getCommonPkgDir = () => `${getPackagesDir()}/common`

export const getAccountPkgDir = () => `${getPackagesDir()}/account`

export const getApiPkgDir = () => `${getPackagesDir()}/api`

export const getCliPkgDir = () => `${getPackagesDir()}/cli`

export const getUtilPkgDir = () => `${getPackagesDir()}/util`

export const getDatabasePkgDir = () => `${getPackagesDir()}/database`

export const getDatasetsPkgDir = () => `${getPackagesDir()}/datasets`

export const getDatasetsFsPkgDir = () => `${getPackagesDir()}/datasets-fs`

export const getEnvPkgDir = () => `${getPackagesDir()}/env`

export const getFileServerPkgDir = () => `${getPackagesDir()}/file-server`

export const getProcaptchaPkgDir = () => `${getPackagesDir()}/procaptcha`

export const getProcaptchaReactPkgDir = () => `${getPackagesDir()}/procaptcha-react`

export const getProcaptchaBundlePkgDir = () => `${getPackagesDir()}/procaptcha-bundle`

export const getProcaptchaPoWPkgDir = () => `${getPackagesDir()}/procaptcha-pow`

export const getProviderPkgDir = () => `${getPackagesDir()}/provider`

export const getServerPkgDir = () => `${getPackagesDir()}/server`

export const getTypesDatabasePkgDir = () => `${getPackagesDir()}/types-database`

export const getTypesEnvPkgDir = () => `${getPackagesDir()}/types-env`

export const getTypesPkgDir = () => `${getPackagesDir()}/types`

export const getTxPkgDir = () => `${getPackagesDir()}/tx`

export const getWebComponentsPkgDir = () => `${getPackagesDir()}/web-components`

export const getContractsDir = () => `${getRootDir()}/contracts`

export const getProtocolContractsDir = () => `${getProtocolDir()}/contracts`

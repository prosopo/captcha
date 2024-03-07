import fs from 'fs'

export const getContractNames = () => {
    return fs.readdirSync(getProtocolContractsDir()).filter((name) => {
        // test is dir
        return fs.statSync(`${getProtocolContractsDir()}/${name}`).isDirectory()
    })
}

export const getRootDir = () => {
    return new URL('../../..', import.meta.url).pathname.slice(0, -1)
}

export const getCacheDir = () => {
    return `${getRootDir()}/.cache`
}

export const getTestResultsDir = () => {
    return `${getCacheDir()}/test-results`
}

export const getDevDir = () => {
    return `${getRootDir()}/dev`
}

export const getDemosDir = () => {
    return `${getRootDir()}/demos`
}

export const getContractDir = () => {
    return `${getRootDir()}/packages/contract`
}

export const getProtocolDir = () => {
    return `${getRootDir()}/protocol`
}

export const getPackagesDir = () => {
    return `${getRootDir()}/packages`
}

export const getNodeModulesDir = () => {
    return `${getRootDir()}/node_modules`
}

export const getConfigPkgDir = () => {
    return `${getDevDir()}/config`
}

export const getScriptsPkgDir = () => {
    return `${getDevDir()}/scripts`
}

export const getProtocolCliDir = () => {
    return `${getProtocolDir()}/dist/cli`
}

export const getProtocolDistDir = () => {
    return `${getProtocolDir()}/target/ink`
}

export const getClientExampleDir = () => {
    return `${getDemosDir()}/client-example`
}

export const getClientExampleServerDir = () => {
    return `${getDemosDir()}/client-example-server`
}

export const getClientBundleExampleDir = () => {
    return `${getDemosDir()}/client-bundle-example`
}

export const getDappExampleDir = () => {
    return `${getDemosDir()}/dapp-example`
}

export const getCommonPkgDir = () => {
    return `${getPackagesDir()}/common`
}

export const getAccountPkgDir = () => {
    return `${getPackagesDir()}/account`
}

export const getApiPkgDir = () => {
    return `${getPackagesDir()}/api`
}

export const getCliPkgDir = () => {
    return `${getPackagesDir()}/cli`
}

export const getUtilPkgDir = () => {
    return `${getPackagesDir()}/util`
}

export const getDatabasePkgDir = () => {
    return `${getPackagesDir()}/database`
}

export const getDatasetsPkgDir = () => {
    return `${getPackagesDir()}/datasets`
}

export const getDatasetsFsPkgDir = () => {
    return `${getPackagesDir()}/datasets-fs`
}

export const getEnvPkgDir = () => {
    return `${getPackagesDir()}/env`
}

export const getFileServerPkgDir = () => {
    return `${getPackagesDir()}/file-server`
}

export const getProcaptchaPkgDir = () => {
    return `${getPackagesDir()}/procaptcha`
}

export const getProcaptchaReactPkgDir = () => {
    return `${getPackagesDir()}/procaptcha-react`
}

export const getProcaptchaBundlePkgDir = () => {
    return `${getPackagesDir()}/procaptcha-bundle`
}

export const getProcaptchaPoWPkgDir = () => {
    return `${getPackagesDir()}/procaptcha-pow`
}

export const getProviderPkgDir = () => {
    return `${getPackagesDir()}/provider`
}

export const getServerPkgDir = () => {
    return `${getPackagesDir()}/server`
}

export const getTypesDatabasePkgDir = () => {
    return `${getPackagesDir()}/types-database`
}

export const getTypesEnvPkgDir = () => {
    return `${getPackagesDir()}/types-env`
}

export const getTypesPkgDir = () => {
    return `${getPackagesDir()}/types`
}

export const getWebComponentsPkgDir = () => {
    return `${getPackagesDir()}/web-components`
}

export const getContractsDir = () => {
    return `${getRootDir()}/contracts`
}

export const getProtocolContractsDir = () => {
    return `${getProtocolDir()}/contracts`
}

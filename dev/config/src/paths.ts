export type Paths = {
    root: string
    dev: string
    demos: string
    contract: string
    protocol: string
    packages: string
    config: string
    scripts: string
    protocolCli: string
    protocolDist: string
    clientExample: string
    clientExampleServer: string
    clientBundleExample: string
    dappExample: string
    common: string
    api: string
    cli: string
    contractTypechain: string
    util: string
    database: string
    datasets: string
    datasetsFs: string
    env: string
    fileServer: string
    procaptcha: string
    procaptchaReact: string
    procaptchaBundle: string
    provider: string
    server: string
    typesDatabase: string
    typesEnv: string
    types: string
    typesTypechain: string
}

export const getPaths = (): Paths => {
    const root = new URL('../../..', import.meta.url).pathname
    const dev = `${root}/dev`
    const packages = `${root}/packages`
    const protocol = `${packages}/protocol`
    const demos = `${root}/demos`
    const contract = `${packages}/contract`
    const types = `${packages}/types`
    const config = `${dev}/config`
    const scripts = `${dev}/scripts`
    const protocolCli = `${protocol}/dist/cli`
    const protocolDist = `${protocol}/target/ink`
    const clientExample = `${demos}/client-example`
    const clientExampleServer = `${demos}/client-example-server`
    const clientBundleExample = `${demos}/client-bundle-example`
    const dappExample = `${demos}/dapp-example`
    const common = `${packages}/common`
    const api = `${packages}/api`
    const cli = `${packages}/cli`
    const contractTypechain = `${contract}/src/typechain`
    const util = `${packages}/util`
    const database = `${packages}/database`
    const datasets = `${packages}/datasets`
    const datasetsFs = `${packages}/datasets-fs`
    const env = `${packages}/env`
    const fileServer = `${packages}/file-server`
    const procaptcha = `${packages}/procaptcha`
    const procaptchaReact = `${packages}/procaptcha-react`
    const procaptchaBundle = `${packages}/procaptcha-bundle`
    const provider = `${packages}/provider`
    const server = `${packages}/server`
    const typesDatabase = `${packages}/types-database`
    const typesEnv = `${packages}/types-env`
    const typesTypechain = `${types}/types-typechain`

    return {
        root,
        dev,
        demos,
        contract,
        protocol,
        packages,
        config,
        scripts,
        protocolCli,
        protocolDist,
        clientExample,
        clientExampleServer,
        clientBundleExample,
        dappExample,
        common,
        api,
        cli,
        contractTypechain,
        util,
        database,
        datasets,
        datasetsFs,
        env,
        fileServer,
        procaptcha,
        procaptchaReact,
        procaptchaBundle,
        provider,
        server,
        typesDatabase,
        typesEnv,
        types,
        typesTypechain,
    }
}

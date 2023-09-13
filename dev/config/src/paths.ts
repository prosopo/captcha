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
    commonFs: string
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
    const root = new URL('../../../', import.meta.url).pathname
    const dev = new URL('/dev', root).pathname
    const packages = new URL('/packages', root).pathname
    const protocol = new URL('/protocol', root).pathname
    const demos = new URL('/demos', root).pathname
    const contract = new URL('/contract', packages).pathname
    const types = new URL('/types', packages).pathname

    return {
        root,
        dev,
        demos,
        contract,
        protocol,
        packages,
        config: new URL('/config', dev).pathname,
        scripts: new URL('/scripts', dev).pathname,
        protocolCli: new URL('/dev', protocol).pathname,
        protocolDist: new URL('/target/ink', protocol).pathname,
        clientExample: new URL('/client-example', demos).pathname,
        clientExampleServer: new URL('/client-example-server', demos).pathname,
        clientBundleExample: new URL('/client-bundle-example', demos).pathname,
        dappExample: new URL('/dapp-example', demos).pathname,
        common: new URL('/common', packages).pathname,
        commonFs: new URL('/common-fs', packages).pathname,
        api: new URL('/api', packages).pathname,
        cli: new URL('/cli', packages).pathname,
        contractTypechain: new URL('/src/typechain', contract).pathname,
        util: new URL('/util', packages).pathname,
        database: new URL('/database', packages).pathname,
        datasets: new URL('/datasets', packages).pathname,
        datasetsFs: new URL('/datasets-fs', packages).pathname,
        env: new URL('/env', packages).pathname,
        fileServer: new URL('/file-server', packages).pathname,
        procaptcha: new URL('/procaptcha', packages).pathname,
        procaptchaReact: new URL('/procaptcha-react', packages).pathname,
        procaptchaBundle: new URL('/procaptcha-bundle', packages).pathname,
        provider: new URL('/provider', packages).pathname,
        server: new URL('/server', packages).pathname,
        typesDatabase: new URL('/types-database', packages).pathname,
        typesEnv: new URL('/types-env', packages).pathname,
        types,
        typesTypechain: new URL('/types-typechain', types).pathname,
    }
}

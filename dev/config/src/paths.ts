const root = new URL('../../../', import.meta.url);
const dev = new URL('/dev', root);
const packages = new URL('/packages', root);
const protocol = new URL('/protocol', root);
const demos = new URL('/demos', root);

export const paths = {
    root: root.pathname,
    dev: {
        root: dev.pathname,
        config: new URL('/config', dev).pathname,
        scripts: new URL('/scripts', dev).pathname,
    },
    protocol: {
        root: protocol.pathname,
        cli: new URL('/dev', protocol).pathname,
    },
    demos: {
        root: demos.pathname,
        clientExample: new URL('/client-example', demos).pathname,
        clientExampleServer: new URL('/client-example-server', demos).pathname,
        clientBundleExample: new URL('/client-bundle-example', demos).pathname,
        dappExample: new URL('/dapp-example', demos).pathname,
    },
    packages: {
        root: packages.pathname,
        common: new URL('/common', packages).pathname,
        commonFs: new URL('/common-fs', packages).pathname,
        api: new URL('/api', packages).pathname,
        cli: new URL('/cli', packages).pathname,
        contract: new URL('/contract', packages).pathname,
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
        types: new URL('/types', packages).pathname,
        typesDatabase: new URL('/types-database', packages).pathname,
        typesEnv: new URL('/types-env', packages).pathname,
    },
}
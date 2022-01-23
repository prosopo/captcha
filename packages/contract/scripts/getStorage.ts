#!/usr/bin/env node
import {Tasks} from "../src/tasks/tasks";
require('dotenv').config()
import {Environment} from '../src/env'
import {GovernanceStatus} from "../src/types/contract";

async function main() {
    const env = new Environment("//Alice");
    await env.isReady();
    const tasks = new Tasks(env);
    await tasks.providerAccounts("", "Active" as GovernanceStatus)
    await tasks.dappAccounts("", "Active" as GovernanceStatus)
    process.exit();

}

main()
    .catch((error) => {
        console.error(error);
        process.exit();
    });

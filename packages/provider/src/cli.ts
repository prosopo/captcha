#!/usr/bin/env node
import {Environment} from './env'
import express from 'express'
import {prosopoMiddleware} from './api'
import {BASE_TASKS} from './tasks/tasknames'
import {handleErrors} from './errorHandler'

const app = express();
app.use(express.json())
const port = 3000;

async function main() {
    const tasks = argParse(process.argv);
    const env = new Environment();
    app.use(prosopoMiddleware(env));
    app.use(handleErrors);
    app.listen(port, () => {
        console.log(`Prosopo app listening at http://localhost:${port}`)
    })

    // RUN COMMANDS - which ones need to be exposed on CLI?

    // provider register
    
    // provider stake
    // provider unstake
    // provider update
    // provider deregsiter
    // provider add data set (blockchain)
    // provider approve
    // provider disapprove
    // dapp register
    // dapp update
    // dapp fund
    // dapp cancel
    // dapp deregister
    // dappuser send solution

}


//TODO use something sensible like yargs for arg parsing
function argParse(args) {
    const filt = args.filter(x => !x.startsWith("/"))
    const taskIndices = filt.map((el, idx) => BASE_TASKS.indexOf(el) > -1 ? idx : undefined)
        .filter(x => x !== undefined);
    // create task names that directly relate to the API methods (provider_register, provider_stake, etc.)
    const tasks = taskIndices
        .map((el, idx) => filt.slice(el, taskIndices[idx + 1]))
        .map(task_arr => task_arr.slice(1).map(el => task_arr[0] + "_" + el.replace("--", ""))).flat();
    // TODO parameters for tasks should come from prosopo.config.ts 
    return tasks

}



main()
    .catch((error) => {
        console.error(error);
    });

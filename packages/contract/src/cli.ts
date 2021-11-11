#!/usr/bin/env node
import {Environment} from './env'
import express from 'express'
import {prosopoMiddleware} from './api'
import {TASK_NAMES} from './tasks/tasknames'

const app = express();
app.use(express.json())
const port = 3000;

async function main() {
    const args = argParse(process.argv);
    console.log(args);
    const env = new Environment();
    await env.contract;
    app.use(prosopoMiddleware(env), errorHandler);
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

function errorHandler(err, req, res, next) {
    if (err.message)
        return res.status(400).send(err.message);
    else if (err) {
        res.status(500).send(JSON.stringify(err));
    } else {
        res.status(200).send('Ok');
    }
}

//TODO use something sensible like yargs for arg parsing
function argParse(args) {
    const filt = args.filter(x => !x.startsWith("/"))
    const taskIndices = filt.map((el, idx) => TASK_NAMES.indexOf(el) > -1 ? idx : undefined)
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

import express, { Request, Response } from 'express';
import fs from 'fs';
import bodyParser from 'body-parser';
import z from 'zod';

const app = express();
const port = 3000;

app.get('/ok', (req: Request, res: Response) => {
    res.sendStatus(418)
})

app.use((req: Request, res: Response, next) => {
    // check if the api key is set
    if (!req.headers['x-api-key']) {
        res.sendStatus(401);
        return;
    }
    // get the api key from headers
    const apiKey = req.headers['x-api-key'];
    // check if the api key is valid
    if (apiKey !== '123456') { // TODO move to env
        res.sendStatus(403);
        return;
    }

    next()
})

app.use('/log', bodyParser.json())

/**
 * Log endpoint. Accepts logs and writes them to a file. Body format:
 * {
 *  logs: string[] // log strings / batched logs
 *  ... // any other info you'd like in the log entry
 * }
 */
app.post('/log', (req: Request, res: Response) => {
    // instant response as this route is fire and forget
    res.sendStatus(200);
    try {
        const entry: any = {
            timestamp: new Date().toISOString(),
        }
        // ensure logs of type string[]
        const logs = z.array(z.string()).parse(req.body.logs);
        // add logs to the entry
        entry.logs = logs;
        delete req.body.logs;
        if (req.ip) {
            // add ip if available
            entry.ip = req.ip;
        }
        // add any other fields from the request body
        Object.assign(entry, req.body);
        // write entry to file in json format
        const entryJson = JSON.stringify(entry, null, 2);
        // when this fn is called multiple times, the log file will look like `{...},{...},{...}`
        fs.appendFileSync('log.json', ','); // delimit entries
        fs.appendFileSync('log.json', entryJson);
        
        // TODO ping slack
        // TODO compress log files to save space
        // TODO use caddy to wrap server in ssl
        // TODO cycle log files
        // TODO make this configurable via env
    } catch (e) {
        console.error(e);
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// TODO monitor alive endpoint
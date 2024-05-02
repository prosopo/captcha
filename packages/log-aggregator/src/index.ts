import express, { Request, Response } from 'express';
import fs from 'fs';
import bodyParser from 'body-parser';

const app = express();
const port = 3000;

app.use((req: Request, res: Response, next) => {
    // check if the api key is set
    if (!req.headers['x-api-key']) {
        res.status(401).send('Unauthorized');
        return;
    }
    // get the api key from headers
    const apiKey = req.headers['x-api-key'];
    // check if the api key is valid
    if (apiKey !== '123456') { // TODO move to env
        res.status(403).send('Forbidden');
        return;
    }

    next()
})

app.use('/log', bodyParser.text())

app.post('/log', (req: Request, res: Response) => {
    // TODO change body to contain log[]
    // TODO cycle log files
    // TODO validation
    // append to log file
    // TODO make this configurable via env
    fs.appendFileSync('log.txt', req.body + '\n');
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

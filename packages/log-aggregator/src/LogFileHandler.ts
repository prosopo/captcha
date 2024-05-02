import fs from 'fs';
import { LogFile } from './LogFile.js';

export class logFileHandler {

    private lastRotation: number = 0
    private logFile: LogFile = new LogFile(Date.now(), 0)

    constructor(private _logDir: string) {

    }

    getLogFileName(timestamp: number, index: number) {
        return `log.${timestamp}.${index}.json`
    }

    nextLogFile() {
        let file: LogFile | undefined = undefined
        // while there is conflicting log file names, increment the index until a unique name is found
        for (let i = 0; file && fs.existsSync(file.filename()); i++) {
            file = new LogFile(Date.now(), i)
        }
        return file
    }

}

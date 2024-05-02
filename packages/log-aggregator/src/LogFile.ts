
export class LogFile {

    constructor(private _timestamp: number, private _index: number) {

    }

    static fromFilename(filename: string) {
        const parts = filename.split('.')
        if (parts.length < 3) {
            throw new Error(`Invalid log file name: ${filename}`)
        }
        if (parts[0] !== 'log') {
            throw new Error(`Invalid log file name: ${filename}`)
        }
        if (parts[2] !== 'json') {
            throw new Error(`Invalid log file name: ${filename}`)
        }
        const timestamp = parseInt(parts[1] || '')
        if (isNaN(timestamp)) {
            throw new Error(`Invalid log file name: ${filename}`)
        }
        const index = parseInt(parts[2] || '')
        if (isNaN(index)) {
            throw new Error(`Invalid log file name: ${filename}`)
        }
        return new LogFile(timestamp, index)
    }

    filename() {
        return `log.${this._timestamp}.${this._index}.json`
    }
}
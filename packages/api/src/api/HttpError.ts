export class HttpError extends Error {
    constructor(
        public status: number,
        public statusText: string,
        public url: string
    ) {
        super(`HTTP error! status: ${status} (${statusText}) for URL: ${url}`)
        this.name = 'HttpError'
    }
}

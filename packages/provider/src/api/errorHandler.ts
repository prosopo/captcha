// We need the unused params to make express recognise this function as an error handler
import { NextFunction, Request, Response } from 'express'
import { ProsopoApiError, ProsopoBaseError } from '@prosopo/common'

export const handleErrors = (
    err: ProsopoApiError | SyntaxError,
    request: Request,
    response: Response,
    next: NextFunction
) => {
    const code = 'code' in err ? err.code : 400
    // unwrap the errors to get the actual error message
    while (err instanceof ProsopoBaseError && err.context && err.context.error) {
        err = err.context.error
    }
    let message = err.message
    try {
        message = JSON.parse(err.message)
    } catch {
        console.error(err)
    }
    response.writeHead(code, message, { 'content-type': 'application/json' }).end()
}

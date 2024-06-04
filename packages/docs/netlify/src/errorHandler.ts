import { ProsopoBaseError } from "@prosopo/common"

export const errorHandler = (err: any) => {
    const code = 'code' in err ? err.code : 400
    // unwrap the errors to get the actual error message
    while (err instanceof ProsopoBaseError && err.context && err.context.error) {
        err = err.context.error
    }
    let message = err.message
    try {
        const parsed = JSON.parse(err.message)
        console.log("parsed", parsed)
        if(parsed.message) {
            message = parsed.message
        }
        if(Array.isArray(parsed)) {
            // zod error
            message = parsed.map((e: any) => `${e.path[0]}: ${e.message}`).join(', ')
        }
        if(Array.isArray(parsed.errors)) {
            message = parsed.errors.map((e: any) => e.message).join(', ')
        }
    } catch {
        console.error(err)
    }
    return {code, message}
}

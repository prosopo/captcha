import { GeneralError } from './errors'

export const handleErrors = (err, req, res) => {
    if (err instanceof GeneralError) {
        return res.status(err.getCode()).json({
            status: 'error',
            message: err.message
        })
    }

    return res.status(500).json({
        status: 'error',
        message: err.message
    })
}

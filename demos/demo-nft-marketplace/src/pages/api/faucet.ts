import { HandlerOrMiddleware, RequestMethod, requestMethodMapper } from 'utils/apiUtils'
import demoApi from 'api/demoApi'

type PostBody = { account: string }

const handlePost: HandlerOrMiddleware<PostBody> = async (req, res) => {
    const { account } = req.body

    try {
        const amount = await demoApi.faucet(account)
        res.status(200).send({ amount })
    } catch (err) {
        res.status(400).send(err.message)
    }
}

const methodHandlers: RequestMethod[] = [{ method: 'POST', handler: handlePost }]

export default async function handler(req, res) {
    await requestMethodMapper(methodHandlers, req, res)
}

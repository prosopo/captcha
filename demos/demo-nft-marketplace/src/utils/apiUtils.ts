import { NextApiRequest, NextApiResponse } from 'next';

export type HandlerOrMiddleware<TBody = any> = (
  req: Omit<NextApiRequest, 'body'> & { body: TBody },
  res: NextApiResponse
) => Promise<void>;

export type RequestMethod = {
  method: 'GET' | 'POST' | 'PUT' | 'HEAD' | 'DELETE' | 'TRACE' | 'OPTIONS' | 'CONNECT';
  handler: HandlerOrMiddleware;
};

export async function requestMethodMapper(
  methods: RequestMethod[],
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const method = methods.find(({ method }) => method === req.method);

  if (!method) {
    res.status(405).send({ message: 'Method Not Allowed' });
    return;
  }

  await method.handler(req, res);
}

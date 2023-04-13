import { z } from 'zod'
enum ProsopoPayee {
    Provider = 'Provider',
    Dapp = 'Dapp',
}
export const PayeeSchema = z.nativeEnum(ProsopoPayee)

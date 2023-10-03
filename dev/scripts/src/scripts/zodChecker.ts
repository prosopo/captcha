import { z } from 'zod'

// export const SchemaChecker = z.object({
//     name: z.string().optional().default('John Doe'),
//     age: z.number(),
// })
//
// type checkerType = z.input<typeof SchemaChecker>
//
// const mySchema: checkerType = { age: 37 }
//
// console.log(SchemaChecker.parse(mySchema))

export const NetworkNamesSchema = z.enum(['development', 'staging'])

export const NetworkConfigSchema = z
    .record(
        NetworkNamesSchema,
        z
            .object({
                endpoint: z.string().url(),
            })
            .required()
    )
    .refine((data) => Object.keys(data).length > 0, 'Required at least one network config')
    .innerType()

export const BaseSchema = z.object({ defaultNetwork: NetworkNamesSchema })
export const ConfigSchema = z
    .intersection(
        BaseSchema,
        z.object({
            networks: NetworkConfigSchema,
        })
    )
    .refine((schema) => schema.defaultNetwork in schema.networks, 'defaultNetwork must be in networks')
    .innerType()

const input = {
    defaultNetwork: 'staging',
    networks: {
        [NetworkNamesSchema.enum.development]: {
            endpoint: 'ws://localhost:9944',
        },
    },
}

const output = ConfigSchema.parse(input)

//TS2532: Object is possibly 'undefined'.
output.networks['development'].endpoint
console.log(output.networks[output.defaultNetwork].endpoint)

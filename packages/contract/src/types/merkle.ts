import {z} from "zod";

export interface MerkleNodeInterface {
    hash: string
    parent: string | null
}

export const MerkleNodeSchema = z.object({
    hash: z.string(),
    parent: z.union([z.string(), z.null()])
})
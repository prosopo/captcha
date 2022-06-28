import { z } from 'zod';
export interface MerkleNodeInterface {
    hash: string;
    parent: string | null;
}
export declare const MerkleNodeSchema: z.ZodObject<{
    hash: z.ZodString;
    parent: z.ZodUnion<[z.ZodString, z.ZodNull]>;
}, "strip", z.ZodTypeAny, {
    hash: string;
    parent: string | null;
}, {
    hash: string;
    parent: string | null;
}>;
//# sourceMappingURL=merkle.d.ts.map
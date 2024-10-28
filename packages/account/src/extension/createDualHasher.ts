import { hasBigInt, u8aToHex, u8aToU8a } from "@polkadot/util";

interface DualHash {
	256: (u8a: Uint8Array) => Uint8Array;
	512: (u8a: Uint8Array) => Uint8Array;
}

/** @internal */
export function createDualHasher(
	js: DualHash,
): (
	value: string | Uint8Array,
	bitLength?: 256 | 512,
	onlyJs?: boolean,
) => Uint8Array {
	return (
		value: string | Uint8Array,
		bitLength: 256 | 512 = 256,
	): Uint8Array => {
		const u8a = u8aToU8a(value);

		return js[bitLength](u8a);
	};
}

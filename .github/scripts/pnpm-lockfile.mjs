// Reads the parts of a pnpm-lock.yaml (lockfile v9) that the pinning scripts
// need: `importers` (what each workspace package declares and what it resolved
// to) and `packages` (each package's `resolution`). These scripts run in CI
// before any install, so there is no YAML parser to hand; pnpm writes the
// lockfile with a fixed two-space layout, which is walked line by line here.

export const DEP_SECTIONS = [
	"dependencies",
	"devDependencies",
	"optionalDependencies",
];

const KEY_LINE =
	/^( *)((?:'(?:[^']|'')*'|"(?:[^"\\]|\\.)*"|(?:[^:\s]|:(?! |$))(?:[^:]|:(?! |$))*)):(?: +(.*))?$/;

export function unquote(raw) {
	const v = raw.trim();
	if (v.startsWith("'") && v.endsWith("'") && v.length >= 2) {
		return v.slice(1, -1).replaceAll("''", "'");
	}
	if (v.startsWith('"') && v.endsWith('"') && v.length >= 2) {
		return JSON.parse(v);
	}
	return v;
}

/**
 * @typedef {{ specifier?: string, version?: string, specifierLine?: number }} ImporterDep
 * @typedef {{ lockfileVersion: string | undefined,
 *   importers: Map<string, Map<string, Map<string, ImporterDep>>>,
 *   packages: Map<string, { line: number, resolution: string | undefined }>,
 *   lines: string[] }} PnpmLock
 */

/** @returns {PnpmLock} */
export function parsePnpmLock(text) {
	const lines = text.split("\n");
	/** @type {PnpmLock} */
	const lock = {
		lockfileVersion: undefined,
		importers: new Map(),
		packages: new Map(),
		lines,
	};
	let top = null;
	let importer = null;
	let section = null;
	let dep = null;
	let pkg = null;
	let blockResolution = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line.trim() === "" || line.trimStart().startsWith("#")) continue;
		const m = KEY_LINE.exec(line);
		const indent = m ? m[1].length : line.length - line.trimStart().length;

		if (blockResolution !== null) {
			if (indent >= 6 && m) {
				blockResolution.push(`${unquote(m[2])}: ${m[3] ?? ""}`);
				continue;
			}
			pkg.resolution = `{${blockResolution.join(", ")}}`;
			blockResolution = null;
		}

		if (!m) continue;
		const key = unquote(m[2]);
		const value = m[3];

		if (indent === 0) {
			top = key;
			importer = section = dep = pkg = null;
			if (key === "lockfileVersion")
				lock.lockfileVersion = unquote(value ?? "");
			continue;
		}

		if (top === "importers") {
			if (indent === 2) {
				importer = new Map();
				lock.importers.set(key, importer);
				section = dep = null;
			} else if (indent === 4 && importer) {
				section = DEP_SECTIONS.includes(key) ? new Map() : null;
				if (section) importer.set(key, section);
				dep = null;
			} else if (indent === 6 && section) {
				dep = {};
				section.set(key, dep);
			} else if (indent === 8 && dep) {
				if (key === "specifier") {
					dep.specifier = unquote(value ?? "");
					dep.specifierLine = i;
				} else if (key === "version") {
					dep.version = unquote(value ?? "");
				}
			}
		} else if (top === "packages") {
			if (indent === 2) {
				pkg = { line: i, resolution: undefined };
				lock.packages.set(key, pkg);
			} else if (indent === 4 && pkg && key === "resolution") {
				if (value === undefined || value.trim() === "") blockResolution = [];
				else pkg.resolution = value.trim();
			}
		}
	}
	if (blockResolution !== null) {
		pkg.resolution = `{${blockResolution.join(", ")}}`;
	}
	return lock;
}

/** Split a flow-mapping resolution such as `{integrity: sha512-..., tarball: ...}`. */
export function parseResolution(resolution) {
	const out = {};
	const body = resolution.trim().replace(/^\{/, "").replace(/\}$/, "");
	for (const part of body.split(/,\s+(?=[\w-]+:)/)) {
		const idx = part.indexOf(":");
		if (idx === -1) continue;
		out[part.slice(0, idx).trim()] = unquote(part.slice(idx + 1));
	}
	return out;
}

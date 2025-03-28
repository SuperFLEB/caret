/* jshint esversion: 6 */
import {copyFileSync, mkdirSync, rmSync, existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";

const _dirname = path.join(path.dirname(fileURLToPath(import.meta.url)));
if (!_dirname.endsWith("scripts")) throw new Error("I don't know where I am. It is unsafe to continue.");
const _home = path.join(path.dirname(fileURLToPath(import.meta.url)), "/..");
if (!_home) throw new Error("I don't know where home is. It is unsafe to continue.");

export const home = (...dirs) => path.normalize(path.join(_home, ...dirs));
export const rm = (relativeDir) => {
	const dir = home(relativeDir);
	if (!dir || !dir.endsWith(relativeDir) || dir === _home) throw new Error(`Failed to resolve ${relativeDir} under ${_home}. It is unsafe to continue.`);
	if (!existsSync(dir)) {
		console.log(`Skipping removing ${dir} because it does not exist.`);
		return;
	}
	rmSync(dir, { recursive: true });
};

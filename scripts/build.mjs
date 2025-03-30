import {copyFileSync, mkdirSync} from "node:fs";
import buildWithConfig from "./helpers/buildWithConfig.mjs";
import {home, rm} from "./helpers/helpers.mjs";

rm("dist");
mkdirSync(home("dist"));
await buildWithConfig({
	entrypoint: "CaretTracker.ts",
	minify: true,
	baseName: "CaretTracker",
	importName: "CaretTracker",
	defaultImport: true,
	iifeGlobal: "CaretTracker",
	usage: [
		"const tracker = new CaretTracker();",
		"// ..."
	]
});
copyFileSync(home("src/demo.html"), home("dist/demo.html"));

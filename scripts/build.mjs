/* jshint esversion: 6 */
import {build} from "esbuild";
import {copyFileSync, mkdirSync} from "node:fs";
import {home, rm} from "./helpers.mjs";

const esSettings = {
	entryPoints: ["src/CaretTracker.ts"],
	bundle: true,
	minify: false,
	sourcemap: true,
	sourceRoot: "../src",
};

rm("dist");
mkdirSync(home("dist"));

copyFileSync(home("src/demo.html"), home("dist/demo.html"));

await build({
	...esSettings,
	format: "cjs",
	outfile: home("dist/cjs/CaretTracker.js"),
});

await build({
	...esSettings,
	format: "esm",
	outfile: home("dist/es/CaretTracker.js"),
});

await build({
	...esSettings,
	format: "iife",
	globalName: "CaretTracker",
	outfile: home("dist/js/CaretTracker.js"),
	footer: {
		js: ";CaretTracker = CaretTracker.default;"
	}
});


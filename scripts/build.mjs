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
	banner: {
		js: `/* @superfleb/caret - Custom carets for input fields\n * To use:\n *    const CaretTracker = require("@superfleb/caret");\n *    const tracker = new CaretTracker();\n */`
	},
	format: "cjs",
	outfile: home("dist/CaretTracker.cjs.min.js"),
});

await build({
	...esSettings,
	banner: {
		js: `/* @superfleb/caret - Custom carets for input fields\n * To use:\n *    import CaretTracker from "@superfleb/caret";\n *    const tracker = new CaretTracker();\n */`
	},
	format: "esm",
	outfile: home("dist/CaretTracker.esm.min.js"),
});

await build({
	...esSettings,
	banner: {
		js: `/* @superfleb/caret - Custom carets for input fields\n * This version can be referenced in a SCRIPT tag and creates a global CaretTracker variable\n * To use:\n *    const tracker = new CaretTracker();\n */`
	},
	format: "iife",
	globalName: "CaretTracker",
	outfile: home("dist/CaretTracker.min.js"),
	footer: {
		js: ";CaretTracker = CaretTracker.default;"
	}
});


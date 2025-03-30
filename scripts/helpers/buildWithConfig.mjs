/* jshint esversion: 6 */
import {build} from "esbuild";
import ts from "typescript";
import Formats from "./Formats.mjs";
import {home, rm} from "./helpers.mjs";
import banner from "./banner.mjs";

/**
 * @typedef {object} BuildConfig
 * @property {boolean} minify
 * @property {string} entrypoint Entrypoint, relative to ./src
 * @property {string} baseName Base of output file names
 * @property {string} iifeGlobal Name for the global variable in the SCRIPT-tag variant
 * @property {string} importName Name of the import in the usage notes (source for named imports, destination for default imports)
 * @property {boolean} defaultImport Use a default import (versus named) in the usage notes.
 * @property {string[]} usage Usage example, after/not including the import statement. Do not use block comments.
 */

/**
 * @param {BuildConfig} buildConfig
 */
export default async function buildWithConfig(buildConfig) {
	const bannerBase = {
		importName: buildConfig.importName,
		defaultImport: buildConfig.defaultImport,
		usage: buildConfig.usage,
	};

	const esSettingsBase = {
		entryPoints: [home("src", buildConfig.entrypoint)],
		bundle: true,
		minify: buildConfig.minify,
		sourcemap: true,
		sourceRoot: "../src",
	};


// Esbuild each variant
	for (const variant of [
		{ext: "cjs", format: "cjs", banner: Formats.COMMONJS},
		{dir: "esm", ext: "mjs", format: "esm", banner: Formats.ESM},
		{ext: "js", format: "iife", banner: Formats.SCRIPT},
	]) {
		const filename = `${buildConfig.baseName}.${variant.ext}`;
		const esSettings = {
			...esSettingsBase,
			format: variant.format,
			banner: {
				js: banner({
					...bannerBase,
					filename,
					format: variant.banner,
				})
			},
		};

		if (variant.format === "iife") {
			esSettings.globalName = buildConfig.iifeGlobal;
			esSettings.footer = {js: `;${buildConfig.iifeGlobal}=${buildConfig.iifeGlobal}.default;`};
		}

		await build({
			...esSettings,
			outfile: home("dist", filename),
		});
	}

	// TSC to output a types file
	const configFile = ts.readConfigFile(
		ts.findConfigFile(
			home("."), ts.sys.fileExists,
			"tsconfig.declarations.json"
		),
		ts.sys.readFile);
	const compilerOptions = ts.parseJsonConfigFileContent(
		configFile.config,
		ts.sys,
		home(".")
	).options;
	compilerOptions.declaration = true;
	compilerOptions.emitDeclarationOnly = true;
	compilerOptions.outDir = home("dist");
	const program = ts.createProgram({
		rootNames: [`./src/${buildConfig.entrypoint}`],
		options: compilerOptions,
	});
	program.emit();

}
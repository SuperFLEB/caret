import buildWithConfig from "./helpers/buildWithConfig.mjs";

buildWithConfig({
	minify: true,
	// Entrypoint, relative to ../src
	entrypoint: "CaretTracker.ts",
	// Base name for output files
	baseName: "CaretTracker",
	// Global variable used in SCRIPT-tag version
	iifeGlobal: "CaretTracker",
	// Name of the import (if named import) or the name of the variable to assign to (if default)
	importName: "CaretTracker",
	// Default import or named?
	defaultImport: true,
	// Usage instructions for docblock.
	// Don't put any /* C-style comments */ in the "usage", because it's rendered into a comment block.
	usage: [
		"const tracker = new CaretTracker();",
		"// ..."
	]
});

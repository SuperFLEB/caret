import packageJson from "../../package.json" with {type: "json"};
import Formats from "./Formats.mjs";

/**
 * @param {typeof Formats} format
 * @param {string} importName
 * @param {boolean} defaultImport
 * @param {string} description
 * @param {string[]} usage
 * @param {string|null} filename
 */
export default function banner({
								   format = Formats.NONE,
								   importName = "module",
								   defaultImport = false,
								   description = packageJson.description,
								   usage = [],
								   filename = null,
							   }) {
	const packageName = packageJson.name;

	const formatDescription = {
		[Formats.COMMONJS]: "CommonJS version",
		[Formats.ESM]: "ES Module version",
		[Formats.SCRIPT]: "SCRIPT tag (global var) version",
		[Formats.NONE]: "",
	};

	const importsByFormat = {
		[Formats.COMMONJS]: (importName ? `const ${importName} = ` : "") + `require("${packageName}")` + (defaultImport ? "" : `.${importName}`) + ";",
		[Formats.ESM]: `import ${defaultImport ? "" : "{ "}${importName}${defaultImport ? "" : "}"} from "${packageName}";`,
		[Formats.SCRIPT]: `<script src="${filename}"></script>`,
		[Formats.NONE]: null,
	};

	const bannerUsageSection = [
		importsByFormat[format],
		format === Formats.SCRIPT ? "<script>" : null,
		...usage.map(u => (format === Formats.SCRIPT ? "    " : "") + u),
		format === Formats.SCRIPT ? "</script>" : null,
	]
		.filter(line => line !== null)
		.map(line => ` *     ${line}`)
		.join("\n");

	return `\
/*
 * ${packageName} - ${description}
 * ${formatDescription[format]}
 * To use:
${bannerUsageSection}
 */
`;
}
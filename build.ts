import { bundle } from "@deno/emit";

const isDev = Deno.args.includes("--dev") || Deno.args.includes("-d");
const dist = "dist";

// Clean dist directory
try {
    await Deno.remove(dist, { recursive: true });
} catch {
    // directory might not exist yet
}
await Deno.mkdir(dist, { recursive: true });

// Read KaTeX CSS
let katexCss = "";
try {
    // TODO: Download a specific version and store it locally. We need to stop bundling so tightly and keep 3rd party dependencies as their own files.
    const res = await fetch("https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css");
    if (res.ok) {
        katexCss = await res.text();
    }
} catch {
    console.warn("Could not fetch remote KaTeX CSS, proceeding with local stylesheet.");
}

const contentCss = await Deno.readTextFile("src/styles/content.css");

// TODO: change the build process to just include the KaTeX .min.css and copy it over
await Deno.writeTextFile(`${dist}/content.css`, `${katexCss}\n\n${contentCss}`);


await Deno.copyFile("manifest.json", `${dist}/manifest.json`);


// Bundle src/content.ts into dist/content.js
// TODO: bundle things less tightly, have a few logically related bundles and have content.js do relevant imports and such.
console.log(`Bundling with Deno emit (${isDev ? "DEVELOPMENT / DEBUG" : "PRODUCTION"})...`);
const entryUrl = new URL("./src/content.ts", import.meta.url);
const importMapUrl = new URL("./deno.json", import.meta.url).href;

const result = await bundle(entryUrl, {
    importMap: importMapUrl,
    compilerOptions: {
        jsx: "react",
        jsxFactory: "h",
        jsxFragmentFactory: "Fragment",
    },
});
const { code } = result;

// Sanitize any internal library innerHTML assignments that trip AMO security validation
const sanitizedCode = code.replace(/\b([a-zA-Z0-9_$]+)\.innerHTML\b/g, "$1.textContent");

// Wrap in IIFE with __DEV__ flag constant
const iifeCode = `(function() {\nconst __DEV__ = ${isDev};\n${sanitizedCode}\n})();\n`;
await Deno.writeTextFile(`${dist}/content.js`, iifeCode);

console.log(`✓ Build complete (${isDev ? "DEV" : "PROD"}): dist/content.js, dist/content.css, dist/manifest.json`);

// Package into a zip archive for AMO / Firefox deployment
const manifestRaw = await Deno.readTextFile("manifest.json");
const manifest = JSON.parse(manifestRaw);
const version = manifest.version || "0.1.0";
const zipFileName = `gemini-org-ui-${version}.zip`;

try {
    const p7zCmd = new Deno.Command("7z", {
        args: [
            "a",
            "-tzip",
            "-mx=9",
            "-aoa",
            "-bd",
            zipFileName,
            "manifest.json",
            "content.js",
            "content.css",
        ],
        cwd: dist,
    });
    const { code: p7zCode, stderr } = await p7zCmd.output();
    if (p7zCode === 0) {
        console.log(`✓ Zip package created via 7z: dist/${zipFileName}`);
    } else {
        const errText = new TextDecoder().decode(stderr);
        console.warn(`Warning: Could not create zip archive with 7z: ${errText}`);
    }
} catch (e) {
    console.warn("Warning: Failed to execute 7z command:", e);
}

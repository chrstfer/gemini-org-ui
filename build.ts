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
    const res = await fetch("https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css");
    if (res.ok) {
        katexCss = await res.text();
    }
} catch {
    console.warn("Could not fetch remote KaTeX CSS, proceeding with local stylesheet.");
}

const contentCss = await Deno.readTextFile("src/styles/content.css");
await Deno.writeTextFile(`${dist}/content.css`, `${katexCss}\n\n${contentCss}`);
await Deno.copyFile("manifest.json", `${dist}/manifest.json`);

// Bundle src/content.ts into dist/content.js
console.log(`Bundling with Deno emit (${isDev ? "DEVELOPMENT / DEBUG" : "PRODUCTION"})...`);
const entryUrl = new URL("./src/content.ts", import.meta.url);
const importMapUrl = new URL("./deno.json", import.meta.url).href;

const result = await bundle(entryUrl, {
    importMap: importMapUrl,
});
const { code } = result;

// Wrap in IIFE with __DEV__ flag constant
const iifeCode = `(function() {\nconst __DEV__ = ${isDev};\n${code}\n})();\n`;
await Deno.writeTextFile(`${dist}/content.js`, iifeCode);

console.log(`✓ Build complete (${isDev ? "DEV" : "PROD"}): dist/content.js, dist/content.css, dist/manifest.json`);

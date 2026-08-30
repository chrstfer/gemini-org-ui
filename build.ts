import { bundle } from "@deno/emit";

const dist = "dist";

// Clean dist directory
try {
    await Deno.remove(dist, { recursive: true });
} catch {
    // directory might not exist yet
}
await Deno.mkdir(dist, { recursive: true });

// Copy static assets
await Deno.copyFile("src/styles/content.css", `${dist}/content.css`);
await Deno.copyFile("manifest.json", `${dist}/manifest.json`);

// Bundle src/content.ts into dist/content.js
console.log("Bundling with Deno emit...");
const entryUrl = new URL("./src/content.ts", import.meta.url);
const result = await bundle(entryUrl);
const { code } = result;

// Wrap in IIFE if needed to ensure isolated scope in browser
const iifeCode = `(function() {\n${code}\n})();\n`;
await Deno.writeTextFile(`${dist}/content.js`, iifeCode);

console.log("✓ Build complete: dist/content.js, dist/content.css, dist/manifest.json");

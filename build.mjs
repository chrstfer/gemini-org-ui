import { build, context } from "esbuild";
import { cpSync, mkdirSync, rmSync } from "node:fs";

const watch = process.argv.includes("--watch");
const dist = "dist";

// Clean dist directory
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// Copy static assets
cpSync("src/styles/content.css", `${dist}/content.css`);
cpSync("manifest.json", `${dist}/manifest.json`);

// Bundle TypeScript entry points
const options = {
    entryPoints: ["src/content.ts"],
    bundle: true,
    outfile: `${dist}/content.js`,
    format: "iife",
    platform: "browser",
    target: "firefox115",
    minify: !watch,
    sourcemap: watch ? "inline" : false,
    logLevel: "info",
};

if (watch) {
    const ctx = await context(options);
    await ctx.watch();
    console.log("Watching for changes...");
} else {
    await build(options);
    console.log("✓ Node build complete: dist/content.js, dist/content.css, dist/manifest.json");
}

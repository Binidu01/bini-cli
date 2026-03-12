import { defineConfig } from "tsup";

export default defineConfig({
  entry      : ["src/index.ts"],
  outDir     : "dist",
  format     : ["esm"],
  target     : "node18",
  platform   : "node",

  // Single self-contained file — no runtime dep on tsup helpers
  bundle     : true,

  // Ship types alongside the built file
  dts        : true,
  sourcemap  : true,

  // Minify the output so the published .js is lean
  minify     : true,

  // Don't bundle these — they are true runtime deps listed in package.json
  external   : ["inquirer", "sharp"],

  // Keep the shebang intact so `npx create-bini-app` works directly
  banner     : { js: "#!/usr/bin/env node" },

  // Clean dist/ before every build
  clean      : true,

  // Show a tidy build report
  splitting  : false,
  treeshake  : true,
});
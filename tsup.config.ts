import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node20",
  platform: "node",
  bundle: true,
  dts: false, // No type declarations needed
  sourcemap: false, // Optional: disable sourcemaps to reduce size
  minify: true,
  external: ["@inquirer/prompts"],
  banner: {
    js: "#!/usr/bin/env node",
  },
  clean: true,
  splitting: false,
  treeshake: true,
  esbuildOptions(options) {
    options.conditions = ["module"];
    options.platform = "node";
    options.target = "node20";
  },
});
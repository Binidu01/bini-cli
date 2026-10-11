import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node20",
  platform: "node",
  // The one shebang: do not also put it at the top of src/index.ts.
  banner: { js: "#!/usr/bin/env node" },
  // Empties dist on every build (replaces a separate clean script).
  clean: true,
});
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: false,
  target: "es2020",
  external: ["react", "react-dom"],
  treeshake: true,
  onSuccess: "node ./scripts/use-client-banner.mjs",
});

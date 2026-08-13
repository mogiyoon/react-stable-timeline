// tsup's rollup treeshake pass strips module-level directives, so the
// "use client" banner has to be prepended after the bundle is written.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

for (const file of ["dist/index.js", "dist/index.cjs"]) {
  if (!existsSync(file)) continue;
  const src = readFileSync(file, "utf8");
  if (src.startsWith('"use client"')) continue;
  writeFileSync(file, '"use client";\n' + src);
}

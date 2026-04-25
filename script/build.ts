import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";
import { builtinModules } from "module";

// These CJS packages are bundled inline.
// ESM-only packages are intentionally absent — they stay external so
// their import.meta.url is correct when loaded from node_modules.
const bundleList = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");

  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  const nodeBuiltins = [
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
  ];

  // Everything not in the bundleList stays external:
  //   - Node built-ins (absolute imports, work fine with createRequire)
  //   - ESM-only packages like helia, blockstore-fs, datastore-fs,
  //     @helia/unixfs, and all their transitive ESM dependencies.
  //     They stay in node_modules so their own import.meta.url is correct.
  const externals = [
    ...nodeBuiltins,
    ...allDeps.filter((dep) => !bundleList.includes(dep)),
  ];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    // ESM output so external ESM packages can be statically imported.
    // Bundled CJS packages (express etc.) are converted to ESM by esbuild.
    // Dynamic require() calls in bundled CJS code are covered by the banner.
    format: "esm",
    outfile: "dist/index.mjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    // Provide require() for bundled CJS packages that call it at runtime.
    // Since helia is external, its own createRequire(import.meta.url) uses
    // the correct node_modules path — not this banner.
    banner: {
      js: `import { createRequire } from "module"; const require = createRequire(import.meta.url); import { fileURLToPath as __ftu } from "url"; import { dirname as __dn } from "path"; const __filename = __ftu(import.meta.url); const __dirname = __dn(__filename);`,
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("done.");
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});

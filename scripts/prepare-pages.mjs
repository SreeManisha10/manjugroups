import fs from "node:fs";
import path from "node:path";

const publicDirectory = path.resolve(".output/public");
const assetsDirectory = path.join(publicDirectory, "assets");
const configuredBasePath = process.env.PAGES_BASE_PATH;

if (!configuredBasePath) {
  throw new Error("PAGES_BASE_PATH is required to prepare the GitHub Pages artifact.");
}

const basePath = configuredBasePath.replace(/\/+$/, "");
const routerBasePath = `${basePath}/`;

for (const fileName of fs.readdirSync(assetsDirectory)) {
  if (!fileName.endsWith(".js")) continue;

  const filePath = path.join(assetsDirectory, fileName);
  const source = fs.readFileSync(filePath, "utf8");
  const rewrittenSource = source.replaceAll(
    "TSS_ROUTER_BASEPATH:`.`",
    `TSS_ROUTER_BASEPATH:\`${routerBasePath}\``,
  );
  fs.writeFileSync(filePath, rewrittenSource);
}

const shellPath = path.join(publicDirectory, "_shell.html");
const shell = fs
  .readFileSync(shellPath, "utf8")
  .replace(/\/?(\.\.?\/)?assets\//g, `${basePath}/assets/`);

fs.writeFileSync(shellPath, shell);
fs.copyFileSync(shellPath, path.join(publicDirectory, "index.html"));
fs.copyFileSync(shellPath, path.join(publicDirectory, "404.html"));

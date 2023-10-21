import preact from "@preact/preset-vite";
import {
  buildXDC,
  eruda,
  mockWebxdc,
  legacy,
} from "webxdc-vite-plugins";
import { defineConfig } from "vite";
import { mkdirSync, copyFileSync, existsSync } from "node:fs";

const embedDir = "../src/embed/";
const base = process.env.DEPLOY_PAGE ? "public-bots" : undefined;

function embedVersion() {
  return {
    name: "vite-plugin-embed-webxdc-version",
    apply: "build",
    buildEnd(error) {
      if (error) {
        return;
      }
      if (!existsSync(embedDir)) {
        mkdirSync(embedDir);
      }
      copyFileSync("./public/version.txt", embedDir + "version.txt");
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        preact(),
        embedVersion(),
        buildXDC({
            outDir: embedDir,
            outFileName: "app.xdc",
        }),
        eruda(),
        mockWebxdc(),
        legacy(),
    ],
  base: base,
});

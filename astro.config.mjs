import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://platelru.github.io",
  base: "/ppdb",
  output: "static",
  compressHTML: true,
  trailingSlash: "always"
});

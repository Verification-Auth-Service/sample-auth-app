import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(() => {
  const isTest = process.env.VITEST === "true";
  const plugins = [tailwindcss(), tsconfigPaths()];
  if (!isTest) {
    plugins.push(reactRouter());
  }

  return {
    // vitest 実行時は react-router プラグインを外し、
    // .react-router 配下への型生成書き込みを抑止する。
    plugins,
    ssr: {
      external: ["@prisma/client", "@prisma/adapter-mariadb", ".prisma/client"],
    },
    test: {
      exclude: ["**/.react-router/**", "**/node_modules/**"],
    },
  };
});

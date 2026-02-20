import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  ssr: {
    external: ["@prisma/client", "@prisma/adapter-mariadb", ".prisma/client"],
  },
  test: {
    exclude: ["**/.react-router/**", "**/node_modules/**"],
  },
});

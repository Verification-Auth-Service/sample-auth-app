import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  ssr: {
    noExternal: ["@prisma/client", "@prisma/adapter-mariadb"],
  },
  test: {
    exclude: ["**/.react-router/**", "**/node_modules/**"],
  },
});

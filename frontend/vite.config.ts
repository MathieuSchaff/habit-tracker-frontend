import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vitejs.dev/config/
// https://tanstack.com/router/latest/docs/framework/react/installation/with-vite
export default defineConfig({
  plugins: [
    // Please make sure that '@tanstack/router-plugin' is passed before '@vitejs/plugin-react'
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      quoteStyle: "single",
    }),
    react(),
    ],
    server: {
      host: '0.0.0.0',  // ← ajoute ça aussi
      proxy: {
        "/api": {
          target: "http://api:3000",  // ← "api" = nom du service dans docker-compose
          changeOrigin: true,
        },
      },
    },
  // server: {
  //   proxy: {
  //     "/api": {
  //       target: "http://localhost:3000",
  //       changeOrigin: true,
  //     },
  //   },
  // },
});

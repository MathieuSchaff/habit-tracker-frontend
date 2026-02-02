import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import { routeTree } from "./routeTree.gen";
// STYLES
import "./styles/index.css";
import type { RouterContext } from "./routerContext";
const router = createRouter({
  routeTree,
  context: { queryClient } satisfies RouterContext,
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultViewTransition: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
    const root = createRoot(rootElement)
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <ReactQueryDevtools />
        </QueryClientProvider>
      </StrictMode>,
   )
}

import { HeadContent, Outlet, createRootRouteWithContext, useLocation } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

import "../index.css";

export interface RouterAppContext {}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "secured_attendance",
      },
      {
        name: "description",
        content: "secured_attendance is a web application",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/favicon.ico",
      },
    ],
  }),
});

function RootComponent() {
  const location = useLocation();
  const hideHeader = location.pathname.startsWith("/admin");

  return (
    <>
      <HeadContent />

      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <TooltipProvider>
          <div className="flex flex-col min-h-svh w-full bg-background text-foreground">
            {!hideHeader && <Header />}
            <main className="flex flex-col flex-1 w-full">
              <Outlet />
            </main>
          </div>
          <Toaster richColors />
        </TooltipProvider>
      </ThemeProvider>

      <TanStackRouterDevtools position="bottom-left" />
    </>
  );
}

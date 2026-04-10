import type { ReactNode } from "react";
import { AppSidebar } from "../_components/AppSidebar";
import { ThemeToggle } from "../_components/ThemeToggle";
import "../shell.css";

export default function AppShellLayout({ children }: { children: ReactNode }) {
  return (
    <div className="appShell">
      <AppSidebar />
      <div className="appMain">
        <header className="appTopBar">
          <div className="appBreadcrumb">
            Overview <span aria-hidden>›</span> <strong>WatchTower</strong>
          </div>
          <ThemeToggle />
        </header>
        <div className="appMainScroll">{children}</div>
      </div>
    </div>
  );
}

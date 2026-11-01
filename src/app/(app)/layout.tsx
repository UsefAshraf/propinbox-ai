import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";

/** Shared app shell: sidebar nav + the section's own panes. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1">{children}</div>
    </div>
  );
}

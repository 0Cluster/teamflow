import type { PropsWithChildren } from "react";

import { Sidebar } from "./Sidebar.js";
import { Topbar } from "./Topbar.js";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

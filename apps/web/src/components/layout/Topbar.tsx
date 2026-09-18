import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../features/auth/use-auth.js";
import { listNotifications } from "../../features/notifications/notification.api.js";

const navigation = [
  { label: "Dashboard", to: "/" },
  { label: "Organizations", to: "/organizations" },
  { label: "Projects", to: "/projects" },
  { label: "My tasks", to: "/tasks" },
  { label: "Notifications", to: "/notifications" },
];

export function Topbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const notificationsQuery = useQuery({
    queryKey: ["notifications", { page: 1, limit: 1 }],
    queryFn: () =>
      listNotifications({
        page: 1,
        limit: 1,
      }),
  });

  const unreadCount =
    notificationsQuery.data?.unreadCount ?? 0;

  return (
    <header className="border-b border-slate-800 bg-slate-900">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white md:hidden"
          >
            ☰
          </button>

          <h1 className="text-sm font-medium text-slate-300">
            Workspace
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-white">
              {user?.name}
            </p>

            <p className="text-xs text-slate-500">
              {user?.email}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-lg border border-red-900 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-950/40"
          >
            Logout
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="space-y-1 border-t border-slate-800 p-4 md:hidden">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                [
                  "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                ].join(" ")
              }
            >
              <span>{item.label}</span>

              {item.to === "/notifications" &&
                unreadCount > 0 && (
                  <span className="min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  );
}

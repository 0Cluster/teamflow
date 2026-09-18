import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { listNotifications } from "../../features/notifications/notification.api.js";

const navigation = [
  { label: "Dashboard", to: "/" },
  { label: "Organizations", to: "/organizations" },
  { label: "Projects", to: "/projects" },
  { label: "My tasks", to: "/tasks" },
  { label: "Notifications", to: "/notifications" },
];

export function Sidebar() {
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
    <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900 md:block">
      <div className="flex h-16 items-center border-b border-slate-800 px-6">
        <span className="text-xl font-bold text-white">
          TeamFlow
        </span>
      </div>

      <nav className="space-y-1 p-4">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
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
    </aside>
  );
}

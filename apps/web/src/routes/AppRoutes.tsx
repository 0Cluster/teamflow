import { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AppShell } from "../components/layout/AppShell.js";
import { ProtectedRoute } from "./ProtectedRoute.js";

const LoginPage = lazy(() =>
  import("../features/auth/LoginPage.js").then((module) => ({
    default: module.LoginPage,
  })),
);

const RegisterPage = lazy(() =>
  import("../features/auth/RegisterPage.js").then((module) => ({
    default: module.RegisterPage,
  })),
);

const DashboardPage = lazy(() =>
  import("../features/dashboard/DashboardPage.js").then((module) => ({
    default: module.DashboardPage,
  })),
);

const TasksPage = lazy(() =>
  import("../features/tasks/TasksPage.js").then((module) => ({
    default: module.TasksPage,
  })),
);

const MyTasksPage = lazy(() =>
  import("../features/tasks/MyTasksPage.js").then((module) => ({
    default: module.MyTasksPage,
  })),
);

const TaskDetailPage = lazy(() =>
  import("../features/tasks/TaskDetailPage.js").then((module) => ({
    default: module.TaskDetailPage,
  })),
);

const NotificationsPage = lazy(() =>
  import("../features/notifications/NotificationsPage.js").then(
    (module) => ({
      default: module.NotificationsPage,
    }),
  ),
);

const OrganizationsPage = lazy(() =>
  import("../features/organizations/OrganizationsPage.js").then(
    (module) => ({
      default: module.OrganizationsPage,
    }),
  ),
);

const LabelsPage = lazy(() =>
  import("../features/labels/LabelsPage.js").then((module) => ({
    default: module.LabelsPage,
  })),
);

const OrganizationDetailPage = lazy(() =>
  import(
    "../features/organizations/OrganizationDetailPage.js"
  ).then((module) => ({
    default: module.OrganizationDetailPage,
  })),
);

const ProjectsPage = lazy(() =>
  import("../features/projects/ProjectsPage.js").then((module) => ({
    default: module.ProjectsPage,
  })),
);

const MyProjectsPage = lazy(() =>
  import("../features/projects/MyProjectsPage.js").then((module) => ({
    default: module.MyProjectsPage,
  })),
);

const ProjectDetailPage = lazy(() =>
  import("../features/projects/ProjectDetailPage.js").then((module) => ({
    default: module.ProjectDetailPage,
  })),
);

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <p className="text-sm text-slate-500">Loading...</p>
    </div>
  );
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={
                <AppShell>
                  <DashboardPage />
                </AppShell>
              }
            />

            <Route
              path="/organizations"
              element={
                <AppShell>
                  <OrganizationsPage />
                </AppShell>
              }
            />

            <Route
              path="/organizations/:organizationId"
              element={
                <AppShell>
                  <OrganizationDetailPage />
                </AppShell>
              }
            />

            <Route
              path="/organizations/:organizationId/projects"
              element={
                <AppShell>
                  <ProjectsPage />
                </AppShell>
              }
            />

            <Route
              path="/projects"
              element={
                <AppShell>
                  <MyProjectsPage />
                </AppShell>
              }
            />

            <Route
              path="/organizations/:organizationId/projects/:projectId"
              element={
                <AppShell>
                  <ProjectDetailPage />
                </AppShell>
              }
            />
            <Route
              path="/organizations/:organizationId/projects/:projectId/tasks"
              element={
                <AppShell>
                  <TasksPage />
                </AppShell>
              }
            />
            <Route
              path="/organizations/:organizationId/projects/:projectId/tasks/:taskId"
              element={
                <AppShell>
                  <TaskDetailPage />
                </AppShell>
              }
            />
            <Route
              path="/tasks"
              element={
                <AppShell>
                  <MyTasksPage />
                </AppShell>
              }
            />
            <Route
              path="/organizations/:organizationId/labels"
              element={
                <AppShell>
                  <LabelsPage />
                </AppShell>
              }
            />
            <Route
              path="/notifications"
              element={
                <AppShell>
                  <NotificationsPage />
                </AppShell>
              }
            />
          </Route>

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { LoginPage } from "../features/auth/LoginPage.js";
import { RegisterPage } from "../features/auth/RegisterPage.js";
import { DashboardPage } from "../features/dashboard/DashboardPage.js";
import { TasksPage } from "../features/tasks/TasksPage.js";
import { MyTasksPage } from "../features/tasks/MyTasksPage.js";
import { TaskDetailPage } from "../features/tasks/TaskDetailPage.js";
import { NotificationsPage } from "../features/notifications/NotificationsPage.js";
import { OrganizationsPage } from "../features/organizations/OrganizationsPage.js";
import { LabelsPage } from "../features/labels/LabelsPage.js";
import { OrganizationDetailPage } from "../features/organizations/OrganizationDetailPage.js";
import { ProjectsPage } from "../features/projects/ProjectsPage.js";
import { MyProjectsPage } from "../features/projects/MyProjectsPage.js";
import { ProjectDetailPage } from "../features/projects/ProjectDetailPage.js";
import { AppShell } from "../components/layout/AppShell.js";
import { ProtectedRoute } from "./ProtectedRoute.js";

export function AppRoutes() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

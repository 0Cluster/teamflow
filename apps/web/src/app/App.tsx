import { AppProviders } from "./providers.js";
import { AuthProvider } from "../features/auth/auth.context.js";
import { AppRoutes } from "../routes/AppRoutes.js";

export function App() {
  return (
    <AppProviders>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </AppProviders>
  );
}

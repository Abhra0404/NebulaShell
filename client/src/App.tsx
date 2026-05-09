import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { WorkspacePage } from "./pages/WorkspacePage";

function Gate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid h-screen place-items-center bg-ink-950 text-sm text-ink-300">
        Loading NebulaShell...
      </div>
    );
  }

  return user ? <WorkspacePage /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

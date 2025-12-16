import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider, useNotification } from './contexts/NotificationContext';
import DashboardPage from './DashboardPage';
import LoginPage from './LoginPage';

function AppContent() {
  const { usuario, login, loading } = useAuth();
  const notification = useNotification();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    );
  }

  const handleLogin = async (credentials) => {
    const resultado = await login(credentials.email, credentials.password);
    if (!resultado.success) {
      notification.error('Error de inicio de sesión', resultado.mensaje);
    }
  };

  if (!usuario) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return <DashboardPage />;
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
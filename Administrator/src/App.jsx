import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NetworkProvider } from './context/NetworkContext';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { CompanyProvider } from './context/CompanyContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/layouts/MainLayout';
import { protectedRoutes, specialRoutes } from './config/routes';

// Páginas que no usan lazy loading (críticas para UX)
import Login from './pages/InicioSesion';
import Error404 from './pages/Error404';
import Maintenance from './pages/Maintenance';
import DynamicLoader from './components/common/DynamicLoader';


function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <NetworkProvider>
                    <ConfigProvider>
                        <ThemeProvider>
                            <CompanyProvider>
                                <NotificationProvider>
                                    <AppRoutes />
                                </NotificationProvider>
                            </CompanyProvider>
                        </ThemeProvider>
                    </ConfigProvider>
                </NetworkProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

// Redireccionador Inteligente según Rol
function RootRedirect() {
    return <Navigate to="/dashboard" replace />;
}

// Definición de rutas de la aplicación
function AppRoutes() {
    const { isAuthenticated, loading } = useAuth();
    const { config } = useConfig();
    const location = useLocation();

    // Mostrar loading mientras se verifica la autenticación
    if (loading) {
        return <DynamicLoader text="Verificando sesión..." />;
    }

    // Modo Mantenimiento (Permitir acceso a login)
    if (config.es_mantenimiento && !isAuthenticated && location.pathname !== '/login') {
        return <Maintenance />;
    }

    return (
        <Suspense fallback={<DynamicLoader />}>
            <Routes>
                {/* Ruta de Login */}
                <Route
                    path="/login"
                    element={
                        isAuthenticated ? <Navigate to="/" replace /> : <Login />
                    }
                />

                {/* Redirección Base Inteligente */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <RootRedirect />
                        </ProtectedRoute>
                    }
                />

                {/* Rutas protegidas generadas dinámicamente */}
                {protectedRoutes.map(({ path, component: Component, requireAdmin }) => (
                    <Route
                        key={path}
                        path={path}
                        element={
                            <ProtectedRoute requireAdmin={requireAdmin}>
                                <MainLayout>
                                    <Component />
                                </MainLayout>
                            </ProtectedRoute>
                        }
                    />
                ))}

                {/* Rutas especiales (con parámetros) */}
                {specialRoutes.map(({ path, component: Component, requireAdmin }) => (
                    <Route
                        key={path}
                        path={path}
                        element={
                            <ProtectedRoute requireAdmin={requireAdmin}>
                                <MainLayout>
                                    <Component />
                                </MainLayout>
                            </ProtectedRoute>
                        }
                    />
                ))}

                {/* Ruta 404 */}
                <Route path="*" element={<Error404 />} />
            </Routes>
        </Suspense>
    );
}

export default App;
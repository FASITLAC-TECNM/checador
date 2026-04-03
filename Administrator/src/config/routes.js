import { lazy } from 'react';

// Lazy loading de todas las páginas
const Dashboard = lazy(() => import('../pages/Tablero'));
const Empleados = lazy(() => import('../pages/Empleados'));
const Horarios = lazy(() => import('../pages/Horarios'));
const Departamentos = lazy(() => import('../pages/Departamentos'));
const Roles = lazy(() => import('../pages/Roles'));
const Dispositivos = lazy(() => import('../pages/Dispositivos'));
const Incidencias = lazy(() => import('../pages/Incidencias'));
const Reportes = lazy(() => import('../pages/Reportes'));
const Registros = lazy(() => import('../pages/Registros'));
const Configuracion = lazy(() => import('../pages/Configuracion'));
const PerfilUsuario = lazy(() => import('../pages/PerfilUsuario'));
const Avisos = lazy(() => import('../pages/Avisos'));
const AdminSaaS = lazy(() => import('../pages/AdminSaaS')); // Rutas SuperUser
const EmpresasSaaS = lazy(() => import('../pages/EmpresasSaaS'));
const ConfigurarEmpresaSaaS = lazy(() => import('../pages/ConfigurarEmpresaSaaS'));
const SaasLogs = lazy(() => import('../pages/SaasLogs'));

export const protectedRoutes = [
    { path: '/dashboard', component: Dashboard },
    { path: '/avisos', component: Avisos },
    { path: '/empleados', component: Empleados },
    { path: '/horarios', component: Horarios },
    { path: '/departamentos', component: Departamentos },
    { path: '/roles', component: Roles },
    { path: '/dispositivos', component: Dispositivos },
    { path: '/incidencias', component: Incidencias },
    { path: '/reportes', component: Reportes },
    { path: '/registros', component: Registros, requireAdmin: true },
    { path: '/configuracion', component: Configuracion, requireAdmin: true },
    { path: '/super-administradores', component: AdminSaaS, requireAdmin: true },
    { path: '/empresas', component: EmpresasSaaS, requireAdmin: true },
    { path: '/empresas/:id', component: ConfigurarEmpresaSaaS, requireAdmin: true },
    { path: '/saas-logs', component: SaasLogs, requireAdmin: true },
];

export const specialRoutes = [
    { path: 'empleados/usuario/:username', component: PerfilUsuario },
];
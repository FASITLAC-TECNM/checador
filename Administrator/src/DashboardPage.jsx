import { useState } from 'react';
import Layout from './components/Layout';
import HomePage from './modules/home/HomePage';
import UserPage from './modules/users/UserPage';
import RolesPage from './modules/roles/RolesPage';
import SettingsPage from './modules/settings/SettingsPage';
import DevicesPage from './modules/devices/DevicesPage';
import DeviceRequestPage from './modules/devices/DeviceRequestPage';
import DepartmentsPage from './modules/departments/DepartmentsPage';
import HistoryPage from './modules/history/HistoryPage';
import SchedulesPage from './modules/schedules/CalendarioGlobalV2';

const DashboardPage = () => {
    const [activeView, setActiveView] = useState('home');

    // Estado para las peticiones pendientes
    const [peticionesPendientes, setPeticionesPendientes] = useState(3);

    // Función para navegar a las peticiones desde DevicesPage
    const handleNavigateToPeticiones = () => {
        setActiveView('device-requests');
    };

    // Función para volver a dispositivos desde DeviceRequestPage
    const handleNavigateToDevices = () => {
        setActiveView('devices');
    };

    // Función para actualizar el contador de peticiones
    const handleUpdatePeticiones = (count) => {
        setPeticionesPendientes(count);
    };

    const renderContent = () => {
        switch (activeView) {
            case 'home':
                return <HomePage />;
            case 'users':
                return <UserPage />;
            case 'settings':
                return <SettingsPage />;
            case 'roles':
                return <RolesPage />;
            case 'departments':
                return <DepartmentsPage />;
            case 'devices':
                return (
                    <DevicesPage
                        peticionesPendientes={peticionesPendientes}
                        onNavigateToPeticiones={handleNavigateToPeticiones}
                    />
                );
            case 'device-requests':
                return (
                    <DeviceRequestPage
                        onNavigateToDevices={handleNavigateToDevices}
                        onUpdatePeticiones={handleUpdatePeticiones}
                    />
                );
            case 'schedules':
                return <SchedulesPage />;
            case 'history':
                return <HistoryPage />;
            default:
                return <HomePage />;
        }
    };

    return (
        <Layout
            activeView={activeView}
            setActiveView={setActiveView}
            peticionesPendientes={peticionesPendientes}
        >
            {renderContent()}
        </Layout>
    );
};

export default DashboardPage;

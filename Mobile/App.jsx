import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LoginScreen } from './login';
import { HomeScreen } from './home';
import { HistoryScreen } from './history';
import { ScheduleScreen } from './schedule';
import { SettingsScreen } from './settings';
import { BottomNavigation } from './nav';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [darkMode, setDarkMode] = useState(false);
  const [userData, setUserData] = useState(null);

  const handleLoginSuccess = (data) => {
    console.log('🎯 Datos recibidos en App:', data);
    
    // Guardar TODOS los datos del usuario que vienen del backend
    setUserData({
      id: data.id,
      username: data.username,
      email: data.email,
      nombre: data.nombre,
      telefono: data.telefono || '',
      foto: data.foto || null,
      activo: data.activo,
      estado: data.estado,
      role: data.role || 'Administrador' // Por si no viene en el backend
    });
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentScreen('home');
    setUserData(null);
  };

  if (!isLoggedIn || !userData) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView 
        style={[appStyles.container, darkMode && appStyles.containerDark]}
        edges={['bottom']}
      >
        {currentScreen === 'home' && <HomeScreen userData={userData} darkMode={darkMode} />}
        {currentScreen === 'history' && <HistoryScreen darkMode={darkMode} />}
        {currentScreen === 'schedule' && <ScheduleScreen darkMode={darkMode} />}
        {currentScreen === 'settings' && (
          <SettingsScreen 
            userData={userData} 
            email={userData.email}
            darkMode={darkMode} 
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            onLogout={handleLogout}
          />
        )}

        <BottomNavigation 
          currentScreen={currentScreen}
          onScreenChange={setCurrentScreen}
          darkMode={darkMode}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const appStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
});
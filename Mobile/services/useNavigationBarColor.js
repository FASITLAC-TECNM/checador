import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Hook para configurar la barra de navegación de Android
 * Debe usarse en el componente principal de la app
 */
export const useNavigationBarColor = (darkMode) => {
  useEffect(() => {
    const setupNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          const NavigationBar = require('expo-navigation-bar');
          
          // Color de fondo según el modo
          await NavigationBar.setBackgroundColorAsync(
            darkMode ? '#1f2937' : '#ffffff'
          );
          
          // Estilo de botones (light/dark)
          await NavigationBar.setButtonStyleAsync(
            darkMode ? 'light' : 'dark'
          );
          
          // Asegurar que sea visible
          await NavigationBar.setVisibilityAsync('visible');
          
        } catch (error) {
          console.log('📱 expo-navigation-bar no disponible.');
          console.log('💡 Instalar con: npx expo install expo-navigation-bar');
        }
      }
    };
    
    setupNavigationBar();
  }, [darkMode]);
};

export default useNavigationBarColor;
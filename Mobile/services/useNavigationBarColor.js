import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Hook para configurar la barra de navegación de Android
 * Cambia tanto el color de fondo como el estilo de botones
 */
export const useNavigationBarColor = (darkMode) => {
  useEffect(() => {
    const setupNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          const NavigationBar = require('expo-navigation-bar');

          // Color de fondo de la barra de navegación
          await NavigationBar.setBackgroundColorAsync(
            darkMode ? '#111827' : '#ffffff'
          );

          // Estilo de botones (light/dark)
          await NavigationBar.setButtonStyleAsync(
            darkMode ? 'light' : 'dark'
          );

        } catch (error) {
        }
      }
    };

    setupNavigationBar();
  }, [darkMode]);
};

export default useNavigationBarColor;

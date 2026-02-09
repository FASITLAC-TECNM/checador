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
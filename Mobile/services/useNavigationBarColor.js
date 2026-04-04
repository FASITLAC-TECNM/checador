import { useEffect } from 'react';
import { Platform } from 'react-native';
export const useNavigationBarColor = (darkMode) => {
  useEffect(() => {
    const setupNavigationBar = async () => {
      if (Platform.OS === 'android') {
        try {
          const NavigationBar = require('expo-navigation-bar');
          await NavigationBar.setBackgroundColorAsync(
            darkMode ? '#111827' : '#ffffff'
          );
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
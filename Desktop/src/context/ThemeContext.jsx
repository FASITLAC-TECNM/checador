import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        // Cargar tema guardado del localStorage o usar 'light' por defecto
        const savedPreferences = localStorage.getItem('userPreferences');
        console.log('🔍 Inicializando tema, localStorage:', savedPreferences);

        if (savedPreferences) {
            try {
                const prefs = JSON.parse(savedPreferences);
                const initialTheme = prefs.darkMode ? 'dark' : 'light';
                console.log('✅ Tema inicial desde localStorage:', initialTheme, 'darkMode:', prefs.darkMode);

                // Aplicar inmediatamente en el HTML
                document.documentElement.classList.remove('light', 'dark');
                document.documentElement.classList.add(initialTheme);

                return initialTheme;
            } catch (error) {
                console.error('❌ Error al cargar preferencias:', error);
                return 'light';
            }
        }

        console.log('⚠️ No hay preferencias guardadas, usando light');
        return 'light';
    });

    useEffect(() => {
        // Aplicar clase al elemento raíz HTML de forma inmediata
        const applyTheme = () => {
            const root = document.documentElement;

            // Forzar la actualización usando setAttribute también
            root.setAttribute('data-theme', theme);

            // Remover todas las clases de tema
            root.classList.remove('light', 'dark');

            // Agregar la clase del tema actual
            root.classList.add(theme);

            console.log('🎨 Tema aplicado:', theme);
            console.log('📋 Clases en HTML:', root.className);
            console.log('🏷️ data-theme:', root.getAttribute('data-theme'));

            // Actualizar el localStorage
            const savedPreferences = localStorage.getItem('userPreferences');
            let preferences = {
                notifications: true,
                darkMode: theme === 'dark',
                language: 'es',
                soundEnabled: true
            };

            if (savedPreferences) {
                try {
                    const parsed = JSON.parse(savedPreferences);
                    preferences = { ...preferences, ...parsed, darkMode: theme === 'dark' };
                } catch (error) {
                    console.error('Error al parsear preferencias:', error);
                }
            }

            localStorage.setItem('userPreferences', JSON.stringify(preferences));
        };

        // Aplicar inmediatamente
        applyTheme();

        // También aplicar después de un tick para asegurar
        setTimeout(applyTheme, 0);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    const setDarkMode = (isDark) => {
        setTheme(isDark ? 'dark' : 'light');
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setDarkMode, isDarkMode: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
    }
    return context;
};

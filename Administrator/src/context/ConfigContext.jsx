import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_CONFIG } from '../config/Apiconfig';

const ConfigContext = createContext();

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) {
        throw new Error('useConfig debe ser usado dentro de un ConfigProvider');
    }
    return context;
};

export const ConfigProvider = ({ children }) => {
    // Estado inicial por defecto
    const [config, setConfig] = useState({
        idioma: 'es',
        formato_fecha: 'DD/MM/YYYY',
        formato_hora: '24',
        zona_horaria: 'America/Mexico_City',
        es_mantenimiento: false,
        requiere_salida: true,
        intervalo_bloques_minutos: 60
    });

    // Cargar configuración inicial
    useEffect(() => {
        // 1. Cargar desde localStorage
        const savedConfig = localStorage.getItem('app_config');
        if (savedConfig) {
            try {
                setConfig(prev => ({ ...prev, ...JSON.parse(savedConfig) }));
            } catch (e) {
                console.error("Error parsing saved config", e);
            }
        }

        // 2. Verificar estado de mantenimiento desde API
        fetch(`${API_CONFIG.BASE_URL}/api/configuracion/public/status`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setConfig(prev => ({
                        ...prev,
                        es_mantenimiento: data.maintenance
                    }));
                }
            })
            .catch(err => console.error("Error checking maintenance mod", err));

    }, []);

    // Función para actualizar la configuración
    const updateConfig = (newConfig) => {
        setConfig(prev => {
            const updated = { ...prev, ...newConfig };
            localStorage.setItem('app_config', JSON.stringify(updated));
            return updated;
        });
    };

    /**
     * Formatea una fecha según formato_fecha del config.
     */
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);

        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        if (config.formato_fecha === 'MM/DD/YYYY') {
            return `${month}/${day}/${year}`;
        }
        return `${day}/${month}/${year}`;
    };

    /**
     * Formatea una hora según formato_hora del config.
     * Soporta:
     *   - Timestamps ISO completos: "2026-03-08T10:30:00Z"
     *   - Strings de tiempo: "10:30", "10:30:00"
     * Devuelve "10:30" (24h) o "10:30 am" (12h).
     */
    const formatTime = (timeInput) => {
        if (!timeInput) return '--:--';

        let hours, minutes;

        // Detectar si es un string de tiempo puro "HH:MM" o "HH:MM:SS"
        if (typeof timeInput === 'string' && /^\d{1,2}:\d{2}(:\d{2})?$/.test(timeInput)) {
            [hours, minutes] = timeInput.split(':').map(Number);
        } else {
            // Intentar parsear como fecha
            const date = new Date(timeInput);
            if (isNaN(date.getTime())) return String(timeInput);
            hours = date.getHours();
            minutes = date.getMinutes();
        }

        if (config.formato_hora === '12') {
            const period = hours >= 12 ? 'pm' : 'am';
            const h12 = hours % 12 || 12;
            return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
        }

        // 24h
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    };

    return (
        <ConfigContext.Provider value={{ config, updateConfig, formatDate, formatTime }}>
            {children}
        </ConfigContext.Provider>
    );
};

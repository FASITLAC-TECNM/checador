import { useState, useEffect, useCallback } from 'react';
import { API_CONFIG } from '../config/Apiconfig';

const API_URL = API_CONFIG.BASE_URL;

/**
 * Hook para obtener y mantener sincronizados en tiempo real (polling) 
 * los biométricos conectados a un escritorio/kiosco.
 * 
 * @param {number|string} dispositivoId ID del dispositivo a consultar
 * @param {number} intervalMs Intervalo de sincronización en milisegundos (default 5000ms)
 * @returns {Object} { biometricos, loadingBio, errorBio, refetchBiometricos }
 */
export const useBiometricosSync = (dispositivoId, intervalMs = 3000) => {
    const [biometricos, setBiometricos] = useState([]);
    const [loadingBio, setLoadingBio] = useState(false);
    const [errorBio, setErrorBio] = useState(null);

    const fetchBiometricos = useCallback(async (showLoading = false) => {
        if (!dispositivoId) return;

        try {
            if (showLoading) setLoadingBio(true);
            setErrorBio(null);

            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_URL}/api/biometrico/escritorio/${dispositivoId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                cache: 'no-store'
            });
            const result = await response.json();

            if (result.success) {
                // Actualizamos el estado con los nuevos datos recibidos
                setBiometricos(result.data || []);
            } else {
                setErrorBio(result.message || 'Error al obtener biométricos');
            }
        } catch (error) {
            console.error("Error fetching biometricos en hook:", error);
            setErrorBio(error.message);
        } finally {
            if (showLoading) setLoadingBio(false);
        }
    }, [dispositivoId]);

    // Efecto principal para carga inicial y configuración del intervalo de polling
    useEffect(() => {
        if (!dispositivoId) {
            setBiometricos([]);
            return;
        }

        // Carga inicial mostrando el indicador de carga
        fetchBiometricos(true);

        // Polling en segundo plano (sin loadingBio en true para evitar flickering)
        const intervalId = setInterval(() => {
            fetchBiometricos(false);
        }, intervalMs);

        // Limpiar intervalo al desmontar o cambiar el ID del dispositivo
        return () => clearInterval(intervalId);
    }, [dispositivoId, intervalMs, fetchBiometricos]);

    return {
        biometricos,
        loadingBio,
        errorBio,
        refetchBiometricos: fetchBiometricos
    };
};

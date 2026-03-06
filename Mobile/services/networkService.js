/**
 * networkService.js
 *
 * Utilidades de red del lado del móvil:
 *
 * 1. verificarRedDispositivo — Diagnóstico completo (para admin).
 *    Consulta GET /api/configuracion y usa IP pública para auditoría.
 *
 * La validación definitiva de IP siempre la hace el servidor.
 */

import NetInfo from '@react-native-community/netinfo';
import { getApiEndpoint } from '../config/api.js';

// ---------------------------------------------------------------------------
// API URL
// ---------------------------------------------------------------------------

const API_URL = getApiEndpoint('/api');

/**
 * Obtiene los segmentos de red configurados para la empresa.
 * Usa el endpoint existente GET /api/configuracion.
 *
 * @param {string} token
 * @returns {Promise<string[]>} Array de CIDRs configurados
 */
export const obtenerSegmentosRed = async (token) => {
    try {
        const response = await fetch(`${API_URL}/configuracion`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) return [];

        const data = await response.json();
        const segmentos = data.data?.segmentos_red;

        if (!segmentos) return [];
        if (typeof segmentos === 'string') {
            try { return JSON.parse(segmentos); } catch { return []; }
        }
        return Array.isArray(segmentos) ? segmentos : [];
    } catch {
        return [];
    }
};

/**
 * Verifica el estado de red del dispositivo.
 *
 * Hace un fetch al servidor y obtiene los segmentos de red configurados.
 * La validación de IP real se ejecuta en el servidor al registrar asistencia.
 *
 * @param {string} token - JWT del usuario autenticado
 * @returns {Promise<{
 *   conectado: boolean,
 *   segmentos_configurados: string[],
 *   latencia_ms: number|null,
 *   message: string
 * }>}
 */
export const verificarRedDispositivo = async (token) => {
    const t0 = Date.now();
    try {
        const response = await fetch(`${API_URL}/configuracion`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        const latencia = Date.now() - t0;

        if (!response.ok) {
            return {
                conectado: false,
                segmentos_configurados: [],
                latencia_ms: latencia,
                message: `Error al conectar con el servidor (${response.status})`
            };
        }

        const data = await response.json();
        const raw = data.data?.segmentos_red;
        let segmentos = [];
        if (raw) {
            segmentos = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
        }

        // Obtener la IP pública actual del dispositivo usando free service de Ipify
        let ip_cliente = null;
        try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            if (ipRes.ok) {
                const ipData = await ipRes.json();
                ip_cliente = ipData.ip;
            }
        } catch (e) { }

        return {
            conectado: true,
            segmentos_configurados: segmentos,
            latencia_ms: latencia,
            ip_cliente,
            message: segmentos.length === 0 ? 'Conectado — sin restricción de red' : `Conectado — red configurada`,
            nota: 'Validación en modo diagnóstico. La validación real se ejecuta en el backend.'
        };
    } catch (error) {
        return {
            conectado: false,
            segmentos_configurados: [],
            latencia_ms: null,
            message: 'Sin conexión al servidor'
        };
    }
};

export default {
    verificarRedDispositivo,
    obtenerSegmentosRed,
};

/**
 * networkService.js
 *
 * Servicio de diagnóstico de red del lado del móvil.
 *
 * Obtiene los segmentos de red configurados desde la API (/api/configuracion)
 * y muestra información de diagnóstico en la pantalla admin secreta.
 *
 * NOTA: La validación definitiva de IP se realiza en el servidor durante
 * el registro de asistencia. Este servicio solo sirve para diagnóstico
 * visual del administrador.
 */

import { getApiEndpoint } from '../config/api.js';

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

        // Validar si la IP está dentro de algún segmento
        let is_ip_valida = true;
        let advertencia = null;

        if (segmentos.length > 0 && ip_cliente) {
            const ipToInt = (ip) => ip.split('.').reduce((acc, oct) => (acc << 8) + parseInt(oct, 10), 0) >>> 0;
            const ipEnCIDR = (ip, cidr) => {
                try {
                    const [red, bits] = cidr.split('/');
                    const mascara = bits === '0' ? 0 : (~0 << (32 - parseInt(bits, 10))) >>> 0;
                    return (ipToInt(ip) & mascara) === (ipToInt(red) & mascara);
                } catch { return false; }
            };

            is_ip_valida = segmentos.some(cidr => ipEnCIDR(ip_cliente, cidr));

            if (!is_ip_valida) {
                advertencia = {
                    mensaje: `La IP ${ip_cliente} no pertenece a ningún segmento autorizado`
                };
            }
        } else if (segmentos.length > 0 && !ip_cliente) {
            is_ip_valida = false;
            advertencia = { mensaje: 'No se pudo detectar la IP del dispositivo' };
        }

        return {
            conectado: true,
            segmentos_configurados: segmentos,
            latencia_ms: latencia,
            ip_cliente,
            is_ip_valida,
            advertencia,
            message: is_ip_valida
                ? (segmentos.length === 0 ? 'Conectado — sin restricción de red' : `Conectado y Autorizado en segmento`)
                : 'Conectado pero IP no autorizada',
            nota: 'Validación en modo diagnóstico (simulada en frontend).'
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

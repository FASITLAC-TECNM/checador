// registerHelpers.js
// Funciones helper simplificadas para RegisterButton
// El backend ahora maneja toda la validación compleja

import { getApiEndpoint } from '../config/api';

const API_URL = getApiEndpoint('/api');

/**
 * Obtener el horario simplificado del día actual
 * Solo verifica si el empleado trabaja hoy y sus turnos básicos
 */
export const obtenerHorarioSimplificado = async (empleadoId, token) => {
    try {
        const response = await fetch(
            `${API_URL}/empleados/${empleadoId}/horario`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) return { trabaja: false, turnos: [] };

        const data = await response.json();
        const horario = data.data || data.horario || data;

        if (!horario?.configuracion) return { trabaja: false, turnos: [] };

        let config = typeof horario.configuracion === 'string'
            ? JSON.parse(horario.configuracion)
            : horario.configuracion;

        const diaHoy = getDiaSemana();
        let turnosHoy = [];

        // Obtener turnos del día actual
        if (config.configuracion_semanal?.[diaHoy]) {
            turnosHoy = config.configuracion_semanal[diaHoy].map(t => ({
                entrada: t.inicio,
                salida: t.fin
            }));
        } else if (config.dias?.includes(diaHoy)) {
            turnosHoy = config.turnos || [];
        }

        if (!turnosHoy || turnosHoy.length === 0) {
            return { trabaja: false, turnos: [] };
        }

        return {
            trabaja: true,
            turnos: turnosHoy,
            entrada: turnosHoy[0]?.entrada || null,
            salida: turnosHoy[turnosHoy.length - 1]?.salida || null
        };
    } catch (err) {
        return { trabaja: false, turnos: [] };
    }
};

/**
 * DEFAULT_TOLERANCIA
 * Fallback cuando el backend no devuelve datos.
 * Incluye un array `reglas` equivalente al que maneja el backend.
 */
const DEFAULT_TOLERANCIA = {
    permite_registro_anticipado: true,
    minutos_anticipado_max: 60,
    aplica_tolerancia_entrada: true,
    aplica_tolerancia_salida: false,
    // Array de reglas — misma estructura que usa srvEvaluarEstado en el backend
    reglas: [
        { id: 'retardo_a', limite_minutos: 20, penalizacion_tipo: 'acumulacion', penalizacion_valor: 3 },
        { id: 'retardo_b', limite_minutos: 29, penalizacion_tipo: 'acumulacion', penalizacion_valor: 2 },
        { id: 'falta_por_retardo', limite_minutos: 60, penalizacion_tipo: 'directa', penalizacion_valor: 1 },
    ],
};

/**
 * Obtener tolerancia del empleado.
 * Usa el endpoint /api/tolerancias y combina con los valores por defecto
 * para garantizar que los campos nuevos (retardo_a_max, retardo_b_max, etc.)
 * siempre estén presentes.
 */
export const obtenerTolerancia = async (token) => {
    try {
        const response = await fetch(`${API_URL}/tolerancias`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) return { ...DEFAULT_TOLERANCIA };

        const data = await response.json();
        if (data.data && data.data.length > 0) {
            const t = data.data[0];
            // Parsear `reglas` si viene como string JSON (así lo devuelve el backend)
            if (typeof t.reglas === 'string') {
                try { t.reglas = JSON.parse(t.reglas); } catch { t.reglas = DEFAULT_TOLERANCIA.reglas; }
            }
            if (!Array.isArray(t.reglas) || t.reglas.length === 0) {
                t.reglas = DEFAULT_TOLERANCIA.reglas;
            }
            // Parsear dias_aplica si viene como string
            if (typeof t.dias_aplica === 'string') {
                try { t.dias_aplica = JSON.parse(t.dias_aplica); } catch { t.dias_aplica = {}; }
            }
            return { ...DEFAULT_TOLERANCIA, ...t };
        }

        return { ...DEFAULT_TOLERANCIA };
    } catch (err) {
        return { ...DEFAULT_TOLERANCIA };
    }
};

/**
 * Obtener último registro del día
 */
export const obtenerUltimoRegistro = async (empleadoId, token) => {
    try {
        const response = await fetch(
            `${API_URL}/asistencias/empleado/${empleadoId}`,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) return null;

        const data = await response.json();
        if (!data.data?.length) return null;

        const hoy = new Date().toDateString();
        const registrosHoy = data.data.filter(registro => {
            const fechaRegistro = new Date(registro.fecha_registro);
            return fechaRegistro.toDateString() === hoy;
        });

        if (!registrosHoy.length) return null;

        const ultimo = registrosHoy[0];

        return {
            tipo: ultimo.tipo,
            estado: ultimo.estado,
            fecha_registro: new Date(ultimo.fecha_registro),
            hora: new Date(ultimo.fecha_registro).toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            totalRegistrosHoy: registrosHoy.length
        };
    } catch (err) {
        return null;
    }
};

/**
 * calcularEstadoEntrada
 * Replica exactamente la lógica de srvEvaluarEstado del backend.
 * Usa el array `reglas` (ordenado por limite_minutos) para determinar el estado.
 *
 * @param {number} minutosActuales
 * @param {number} minEntrada
 * @param {Object} tolerancia - debe tener `reglas: [{id, limite_minutos}]`
 * @returns {'puntual'|'retardo_a'|'retardo_b'|'falta_por_retardo'|'falta'}
 */
export const calcularEstadoEntrada = (minutosActuales, minEntrada, tolerancia) => {
    const tol = { ...DEFAULT_TOLERANCIA, ...tolerancia };

    // Verificar si aplica hoy (igual que el backend: dias_aplica[diaHoy] !== false)
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaHoy = dias[new Date().getDay()];
    const aplicaHoy = tol.dias_aplica?.[diaHoy] !== false;

    const llegadaTarde = minutosActuales - minEntrada;

    // Si llegó antes de tiempo → puntual
    if (llegadaTarde <= 0) return 'puntual';

    // Si no aplica tolerancia hoy → directo a falta
    if (!aplicaHoy) return 'falta';

    // Recorrer reglas ordenadas por limite_minutos (igual que srvEvaluarEstado)
    const reglas = Array.isArray(tol.reglas) ? [...tol.reglas].sort((a, b) => a.limite_minutos - b.limite_minutos) : [];

    for (const r of reglas) {
        if (llegadaTarde <= r.limite_minutos) {
            return r.id; // 'retardo_a', 'retardo_b', 'falta_por_retardo', etc.
        }
    }

    return 'falta'; // Superó todas las reglas
};

/**
 * Validación simplificada del lado del cliente.
 * Solo para UX — el backend hace la validación real y definitiva.
 * Usa los nuevos campos de tolerancia (retardo_a_max, retardo_b_max) cuando estén disponibles.
 */
export const validarRegistroCliente = (horario, ultimoRegistro, tolerancia) => {
    const ahora = new Date();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
    const tol = { ...DEFAULT_TOLERANCIA, ...tolerancia };

    // Si no trabaja hoy
    if (!horario || !horario.trabaja) {
        return {
            puedeRegistrar: false,
            mensaje: 'No tienes turnos asignados hoy',
            tipoSiguiente: 'entrada'
        };
    }

    // Determinar si es entrada o salida
    const esEntrada = !ultimoRegistro || ultimoRegistro.tipo === 'salida';
    const tipoSiguiente = esEntrada ? 'entrada' : 'salida';

    // Validación de entrada
    if (esEntrada && horario.entrada) {
        const [hE, mE] = horario.entrada.split(':').map(Number);
        const minEntrada = hE * 60 + mE;
        const ventanaInicio = minEntrada - (tol.minutos_anticipado_max || 60);
        const ventanaFin = minEntrada + (tol.minutos_falta || 30);

        if (minutosActuales < ventanaInicio) {
            return {
                puedeRegistrar: false,
                mensaje: 'Aún no es hora de entrada',
                tipoSiguiente
            };
        }

        if (minutosActuales > ventanaFin) {
            return {
                puedeRegistrar: true,
                mensaje: 'Fuera de tolerancia (se registrará como falta)',
                tipoSiguiente
            };
        }

        // Usar calcularEstadoEntrada para el mensaje con umbrales correctos
        const estado = calcularEstadoEntrada(minutosActuales, minEntrada, tol);
        const mensajes = {
            puntual: 'Puedes registrar tu entrada',
            retardo_a: `Registro con retardo menor (retardo A)`,
            retardo_b: `Registro con retardo mayor (retardo B)`,
            falta_por_retardo: 'Registro tardío (se contará como falta por retardo)',
            falta: 'Fuera de tolerancia (se registrará como falta)',
        };

        return {
            puedeRegistrar: true,
            mensaje: mensajes[estado] || 'Puedes registrar tu entrada',
            estado,
            tipoSiguiente
        };
    }

    // Validación de salida
    if (!esEntrada && ultimoRegistro && horario.salida) {
        const horaUltimoRegistro = new Date(ultimoRegistro.fecha_registro);
        const diferenciaMinutos = (ahora - horaUltimoRegistro) / 1000 / 60;

        if (diferenciaMinutos < 30) {
            return {
                puedeRegistrar: false,
                mensaje: 'Espera al menos 30 minutos desde tu entrada',
                tipoSiguiente
            };
        }

        return {
            puedeRegistrar: true,
            mensaje: 'Puedes registrar tu salida',
            tipoSiguiente
        };
    }

    return {
        puedeRegistrar: true,
        mensaje: 'Puedes registrar',
        tipoSiguiente
    };
};

/**
 * Obtener día de la semana actual en formato lowercase
 */
function getDiaSemana() {
    const diasSemana = [
        'domingo', 'lunes', 'martes', 'miercoles',
        'jueves', 'viernes', 'sabado'
    ];
    return diasSemana[new Date().getDay()];
}

export default {
    obtenerHorarioSimplificado,
    obtenerTolerancia,
    obtenerUltimoRegistro,
    validarRegistroCliente,
    calcularEstadoEntrada,
    DEFAULT_TOLERANCIA,
};

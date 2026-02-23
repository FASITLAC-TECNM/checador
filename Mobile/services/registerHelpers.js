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
 * Tolerancia por defecto alineada con el backend actualizado.
 * Incluye los nuevos campos de retardo A/B.
 */
const DEFAULT_TOLERANCIA = {
    minutos_retardo: 10,
    minutos_falta: 30,
    permite_registro_anticipado: true,
    minutos_anticipado_max: 60,
    aplica_tolerancia_entrada: true,
    aplica_tolerancia_salida: false,
    // Nuevos campos — alineados con tolerancias.controller.js
    minutos_retardo_a_max: 20,
    minutos_retardo_b_max: 29,
    equivalencia_retardo_a: 10,
    equivalencia_retardo_b: 5,
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
            // Mezclar con defaults para garantizar que los campos nuevos existan
            return { ...DEFAULT_TOLERANCIA, ...data.data[0] };
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
 * Calcula el estado de entrada basado en la tolerancia del empleado.
 * Alineado con la lógica de calcularEstadoEntrada en asistencias.controller.js.
 *
 * @param {number} minutosActuales - Minutos desde medianoche de la hora actual
 * @param {number} minEntrada - Minutos desde medianoche de la hora de entrada del turno
 * @param {Object} tolerancia - Objeto de tolerancia del empleado
 * @returns {'puntual'|'retardo_a'|'retardo_b'|'falta_por_retardo'|'falta'}
 */
export const calcularEstadoEntrada = (minutosActuales, minEntrada, tolerancia) => {
    const tol = { ...DEFAULT_TOLERANCIA, ...tolerancia };
    const anticipadoMax = tol.minutos_anticipado_max || 60;
    const inicioVentana = minEntrada - anticipadoMax;

    // Umbrales basados en el backend (con los nuevos campos de tolerancia)
    const margenPuntual = minEntrada + (tol.minutos_retardo || 10);
    const margenRetardoA = minEntrada + (tol.minutos_retardo_a_max || 20);
    const margenRetardoB = minEntrada + (tol.minutos_retardo_b_max || 29);

    if (minutosActuales >= inicioVentana && minutosActuales <= margenPuntual) {
        return 'puntual';
    }
    if (minutosActuales > margenPuntual && minutosActuales <= margenRetardoA) {
        return 'retardo_a';
    }
    if (minutosActuales > margenRetardoA && minutosActuales <= margenRetardoB) {
        return 'retardo_b';
    }
    // Si superó retardo_b pero sigue en período del turno
    const margenFaltaPorRetardo = minEntrada + (tol.minutos_falta || 30);
    if (minutosActuales > margenRetardoB && minutosActuales <= margenFaltaPorRetardo) {
        return 'falta_por_retardo';
    }
    return 'falta';
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

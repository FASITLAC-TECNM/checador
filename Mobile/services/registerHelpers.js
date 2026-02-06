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
        console.error('Error obteniendo horario:', err);
        return { trabaja: false, turnos: [] };
    }
};

/**
 * Obtener tolerancia del empleado
 */
export const obtenerTolerancia = async (token) => {
    const defaultTolerancia = {
        minutos_retardo: 10,
        minutos_falta: 30,
        permite_registro_anticipado: true,
        minutos_anticipado_max: 60,
        aplica_tolerancia_salida: false
    };

    try {
        const response = await fetch(`${API_URL}/tolerancias`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) return defaultTolerancia;

        const data = await response.json();
        if (data.data && data.data.length > 0) {
            return data.data[0]; // Primera tolerancia (la del rol del usuario)
        }

        return defaultTolerancia;
    } catch (err) {
        console.error('Error obteniendo tolerancia:', err);
        return defaultTolerancia;
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
        console.error('Error obteniendo último registro:', err);
        return null;
    }
};

/**
 * Validación simplificada del lado del cliente
 * Solo para UX - el backend hace la validación real
 */
export const validarRegistroCliente = (horario, ultimoRegistro, tolerancia) => {
    const ahora = new Date();
    const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

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

    // Validación básica de horario de entrada
    if (esEntrada && horario.entrada) {
        const [hE, mE] = horario.entrada.split(':').map(Number);
        const minEntrada = hE * 60 + mE;
        const ventanaInicio = minEntrada - (tolerancia.minutos_anticipado_max || 60);
        const ventanaFin = minEntrada + (tolerancia.minutos_falta || 30);

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

        return {
            puedeRegistrar: true,
            mensaje: minutosActuales <= minEntrada + (tolerancia.minutos_retardo || 10)
                ? 'Puedes registrar tu entrada'
                : 'Registro con retardo',
            tipoSiguiente
        };
    }

    // Validación básica de salida
    if (!esEntrada && ultimoRegistro && horario.salida) {
        const ahora = new Date();
        const horaUltimoRegistro = new Date(ultimoRegistro.fecha_registro);
        const diferenciaMinutos = (ahora - horaUltimoRegistro) / 1000 / 60;

        // Validación mínima: al menos 30 minutos trabajados
        if (diferenciaMinutos < 30) {
            return {
                puedeRegistrar: false,
                mensaje: `Espera al menos 30 minutos desde tu entrada`,
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
    validarRegistroCliente
};

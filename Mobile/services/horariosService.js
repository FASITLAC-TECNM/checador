// services/horariosService.js
// Servicio para gestión de horarios de empleados

import { getApiEndpoint } from '../config/api.js';

const API_URL = getApiEndpoint('/api');

console.log('📅 Horarios API URL:', API_URL);

/**
 * Parsear horario con estructura nueva (configuracion_semanal)
 * @param {Object} configuracionSemanal - Objeto con días como keys y arrays de turnos
 * @returns {Array} Array de días con su configuración
 */
const parsearHorarioNuevo = (configuracionSemanal) => {
    const diasMap = {
        'lunes': 'Lunes',
        'martes': 'Martes',
        'miercoles': 'Miércoles',
        'jueves': 'Jueves',
        'viernes': 'Viernes',
        'sabado': 'Sábado',
        'domingo': 'Domingo'
    };

    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    
    return diasSemana.map(dia => {
        const turnosDelDia = configuracionSemanal[dia] || [];
        const diaActivo = turnosDelDia.length > 0;
        
        // Convertir formato {inicio, fin} a {entrada, salida}
        const turnos = turnosDelDia.map(turno => ({
            entrada: turno.inicio,
            salida: turno.fin
        }));

        // Determinar tipo de horario (continuo o quebrado)
        const tipo = turnos.length > 1 ? 'quebrado' : 'continuo';
        
        return {
            day: diasMap[dia],
            active: diaActivo,
            location: diaActivo ? 'Edificio A' : 'Día de descanso',
            time: diaActivo ? formatearHorarioTurnos(turnos) : '---',
            hours: diaActivo ? calcularHorasTurnos(turnos) : '',
            turnos: turnos,
            tipo: tipo
        };
    });
};

/**
 * Obtener horario de un empleado por su ID
 * @param {string} empleadoId - ID del empleado
 * @param {string} token - Token de autenticación (opcional, se puede pasar desde fuera)
 * @returns {Promise<Object>} Datos del horario
 */
export const getHorarioPorEmpleado = async (empleadoId, token = null) => {
    try {
        const url = `${API_URL}/horarios/empleado/${empleadoId}`;
        console.log('📅 URL completa:', url);
        console.log('📅 Obteniendo horario del empleado:', empleadoId);
        console.log('🔑 Token:', token ? token.substring(0, 20) + '...' : 'NO HAY TOKEN');

        const headers = {
            'Content-Type': 'application/json'
        };

        // ⭐ AGREGAR TOKEN SI EXISTE
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        console.log('📥 Status de respuesta:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error del servidor:', errorText);
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        const responseText = await response.text();
        console.log('📄 Respuesta del servidor (primeros 500 chars):', responseText.substring(0, 500));

        let data;
        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            console.error('❌ Error al parsear respuesta:', parseError);
            console.error('📄 Respuesta completa:', responseText);
            throw new Error(`Respuesta inválida del servidor: ${responseText.substring(0, 100)}`);
        }

        console.log('✅ Horario obtenido:', data);

        // ⭐ IMPORTANTE: El backend puede devolver data.data o data directamente
        const horario = data.data || data;

        // Verificar que tengamos configuracion
        if (!horario.configuracion && !horario.config_excep) {
            console.warn('⚠️ No hay configuracion ni config_excep en la respuesta');
            console.log('📊 Estructura recibida:', JSON.stringify(horario, null, 2));
            throw new Error('El horario no tiene configuración válida');
        }

        // Normalizar: El backend devuelve "configuracion", pero internamente lo usamos como "config_excep"
        if (horario.configuracion && !horario.config_excep) {
            horario.config_excep = horario.configuracion;
        }

        return horario;
    } catch (error) {
        console.error('❌ Error completo:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        throw error;
    }
};

/**
 * Obtener horario por ID
 * @param {number} id - ID del horario
 * @param {string} token - Token de autenticación
 * @returns {Promise<Object>} Datos del horario
 */
export const getHorarioById = async (id, token = null) => {
    try {
        const url = `${API_URL}/horarios/${id}`;
        console.log('📅 Obteniendo horario por ID:', url);

        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Error del servidor (${response.status}): ${errorText}`);
        }

        const responseText = await response.text();
        let data;

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            console.error('❌ Error al parsear respuesta:', parseError);
            throw new Error('Respuesta inválida del servidor');
        }

        return data;
    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    }
};

/**
 * Parsear configuración de horario del JSON config_excep
 * @param {Object} horario - Objeto horario con config_excep o configuracion
 * @returns {Array} Array de días con su configuración
 */
export const parsearHorario = (horario) => {
    try {
        console.log('📊 Parseando horario:', horario);

        if (!horario) {
            console.warn('⚠️ No hay horario');
            return obtenerHorarioVacio();
        }

        // ⭐ Soportar tanto config_excep como configuracion
        const configRaw = horario.config_excep || horario.configuracion;

        if (!configRaw) {
            console.warn('⚠️ No hay config_excep ni configuracion en horario');
            return obtenerHorarioVacio();
        }

        let config;
        try {
            config = typeof configRaw === 'string' 
                ? JSON.parse(configRaw) 
                : configRaw;
        } catch (parseError) {
            console.error('❌ Error parseando configuracion:', parseError);
            console.error('❌ configuracion raw:', configRaw);
            return obtenerHorarioVacio();
        }

        console.log('📊 Configuración parseada:', config);
        console.log('📊 Keys de config:', Object.keys(config));

        // Verificar si tiene la estructura nueva (configuracion_semanal)
        if (config.configuracion_semanal) {
            console.log('✅ Usando estructura nueva (configuracion_semanal)');
            return parsearHorarioNuevo(config.configuracion_semanal);
        }

        // Estructura antigua (dias + turnos)
        if (!config.dias || !Array.isArray(config.dias)) {
            console.warn('⚠️ config.dias no es un array válido');
            console.warn('⚠️ config completo:', JSON.stringify(config, null, 2));
            return obtenerHorarioVacio();
        }

        if (!config.turnos || !Array.isArray(config.turnos)) {
            console.warn('⚠️ config.turnos no es un array válido');
            return obtenerHorarioVacio();
        }

        console.log('✅ Usando estructura antigua (dias + turnos)');

        // Mapeo de días en español a nombres completos
        const diasMap = {
            'lunes': 'Lunes',
            'martes': 'Martes',
            'miercoles': 'Miércoles',
            'jueves': 'Jueves',
            'viernes': 'Viernes',
            'sabado': 'Sábado',
            'domingo': 'Domingo'
        };

        const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
        
        return diasSemana.map(dia => {
            const diaActivo = config.dias.includes(dia);
            const turnos = config.turnos || [];
            
            return {
                day: diasMap[dia],
                active: diaActivo,
                location: diaActivo ? 'Edificio A' : 'Día de descanso',
                time: diaActivo ? formatearHorarioTurnos(turnos) : '---',
                hours: diaActivo ? calcularHorasTurnos(turnos) : '',
                turnos: diaActivo ? turnos : [],
                tipo: config.tipo || 'continuo'
            };
        });
    } catch (error) {
        console.error('❌ Error parseando horario:', error);
        console.error('❌ Error stack:', error.stack);
        return obtenerHorarioVacio();
    }
};

/**
 * Formatear turnos para mostrar (ej: "09:00 - 18:00" o "08:00-13:00 | 15:00-19:00")
 * @param {Array} turnos - Array de objetos {entrada, salida}
 * @returns {string} String formateado
 */
const formatearHorarioTurnos = (turnos) => {
    if (!turnos || turnos.length === 0) return '---';
    
    if (turnos.length === 1) {
        return `${turnos[0].entrada} - ${turnos[0].salida}`;
    }
    
    return turnos.map(t => `${t.entrada}-${t.salida}`).join(' | ');
};

/**
 * Calcular total de horas de turnos
 * @param {Array} turnos - Array de objetos {entrada, salida}
 * @returns {string} String con horas (ej: "8 horas")
 */
const calcularHorasTurnos = (turnos) => {
    if (!turnos || turnos.length === 0) return '';
    
    let totalMinutos = 0;
    
    turnos.forEach(turno => {
        if (!turno.entrada || !turno.salida) {
            console.warn('⚠️ Turno sin entrada o salida:', turno);
            return;
        }

        const [horaEntrada, minEntrada] = turno.entrada.split(':').map(Number);
        const [horaSalida, minSalida] = turno.salida.split(':').map(Number);
        
        const minutosTotalesEntrada = horaEntrada * 60 + minEntrada;
        const minutosTotalesSalida = horaSalida * 60 + minSalida;
        
        totalMinutos += minutosTotalesSalida - minutosTotalesEntrada;
    });
    
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    
    if (minutos === 0) {
        return `${horas} horas`;
    }
    
    return `${horas}h ${minutos}m`;
};

/**
 * Obtener horario vacío (sin configuración)
 * @returns {Array} Array de días vacío
 */
const obtenerHorarioVacio = () => {
    const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    return dias.map(day => ({
        day,
        active: false,
        location: 'Sin configurar',
        time: '---',
        hours: '',
        turnos: [],
        tipo: 'continuo'
    }));
};

/**
 * Calcular resumen semanal del horario
 * @param {Array} horarioParsed - Array de días parseados
 * @returns {Object} Resumen con totales
 */
export const calcularResumenSemanal = (horarioParsed) => {
    try {
        const diasActivos = horarioParsed.filter(d => d.active);
        
        let horasTotales = 0;
        diasActivos.forEach(dia => {
            if (!dia.turnos || dia.turnos.length === 0) return;

            dia.turnos.forEach(turno => {
                if (!turno.entrada || !turno.salida) return;

                const [horaEntrada, minEntrada] = turno.entrada.split(':').map(Number);
                const [horaSalida, minSalida] = turno.salida.split(':').map(Number);
                
                const minutosTotalesEntrada = horaEntrada * 60 + minEntrada;
                const minutosTotalesSalida = horaSalida * 60 + minSalida;
                
                horasTotales += (minutosTotalesSalida - minutosTotalesEntrada) / 60;
            });
        });
        
        return {
            diasLaborales: diasActivos.length,
            totalDias: horarioParsed.length,
            horasTotales: horasTotales.toFixed(1)
        };
    } catch (error) {
        console.error('❌ Error calculando resumen:', error);
        return {
            diasLaborales: 0,
            totalDias: 7,
            horasTotales: '0'
        };
    }
};

/**
 * Obtener información de entrada y salida del día actual
 * @param {Array} horarioParsed - Array de días parseados
 * @returns {Object} Info del día actual
 */
export const getInfoDiaActual = (horarioParsed) => {
    try {
        const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const hoy = new Date().getDay();
        const nombreDiaHoy = diasSemana[hoy];
        
        console.log('📅 Día actual:', nombreDiaHoy, '(', hoy, ')');
        
        const diaActual = horarioParsed.find(d => d.day === nombreDiaHoy);
        
        console.log('📅 Día encontrado:', diaActual);
        
        if (!diaActual || !diaActual.active) {
            return {
                trabaja: false,
                entrada: null,
                salida: null,
                turnos: []
            };
        }
        
        return {
            trabaja: true,
            entrada: diaActual.turnos[0]?.entrada || null,
            salida: diaActual.turnos[diaActual.turnos.length - 1]?.salida || null,
            turnos: diaActual.turnos,
            tipo: diaActual.tipo
        };
    } catch (error) {
        console.error('❌ Error obteniendo info del día:', error);
        return {
            trabaja: false,
            entrada: null,
            salida: null,
            turnos: []
        };
    }
};

// Exportar todo el servicio
export default {
    getHorarioPorEmpleado,
    getHorarioById,
    parsearHorario,
    calcularResumenSemanal,
    getInfoDiaActual
};
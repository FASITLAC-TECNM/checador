/**
 * backgroundNotificationService.js
 *
 * Notificaciones programadas de asistencia.
 * Usa SOLO expo-notifications (ya instalado y compilado) con trigger de fecha exacta.
 * El SO entrega la notificación incluso si la app está cerrada — sin necesitar
 * expo-task-manager ni expo-background-fetch.
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// ── Constantes ────────────────────────────────────────────────────────────────
const STORAGE_NOTIF_IDS_KEY = '@bg_notif_ids';
const STORAGE_SCHEDULED_DATE_KEY = '@bg_notif_date';

// Minutos antes de la ventana de entrada/salida para avisar
const MINUTOS_AVISO = 5;

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Inicializar — no-op (no hay módulos nativos extra que registrar).
 * Mantenemos la función para que App.jsx no necesite cambios.
 */
export async function initBackgroundNotifications() {
    // expo-notifications ya se inicializa en initNotifications()
    // No se requiere nada adicional.
}

/**
 * Programar notificaciones del día para entrada y salida.
 * El SO las entrega aunque la app esté cerrada.
 *
 * @param {string} empleadoId
 * @param {Object} tolerancia  — con minutos_anticipado_max
 * @param {Object} horarioHoy  — { turnos: [{entrada:'HH:MM', salida:'HH:MM'}] }
 */
export async function scheduleAttendanceNotifications(empleadoId, tolerancia, horarioHoy) {
    try {
        if (!empleadoId || !horarioHoy?.turnos?.length) return;

        const hoy = new Date().toISOString().split('T')[0];

        // No re-programar si ya se hizo hoy
        const ultimaFecha = await AsyncStorage.getItem(STORAGE_SCHEDULED_DATE_KEY);
        if (ultimaFecha === hoy) return;

        // Cancelar notificaciones anteriores
        await cancelarNotificacionesProgramadas();

        const idsNuevos = [];

        for (const turno of horarioHoy.turnos) {
            // ── Notificación de ENTRADA ────────────────────────────────────
            const entradaId = await _programarNotificacion({
                hora: turno.entrada,
                offsetMinutos: -MINUTOS_AVISO,
                titulo: '🕐 Hora de registrar tu entrada',
                cuerpo: `Tu ventana de entrada abre en ${MINUTOS_AVISO} min. ¡No olvides registrarte!`,
                data: { tipo: 'entrada' },
            });
            if (entradaId) idsNuevos.push(entradaId);

            // ── Notificación EN la hora de entrada ────────────────────────
            const entradaPuntualId = await _programarNotificacion({
                hora: turno.entrada,
                offsetMinutos: 0,
                titulo: '¡Es hora de registrar tu entrada!',
                cuerpo: 'Abre la app y registra tu asistencia',
                data: { tipo: 'entrada_puntual' },
            });
            if (entradaPuntualId) idsNuevos.push(entradaPuntualId);

            // ── Notificación de SALIDA ─────────────────────────────────────
            const salidaId = await _programarNotificacion({
                hora: turno.salida,
                offsetMinutos: -MINUTOS_AVISO,
                titulo: 'Hora de registrar tu salida',
                cuerpo: `Tu turno termina en ${MINUTOS_AVISO} min`,
                data: { tipo: 'salida' },
            });
            if (salidaId) idsNuevos.push(salidaId);
        }

        // Guardar IDs para poder cancelarlas mañana
        await AsyncStorage.setItem(STORAGE_NOTIF_IDS_KEY, JSON.stringify(idsNuevos));
        await AsyncStorage.setItem(STORAGE_SCHEDULED_DATE_KEY, hoy);

    } catch (e) {
        console.warn('[BG Notif]', e.message);
    }
}

/**
 * Cancelar todas las notificaciones de asistencia que programó este servicio.
 */
export async function cancelarNotificacionesProgramadas() {
    try {
        const stored = await AsyncStorage.getItem(STORAGE_NOTIF_IDS_KEY);
        const ids = stored ? JSON.parse(stored) : [];
        for (const id of ids) {
            await Notifications.cancelScheduledNotificationAsync(id).catch(() => { });
        }
        await AsyncStorage.removeItem(STORAGE_NOTIF_IDS_KEY);
        await AsyncStorage.removeItem(STORAGE_SCHEDULED_DATE_KEY);
    } catch { /* silenciar */ }
}

/**
 * Guardar horario y tolerancia en AsyncStorage como referencia.
 * (Conservado para posible uso futuro o migración a TaskManager si se hace rebuild)
 */
export async function guardarCacheParaBackground(empleadoId, tolerancia, horarioHoy) {
    try {
        await Promise.all([
            AsyncStorage.setItem('@bg_empleado_id', String(empleadoId)),
            AsyncStorage.setItem('@bg_tolerancia_cache', JSON.stringify(tolerancia || {})),
            AsyncStorage.setItem('@bg_horario_cache', JSON.stringify(horarioHoy || {})),
        ]);
    } catch { /* silenciar */ }
}

// ── Lógica interna ────────────────────────────────────────────────────────────

/**
 * Programa una notificación a una hora específica con offset en minutos.
 * Devuelve el identifier o null si el momento ya pasó.
 */
async function _programarNotificacion({ hora, offsetMinutos, titulo, cuerpo, data }) {
    try {
        const [h, m] = hora.split(':').map(Number);
        const trigger = new Date();
        trigger.setHours(h, m + offsetMinutos, 0, 0);

        // No programar si el momento ya pasó hoy
        if (trigger <= new Date()) return null;

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title: titulo,
                body: cuerpo,
                data,
                sound: 'default',
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: trigger,
            },
            ...(Platform.OS === 'android' && { channelId: 'asistencia' }),
        });
        return id;
    } catch {
        return null;
    }
}

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@notificaciones_config';

const DEFAULTS = {
    incidencias: true,
    asistencia_entrada: true,
    asistencia_salida: true,
    asistencia_proxima: true,
    avisos: true,
};

export const NotificationsScreen = ({ darkMode, onBack }) => {
    const [config, setConfig] = useState(DEFAULTS);
    const [loading, setLoading] = useState(true);

    const styles = darkMode ? notifStylesDark : notifStyles;

    // ─── Cargar preferencias guardadas ──────────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const saved = await AsyncStorage.getItem(STORAGE_KEY);
                if (saved) setConfig({ ...DEFAULTS, ...JSON.parse(saved) });
            } catch (e) {
                console.log('[Notifications] Error cargando config:', e.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // ─── Guardar al cambiar cualquier toggle ────────────────────────────────
    const toggle = async (key) => {
        const next = { ...config, [key]: !config[key] };
        setConfig(next);
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
            console.log('[Notifications] Error guardando config:', e.message);
        }
    };

    // ─── Grupos de configuración ─────────────────────────────────────────────
    const grupos = [
        {
            id: 'incidencias',
            titulo: 'Incidencias',
            icono: 'warning',
            colorIcono: darkMode ? '#fbbf24' : '#d97706',
            bgIcono: darkMode ? '#78350f' : '#fef3c7',
            opciones: [
                {
                    key: 'incidencias',
                    titulo: 'Estado de incidencias',
                    subtitulo: 'Cuando un retardo, permiso o justificante sea aprobado o rechazado',
                },
            ],
        },
        {
            id: 'asistencia',
            titulo: 'Asistencia',
            icono: 'finger-print',
            colorIcono: darkMode ? '#60a5fa' : '#2563eb',
            bgIcono: darkMode ? '#1e3a8a' : '#dbeafe',
            opciones: [
                {
                    key: 'asistencia_entrada',
                    titulo: 'Confirmación de entrada',
                    subtitulo: 'Notificación al registrar tu entrada (puntual, retardo, etc.)',
                },
                {
                    key: 'asistencia_salida',
                    titulo: 'Confirmación de salida',
                    subtitulo: 'Notificación al registrar tu salida del turno',
                },
                {
                    key: 'asistencia_proxima',
                    titulo: 'Recordatorio de asistencia',
                    subtitulo: 'Aviso 5 minutos antes de tu hora de entrada o salida',
                },
            ],
        },
        {
            id: 'avisos',
            titulo: 'Avisos',
            icono: 'megaphone',
            colorIcono: darkMode ? '#a78bfa' : '#7c3aed',
            bgIcono: darkMode ? '#4c1d95' : '#ede9fe',
            opciones: [
                {
                    key: 'avisos',
                    titulo: 'Avisos generales',
                    subtitulo: 'Comunicados y anuncios nuevos publicados en el sistema',
                },
            ],
        },
    ];

    // ─── RENDER ──────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        onPress={onBack}
                        style={styles.backButton}
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>Notificaciones</Text>
                        <Text style={styles.headerSubtitle}>Gestiona tus alertas</Text>
                    </View>
                    <View style={styles.headerPlaceholder} />
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Info card */}
                <View style={styles.infoCard}>
                    <Ionicons
                        name="notifications"
                        size={30}
                        color={darkMode ? '#93c5fd' : '#2563eb'}
                    />
                    <Text style={styles.infoTitle}>Preferencias de notificaciones</Text>
                    <Text style={styles.infoText}>
                        Elige qué alertas quieres recibir. Puedes habilitarlas o deshabilitarlas en cualquier momento.
                    </Text>
                </View>

                {/* Grupos */}
                {grupos.map((grupo, gi) => (
                    <View key={grupo.id} style={[styles.seccion, gi < grupos.length - 1 && { marginBottom: 14 }]}>
                        {/* Encabezado de sección */}
                        <View style={styles.seccionHeader}>
                            <View style={[styles.seccionIcono, { backgroundColor: grupo.bgIcono }]}>
                                <Ionicons name={grupo.icono} size={18} color={grupo.colorIcono} />
                            </View>
                            <Text style={styles.seccionTitulo}>{grupo.titulo}</Text>
                        </View>

                        {/* Opciones */}
                        {grupo.opciones.map((op, oi) => (
                            <View key={op.key}>
                                {oi > 0 && <View style={styles.divisor} />}
                                <View style={styles.opcion}>
                                    <View style={styles.opcionTexto}>
                                        <Text style={styles.opcionTitulo}>{op.titulo}</Text>
                                        <Text style={styles.opcionSubtitulo}>{op.subtitulo}</Text>
                                    </View>
                                    <Switch
                                        value={config[op.key]}
                                        onValueChange={() => toggle(op.key)}
                                        trackColor={{ false: darkMode ? '#374151' : '#d1d5db', true: '#2563eb' }}
                                        thumbColor={config[op.key] ? '#fff' : (darkMode ? '#9ca3af' : '#f3f4f6')}
                                        ios_backgroundColor={darkMode ? '#374151' : '#d1d5db'}
                                    />
                                </View>
                            </View>
                        ))}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

// ─── ESTILOS LIGHT ───────────────────────────────────────────────────────────
const notifStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        backgroundColor: '#2563eb',
        paddingTop: Platform.OS === 'android' ? 14 : 46,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#bfdbfe',
        marginTop: 2,
    },
    headerPlaceholder: {
        width: 40,
    },
    scrollContent: {
        paddingHorizontal: 18,
        paddingTop: 16,
        paddingBottom: 90,
    },
    infoCard: {
        backgroundColor: '#dbeafe',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginBottom: 16,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginTop: 8,
        marginBottom: 5,
    },
    infoText: {
        fontSize: 13,
        color: '#4b5563',
        textAlign: 'center',
        lineHeight: 19,
    },
    seccion: {
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingHorizontal: 18,
        paddingVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        marginBottom: 0,
    },
    seccionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    seccionIcono: {
        width: 34,
        height: 34,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    seccionTitulo: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1f2937',
    },
    divisor: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 2,
    },
    opcion: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    opcionTexto: {
        flex: 1,
        marginRight: 12,
        gap: 2,
    },
    opcionTitulo: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1f2937',
    },
    opcionSubtitulo: {
        fontSize: 12,
        color: '#6b7280',
        lineHeight: 17,
    },
});

// ─── ESTILOS DARK ────────────────────────────────────────────────────────────
const notifStylesDark = StyleSheet.create({
    ...notifStyles,
    container: {
        ...notifStyles.container,
        backgroundColor: '#0f172a',
    },
    header: {
        ...notifStyles.header,
        backgroundColor: '#1e40af',
    },
    infoCard: {
        ...notifStyles.infoCard,
        backgroundColor: '#1e3a8a',
    },
    infoTitle: {
        ...notifStyles.infoTitle,
        color: '#f9fafb',
    },
    infoText: {
        ...notifStyles.infoText,
        color: '#cbd5e1',
    },
    seccion: {
        ...notifStyles.seccion,
        backgroundColor: '#1e293b',
    },
    seccionTitulo: {
        ...notifStyles.seccionTitulo,
        color: '#f9fafb',
    },
    divisor: {
        ...notifStyles.divisor,
        backgroundColor: '#334155',
    },
    opcionTitulo: {
        ...notifStyles.opcionTitulo,
        color: '#f1f5f9',
    },
    opcionSubtitulo: {
        ...notifStyles.opcionSubtitulo,
        color: '#94a3b8',
    },
});

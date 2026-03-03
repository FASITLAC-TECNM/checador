/**
 * NetworkValidatorScreen.jsx
 *
 * Pantalla de diagnóstico de red (Admin secreta).
 * Se activa con 7 taps en el ícono del header del AdminScreen.
 *
 * Muestra:
 *  - Conectividad con el servidor y latencia
 *  - Segmentos de red configurados por la empresa
 *  - Nota: la validación real de IP la hace el servidor al registrar
 */

import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Platform,
    StatusBar,
    RefreshControl,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { verificarRedDispositivo } from '../../services/networkService';

export const NetworkValidatorScreen = ({ userData, darkMode, onBack }) => {
    const [loading, setLoading] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const s = darkMode ? stylesDark : styles;

    const verificar = useCallback(async () => {
        setLoading(true);
        setResultado(null);
        try {
            const res = await verificarRedDispositivo(userData.token);
            setResultado(res);
        } catch (e) {
            setResultado({
                conectado: false,
                segmentos_configurados: [],
                latencia_ms: null,
                message: e.message || 'Error desconocido',
            });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [userData.token]);

    const onRefresh = () => {
        setRefreshing(true);
        verificar();
    };

    const getStatusColor = () => {
        if (resultado === null) return '#6b7280';
        return resultado.conectado ? '#10b981' : '#ef4444';
    };
    const getStatusIcon = () => {
        if (resultado === null) return 'wifi-outline';
        return resultado.conectado ? 'cloud-done-outline' : 'cloud-offline-outline';
    };
    const getStatusText = () => {
        if (resultado === null) return 'Sin verificar';
        return resultado.is_ip_valida ? 'Conectado y Autorizado' : 'Conectado — IP Fuera de Red';
    };

    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" backgroundColor={darkMode ? '#1e40af' : '#2563eb'} />

            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
                    <Icon name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={s.headerText}>
                    <Text style={s.headerTitle}>Diagnóstico de Red</Text>
                    <Text style={s.headerSub}>Panel interno · privado</Text>
                </View>
                <View style={s.lockBadge}>
                    <Icon name="lock-closed" size={14} color="#c4b5fd" />
                </View>
            </View>

            <ScrollView
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={darkMode ? '#a78bfa' : '#7c3aed'}
                    />
                }
            >
                {/* Status Card */}
                <View style={[s.statusCard, { borderColor: getStatusColor() }]}>
                    <View style={[s.statusIconWrap, { backgroundColor: getStatusColor() + '22' }]}>
                        <Icon name={getStatusIcon()} size={36} color={getStatusColor()} />
                    </View>
                    <Text style={[s.statusLabel, { color: getStatusColor() }]}>
                        {getStatusText()}
                    </Text>
                    {resultado?.message && (
                        <Text style={s.statusMessage}>{resultado.message}</Text>
                    )}
                    {resultado?.ip_cliente !== undefined && (
                        <View style={s.ipCard}>
                            <Text style={s.ipLabel}>IP Detectada:</Text>
                            <Text style={s.ipValue}>{resultado.ip_cliente || 'Desconocida'}</Text>
                        </View>
                    )}
                    {resultado?.latencia_ms !== null && resultado?.latencia_ms !== undefined && (
                        <Text style={s.latencia}>
                            Latencia: <Text style={s.latenciaVal}>{resultado.latencia_ms} ms</Text>
                        </Text>
                    )}
                </View>

                {/* Botón verificar */}
                <TouchableOpacity
                    style={[s.verifyBtn, loading && s.verifyBtnDisabled]}
                    onPress={verificar}
                    activeOpacity={0.8}
                    disabled={loading}
                >
                    {loading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Icon name="refresh" size={18} color="#fff" />
                    }
                    <Text style={s.verifyBtnText}>
                        {loading ? 'Verificando...' : 'Verificar Conexión'}
                    </Text>
                </TouchableOpacity>

                {/* Segmentos de red configurados */}
                {resultado && (
                    <View style={s.section}>
                        <Text style={s.sectionTitle}>
                            Segmentos de red configurados ({resultado.segmentos_configurados?.length || 0})
                        </Text>
                        {!resultado.segmentos_configurados?.length ? (
                            <View style={s.emptyBox}>
                                <Icon name="information-circle-outline" size={18} color={darkMode ? '#9ca3af' : '#6b7280'} />
                                <Text style={s.emptyText}>
                                    Sin restricción de red — cualquier IP puede registrar asistencia
                                </Text>
                            </View>
                        ) : (
                            resultado.segmentos_configurados.map((cidr, idx) => (
                                <View key={idx} style={s.cidrRow}>
                                    <Icon name="server-outline" size={14} color={darkMode ? '#a78bfa' : '#7c3aed'} />
                                    <Text style={s.cidrText}>{cidr}</Text>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* Info del dispositivo */}
                <View style={s.section}>
                    <Text style={s.sectionTitle}>Info del Dispositivo</Text>
                    <View style={s.infoRow}>
                        <Icon name="phone-portrait-outline" size={16} color={darkMode ? '#a78bfa' : '#7c3aed'} />
                        <Text style={s.infoValue}>
                            SO: <Text style={s.infoAccent}>
                                {Platform.OS === 'android' ? 'Android' : 'iOS'} {Platform.Version}
                            </Text>
                        </Text>
                    </View>
                    <View style={s.infoRow}>
                        <Icon name="person-outline" size={16} color={darkMode ? '#a78bfa' : '#7c3aed'} />
                        <Text style={s.infoValue}>
                            Empleado ID: <Text style={s.infoAccent}>{userData?.empleado_id || 'N/A'}</Text>
                        </Text>
                    </View>
                </View>

                {/* Nota informativa */}
                <View style={s.note}>
                    <Icon name="shield-checkmark-outline" size={14} color={darkMode ? '#c4b5fd' : '#5b21b6'} />
                    <Text style={s.noteText}>
                        La validación real de IP/segmento se realiza en el servidor al momento de registrar asistencia usando la IP pública que llega a él.
                    </Text>
                </View>

                <View style={s.notePrivate}>
                    <Text style={s.notePrivateText}>
                        🔒 Pantalla de diagnóstico interno. Acceso por 7 taps en el ícono del adminestrador.
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
};

// ── Light ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        backgroundColor: '#2563eb',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight + 10 : 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    headerSub: { fontSize: 11, color: '#bfdbfe', marginTop: 2 },
    lockBadge: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.12)',
        justifyContent: 'center', alignItems: 'center',
    },
    scroll: { flex: 1 },
    scrollContent: { padding: 20, gap: 16 },
    statusCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 2,
        padding: 24,
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
        elevation: 3,
    },
    statusIconWrap: {
        width: 72, height: 72, borderRadius: 36,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 4,
    },
    statusLabel: { fontSize: 22, fontWeight: '800' },
    statusMessage: { fontSize: 13, color: '#6b7280', textAlign: 'center' },
    latencia: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
    latenciaVal: { fontWeight: '700', color: '#374151' },
    ipCard: {
        backgroundColor: '#f3f4f6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        flexDirection: 'row',
        gap: 6,
        marginTop: 4,
        alignItems: 'center'
    },
    ipLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
    ipValue: { fontSize: 13, color: '#111827', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '700' },
    verifyBtn: {
        backgroundColor: '#2563eb',
        borderRadius: 14,
        paddingVertical: 14,
        paddingHorizontal: 24,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    verifyBtnDisabled: { opacity: 0.6 },
    verifyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    section: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    infoValue: { fontSize: 14, color: '#374151' },
    infoAccent: { fontWeight: '700', color: '#2563eb' },
    cidrRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#eff6ff', borderRadius: 8, padding: 10,
    },
    cidrText: { fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#374151', flex: 1 },
    emptyBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        backgroundColor: '#f9fafb', padding: 12, borderRadius: 10,
    },
    emptyText: { fontSize: 13, color: '#6b7280', flex: 1, lineHeight: 18 },
    note: {
        backgroundColor: '#eff6ff', borderRadius: 12, padding: 14,
        flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    },
    noteText: { fontSize: 12, color: '#1d4ed8', lineHeight: 18, flex: 1 },
    notePrivate: {
        backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12,
        borderWidth: 1, borderColor: '#bbf7d0',
    },
    notePrivateText: { fontSize: 11, color: '#166534', textAlign: 'center' },
});

// ── Dark ────────────────────────────────────────────────────────────────────
const stylesDark = StyleSheet.create({
    ...styles,
    container: { ...styles.container, backgroundColor: '#0f172a' },
    header: { ...styles.header, backgroundColor: '#1e40af' },
    statusCard: { ...styles.statusCard, backgroundColor: '#1e293b' },
    statusMessage: { ...styles.statusMessage, color: '#9ca3af' },
    latencia: { ...styles.latencia, color: '#6b7280' },
    latenciaVal: { ...styles.latenciaVal, color: '#e5e7eb' },
    ipCard: { ...styles.ipCard, backgroundColor: '#1e3a8a' },
    ipLabel: { ...styles.ipLabel, color: '#9ca3af' },
    ipValue: { ...styles.ipValue, color: '#e5e7eb' },
    verifyBtn: { ...styles.verifyBtn, backgroundColor: '#1d4ed8' },
    section: { ...styles.section, backgroundColor: '#1e293b' },
    sectionTitle: { ...styles.sectionTitle, color: '#9ca3af' },
    infoValue: { ...styles.infoValue, color: '#e5e7eb' },
    infoAccent: { ...styles.infoAccent, color: '#60a5fa' },
    cidrRow: { ...styles.cidrRow, backgroundColor: '#1e3a8a' },
    cidrText: { ...styles.cidrText, color: '#e5e7eb' },
    emptyBox: { ...styles.emptyBox, backgroundColor: '#1e293b' },
    emptyText: { ...styles.emptyText, color: '#9ca3af' },
    note: { ...styles.note, backgroundColor: '#1e3a8a' },
    noteText: { ...styles.noteText, color: '#bfdbfe' },
    notePrivate: { ...styles.notePrivate, backgroundColor: '#052e16', borderColor: '#166534' },
    notePrivateText: { ...styles.notePrivateText, color: '#4ade80' },
});

import React, { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Platform,
    StatusBar,
    TextInput,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    getCredencialesByEmpleado,
    guardarPin,
    guardarDactilar,
    guardarFacial,
    eliminarCredencial,
} from '../../services/credencialesService';
import {
    checkBiometricSupport,
} from '../../services/biometricservice';
import { PinInputModal } from '../settingsPages/PinModal';

// ─── Estado visual ─────────────────────────────────────────────────────────────
const ESTADOS = {
    activo: {
        bg: '#16a34a', texto: '#fff', etiqueta: 'Habilitada', icono: 'checkmark-circle',
    },
    inactivo: {
        bg: '#6b7280', texto: '#fff', etiqueta: 'Sin registrar', icono: 'ellipse-outline',
    },
};

// ─── Componente principal ──────────────────────────────────────────────────────
export const AdminCredencialesScreen = ({ empleado, userData, darkMode, onBack }) => {
    const [hasFingerprint, setHasFingerprint] = useState(false);
    const [hasFacial, setHasFacial] = useState(false);
    const [hasPin, setHasPin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [biometricSupport, setBiometricSupport] = useState(null);

    // Procesando estados
    const [procesandoHuella, setProcesandoHuella] = useState(false);
    const [procesandoFacial, setProcesandoFacial] = useState(false);
    const [procesandoPin, setProcesandoPin] = useState(false);
    const [showPinModal, setShowPinModal] = useState(false);
    const [showFacialCapture, setShowFacialCapture] = useState(false);

    const styles = darkMode ? darkStyles : lightStyles;

    const cargarCredenciales = useCallback(async () => {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem('userToken');
            const res = await getCredencialesByEmpleado(empleado.id, token);
            setHasFingerprint(res.data?.tiene_dactilar || false);
            setHasFacial(res.data?.tiene_facial || false);
            setHasPin(res.data?.tiene_pin || false);
        } catch {
            // No lanzar error visual — podría ser 404 (sin credenciales)
        } finally {
            setLoading(false);
        }
    }, [empleado.id]);

    useEffect(() => {
        const init = async () => {
            try {
                const support = await checkBiometricSupport();
                setBiometricSupport(support);
            } catch { }
            await cargarCredenciales();
        };
        init();
    }, [cargarCredenciales]);

    const getEstado = (tiene) => (tiene ? ESTADOS.activo : ESTADOS.inactivo);

    // ─── Acciones ──────────────────────────────────────────────────────────────

    const handleRegistrarHuella = async () => {
        Alert.alert(
            hasFingerprint ? 'Actualizar Huella' : 'Registro de Huella',
            'Las huellas dactilares únicamente se administran de forma segura desde la aplicación de Computadora (Desktop).\n\nEn la aplicación móvil solo se utiliza para validación biométrica local.'
        );
    };

    const handleRegistrarFacial = () => {
        Alert.alert(
            hasFacial ? 'Actualizar Facial' : 'Registro Facial',
            'El registro o actualización facial únicamente puede realizarse de forma segura desde la aplicación de Escritorio/Computadora o Web.\n\nEn la aplicación móvil solo se utiliza para validación biométrica local al checar.'
        );
    };

    const handleRegistrarPin = () => {
        setShowPinModal(true);
    };

    const handleConfirmarPin = async (pin) => {
        setShowPinModal(false);
        setProcesandoPin(true);
        try {
            const token = await AsyncStorage.getItem('userToken');
            await guardarPin(empleado.id, pin, token);
            Alert.alert('Éxito', 'PIN registrado correctamente.');
            await cargarCredenciales();
        } catch (e) {
            Alert.alert('Error', e.message || 'No se pudo guardar el PIN.');
        } finally {
            setProcesandoPin(false);
        }
    };

    const handleEliminar = (tipo, label) => {
        Alert.alert(
            `Eliminar ${label}`,
            `¿Eliminar la credencial de ${label.toLowerCase()} de ${empleado.nombre}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const token = await AsyncStorage.getItem('userToken');
                            await eliminarCredencial(empleado.id, tipo, token);
                            Alert.alert('Eliminado', `${label} eliminada correctamente.`);
                            await cargarCredenciales();
                        } catch (e) {
                            Alert.alert('Error', e.message || 'No se pudo eliminar la credencial.');
                        }
                    },
                },
            ]
        );
    };

    // ─── Tarjeta de credencial ─────────────────────────────────────────────────
    const CredencialCard = ({ tipo, label, icono, tiene, onRegistrar, onEliminar, procesando }) => {
        const estado = getEstado(tiene);
        return (
            <View style={styles.credCard}>
                <View style={styles.credHeader}>
                    <View style={[styles.credIconWrap, { backgroundColor: tiene ? '#dcfce7' : (darkMode ? '#374151' : '#f3f4f6') }]}>
                        <Ionicons name={icono} size={24} color={tiene ? '#16a34a' : (darkMode ? '#9ca3af' : '#6b7280')} />
                    </View>
                    <View style={styles.credInfo}>
                        <Text style={styles.credLabel}>{label}</Text>
                        <View style={[styles.estadoBadge, { backgroundColor: estado.bg }]}>
                            <Ionicons name={estado.icono} size={11} color={estado.texto} />
                            <Text style={[styles.estadoText, { color: estado.texto }]}>{estado.etiqueta}</Text>
                        </View>
                    </View>
                    {procesando && <ActivityIndicator size="small" color="#2563eb" />}
                </View>

                <View style={styles.credActions}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnPrimary]}
                        onPress={onRegistrar}
                        disabled={procesando}
                    >
                        <Ionicons name={tiene ? 'refresh' : 'add'} size={15} color="#fff" />
                        <Text style={styles.actionBtnTextPrimary}>{tiene ? 'Actualizar' : 'Registrar'}</Text>
                    </TouchableOpacity>

                    {tiene && (
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnDanger]}
                            onPress={() => onEliminar(tipo, label)}
                            disabled={procesando}
                        >
                            <Ionicons name="trash-outline" size={15} color="#dc2626" />
                            <Text style={styles.actionBtnTextDanger}>Eliminar</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={darkMode ? '#1e40af' : '#2563eb'} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{empleado.nombre}</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>{empleado.correo}</Text>
                </View>
                <TouchableOpacity onPress={cargarCredenciales} style={styles.backBtn}>
                    <Ionicons name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text style={styles.loadingText}>Cargando credenciales...</Text>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <Text style={styles.sectionLabel}>Credenciales registradas</Text>

                    {/* Huella */}
                    <CredencialCard
                        tipo="dactilar"
                        label="Huella Dactilar"
                        icono="finger-print"
                        tiene={hasFingerprint}
                        procesando={procesandoHuella}
                        onRegistrar={handleRegistrarHuella}
                        onEliminar={handleEliminar}
                    />

                    {/* Facial */}
                    <CredencialCard
                        tipo="facial"
                        label="Facial"
                        icono="scan"
                        tiene={hasFacial}
                        procesando={procesandoFacial}
                        onRegistrar={handleRegistrarFacial}
                        onEliminar={handleEliminar}
                    />

                    {/* PIN */}
                    <CredencialCard
                        tipo="pin"
                        label="PIN"
                        icono="keypad"
                        tiene={hasPin}
                        procesando={procesandoPin}
                        onRegistrar={handleRegistrarPin}
                        onEliminar={handleEliminar}
                    />

                    <View style={styles.infoBox}>
                        <Ionicons name="information-circle-outline" size={16} color={darkMode ? '#93c5fd' : '#2563eb'} />
                        <Text style={styles.infoText}>
                            El reconocimiento facial requiere que el empleado lo registre desde su propio dispositivo.
                        </Text>
                    </View>
                </ScrollView>
            )}

            {/* Modal PIN */}
            <PinInputModal
                visible={showPinModal}
                onClose={() => setShowPinModal(false)}
                onConfirm={handleConfirmarPin}
                darkMode={darkMode}
            />

            {/* Modal Facial */}
            {showFacialCapture && (
                <FacialCaptureScreen
                    onCapture={handleFacialCapture}
                    onCancel={() => setShowFacialCapture(false)}
                    darkMode={darkMode}
                />
            )}
        </View>
    );
};

// ─── Component Styles ─────────────────────────────────────────────────────────
const baseStyles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        paddingTop: Platform.OS === 'android' ? 16 : 50,
        paddingBottom: 16, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
    headerSubtitle: { fontSize: 12, color: '#bfdbfe', marginTop: 1 },
    scrollContent: { padding: 16, paddingBottom: 80 },
    sectionLabel: {
        fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
        letterSpacing: 0.6, marginBottom: 12,
    },
    credCard: {
        borderRadius: 16, padding: 16, marginBottom: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
    },
    credHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
    credIconWrap: {
        width: 46, height: 46, borderRadius: 13,
        justifyContent: 'center', alignItems: 'center',
    },
    credInfo: { flex: 1 },
    credLabel: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
    estadoBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        alignSelf: 'flex-start', borderRadius: 6,
        paddingHorizontal: 8, paddingVertical: 2,
    },
    estadoText: { fontSize: 11, fontWeight: '600' },
    credActions: { flexDirection: 'row', gap: 10 },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flex: 1,
        justifyContent: 'center',
    },
    actionBtnPrimary: { backgroundColor: '#2563eb' },
    actionBtnTextPrimary: { color: '#fff', fontSize: 13, fontWeight: '600' },
    actionBtnDanger: { backgroundColor: '#fee2e2' },
    actionBtnTextDanger: { color: '#dc2626', fontSize: 13, fontWeight: '600' },
    infoBox: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        borderRadius: 12, padding: 14,
        borderWidth: 1, marginTop: 4,
    },
    infoText: { flex: 1, fontSize: 12, lineHeight: 17 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, gap: 12 },
    loadingText: { fontSize: 14, marginTop: 8 },
});

const lightStyles = StyleSheet.create({
    ...baseStyles,
    container: { ...baseStyles.container, backgroundColor: '#f8fafc' },
    header: { ...baseStyles.header, backgroundColor: '#2563eb' },
    sectionLabel: { ...baseStyles.sectionLabel, color: '#6b7280' },
    credCard: { ...baseStyles.credCard, backgroundColor: '#fff' },
    credLabel: { ...baseStyles.credLabel, color: '#111827' },
    infoBox: { ...baseStyles.infoBox, backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
    infoText: { ...baseStyles.infoText, color: '#1d4ed8' },
    loadingText: { ...baseStyles.loadingText, color: '#6b7280' },
});

const darkStyles = StyleSheet.create({
    ...baseStyles,
    container: { ...baseStyles.container, backgroundColor: '#0f172a' },
    header: { ...baseStyles.header, backgroundColor: '#1e40af' },
    sectionLabel: { ...baseStyles.sectionLabel, color: '#9ca3af' },
    credCard: { ...baseStyles.credCard, backgroundColor: '#1f2937' },
    credLabel: { ...baseStyles.credLabel, color: '#f9fafb' },
    actionBtnDanger: { ...baseStyles.actionBtnDanger, backgroundColor: '#3b1a1a' },
    infoBox: { ...baseStyles.infoBox, backgroundColor: '#1e3a8a', borderColor: '#1d4ed8' },
    infoText: { ...baseStyles.infoText, color: '#93c5fd' },
    loadingText: { ...baseStyles.loadingText, color: '#9ca3af' },
});

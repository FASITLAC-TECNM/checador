import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Platform,
    StatusBar,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UsuariosCredencialesScreen } from './UsuariosCredencialesScreen';

export const AdminScreen = ({ userData, darkMode }) => {
    const [subScreen, setSubScreen] = useState(null); // null | 'credenciales' | 'network-validator'

    const styles = darkMode ? adminStylesDark : adminStyles;

    if (subScreen === 'credenciales') {
        return (
            <UsuariosCredencialesScreen
                userData={userData}
                darkMode={darkMode}
                onBack={() => setSubScreen(null)}
            />
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={darkMode ? '#1e40af' : '#2563eb'}
            />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerIconWrap}>
                    <Ionicons name="shield-checkmark" size={26} color="#fff" />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Panel Administrador</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                        {userData?.nombre || 'Administrador'}
                    </Text>
                </View>
            </View>

            {/* Sección única: Credenciales */}
            <View style={styles.body}>
                <Text style={styles.sectionLabel}>Gestión</Text>

                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.75}
                    onPress={() => setSubScreen('credenciales')}
                >
                    <View style={styles.cardLeft}>
                        <View style={styles.iconWrap}>
                            <Ionicons name="finger-print" size={28} color={darkMode ? '#60a5fa' : '#2563eb'} />
                        </View>
                        <View style={styles.cardText}>
                            <Text style={styles.cardTitle}>Credenciales</Text>
                            <Text style={styles.cardDesc}>
                                Gestiona huellas, facial y PIN de los usuarios
                            </Text>
                        </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={darkMode ? '#6b7280' : '#9ca3af'} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

// ─── Light ────────────────────────────────────────────────
const adminStyles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        backgroundColor: '#2563eb',
        paddingTop: Platform.OS === 'android' ? 16 : 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    headerIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: { flex: 1 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: '#bfdbfe', marginTop: 2 },
    body: { flex: 1, padding: 20 },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 2,
    },
    cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
    iconWrap: {
        width: 50,
        height: 50,
        borderRadius: 14,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardText: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 3 },
    cardDesc: { fontSize: 12, color: '#6b7280', lineHeight: 16 },
});

// ─── Dark ─────────────────────────────────────────────────
const adminStylesDark = StyleSheet.create({
    ...adminStyles,
    container: { ...adminStyles.container, backgroundColor: '#0f172a' },
    header: { ...adminStyles.header, backgroundColor: '#1e40af' },
    sectionLabel: { ...adminStyles.sectionLabel, color: '#9ca3af' },
    card: { ...adminStyles.card, backgroundColor: '#1f2937' },
    cardTitle: { ...adminStyles.cardTitle, color: '#f9fafb' },
    cardDesc: { ...adminStyles.cardDesc, color: '#9ca3af' },
    iconWrap: { ...adminStyles.iconWrap, backgroundColor: '#1e3a8a' },
});

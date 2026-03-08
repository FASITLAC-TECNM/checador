import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Platform,
    Image,
    Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import getApiEndpoint from '../../config/api.js';

// Paleta de acentos — rota por índice para dar identidad visual a cada empresa
const ACCENTS = [
    { strip: '#2563eb', bg: '#eff6ff', text: '#1d4ed8', initBg: '#bfdbfe' },
    { strip: '#7c3aed', bg: '#fdf4ff', text: '#6d28d9', initBg: '#ddd6fe' },
    { strip: '#059669', bg: '#ecfdf5', text: '#047857', initBg: '#a7f3d0' },
    { strip: '#d97706', bg: '#fffbeb', text: '#b45309', initBg: '#fde68a' },
    { strip: '#db2777', bg: '#fdf2f8', text: '#be185d', initBg: '#fbcfe8' },
    { strip: '#0891b2', bg: '#ecfeff', text: '#0e7490', initBg: '#a5f3fc' },
];

const obtenerUrlLogo = (logo) => {
    if (!logo) return null;
    if (logo.startsWith('data:image/') || logo.startsWith('http://') || logo.startsWith('https://')) return logo;
    const cleanPath = logo.startsWith('/') ? logo.substring(1) : logo;
    return getApiEndpoint(`/${cleanPath}`);
};

const EmpresaRow = ({ item, index, onSelect }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(16)).current;
    const accent = ACCENTS[index % ACCENTS.length];

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 55, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 55, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <TouchableOpacity
                style={styles.empresaCard}
                activeOpacity={0.75}
                onPress={() => onSelect(item.empresa_id)}
            >
                {/* Barra de color lateral */}
                <View style={[styles.accentStrip, { backgroundColor: accent.strip }]} />

                {/* Logo / Iniciales */}
                <View style={[styles.logoWrap, { backgroundColor: accent.bg }]}>
                    {item.logo ? (
                        <Image
                            source={{ uri: obtenerUrlLogo(item.logo) }}
                            style={styles.logoImg}
                            resizeMode="contain"
                        />
                    ) : (
                        <View style={[styles.initBox, { backgroundColor: accent.initBg }]}>
                            <Text style={[styles.initText, { color: accent.text }]}>
                                {item.nombre.substring(0, 2).toUpperCase()}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Textos */}
                <View style={styles.cardBody}>
                    <Text style={styles.cardNombre} numberOfLines={1}>{item.nombre}</Text>
                    <Text style={styles.cardHint}>Toca para ingresar</Text>
                </View>

                {/* Flecha */}
                <View style={[styles.arrowBox, { backgroundColor: accent.bg }]}>
                    <Ionicons name="chevron-forward" size={18} color={accent.strip} />
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export const SeleccionEmpresaScreen = ({ empresasList, onSelect, onCancel }) => {
    // Orden alfabético estable sin importar lo que devuelva el backend
    const empresasOrdenadas = [...(empresasList || [])].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );

    return (
        <View style={styles.container}>
            {/* ── Header ── */}
            <View style={styles.headerWrapper}>
                <View style={styles.header}>
                    <SafeAreaView edges={['top']} style={{ flex: 0 }}>
                        <View style={styles.headerTop}>
                            <View style={styles.headerLeft}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={onCancel}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="chevron-back" size={28} color="#ffffff" />
                                </TouchableOpacity>
                                <View style={styles.headerInfo}>
                                    <Text style={styles.headerSubtitle}>Autenticación</Text>
                                    <Text style={styles.headerTitle}>Múltiples empresas detectadas</Text>
                                </View>
                            </View>
                        </View>
                    </SafeAreaView>
                </View>
            </View>

            {/* ── Contenido ── */}
            <View style={styles.content}>
                <View style={styles.mainCard}>
                    {/* Ícono + título */}
                    <View style={styles.topSection}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="business" size={36} color="#2563eb" />
                        </View>
                        <View style={styles.topText}>
                            <Text style={styles.title}>Selecciona tu Empresa</Text>
                        </View>
                    </View>

                    <Text style={styles.description}>
                        Elige a cuál sistema deseas ingresar en este momento.
                    </Text>

                    {/* Lista — flex:1 garantiza scroll si hay muchas empresas */}
                    <FlatList
                        data={empresasOrdenadas}
                        keyExtractor={(item) => item.empresa_id.toString()}
                        showsVerticalScrollIndicator={false}
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.listContainer}
                        ItemSeparatorComponent={() => <View style={styles.separator} />}
                        renderItem={({ item, index }) => (
                            <EmpresaRow item={item} index={index} onSelect={onSelect} />
                        )}
                        ListFooterComponent={() => (
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={onCancel}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="arrow-back-outline" size={16} color="#64748b" />
                                <Text style={styles.cancelBtnText}>Volver al login</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f1f5f9',
    },

    /* ── Header ── */
    headerWrapper: { backgroundColor: '#2563eb' },
    header: {
        backgroundColor: '#2563eb',
        paddingTop: Platform.OS === 'android' ? 16 : 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
    },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    headerInfo: { flex: 1 },
    headerSubtitle: { fontSize: 12, color: '#bfdbfe', fontWeight: '500' },
    headerTitle: { fontSize: 19, fontWeight: '700', color: '#fff', marginTop: 2 },

    /* ── Contenido ── */
    content: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    mainCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },

    /* Encabezado de la card */
    topSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 8,
    },
    iconCircle: {
        width: 58,
        height: 58,
        borderRadius: 18,
        backgroundColor: '#eff6ff',
        borderWidth: 1.5,
        borderColor: '#bfdbfe',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topText: { flex: 1 },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: 5,
    },

    description: {
        fontSize: 13,
        color: '#94a3b8',
        marginBottom: 16,
        lineHeight: 19,
    },

    /* Lista */
    listContainer: { paddingBottom: 8 },
    separator: { height: 10 },

    /* Card empresa */
    empresaCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    accentStrip: {
        width: 5,
        alignSelf: 'stretch',
    },
    logoWrap: {
        width: 54,
        height: 54,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 12,
        borderRadius: 12,
        flexShrink: 0,
    },
    logoImg: { width: '75%', height: '75%' },
    initBox: {
        width: 46,
        height: 46,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    initText: {
        fontSize: 18,
        fontWeight: '800',
    },
    cardBody: {
        flex: 1,
        paddingVertical: 14,
        paddingRight: 4,
    },
    cardNombre: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 2,
    },
    cardHint: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '500',
    },
    arrowBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        flexShrink: 0,
    },

    /* Botón volver */
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
        paddingVertical: 13,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    cancelBtnText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '700',
    },
});

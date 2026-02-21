import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, Animated,
    StatusBar, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * DeviceDisabledScreen
 * Pantalla de "Nodo Deshabilitado" que se muestra cuando el administrador
 * desactiva el dispositivo móvil. Inspirada visualmente en MaintenanceScreen
 * pero con acento rojo y semántica de bloqueo de dispositivo.
 *
 * @param {function} onReRequest - Callback para re-solicitar acceso (vuelve al onboarding)
 * @param {boolean}  darkMode    - Tema oscuro
 */
const DeviceDisabledScreen = ({ onReRequest, darkMode = false }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const [confirming, setConfirming] = useState(false);

    // Entrada de la tarjeta
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 55,
                friction: 10,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulso suave del ícono
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
            ])
        );
        pulse.start();
        return () => pulse.stop();
    }, []);

    const handleReRequest = () => {
        if (confirming) return;
        setConfirming(true);
        // Pequeño delay para feedback visual antes de navegar
        setTimeout(() => {
            setConfirming(false);
            onReRequest?.();
        }, 400);
    };

    const dm = darkMode;
    const colors = {
        bg: dm ? '#111827' : '#f3f4f6',
        card: dm ? '#1f2937' : '#ffffff',
        cardBorder: dm ? '#374151' : '#e5e7eb',
        title: dm ? '#f9fafb' : '#111827',
        subtitle: dm ? '#9ca3af' : '#4b5563',
        statusBg: dm ? 'rgba(185,28,28,0.15)' : '#fef2f2',
        statusBorder: dm ? 'rgba(185,28,28,0.35)' : '#fecaca',
        statusText: dm ? '#f87171' : '#b91c1c',
        retryBg: dm ? '#1d4ed8' : '#2563eb',
        retryText: '#ffffff',
        footer: dm ? '#4b5563' : '#9ca3af',
        iconBg: dm ? 'rgba(239,68,68,0.18)' : '#fee2e2',
        badgeBg: dm ? '#374151' : '#ffffff',
        stripeBg: dm ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.07)',
        stripeColor: dm ? 'rgba(239,68,68,0.03)' : 'rgba(239,68,68,0.09)',
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar
                barStyle={dm ? 'light-content' : 'dark-content'}
                backgroundColor={colors.bg}
            />

            <Animated.View style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.cardBorder,
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                }
            ]}>
                {/* Franja roja superior */}
                <View style={styles.topBar} />

                {/* Franjas diagonales decorativas */}
                <View style={[styles.stripesContainer, { backgroundColor: colors.stripeBg }]}>
                    {[...Array(20)].map((_, i) => (
                        <View key={i} style={[styles.stripe, {
                            left: -10 + i * 20,
                            backgroundColor: colors.stripeColor,
                        }]} />
                    ))}
                </View>

                {/* Cuerpo */}
                <View style={styles.cardBody}>
                    {/* Ícono */}
                    <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.iconBg }]}>
                            <Ionicons name="phone-portrait" size={38} color="#ef4444" />
                        </View>
                        {/* Badge de bloqueo */}
                        <View style={[styles.iconBadge, {
                            borderColor: colors.card,
                            backgroundColor: colors.badgeBg,
                        }]}>
                            <Ionicons name="ban" size={14} color="#dc2626" />
                        </View>
                    </Animated.View>

                    {/* Textos */}
                    <Text style={[styles.title, { color: colors.title }]}>
                        Nodo Deshabilitado
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.subtitle }]}>
                        Este dispositivo ha sido desactivado por el administrador del sistema y ya no cuenta con acceso autorizado.{'\n\n'}Contacta a tu administrador o solicita nuevamente el acceso.
                    </Text>

                    {/* Status indicator */}
                    <View style={[styles.statusRow, { backgroundColor: colors.statusBg, borderColor: colors.statusBorder }]}>
                        <Ionicons name="shield-checkmark" size={18} color={colors.statusText} />
                        <Text style={[styles.statusText, { color: colors.statusText }]}>
                            Acceso revocado por política de seguridad
                        </Text>
                    </View>

                    {/* Botón Re-solicitar */}
                    <TouchableOpacity
                        style={[styles.retryBtn, { backgroundColor: colors.retryBg, opacity: confirming ? 0.7 : 1 }]}
                        onPress={handleReRequest}
                        activeOpacity={0.8}
                        disabled={confirming}
                    >
                        <Ionicons name="refresh" size={18} color={colors.retryText} />
                        <Text style={[styles.retryText, { color: colors.retryText }]}>
                            {confirming ? 'Redirigiendo...' : 'Re-solicitar Acceso'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Footer */}
            <Animated.Text style={[styles.footer, { color: colors.footer, opacity: fadeAnim }]}>
                FASITLAC © {new Date().getFullYear()}
            </Animated.Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        maxWidth: 380,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 10,
    },
    topBar: {
        height: 4,
        backgroundColor: '#ef4444',
        width: '100%',
    },
    stripesContainer: {
        height: 52,
        width: '100%',
        flexDirection: 'row',
        overflow: 'hidden',
    },
    stripe: {
        position: 'absolute',
        top: -20,
        width: 12,
        height: 120,
        transform: [{ rotate: '30deg' }],
    },
    cardBody: {
        padding: 28,
        alignItems: 'center',
    },
    iconWrapper: {
        position: 'relative',
        marginBottom: 20,
        marginTop: -16,
    },
    iconCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconBadge: {
        position: 'absolute',
        bottom: -2,
        right: -4,
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: 0.2,
    },
    subtitle: {
        fontSize: 13.5,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 22,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        width: '100%',
        marginBottom: 14,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
    },
    retryText: {
        fontSize: 15,
        fontWeight: '700',
    },
    footer: {
        position: 'absolute',
        bottom: 28,
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
});

export default DeviceDisabledScreen;

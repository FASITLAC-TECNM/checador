import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';

const MaintenanceScreen = () => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Solo fade in al montar
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2d3f6b" />
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
                {/* Ícono simple, sin animaciones extra */}
                <View style={styles.iconContainer}>
                    <Text style={styles.icon}>🔧</Text>
                </View>

                {/* Título */}
                <Text style={styles.title}>Modo Mantenimiento</Text>
                <Text style={styles.subtitle}>
                    Estamos mejorando el sistema.{'\n'}
                    Por favor, vuelve más tarde.
                </Text>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Info extra */}
                <Text style={styles.infoText}>
                    Si necesitas asistencia, contacta al administrador del sistema.
                </Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#2d3f6b',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    content: {
        alignItems: 'center',
        width: '100%',
    },
    iconContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(255,255,255,0.10)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.20)',
        marginBottom: 28,
    },
    icon: {
        fontSize: 42,
    },
    title: {
        fontSize: 26,
        fontWeight: '700',
        color: '#ffffff',
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.72)',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    divider: {
        width: 60,
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
        marginBottom: 24,
    },
    infoText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.50)',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
        paddingHorizontal: 8,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#f59e0b',
    },
    statusText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
    },
});

export default MaintenanceScreen;

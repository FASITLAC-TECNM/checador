import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const ScheduleBento = ({ infoHoy, loading, darkMode }) => {
    const styles = darkMode ? bentoStylesDark : bentoStyles;
    const theme = darkMode ? darkTheme : lightTheme;

    if (loading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <Text style={styles.loadingText}>Cargando horario...</Text>
            </View>
        );
    }

    if (!infoHoy || !infoHoy.trabaja) {
        return (
            <View style={styles.container}>
                <View style={[styles.card, styles.cardLarge, { backgroundColor: theme.cardBg }]}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.inactiveIconBg }]}>
                        <Ionicons name="cafe-outline" size={32} color={theme.inactiveIcon} />
                    </View>
                    <View>
                        <Text style={styles.cardTitle}>Día Libre</Text>
                        <Text style={styles.cardSubtitle}>Hoy no tienes turnos asignados</Text>
                    </View>
                </View>
            </View>
        );
    }

    const { turnoActual, proximoTurno, totalTurnos } = infoHoy;
    const isWorking = !!turnoActual;

    // Solid colors logic
    const mainCardBg = isWorking ? theme.activeBg : theme.waitingBg;

    return (
        <View style={styles.container}>
            {/* Main Status Card - Large */}
            <View style={[styles.card, styles.cardLarge, { backgroundColor: mainCardBg }]}>
                <View style={styles.cardContentRow}>
                    <View>
                        <Text style={styles.statusLabel}>{isWorking ? 'EN TURNO' : 'PRÓXIMO TURNO'}</Text>
                        <Text style={styles.statusTime}>
                            {isWorking
                                ? `Salida: ${turnoActual.salida}`
                                : `Entrada: ${proximoTurno?.entrada || 'Finalizado'}`}
                        </Text>
                        {isWorking && (
                            <Text style={styles.statusSubTime}>Entrada: {turnoActual.entrada}</Text>
                        )}
                    </View>
                    <View style={[styles.mainIconContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                        <Ionicons
                            name={isWorking ? "briefcase-outline" : "time-outline"}
                            size={36}
                            color="#fff"
                        />
                    </View>
                </View>
            </View>

            <View style={styles.row}>
                {/* Info Card - Medium */}
                <View style={[styles.card, styles.cardMedium, { backgroundColor: theme.cardBg }]}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.infoIconBg }]}>
                        <Ionicons name="calendar-outline" size={20} color={theme.infoIcon} />
                    </View>
                    <View>
                        <Text style={styles.cardLabel}>Hoy</Text>
                        <Text style={styles.cardValue}>{new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</Text>
                    </View>
                </View>

                {/* Stats Card - Medium */}
                <View style={[styles.card, styles.cardMedium, { backgroundColor: theme.cardBg }]}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.statsIconBg }]}>
                        <Ionicons name="layers-outline" size={20} color={theme.statsIcon} />
                    </View>
                    <View>
                        <Text style={styles.cardLabel}>Turnos</Text>
                        <Text style={styles.cardValue}>{totalTurnos || 0} asignados</Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

const lightTheme = {
    cardBg: '#ffffff',
    activeBg: '#2563eb', // Solid Blue (Primary)
    waitingBg: '#334155', // Solid Slate (Dark Grey) - Professional look
    inactiveIconBg: '#f3f4f6',
    inactiveIcon: '#9ca3af',
    infoIconBg: '#dbeafe',
    infoIcon: '#2563eb',
    statsIconBg: '#f0fdfa',
    statsIcon: '#0d9488',
    textPrimary: '#1f2937',
    textSecondary: '#6b7280',
};

const darkTheme = {
    cardBg: '#1f2937',
    activeBg: '#2563eb', // "Real Blue" - keeping it bright/primary
    waitingBg: '#1e40af', // Darker Blue for waiting state
    inactiveIconBg: 'rgba(255,255,255,0.1)',
    inactiveIcon: '#9ca3af',
    infoIconBg: 'rgba(37, 99, 235, 0.2)',
    infoIcon: '#60a5fa',
    statsIconBg: 'rgba(13, 148, 136, 0.2)',
    statsIcon: '#2dd4bf',
    textPrimary: '#f9fafb',
    textSecondary: '#9ca3af',
};

const bentoStyles = StyleSheet.create({
    container: {
        gap: 12,
        paddingHorizontal: 20,
        marginTop: 20,
    },
    loadingContainer: {
        padding: 20,
        alignItems: 'center',
    },
    loadingText: {
        color: '#6b7280',
        fontSize: 14,
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        overflow: 'hidden',
    },
    cardLarge: {
        width: '100%',
        minHeight: 120,
        justifyContent: 'center',
        position: 'relative',
    },
    cardMedium: {
        flex: 1,
        minHeight: 100,
        justifyContent: 'space-between',
    },
    cardContentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1,
    },

    // Text Styles
    statusLabel: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    statusTime: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: -0.5,
    },
    statusSubTime: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 13,
        fontWeight: '500',
        marginTop: 2
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#6b7280',
    },
    cardLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1f2937',
    },

    // Icons
    mainIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
});

const bentoStylesDark = StyleSheet.create({
    ...bentoStyles,
    cardTitle: {
        ...bentoStyles.cardTitle,
        color: '#f9fafb',
    },
    cardSubtitle: {
        ...bentoStyles.cardSubtitle,
        color: '#9ca3af',
    },
    cardLabel: {
        ...bentoStyles.cardLabel,
        color: '#9ca3af',
    },
    cardValue: {
        ...bentoStyles.cardValue,
        color: '#f9fafb',
    },
});

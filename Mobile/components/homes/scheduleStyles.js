import { StyleSheet, Platform } from 'react-native';

const baseStyles = {
    mainContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: '#64748b',
        fontWeight: '500',
    },
    headerWrapper: {
        backgroundColor: '#2563eb',
    },
    header: {
        backgroundColor: '#2563eb',
        paddingTop: Platform.OS === 'android' ? 16 : 50,
        paddingBottom: 22,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 26,
        fontWeight: '700',
        color: '#fff',
        letterSpacing: -0.3,
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#bfdbfe',
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 20,
        paddingHorizontal: 16,
    },
    errorCard: {
        backgroundColor: '#fef2f2',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#fecaca',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    errorIcon: {
        marginRight: 10,
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        color: '#b91c1c',
        fontWeight: '500',
    },

    // Tarjeta HOY
    todayCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    todayHeader: {
        marginBottom: 16,
    },
    todayBadge: {
        backgroundColor: '#ef4444',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        marginBottom: 8,
    },
    todayBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    todayDate: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        textTransform: 'capitalize',
    },
    currentShiftContainer: {
        marginBottom: 14,
    },
    shiftTimeRow: {
        marginBottom: 10,
    },
    shiftTimeBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eef2ff',
        padding: 14,
        borderRadius: 14,
    },
    shiftTimeInfo: {
        marginLeft: 12,
        flex: 1,
    },
    shiftLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '500',
        marginBottom: 3,
    },
    shiftTime: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        letterSpacing: -0.3,
    },
    moreTurnsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eef2ff',
        padding: 10,
        borderRadius: 10,
        gap: 6,
    },
    moreTurnsText: {
        fontSize: 13,
        color: '#6366f1',
        fontWeight: '600',
    },
    finishedText: {
        fontSize: 15,
        color: '#64748b',
        textAlign: 'center',
        paddingVertical: 16,
        fontWeight: '500',
    },
    todayLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    todayLocationText: {
        marginLeft: 6,
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },

    // Dia de descanso
    dayOffCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 32,
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    dayOffIcon: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#eef2ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    dayOffTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 6,
    },
    dayOffText: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
    },

    // Resumen
    summarySection: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    summaryCard: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    summaryContent: {
        backgroundColor: '#2563eb',
        padding: 18,
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginTop: 10,
        marginBottom: 2,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#fff',
        opacity: 0.85,
        fontWeight: '500',
    },

    // Lista semanal
    scheduleSection: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    scheduleSectionHeader: {
        marginBottom: 14,
        paddingHorizontal: 4,
    },
    scheduleSectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1e293b',
        marginBottom: 2,
    },
    scheduleSectionSubtitle: {
        fontSize: 13,
        color: '#94a3b8',
        fontWeight: '500',
    },
    scheduleItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 14,
        marginBottom: 4,
        backgroundColor: '#f8fafc',
        minHeight: 68,
    },
    scheduleItemInactive: {
        backgroundColor: 'transparent',
    },
    scheduleItemToday: {
        backgroundColor: '#eef2ff',
        borderWidth: 1.5,
        borderColor: '#818cf8',
    },
    scheduleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10,
    },
    dayIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    dayIconActive: {
        backgroundColor: '#c7d2fe',
    },
    dayIconInactive: {
        backgroundColor: '#f1f5f9',
    },
    dayInitialText: {
        fontSize: 13,
        fontWeight: '700',
    },
    dayInitialActive: {
        color: '#4f46e5',
    },
    dayInitialInactive: {
        color: '#94a3b8',
    },
    scheduleInfo: {
        flex: 1,
        paddingRight: 6,
    },
    scheduleTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scheduleDay: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1e293b',
    },
    scheduleDayInactive: {
        color: '#94a3b8',
    },
    todayDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#818cf8',
        marginLeft: 6,
    },
    scheduleLocation: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 2,
    },
    scheduleLocationInactive: {
        color: '#cbd5e1',
    },
    multipleTurnsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginTop: 3,
        gap: 3,
    },
    multipleTurnsText: {
        fontSize: 10,
        color: '#6366f1',
        fontWeight: '600',
    },
    scheduleRight: {
        alignItems: 'flex-end',
        minWidth: 95,
        maxWidth: 115,
    },
    scheduleTime: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1e293b',
        textAlign: 'right',
    },
    scheduleTimeInactive: {
        fontSize: 13,
        fontWeight: '600',
        color: '#cbd5e1',
    },
    hoursChip: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 4,
        alignSelf: 'flex-end',
    },
    hoursChipText: {
        fontSize: 10,
        color: '#1d4ed8',
        fontWeight: '600',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#1e293b',
    },
    modalSubtitle: {
        fontSize: 13,
        color: '#94a3b8',
        marginTop: 2,
        fontWeight: '500',
    },
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScroll: {
        flexGrow: 0,
    },
    modalScrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 18,
        paddingBottom: 24,
    },
    modalTurnoBlock: {
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    modalTurnoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalTurnoNumber: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#2563eb',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    modalTurnoNumberText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#fff',
    },
    modalTurnoTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
    },
    modalTurnoDetails: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
    },
    modalTurnoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 7,
    },
    modalTurnoLabel: {
        fontSize: 13,
        color: '#64748b',
        marginLeft: 8,
        flex: 1,
    },
    modalTurnoTime: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1e293b',
    },
    modalTurnoDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 2,
    },
    modalEmptyState: {
        alignItems: 'center',
        paddingVertical: 36,
    },
    modalEmptyText: {
        fontSize: 15,
        color: '#94a3b8',
        marginTop: 10,
        fontWeight: '500',
    },
    modalFooter: {
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    modalFooterInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    modalFooterText: {
        fontSize: 13,
        color: '#64748b',
        fontWeight: '500',
    },
    incidenciasButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    incidenciasLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    incidenciasIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: '#f3e8ff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    incidenciasTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1e293b',
        marginBottom: 1,
    },
    incidenciasSubtitle: {
        fontSize: 12,
        color: '#94a3b8',
    },
};

export const scheduleStyles = StyleSheet.create(baseStyles);

export const scheduleStylesDark = StyleSheet.create({
    ...baseStyles,
    mainContainer: {
        ...baseStyles.mainContainer,
        backgroundColor: '#0f172a',
    },
    loadingContainer: {
        ...baseStyles.loadingContainer,
    },
    headerWrapper: {
        ...baseStyles.headerWrapper,
        backgroundColor: '#1e40af',
    },
    header: {
        ...baseStyles.header,
        backgroundColor: '#1e40af',
    },
    headerSubtitle: {
        ...baseStyles.headerSubtitle,
        color: '#93c5fd',
    },
    errorCard: {
        ...baseStyles.errorCard,
        backgroundColor: '#451a1a',
        borderColor: '#7f1d1d',
    },
    todayCard: {
        ...baseStyles.todayCard,
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    todayDate: {
        ...baseStyles.todayDate,
        color: '#f1f5f9',
    },
    shiftTime: {
        ...baseStyles.shiftTime,
        color: '#f1f5f9',
    },
    shiftLabel: {
        ...baseStyles.shiftLabel,
        color: '#94a3b8',
    },
    shiftTimeBlock: {
        ...baseStyles.shiftTimeBlock,
        backgroundColor: '#334155',
    },
    finishedText: {
        ...baseStyles.finishedText,
        color: '#94a3b8',
    },
    moreTurnsButton: {
        ...baseStyles.moreTurnsButton,
        backgroundColor: '#334155',
    },
    moreTurnsText: {
        ...baseStyles.moreTurnsText,
        color: '#60a5fa',
    },
    dayOffCard: {
        ...baseStyles.dayOffCard,
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    dayOffIcon: {
        ...baseStyles.dayOffIcon,
        backgroundColor: '#334155',
    },
    dayOffTitle: {
        ...baseStyles.dayOffTitle,
        color: '#f1f5f9',
    },
    dayOffText: {
        ...baseStyles.dayOffText,
        color: '#64748b',
    },
    summaryContent: {
        ...baseStyles.summaryContent,
        backgroundColor: '#1d4ed8',
    },
    scheduleSection: {
        ...baseStyles.scheduleSection,
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    scheduleSectionTitle: {
        ...baseStyles.scheduleSectionTitle,
        color: '#f1f5f9',
    },
    scheduleSectionSubtitle: {
        ...baseStyles.scheduleSectionSubtitle,
        color: '#64748b',
    },
    scheduleItem: {
        ...baseStyles.scheduleItem,
        backgroundColor: '#334155',
    },
    scheduleItemToday: {
        ...baseStyles.scheduleItemToday,
        backgroundColor: '#172554',
        borderColor: '#60a5fa',
    },
    dayIconActive: {
        ...baseStyles.dayIconActive,
        backgroundColor: '#1e3a8a',
    },
    dayInitialActive: {
        ...baseStyles.dayInitialActive,
        color: '#60a5fa',
    },
    todayDot: {
        ...baseStyles.todayDot,
        backgroundColor: '#60a5fa',
    },
    scheduleDay: {
        ...baseStyles.scheduleDay,
        color: '#f1f5f9',
    },
    scheduleTime: {
        ...baseStyles.scheduleTime,
        color: '#f1f5f9',
    },
    scheduleTimeInactive: {
        ...baseStyles.scheduleTimeInactive,
        color: '#475569',
    },
    multipleTurnsBadge: {
        ...baseStyles.multipleTurnsBadge,
        backgroundColor: '#1e3a8a',
    },
    multipleTurnsText: {
        ...baseStyles.multipleTurnsText,
        color: '#60a5fa',
    },
    hoursChip: {
        ...baseStyles.hoursChip,
        backgroundColor: '#1e3a8a',
    },
    hoursChipText: {
        ...baseStyles.hoursChipText,
        color: '#93c5fd',
    },
    modalContent: {
        ...baseStyles.modalContent,
        backgroundColor: '#1e293b',
    },
    modalHeader: {
        ...baseStyles.modalHeader,
        borderBottomColor: '#334155',
    },
    modalTitle: {
        ...baseStyles.modalTitle,
        color: '#f1f5f9',
    },
    modalSubtitle: {
        ...baseStyles.modalSubtitle,
        color: '#64748b',
    },
    modalCloseButton: {
        ...baseStyles.modalCloseButton,
        backgroundColor: '#334155',
    },
    modalTurnoBlock: {
        ...baseStyles.modalTurnoBlock,
        backgroundColor: '#334155',
        borderColor: '#475569',
    },
    modalTurnoDetails: {
        ...baseStyles.modalTurnoDetails,
        backgroundColor: '#1e293b',
    },
    modalTurnoTitle: {
        ...baseStyles.modalTurnoTitle,
        color: '#f1f5f9',
    },
    modalTurnoTime: {
        ...baseStyles.modalTurnoTime,
        color: '#f1f5f9',
    },
    modalTurnoNumber: {
        ...baseStyles.modalTurnoNumber,
        backgroundColor: '#1d4ed8',
    },
    modalFooter: {
        ...baseStyles.modalFooter,
        borderTopColor: '#334155',
    },
    incidenciasButton: {
        ...baseStyles.incidenciasButton,
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    incidenciasIcon: {
        ...baseStyles.incidenciasIcon,
        backgroundColor: '#3b0764',
    },
    incidenciasTitle: {
        ...baseStyles.incidenciasTitle,
        color: '#f1f5f9',
    },
    incidenciasSubtitle: {
        ...baseStyles.incidenciasSubtitle,
        color: '#64748b',
    },
});

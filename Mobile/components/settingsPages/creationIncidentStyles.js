import { StyleSheet, Platform } from 'react-native';

const baseStyles = {
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        backgroundColor: '#2563eb',
        paddingBottom: 20,
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
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
    },
    modalBody: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f8fafc',
    },
    sectionContainer: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1f2937',
        marginBottom: 12,
    },
    selectInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    selectInputContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    selectInputText: {
        fontSize: 14,
        color: '#1f2937',
        fontWeight: '500',
    },
    selectInputPlaceholder: {
        fontSize: 14,
        color: '#9ca3af',
    },
    tipoIconSmall: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    dateCompact: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        gap: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    dateCompactActive: {
        borderColor: '#3b82f6',
        borderWidth: 2,
    },
    dateCompactInfo: {
        flex: 1,
    },
    dateCompactLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6b7280',
        marginBottom: 2,
    },
    dateCompactValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1f2937',
    },
    dateArrow: {
        paddingHorizontal: 2,
    },
    datePickerInline: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        alignItems: 'center',
    },
    durationSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f9ff',
        padding: 10,
        borderRadius: 10,
        gap: 8,
    },
    durationText: {
        fontSize: 13,
        color: '#475569',
        fontWeight: '500',
    },
    durationValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#8b5cf6',
    },
    motivoCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    motivoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#f9fafb',
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        gap: 8,
    },
    motivoPlaceholder: {
        fontSize: 13,
        color: '#6b7280',
        fontWeight: '500',
    },
    motivoInput: {
        padding: 16,
        fontSize: 15,
        color: '#1f2937',
        minHeight: 140,
        maxHeight: 200,
        lineHeight: 22,
    },
    modalFooter: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    cancelButtonModal: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
    },
    cancelButtonModalText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6b7280',
    },
    createButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
    },
    createButtonDisabled: {
        opacity: 0.5,
    },
    createButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    headerPlaceholder: {
        width: 40,
    },
    tipoListBody: {
        padding: 20,
    },
    tipoOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    tipoOptionActive: {
        borderColor: '#2563eb',
        backgroundColor: '#eff6ff',
    },
    tipoOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tipoOptionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1f2937',
    },
};

export const creationIncidentStyles = StyleSheet.create(baseStyles);

export const creationIncidentStylesDark = StyleSheet.create({
    ...baseStyles,
    container: {
        ...baseStyles.container,
        backgroundColor: '#0f172a',
    },
    header: {
        ...baseStyles.header,
        backgroundColor: '#1e40af',
    },
    headerTitle: {
        ...baseStyles.headerTitle,
        color: '#f1f5f9',
    },
    modalBody: {
        ...baseStyles.modalBody,
        backgroundColor: '#0f172a',
    },
    sectionLabel: {
        ...baseStyles.sectionLabel,
        color: '#f1f5f9',
    },
    selectInput: {
        ...baseStyles.selectInput,
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    selectInputText: {
        ...baseStyles.selectInputText,
        color: '#f1f5f9',
    },
    dateCompact: {
        ...baseStyles.dateCompact,
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    dateCompactActive: {
        ...baseStyles.dateCompactActive,
        borderColor: '#3b82f6',
    },
    dateCompactLabel: {
        ...baseStyles.dateCompactLabel,
        color: '#94a3b8',
    },
    dateCompactValue: {
        ...baseStyles.dateCompactValue,
        color: '#f1f5f9',
    },
    datePickerInline: {
        ...baseStyles.datePickerInline,
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    durationSummary: {
        ...baseStyles.durationSummary,
        backgroundColor: '#1e3a5f',
    },
    durationText: {
        ...baseStyles.durationText,
        color: '#cbd5e1',
    },
    durationValue: {
        ...baseStyles.durationValue,
        color: '#a78bfa',
    },
    motivoCard: {
        ...baseStyles.motivoCard,
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    motivoHeader: {
        ...baseStyles.motivoHeader,
        backgroundColor: '#0f172a',
        borderBottomColor: '#334155',
    },
    motivoPlaceholder: {
        ...baseStyles.motivoPlaceholder,
        color: '#94a3b8',
    },
    motivoInput: {
        ...baseStyles.motivoInput,
        color: '#f1f5f9',
    },
    modalFooter: {
        ...baseStyles.modalFooter,
        borderTopColor: '#334155',
        backgroundColor: '#1e293b',
    },
    cancelButtonModal: {
        ...baseStyles.cancelButtonModal,
        backgroundColor: '#334155',
    },
    tipoOption: {
        ...baseStyles.tipoOption,
        backgroundColor: '#1e293b',
        borderColor: '#334155',
    },
    tipoOptionActive: {
        ...baseStyles.tipoOptionActive,
        borderColor: '#60a5fa',
        backgroundColor: '#172554',
    },
    tipoOptionLabel: {
        ...baseStyles.tipoOptionLabel,
        color: '#f1f5f9',
    },
});

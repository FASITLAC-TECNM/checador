import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const RejectedScreen = ({ motivoRechazo, onRetry, onCancel }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

      {/* Header Azul */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 16 : insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Solicitud Rechazada</Text>
        <Text style={styles.headerSubtitle}>Tu solicitud no fue aprobada</Text>
      </View>

      {/* Content — Static, centered */}
      <View style={styles.content}>
        {/* Icon de error */}
        <View style={styles.errorIcon}>
          <Ionicons name="close-circle" size={56} color="#ef4444" />
        </View>

        {/* Mensaje */}
        <Text style={styles.mainMessage}>Lo sentimos</Text>
        <Text style={styles.description}>
          Tu solicitud de registro de dispositivo ha sido rechazada por el administrador.
        </Text>

        {/* Card con el motivo */}
        <View style={styles.reasonCard}>
          <View style={styles.reasonHeader}>
            <Ionicons name="information-circle" size={18} color="#dc2626" />
            <Text style={styles.reasonTitle}>Motivo del Rechazo</Text>
          </View>
          <Text style={styles.reasonText}>
            {motivoRechazo || 'No se especificó un motivo'}
          </Text>
        </View>

        {/* Quick tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Verifica lo siguiente:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#6b7280" />
            <Text style={styles.tipText}>Código de empresa correcto</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#6b7280" />
            <Text style={styles.tipText}>Correo electrónico corporativo válido</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#6b7280" />
            <Text style={styles.tipText}>Permisos de tu administrador</Text>
          </View>
        </View>
      </View>

      {/* Footer con botones */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 20) : insets.bottom + 12 }]}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={styles.cancelButtonText}>Salir</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryButtonText}>Intentar Nuevamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#dbeafe',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#fee2e2',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  mainMessage: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  reasonCard: {
    width: '100%',
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  reasonTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#dc2626',
  },
  reasonText: {
    fontSize: 13,
    color: '#991b1b',
    lineHeight: 19,
  },
  tipsCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#f0f0f4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tipText: {
    fontSize: 12,
    color: '#4b5563',
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
  retryButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
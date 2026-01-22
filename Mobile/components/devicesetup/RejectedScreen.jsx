import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const RejectedScreen = ({ motivoRechazo, onRetry, onCancel }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Solicitud Rechazada</Text>
        <Text style={styles.headerSubtitle}>Tu solicitud no fue aprobada</Text>
      </View>

      {/* Content */}
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon de error */}
        <View style={styles.errorIcon}>
          <Ionicons name="close-circle" size={80} color="#ef4444" />
        </View>

        {/* Mensaje principal */}
        <Text style={styles.mainMessage}>
          Lo sentimos
        </Text>

        <Text style={styles.description}>
          Tu solicitud de registro de dispositivo ha sido rechazada por el administrador.
        </Text>

        {/* Card con el motivo */}
        <View style={styles.reasonCard}>
          <View style={styles.reasonHeader}>
            <Ionicons name="information-circle" size={22} color="#dc2626" />
            <Text style={styles.reasonTitle}>Motivo del Rechazo</Text>
          </View>
          <Text style={styles.reasonText}>
            {motivoRechazo || 'No se especificó un motivo'}
          </Text>
        </View>

        {/* Info adicional */}
        <View style={styles.infoCard}>
          <Ionicons name="help-circle" size={20} color="#6b7280" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>¿Qué puedes hacer?</Text>
            <Text style={styles.infoText}>
              • Verifica que ingresaste correctamente el código de empresa{'\n'}
              • Contacta a tu administrador para más información{'\n'}
              • Intenta registrarte nuevamente con los datos correctos
            </Text>
          </View>
        </View>

        {/* Checklist de verificación */}
        <View style={styles.checklistCard}>
          <Text style={styles.checklistTitle}>Verifica lo siguiente:</Text>
          
          <View style={styles.checkItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#6b7280" />
            <Text style={styles.checkText}>Código de empresa correcto</Text>
          </View>
          
          <View style={styles.checkItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#6b7280" />
            <Text style={styles.checkText}>Correo electrónico corporativo válido</Text>
          </View>
          
          <View style={styles.checkItem}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#6b7280" />
            <Text style={styles.checkText}>Permisos de tu administrador</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer con botones */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom + 8 }]}>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
    alignItems: 'center',
  },
  errorIcon: {
    width: 120,
    height: 120,
    backgroundColor: '#fee2e2',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  mainMessage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  reasonCard: {
    width: '100%',
    backgroundColor: '#fef2f2',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  reasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  reasonTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
  reasonText: {
    fontSize: 14,
    color: '#991b1b',
    lineHeight: 20,
  },
  infoCard: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  checklistCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  checkText: {
    fontSize: 13,
    color: '#4b5563',
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 15,
    fontWeight: '600',
  },
  retryButton: {
    flex: 2,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
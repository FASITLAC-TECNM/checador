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

const APPROVED_CONFIG = {
  title: "¡Aprobado!",
  subtitle: "Configuración Completada",
  icon: "checkmark-circle",
  message: "Tu dispositivo ha sido aprobado exitosamente. Ya puedes comenzar a usar la aplicación."
};

export const ApprovedScreen = ({ email, empresaNombre, deviceInfo, onComplete }) => {
  const approved = APPROVED_CONFIG;

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

      {/* Header Azul con Stepper completado */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 16 : insets.top + 8 }]}>
        <Text style={styles.headerTitle}>{approved.title}</Text>
        <Text style={styles.headerSubtitle}>{approved.subtitle}</Text>

        <View style={styles.stepperContainer}>
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        </View>
      </View>

      {/* Content — Static, centered */}
      <View style={styles.content}>
        {/* Icon de éxito */}
        <View style={styles.successIcon}>
          <Ionicons name={approved.icon} size={56} color="#10b981" />
        </View>

        {/* Mensaje */}
        <Text style={styles.message}>{approved.message}</Text>

        {/* Checklist compacto */}
        <View style={styles.checklist}>
          <View style={styles.checkItem}>
            <Ionicons name="business" size={16} color="#10b981" />
            <View style={styles.checkContent}>
              <Text style={styles.checkTitle}>Empresa Vinculada</Text>
              <Text style={styles.checkValue}>{empresaNombre || 'Empresa'}</Text>
            </View>
          </View>

          <View style={styles.checkItem}>
            <Ionicons name="mail" size={16} color="#10b981" />
            <View style={styles.checkContent}>
              <Text style={styles.checkTitle}>Correo Verificado</Text>
              <Text style={styles.checkValue}>{email}</Text>
            </View>
          </View>

          <View style={styles.checkItem}>
            <Ionicons name="phone-portrait" size={16} color="#10b981" />
            <View style={styles.checkContent}>
              <Text style={styles.checkTitle}>Dispositivo Registrado</Text>
              <Text style={styles.checkValue}>
                {deviceInfo?.model || 'Dispositivo móvil'}
              </Text>
            </View>
          </View>

          <View style={styles.checkItem}>
            <Ionicons name="shield-checkmark" size={16} color="#10b981" />
            <View style={styles.checkContent}>
              <Text style={styles.checkTitle}>Acceso Aprobado</Text>
              <Text style={styles.checkValue}>Listo para usar</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 20) : insets.bottom + 12 }]}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={14} color="#065f46" />
          <Text style={styles.infoText}>
            Tu dispositivo ha sido vinculado exitosamente a {empresaNombre}.
          </Text>
        </View>
        <TouchableOpacity
          style={styles.completeButton}
          onPress={onComplete}
          activeOpacity={0.8}
        >
          <Text style={styles.completeButtonText}>Comenzar a Usar</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
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
    paddingBottom: 16,
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
    marginBottom: 14,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  stepComplete: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#10b981',
    marginHorizontal: 8,
    maxWidth: 80,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#d1fae5',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  message: {
    fontSize: 13,
    color: '#065f46',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  checklist: {
    width: '100%',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  checkContent: {
    flex: 1,
    marginLeft: 10,
  },
  checkTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 1,
  },
  checkValue: {
    fontSize: 11,
    color: '#047857',
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#d1fae5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: '#065f46',
    lineHeight: 15,
  },
  completeButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
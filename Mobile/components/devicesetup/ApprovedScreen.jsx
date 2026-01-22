import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import config from '../../config/onboardingConfig.json';

export const ApprovedScreen = ({ email, empresaNombre, deviceInfo, onComplete }) => {
  const { approved } = config;

  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header con Stepper */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>{approved.title}</Text>
        <Text style={styles.headerSubtitle}>{approved.subtitle}</Text>
        
        {/* Stepper en el Header - Todos completados */}
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

      {/* Content */}
      <View style={styles.content}>
        {/* Icon de éxito */}
        <View style={styles.successIcon}>
          <Ionicons name={approved.icon} size={64} color="#10b981" />
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

        {/* Info adicional */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={14} color="#065f46" />
          <Text style={styles.infoText}>
            Tu dispositivo ha sido vinculado exitosamente a {empresaNombre}. Ahora puedes acceder a todas las funciones.
          </Text>
        </View>
      </View>

      {/* Footer - Solo botón, sin stepper */}
      <View style={[styles.footer, { paddingBottom: Platform.OS === 'android' ? Math.max(insets.bottom, 8) : insets.bottom }]}>
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
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    marginBottom: 12,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  stepComplete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#10b981',
    marginHorizontal: 6,
    maxWidth: 80,
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
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
    marginBottom: 16,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  checkContent: {
    flex: 1,
    marginLeft: 10,
  },
  checkTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
    marginBottom: 2,
  },
  checkValue: {
    fontSize: 11,
    color: '#047857',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#6ee7b7',
    borderRadius: 8,
    padding: 10,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    color: '#065f46',
    marginLeft: 6,
    lineHeight: 14,
  },
  footer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  completeButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
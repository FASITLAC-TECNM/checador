import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from './config/onboardingConfig.json';

export const ApprovedScreen = ({ email, deviceInfo, onComplete }) => {
  const { approved } = config;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{approved.title}</Text>
        <Text style={styles.headerSubtitle}>{approved.subtitle}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.successCard}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name={approved.icon} size={60} color="#10b981" />
          </View>

          {/* Message */}
          <View style={styles.messageCard}>
            <Text style={styles.message}>{approved.message}</Text>
          </View>

          {/* Checklist */}
          <View style={styles.checklist}>
            <View style={styles.checkItem}>
              <Ionicons name="mail" size={18} color="#10b981" />
              <View style={styles.checkContent}>
                <Text style={styles.checkTitle}>Correo Verificado</Text>
                <Text style={styles.checkDescription}>{email}</Text>
              </View>
            </View>

            <View style={styles.checkItem}>
              <Ionicons name="phone-portrait" size={18} color="#10b981" />
              <View style={styles.checkContent}>
                <Text style={styles.checkTitle}>Dispositivo Registrado</Text>
                <Text style={styles.checkDescription}>
                  {deviceInfo?.model || 'Dispositivo móvil'}
                </Text>
              </View>
            </View>

            <View style={styles.checkItem}>
              <Ionicons name="shield-checkmark" size={18} color="#10b981" />
              <View style={styles.checkContent}>
                <Text style={styles.checkTitle}>Acceso Aprobado</Text>
                <Text style={styles.checkDescription}>
                  Puedes comenzar a usar la aplicación
                </Text>
              </View>
            </View>

            {deviceInfo?.ip && (
              <View style={styles.checkItem}>
                <Ionicons name="analytics" size={18} color="#10b981" />
                <View style={styles.checkContent}>
                  <Text style={styles.checkTitle}>Información de Red</Text>
                  <Text style={styles.checkDescription}>
                    IP: {deviceInfo.ip}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Additional Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={16} color="#065f46" />
            <Text style={styles.infoText}>
              Tu dispositivo ha sido vinculado exitosamente. Ahora puedes acceder a todas las funciones de la aplicación.
            </Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.stepper}>
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
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
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  successCard: {
    backgroundColor: '#d1fae5',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#6ee7b7',
    alignItems: 'center',
  },
  iconContainer: {
    width: 90,
    height: 90,
    backgroundColor: '#a7f3d0',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  messageCard: {
    backgroundColor: '#a7f3d0',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 18,
  },
  message: {
    fontSize: 12,
    color: '#065f46',
    textAlign: 'center',
    fontWeight: '600',
  },
  checklist: {
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#a7f3d0',
    borderRadius: 8,
    padding: 10,
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
  checkDescription: {
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
    marginLeft: 8,
    lineHeight: 14,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepComplete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#10b981',
    marginHorizontal: 6,
  },
  completeButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 6,
  },
});
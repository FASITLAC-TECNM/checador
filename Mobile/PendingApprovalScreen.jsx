// PendingApprovalScreen.js - MEJORADO
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from './config/onboardingConfig.json';
import { getSolicitudPorToken } from './services/solicitudMovilService';

export const PendingApprovalScreen = ({ tokenSolicitud, idSolicitud, onApproved, onRejected }) => {
  const { pending } = config;
  const [solicitudStatus, setSolicitudStatus] = useState('Pendiente');
  const intervalRef = useRef(null);
  const onApprovedRef = useRef(onApproved);
  const onRejectedRef = useRef(onRejected);

  useEffect(() => {
    onApprovedRef.current = onApproved;
    onRejectedRef.current = onRejected;
  }, [onApproved, onRejected]);

  // Verificar estado cada 5 segundos
  useEffect(() => {
    const checkStatus = async () => {
      try {
        console.log('🔍 Verificando estado de solicitud...');

        const response = await getSolicitudPorToken(tokenSolicitud);
        
        console.log('📥 Estado actual:', response.estado);
        setSolicitudStatus(response.estado);

        // Si fue aceptada, navegar a pantalla de aprobación
        if (response.estado === 'Aceptado') {
          console.log('✅ Solicitud ACEPTADA');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setTimeout(() => {
            onApprovedRef.current({
              idDispositivo: response.id_escritorio || response.id,
              idSolicitud: response.id,
              fechaAprobacion: response.fecha_respuesta
            });
          }, 500);
        }

        // Si fue rechazada, mostrar alerta
        if (response.estado === 'Rechazado') {
          console.log('❌ Solicitud RECHAZADA');
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          Alert.alert(
            'Solicitud Rechazada',
            response.motivo_rechazo || 'Tu solicitud ha sido rechazada por el administrador.',
            [
              {
                text: 'Entendido',
                onPress: () => {
                  if (onRejectedRef.current) {
                    onRejectedRef.current(response);
                  }
                }
              }
            ]
          );
        }
      } catch (error) {
        console.error('❌ Error verificando estado:', error);
        // No mostrar alerta para no interrumpir el flujo
      }
    };

    // Primera verificación inmediata
    checkStatus();

    // Verificar cada 5 segundos
    intervalRef.current = setInterval(checkStatus, 5000);

    // Limpiar intervalo al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [tokenSolicitud]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Solicitud Enviada</Text>
        <Text style={styles.headerSubtitle}>Esperando aprobación del administrador</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.waitingCard}>
          {/* Spinner animado continuamente */}
          <View style={styles.spinnerContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>

          {/* Mensaje principal */}
          <Text style={styles.mainMessage}>
            Esperando Aprobación
          </Text>

          {/* Descripción */}
          <Text style={styles.description}>
            Tu solicitud ha sido enviada correctamente. Un administrador la revisará pronto.
          </Text>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="time-outline" size={20} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>¿Qué sigue?</Text>
              <Text style={styles.infoText}>
                • El administrador revisará tu solicitud{'\n'}
                • Recibirás una notificación cuando sea aprobada{'\n'}
                • No cierres esta pantalla
              </Text>
            </View>
          </View>

          {/* Warning Box */}
          <View style={styles.warningBox}>
            <Ionicons name="information-circle" size={18} color="#f59e0b" />
            <Text style={styles.warningText}>
              Esta pantalla se actualizará automáticamente cuando tu solicitud sea procesada.
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
          <View style={styles.stepActive}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
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
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  waitingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  spinnerContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#eff6ff',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  mainMessage: {
    fontSize: 22,
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
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#3b82f6',
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: '#92400e',
    marginLeft: 8,
    lineHeight: 16,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepComplete: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: '#10b981',
    marginHorizontal: 8,
  },
});
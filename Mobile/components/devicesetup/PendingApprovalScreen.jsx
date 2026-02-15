import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getSolicitudPorToken } from '../../services/solicitudMovilService';

export const PendingApprovalScreen = ({ tokenSolicitud, idSolicitud, onApproved, onRejected }) => {
  const insets = useSafeAreaInsets();
  const [solicitudStatus, setSolicitudStatus] = useState('pendiente');
  const intervalRef = useRef(null);
  const onApprovedRef = useRef(onApproved);
  const onRejectedRef = useRef(onRejected);

  useEffect(() => {
    onApprovedRef.current = onApproved;
    onRejectedRef.current = onRejected;
  }, [onApproved, onRejected]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await getSolicitudPorToken(tokenSolicitud);

        const estadoLower = response.estado?.toLowerCase();
        setSolicitudStatus(estadoLower);

        // Si fue aceptada (comparar en minúsculas)
        if (estadoLower === 'aceptado') {
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

        // Si fue rechazada
        if (estadoLower === 'rechazado') {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setTimeout(() => {
            onRejectedRef.current(response);
          }, 500);
        }
      } catch (error) {
      }
    };

    checkStatus();
    intervalRef.current = setInterval(checkStatus, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [tokenSolicitud]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />

      {/* Header Azul con Stepper */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top + 16 : insets.top + 8 }]}>
        <Text style={styles.headerTitle}>Solicitud Enviada</Text>
        <Text style={styles.headerSubtitle}>Esperando aprobación del administrador</Text>

        <View style={styles.stepperContainer}>
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepPending}>
            <ActivityIndicator size="small" color="#2563eb" />
          </View>
        </View>
      </View>

      {/* Content — Static, centered */}
      <View style={styles.content}>
        <View style={styles.waitingCard}>
          <View style={styles.spinnerContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>

          <Text style={styles.mainMessage}>
            Esperando Aprobación
          </Text>

          <Text style={styles.description}>
            Tu solicitud ha sido enviada correctamente. Un administrador la revisará pronto.
          </Text>

          <View style={styles.infoBox}>
            <Ionicons name="time-outline" size={18} color="#2563eb" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>¿Qué sigue?</Text>
              <Text style={styles.infoText}>
                • El administrador revisará tu solicitud{'\n'}
                • Recibirás una notificación cuando sea aprobada{'\n'}
                • No cierres esta pantalla
              </Text>
            </View>
          </View>

          <View style={styles.warningBox}>
            <Ionicons name="information-circle" size={16} color="#f59e0b" />
            <Text style={styles.warningText}>
              Esta pantalla se actualizará automáticamente cuando tu solicitud sea procesada.
            </Text>
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
  stepPending: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffffff',
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
  },
  waitingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f4',
  },
  spinnerContainer: {
    width: 72,
    height: 72,
    backgroundColor: '#eff6ff',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  mainMessage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 14,
    padding: 14,
    width: '100%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  infoContent: {
    flex: 1,
    marginLeft: 10,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 11,
    color: '#3b82f6',
    lineHeight: 17,
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
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 11,
    color: '#92400e',
    lineHeight: 16,
  },
});
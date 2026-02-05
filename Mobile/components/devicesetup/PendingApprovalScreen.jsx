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
      <StatusBar barStyle="dark-content" />

      {/* Header con Stepper */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Solicitud Enviada</Text>
        <Text style={styles.headerSubtitle}>Esperando aprobación del administrador</Text>
        
        {/* Stepper en el Header */}
        <View style={styles.stepperContainer}>
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepComplete}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepActive}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        </View>
      </View>

      {/* Content */}
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

          <View style={styles.warningBox}>
            <Ionicons name="information-circle" size={18} color="#f59e0b" />
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
  stepActive: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2563eb',
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
});
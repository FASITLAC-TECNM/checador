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
  const [isChecking, setIsChecking] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
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
      if (isChecking) return;

      try {
        setIsChecking(true);
        console.log(`🔍 Verificando estado de solicitud (intento ${checkCount + 1})...`);

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
              idDispositivo: response.id_escritorio,
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

        setCheckCount(prev => prev + 1);
      } catch (error) {
        console.error('❌ Error verificando estado:', error);
        // No mostrar alerta aquí para no interrumpir el flujo
      } finally {
        setIsChecking(false);
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
  }, [tokenSolicitud, checkCount]);

  const getStatusColor = () => {
    switch (solicitudStatus) {
      case 'Aceptado':
        return '#10b981';
      case 'Rechazado':
        return '#ef4444';
      default:
        return '#2563eb';
    }
  };

  const getStatusText = () => {
    switch (solicitudStatus) {
      case 'Aceptado':
        return 'Aprobada ✓';
      case 'Rechazado':
        return 'Rechazada ✗';
      default:
        return 'En Revisión';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{pending.title}</Text>
        <Text style={styles.headerSubtitle}>{pending.subtitle}</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.pendingCard}>
          {/* Icon with Status */}
          <View style={styles.iconWrapper}>
            <View style={[styles.iconContainer, { backgroundColor: `${getStatusColor()}20` }]}>
              <Ionicons 
                name={solicitudStatus === 'Aceptado' ? 'checkmark-circle' : pending.icon} 
                size={50} 
                color={getStatusColor()} 
              />
            </View>
            {isChecking && (
              <View style={styles.checkingBadge}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </View>

          {/* Status Card */}
          <View style={[styles.statusCard, { backgroundColor: `${getStatusColor()}15` }]}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Estado:</Text>
              <Text style={[styles.statusValue, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Verificaciones:</Text>
              <Text style={styles.statusValue}>{checkCount}</Text>
            </View>
            <View style={styles.timerRow}>
              <Text style={[styles.timerLabel, { color: getStatusColor() }]}>
                {isChecking ? '🔄 Verificando...' : '⏱️ Próxima verificación en 5s'}
              </Text>
            </View>
          </View>

          {/* Message */}
          <Text style={styles.message}>{pending.message}</Text>

          {/* Info adicional */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              La verificación se realiza automáticamente cada 5 segundos. No cierres esta pantalla.
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
          <View style={[styles.stepActive, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.stepActiveText}>3</Text>
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
  pendingCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#93c5fd',
    alignItems: 'center',
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  iconContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkingBadge: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 42,
    height: 42,
    backgroundColor: '#2563eb',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#eff6ff',
  },
  statusCard: {
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: '#1e40af',
    fontWeight: '600',
  },
  statusValue: {
    fontSize: 12,
    color: '#1e3a8a',
    fontWeight: 'bold',
  },
  timerRow: {
    marginTop: 4,
  },
  timerLabel: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },
  message: {
    fontSize: 12,
    color: '#1e40af',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 10,
    color: '#6b7280',
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
  },
  stepComplete: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActiveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#10b981',
    marginHorizontal: 6,
  },
});
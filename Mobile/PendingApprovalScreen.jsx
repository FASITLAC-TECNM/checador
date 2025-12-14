import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import config from './config/onboardingConfig.json';

export const PendingApprovalScreen = ({ companyCode, onApproved }) => {
  const { pending } = config;
  const [timer, setTimer] = useState(pending.autoApproveSeconds);
  const intervalRef = useRef(null);
  const onApprovedRef = useRef(onApproved);

  useEffect(() => {
    onApprovedRef.current = onApproved;
  }, [onApproved]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          // Llamar después de un pequeño delay para evitar el warning
          setTimeout(() => {
            onApprovedRef.current();
          }, 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

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
          {/* Icon with Timer */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconContainer}>
              <Ionicons name={pending.icon} size={50} color="#2563eb" />
            </View>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>{timer}</Text>
            </View>
          </View>

          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Empresa:</Text>
              <Text style={styles.statusValue}>{companyCode}</Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Estado:</Text>
              <Text style={styles.statusValue}>En Revisión</Text>
            </View>
            <View style={styles.timerRow}>
              <Text style={styles.timerLabel}>
                Aprobación en: <Text style={styles.timerHighlight}>{timer}s</Text>
              </Text>
            </View>
          </View>

          {/* Message */}
          <Text style={styles.message}>{pending.message}</Text>
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
          <View style={styles.stepActive}>
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
    backgroundColor: '#dbeafe',
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBadge: {
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
  timerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: '#dbeafe',
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
    fontSize: 12,
    color: '#1e40af',
    textAlign: 'center',
  },
  timerHighlight: {
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  message: {
    fontSize: 12,
    color: '#1e40af',
    textAlign: 'center',
    lineHeight: 18,
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
    backgroundColor: '#2563eb',
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

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated,
  StatusBar, TouchableOpacity, ActivityIndicator } from
'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verificarDispositivoPorEmpleado } from '../../services/solicitudMovilService';
import AsyncStorage from '@react-native-async-storage/async-storage';









const DeviceDisabledScreen = ({ onReRequest, onReEnabled, darkMode = false }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [confirming, setConfirming] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState(null);


  useEffect(() => {
    Animated.parallel([
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }),
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 55,
      friction: 10,
      useNativeDriver: true
    })]
    ).start();
  }, []);

  const handleReRequest = () => {
    if (confirming) return;
    setConfirming(true);
    setTimeout(() => {
      setConfirming(false);
      onReRequest?.();
    }, 400);
  };






  const handleCheckStatus = async () => {
    if (checking) return;
    setChecking(true);
    setCheckResult(null);

    try {
      const [storedUserData, storedToken] = await Promise.all([
      AsyncStorage.getItem('@user_data'),
      AsyncStorage.getItem('userToken')]
      );

      if (!storedUserData || !storedToken) {
        setCheckResult('still_disabled');
        return;
      }

      const parsedUser = JSON.parse(storedUserData);
      const empleadoId = parsedUser.empleado_id || parsedUser.empleadoInfo?.id;

      if (!empleadoId) {
        setCheckResult('still_disabled');
        return;
      }

      const dispositivoEnBD = await verificarDispositivoPorEmpleado(empleadoId, storedToken);

      if (dispositivoEnBD.existe && dispositivoEnBD.activo) {

        await AsyncStorage.setItem('@onboarding_completed', 'true');
        setCheckResult('enabled');
        setTimeout(() => {
          onReEnabled?.();
        }, 800);
      } else {
        setCheckResult('still_disabled');
      }
    } catch {
      setCheckResult('still_disabled');
    } finally {
      setChecking(false);
    }
  };

  const dm = darkMode;
  const colors = {
    bg: dm ? '#111827' : '#f3f4f6',
    card: dm ? '#1f2937' : '#ffffff',
    cardBorder: dm ? '#374151' : '#e5e7eb',
    title: dm ? '#f9fafb' : '#111827',
    subtitle: dm ? '#9ca3af' : '#4b5563',

    statusBg: dm ? 'rgba(185,28,28,0.22)' : '#fde8e8',
    statusBorder: dm ? 'rgba(239,68,68,0.5)' : '#f87171',
    statusText: dm ? '#fca5a5' : '#991b1b',
    retryBg: dm ? '#1d4ed8' : '#2563eb',
    retryText: '#ffffff',
    checkBg: dm ? '#14532d' : '#dcfce7',
    checkBorder: dm ? '#16a34a' : '#86efac',
    checkText: dm ? '#4ade80' : '#15803d',
    footer: dm ? '#4b5563' : '#9ca3af',
    iconBg: dm ? 'rgba(239,68,68,0.18)' : '#fee2e2',
    badgeBg: dm ? '#374151' : '#ffffff',

    stripeBg: dm ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.12)',
    stripeColor: dm ? 'rgba(239,68,68,0.07)' : 'rgba(239,68,68,0.16)'
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
            <StatusBar
        barStyle={dm ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg} />
      

            <Animated.View style={[
      styles.card,
      {
        backgroundColor: colors.card,
        borderColor: colors.cardBorder,
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }]
      }]
      }>
                {}
                <View style={styles.topBar} />

                {}
                <View style={[styles.stripesContainer, { backgroundColor: colors.stripeBg }]}>
                    {[...Array(20)].map((_, i) =>
          <View key={i} style={[styles.stripe, {
            left: -10 + i * 20,
            backgroundColor: colors.stripeColor
          }]} />
          )}
                </View>

                {}
                <View style={styles.cardBody}>
                    {}
                    <View style={styles.iconWrapper}>
                        <View style={[styles.iconCircle, { backgroundColor: colors.iconBg }]}>
                            <Ionicons name="phone-portrait" size={38} color="#ef4444" />
                        </View>
                        {}
                        <View style={[styles.iconBadge, {
              borderColor: colors.card,
              backgroundColor: colors.badgeBg
            }]}>
                            <Ionicons name="ban" size={14} color="#dc2626" />
                        </View>
                    </View>

                    {}
                    <Text style={[styles.title, { color: colors.title }]}>
                        Nodo Deshabilitado
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.subtitle }]}>
                        Este dispositivo ha sido desactivado por el administrador del sistema y ya no cuenta con acceso autorizado.{'\n\n'}Contacta a tu administrador o solicita nuevamente el acceso.
                    </Text>

                    {}
                    {checkResult === 'enabled' &&
          <View style={[styles.statusRow, { backgroundColor: colors.checkBg, borderColor: colors.checkBorder, marginBottom: 10 }]}>
                            <Ionicons name="checkmark-circle" size={18} color={colors.checkText} />
                            <Text style={[styles.statusText, { color: colors.checkText }]}>
                                Acceso restaurado
                            </Text>
                        </View>
          }
                    {checkResult === 'still_disabled' &&
          <View style={[styles.statusRow, { backgroundColor: colors.statusBg, borderColor: colors.statusBorder, marginBottom: 10 }]}>
                            <Ionicons name="close-circle" size={18} color={colors.statusText} />
                            <Text style={[styles.statusText, { color: colors.statusText }]}>
                                Sigue deshabilitado.
                            </Text>
                        </View>
          }

                    {}
                    <TouchableOpacity
            style={[styles.checkBtn, { opacity: checking ? 0.75 : 1 }]}
            onPress={handleCheckStatus}
            activeOpacity={0.8}
            disabled={checking || checkResult === 'enabled'}>
            
                        {checking ?
            <ActivityIndicator size="small" color="#ffffff" /> :
            <Ionicons name="cloud-download-outline" size={18} color="#ffffff" />
            }
                        <Text style={styles.checkBtnText}>
                            {checking ? 'Verificando...' : 'Actualizar estado'}
                        </Text>
                    </TouchableOpacity>

                    {}
                    <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: colors.retryBg, opacity: confirming ? 0.7 : 1 }]}
            onPress={handleReRequest}
            activeOpacity={0.8}
            disabled={confirming}>
            
                        <Ionicons name="refresh" size={18} color={colors.retryText} />
                        <Text style={[styles.retryText, { color: colors.retryText }]}>
                            {confirming ? 'Redirigiendo...' : 'Re-solicitar Acceso'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {}
            <Animated.Text style={[styles.footer, { color: colors.footer, opacity: fadeAnim }]}>
                FASITLAC © {new Date().getFullYear()}
            </Animated.Text>
        </View>);

};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10
  },
  topBar: {
    height: 4,
    backgroundColor: '#ef4444',
    width: '100%'
  },
  stripesContainer: {
    height: 52,
    width: '100%',
    flexDirection: 'row',
    overflow: 'hidden'
  },
  stripe: {
    position: 'absolute',
    top: -20,
    width: 14,
    height: 120,
    transform: [{ rotate: '30deg' }]
  },
  cardBody: {
    padding: 28,
    alignItems: 'center'
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 20,
    marginTop: -16
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.2
  },
  subtitle: {
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    marginBottom: 14
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1
  },

  checkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#16a34a',
    marginBottom: 10
  },
  checkBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff'
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14
  },
  retryText: {
    fontSize: 15,
    fontWeight: '700'
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3
  }
});

export default DeviceDisabledScreen;
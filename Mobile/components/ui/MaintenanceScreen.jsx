import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Animated,
  StatusBar, TouchableOpacity, ActivityIndicator } from
'react-native';
import { Ionicons } from '@expo/vector-icons';

const MaintenanceScreen = ({ onRetry, darkMode = false }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [isRetrying, setIsRetrying] = useState(false);

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


  useEffect(() => {
    if (isRetrying) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [isRetrying]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const handleRetry = async () => {
    if (isRetrying || !onRetry) return;
    setIsRetrying(true);
    await onRetry();
    setIsRetrying(false);
  };

  const dm = darkMode;
  const colors = {
    bg: dm ? '#111827' : '#f3f4f6',
    card: dm ? '#1f2937' : '#ffffff',
    cardBorder: dm ? '#374151' : '#e5e7eb',
    title: dm ? '#f9fafb' : '#111827',
    subtitle: dm ? '#9ca3af' : '#4b5563',
    statusBg: dm ? 'rgba(180,83,9,0.15)' : '#fffbeb',
    statusBorder: dm ? 'rgba(180,83,9,0.3)' : '#fde68a',
    statusText: dm ? '#fbbf24' : '#92400e',
    retryBg: dm ? 'rgba(255,255,255,0.04)' : 'transparent',
    retryBorder: dm ? '#374151' : '#d1d5db',
    retryText: dm ? '#9ca3af' : '#6b7280',
    footer: dm ? '#4b5563' : '#9ca3af',
    stripeBg: dm ? 'rgba(245,158,11,0.04)' : 'rgba(245,158,11,0.08)',
    stripeColor: dm ? 'rgba(245,158,11,0.03)' : 'rgba(245,158,11,0.09)'
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
                        <View style={[styles.iconCircle, dm && styles.iconCircleDark]}>
                            <Ionicons name="construct" size={38} color="#f59e0b" />
                        </View>
                        {}
                        <View style={[styles.iconBadge, {
              borderColor: colors.card,
              backgroundColor: dm ? '#374151' : '#ffffff'
            }]}>
                            <Ionicons name="hammer" size={14} color={dm ? '#fbbf24' : '#d97706'} />
                        </View>
                    </View>

                    {}
                    <Text style={[styles.title, { color: colors.title }]}>
                        Sistema en Mantenimiento
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.subtitle }]}>
                        Estamos realizando tareas programadas de actualización para asegurar el óptimo funcionamiento de la plataforma.{'\n\n'}El servicio se restablecerá en breve.
                    </Text>

                    {}
                    <View style={[styles.statusRow, { backgroundColor: colors.statusBg, borderColor: colors.statusBorder }]}>
                        <Animated.View style={{ transform: [{ rotate: isRetrying ? spin : '0deg' }] }}>
                            <Ionicons name="refresh" size={18} color={colors.statusText} />
                        </Animated.View>
                        <Text style={[styles.statusText, { color: colors.statusText }]}>
                            {isRetrying ?
              'Espere un momento...' :
              'La pantalla se actualizará automáticamente'}
                        </Text>
                    </View>

                    {}
                    <TouchableOpacity
            style={[styles.retryBtn, {
              backgroundColor: colors.retryBg,
              borderColor: colors.retryBorder
            }]}
            onPress={handleRetry}
            activeOpacity={0.7}
            disabled={isRetrying}>
            
                        <Ionicons name="refresh-outline" size={16} color={colors.retryText} />
                        <Text style={[styles.retryText, { color: colors.retryText }]}>
                            Reintentar ahora
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
    backgroundColor: '#f59e0b',
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
    width: 12,
    height: 120,
    backgroundColor: 'rgba(245,158,11,0.07)',
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
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center'
  },
  iconCircleDark: {
    backgroundColor: 'rgba(245,158,11,0.18)'
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
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
    marginBottom: 10
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1
  },

  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 2
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600'
  },
  footer: {
    position: 'absolute',
    bottom: 28,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3
  }
});

export default MaintenanceScreen;
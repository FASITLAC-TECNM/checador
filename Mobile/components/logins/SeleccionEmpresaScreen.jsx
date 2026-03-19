import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  Image,
  Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import getApiEndpoint from '../../config/api.js';

const obtenerUrlLogo = (logo) => {
  if (!logo) return null;
  if (logo.startsWith('data:image/') || logo.startsWith('http://') || logo.startsWith('https://')) return logo;
  const cleanPath = logo.startsWith('/') ? logo.substring(1) : logo;
  return getApiEndpoint(`/${cleanPath}`);
};

const EmpresaCard = ({ item, index, onSelect, darkMode }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 450, delay: index * 90, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 450, delay: index * 90, useNativeDriver: true })
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={[styles.cardBox, darkMode && styles.cardBoxDark]}
        activeOpacity={0.8}
        onPress={() => onSelect(item.empresa_id)}
      >
        <View style={[styles.cardColorStrip, darkMode && styles.cardColorStripDark]} />

        <View style={styles.cardContent}>
          <View style={[styles.avatarWrap, darkMode && styles.avatarWrapDark]}>
            {item.logo ? (
              <Image
                source={{ uri: obtenerUrlLogo(item.logo) }}
                style={styles.avatarImg}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.avatarInitials, darkMode && { color: '#60a5fa' }]}>
                {item.nombre.substring(0, 2).toUpperCase()}
              </Text>
            )}
          </View>

          <View style={styles.infoCol}>
            <Text style={[styles.companyName, darkMode && styles.companyNameDark]} numberOfLines={1}>
              {item.nombre}
            </Text>
            <View style={styles.actionRow}>
              <Text style={[styles.actionText, darkMode && { color: '#93c5fd' }]}>Ingresar</Text>
              <Ionicons name="arrow-forward" size={14} color={darkMode ? '#93c5fd' : '#072146'} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const SeleccionEmpresaScreen = ({ empresasList, onSelect, onCancel, darkMode }) => {
  const empresasOrdenadas = [...(empresasList || [])].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
  );

  return (
    <View style={[styles.mainWrapper, darkMode && styles.mainWrapperDark]}>
      {/* Header */}
      <View style={[styles.headerBlock, darkMode && styles.headerBlockDark]}>
        <SafeAreaView edges={['top']} style={{ flex: 0 }}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={onCancel} style={styles.backBtnWrapper} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Múltiples empresas</Text>
          </View>
        </SafeAreaView>
      </View>

      {/* Body */}
      <View style={[styles.bodySection, darkMode && styles.bodySectionDark]}>
        <View style={styles.titleSection}>
          <Text style={[styles.welcomeText, darkMode && styles.textWhite]}>¡Hola!</Text>
          <Text style={[styles.instructionText, darkMode && styles.textMuted]}>
            Por favor, elige el perfil empresarial con el que deseas acceder.
          </Text>
        </View>

        <FlatList
          data={empresasOrdenadas}
          keyExtractor={(item) => item.empresa_id.toString()}
          showsVerticalScrollIndicator={false}
          style={styles.flatListArea}
          contentContainerStyle={styles.listPadding}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          renderItem={({ item, index }) => (
            <EmpresaCard item={item} index={index} onSelect={onSelect} darkMode={darkMode} />
          )}
          ListFooterComponent={() => (
            <TouchableOpacity
              style={[styles.footerCancelBtn, darkMode && styles.footerCancelBtnDark]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle-outline" size={18} color={darkMode ? '#9ca3af' : '#64748b'} />
              <Text style={[styles.footerCancelText, darkMode && styles.textMuted]}>Cancelar operación</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: '#f1f5f9'
  },
  mainWrapperDark: {
    backgroundColor: '#111827'
  },
  headerBlock: {
    backgroundColor: '#2563eb',
    paddingBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 10
  },
  headerBlockDark: {
    backgroundColor: '#1e40af'
  },
  headerNav: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backBtnWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginLeft: 12,
    letterSpacing: 0.5
  },

  bodySection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24
  },
  bodySectionDark: {
    backgroundColor: '#111827'
  },
  titleSection: {
    marginBottom: 20,
    paddingHorizontal: 4
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.5
  },
  instructionText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '400',
    lineHeight: 22
  },
  textWhite: { color: '#ffffff' },
  textMuted: { color: '#9ca3af' },

  flatListArea: {
    flex: 1,
    overflow: 'visible'
  },
  listPadding: {
    paddingBottom: 40,
    paddingTop: 4
  },

  /* Cards BBVA */
  cardBox: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12
  },
  cardBoxDark: {
    backgroundColor: '#1f2937',
    shadowColor: '#000'
  },
  cardColorStrip: {
    width: 6,
    backgroundColor: '#2563eb',
    alignSelf: 'stretch'
  },
  cardColorStripDark: {
    backgroundColor: '#3b82f6'
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center'
  },
  avatarWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  avatarWrapDark: {
    backgroundColor: '#111827',
    borderColor: '#374151'
  },
  avatarImg: {
    width: '65%',
    height: '65%'
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '800',
    color: '#072146'
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center'
  },
  companyName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    letterSpacing: 0.2
  },
  companyNameDark: {
    color: '#f3f4f6'
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  actionText: {
    fontSize: 13,
    color: '#072146',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },

  footerCancelBtn: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    gap: 6
  },
  footerCancelBtnDark: {
    backgroundColor: '#374151'
  },
  footerCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569'
  }
});
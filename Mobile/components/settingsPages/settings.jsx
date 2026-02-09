import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PersonalInfoScreen } from './personalinfo';
import { TermsAndConditionsScreen } from './TermsAndConditionsScreen';
import { SupportScreen } from './SupportScreen';
import { SecurityScreen } from './SecurityScreen';

const obtenerUrlFotoPerfil = (foto) => {  
  if (!foto) {
    return null;
  }
  if (foto.startsWith('data:image/')) {
    return foto;
  }
  if (foto.startsWith('http://') || foto.startsWith('https://')) {
    return foto;
  }
  const BASE_URL = 'https://9dm7dqf9-3001.usw3.devtunnels.ms';
  const url = `${BASE_URL}${foto.startsWith('/') ? '' : '/'}${foto}`;
  
  return url;
};

export const SettingsScreen = ({ 
  userData, 
  email, 
  darkMode, 
  onToggleDarkMode, 
  onLogout 
}) => {
  const [showPersonalInfo, setShowPersonalInfo] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  
  const styles = darkMode ? settingsStylesDark : settingsStyles;

  const fotoUrl = userData.foto ? obtenerUrlFotoPerfil(userData.foto) : null;
  
  const esEmpleado = userData.es_empleado && userData.empleado_id;
  const rolMostrar = esEmpleado
    ? 'Empleado'
    : (userData.roles && userData.roles.length > 0
        ? userData.roles[0].nombre
        : (userData.esAdmin ? 'Administrador' : 'Usuario'));

  const emailMostrar = userData.correo || email || 'usuario@correo.com';

  if (showPersonalInfo) {
    return (
      <PersonalInfoScreen 
        userData={userData}
        darkMode={darkMode}
        onBack={() => setShowPersonalInfo(false)}
      />
    );
  }

  if (showTerms) {
    return (
      <TermsAndConditionsScreen 
        darkMode={darkMode}
        onBack={() => setShowTerms(false)}
      />
    );
  }

  if (showSupport) {
    return (
      <SupportScreen 
        userData={userData}
        darkMode={darkMode}
        onBack={() => setShowSupport(false)}
      />
    );
  }

  if (showSecurity) {
    return (
      <SecurityScreen 
        darkMode={darkMode}
        onBack={() => setShowSecurity(false)}
        userData={userData}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={darkMode ? "#1e40af" : "#2563eb"} 
        translucent={false} 
      />
      
      {/* Header con color sólido */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configuración</Text>
        <Text style={styles.headerSubtitle}>Gestiona tu cuenta y preferencias</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileGradient}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatarContainer}>
                  {fotoUrl ? (
                    <Image 
                      source={{ uri: fotoUrl }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={48} color="#fff" />
                    </View>
                  )}
                  <View style={[
                    styles.statusIndicator,
                    { backgroundColor: '#10b981' }
                  ]} />
                </View>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userData.nombre}</Text>
                <Text style={styles.profileEmail}>{emailMostrar}</Text>
                
                <View style={styles.badgesContainer}>
                  <View style={[
                    styles.roleBadge,
                    esEmpleado && styles.roleBadgeEmployee
                  ]}>
                    <Ionicons 
                      name={esEmpleado ? "briefcase" : "person"} 
                      size={12} 
                      color={esEmpleado ? '#166534' : '#2563eb'} 
                    />
                    <Text style={[
                      styles.roleText,
                      esEmpleado && styles.roleTextEmployee
                    ]}>
                      {rolMostrar}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="image" size={18} color={darkMode ? '#3794fd' : '#6897ff'} />
            <Text style={styles.sectionTitle}>Apariencia</Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: darkMode ? '#2c1cd6' : '#0e8bff' }]}>
                <Ionicons
                  name={darkMode ? "moon" : "sunny"}
                  size={22}
                  color={darkMode ? '#fcda1c' : '#ffd900'}
                />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Modo {darkMode ? 'Oscuro' : 'Claro'}</Text>
                <Text style={styles.settingSubtitle}>
                  Cambia el tema de la aplicación
                </Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={onToggleDarkMode}
              trackColor={{ false: '#d1d5db', true: '#6366f1' }}
              thumbColor={darkMode ? '#fff' : '#f3f4f6'}
              ios_backgroundColor="#d1d5db"
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle" size={18} color={darkMode ? '#3794fd' : '#6366f1'} />
            <Text style={styles.sectionTitle}>Cuenta</Text>
          </View>
          
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowPersonalInfo(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: darkMode ? '#1e3a8a' : '#dbeafe' }]}>
                <Ionicons name="person-outline" size={22} color={darkMode ? '#93c5fd' : '#2563eb'} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Información Personal</Text>
                <Text style={styles.settingSubtitle}>Actualiza tus datos</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem} 
            onPress={() => setShowSecurity(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: darkMode ? '#a0552a' : '#fef3c7' }]}>
                <Ionicons name="lock-closed-outline" size={22} color={darkMode ? '#f5ce4f' : '#d97706'} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Seguridad</Text>
                <Text style={styles.settingSubtitle}>Contraseña y acceso</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="apps" size={18} color={darkMode ? '#3794fd' : '#6366f1'} />
            <Text style={styles.sectionTitle}>Aplicación</Text>
          </View>
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => setShowSupport(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: darkMode ? '#164e63' : '#cffafe' }]}>
                <Ionicons name="help-circle-outline" size={22} color={darkMode ? '#67e8f9' : '#0891b2'} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Ayuda y Soporte</Text>
                <Text style={styles.settingSubtitle}>Centro de ayuda</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={18} color={darkMode ? '#3794fd' : '#7476d3'} />
            <Text style={styles.sectionTitle}>Legal</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => setShowTerms(true)}
            activeOpacity={0.7}
          >
           <View style={styles.settingLeft}>
              <View style={[styles.iconCircle, { backgroundColor: darkMode ? '#4b5563' : '#f3f4f6' }]}>
                <Ionicons name="document-text-outline" size={22} color={darkMode ? '#ffffff' : '#374151'} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Términos y Condiciones</Text>
                <Text style={styles.settingSubtitle}>Revisa nuestros términos</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>       
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons 
              name="information-circle" 
              size={18} 
              color={darkMode ? '#3794fd' : '#6366f1'} 
            />
            <Text style={styles.sectionTitle}>Información de la App</Text>
          </View> 
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="code-slash" size={18} color="#6b7280" />
              <Text style={styles.infoLabel}>Versión</Text>
            </View>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>   
          <View style={styles.infoDivider} /> 
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="construct" size={18} color="#6b7280" />
              <Text style={styles.infoLabel}>Build</Text>
            </View>
             <Text style={styles.infoValue}>01/02/2026</Text>
          </View>
          <View style={styles.infoDivider} />
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.85}
        >
          <View style={styles.logoutGradient}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const settingsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: Platform.OS === 'android' ? 16 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#e0f2fe',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  profileCard: {
    borderRadius: 24,
    marginBottom: 24,
    overflow: 'hidden',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: '#ffffff',
  },
  profileGradient: {
    padding: 24,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarWrapper: {
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 6,
  },
  profileEmail: {
    fontSize: 15,
    color: '#6b7280',
    marginBottom: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleBadgeEmployee: {
    backgroundColor: '#dcfce7',
  },
  roleText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '700',
  },
  roleTextEmployee: {
    color: '#166534',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1f2937',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 3,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginVertical: 4,
  },
  logoutButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
    backgroundColor: '#ef4444',
  },
  logoutText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

const settingsStylesDark = StyleSheet.create({
  ...settingsStyles,
  container: {
    ...settingsStyles.container,
    backgroundColor: '#0f172a',
  },
  header: {
    ...settingsStyles.header,
    backgroundColor: '#1e40af',
  },
  profileCard: {
    ...settingsStyles.profileCard,
    backgroundColor: '#1e293b',
  },
  profileName: {
    ...settingsStyles.profileName,
    color: '#f9fafb',
  },
  profileEmail: {
    ...settingsStyles.profileEmail,
    color: '#9ca3af',
  },
  section: {
    ...settingsStyles.section,
    backgroundColor: '#1e293b',
  },
  sectionTitle: {
    ...settingsStyles.sectionTitle,
    color: '#f9fafb',
  },
  settingTitle: {
    ...settingsStyles.settingTitle,
    color: '#f9fafb',
  },
  settingSubtitle: {
    ...settingsStyles.settingSubtitle,
    color: '#9ca3af',
  },
  infoValue: {
    ...settingsStyles.infoValue,
    color: '#f9fafb',
  },
  infoLabel: {
    ...settingsStyles.infoLabel,
    color: '#9ca3af',
  },
  infoDivider: {
    ...settingsStyles.infoDivider,
    backgroundColor: '#374151',
  },
  logoutGradient: {
    ...settingsStyles.logoutGradient,
    backgroundColor: '#dc2626',
  },
});
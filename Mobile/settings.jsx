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

// Función helper para obtener URL de foto
const obtenerUrlFotoPerfil = (foto) => {
  if (!foto) {
    return null;
  }
  
  // Si ya es una URL completa, devolverla directamente
  if (foto.startsWith('http://') || foto.startsWith('https://')) {
    return foto;
  }
  
  // Si es una ruta relativa, construir la URL completa
  const BASE_URL = 'https://9dm7dqf9-3001.usw3.devtunnels.ms';
  const url = `${BASE_URL}${foto.startsWith('/') ? '' : '/'}${foto}`;
  console.log('✅ URL construida:', url);
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
  const styles = darkMode ? settingsStylesDark : settingsStyles;
  
  // Obtener la URL completa de la foto si existe
  const fotoUrl = userData.foto ? obtenerUrlFotoPerfil(userData.foto) : null;
  // Si se está mostrando información personal, renderizar ese componente
  if (showPersonalInfo) {
    return (
      <PersonalInfoScreen 
        userData={userData}
        darkMode={darkMode}
        onBack={() => setShowPersonalInfo(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configuración</Text>
        <Text style={styles.headerSubtitle}>Ajustes de tu cuenta</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarLarge}>
              {fotoUrl ? (
                <Image 
                  source={{ uri: fotoUrl }}
                  style={styles.avatarImage}
                  onError={(error) => {
                    console.log('❌ Error cargando imagen en Settings:', error.nativeEvent.error);
                    console.log('📍 URL que falló:', fotoUrl);
                  }}
                  onLoad={() => console.log('✅ Imagen cargada correctamente en Settings')}
                />
              ) : (
                <Ionicons name="person" size={40} color="#fff" />
              )}
            </View>
            {/* Indicador de estado al lado de la foto */}
            <View style={[
              styles.statusIndicator,
              { backgroundColor: userData.estado === 'CONECTADO' ? '#10b981' : '#6b7280' }
            ]} />
          </View>
          <Text style={styles.profileName}>{userData.nombre}</Text>
          <Text style={styles.profileEmail}>{userData.email || 'usuario@correo.com'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{userData.role || 'Empleado'}</Text>
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>APARIENCIA</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons 
                name={darkMode ? "moon" : "sunny"} 
                size={20} 
                color={darkMode ? '#d1d5db' : '#6b7280'} 
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingTitle}>Tema de la aplicación</Text>
                <Text style={styles.settingSubtitle}>
                  {darkMode ? 'Modo Oscuro' : 'Modo Claro'}
                </Text>
              </View>
            </View>
            <Switch
              value={darkMode}
              onValueChange={onToggleDarkMode}
              trackColor={{ false: '#d1d5db', true: '#3b82f6' }}
              thumbColor={darkMode ? '#fff' : '#f3f4f6'}
            />
          </View>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>CUENTA</Text>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowPersonalInfo(true)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="person-outline" size={20} color={darkMode ? '#d1d5db' : '#6b7280'} />
              <Text style={styles.settingTitle}>Información Personal</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={20} color={darkMode ? '#d1d5db' : '#6b7280'} />
              <Text style={styles.settingTitle}>Notificaciones</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* App Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>APLICACIÓN</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="location-outline" size={20} color={darkMode ? '#d1d5db' : '#6b7280'} />
              <Text style={styles.settingTitle}>Áreas Permitidas</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={darkMode ? '#d1d5db' : '#6b7280'} />
              <Text style={styles.settingTitle}>Privacidad y Seguridad</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={20} color={darkMode ? '#d1d5db' : '#6b7280'} />
              <Text style={styles.settingTitle}>Ayuda y Soporte</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>INFORMACIÓN</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Versión de la app</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Última actualización</Text>
            <Text style={styles.infoValue}>16/10/2025</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={onLogout}
          activeOpacity={0.8}
        >
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const settingsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 60 : 50,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#93c5fd',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    backgroundColor: '#3b82f6',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 10,
    marginLeft: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 15,
    padding: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

const settingsStylesDark = StyleSheet.create({
  ...settingsStyles,
  container: {
    ...settingsStyles.container,
    backgroundColor: '#111827',
  },
  profileCard: {
    ...settingsStyles.profileCard,
    backgroundColor: '#1f2937',
  },
  profileName: {
    ...settingsStyles.profileName,
    color: '#fff',
  },
  profileEmail: {
    ...settingsStyles.profileEmail,
    color: '#d1d5db',
  },
  section: {
    ...settingsStyles.section,
    backgroundColor: '#1f2937',
  },
  settingTitle: {
    ...settingsStyles.settingTitle,
    color: '#fff',
  },
  infoValue: {
    ...settingsStyles.infoValue,
    color: '#fff',
  },
  infoLabel: {
    ...settingsStyles.infoLabel,
    color: '#d1d5db',
  },
});
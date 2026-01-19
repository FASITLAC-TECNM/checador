import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RegisterButton } from '../map/RegisterButton';
import { NotificacionesModal } from './NotificacionesModal';

const obtenerUrlFotoPerfil = (foto) => {
  if (!foto) return null;
  if (foto.startsWith('http://') || foto.startsWith('https://')) return foto;
  const BASE_URL = 'https://9dm7dqf9-3001.usw3.devtunnels.ms';
  return `${BASE_URL}${foto.startsWith('/') ? '' : '/'}${foto}`;
};

export const HomeScreen = ({ userData, darkMode }) => {
  const [showNotificaciones, setShowNotificaciones] = useState(false);

  const styles = darkMode ? homeStylesDark : homeStyles;
  const fotoUrl = userData.foto ? obtenerUrlFotoPerfil(userData.foto) : null;
  const empleado = userData.empleado || null;
  const departamento = userData.departamento || null;
  const rolMostrar = empleado ? 'Empleado' : (userData.rol?.nombre_rol || 'Usuario');

  const handleRegistroExitoso = (data) => {
    console.log('✅ Registro exitoso:', data);
  };

  const obtenerSaludo = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Buenos días';
    if (hora < 19) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#2563eb"
        translucent={false}
      />
      
      {/* Modal de Notificaciones */}
      <NotificacionesModal
        visible={showNotificaciones}
        onClose={() => setShowNotificaciones(false)}
        darkMode={darkMode}
      />
      
      {/* Header mejorado */}
      <View style={styles.headerWrapper}>
        <LinearGradient
          colors={['#2563eb', '#3b82f6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarContainer}>
                {fotoUrl ? (
                  <Image 
                    source={{ uri: fotoUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={26} color="#FFFF" />
                  </View>
                )}
                <View style={[
                  styles.statusDot,
                  { backgroundColor: userData.conexion === 'Conectado' ? '#10b981' : '#6b7280' }
                ]} />
              </View>
              
              <View style={styles.headerInfo}>
                <Text style={styles.headerGreeting}>{obtenerSaludo()}</Text>
                <Text style={styles.headerName} numberOfLines={1}>{userData.nombre}</Text>
                {departamento && (
                  <View style={styles.departmentChip}>
                    <Ionicons name="briefcase-outline" size={11} color="#e0f2fe" />
                    <Text style={styles.departmentChipText} numberOfLines={1}>
                      {departamento.nombre_departamento}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            
            <View style={styles.headerRight}>
              <View style={[
                styles.roleChip,
                empleado && { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
                !empleado && { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
              ]}>
                <Text style={styles.roleChipText}>{rolMostrar}</Text>
              </View>
              
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => setShowNotificaciones(true)}
              >
                <Ionicons name="notifications-outline" size={22} color="#fff" />
                <View style={styles.badge} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="calendar-outline" size={20} color="#2563eb" />
            </View>
            <Text style={styles.statValue}>24</Text>
            <Text style={styles.statLabel}>Días laborados</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time-outline" size={20} color="#10b981" />
            </View>
            <Text style={styles.statValue}>8:30</Text>
            <Text style={styles.statLabel}>Hora promedio</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.statValue}>98%</Text>
            <Text style={styles.statLabel}>Asistencia</Text>
          </View>
        </View>

        {/* Register Button */}
        <RegisterButton 
          userData={userData} 
          darkMode={darkMode}
          onRegistroExitoso={handleRegistroExitoso}
        />

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Actividad Reciente</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Ver todo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Ionicons name="log-in" size={18} color="#10b981" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Entrada registrada</Text>
              <Text style={styles.activityTime}>Hoy a las 08:15 AM</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </View>

          <View style={styles.activityCard}>
            <View style={styles.activityIcon}>
              <Ionicons name="log-out" size={18} color="#ef4444" />
            </View>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Salida registrada</Text>
              <Text style={styles.activityTime}>Ayer a las 05:30 PM</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const homeStyles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerWrapper: {
    backgroundColor: '#2563eb',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 16 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#f1f5f9',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    borderColor: '#2563eb',
  },
  headerInfo: {
    flex: 1,
  },
  headerGreeting: {
    fontSize: 13,
    color: '#e0f2fe',
    fontWeight: '500',
  },
  headerName: {
    fontSize: 19,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 2,
    marginBottom: 4,
  },
  departmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 4,
  },
  departmentChipText: {
    fontSize: 11,
    color: '#e0f2fe',
    fontWeight: '600',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 10,
  },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  roleChipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  notificationButton: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  seeAllText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#64748b',
  },
});

const homeStylesDark = StyleSheet.create({
  ...homeStyles,
  mainContainer: {
    ...homeStyles.mainContainer,
    backgroundColor: '#0f172a',
  },
  headerWrapper: {
    ...homeStyles.headerWrapper,
    backgroundColor: '#1e293b',
  },
  statCard: {
    ...homeStyles.statCard,
    backgroundColor: '#1e293b',
  },
  statValue: {
    ...homeStyles.statValue,
    color: '#f1f5f9',
  },
  activityCard: {
    ...homeStyles.activityCard,
    backgroundColor: '#1e293b',
  },
  activityTitle: {
    ...homeStyles.activityTitle,
    color: '#f1f5f9',
  },
  sectionTitle: {
    ...homeStyles.sectionTitle,
    color: '#f1f5f9',
  },
});
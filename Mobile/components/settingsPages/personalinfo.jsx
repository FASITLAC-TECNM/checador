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

export const PersonalInfoScreen = ({ userData, darkMode, onBack }) => {
  // Seleccionamos los estilos según el modo
  const styles = darkMode ? personalInfoStylesDark : personalInfoStyles;

  // Estados para controlar "Ver más / Ver menos"
  const [expandirDeptos, setExpandirDeptos] = useState(false);
  const [expandirRoles, setExpandirRoles] = useState(false);

  const fotoUrl = userData.foto ? obtenerUrlFotoPerfil(userData.foto) : null;
  
  const esEmpleado = userData.es_empleado && userData.empleado_id;
  const empleadoInfo = userData.empleadoInfo || null;
  const roles = userData.roles || [];
  
  const rolMostrar = esEmpleado
    ? 'Empleado'
    : (roles.length > 0 ? roles[0].nombre : (userData.esAdmin ? 'Administrador' : 'Usuario'));

  const departamentos = empleadoInfo?.departamentos || [];

  // Componente auxiliar para filas simples
  const InfoRow = ({ icon, label, value, valueColor }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <View style={[styles.iconCircle, { backgroundColor: darkMode ? '#1e3a8a' : '#dbeafe' }]}>
          <Ionicons name={icon} size={18} color={darkMode ? '#93c5fd' : '#2563eb'} />
        </View>
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>
        {value || 'No disponible'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={darkMode ? "#1e40af" : "#2563eb"} 
        translucent={false} 
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileGradient}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {fotoUrl ? (
                  <Image source={{ uri: fotoUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={40} color="#fff" />
                  </View>
                )}
                <View style={[styles.statusIndicator, { backgroundColor: '#10b981' }]} />
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userData.nombre}</Text>
                <Text style={styles.profileUsername}>@{userData.usuario}</Text>
                
                <View style={styles.badgesRow}>
                  <View style={[styles.roleBadge, esEmpleado && styles.roleBadgeEmployee]}>
                    <Ionicons 
                      name={esEmpleado ? "briefcase" : "person"} 
                      size={10} 
                      color={esEmpleado ? '#166534' : '#2563eb'} 
                    />
                    <Text style={[styles.roleText, esEmpleado && styles.roleTextEmployee]}>
                      {rolMostrar}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Sección: Información Personal */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle" size={18} color={darkMode ? '#818cf8' : '#6366f1'} />
            <Text style={styles.sectionTitle}>Información Personal</Text>
          </View>

          <InfoRow icon="person-outline" label="Usuario" value={userData.usuario} />
          <InfoRow icon="mail-outline" label="Email" value={userData.correo} />
          <InfoRow icon="call-outline" label="Teléfono" value={userData.telefono || 'No registrado'} />
        </View>

        {/* Sección: Datos Laborales */}
        {esEmpleado && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="briefcase" size={18} color={darkMode ? '#818cf8' : '#6366f1'} />
              <Text style={styles.sectionTitle}>Datos Laborales</Text>
            </View>

            <InfoRow 
              icon="document-text-outline" 
              label="RFC" 
              value={userData.rfc || empleadoInfo?.rfc || 'No registrado'} 
            />
            <InfoRow 
              icon="shield-outline" 
              label="NSS" 
              value={userData.nss || empleadoInfo?.nss || 'No registrado'} 
            />

            {/* DEPARTAMENTOS con "Ver más" */}
            {departamentos.length > 0 && (
              <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
                <View style={styles.infoLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: darkMode ? '#581c87' : '#f3e8ff' }]}>
                    <Ionicons name="business-outline" size={18} color={darkMode ? '#d8b4fe' : '#9333ea'} />
                  </View>
                  <Text style={styles.infoLabel}>Deptos.</Text>
                </View>
                
                <View style={styles.departmentsContainer}>
                  {(expandirDeptos ? departamentos : departamentos.slice(0, 3)).map((depto, index) => (
                    <View key={index} style={styles.departmentBadge}>
                      <Text style={styles.departmentText} numberOfLines={1} ellipsizeMode="tail">
                        {depto.nombre}
                      </Text>
                    </View>
                  ))}
                  
                  {departamentos.length > 3 && (
                    <TouchableOpacity 
                      onPress={() => setExpandirDeptos(!expandirDeptos)}
                      style={{ marginTop: 4 }}
                    >
                      <Text style={styles.seeMoreText}>
                        {expandirDeptos ? 'Ver menos' : `+ ${departamentos.length - 3} más...`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* ROLES con "Ver más" */}
            {roles.length > 0 && (
              <View style={[styles.infoRow, { alignItems: 'flex-start' }]}>
                <View style={styles.infoLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: darkMode ? '#7f1d1d' : '#fee2e2' }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={darkMode ? '#fca5a5' : '#dc2626'} />
                  </View>
                  <Text style={styles.infoLabel}>Roles</Text>
                </View>
                
                <View style={styles.departmentsContainer}>
                  {(expandirRoles ? roles : roles.slice(0, 3)).map((rol, index) => (
                    <View 
                      key={index} 
                      style={[styles.departmentBadge, { backgroundColor: darkMode ? '#7f1d1d' : '#fee2e2' }]}
                    >
                      <Text 
                        style={[styles.departmentText, { color: darkMode ? '#fca5a5' : '#dc2626' }]}
                        numberOfLines={1}
                      >
                        {rol.nombre}
                      </Text>
                    </View>
                  ))}
                   
                  {roles.length > 3 && (
                    <TouchableOpacity 
                      onPress={() => setExpandirRoles(!expandirRoles)}
                      style={{ marginTop: 4 }}
                    >
                      <Text style={[styles.seeMoreText, { color: darkMode ? '#fca5a5' : '#dc2626' }]}>
                        {expandirRoles ? 'Ver menos' : `+ ${roles.length - 3} más...`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Sección: Acciones */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="settings" size={18} color={darkMode ? '#818cf8' : '#6366f1'} />
            <Text style={styles.sectionTitle}>Acciones</Text>
          </View>

          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <View style={[styles.iconCircle, { backgroundColor: darkMode ? '#1e3a8a' : '#dbeafe' }]}>
                <Ionicons name="create-outline" size={18} color={darkMode ? '#93c5fd' : '#2563eb'} />
              </View>
              <Text style={styles.actionText}>Editar información</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <View style={[styles.iconCircle, { backgroundColor: darkMode ? '#065f46' : '#d1fae5' }]}>
                <Ionicons name="camera-outline" size={18} color={darkMode ? '#6ee7b7' : '#059669'} />
              </View>
              <Text style={styles.actionText}>Cambiar foto</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
            <View style={styles.actionLeft}>
              <View style={[styles.iconCircle, { backgroundColor: darkMode ? '#78350f' : '#fef3c7' }]}>
                <Ionicons name="lock-closed-outline" size={18} color={darkMode ? '#fde047' : '#d97706'} />
              </View>
              <Text style={styles.actionText}>Cambiar contraseña</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// --- ESTILOS ---
const personalInfoStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: Platform.OS === 'android' ? 16 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 100,
  },
  profileCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    backgroundColor: '#ffffff',
  },
  profileGradient: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  roleBadgeEmployee: {
    backgroundColor: '#dcfce7',
  },
  roleText: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '600',
  },
  roleTextEmployee: {
    color: '#166534',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
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
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0, 
    marginRight: 12, 
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'right',
    flex: 1, 
  },
  departmentsContainer: {
    flex: 1, 
    flexDirection: 'column',
    alignItems: 'flex-end', 
    gap: 4,
  },
  departmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3e8ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
    marginBottom: 4,
    maxWidth: '100%', 
  },
  departmentText: {
    color: '#6366f1',
    fontSize: 11,
    fontWeight: '600',
  },
  seeMoreText: {
    fontSize: 11, 
    fontWeight: '600',
    color: '#9333ea',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
});

const personalInfoStylesDark = StyleSheet.create({
  ...personalInfoStyles,
  container: {
    ...personalInfoStyles.container,
    backgroundColor: '#0f172a',
  },
  header: {
    ...personalInfoStyles.header,
    backgroundColor: '#1e40af',
  },
  profileCard: {
    ...personalInfoStyles.profileCard,
    backgroundColor: '#1e293b',
  },
  profileName: {
    ...personalInfoStyles.profileName,
    color: '#f9fafb',
  },
  profileUsername: {
    ...personalInfoStyles.profileUsername,
    color: '#9ca3af',
  },
  section: {
    ...personalInfoStyles.section,
    backgroundColor: '#1e293b',
  },
  sectionTitle: {
    ...personalInfoStyles.sectionTitle,
    color: '#f9fafb',
  },
  infoLabel: {
    ...personalInfoStyles.infoLabel,
    color: '#9ca3af',
  },
  infoValue: {
    ...personalInfoStyles.infoValue,
    color: '#f9fafb',
  },
  actionText: {
    ...personalInfoStyles.actionText,
    color: '#f9fafb',
  },
  seeMoreText: {
    ...personalInfoStyles.seeMoreText,
    color: '#d8b4fe',
  }
});
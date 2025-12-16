import React from 'react';
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
  return url;
};

export const PersonalInfoScreen = ({ userData, darkMode, onBack }) => {
  const styles = darkMode ? personalInfoStylesDark : personalInfoStyles;

  // Obtener la URL completa de la foto si existe
  const fotoUrl = userData.foto ? obtenerUrlFotoPerfil(userData.foto) : null;

  // Extraer datos adicionales
  const empleado = userData.empleado || null;
  const rol = userData.rol || null;
  const departamento = userData.departamento || null;
  const permisos = userData.permisos || [];

  // Si es empleado, priorizar rol "Empleado"
  const rolMostrar = empleado ? 'Empleado' : (rol?.nombre_rol || 'Usuario');

  const InfoRow = ({ icon, label, value, valueColor }) => (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon} size={20} color={darkMode ? '#93c5fd' : '#2563eb'} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>
        {value || 'No disponible'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Información Personal</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            {fotoUrl ? (
              <Image
                source={{ uri: fotoUrl }}
                style={styles.avatarImage}
                onError={(error) => {
                  console.log('❌ Error cargando imagen:', error.nativeEvent.error);
                }}
                onLoad={() => console.log('✅ Imagen cargada correctamente')}
              />
            ) : (
              <Ionicons name="person" size={60} color="#fff" />
            )}
          </View>
          <Text style={styles.profileName}>{userData.nombre}</Text>
          <Text style={styles.profileUsername}>@{userData.username}</Text>

          {/* Estado de conexión */}
          <View style={styles.statusBadge}>
            <View style={[
              styles.statusDot,
              { backgroundColor: userData.conexion === 'Conectado' ? '#10b981' : '#6b7280' }
            ]} />
            <Text style={styles.statusText}>
              {userData.conexion === 'Conectado' ? 'En línea' : 'Desconectado'}
            </Text>
          </View>
        </View>

        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>INFORMACIÓN DE CUENTA</Text>

          <InfoRow
            icon="person-outline"
            label="Nombre de usuario"
            value={userData.username}
          />

          <InfoRow
            icon="mail-outline"
            label="Correo electrónico"
            value={userData.email}
          />

          <InfoRow
            icon="call-outline"
            label="Teléfono"
            value={userData.telefono || 'No registrado'}
          />

          <InfoRow
            icon="id-card-outline"
            label="ID de usuario"
            value={`#${userData.id}`}
          />
        </View>

        {/* Employee Information - Solo si es empleado */}
        {empleado && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>INFORMACIÓN DE EMPLEADO</Text>

            <InfoRow
              icon="briefcase-outline"
              label="ID de empleado"
              value={`#${empleado.id_empleado}`}
            />

            <InfoRow
              icon="document-text-outline"
              label="RFC"
              value={empleado.rfc || 'No registrado'}
            />

            <InfoRow
              icon="card-outline"
              label="NSS"
              value={empleado.nss || 'No registrado'}
            />

            {departamento && (
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <Ionicons name="business-outline" size={20} color={darkMode ? '#93c5fd' : '#2563eb'} />
                  <Text style={styles.infoLabel}>Departamento</Text>
                </View>
                <View style={[
                  styles.departmentBadge,
                  departamento.color && { backgroundColor: `${departamento.color}20` }
                ]}>
                  <Text style={[
                    styles.departmentText,
                    departamento.color && { color: departamento.color }
                  ]}>
                    {departamento.nombre_departamento}
                  </Text>
                </View>
              </View>
            )}

            {departamento?.ubicacion && (
              <InfoRow
                icon="location-outline"
                label="Ubicación"
                value={departamento.ubicacion}
              />
            )}
          </View>
        )}

        {/* Status and Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ESTADO Y PERMISOS</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={darkMode ? '#93c5fd' : '#2563eb'} />
              <Text style={styles.infoLabel}>Rol</Text>
            </View>
            <View style={[
              styles.roleBadge,
              empleado && { backgroundColor: '#dcfce7' } // Verde para empleados
            ]}>
              <Text style={[
                styles.roleText,
                empleado && { color: '#166534' } // Verde oscuro para empleados
              ]}>
                {rolMostrar}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="checkmark-circle-outline" size={20} color={darkMode ? '#93c5fd' : '#2563eb'} />
              <Text style={styles.infoLabel}>Estado de cuenta</Text>
            </View>
            <View style={[
              styles.statusChip,
              { backgroundColor: userData.activo === 'Activo' ? '#dcfce7' : '#fee2e2' }
            ]}>
              <Text style={[
                styles.statusChipText,
                { color: userData.activo === 'Activo' ? '#166534' : '#991b1b' }
              ]}>
                {userData.activo || 'Inactivo'}
              </Text>
            </View>
          </View>

          {/* Permisos del usuario */}
          {permisos && permisos.length > 0 && (
            <View style={styles.permissionsContainer}>
              <Text style={styles.permissionsTitle}>Módulos Permitidos</Text>
              {permisos.map((permiso, index) => (
                <View key={index} style={styles.permissionItem}>
                  <View style={styles.permissionLeft}>
                    <Ionicons name="grid-outline" size={16} color="#6b7280" />
                    <Text style={styles.permissionModule}>{permiso.nombre_modulo}</Text>
                  </View>
                  <View style={styles.permissionActions}>
                    {permiso.ver && <Text style={styles.permissionBadge}>Ver</Text>}
                    {permiso.crear && <Text style={styles.permissionBadge}>Crear</Text>}
                    {permiso.editar && <Text style={styles.permissionBadge}>Editar</Text>}
                    {permiso.eliminar && <Text style={styles.permissionBadge}>Eliminar</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCIONES</Text>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionLeft}>
              <Ionicons name="create-outline" size={20} color={darkMode ? '#d1d5db' : '#6b7280'} />
              <Text style={styles.actionText}>Editar información</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionLeft}>
              <Ionicons name="camera-outline" size={20} color={darkMode ? '#d1d5db' : '#6b7280'} />
              <Text style={styles.actionText}>Cambiar foto de perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionLeft}>
              <Ionicons name="lock-closed-outline" size={20} color={darkMode ? '#d1d5db' : '#6b7280'} />
              <Text style={styles.actionText}>Cambiar contraseña</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const personalInfoStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: Platform.OS === 'android' ? 60 : 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  profileSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    backgroundColor: '#3b82f6',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: '#dbeafe',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 5,
  },
  profileUsername: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 15,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
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
    marginBottom: 15,
    marginLeft: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 10,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'right',
    maxWidth: '50%',
  },
  roleBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  departmentBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  departmentText: {
    color: '#1f2937',
    fontSize: 13,
    fontWeight: '600',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  permissionsContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  permissionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  permissionItem: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  permissionModule: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  permissionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permissionBadge: {
    backgroundColor: '#dcfce7',
    color: '#166534',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 11,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 12,
  },
});

const personalInfoStylesDark = StyleSheet.create({
  ...personalInfoStyles,
  container: {
    ...personalInfoStyles.container,
    backgroundColor: '#111827',
  },
  profileSection: {
    ...personalInfoStyles.profileSection,
    backgroundColor: '#1f2937',
  },
  profileName: {
    ...personalInfoStyles.profileName,
    color: '#fff',
  },
  profileUsername: {
    ...personalInfoStyles.profileUsername,
    color: '#d1d5db',
  },
  statusBadge: {
    ...personalInfoStyles.statusBadge,
    backgroundColor: '#374151',
  },
  section: {
    ...personalInfoStyles.section,
    backgroundColor: '#1f2937',
  },
  infoRow: {
    ...personalInfoStyles.infoRow,
    borderBottomColor: '#374151',
  },
  infoValue: {
    ...personalInfoStyles.infoValue,
    color: '#fff',
  },
  infoLabel: {
    ...personalInfoStyles.infoLabel,
    color: '#d1d5db',
  },
  permissionModule: {
    ...personalInfoStyles.permissionModule,
    color: '#fff',
  },
  permissionsTitle: {
    ...personalInfoStyles.permissionsTitle,
    color: '#fff',
  },
  permissionItem: {
    ...personalInfoStyles.permissionItem,
    backgroundColor: '#374151',
  },
  actionButton: {
    ...personalInfoStyles.actionButton,
    borderBottomColor: '#374151',
  },
  actionText: {
    ...personalInfoStyles.actionText,
    color: '#fff',
  },
});

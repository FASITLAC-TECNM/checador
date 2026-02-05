import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TERMS_ACCEPTED_KEY = '@terms_accepted';

export const TermsAndConditionsScreen = ({ darkMode, onBack }) => {
  const [expandedSections, setExpandedSections] = useState({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Cargar estado guardado al montar
  useEffect(() => {
    const cargarEstado = async () => {
      try {
        const savedState = await AsyncStorage.getItem(TERMS_ACCEPTED_KEY);
        if (savedState === 'true') {
          setAcceptedTerms(true);
        }
      } catch (error) {
      }
    };
    cargarEstado();
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Guardar en AsyncStorage cuando cambia
  const handleToggleAcceptance = async () => {
    const newValue = !acceptedTerms;
    setAcceptedTerms(newValue);
    try {
      await AsyncStorage.setItem(TERMS_ACCEPTED_KEY, String(newValue));
    } catch (error) {
    }
  };

  const onAccept = () => {
    if (acceptedTerms) {
      onBack();
    }
  };

  const onDecline = async () => {
    try {
      await AsyncStorage.removeItem(TERMS_ACCEPTED_KEY);
      setAcceptedTerms(false);
    } catch (error) {
    }
    onBack();
  };

  const styles = darkMode ? termsStylesDark : termsStyles;

  const sections = [
    {
      id: 'acceptance',
      icon: 'checkmark-circle-outline',
      color: '#10b981',
      bg: '#d1fae5',
      title: 'Aceptación de Términos',
      content: 'Al utilizar esta aplicación de control de asistencia, usted acepta estar sujeto a estos términos y condiciones. Si no está de acuerdo con alguna parte de estos términos, no debe utilizar la aplicación.'
    },
    {
      id: 'data',
      icon: 'shield-checkmark-outline',
      color: '#3b82f6',
      bg: '#dbeafe',
      title: 'Recopilación de Datos',
      content: 'La aplicación recopila información necesaria para el control de asistencia laboral, incluyendo:\n\n• Datos de identificación del empleado\n• Registros de entrada y salida\n• Ubicación geográfica durante el registro (cuando aplique)\n• Fotografías para verificación de identidad\n• Información de horarios laborales\n\nTodos los datos son tratados conforme a la legislación vigente de protección de datos personales.'
    },
    {
      id: 'usage',
      icon: 'phone-portrait-outline',
      color: '#8b5cf6',
      bg: '#ede9fe',
      title: 'Uso de la Aplicación',
      content: 'Usted se compromete a:\n\n• Utilizar la aplicación únicamente para registrar su propia asistencia\n• No compartir sus credenciales de acceso\n• Mantener la información de su cuenta segura\n• No intentar vulnerar los sistemas de seguridad\n• Reportar cualquier mal funcionamiento o error\n\nEl uso indebido de la aplicación puede resultar en la suspensión de acceso y sanciones laborales.'
    },
    {
      id: 'location',
      icon: 'location-outline',
      color: '#ef4444',
      bg: '#fee2e2',
      title: 'Servicios de Ubicación',
      content: 'La aplicación puede solicitar acceso a su ubicación geográfica para:\n\n• Verificar que el registro se realiza desde ubicaciones autorizadas\n• Generar reportes de asistencia con datos de ubicación\n• Cumplir con requisitos de auditoría laboral\n\nPuede desactivar los servicios de ubicación en la configuración de su dispositivo, aunque esto puede limitar algunas funcionalidades.'
    },
    {
      id: 'privacy',
      icon: 'lock-closed-outline',
      color: '#f59e0b',
      bg: '#fef3c7',
      title: 'Privacidad y Seguridad',
      content: 'Nos comprometemos a:\n\n• Proteger su información personal con medidas de seguridad apropiadas\n• No compartir sus datos con terceros sin su consentimiento\n• Utilizar la información únicamente para fines laborales autorizados\n• Mantener la confidencialidad de sus registros\n• Cumplir con todas las leyes de protección de datos aplicables'
    },
    {
      id: 'photos',
      icon: 'camera-outline',
      color: '#06b6d4',
      bg: '#cffafe',
      title: 'Uso de Fotografías',
      content: 'Las fotografías capturadas durante el registro de asistencia:\n\n• Se utilizan exclusivamente para verificación de identidad\n• Son almacenadas de forma segura en nuestros servidores\n• No serán compartidas públicamente ni con terceros no autorizados\n• Pueden ser revisadas por personal de recursos humanos\n• Serán eliminadas conforme a las políticas de retención de datos'
    },
    {
      id: 'modifications',
      icon: 'create-outline',
      color: '#ec4899',
      bg: '#fce7f3',
      title: 'Modificaciones',
      content: 'Nos reservamos el derecho de modificar estos términos y condiciones en cualquier momento. Los cambios significativos serán notificados a través de la aplicación. El uso continuado de la aplicación después de las modificaciones constituye la aceptación de los nuevos términos.'
    },
    {
      id: 'liability',
      icon: 'warning-outline',
      color: '#f97316',
      bg: '#ffedd5',
      title: 'Limitación de Responsabilidad',
      content: 'La empresa no será responsable por:\n\n• Pérdida de datos debido a fallas técnicas\n• Interrupciones en el servicio por mantenimiento\n• Problemas de conectividad del dispositivo\n• Uso no autorizado de credenciales por terceros\n\nLa aplicación se proporciona "tal cual" sin garantías de ningún tipo.'
    },
    {
      id: 'rights',
      icon: 'person-outline',
      color: '#6366f1',
      bg: '#e0e7ff',
      title: 'Derechos del Usuario',
      content: 'Como usuario, tiene derecho a:\n\n• Acceder a sus datos personales almacenados\n• Solicitar corrección de información incorrecta\n• Solicitar la eliminación de sus datos (conforme a políticas de retención)\n• Recibir una copia de su información\n• Presentar quejas ante autoridades de protección de datos\n\nPara ejercer estos derechos, contacte a recursos humanos.'
    },
    {
      id: 'contact',
      icon: 'mail-outline',
      color: '#5c9c42',
      bg: '#ccfbf1',
      title: 'Contacto',
      content: 'Para cualquier queja o sugerencia de la aplicación, puede contactar al grupo FASITLAC'
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={darkMode ? "#1e40af" : "#2563eb"} 
        translucent={false} 
      />
      
      {/* Header estandarizado */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Términos y condiciones</Text>
            <Text style={styles.headerSubtitle}>Información legal</Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Card de introducción */}
        <View style={styles.introCard}>
          <View style={styles.introHeader}>
            <View style={styles.introIconContainer}>
              <Ionicons name="document-text" size={24} color="#2563eb" />
            </View>
            <View style={styles.introTextContainer}>
              <Text style={styles.introTitle}>Última actualización</Text>
              <Text style={styles.introDate}>
                {new Date().toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </Text>
            </View>
          </View>
          <View style={styles.introDivider} />
          <Text style={styles.introDescription}>
            Estos términos y condiciones rigen el uso de la aplicación de control de asistencia. 
            Es importante que los lea y comprenda antes de utilizar la aplicación.
          </Text>
        </View>

        {/* Secciones Expandibles */}
        {sections.map((section, index) => (
          <TouchableOpacity
            key={section.id}
            style={[
              styles.sectionCard,
              expandedSections[section.id] && styles.sectionCardExpanded
            ]}
            onPress={() => toggleSection(section.id)}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.sectionIconContainer, { backgroundColor: section.color }]}>
                  <Ionicons name={section.icon} size={22} color="#fff" />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={[
                styles.chevronContainer,
                expandedSections[section.id] && styles.chevronContainerExpanded
              ]}>
                <Ionicons 
                  name={expandedSections[section.id] ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={expandedSections[section.id] ? section.color : "#9ca3af"}
                />
              </View>
            </View>

            {expandedSections[section.id] && (
              <View style={styles.sectionContent}>
                <View style={[styles.sectionDivider, { backgroundColor: section.bg }]} />
                <Text style={styles.sectionText}>{section.content}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {/* Checkbox de Aceptación */}
        <View style={styles.acceptanceCard}>
          <View style={[
            styles.acceptanceGradient,
            { backgroundColor: acceptedTerms ? '#2563eb' : '#f3f4f6' }
          ]}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={handleToggleAcceptance}
              activeOpacity={0.7}
            >
              <View style={styles.checkboxWrapper}>
                <View style={[
                  styles.checkbox,
                  acceptedTerms && styles.checkboxChecked
                ]}>
                  {acceptedTerms && (
                    <Ionicons name="checkmark" size={20} color="#000" />
                  )}
                </View>
              </View>
              <Text style={[
                styles.checkboxLabel,
                acceptedTerms && styles.checkboxLabelActive
              ]}>
                He leído y acepto los términos y condiciones
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Botones de Acción */}
        <View style={styles.buttonContainer}>
          {acceptedTerms && (
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={onAccept}
              activeOpacity={0.85}
            >
              <View style={styles.buttonGradient}>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.buttonTitle}>Aceptar y Continuar</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          )}

          {!acceptedTerms && (
            <View style={styles.acceptDisabledCard}>
              <View style={styles.acceptDisabledContent}>
                <Ionicons name="information-circle" size={24} color="#6b7280" />
                <View style={styles.acceptDisabledTextContainer}>
                  <Text style={styles.acceptDisabledTitle}>Acepta los términos</Text>
                  <Text style={styles.acceptDisabledSubtitle}>
                    Marca la casilla arriba para continuar
                  </Text>
                </View>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.declineButton}
            onPress={onDecline}
            activeOpacity={0.7}
          >
            <View style={styles.declineContent}>
              <Ionicons name="close-circle-outline" size={22} color="#ef4444" />
              <Text style={styles.declineButtonText}>Rechazar y Volver</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="information-circle" size={20} color="#2563eb" />
          <Text style={styles.footerText}>
            Al aceptar estos términos, confirma que ha leído y comprendido todos los puntos mencionados.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const termsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#2563eb',
    paddingTop: Platform.OS === 'android' ? 16 : 50,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0f2fe',
    marginTop: 2,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  introCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  introIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  introTextContainer: {
    flex: 1,
  },
  introTitle: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 2,
  },
  introDate: {
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '700',
  },
  introDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 16,
  },
  introDescription: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sectionCardExpanded: {
    borderColor: '#e0e7ff',
    shadowOpacity: 0.12,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronContainerExpanded: {
    backgroundColor: '#e0e7ff',
  },
  sectionContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionDivider: {
    height: 2,
    marginBottom: 14,
    borderRadius: 1,
  },
  sectionText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
  },
  acceptanceCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 24,
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  acceptanceGradient: {
    padding: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxWrapper: {
    marginRight: 14,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  checkboxChecked: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 15,
    color: '#6b7280',
    fontWeight: '600',
  },
  checkboxLabelActive: {
    color: '#fff',
  },
  buttonContainer: {
    marginBottom: 20,
    gap: 12,
  },
  acceptButton: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  buttonTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  acceptDisabledCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  acceptDisabledContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  acceptDisabledTextContainer: {
    flex: 1,
  },
  acceptDisabledTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 2,
  },
  acceptDisabledSubtitle: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  declineButton: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fee2e2',
    overflow: 'hidden',
  },
  declineContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  declineButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#dbeafe',
    borderRadius: 12,
    gap: 12,
  },
  footerText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
    fontWeight: '500',
  },
});

const termsStylesDark = StyleSheet.create({
  ...termsStyles,
  container: {
    ...termsStyles.container,
    backgroundColor: '#0f172a',
  },
  header: {
    ...termsStyles.header,
    backgroundColor: '#1e40af',
  },
  introCard: {
    ...termsStyles.introCard,
    backgroundColor: '#1e293b',
  },
  introIconContainer: {
    ...termsStyles.introIconContainer,
    backgroundColor: '#1e3a8a',
  },
  introDate: {
    ...termsStyles.introDate,
    color: '#f9fafb',
  },
  introDivider: {
    ...termsStyles.introDivider,
    backgroundColor: '#334155',
  },
  introDescription: {
    ...termsStyles.introDescription,
    color: '#d1d5db',
  },
  sectionCard: {
    ...termsStyles.sectionCard,
    backgroundColor: '#1e293b',
  },
  sectionCardExpanded: {
    ...termsStyles.sectionCardExpanded,
    borderColor: '#4338ca',
  },
  sectionTitle: {
    ...termsStyles.sectionTitle,
    color: '#f9fafb',
  },
  chevronContainer: {
    ...termsStyles.chevronContainer,
    backgroundColor: '#334155',
  },
  chevronContainerExpanded: {
    ...termsStyles.chevronContainerExpanded,
    backgroundColor: '#4338ca',
  },
  sectionText: {
    ...termsStyles.sectionText,
    color: '#d1d5db',
  },
  acceptanceGradient: {
    ...termsStyles.acceptanceGradient,
  },
  checkboxLabel: {
    ...termsStyles.checkboxLabel,
    color: '#9ca3af',
  },
  acceptDisabledCard: {
    ...termsStyles.acceptDisabledCard,
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  acceptDisabledTitle: {
    ...termsStyles.acceptDisabledTitle,
    color: '#9ca3af',
  },
  acceptDisabledSubtitle: {
    ...termsStyles.acceptDisabledSubtitle,
    color: '#6b7280',
  },
  declineButton: {
    ...termsStyles.declineButton,
    backgroundColor: '#1e293b',
    borderColor: '#7f1d1d',
  },
  declineButtonText: {
    ...termsStyles.declineButtonText,
    color: '#fca5a5',
  },
  footer: {
    ...termsStyles.footer,
    backgroundColor: '#1e3a8a',
  },
  footerText: {
    ...termsStyles.footerText,
    color: '#93c5fd',
  },
});

export default TermsAndConditionsScreen;
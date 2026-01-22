import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const SupportScreen = ({ darkMode, onBack, userData }) => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const styles = darkMode ? supportStylesDark : supportStyles;

  // FAQs estáticas
  const faqs = [
    {
      id: 1,
      pregunta: "¿Cómo registro mi entrada?",
      respuesta: "Para registrar tu entrada, ve a la pantalla de Inicio y presiona el botón central. Asegúrate de estar dentro del área permitida y tener el GPS activado.",
      icon: "log-in"
    },
    {
      id: 2,
      pregunta: "¿Por qué no funciona mi ubicación?",
      respuesta: "Verifica que tengas el GPS activado en tu dispositivo. También asegúrate de que la app tenga permisos de ubicación. Ve a Configuración > Privacidad > Ubicación.",
      icon: "location"
    },
    {
      id: 3,
      pregunta: "¿Cómo cambio mi foto de perfil?",
      respuesta: "Ve a Configuración > Información Personal y presiona sobre tu foto actual. Podrás tomar una nueva foto o seleccionar una de tu galería.",
      icon: "camera"
    },
    {
      id: 4,
      pregunta: "¿Qué hago si olvidé mi contraseña?",
      respuesta: "En la pantalla de inicio de sesión, presiona 'Olvidé mi contraseña'. Recibirás un correo con instrucciones para restablecerla.",
      icon: "lock-closed"
    },
    {
      id: 5,
      pregunta: "¿Cómo veo mi historial de registros?",
      respuesta: "Ve a la pestaña de Reportes para ver todos tus registros de entrada y salida. Puedes filtrar por fecha y exportar tus datos.",
      icon: "time"
    },
    {
      id: 6,
      pregunta: "La app se cierra inesperadamente",
      respuesta: "Intenta cerrar completamente la app y volver a abrirla. Si el problema persiste, verifica que tengas la última versión instalada o contacta a soporte.",
      icon: "alert-circle"
    }
  ];

  const contactOptions = [
    {
      id: 1,
      title: "WhatsApp",
      subtitle: "Chat directo con soporte",
      icon: "logo-whatsapp",
      color: "#25D366",
      action: () => {
        const phone = "521234567890"; // Cambiar por el número real
        const message = `Hola, soy ${userData?.nombre || 'Usuario'}, necesito ayuda con la App de Asistencia.`;
        const url = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(message)}`;
        Linking.openURL(url).catch(() => 
          Alert.alert("Error", "WhatsApp no está instalado en tu dispositivo")
        );
      }
    },
    {
      id: 2,
      title: "Correo Electrónico",
      subtitle: "soporte@empresa.com",
      icon: "mail",
      color: "#2563eb",
      action: () => {
        const email = "soporte@empresa.com";
        const subject = "Solicitud de Soporte - App Asistencia";
        const body = `Hola,\n\nSoy ${userData?.nombre || 'Usuario'} (${userData?.correo || 'correo@ejemplo.com'}).\n\nNecesito ayuda con:\n\n`;
        const url = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        Linking.openURL(url);
      }
    },
    {
      id: 3,
      title: "Teléfono",
      subtitle: "+52 123 456 7890",
      icon: "call",
      color: "#059669",
      action: () => {
        const phone = "+521234567890";
        Alert.alert(
          "Llamar a Soporte",
          `¿Deseas llamar a ${phone}?`,
          [
            { text: "Cancelar", style: "cancel" },
            { 
              text: "Llamar", 
              onPress: () => Linking.openURL(`tel:${phone}`)
            }
          ]
        );
      }
    }
  ];

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2563eb" />
      
      {/* Header */}
      <LinearGradient
        colors={darkMode ? ['#1e40af', '#2563eb'] : ['#2563eb', '#3b82f6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Ayuda y Soporte</Text>
          <Text style={styles.headerSubtitle}>Estamos aquí para ayudarte</Text>
        </View>
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Help Card */}
        <View style={styles.quickHelpCard}>
          <LinearGradient
            colors={darkMode ? ['#1e3a8a', '#2563eb'] : ['#dbeafe', '#eff6ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.quickHelpGradient}
          >
            <View style={styles.quickHelpIconContainer}>
              <Ionicons 
                name="help-circle" 
                size={48} 
                color={darkMode ? '#93c5fd' : '#2563eb'} 
              />
            </View>
            <Text style={styles.quickHelpTitle}>
              ¿Necesitas ayuda inmediata?
            </Text>
            <Text style={styles.quickHelpText}>
              Encuentra respuestas rápidas en nuestras preguntas frecuentes o contáctanos directamente.
            </Text>
          </LinearGradient>
        </View>

        {/* Contact Options */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons 
              name="chatbubbles" 
              size={18} 
              color={darkMode ? '#818cf8' : '#6366f1'} 
            />
            <Text style={styles.sectionTitle}>Contáctanos</Text>
          </View>

          {contactOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.contactOption}
              onPress={option.action}
              activeOpacity={0.7}
            >
              <View style={[styles.contactIconCircle, { backgroundColor: `${option.color}15` }]}>
                <Ionicons name={option.icon} size={24} color={option.color} />
              </View>
              <View style={styles.contactTextContainer}>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQs */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons 
              name="help-buoy" 
              size={18} 
              color={darkMode ? '#818cf8' : '#6366f1'} 
            />
            <Text style={styles.sectionTitle}>Preguntas Frecuentes</Text>
          </View>

          {faqs.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={[
                styles.faqCard,
                expandedFaq === faq.id && styles.faqCardExpanded
              ]}
              onPress={() => toggleFaq(faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <View style={styles.faqIconCircle}>
                  <Ionicons 
                    name={faq.icon} 
                    size={20} 
                    color={darkMode ? '#818cf8' : '#6366f1'} 
                  />
                </View>
                <Text style={styles.faqQuestion}>{faq.pregunta}</Text>
                <Ionicons
                  name={expandedFaq === faq.id ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#9ca3af"
                />
              </View>
              
              {expandedFaq === faq.id && (
                <View style={styles.faqAnswerContainer}>
                  <View style={styles.faqDivider} />
                  <Text style={styles.faqAnswer}>{faq.respuesta}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons 
              name="information-circle" 
              size={18} 
              color={darkMode ? '#818cf8' : '#6366f1'} 
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
            <Text style={styles.infoValue}>2024.01.22</Text>
          </View>

          <View style={styles.infoDivider} />
          
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="shield-checkmark" size={18} color="#6b7280" />
              <Text style={styles.infoLabel}>Estado</Text>
            </View>
            <View style={styles.statusBadge}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Operativo</Text>
            </View>
          </View>
        </View>

        {/* Bottom Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const supportStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 16 : 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#e0f2fe',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  quickHelpCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickHelpGradient: {
    padding: 24,
    alignItems: 'center',
  },
  quickHelpIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  quickHelpTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  quickHelpText: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 20,
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
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contactIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 3,
  },
  contactSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  faqCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  faqCardExpanded: {
    backgroundColor: '#eff6ff',
    borderColor: '#dbeafe',
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    lineHeight: 20,
  },
  faqAnswerContainer: {
    marginTop: 12,
  },
  faqDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    paddingLeft: 48,
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
});

const supportStylesDark = StyleSheet.create({
  ...supportStyles,
  container: {
    ...supportStyles.container,
    backgroundColor: '#0f172a',
  },
  quickHelpTitle: {
    ...supportStyles.quickHelpTitle,
    color: '#f9fafb',
  },
  quickHelpText: {
    ...supportStyles.quickHelpText,
    color: '#d1d5db',
  },
  section: {
    ...supportStyles.section,
    backgroundColor: '#1e293b',
  },
  sectionTitle: {
    ...supportStyles.sectionTitle,
    color: '#f9fafb',
  },
  contactOption: {
    ...supportStyles.contactOption,
    borderBottomColor: '#374151',
  },
  contactTitle: {
    ...supportStyles.contactTitle,
    color: '#f9fafb',
  },
  contactSubtitle: {
    ...supportStyles.contactSubtitle,
    color: '#9ca3af',
  },
  faqCard: {
    ...supportStyles.faqCard,
    backgroundColor: '#334155',
    borderColor: '#475569',
  },
  faqCardExpanded: {
    ...supportStyles.faqCardExpanded,
    backgroundColor: '#1e3a8a',
    borderColor: '#2563eb',
  },
  faqIconCircle: {
    ...supportStyles.faqIconCircle,
    backgroundColor: '#1e293b',
  },
  faqQuestion: {
    ...supportStyles.faqQuestion,
    color: '#f9fafb',
  },
  faqDivider: {
    ...supportStyles.faqDivider,
    backgroundColor: '#475569',
  },
  faqAnswer: {
    ...supportStyles.faqAnswer,
    color: '#d1d5db',
  },
  infoValue: {
    ...supportStyles.infoValue,
    color: '#f9fafb',
  },
  infoLabel: {
    ...supportStyles.infoLabel,
    color: '#9ca3af',
  },
  infoDivider: {
    ...supportStyles.infoDivider,
    backgroundColor: '#374151',
  },
});
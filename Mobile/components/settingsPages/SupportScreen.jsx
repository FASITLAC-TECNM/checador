import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getEmpresaById } from '../../services/empresaService';

export const SupportScreen = ({ darkMode, onBack, userData }) => {
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [empresaData, setEmpresaData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const styles = darkMode ? supportStylesDark : supportStyles;

  useEffect(() => {
    cargarDatosEmpresa();
  }, []);

  const cargarDatosEmpresa = async () => {
    try {
      setIsLoading(true);
      
      const empresaId = userData?.empresa_id || 
                        userData?.empresa?.id || 
                        userData?.empleado?.empresa_id ||
                        null;
      
      console.log('[Support] 🔍 userData recibido:', {
        tiene_empresa_id: !!userData?.empresa_id,
        tiene_empresa: !!userData?.empresa,
        tiene_empleado: !!userData?.empleado,
        empresaId_final: empresaId
      });
      
      if (!empresaId) {
        console.warn('[Support] ⚠️ No se encontró empresa_id en userData');
        setIsLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      
      if (!token) {
        console.warn('[Support] ⚠️ No hay token disponible');
        setIsLoading(false);
        return;
      }

      console.log('[Support] 🔍 Cargando datos de empresa:', empresaId);

      const response = await getEmpresaById(empresaId, token);

      if (response.success && response.data) {
        setEmpresaData(response.data);
        console.log('[Support] ✅ Datos de empresa cargados:', {
          nombre: response.data.nombre,
          telefono: response.data.telefono,
          correo: response.data.correo
        });
      } else {
        console.error('[Support] ❌ Error en respuesta:', response.message);
      }

    } catch (error) {
      console.error('[Support] ❌ Error cargando datos de empresa:', error);
      if (error.message !== 'Empresa no encontrada') {
        Alert.alert(
          'Error',
          'No se pudo cargar la información de contacto. Por favor, intenta de nuevo más tarde.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

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

  // ─── FIX iOS: esquema de URL según plataforma ──────────────────────────────
  // Android soporta: whatsapp://send?phone=NUMERO&text=TEXTO
  // iOS NO soporta el parámetro &text= con ese esquema.
  // iOS requiere: https://api.whatsapp.com/send?phone=NUMERO&text=TEXTO
  // canOpenURL en iOS solo devuelve true si el esquema está en Info.plist,
  // y whatsapp:// con &text= no se resuelve correctamente.
  // El esquema https://api.whatsapp.com es un universal link que WhatsApp
  // intercepta nativo en iOS y abre la conversación con el texto prellenado.
  const getWhatsAppURL = (phone, text) => {
    if (Platform.OS === 'android') {
      return `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
    }
    // iOS: usar universal link de WhatsApp
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
  };

  const getContactOptions = () => {
    const options = [];

    if (empresaData?.telefono) {
      const phoneClean = empresaData.telefono.replace(/[\s()-]/g, '');
      
      options.push({
        id: 1,
        title: "WhatsApp",
        subtitle: `Chat con ${empresaData.nombre || 'Soporte'}`,
        displayPhone: empresaData.telefono,
        icon: "logo-whatsapp",
        color: "#25D366",
        action: async () => {
          const message = `Hola, soy ${userData?.nombre || 'Usuario'}, necesito ayuda con la App de Asistencia.`;
          const url = getWhatsAppURL(phoneClean, message);

          try {
            // En iOS con el esquema https no tiene sentido canOpenURL
            // porque siempre retorna true para https.
            // En Android canOpenURL con whatsapp:// es útil para
            // verificar que WhatsApp esté instalado.
            if (Platform.OS === 'android') {
              const supported = await Linking.canOpenURL(`whatsapp://`);
              if (!supported) {
                Alert.alert(
                  'WhatsApp no disponible',
                  'WhatsApp no está instalado en tu dispositivo'
                );
                return;
              }
            }

            await Linking.openURL(url);
          } catch (err) {
            console.error('[Support] Error abriendo WhatsApp:', err);
            // En iOS, si openURL falla con el universal link, WhatsApp no está instalado
            Alert.alert(
              'WhatsApp no disponible',
              'No se pudo abrir WhatsApp. Verifica que esté instalado en tu dispositivo.'
            );
          }
        }
      });
    }

    if (empresaData?.correo) {
      options.push({
        id: 2,
        title: "Correo Electrónico",
        subtitle: empresaData.correo,
        icon: "mail",
        color: "#2563eb",
        action: () => {
          const subject = `Solicitud de Soporte - ${empresaData.nombre || 'App Asistencia'}`;
          const body = `Hola,\n\nSoy ${userData?.nombre || 'Usuario'} (${userData?.correo || 'correo@ejemplo.com'}).\n\nNecesito ayuda con:\n\n`;
          const url = `mailto:${empresaData.correo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          
          Linking.openURL(url).catch((err) => {
            console.error('[Support] Error abriendo correo:', err);
            Alert.alert("Error", "No se pudo abrir el cliente de correo");
          });
        }
      });
    }

    if (empresaData?.telefono) {
      const phoneClean = empresaData.telefono.replace(/[\s()-]/g, '');
      
      options.push({
        id: 3,
        title: "Teléfono",
        subtitle: empresaData.telefono,
        icon: "call",
        color: "#059669",
        action: () => {
          Alert.alert(
            "Llamar a Soporte",
            `¿Deseas llamar a ${empresaData.telefono}?`,
            [
              { text: "Cancelar", style: "cancel" },
              { 
                text: "Llamar", 
                onPress: () => {
                  Linking.openURL(`tel:${phoneClean}`).catch((err) => {
                    console.error('[Support] Error realizando llamada:', err);
                    Alert.alert("Error", "No se pudo realizar la llamada");
                  });
                }
              }
            ]
          );
        }
      });
    }

    return options;
  };

  const contactOptions = getContactOptions();

  const toggleFaq = (id) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar 
          barStyle="light-content" 
          backgroundColor={darkMode ? "#1e40af" : "#2563eb"} 
        />
        
        {/* Header mientras carga */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Ayuda y Soporte</Text>
              <Text style={styles.headerSubtitle}>Cargando...</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </View>
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Cargando información...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor={darkMode ? "#1e40af" : "#2563eb"} 
      />
      
      {/* Header estandarizado - Sin gradiente */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Ayuda y Soporte</Text>
            <Text style={styles.headerSubtitle}>
              {empresaData?.nombre || 'Estamos aquí'}
            </Text>
          </View>
          <View style={styles.headerPlaceholder} />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.quickHelpCard}>
          <View style={styles.quickHelpGradient}>
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
          </View>
        </View>

        {contactOptions.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons 
                name="chatbubbles" 
                size={18} 
                color={darkMode ? '#818cf8' : '#6366f1'} 
              />
              <Text style={styles.sectionTitle}>Contáctanos</Text>
            </View>

            {contactOptions.map((option, index) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.contactOption,
                  index === contactOptions.length - 1 && styles.contactOptionLast
                ]}
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
        ) : (
          <View style={styles.noContactCard}>
            <Ionicons name="information-circle" size={48} color="#f59e0b" />
            <Text style={styles.noContactTitle}>
              Información de contacto no disponible
            </Text>
            <Text style={styles.noContactText}>
              Consulta las preguntas frecuentes o contacta a tu administrador.
            </Text>
          </View>
        )}

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
            <Text style={styles.infoValue}>2024.01.23</Text>
          </View>

          <View style={styles.infoDivider} />
          
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Ionicons name="business" size={18} color="#6b7280" />
              <Text style={styles.infoLabel}>Empresa</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>
              {empresaData?.nombre || 'N/A'}
            </Text>
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
    fontSize: 24,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
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
    backgroundColor: '#dbeafe',
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
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
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
  contactOptionLast: {
    borderBottomWidth: 0,
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
  noContactCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  noContactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  noContactText: {
    fontSize: 14,
    color: '#78350f',
    textAlign: 'center',
    lineHeight: 20,
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
    maxWidth: '50%',
    textAlign: 'right',
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
  header: {
    ...supportStyles.header,
    backgroundColor: '#1e40af',
  },
  loadingText: {
    ...supportStyles.loadingText,
    color: '#9ca3af',
  },
  quickHelpCard: {
    ...supportStyles.quickHelpCard,
    backgroundColor: '#1e3a8a',
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
  noContactCard: {
    ...supportStyles.noContactCard,
    backgroundColor: '#422006',
    borderColor: '#713f12',
  },
  noContactTitle: {
    ...supportStyles.noContactTitle,
    color: '#fde047',
  },
  noContactText: {
    ...supportStyles.noContactText,
    color: '#fef08a',
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

export default SupportScreen;
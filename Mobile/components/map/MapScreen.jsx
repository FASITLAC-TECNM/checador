import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { extraerCoordenadas } from '../../services/ubicacionService';
import { useNavigationBarColor } from '../../services/useNavigationBarColor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Componente para visualizar el mapa con Leaflet y múltiples zonas permitidas
 */
const MapaZonasPermitidas = ({ 
  departamento, 
  departamentos = [], 
  ubicacionActual, 
  onClose, 
  onDepartamentoSeleccionado,
  darkMode 
}) => {
  const [loading, setLoading] = useState(true);
  const [departamentoSeleccionado, setDepartamentoSeleccionado] = useState(null);
  const [zonasData, setZonasData] = useState([]);
  const [mostrandoMiUbicacion, setMostrandoMiUbicacion] = useState(false);
  const webViewRef = useRef(null);

  const styles = darkMode ? mapStylesDark : mapStyles;
  
  // ⭐ Usar el hook para configurar la barra de navegación
  useNavigationBarColor(darkMode);

  // Usar departamentos array o crear array con departamento único
  const listaDepartamentos = departamentos.length > 0 ? departamentos : (departamento ? [departamento] : []);

  useEffect(() => {
    if (departamento) {
      setDepartamentoSeleccionado(departamento);
    } else if (listaDepartamentos.length > 0) {
      setDepartamentoSeleccionado(listaDepartamentos[0]);
    }
  }, [departamento, listaDepartamentos]);

  useEffect(() => {
    if (listaDepartamentos.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Procesar todas las zonas
      const zonas = [];

      for (const depto of listaDepartamentos) {
        if (!depto.ubicacion) continue;

        const coords = extraerCoordenadas(depto.ubicacion);
        
        if (!coords || coords.length < 3) continue;

        // Convertir coordenadas a formato [lat, lng] para Leaflet
        const coordsFormateadas = coords.map(coord => {
          const lat = coord.lat || coord[0];
          const lng = coord.lng || coord[1];
          return [lat, lng];
        });

        zonas.push({
          id: depto.id,
          nombre: depto.nombre,
          coordenadas: coordsFormateadas,
          color: depto.color || '#3b82f6'
        });
      }

      setZonasData(zonas);
      setLoading(false);

    } catch (error) {
      setLoading(false);
    }
  }, [listaDepartamentos]);

  const handleDepartamentoClick = (depto) => {
    setDepartamentoSeleccionado(depto);
    setMostrandoMiUbicacion(false); // Desactivar "Mi ubicación"
    
    if (onDepartamentoSeleccionado) {
      onDepartamentoSeleccionado(depto);
    }

    // Encontrar las coordenadas de este departamento
    const zona = zonasData.find(z => z.id === depto.id);
    if (zona && webViewRef.current) {
      // Calcular centro de este departamento
      const sumLat = zona.coordenadas.reduce((sum, c) => sum + c[0], 0);
      const sumLng = zona.coordenadas.reduce((sum, c) => sum + c[1], 0);
      const centerLat = sumLat / zona.coordenadas.length;
      const centerLng = sumLng / zona.coordenadas.length;

      // Enviar mensaje al WebView para centrar el mapa
      const message = JSON.stringify({
        action: 'focusDepartamento',
        departamentoId: depto.id,
        center: [centerLat, centerLng]
      });
      
      webViewRef.current.postMessage(message);
    }
  };

  const handleFocusUserLocation = () => {
    setMostrandoMiUbicacion(true); // Activar estado de "Mi ubicación"
    
    if (webViewRef.current && ubicacionActual) {
      const message = JSON.stringify({
        action: 'focusUserLocation',
        center: [ubicacionActual.lat, ubicacionActual.lng]
      });
      webViewRef.current.postMessage(message);
    }
  };

  const generarHTMLLeaflet = (zonas, userLocation, departamentoSeleccionadoId) => {
    const zonasJSON = JSON.stringify(zonas);
    const userLocationJSON = userLocation ? JSON.stringify([userLocation.lat, userLocation.lng]) : 'null';
    
    const selectedId = departamentoSeleccionadoId ? `"${departamentoSeleccionadoId}"` : 'null';

    // Calcular centro global
    let totalLat = 0;
    let totalLng = 0;
    let totalPuntos = 0;

    zonas.forEach(zona => {
      zona.coordenadas.forEach(coord => {
        totalLat += coord[0];
        totalLng += coord[1];
        totalPuntos++;
      });
    });

    const centerLat = totalLat / totalPuntos;
    const centerLng = totalLng / totalPuntos;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Mapa de Zonas Permitidas</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
    #map {
      height: 100%;
      width: 100%;
    }
    .user-marker {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: #ef4444;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
      }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // Inicializar mapa
    const map = L.map('map', {
      zoomControl: true,
      attributionControl: false
    }).setView([${centerLat}, ${centerLng}], 15);

    // Agregar capa de tiles (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Zonas permitidas
    const zonas = ${zonasJSON};
    let selectedDepartamentoId = ${selectedId};

    // Almacenar polígonos
    const polygons = {};

    // Función para actualizar estilos de polígonos
    function updatePolygonStyles() {
      zonas.forEach(zona => {
        const isSelected = zona.id === selectedDepartamentoId;
        const polygon = polygons[zona.id];
        
        if (polygon) {
          polygon.setStyle({
            color: isSelected ? '#10b981' : '#3b82f6',
            fillColor: isSelected ? '#10b981' : '#3b82f6',
            fillOpacity: 0.3,
            weight: 3,
            opacity: 0.8
          });
          
          if (isSelected) {
            polygon.bringToFront();
          }
        }
      });
    }

    // Grupo para ajustar vista
    const bounds = [];

    // Dibujar cada zona
    zonas.forEach((zona, index) => {
      const isSelected = selectedDepartamentoId === zona.id;

      const polygon = L.polygon(zona.coordenadas, {
        color: isSelected ? '#10b981' : '#3b82f6',
        fillColor: isSelected ? '#10b981' : '#3b82f6',
        fillOpacity: 0.3,
        weight: 3,
        opacity: 0.8
      }).addTo(map);

      // Guardar referencia
      polygons[zona.id] = polygon;

      // Agregar popup
      const popupContent = isSelected 
        ? '<b>' + zona.nombre + '</b><br>📍 Departamento seleccionado<br>Zona permitida para registro'
        : '<b>' + zona.nombre + '</b><br>Zona permitida para registro';
      
      polygon.bindPopup(popupContent);

      // Agregar bounds para ajustar vista
      polygon.getLatLngs()[0].forEach(latlng => {
        bounds.push(latlng);
      });
    });

    // Ajustar vista inicial
    if (bounds.length > 0) {
      const selectedZona = zonas.find(z => z.id === selectedDepartamentoId);

      if (selectedZona && selectedDepartamentoId) {
        const selectedPolygon = polygons[selectedDepartamentoId];
        if (selectedPolygon) {
          map.fitBounds(selectedPolygon.getBounds(), { padding: [50, 50], maxZoom: 16 });
        }
      } else {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      }
    }

    // Marcador de ubicación del usuario
    const userLocation = ${userLocationJSON};
    let userMarker = null;
    
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-marker',
        iconSize: [24, 24]
      });

      userMarker = L.marker(userLocation, {
        icon: userIcon,
        zIndexOffset: 1000
      }).addTo(map);

      userMarker.bindPopup('<b>Tu ubicación</b><br>Aquí te encuentras ahora');
    }

    // Prevenir zoom con scroll (mejor experiencia móvil)
    map.scrollWheelZoom.disable();

    // Escuchar mensajes de React Native
    window.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);
        
        if (data.action === 'focusDepartamento') {
          selectedDepartamentoId = data.departamentoId;
          updatePolygonStyles();
          
          // Centrar mapa en el departamento
          const polygon = polygons[data.departamentoId];
          if (polygon) {
            map.fitBounds(polygon.getBounds(), { 
              padding: [80, 80], 
              maxZoom: 17,
              animate: true,
              duration: 0.5
            });
          }
        } else if (data.action === 'focusUserLocation') {
          // Centrar mapa en la ubicación del usuario
          if (data.center) {
            map.setView(data.center, 17, {
              animate: true,
              duration: 0.5
            });
            
            // Abrir popup del usuario si existe
            if (userMarker) {
              userMarker.openPopup();
            }
          }
        }
      } catch (e) {}
    });

    // Para Android
    document.addEventListener('message', function(event) {
      try {
        const data = JSON.parse(event.data);

        if (data.action === 'focusDepartamento') {
          selectedDepartamentoId = data.departamentoId;
          updatePolygonStyles();

          const polygon = polygons[data.departamentoId];
          if (polygon) {
            map.fitBounds(polygon.getBounds(), {
              padding: [80, 80],
              maxZoom: 17,
              animate: true,
              duration: 0.5
            });
          }
        } else if (data.action === 'focusUserLocation') {
          if (data.center) {
            map.setView(data.center, 17, {
              animate: true,
              duration: 0.5
            });
            
            if (userMarker) {
              userMarker.openPopup();
            }
          }
        }
      } catch (e) {}
    });
  </script>
</body>
</html>
    `;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </SafeAreaView>
    );
  }

  if (zonasData.length === 0) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="map-outline" size={64} color="#9ca3af" />
        <Text style={styles.errorText}>No se pudo cargar el mapa</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Cerrar</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const htmlContent = generarHTMLLeaflet(
    zonasData, 
    ubicacionActual, 
    departamentoSeleccionado?.id
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar 
        barStyle={darkMode ? 'light-content' : 'dark-content'} 
        backgroundColor={darkMode ? '#1f2937' : '#fff'}
      />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="location" size={24} color="#3b82f6" />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                {listaDepartamentos.length === 1 ? 'Zona Permitida' : 'Zonas Permitidas'}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {departamentoSeleccionado?.nombre || `${listaDepartamentos.length} departamentos`}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.closeIconButton}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map WebView */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          )}
        />
      </View>

      {/* Lista de departamentos (si hay múltiples) */}
      {listaDepartamentos.length > 1 && (
        <View style={styles.departamentosContainer}>
          <Text style={styles.departamentosTitle}>Selecciona departamento</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.departamentosScroll}
            contentContainerStyle={styles.departamentosContent}
          >
            {ubicacionActual && (
              <TouchableOpacity
                style={[
                  styles.departamentoChip,
                  mostrandoMiUbicacion && styles.departamentoChipActivo
                ]}
                onPress={handleFocusUserLocation}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name={mostrandoMiUbicacion ? "navigate" : "navigate"} 
                  size={16} 
                  color={mostrandoMiUbicacion ? '#10b981' : '#6b7280'} 
                  style={styles.chipIcon} 
                />
                <Text 
                  style={[
                    styles.departamentoChipText,
                    mostrandoMiUbicacion && styles.departamentoChipTextActivo
                  ]} 
                  numberOfLines={1}
                >
                  Mi ubicación
                </Text>
                {mostrandoMiUbicacion && (
                  <View style={styles.activeDot} />
                )}
              </TouchableOpacity>
            )}
            
            {listaDepartamentos.map((depto, index) => {
              const esSeleccionado = departamentoSeleccionado?.id === depto.id && !mostrandoMiUbicacion;
              
              return (
                <TouchableOpacity
                  key={depto.id || index}
                  style={[
                    styles.departamentoChip,
                    esSeleccionado && styles.departamentoChipActivo
                  ]}
                  onPress={() => handleDepartamentoClick(depto)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={esSeleccionado ? 'location' : 'location-outline'} 
                    size={16} 
                    color={esSeleccionado ? '#10b981' : '#6b7280'} 
                    style={styles.chipIcon}
                  />
                  <Text 
                    style={[
                      styles.departamentoChipText,
                      esSeleccionado && styles.departamentoChipTextActivo
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {depto.nombre}
                  </Text>
                  {esSeleccionado && (
                    <View style={styles.activeDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Botón de Mi Ubicación cuando hay un solo departamento */}
      {listaDepartamentos.length === 1 && ubicacionActual && (
        <View style={styles.singleLocationContainer}>
          <TouchableOpacity
            style={[
              styles.departamentoChip,
              mostrandoMiUbicacion && styles.departamentoChipActivo
            ]}
            onPress={handleFocusUserLocation}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={mostrandoMiUbicacion ? "navigate" : "navigate"} 
              size={16} 
              color={mostrandoMiUbicacion ? '#10b981' : '#6b7280'} 
              style={styles.chipIcon} 
            />
            <Text 
              style={[
                styles.departamentoChipText,
                mostrandoMiUbicacion && styles.departamentoChipTextActivo
              ]}
            >
              Mi ubicación
            </Text>
            {mostrandoMiUbicacion && (
              <View style={styles.activeDot} />
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        {!mostrandoMiUbicacion && departamentoSeleccionado && (
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#10b981'}]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {departamentoSeleccionado.nombre}
            </Text>
          </View>
        )}
        
        {listaDepartamentos.length > 1 && !mostrandoMiUbicacion && (
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Otras zonas disponibles</Text>
          </View>
        )}
        
        {ubicacionActual && (
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Tu ubicación</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

// ==================== ESTILOS ====================
const mapStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  closeIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  mapContainer: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  departamentosContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 12,
  },
  departamentosTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  departamentosScroll: {
    paddingHorizontal: 16,
  },
  departamentosContent: {
    gap: 8,
    paddingRight: 16,
  },
  departamentoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    maxWidth: SCREEN_WIDTH * 0.7, // Máximo 70% del ancho de pantalla
  },
  departamentoChipActivo: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981',
  },
  chipIcon: {
    flexShrink: 0, // El ícono nunca se reduce
  },
  departamentoChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    flexShrink: 1, // El texto se puede reducir si es necesario
  },
  departamentoChipTextActivo: {
    color: '#059669',
    fontWeight: '600',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    flexShrink: 0, // El punto nunca se reduce
  },
  singleLocationContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center',
  },
  legend: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  legendColor: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    flexShrink: 0,
  },
  legendText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoIcon: {
    flexShrink: 0,
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    flex: 1,
    lineHeight: 18,
  },
  closeButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

const mapStylesDark = StyleSheet.create({
  ...mapStyles,
  container: {
    ...mapStyles.container,
    backgroundColor: '#1f2937',
  },
  loadingContainer: {
    ...mapStyles.loadingContainer,
    backgroundColor: '#1f2937',
  },
  errorContainer: {
    ...mapStyles.errorContainer,
    backgroundColor: '#1f2937',
  },
  header: {
    ...mapStyles.header,
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151',
  },
  headerTitle: {
    ...mapStyles.headerTitle,
    color: '#fff',
  },
  closeIconButton: {
    ...mapStyles.closeIconButton,
    backgroundColor: '#374151',
  },
  departamentosContainer: {
    ...mapStyles.departamentosContainer,
    backgroundColor: '#1f2937',
    borderTopColor: '#374151',
  },
  departamentosTitle: {
    ...mapStyles.departamentosTitle,
    color: '#9ca3af',
  },
  departamentoChip: {
    ...mapStyles.departamentoChip,
    backgroundColor: '#374151',
  },
  departamentoChipActivo: {
    ...mapStyles.departamentoChipActivo,
    backgroundColor: '#1e3a2f',
  },
  departamentoChipText: {
    ...mapStyles.departamentoChipText,
    color: '#d1d5db',
  },
  singleLocationContainer: {
    ...mapStyles.singleLocationContainer,
    backgroundColor: '#1f2937',
    borderTopColor: '#374151',
  },
  legend: {
    ...mapStyles.legend,
    backgroundColor: '#1f2937',
    borderTopColor: '#374151',
  },
  legendText: {
    ...mapStyles.legendText,
    color: '#d1d5db',
  },
  infoCard: {
    ...mapStyles.infoCard,
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  infoText: {
    ...mapStyles.infoText,
    color: '#93c5fd',
  },
  webviewLoading: {
    ...mapStyles.webviewLoading,
    backgroundColor: '#1f2937',
  },
});

export default MapaZonasPermitidas;
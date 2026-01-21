import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { extraerCoordenadas } from '../../services/ubicacionService';

const { width, height } = Dimensions.get('window');

/**
 * Componente para visualizar el mapa con Leaflet y las zonas permitidas
 */
const MapaZonasPermitidas = ({ departamento, ubicacionActual, onClose, darkMode }) => {
  const [coordenadas, setCoordenadas] = useState([]);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);

  const styles = darkMode ? mapStylesDark : mapStyles;

  useEffect(() => {
    if (!departamento || !departamento.ubicacion) {
      console.warn('⚠️ No hay departamento o ubicación para mostrar');
      setLoading(false);
      return;
    }

    try {
      const coords = extraerCoordenadas(departamento.ubicacion);
      
      if (!coords || coords.length < 3) {
        console.error('❌ No se pudieron extraer coordenadas válidas');
        setLoading(false);
        return;
      }

      console.log('🗺️ Coordenadas extraídas para mapa:', coords.length, 'puntos');

      // Convertir coordenadas a formato [lat, lng] para Leaflet
      const coordsFormateadas = coords.map(coord => {
        const lat = coord.lat || coord[0];
        const lng = coord.lng || coord[1];
        return [lat, lng];
      });

      setCoordenadas(coordsFormateadas);

      // Calcular centro del polígono
      const sumLat = coordsFormateadas.reduce((sum, c) => sum + c[0], 0);
      const sumLng = coordsFormateadas.reduce((sum, c) => sum + c[1], 0);
      
      const centerLat = sumLat / coordsFormateadas.length;
      const centerLng = sumLng / coordsFormateadas.length;

      // Generar HTML con Leaflet
      const html = generarHTMLLeaflet(coordsFormateadas, centerLat, centerLng, ubicacionActual, departamento.nombre);
      setHtmlContent(html);
      setLoading(false);

    } catch (error) {
      console.error('❌ Error procesando coordenadas:', error);
      setLoading(false);
    }
  }, [departamento, ubicacionActual]);

  const generarHTMLLeaflet = (coords, centerLat, centerLng, userLocation, departmentName) => {
    const coordsJSON = JSON.stringify(coords);
    const userLocationJSON = userLocation ? JSON.stringify([userLocation.lat, userLocation.lng]) : 'null';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Mapa de Zona Permitida</title>
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
    }).setView([${centerLat}, ${centerLng}], 17);

    // Agregar capa de tiles (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Coordenadas del polígono
    const polygonCoords = ${coordsJSON};

    // Dibujar polígono de zona permitida
    const polygon = L.polygon(polygonCoords, {
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      weight: 2
    }).addTo(map);

    // Agregar popup al polígono
    polygon.bindPopup('<b>${departmentName}</b><br>Zona permitida para registro');

    // Ajustar vista al polígono
    map.fitBounds(polygon.getBounds(), { padding: [50, 50] });

    // Marcador de ubicación del usuario
    const userLocation = ${userLocationJSON};
    if (userLocation) {
      // Crear icono personalizado para el usuario
      const userIcon = L.divIcon({
        className: 'user-marker',
        iconSize: [24, 24]
      });

      const userMarker = L.marker(userLocation, {
        icon: userIcon
      }).addTo(map);

      userMarker.bindPopup('<b>Tu ubicación</b><br>Aquí te encuentras ahora');
    }

    // Prevenir zoom con scroll (mejor experiencia móvil)
    map.scrollWheelZoom.disable();
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

  if (!htmlContent || coordenadas.length === 0) {
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Ionicons name="location" size={24} color="#3b82f6" />
            <View>
              <Text style={styles.headerTitle}>Zona Permitida</Text>
              <Text style={styles.headerSubtitle}>{departamento.nombre}</Text>
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

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: 'rgba(59, 130, 246, 0.3)', borderColor: '#3b82f6' }]} />
          <Text style={styles.legendText}>Zona permitida para registro</Text>
        </View>
        
        {ubicacionActual && (
          <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Tu ubicación actual</Text>
          </View>
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Debes estar dentro del área marcada para poder registrar tu asistencia
          </Text>
        </View>
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
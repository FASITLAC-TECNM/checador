import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Dimensions } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { extraerCoordenadas } from '../../services/ubicacionService';
import { useNavigationBarColor } from '../../services/useNavigationBarColor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');




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


  useNavigationBarColor(darkMode);


  const listaDepartamentos = departamentos.length > 0 ? departamentos : departamento ? [departamento] : [];

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

      const zonas = [];

      for (const depto of listaDepartamentos) {
        if (!depto.ubicacion) continue;

        const coords = extraerCoordenadas(depto.ubicacion);
        if (!coords || coords.length === 0) continue;

        let coordsFormateadas;
        const isMultiPolygon = Array.isArray(coords[0]);
        
        if (isMultiPolygon) {
          coordsFormateadas = coords.map(poly => poly.map(coord => {
            const lat = coord.lat || coord[0];
            const lng = coord.lng || coord[1];
            return [lat, lng];
          }));
        } else {
          coordsFormateadas = coords.map((coord) => {
            const lat = coord.lat || coord[0];
            const lng = coord.lng || coord[1];
            return [lat, lng];
          });
        }

        zonas.push({
          id: depto.id,
          nombre: depto.nombre,
          coordenadas: coordsFormateadas,
          esMultiPolygon: isMultiPolygon,
          color: depto.color || '#3b82f6'
        });
      }

      setZonasData(zonas);
      setLoading(false);

    } catch (error) {
      setLoading(false);
    }
  }, [listaDepartamentos]);


  useEffect(() => {
    if (webViewRef.current && ubicacionActual) {
      const message = JSON.stringify({
        action: 'updateUserLocation',
        location: [ubicacionActual.lat, ubicacionActual.lng]
      });
      webViewRef.current.postMessage(message);
    }
  }, [ubicacionActual]);

  const handleDepartamentoClick = (depto) => {
    setDepartamentoSeleccionado(depto);
    setMostrandoMiUbicacion(false);

    if (onDepartamentoSeleccionado) {
      onDepartamentoSeleccionado(depto);
    }


    const zona = zonasData.find((z) => z.id === depto.id);
    if (zona && webViewRef.current) {

      const sumLat = zona.coordenadas.reduce((sum, c) => sum + c[0], 0);
      const sumLng = zona.coordenadas.reduce((sum, c) => sum + c[1], 0);
      const centerLat = sumLat / zona.coordenadas.length;
      const centerLng = sumLng / zona.coordenadas.length;


      const message = JSON.stringify({
        action: 'focusDepartamento',
        departamentoId: depto.id,
        center: [centerLat, centerLng]
      });

      webViewRef.current.postMessage(message);
    }
  };

  const handleFocusUserLocation = () => {
    setMostrandoMiUbicacion(true);

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


    let totalLat = 0;
    let totalLng = 0;
    let totalPuntos = 0;

    zonas.forEach((zona) => {
      if (zona.esMultiPolygon) {
        zona.coordenadas.forEach(poly => {
          poly.forEach(coord => {
            totalLat += coord[0];
            totalLng += coord[1];
            totalPuntos++;
          });
        });
      } else {
        zona.coordenadas.forEach((coord) => {
          totalLat += coord[0];
          totalLng += coord[1];
          totalPuntos++;
        });
      }
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    #map {
      height: 100%;
      width: 100%;
    }
    /* Leaflet user marker */
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
      0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
      70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
      100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
    }
  </style>
</head>
<body>
  <div id="map"></div>

  <script>
    // ========== DATA ==========
    var zonas = ${zonasJSON};
    var userLocation = ${userLocationJSON};
    var selectedDepartamentoId = ${selectedId};

    // ========== TRY LEAFLET (ONLINE) ==========
    var leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletScript.onload = function() {
      initLeafletMap();
    };

    var leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCSS);

    document.head.appendChild(leafletCSS);
    document.body.appendChild(leafletScript);

    // ========== LEAFLET MAP (ONLINE) ==========
    function initLeafletMap() {
      var map = L.map('map', {
        zoomControl: true,
        attributionControl: false
      }).setView([${centerLat}, ${centerLng}], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        errorTileUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQI12NgAAIABQABNjN9GQAAAAlwSFlzAAAWJQAAFiUBSVIk8AAAAA0lEQVQI12P4z8BQDwAEgAF/QualrQAAAABJRU5ErkJggg=='
      }).addTo(map);

      var polygons = {};

      function updatePolygonStyles() {
        zonas.forEach(function(zona) {
          var isSelected = zona.id === selectedDepartamentoId;
          var polygon = polygons[zona.id];
          if (polygon) {
            polygon.setStyle({
              color: isSelected ? '#10b981' : '#3b82f6',
              fillColor: isSelected ? '#10b981' : '#3b82f6',
              fillOpacity: 0.3,
              weight: 3,
              opacity: 0.8
            });
            if (isSelected) polygon.bringToFront();
          }
        });
      }

      var bounds = [];

      zonas.forEach(function(zona) {
        var isSelected = selectedDepartamentoId === zona.id;
        var polygon; // referiremos genéricamente como polygon localmente

        // Filtrar puntos duplicados exactos (para evitar poligonos de area 0)
        var uniqueCoords = [];
        var handlePoly = function(arr) {
          var u = [];
          arr.forEach(function(c) {
            var isDuplicate = u.some(function(x) { return x[0] === c[0] && x[1] === c[1]; });
            if (!isDuplicate) u.push(c);
          });
          return u;
        };

        if (zona.esMultiPolygon) {
          // Ya viene preparado como Array de Arrays de LatLngs. 
          // Limpiamos los duplicados internamente pero pasamos directamente a Leaflet (MultiPolygon nativo)
          var cleanMulti = zona.coordenadas.map(function(p) { return handlePoly(p); });
          polygon = L.polygon(cleanMulti, {
            color: isSelected ? '#10b981' : '#3b82f6',
            fillColor: isSelected ? '#10b981' : '#3b82f6',
            fillOpacity: 0.3,
            weight: 3,
            opacity: 0.8
          }).addTo(map);
          cleanMulti.forEach(function(p) { p.forEach(function(ll) { bounds.push(ll); }); });
        } else {
          // Standard Poligono simple
          uniqueCoords = handlePoly(zona.coordenadas);
          if (uniqueCoords.length < 3) {
            var centerLat = uniqueCoords[0][0];
            var centerLng = uniqueCoords[0][1];
            polygon = L.circle([centerLat, centerLng], {
              radius: 200,
              color: isSelected ? '#10b981' : '#3b82f6',
              fillColor: isSelected ? '#10b981' : '#3b82f6',
              fillOpacity: 0.3,
              weight: 3,
              opacity: 0.8
            }).addTo(map);
            bounds.push([centerLat, centerLng]);
          } else {
            polygon = L.polygon(uniqueCoords, {
              color: isSelected ? '#10b981' : '#3b82f6',
              fillColor: isSelected ? '#10b981' : '#3b82f6',
              fillOpacity: 0.3,
              weight: 3,
              opacity: 0.8
            }).addTo(map);
            uniqueCoords.forEach(function(latlng) { bounds.push(latlng); });
          }
        }

        polygons[zona.id] = polygon;

        var popupContent = isSelected
          ? '<b>' + zona.nombre + '</b><br>Departamento seleccionado<br>Zona permitida para registro'
          : '<b>' + zona.nombre + '</b><br>Zona permitida para registro';
        polygon.bindPopup(popupContent);
      });

      if (bounds.length > 0) {
        var selectedZona = zonas.find(function(z) { return z.id === selectedDepartamentoId; });
        if (selectedZona && selectedDepartamentoId) {
          var selectedPolygon = polygons[selectedDepartamentoId];
          if (selectedPolygon) map.fitBounds(selectedPolygon.getBounds(), { padding: [50, 50], maxZoom: 16 });
        } else {
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
        }
      }

      var userMarker = null;
      if (userLocation) {
        var userIcon = L.divIcon({ className: 'user-marker', iconSize: [24, 24] });
        userMarker = L.marker(userLocation, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
        userMarker.bindPopup('<b>Tu ubicación</b><br>Aquí te encuentras ahora');
      }

      map.scrollWheelZoom.disable();

      function handleMessage(event) {
        try {
          var data = JSON.parse(event.data);
          if (data.action === 'focusDepartamento') {
            selectedDepartamentoId = data.departamentoId;
            updatePolygonStyles();
            var p = polygons[data.departamentoId];
            if (p) map.fitBounds(p.getBounds(), { padding: [80, 80], maxZoom: 17, animate: true, duration: 0.5 });
          } else if (data.action === 'focusUserLocation') {
            if (data.center) {
              map.setView(data.center, 17, { animate: true, duration: 0.5 });
              if (userMarker) userMarker.openPopup();
            }
          } else if (data.action === 'updateUserLocation') {
 // Actualización en tiempo real del marcador GPS 
            userLocation = data.location;
            if (userMarker) {
              userMarker.setLatLng(data.location);
            } else {
              var userIcon = L.divIcon({ className: 'user-marker', iconSize: [24, 24] });
              userMarker = L.marker(data.location, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
              userMarker.bindPopup('<b>Tu ubicación</b><br>Aquí te encuentras ahora');
            }
          }
        } catch (e) {}
      }
      window.addEventListener('message', handleMessage);
      document.addEventListener('message', handleMessage);
    }


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
      </SafeAreaView>);

  }

  if (zonasData.length === 0) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Ionicons name="map-outline" size={64} color="#9ca3af" />
        <Text style={styles.errorText}>No se pudo cargar el mapa</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Cerrar</Text>
        </TouchableOpacity>
      </SafeAreaView>);

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
        backgroundColor={darkMode ? '#1f2937' : '#fff'} />
      

      {}
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
            activeOpacity={0.7}>
            
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          source={{ html: htmlContent }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() =>
          <View style={styles.webviewLoading}>
              <ActivityIndicator size="large" color="#3b82f6" />
            </View>
          } />
        
      </View>

      {}
      {listaDepartamentos.length > 1 &&
      <View style={styles.departamentosContainer}>
          <Text style={styles.departamentosTitle}>Selecciona departamento</Text>
          <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.departamentosScroll}
          contentContainerStyle={styles.departamentosContent}>
          
            {ubicacionActual &&
          <TouchableOpacity
            style={[
            styles.departamentoChip,
            mostrandoMiUbicacion && styles.departamentoChipActivo]
            }
            onPress={handleFocusUserLocation}
            activeOpacity={0.7}>
            
                <Ionicons
              name={mostrandoMiUbicacion ? "navigate" : "navigate"}
              size={16}
              color={mostrandoMiUbicacion ? '#10b981' : '#6b7280'}
              style={styles.chipIcon} />
            
                <Text
              style={[
              styles.departamentoChipText,
              mostrandoMiUbicacion && styles.departamentoChipTextActivo]
              }
              numberOfLines={1}>
              
                  Mi ubicación
                </Text>
                {mostrandoMiUbicacion &&
            <View style={styles.activeDot} />
            }
              </TouchableOpacity>
          }

            {listaDepartamentos.map((depto, index) => {
            const esSeleccionado = departamentoSeleccionado?.id === depto.id && !mostrandoMiUbicacion;

            return (
              <TouchableOpacity
                key={depto.id || index}
                style={[
                styles.departamentoChip,
                esSeleccionado && styles.departamentoChipActivo]
                }
                onPress={() => handleDepartamentoClick(depto)}
                activeOpacity={0.7}>
                
                  <Ionicons
                  name={esSeleccionado ? 'location' : 'location-outline'}
                  size={16}
                  color={esSeleccionado ? '#10b981' : '#6b7280'}
                  style={styles.chipIcon} />
                
                  <Text
                  style={[
                  styles.departamentoChipText,
                  esSeleccionado && styles.departamentoChipTextActivo]
                  }
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  
                    {depto.nombre}
                  </Text>
                  {esSeleccionado &&
                <View style={styles.activeDot} />
                }
                </TouchableOpacity>);

          })}
          </ScrollView>
        </View>
      }

      {}
      {listaDepartamentos.length === 1 && ubicacionActual &&
      <View style={styles.singleLocationContainer}>
          <TouchableOpacity
          style={[
          styles.departamentoChip,
          mostrandoMiUbicacion && styles.departamentoChipActivo]
          }
          onPress={handleFocusUserLocation}
          activeOpacity={0.7}>
          
            <Ionicons
            name={mostrandoMiUbicacion ? "navigate" : "navigate"}
            size={16}
            color={mostrandoMiUbicacion ? '#10b981' : '#6b7280'}
            style={styles.chipIcon} />
          
            <Text
            style={[
            styles.departamentoChipText,
            mostrandoMiUbicacion && styles.departamentoChipTextActivo]
            }>
            
              Mi ubicación
            </Text>
            {mostrandoMiUbicacion &&
          <View style={styles.activeDot} />
          }
          </TouchableOpacity>
        </View>
      }

      {}
      <View style={styles.legend}>
        {!mostrandoMiUbicacion && departamentoSeleccionado &&
        <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {departamentoSeleccionado.nombre}
            </Text>
          </View>
        }

        {listaDepartamentos.length > 1 && !mostrandoMiUbicacion &&
        <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendText}>Otras zonas disponibles</Text>
          </View>
        }

        {ubicacionActual &&
        <View style={styles.legendItem}>
            <View style={[styles.legendColor, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Tu ubicación</Text>
          </View>
        }
      </View>
    </SafeAreaView>);

};


const mapStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500'
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center'
  },
  header: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingTop: 8
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 8
  },
  headerTextContainer: {
    flex: 1
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937'
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2
  },
  closeIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0
  },
  mapContainer: {
    flex: 1
  },
  webview: {
    flex: 1
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  departamentosContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingVertical: 12
  },
  departamentosTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8
  },
  departamentosScroll: {
    paddingHorizontal: 16
  },
  departamentosContent: {
    gap: 8,
    paddingRight: 16
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
    maxWidth: SCREEN_WIDTH * 0.7
  },
  departamentoChipActivo: {
    backgroundColor: '#d1fae5',
    borderColor: '#10b981'
  },
  chipIcon: {
    flexShrink: 0
  },
  departamentoChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    flexShrink: 1
  },
  departamentoChipTextActivo: {
    color: '#059669',
    fontWeight: '600'
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    flexShrink: 0
  },
  singleLocationContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'center'
  },
  legend: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 8
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  legendColor: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    flexShrink: 0
  },
  legendText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe'
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10
  },
  infoIcon: {
    flexShrink: 0
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    flex: 1,
    lineHeight: 18
  },
  closeButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

const mapStylesDark = StyleSheet.create({
  ...mapStyles,
  container: {
    ...mapStyles.container,
    backgroundColor: '#1f2937'
  },
  loadingContainer: {
    ...mapStyles.loadingContainer,
    backgroundColor: '#1f2937'
  },
  errorContainer: {
    ...mapStyles.errorContainer,
    backgroundColor: '#1f2937'
  },
  header: {
    ...mapStyles.header,
    backgroundColor: '#1f2937',
    borderBottomColor: '#374151'
  },
  headerTitle: {
    ...mapStyles.headerTitle,
    color: '#fff'
  },
  closeIconButton: {
    ...mapStyles.closeIconButton,
    backgroundColor: '#374151'
  },
  departamentosContainer: {
    ...mapStyles.departamentosContainer,
    backgroundColor: '#1f2937',
    borderTopColor: '#374151'
  },
  departamentosTitle: {
    ...mapStyles.departamentosTitle,
    color: '#9ca3af'
  },
  departamentoChip: {
    ...mapStyles.departamentoChip,
    backgroundColor: '#374151'
  },
  departamentoChipActivo: {
    ...mapStyles.departamentoChipActivo,
    backgroundColor: '#1e3a2f'
  },
  departamentoChipText: {
    ...mapStyles.departamentoChipText,
    color: '#d1d5db'
  },
  singleLocationContainer: {
    ...mapStyles.singleLocationContainer,
    backgroundColor: '#1f2937',
    borderTopColor: '#374151'
  },
  legend: {
    ...mapStyles.legend,
    backgroundColor: '#1f2937',
    borderTopColor: '#374151'
  },
  legendText: {
    ...mapStyles.legendText,
    color: '#d1d5db'
  },
  infoCard: {
    ...mapStyles.infoCard,
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6'
  },
  infoText: {
    ...mapStyles.infoText,
    color: '#93c5fd'
  },
  webviewLoading: {
    ...mapStyles.webviewLoading,
    backgroundColor: '#1f2937'
  }
});

export default MapaZonasPermitidas;
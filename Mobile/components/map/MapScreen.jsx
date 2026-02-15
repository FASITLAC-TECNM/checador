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
 * Componente para visualizar el mapa con Leaflet y múltiples zonas permiatidas
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

  // ⭐ Enviar ubicación GPS en tiempo real al WebView cuando cambia
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
    /* Canvas fallback styles */
    #canvas-map {
      display: none;
      width: 100%;
      height: 100%;
      background: #e8edf2;
    }
    #offline-badge {
      display: none;
      position: absolute;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(245, 158, 11, 0.95);
      color: #fff;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      z-index: 999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    #canvas-legend {
      display: none;
      position: absolute;
      bottom: 12px;
      left: 12px;
      right: 12px;
      background: rgba(255,255,255,0.95);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 12px;
      color: #374151;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 999;
    }
    .legend-row { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .legend-row:last-child { margin-bottom: 0; }
    .legend-dot { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
  </style>
</head>
<body>
  <div id="map"></div>
  <canvas id="canvas-map"></canvas>
  <div id="offline-badge">📡 Modo offline — solo zonas</div>
  <div id="canvas-legend"></div>

  <script>
    // ========== DATA ==========
    var zonas = ${zonasJSON};
    var userLocation = ${userLocationJSON};
    var selectedDepartamentoId = ${selectedId};

    // ========== TRY LEAFLET (ONLINE) ==========
    var leafletLoaded = false;
    var leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletScript.onload = function() {
      leafletLoaded = true;
      initLeafletMap();
    };
    leafletScript.onerror = function() {
      initCanvasFallback();
    };

    var leafletCSS = document.createElement('link');
    leafletCSS.rel = 'stylesheet';
    leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCSS);

    // Timeout: if Leaflet doesn't load in 4s, use canvas fallback
    var fallbackTimeout = setTimeout(function() {
      if (!leafletLoaded) initCanvasFallback();
    }, 4000);

    document.head.appendChild(leafletCSS);
    document.body.appendChild(leafletScript);

    // ========== LEAFLET MAP (ONLINE) ==========
    function initLeafletMap() {
      clearTimeout(fallbackTimeout);
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
        var polygon = L.polygon(zona.coordenadas, {
          color: isSelected ? '#10b981' : '#3b82f6',
          fillColor: isSelected ? '#10b981' : '#3b82f6',
          fillOpacity: 0.3,
          weight: 3,
          opacity: 0.8
        }).addTo(map);

        polygons[zona.id] = polygon;

        var popupContent = isSelected
          ? '<b>' + zona.nombre + '</b><br>📍 Departamento seleccionado<br>Zona permitida para registro'
          : '<b>' + zona.nombre + '</b><br>Zona permitida para registro';
        polygon.bindPopup(popupContent);

        polygon.getLatLngs()[0].forEach(function(latlng) { bounds.push(latlng); });
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
            // ⭐ Actualización en tiempo real del marcador GPS
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

    // ========== CANVAS FALLBACK (OFFLINE) ==========
    function initCanvasFallback() {
      clearTimeout(fallbackTimeout);
      document.getElementById('map').style.display = 'none';
      var canvas = document.getElementById('canvas-map');
      canvas.style.display = 'block';
      document.getElementById('offline-badge').style.display = 'block';

      var ctx = canvas.getContext('2d');
      var W = canvas.width = window.innerWidth;
      var H = canvas.height = window.innerHeight;

      // Calculate bounds of all zone coordinates
      var allLats = [], allLngs = [];
      zonas.forEach(function(z) {
        z.coordenadas.forEach(function(c) { allLats.push(c[0]); allLngs.push(c[1]); });
      });
      if (userLocation) { allLats.push(userLocation[0]); allLngs.push(userLocation[1]); }

      var minLat = Math.min.apply(null, allLats), maxLat = Math.max.apply(null, allLats);
      var minLng = Math.min.apply(null, allLngs), maxLng = Math.max.apply(null, allLngs);

      // Add padding
      var padLat = (maxLat - minLat) * 0.15 || 0.001;
      var padLng = (maxLng - minLng) * 0.15 || 0.001;
      minLat -= padLat; maxLat += padLat;
      minLng -= padLng; maxLng += padLng;

      function toX(lng) { return ((lng - minLng) / (maxLng - minLng)) * W; }
      function toY(lat) { return H - ((lat - minLat) / (maxLat - minLat)) * H; }

      function drawAll() {
        ctx.clearRect(0, 0, W, H);
        // Background grid
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 0.5;
        for (var x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (var y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // Draw polygons
        zonas.forEach(function(zona) {
          var isSelected = zona.id === selectedDepartamentoId;
          var color = isSelected ? '#10b981' : '#3b82f6';

          ctx.beginPath();
          zona.coordenadas.forEach(function(c, i) {
            var px = toX(c[1]), py = toY(c[0]);
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          });
          ctx.closePath();

          // Fill
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = color;
          ctx.fill();

          // Stroke
          ctx.globalAlpha = 0.8;
          ctx.strokeStyle = color;
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Label
          var cx = 0, cy = 0;
          zona.coordenadas.forEach(function(c) { cx += toX(c[1]); cy += toY(c[0]); });
          cx /= zona.coordenadas.length;
          cy /= zona.coordenadas.length;

          ctx.font = (isSelected ? 'bold ' : '') + '13px sans-serif';
          ctx.fillStyle = '#1f2937';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Background for text
          var tw = ctx.measureText(zona.nombre).width;
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.fillRect(cx - tw/2 - 4, cy - 9, tw + 8, 18);
          ctx.fillStyle = '#1f2937';
          ctx.fillText(zona.nombre, cx, cy);
        });

        // Draw user location
        if (userLocation) {
          var ux = toX(userLocation[1]), uy = toY(userLocation[0]);
          // Glow
          ctx.beginPath();
          ctx.arc(ux, uy, 18, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
          ctx.fill();
          // Dot
          ctx.beginPath();
          ctx.arc(ux, uy, 8, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      drawAll();

      // Build legend
      var legendHTML = '';
      zonas.forEach(function(z) {
        var isS = z.id === selectedDepartamentoId;
        var c = isS ? '#10b981' : '#3b82f6';
        legendHTML += '<div class="legend-row"><div class="legend-dot" style="background:' + c + '"></div>' + z.nombre + (isS ? ' (seleccionado)' : '') + '</div>';
      });
      if (userLocation) {
        legendHTML += '<div class="legend-row"><div class="legend-dot" style="background:#ef4444;border-radius:50%"></div>Tu ubicación</div>';
      }
      var legendEl = document.getElementById('canvas-legend');
      legendEl.innerHTML = legendHTML;
      legendEl.style.display = 'block';

      // Handle resize
      window.addEventListener('resize', function() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        drawAll();
      });

      // Handle messages from React Native
      function handleCanvasMessage(event) {
        try {
          var data = JSON.parse(event.data);
          if (data.action === 'focusDepartamento') {
            selectedDepartamentoId = data.departamentoId;
            drawAll();
            // Rebuild legend
            var lHTML = '';
            zonas.forEach(function(z) {
              var isS = z.id === selectedDepartamentoId;
              var c = isS ? '#10b981' : '#3b82f6';
              lHTML += '<div class="legend-row"><div class="legend-dot" style="background:' + c + '"></div>' + z.nombre + (isS ? ' (seleccionado)' : '') + '</div>';
            });
            if (userLocation) lHTML += '<div class="legend-row"><div class="legend-dot" style="background:#ef4444;border-radius:50%"></div>Tu ubicación</div>';
            document.getElementById('canvas-legend').innerHTML = lHTML;
          } else if (data.action === 'updateUserLocation') {
            // ⭐ Actualización en tiempo real del punto GPS en canvas
            userLocation = data.location;
            drawAll();
          }
        } catch (e) {}
      }
      window.addEventListener('message', handleCanvasMessage);
      document.addEventListener('message', handleCanvasMessage);
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
            <View style={[styles.legendColor, { backgroundColor: '#10b981' }]} />
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
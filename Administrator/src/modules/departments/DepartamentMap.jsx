import { useEffect, useRef, useState } from 'react';
import { MapPin, Download, Upload, Trash2 } from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

const DepartmentMap = ({ zonas, color, onZonasChange, departmentName }) => {
    const notification = useNotification();
    const [mapReady, setMapReady] = useState(false);
    const [showCoordinates, setShowCoordinates] = useState(false);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawnItemsRef = useRef(null);

    // Cargar Leaflet dinámicamente
    useEffect(() => {
        const loadLeaflet = () => {
            if (window.L) {
                setMapReady(true);
                return;
            }

            if (!document.querySelector('link[href*="leaflet.min.css"]')) {
                const leafletCSS = document.createElement('link');
                leafletCSS.rel = 'stylesheet';
                leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                leafletCSS.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
                leafletCSS.crossOrigin = '';
                document.head.appendChild(leafletCSS);
            }

            if (!document.querySelector('link[href*="leaflet.draw.css"]')) {
                const leafletDrawCSS = document.createElement('link');
                leafletDrawCSS.rel = 'stylesheet';
                leafletDrawCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css';
                document.head.appendChild(leafletDrawCSS);
            }

            if (!document.querySelector('script[src*="leaflet.js"]')) {
                const leafletScript = document.createElement('script');
                leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                leafletScript.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
                leafletScript.crossOrigin = '';

                leafletScript.onload = () => {
                    const leafletDrawScript = document.createElement('script');
                    leafletDrawScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js';
                    leafletDrawScript.onload = () => setMapReady(true);
                    document.body.appendChild(leafletDrawScript);
                };

                document.body.appendChild(leafletScript);
            }
        };

        loadLeaflet();
    }, []);

    // Inicializar mapa (SOLO UNA VEZ)
    useEffect(() => {
        if (!mapReady || !mapRef.current || mapInstanceRef.current) return;

        const L = window.L;

        try {
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const map = L.map(mapRef.current).setView([17.9558, -102.1972], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);

            const drawnItems = new L.FeatureGroup();
            map.addLayer(drawnItems);
            drawnItemsRef.current = drawnItems;

            const drawControl = new L.Control.Draw({
                position: 'topright',
                draw: {
                    polygon: {
                        allowIntersection: false,
                        showArea: true,
                        shapeOptions: { color, fillColor: color, fillOpacity: 0.3 }
                    },
                    polyline: false,
                    circle: false,
                    rectangle: { shapeOptions: { color, fillColor: color, fillOpacity: 0.3 } },
                    marker: false,
                    circlemarker: false
                },
                edit: { featureGroup: drawnItems, remove: true }
            });
            map.addControl(drawControl);

            const actualizarZonas = () => {
                const zonasActualizadas = [];
                drawnItems.eachLayer((layer) => {
                    if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
                        const coordinates = layer.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng]);
                        const area = L.GeometryUtil ? L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) : 0;
                        zonasActualizadas.push({
                            type: layer instanceof L.Rectangle ? 'rectangle' : 'polygon',
                            coordinates,
                            area,
                            bounds: layer.getBounds()
                        });
                    }
                });
                onZonasChange(zonasActualizadas);
            };

            map.on(L.Draw.Event.CREATED, (e) => {
                drawnItems.addLayer(e.layer);
                actualizarZonas();
            });
            map.on(L.Draw.Event.EDITED, actualizarZonas);
            map.on(L.Draw.Event.DELETED, actualizarZonas);

            mapInstanceRef.current = map;
            setTimeout(() => map.invalidateSize(), 100);
        } catch (error) {
            console.error('Error al inicializar el mapa:', error);
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [mapReady]); // ✅ Solo depende de mapReady

    // Actualizar zonas cuando cambien
    useEffect(() => {
        if (!mapReady || !drawnItemsRef.current || !window.L || !mapInstanceRef.current) return;

        const L = window.L;
        drawnItemsRef.current.clearLayers();

        if (zonas && zonas.length > 0) {
            zonas.forEach(zona => {
                let layer;
                if (zona.type === 'polygon') {
                    layer = L.polygon(zona.coordinates, { color, fillColor: color, fillOpacity: 0.3 });
                } else if (zona.type === 'rectangle') {
                    layer = L.rectangle(zona.coordinates, { color, fillColor: color, fillOpacity: 0.3 });
                }
                if (layer) drawnItemsRef.current.addLayer(layer);
            });

            // 🎯 CENTRAR EL MAPA EN LAS ZONAS con delay para evitar errores
            if (drawnItemsRef.current.getLayers().length > 0) {
                setTimeout(() => {
                    try {
                        if (mapInstanceRef.current && drawnItemsRef.current) {
                            const bounds = drawnItemsRef.current.getBounds();
                            if (bounds && bounds.isValid()) {
                                mapInstanceRef.current.fitBounds(bounds, {
                                    padding: [50, 50],
                                    maxZoom: 16,
                                    animate: true,
                                    duration: 0.5
                                });
                            }
                        }
                    } catch (error) {
                        console.warn('Error al centrar mapa:', error);
                    }
                }, 200);
            }
        }
    }, [zonas, mapReady, color]);

    // Actualizar colores
    useEffect(() => {
        if (drawnItemsRef.current && window.L) {
            drawnItemsRef.current.eachLayer((layer) => {
                if (layer.setStyle) {
                    layer.setStyle({ color, fillColor: color, fillOpacity: 0.3 });
                }
            });
        }
    }, [color]);

    const limpiarZonas = () => {
        if (drawnItemsRef.current) {
            drawnItemsRef.current.clearLayers();
            onZonasChange([]);
            // Volver a la vista por defecto
            if (mapInstanceRef.current) {
                mapInstanceRef.current.setView([17.9558, -102.1972], 13);
            }
        }
    };

    const exportarCoordenadas = () => {
        const dataStr = JSON.stringify(zonas, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `zonas_${departmentName || 'departamento'}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const importarCoordenadas = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const zonasImportadas = JSON.parse(e.target.result);
                if (Array.isArray(zonasImportadas)) {
                    if (drawnItemsRef.current) drawnItemsRef.current.clearLayers();
                    onZonasChange(zonasImportadas);
                }
            } catch (error) {
                notification.error('Error de importación', 'Error al importar el archivo. Asegúrate de que sea un archivo JSON válido.');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex-1">
            <div className="sticky top-6">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                        <MapPin size={20} />
                        Zonas Geográficas
                    </h3>
                    <div className="flex items-center gap-2">
                        {zonas.length > 0 && (
                            <>
                                <button
                                    type="button"
                                    onClick={exportarCoordenadas}
                                    className="flex items-center gap-1 px-3 py-1 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
                                >
                                    <Download size={14} />
                                    Exportar
                                </button>
                                <button
                                    type="button"
                                    onClick={limpiarZonas}
                                    className="flex items-center gap-1 px-3 py-1 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    <Trash2 size={14} />
                                    Limpiar
                                </button>
                            </>
                        )}
                        <label className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                            <Upload size={14} />
                            Importar
                            <input
                                type="file"
                                accept=".json"
                                onChange={importarCoordenadas}
                                className="hidden"
                            />
                        </label>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-blue-800">
                        <strong>Instrucciones:</strong> Usa las herramientas del mapa (arriba a la derecha) para dibujar las zonas.
                        Las coordenadas se guardan automáticamente.
                    </p>
                </div>

                {!mapReady && (
                    <div className="w-full h-[600px] rounded-lg border-2 border-[#D2D2D7] flex items-center justify-center bg-gray-50">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Cargando mapa...</p>
                        </div>
                    </div>
                )}

                <div
                    ref={mapRef}
                    className={`w-full h-[600px] rounded-lg border-2 border-[#D2D2D7] overflow-hidden shadow-md ${!mapReady ? 'hidden' : ''}`}
                    style={{ zIndex: 1 }}
                />

                {zonas.length > 0 && (
                    <div className="mt-4">
                        <div className="bg-[#F5F5F7] rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-[#1D1D1F]">
                                    Total: {zonas.length} zona(s)
                                </p>
                                <button
                                    onClick={() => setShowCoordinates(!showCoordinates)}
                                    className="text-xs text-blue-600 hover:text-blue-700"
                                >
                                    {showCoordinates ? 'Ocultar coordenadas' : 'Ver coordenadas'}
                                </button>
                            </div>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {zonas.map((zona, index) => (
                                    <div key={index} className="bg-white rounded p-3 border border-[#D2D2D7]">
                                        <div className="flex items-center gap-2 text-sm mb-2">
                                            <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                                            <span className="font-medium text-[#1D1D1F]">
                                                Zona {index + 1} ({zona.type === 'rectangle' ? 'Rectángulo' : 'Polígono'})
                                            </span>
                                        </div>
                                        <p className="text-xs text-[#6E6E73] ml-6">
                                            {zona.coordinates.length} puntos
                                        </p>
                                        {showCoordinates && (
                                            <div className="mt-2 ml-6 p-2 bg-gray-50 rounded text-xs font-mono text-gray-700 max-h-32 overflow-y-auto">
                                                {JSON.stringify(zona.coordinates, null, 2)}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DepartmentMap;
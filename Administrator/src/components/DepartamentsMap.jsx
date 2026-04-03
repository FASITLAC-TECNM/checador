import React, { useEffect, useRef } from 'react';

const MapaDepartamentos = ({ departamentos, focusedDepto }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const layerGroupRef = useRef(null);

    useEffect(() => {
        initMap();
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Actualizar polígonos cuando cambia la lista de departamentos
    useEffect(() => {
        if (mapInstanceRef.current && layerGroupRef.current && window.L) {
            updatePolygons();
        }
    }, [departamentos]);

    // EFECTO DE FOCO: Se ejecuta cuando se hace clic en una card
    useEffect(() => {
        if (focusedDepto && mapInstanceRef.current && window.L) {
            zoomToDepto(focusedDepto);
        }
    }, [focusedDepto]);

    const initMap = async () => {
        if (typeof window === 'undefined') return;

        const leafletModule = await import('leaflet');
        const L = leafletModule.default || leafletModule;
        await import('leaflet/dist/leaflet.css');

        // Fix Icons
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // map.setView([17.9577, -102.2006], 13); // Centrado inicial
        // No hardcodeamos la vista inicial, dejaremos que updatePolygons haga el fitBounds si hay zonas,
        // o un fallback si no hay ninguna.
        const map = L.map(mapRef.current).setView([17.9577, -102.2006], 13); // Fallback inicial

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        mapInstanceRef.current = map;
        layerGroupRef.current = L.featureGroup().addTo(map);

        // Cargar polígonos iniciales
        updatePolygons();
    };

    const updatePolygons = () => {
        const L = window.L;
        if (!L || !layerGroupRef.current) return;

        layerGroupRef.current.clearLayers();

        departamentos.forEach(depto => {
            if (depto.ubicacion?.zonas) {
                depto.ubicacion.zonas.forEach(zona => {
                    const polygon = L.polygon(zona.coordinates, {
                        color: `#${depto.color}`,
                        fillColor: `#${depto.color}`,
                        fillOpacity: 0.3,
                        weight: 2
                    });

                    // --- AQUÍ ESTÁ EL CAMBIO PARA MOSTRAR EL NOMBRE ---
                    polygon.bindTooltip(depto.nombre, {
                        permanent: true,      // Siempre visible
                        direction: 'center',  // En el centro del polígono
                        className: 'label-departamento' // Clase para quitar el fondo blanco (ver estilo abajo)
                    });

                    // Popup con más detalles al hacer clic
                    polygon.bindPopup(`
                        <div class="font-sans text-center">
                            <strong style="color:#${depto.color}; font-size: 14px;">${depto.nombre}</strong><br/>
                            <span class="text-gray-500 text-xs">${depto.descripcion || ''}</span>
                        </div>
                    `);

                    layerGroupRef.current.addLayer(polygon);
                });
            }
        });

        // --- ZOOM AUTOMÁTICO A TODAS LAS ZONAS ---
        if (layerGroupRef.current.getLayers().length > 0) {
            const bounds = layerGroupRef.current.getBounds();
            if (bounds.isValid()) {
                mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
            }
        }
    };

    const zoomToDepto = (depto) => {
        const L = window.L;
        if (!depto.ubicacion?.zonas || depto.ubicacion.zonas.length === 0) return;

        // Crear un grupo temporal con solo las zonas de este depto para calcular los límites
        const tempGroup = L.featureGroup();
        depto.ubicacion.zonas.forEach(zona => {
            const poly = L.polygon(zona.coordinates);
            tempGroup.addLayer(poly);
        });

        const bounds = tempGroup.getBounds();
        if (bounds.isValid()) {
            mapInstanceRef.current.flyToBounds(bounds, {
                padding: [50, 50],
                duration: 1.5
            });
            // Opcional: Abrir el popup del primer polígono al hacer zoom
            // layerGroupRef.current.getLayers().find(l => ...).openPopup();
        }
    };

    // Inject custom styles for map labels
    useEffect(() => {
        const styleId = 'map-label-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.innerHTML = `
                .label-departamento {
                    background: transparent !important;
                    border: none !important;
                    box-shadow: none !important;
                    font-weight: bold;
                    color: #374151;
                    text-shadow: 1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff;
                    font-size: 12px;
                }
            `;
            document.head.appendChild(style);
        }
    }, []);

    return (
        <>
            {/* Estilos para quitar el recuadro blanco del tooltip y dejar solo el texto */}
            <div ref={mapRef} className="w-full h-full z-0" />
        </>
    );
};

export default MapaDepartamentos;
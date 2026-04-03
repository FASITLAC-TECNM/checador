import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    FiX, FiMapPin, FiSearch,
    FiRefreshCw, FiSave, FiAlertCircle
} from 'react-icons/fi';
import ConfirmBox from '../ConfirmBox';
import DynamicLoader from '../common/DynamicLoader';

const DepartamentsModal = ({ isOpen, onClose, mode, initialData, usuarios, onSave, saving }) => {
    const [formData, setFormData] = useState({
        nombre: '', descripcion: '', jefes: [], color: 'EF4444', es_activo: true, ubicacion: null
    });

    const [zonas, setZonas] = useState([]);
    const [searchJefe, setSearchJefe] = useState('');
    const [showJefeDropdown, setShowJefeDropdown] = useState(false);
    const [alertMsg, setAlertMsg] = useState(null);
    const [mapReady, setMapReady] = useState(false);

    // Map Refs
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawnItemsRef = useRef(null);

    // Control para hacer zoom solo la primera vez que se cargan los datos
    const shouldFitBoundsRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            setMapReady(false); // Reset map ready state
            if (mode === 'edit' && initialData) {
                setFormData({
                    nombre: initialData.nombre || '',
                    descripcion: initialData.descripcion || '',
                    jefes: initialData.jefes || [],
                    color: initialData.color || 'EF4444',
                    es_activo: initialData.es_activo ?? true,
                    ubicacion: initialData.ubicacion
                });
                const zonasIniciales = initialData.ubicacion?.zonas || [];
                setZonas(zonasIniciales);

                // Si hay zonas, activamos la bandera para hacer zoom cuando el mapa cargue
                if (zonasIniciales.length > 0) {
                    shouldFitBoundsRef.current = true;
                }
            } else {
                setFormData({
                    nombre: '', descripcion: '', jefes: [], color: 'EF4444', es_activo: true, ubicacion: null
                });
                setZonas([]);
                shouldFitBoundsRef.current = false;
            }
            setSearchJefe('');
        }
    }, [isOpen, mode, initialData]);

    // Inicializar mapa
    useEffect(() => {
        if (isOpen && mapRef.current && !mapInstanceRef.current) {
            initMap();
        }
        return () => {
            if (!isOpen && mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                drawnItemsRef.current = null;
                setMapReady(false);
            }
        };
    }, [isOpen]);

    // Actualizar zonas en el mapa y HACER ZOOM si es necesario
    useEffect(() => {
        if (mapReady && mapInstanceRef.current && drawnItemsRef.current && window.L) {
            // 1. Limpiar y redibujar
            drawnItemsRef.current.clearLayers();

            if (zonas.length > 0) {
                zonas.forEach(zona => {
                    const polygon = window.L.polygon(zona.coordinates, {
                        color: `#${formData.color}`,
                        fillColor: `#${formData.color}`,
                        fillOpacity: 0.3
                    });
                    drawnItemsRef.current.addLayer(polygon);
                });

                // 2. Lógica de Zoom Automático (FitBounds)
                if (shouldFitBoundsRef.current) {
                    const bounds = drawnItemsRef.current.getBounds();
                    if (bounds.isValid()) {
                        // Pequeño delay para asegurar que el modal terminó su animación de renderizado
                        setTimeout(() => {
                            mapInstanceRef.current.invalidateSize(); // Crucial para modales
                            mapInstanceRef.current.fitBounds(bounds, { padding: [10, 10], maxZoom: 18 });
                        }, 500);
                    }
                    // Desactivamos la bandera para que no haga zoom cada vez que dibujamos algo nuevo manualmente
                    shouldFitBoundsRef.current = false;
                }
            }
        }
    }, [zonas, formData.color, mapReady]);

    const initMap = async () => {
        if (typeof window === 'undefined') return;

        const leafletModule = await import('leaflet');
        const L = leafletModule.default || leafletModule;
        await import('leaflet/dist/leaflet.css');
        await import('leaflet-draw');
        await import('leaflet-draw/dist/leaflet.draw.css');

        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        });

        // Coordenadas por defecto (Lázaro Cárdenas)
        const map = L.map(mapRef.current).setView([17.9577, -102.2006], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);
        drawnItemsRef.current = drawnItems;

        const drawControl = new L.Control.Draw({
            position: 'topright',
            draw: {
                polygon: { allowIntersection: false, shapeOptions: { color: `#${formData.color}` } },
                rectangle: { shapeOptions: { color: `#${formData.color}` } },
                circle: false, circlemarker: false, marker: false, polyline: false
            },
            edit: { featureGroup: drawnItems, remove: true }
        });
        map.addControl(drawControl);

        map.on('draw:created', (e) => {
            drawnItems.addLayer(e.layer);
            updateZonasFromMap(drawnItems);
        });
        map.on('draw:edited', () => updateZonasFromMap(drawnItems));
        map.on('draw:deleted', () => updateZonasFromMap(drawnItems));

        mapInstanceRef.current = map;
        setMapReady(true); // Signal that map is ready

        // Corrección visual para mapas dentro de modales
        setTimeout(() => {
            map.invalidateSize();
        }, 200);
    };

    const updateZonasFromMap = (layerGroup) => {
        const newZonas = [];
        layerGroup.eachLayer(layer => {
            if (layer.getLatLngs) {
                const latlngs = layer.getLatLngs()[0] || layer.getLatLngs();
                const flatLatLngs = Array.isArray(latlngs[0]) ? latlngs[0] : latlngs;
                const coordinates = flatLatLngs.map(ll => [ll.lat, ll.lng]);
                newZonas.push({ coordinates, type: 'polygon' });
            }
        });
        setZonas(newZonas);
    };

    const clearMap = () => {
        if (drawnItemsRef.current) {
            drawnItemsRef.current.clearLayers();
            setZonas([]);
        }
    };

    // --- MANEJO DE JEFES ---
    const addJefe = (usr) => {
        if (!formData.jefes.includes(usr.id)) {
            setFormData(p => ({ ...p, jefes: [...p.jefes, usr.id] }));
        }
        setSearchJefe('');
        setShowJefeDropdown(false);
    };

    const removeJefe = (id) => {
        setFormData(p => ({ ...p, jefes: p.jefes.filter(j => j !== id) }));
    };

    const filteredUsuarios = usuarios.filter(u =>
        u.nombre.toLowerCase().includes(searchJefe.toLowerCase()) &&
        !formData.jefes.includes(u.id)
    );

    const getUsuarioInfo = (id) => usuarios.find(u => u.id === id);

    const handleSubmit = () => {
        if (!formData.nombre.trim()) {
            setAlertMsg('El nombre es requerido');
            return;
        }
        onSave({ ...formData, ubicacion: zonas.length > 0 ? { zonas } : null });
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-gray-700 max-w-5xl w-full max-h-[95vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                        {mode === 'create' ? 'Nuevo Departamento' : 'Editar Departamento'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"><FiX size={20} /></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Columna Izquierda: Formulario */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    className="input"
                                    placeholder="Ej: Recursos Humanos"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                                <textarea
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                    rows={3}
                                    className="input resize-none"
                                />
                            </div>

                            {/* Color Picker */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color Identificador</label>
                                <div className="flex items-center gap-4">
                                    <div className="relative overflow-hidden w-16 h-10 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm">
                                        <input
                                            type="color"
                                            value={`#${formData.color}`}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value.replace('#', '') })}
                                            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs text-gray-500 uppercase font-mono">#{formData.color}</span>
                                        <span className="text-xs text-gray-400">Clic para cambiar</span>
                                    </div>
                                </div>
                            </div>

                            {/* Selector de Jefes */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jefes de Departamento</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {formData.jefes.map(id => {
                                        const u = getUsuarioInfo(id);
                                        return u ? (
                                            <span key={id} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md text-sm">
                                                {u.nombre}
                                                <button onClick={() => removeJefe(id)} className="hover:text-red-500"><FiX size={14} /></button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                                <div className="relative">
                                    <FiSearch className="absolute left-3 top-2.5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={searchJefe}
                                        onChange={e => { setSearchJefe(e.target.value); setShowJefeDropdown(true); }}
                                        onFocus={() => setShowJefeDropdown(true)}
                                        className="input pl-10"
                                        placeholder="Buscar usuario..."
                                    />
                                    {showJefeDropdown && searchJefe && (
                                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                            {filteredUsuarios.map(u => (
                                                <button
                                                    key={u.id}
                                                    onClick={() => addJefe(u)}
                                                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 text-sm text-gray-900 dark:text-white"
                                                >
                                                    {u.nombre}
                                                </button>
                                            ))}
                                            {filteredUsuarios.length === 0 && <div className="px-4 py-2 text-gray-500 text-sm">No encontrado</div>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha: Mapa */}
                        <div className="flex flex-col h-full min-h-[400px]">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                    <FiMapPin /> Zonas Geográficas ({zonas.length})
                                </label>
                                <button onClick={clearMap} className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1">
                                    <FiRefreshCw size={12} /> Limpiar mapa
                                </button>
                            </div>
                            <div className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden relative">
                                <div ref={mapRef} className="w-full h-full z-0" />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Usa las herramientas de dibujo para delimitar las zonas.
                            </p>
                        </div>
                    </div>
                </div>

                {alertMsg && <ConfirmBox message={alertMsg} onConfirm={() => setAlertMsg(null)} />}

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-700 bg-slate-50/50 dark:bg-gray-800 flex justify-end gap-3 rounded-b-2xl">
                    <button onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className={`btn-primary flex items-center gap-2 ${saving ? 'opacity-70 cursor-wait' : ''}`}
                    >
                        {saving ? <DynamicLoader text="Guardando..." size="tiny" layout="row" /> : <><FiSave /> Guardar</>}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DepartamentsModal;
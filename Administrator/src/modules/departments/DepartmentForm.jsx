import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, X, Building2, MapPin, Trash2, Download, Upload, User } from 'lucide-react';
import { getUsuarios } from '../../services/api';

const DepartmentForm = ({ department, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        jefe: '',
        color: '#3b82f6',
        activo: true,
        zonas: []
    });

    const [mapReady, setMapReady] = useState(false);
    const [showCoordinates, setShowCoordinates] = useState(false);
    const [usuarios, setUsuarios] = useState([]);
    const [searchUsuario, setSearchUsuario] = useState('');
    const [showUsuarioSelector, setShowUsuarioSelector] = useState(false);
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawnItemsRef = useRef(null);

    const coloresDisponibles = [
        { color: '#ef4444', nombre: 'Rojo' },
        { color: '#f97316', nombre: 'Naranja' },
        { color: '#f59e0b', nombre: 'Amarillo' },
        { color: '#10b981', nombre: 'Verde' },
        { color: '#3b82f6', nombre: 'Azul' },
        { color: '#6366f1', nombre: 'Índigo' },
        { color: '#8b5cf6', nombre: 'Violeta' },
        { color: '#ec4899', nombre: 'Rosa' },
        { color: '#14b8a6', nombre: 'Turquesa' },
        { color: '#64748b', nombre: 'Gris' }
    ];

    // CRÍTICO: Cargar datos del departamento al editar
    useEffect(() => {
        console.log('Department recibido:', department);
        if (department) {
            setFormData({
                nombre: department.nombre || '',
                descripcion: department.descripcion || '',
                jefe: department.jefe || '',
                jefeId: department.jefeId || '',
                jefeEmail: department.jefeEmail || '',
                jefeUsername: department.jefeUsername || '',
                jefeFoto: department.jefeFoto || '',
                jefeRol: department.jefeRol || '',
                color: department.color || '#3b82f6',
                activo: department.activo !== undefined ? department.activo : true,
                zonas: department.zonas || []
            });
        } else {
            // Si es nuevo departamento, resetear el formulario
            setFormData({
                nombre: '',
                descripcion: '',
                jefe: '',
                color: '#3b82f6',
                activo: true,
                zonas: []
            });
        }
    }, [department]);

    // Cargar usuarios al montar el componente
    useEffect(() => {
        const cargarUsuarios = async () => {
            try {
                const usuariosData = await getUsuarios();

                if (usuariosData && Array.isArray(usuariosData)) {
                    // Filtrar solo usuarios activos
                    const usuariosActivos = usuariosData.filter(u => u.activo === 'ACTIVO');
                    setUsuarios(usuariosActivos);
                } else {
                    console.warn('No se recibieron usuarios de la API');
                    setUsuarios([]);
                }
            } catch (error) {
                console.error('Error al cargar usuarios:', error);
                setUsuarios([]);
            }
        };
        cargarUsuarios();
    }, []);

    // Filtrar usuarios según búsqueda
    const usuariosFiltrados = usuarios.filter(usuario => {
        const searchLower = searchUsuario.toLowerCase();
        return (
            usuario.nombre?.toLowerCase().includes(searchLower) ||
            usuario.email?.toLowerCase().includes(searchLower) ||
            usuario.username?.toLowerCase().includes(searchLower) ||
            usuario.rol?.toLowerCase().includes(searchLower)
        );
    });

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

                    leafletDrawScript.onload = () => {
                        setMapReady(true);
                    };

                    document.body.appendChild(leafletDrawScript);
                };

                document.body.appendChild(leafletScript);
            }
        };

        loadLeaflet();
    }, []);

    // Inicializar mapa cuando esté listo
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

            if (formData.zonas && formData.zonas.length > 0) {
                formData.zonas.forEach(zona => {
                    let layer;
                    if (zona.type === 'polygon') {
                        layer = L.polygon(zona.coordinates, {
                            color: formData.color,
                            fillColor: formData.color,
                            fillOpacity: 0.3
                        });
                    } else if (zona.type === 'rectangle') {
                        layer = L.rectangle(zona.coordinates, {
                            color: formData.color,
                            fillColor: formData.color,
                            fillOpacity: 0.3
                        });
                    }
                    if (layer) {
                        drawnItems.addLayer(layer);
                    }
                });

                if (drawnItems.getLayers().length > 0) {
                    map.fitBounds(drawnItems.getBounds());
                }
            }

            const drawControl = new L.Control.Draw({
                position: 'topright',
                draw: {
                    polygon: {
                        allowIntersection: false,
                        showArea: true,
                        shapeOptions: {
                            color: formData.color,
                            fillColor: formData.color,
                            fillOpacity: 0.3
                        }
                    },
                    polyline: false,
                    circle: false,
                    rectangle: {
                        shapeOptions: {
                            color: formData.color,
                            fillColor: formData.color,
                            fillOpacity: 0.3
                        }
                    },
                    marker: false,
                    circlemarker: false
                },
                edit: {
                    featureGroup: drawnItems,
                    remove: true
                }
            });
            map.addControl(drawControl);

            map.on(L.Draw.Event.CREATED, (e) => {
                const layer = e.layer;
                drawnItems.addLayer(layer);
                actualizarZonas();
            });

            map.on(L.Draw.Event.EDITED, () => {
                actualizarZonas();
            });

            map.on(L.Draw.Event.DELETED, () => {
                actualizarZonas();
            });

            mapInstanceRef.current = map;

            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        } catch (error) {
            console.error('Error al inicializar el mapa:', error);
        }

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [mapReady]);

    // Actualizar el mapa cuando cambien las zonas en formData
    useEffect(() => {
        if (!mapReady || !drawnItemsRef.current || !window.L) return;

        const L = window.L;

        // Limpiar capas existentes
        drawnItemsRef.current.clearLayers();

        // Redibujar zonas
        if (formData.zonas && formData.zonas.length > 0) {
            formData.zonas.forEach(zona => {
                let layer;
                if (zona.type === 'polygon') {
                    layer = L.polygon(zona.coordinates, {
                        color: formData.color,
                        fillColor: formData.color,
                        fillOpacity: 0.3
                    });
                } else if (zona.type === 'rectangle') {
                    layer = L.rectangle(zona.coordinates, {
                        color: formData.color,
                        fillColor: formData.color,
                        fillOpacity: 0.3
                    });
                }
                if (layer) {
                    drawnItemsRef.current.addLayer(layer);
                }
            });

            if (drawnItemsRef.current.getLayers().length > 0 && mapInstanceRef.current) {
                mapInstanceRef.current.fitBounds(drawnItemsRef.current.getBounds());
            }
        }
    }, [formData.zonas, mapReady]);

    const actualizarZonas = () => {
        if (!drawnItemsRef.current || !window.L) return;

        const L = window.L;
        const zonas = [];

        drawnItemsRef.current.eachLayer((layer) => {
            if (layer instanceof L.Polygon || layer instanceof L.Rectangle) {
                const coordinates = layer.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng]);
                const area = L.GeometryUtil ? L.GeometryUtil.geodesicArea(layer.getLatLngs()[0]) : 0;

                zonas.push({
                    type: layer instanceof L.Rectangle ? 'rectangle' : 'polygon',
                    coordinates: coordinates,
                    area: area,
                    bounds: layer.getBounds()
                });
            }
        });

        setFormData(prev => ({ ...prev, zonas }));
    };

    useEffect(() => {
        if (drawnItemsRef.current && window.L) {
            drawnItemsRef.current.eachLayer((layer) => {
                if (layer.setStyle) {
                    layer.setStyle({
                        color: formData.color,
                        fillColor: formData.color,
                        fillOpacity: 0.3
                    });
                }
            });
        }
    }, [formData.color]);

    const limpiarZonas = () => {
        if (drawnItemsRef.current) {
            drawnItemsRef.current.clearLayers();
            setFormData(prev => ({ ...prev, zonas: [] }));
        }
    };

    const exportarCoordenadas = () => {
        const dataStr = JSON.stringify(formData.zonas, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `zonas_${formData.nombre || 'departamento'}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const importarCoordenadas = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const zonas = JSON.parse(e.target.result);
                if (Array.isArray(zonas)) {
                    if (drawnItemsRef.current) {
                        drawnItemsRef.current.clearLayers();
                    }

                    setFormData(prev => ({ ...prev, zonas }));

                    if (mapReady && drawnItemsRef.current && window.L) {
                        const L = window.L;
                        zonas.forEach(zona => {
                            let layer;
                            if (zona.type === 'polygon') {
                                layer = L.polygon(zona.coordinates, {
                                    color: formData.color,
                                    fillColor: formData.color,
                                    fillOpacity: 0.3
                                });
                            } else if (zona.type === 'rectangle') {
                                layer = L.rectangle(zona.coordinates, {
                                    color: formData.color,
                                    fillColor: formData.color,
                                    fillOpacity: 0.3
                                });
                            }
                            if (layer) {
                                drawnItemsRef.current.addLayer(layer);
                            }
                        });

                        if (drawnItemsRef.current.getLayers().length > 0) {
                            mapInstanceRef.current.fitBounds(drawnItemsRef.current.getBounds());
                        }
                    }
                }
            } catch (error) {
                alert('Error al importar el archivo. Asegúrate de que sea un archivo JSON válido.');
            }
        };
        reader.readAsText(file);
    };

    const handleSubmit = () => {
        if (formData.nombre && formData.descripcion && formData.jefe) {
            console.log('Guardando departamento:', formData);
            onSave(formData);
        } else {
            alert('Por favor complete todos los campos obligatorios (*)');
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const seleccionarUsuario = (usuario) => {
        setFormData(prev => ({
            ...prev,
            jefe: usuario.nombre,
            jefeId: usuario.id,
            jefeEmail: usuario.email,
            jefeUsername: usuario.username,
            jefeFoto: usuario.foto,
            jefeRol: usuario.rol
        }));
        setShowUsuarioSelector(false);
        setSearchUsuario('');
    };

    return (
        <div className="min-h-screen bg-[#FBFBFD] p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors text-[#6E6E73]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1D1D1F]">
                            {department ? 'Editar Departamento' : 'Nuevo Departamento'}
                        </h2>
                        <p className="text-[#6E6E73] mt-1">Complete la información del departamento</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-[#D2D2D7]">
                    <div className="flex flex-col lg:flex-row gap-6">

                        {/* LADO IZQUIERDO - FORMULARIO (50%) */}
                        <div className="flex-1 space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7] flex items-center gap-2">
                                    <Building2 size={20} />
                                    Información Básica
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                            Nombre del Departamento *
                                        </label>
                                        <input
                                            type="text"
                                            name="nombre"
                                            value={formData.nombre}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#86868B]"
                                            placeholder="Ej: Recursos Humanos"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                            Descripción *
                                        </label>
                                        <textarea
                                            name="descripcion"
                                            value={formData.descripcion}
                                            onChange={handleChange}
                                            rows="3"
                                            className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-[#86868B]"
                                            placeholder="Describe las funciones del departamento..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                            Jefe de Departamento *
                                        </label>

                                        {!formData.jefe ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowUsuarioSelector(true)}
                                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#86868B] rounded-lg hover:bg-[#E5E5E7] transition-colors text-left"
                                            >
                                                Seleccionar jefe de departamento...
                                            </button>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 px-4 py-3 bg-blue-50 border border-blue-200 text-[#1D1D1F] rounded-lg">
                                                    <div className="flex items-center gap-3">
                                                        {formData.jefeFoto ? (
                                                            <img
                                                                src={formData.jefeFoto}
                                                                alt={formData.jefe}
                                                                className="w-10 h-10 rounded-full object-cover border-2 border-blue-300"
                                                            />
                                                        ) : (
                                                            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                                                                <User size={20} className="text-blue-600" />
                                                            </div>
                                                        )}
                                                        <div className="flex-1">
                                                            <div className="font-medium">{formData.jefe}</div>
                                                            <div className="text-sm text-[#6E6E73]">{formData.jefeEmail}</div>
                                                            {formData.jefeRol && (
                                                                <div className="text-xs text-[#86868B] mt-0.5">
                                                                    {formData.jefeRol}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            jefe: '',
                                                            jefeId: '',
                                                            jefeEmail: '',
                                                            jefeFoto: '',
                                                            jefeRol: ''
                                                        }));
                                                    }}
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                            Color Identificador
                                        </label>
                                        <div className="flex flex-wrap gap-3">
                                            {coloresDisponibles.map((c) => (
                                                <button
                                                    key={c.color}
                                                    type="button"
                                                    onClick={() => setFormData(prev => ({ ...prev, color: c.color }))}
                                                    className={`w-10 h-10 rounded-lg transition-all ${formData.color === c.color
                                                        ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-white scale-110'
                                                        : 'hover:scale-105'
                                                        }`}
                                                    style={{ backgroundColor: c.color }}
                                                    title={c.nombre}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            name="activo"
                                            checked={formData.activo}
                                            onChange={handleChange}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                        />
                                        <label className="ml-2 text-sm text-[#1D1D1F]">
                                            Departamento activo
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {formData.zonas.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                                        Zonas Definidas
                                    </h3>
                                    <div className="bg-[#F5F5F7] rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-sm font-medium text-[#1D1D1F]">
                                                Total: {formData.zonas.length} zona(s)
                                            </p>
                                            <button
                                                onClick={() => setShowCoordinates(!showCoordinates)}
                                                className="text-xs text-blue-600 hover:text-blue-700"
                                            >
                                                {showCoordinates ? 'Ocultar coordenadas' : 'Ver coordenadas'}
                                            </button>
                                        </div>
                                        <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {formData.zonas.map((zona, index) => (
                                                <div key={index} className="bg-white rounded p-3 border border-[#D2D2D7]">
                                                    <div className="flex items-center gap-2 text-sm mb-2">
                                                        <div
                                                            className="w-4 h-4 rounded"
                                                            style={{ backgroundColor: formData.color }}
                                                        />
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

                            <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E7]">
                                <button
                                    onClick={handleSubmit}
                                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    <Save size={18} />
                                    Guardar
                                </button>
                                <button
                                    onClick={onCancel}
                                    className="flex items-center gap-2 px-6 py-2 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] transition-colors"
                                >
                                    <X size={18} />
                                    Cancelar
                                </button>
                            </div>
                        </div>

                        {/* LADO DERECHO - MAPA (50%) */}
                        <div className="flex-1">
                            <div className="sticky top-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-[#1D1D1F] flex items-center gap-2">
                                        <MapPin size={20} />
                                        Zonas Geográficas
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        {formData.zonas.length > 0 && (
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Selección de Usuario */}
            {showUsuarioSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-[#E5E5E7]">
                            <h3 className="text-xl font-semibold text-[#1D1D1F]">Seleccionar Jefe de Departamento</h3>
                            <button
                                onClick={() => {
                                    setShowUsuarioSelector(false);
                                    setSearchUsuario('');
                                }}
                                className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors text-[#6E6E73]"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Buscador */}
                        <div className="p-6 border-b border-[#E5E5E7]">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchUsuario}
                                    onChange={(e) => setSearchUsuario(e.target.value)}
                                    placeholder="Buscar por nombre, email, username o rol..."
                                    className="w-full px-4 py-3 pl-10 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#86868B]"
                                    autoFocus
                                />
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#86868B]" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            {searchUsuario && (
                                <p className="text-sm text-[#6E6E73] mt-2">
                                    {usuariosFiltrados.length} resultado(s) encontrado(s)
                                </p>
                            )}
                            {usuarios.length === 0 && (
                                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm text-yellow-800">
                                        ⚠️ No se pudieron cargar los usuarios. Verifica que el servidor esté corriendo en http://localhost:3001
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Lista de usuarios */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {usuariosFiltrados.length > 0 ? (
                                <div className="space-y-2">
                                    {usuariosFiltrados.map((usuario) => (
                                        <button
                                            key={usuario.id}
                                            type="button"
                                            onClick={() => seleccionarUsuario(usuario)}
                                            className="w-full p-4 bg-[#F5F5F7] hover:bg-blue-50 border border-[#D2D2D7] hover:border-blue-300 rounded-lg transition-all text-left group"
                                        >
                                            <div className="flex items-start gap-3">
                                                {/* Foto del usuario */}
                                                {usuario.foto ? (
                                                    <img
                                                        src={usuario.foto}
                                                        alt={usuario.nombre}
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-[#D2D2D7] group-hover:border-blue-400 transition-colors flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 group-hover:from-blue-500 group-hover:to-blue-700 transition-all">
                                                        <User size={24} className="text-white" />
                                                    </div>
                                                )}

                                                {/* Información del usuario */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-[#1D1D1F] group-hover:text-blue-600 transition-colors">
                                                        {usuario.nombre}
                                                    </div>
                                                    <div className="text-sm text-[#6E6E73] mt-0.5 truncate">
                                                        {usuario.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        <span className="text-xs text-[#86868B] bg-white px-2 py-1 rounded border border-[#D2D2D7]">
                                                            @{usuario.username}
                                                        </span>
                                                        {usuario.rol && (
                                                            <span className="text-xs font-medium px-2 py-1 rounded bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border border-purple-300">
                                                                {usuario.rol}
                                                            </span>
                                                        )}
                                                        {usuario.activo === 'ACTIVO' && (
                                                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded border border-green-300 font-medium">
                                                                Activo
                                                            </span>
                                                        )}
                                                        {usuario.estado === 'CONECTADO' && (
                                                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                                                En línea
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Icono de check */}
                                                <div className="ml-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                    <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="text-[#86868B] mb-2">
                                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-[#6E6E73] font-medium">No se encontraron usuarios</p>
                                    <p className="text-sm text-[#86868B] mt-1">
                                        {searchUsuario ? 'Intenta con otra búsqueda' : 'No hay usuarios registrados'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentForm;
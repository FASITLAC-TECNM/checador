import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { FiX, FiGlobe, FiUser, FiActivity, FiShield, FiSave, FiInfo, FiMapPin, FiRefreshCw, FiBookOpen, FiBriefcase } from 'react-icons/fi';
import { API_CONFIG } from '../config/Apiconfig';

const NuevaEmpresaModal = ({ isOpen, onClose, onEmpresaCreada }) => {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successData, setSuccessData] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);

    const [formParams, setFormParams] = useState({
        nombre: '',
        departamento_nombre: '',
        telefono: '',
        correo: '', // Correo de contacto general (opcional)
        logo: '',
        tipo_institucion: 'corporativa', // 'educativa' | 'corporativa'
        admin_usuario: '', // Requerido para SaaS
        admin_correo: '',  // Requerido para SaaS
        limite_empleados: '',
        limite_dispositivos: '',
        fecha_vencimiento: ''
    });

    // Estado y referencias para el mapa de ubicación del departamento inicial
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const drawnItemsRef = useRef(null);
    const [zonas, setZonas] = useState([]);
    const [mapReady, setMapReady] = useState(false);

    const API_URL = API_CONFIG.BASE_URL;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormParams(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleGenerateUsername = () => {
        if (!formParams.nombre) return;
        const baseNombre = formParams.nombre.toLowerCase().replace(/[^a-z0-9]/g, '');
        const suffix = Math.floor(Math.random() * 900) + 100;
        setFormParams(prev => ({
            ...prev,
            admin_usuario: `admin_${baseNombre.substring(0, 10)}${suffix}`
        }));
    };

    // Efecto para inicializar el mapa cuando el modal abre y el contenedor está listo
    useEffect(() => {
        if (!isOpen) {
            setCurrentStep(1);
            setSuccessData(null);
        }
        // El mapa ahora se inicializará cuando estemos en el paso 4 y el contenedor esté listo
        if (isOpen && currentStep === 4 && mapRef.current && !mapInstanceRef.current) {
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
    }, [isOpen, currentStep]);

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
                polygon: { allowIntersection: false, shapeOptions: { color: '#EF4444' } },
                rectangle: { shapeOptions: { color: '#EF4444' } },
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
            if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            setError(null);

            // Procesar valores para que envíe null si están vacíos
            const dataToSubmit = { ...formParams };
            if (dataToSubmit.limite_empleados === '') dataToSubmit.limite_empleados = null;
            if (dataToSubmit.limite_dispositivos === '') dataToSubmit.limite_dispositivos = null;
            if (dataToSubmit.fecha_vencimiento === '') dataToSubmit.fecha_vencimiento = null;

            const token = localStorage.getItem('auth_token');
            // Incluir la ubicación del departamento inicial si se dibujó alguna zona
        if (zonas.length > 0) {
            dataToSubmit.departamento_ubicacion = { zonas };
        }
        const response = await fetch(`${API_URL}/api/empresas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(dataToSubmit)
        });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error al aprovisionar la nueva empresa');
            }

            // Mostrar la credencial generada
            setSuccessData(data.data.admin);

            // Informar a la ventana padre para refrescar
            if (onEmpresaCreada) onEmpresaCreada(data.data.empresa);

        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const steps = [
        { id: 1, label: 'Empresa' },
        { id: 2, label: 'Administrador' },
        { id: 3, label: 'Licencia' },
        { id: 4, label: 'Ubicación' }
    ];

    const renderStepper = () => {
        return (
            <div className="flex px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 justify-between items-center overflow-x-auto">
                {steps.map((step) => (
                    <div key={step.id} className="flex items-center">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                            currentStep === step.id 
                                ? 'border-primary-500 bg-primary-500 text-white'
                                : currentStep > step.id
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                        }`}>
                            {currentStep > step.id ? '✓' : step.id}
                        </div>
                        <span className={`ml-2 text-sm font-medium hidden sm:block ${
                            currentStep === step.id ? 'text-primary-600 dark:text-primary-400' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                            {step.label}
                        </span>
                        {step.id < 4 && (
                            <div className={`w-8 sm:w-16 h-0.5 mx-2 ${
                                currentStep > step.id ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                            }`}></div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (!formParams.nombre) {
                setError('Por favor complete todos los campos obligatorios (*) de Identidad del Cliente');
                return;
            }
        }
        if (currentStep === 2) {
            if (!formParams.admin_correo || !formParams.admin_usuario) {
                setError('Por favor complete todos los campos obligatorios (*) del Administrador');
                return;
            }
        }
        setError(null);
        setCurrentStep(prev => prev + 1);
    };

    const handlePrev = () => {
        setError(null);
        setCurrentStep(prev => prev - 1);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl shadow-slate-200/40 dark:shadow-none border border-slate-100 dark:border-gray-700 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header Modal */}
                <div className="bg-white dark:bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-gray-700 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FiGlobe className="text-primary-500" /> Aprovisionar Nuevo Tenant
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Sigue los pasos para configurar el entorno de la empresa y su administrador maestro.
                        </p>
                    </div>
                    {!successData && (
                        <button
                            onClick={onClose}
                            disabled={saving}
                            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <FiX className="w-6 h-6" />
                        </button>
                    )}
                </div>

                {!successData && renderStepper()}

                {/* Body Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold rounded-lg border border-red-100 dark:border-red-800/50 flex items-start gap-2 text-sm transition-all">
                            <FiActivity className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p>{error}</p>
                        </div>
                    )}

                    {successData ? (
                        // PANTALLA DE ÉXITO Y CREDENCIALES
                        <div className="flex flex-col items-center justify-center py-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center">
                                <FiShield className="w-10 h-10" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">¡Instancia Creada Exitosamente!</h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                    El entorno de la empresa ha sido configurado. Comparte las siguientes credenciales de acceso con el contacto del cliente:
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 w-full max-w-sm text-left shadow-inner">
                                <div className="mb-4">
                                    <span className="text-xs uppercase font-bold text-gray-500 block mb-1">Nombre de Usuario</span>
                                    <div className="font-mono text-lg font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-100 dark:border-gray-700">
                                        {successData.usuario}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-500 block mb-1">Contraseña Temporal</span>
                                    <div className="font-mono text-lg font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded border border-red-100 dark:border-red-800/50">
                                        {successData.password_temporal}
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm flex items-start gap-2 text-left max-w-sm">
                                <FiInfo className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <p>Recomienda al cliente acceder a la plataforma y cambiar su contraseña inmediatamente tras el primer inicio de sesión.</p>
                            </div>

                            <button
                                onClick={onClose}
                                className="mt-4 px-8 py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition-colors"
                            >
                                Entendido, Cerrar
                            </button>
                        </div>
                    ) : (
                        // FORMULARIO DE CREACIÓN
                        <form id="formNuevaEmpresa" onSubmit={handleSubmit} className="space-y-4">

                            {/* Bloque 1: Datos Generales */}
                            <div className={`space-y-4 ${currentStep === 1 ? 'block' : 'hidden'}`}>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-700">Identidad del Cliente</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre Comercial <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            name="nombre"
                                            value={formParams.nombre}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            placeholder="Ej. Corporativo FASITLAC"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Teléfono Global</label>
                                        <input
                                            type="text"
                                            name="telefono"
                                            value={formParams.telefono}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            placeholder="Opcional"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Correo Global</label>
                                        <input
                                            type="email"
                                            name="correo"
                                            value={formParams.correo}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            placeholder="Opcional (Facturación, etc)"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Tipo de Institución <span className="text-red-500">*</span></label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setFormParams(prev => ({ ...prev, tipo_institucion: 'corporativa' }))}
                                                className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                                    formParams.tipo_institucion === 'corporativa'
                                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                                        : 'border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-500 hover:border-slate-200'
                                                }`}
                                            >
                                                <FiBriefcase className="w-5 h-5" />
                                                <div className="text-left">
                                                    <p className="font-bold text-sm">Corporativa</p>
                                                    <p className="text-xs opacity-70">Empresas y oficinas</p>
                                                </div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormParams(prev => ({ ...prev, tipo_institucion: 'educativa' }))}
                                                className={`flex items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all ${
                                                    formParams.tipo_institucion === 'educativa'
                                                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                                                        : 'border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-500 hover:border-slate-200'
                                                }`}
                                            >
                                                <FiBookOpen className="w-5 h-5" />
                                                <div className="text-left">
                                                    <p className="font-bold text-sm">Educativa</p>
                                                    <p className="text-xs opacity-70">Escuelas y universidades</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">URL del Logotipo (PNG/JPG)</label>
                                        <input
                                            type="url"
                                            name="logo"
                                            value={formParams.logo}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none font-mono text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            placeholder="https://ejemplo.com/logo.png"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bloque 2: Administrador Principal */}
                            <div className={`space-y-4 ${currentStep === 2 ? 'block' : 'hidden'}`}>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                    <FiUser /> Credenciales del Administrador
                                </h3>

                                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800/50 rounded-lg mb-4">
                                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                        Se creará automáticamente la cuenta de Administrador Base para que el cliente pueda acceder a configurar sus horarios y empleados. <strong>La contraseña predeterminada será "12345678"</strong>.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Correo Electrónico (Login) <span className="text-red-500">*</span></label>
                                        <input
                                            type="email"
                                            name="admin_correo"
                                            value={formParams.admin_correo}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            placeholder="admin@empresa.com"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Usuario (Alias) <span className="text-red-500">*</span></label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                name="admin_usuario"
                                                value={formParams.admin_usuario}
                                                onChange={handleChange}
                                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                                placeholder="Ej. admin_fasit"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleGenerateUsername}
                                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100 text-sm font-bold rounded-lg transition-colors whitespace-nowrap"
                                            >
                                                Sugerir
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bloque 3: Configuración de Licencia SaaS */}
                            <div className={`space-y-4 ${currentStep === 3 ? 'block' : 'hidden'}`}>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                    <FiShield /> Configuración de Licencia SaaS
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Límite de Trabajadores</label>
                                        <input
                                            type="number"
                                            name="limite_empleados"
                                            min="1"
                                            value={formParams.limite_empleados}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            placeholder="Ej. 50 (Vacio = Ilimitado)"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Límite de Dispositivos</label>
                                        <input
                                            type="number"
                                            name="limite_dispositivos"
                                            min="1"
                                            value={formParams.limite_dispositivos}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            placeholder="Ej. 10 (Vacio = Ilimitado)"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Fecha de Expiración</label>
                                        <input
                                            type="date"
                                            name="fecha_vencimiento"
                                            value={formParams.fecha_vencimiento}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                            placeholder="Vacio = Nunca expira"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Bloque 4: Ubicación Inicial */}
                            <div className={`space-y-4 ${currentStep === 4 ? 'block' : 'hidden'}`}>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white pb-2 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                                    <FiMapPin /> Departamento Inicial y Ubicación
                                </h3>
                                
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nombre del Departamento <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="departamento_nombre"
                                        required={currentStep === 4}
                                        value={formParams.departamento_nombre}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                        placeholder="Ej. Departamento Principal u Oficina Central"
                                    />
                                </div>

                                <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden relative" style={{ height: '350px' }}>
                                    <div ref={mapRef} className="absolute inset-0 z-0 h-full w-full" />
                                </div>
                                <div className="flex items-center justify-between">
                                    {zonas.length > 0 ? (
                                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                                            {zonas.length} zona(s) delimitada(s)
                                        </span>
                                    ) : (
                                        <span className="text-sm text-gray-500">
                                            Sin delimitar
                                        </span>
                                    )}
                                    <button 
                                        type="button" 
                                        onClick={clearMap} 
                                        className="btn-secondary flex items-center gap-2 py-1 px-3 text-sm"
                                        disabled={zonas.length === 0}
                                    >
                                        <FiRefreshCw size={14} /> Limpiar mapa
                                    </button>
                                </div>
                            </div>

                        </form>
                    )}
                </div>

                {/* Footer Modal Actions */}
                {!successData && (
                    <div className="bg-slate-50/50 dark:bg-gray-800 px-6 py-4 flex justify-between items-center border-t border-slate-100 dark:border-gray-700 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="btn-secondary mr-auto"
                        >
                            Cancelar
                        </button>
                        
                        <div className="flex gap-3">
                            {currentStep > 1 && (
                                <button
                                    type="button"
                                    onClick={handlePrev}
                                    disabled={saving}
                                    className="btn-secondary"
                                >
                                    Anterior
                                </button>
                            )}
                            
                            {currentStep < 4 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="btn-primary"
                                >
                                    Siguiente
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit} // Llamado manual al submit, el form ya no usará onSubmit
                                    disabled={saving}
                                    className={`btn-primary flex items-center justify-center gap-2 ${saving ? 'opacity-70 cursor-wait' : ''}`}
                                >
                                    {saving ? <FiActivity className="animate-spin w-5 h-5" /> : <FiSave className="w-5 h-5" />}
                                    {saving ? 'Aprovisionando...' : 'Crear y Aprovisionar'}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default NuevaEmpresaModal;

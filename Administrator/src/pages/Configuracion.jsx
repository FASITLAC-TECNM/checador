import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useConfig } from '../context/ConfigContext';
import DynamicLoader from '../components/common/DynamicLoader';
import { compressImage } from '../utils/imageUtils';
import {
    FiSave, FiUpload, FiTrash2, FiImage, FiGlobe, FiClock,
    FiAlertCircle, FiSettings, FiPhone, FiMail, FiShield,
    FiArrowUp, FiArrowDown, FiArrowRight, FiLock, FiLayout, FiChevronRight,
    FiWifi, FiBookOpen, FiBriefcase, FiSearch
} from 'react-icons/fi';
import { useTour } from '../hooks/useTour';

import { API_CONFIG } from '../config/Apiconfig';
const API_URL = API_CONFIG.BASE_URL;

// Catálogo de métodos para mapear los códigos de la BD a nombres legibles
const METODOS_AUTH = [
    { id: 'huella', label: 'Huella Digital', icon: '' },
    { id: 'rostro', label: 'Reconocimiento Facial', icon: '' },
    { id: 'codigo', label: 'Código PIN / Contraseña', icon: '' }
];

// Configuración del menú lateral (Incluye la nueva sección "Red")
const SECCIONES = [
    { id: 'general', label: 'General', icon: FiSettings, description: 'Región, idioma y preferencias globales' },
    { id: 'empresa', label: 'Empresa', icon: FiLayout, description: 'Identidad corporativa y contacto' },
    { id: 'seguridad', label: 'Seguridad', icon: FiShield, description: 'Accesos y métodos de verificación' },
    { id: 'tolerancia', label: 'Asistencia', icon: FiClock, description: 'Reglas, márgenes y tipos de salida' },
    { id: 'red', label: 'Red', icon: FiWifi, description: 'Seguridad IP y perímetros digitales' },
    { id: 'reportes', label: 'Reportes', icon: FiImage, description: 'Diseño de PDF, membretes y marca' }
];


// Componente interno para selección múltiple de empleados en excepciones
const EmployeeSelector = ({ selected, onChange, employees }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const isAll = selected.includes('*');

    const filteredEmployees = employees.filter(emp =>
        emp.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.usuario?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border-2 border-slate-100 dark:border-gray-700 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm">
                <input
                    type="checkbox"
                    checked={isAll}
                    onChange={(e) => onChange(e.target.checked ? ['*'] : [])}
                    className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 border-gray-300 cursor-pointer"
                />
                <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-tight">Aplicar a todos (*)</span>
                    <span className="text-[10px] text-gray-400 uppercase">Sin restricciones para movilidad</span>
                </div>
            </label>

            {!isAll && (
                <div className="space-y-2 animate-in fade-in duration-300">
                    {/* Buscador */}
                    <div className="relative group">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o usuario..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-gray-200"
                        />
                    </div>

                    <div className="max-h-56 overflow-y-auto border-2 border-slate-100 dark:border-gray-700 rounded-2xl p-3 space-y-1.5 bg-gray-50/50 dark:bg-gray-900/50 custom-scrollbar shadow-inner">
                        {filteredEmployees.length === 0 && (
                            <p className="text-center py-4 text-xs text-gray-400 italic">
                                {employees.length === 0 ? 'No hay empleados activos' : 'No se encontraron coincidencias'}
                            </p>
                        )}
                        {filteredEmployees.map(emp => (
                            <label key={emp.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-all border border-transparent hover:border-slate-100 dark:hover:border-gray-700 hover:shadow-sm group">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(emp.id)}
                                    onChange={(e) => {
                                        const newSelected = e.target.checked
                                            ? [...selected.filter(id => id !== '*'), emp.id]
                                            : selected.filter(id => id !== emp.id);
                                        onChange(newSelected);
                                    }}
                                    className="w-4 h-4 text-blue-500 rounded-md border-gray-300 group-hover:border-blue-400 transition-colors"
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{emp.nombre}</span>
                                    <span className="text-[9px] text-gray-400 uppercase">{emp.usuario || 'Sin usuario'}</span>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const Configuracion = () => {
    const { theme, toggleTheme } = useTheme();
    const { config, updateConfig } = useConfig(); // Consumir contexto
    // Estado para la navegación interna
    const [activeTab, setActiveTab] = useState('general');

    // Estados de datos principales
    const [empresa, setEmpresa] = useState(null);
    const [configuracion, setConfiguracion] = useState(null);
    const [tolerancia, setTolerancia] = useState(null);

    // Estados de UI
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mensaje, setMensaje] = useState(null);
    const fileInputRef = useRef(null);
    const encabInputRef = useRef(null);
    const pieInputRef = useRef(null);

    // --- ESTADOS PARA SECCIÓN RED (NUEVO) ---
    const [listaRedes, setListaRedes] = useState([]);
    const [nuevaIP, setNuevaIP] = useState('');
    const [errorIP, setErrorIP] = useState(null);

    // Formularios
    const [formEmpresa, setFormEmpresa] = useState({
        nombre: '',
        logo: '',
        telefono: '',
        correo: '',
        tipo_institucion: 'corporativa'
    });

    const [formReportes, setFormReportes] = useState({
        encabezado: { mostrar_logo: true, texto_izquierdo: '', texto_derecho: '', color_fondo: '#ffffff', color_texto: '#000000', usar_imagen: false, imagen: '' },
        pie_pagina: { texto_central: '', mostrar_numeracion: true, color_texto: '#666666', usar_imagen: false, imagen: '' },
        marca_agua: { activo: true, tipo: 'texto', texto: 'REPORTE OFICIAL', opacity: 10, imagen: '' },
        fuente: 'Helvetica',
        etiquetas_turnos: [
            { nombre: 'Turno 1', inicio: '07:00', fin: '15:00' },
            { nombre: 'Turno 2', inicio: '15:00', fin: '23:00' },
            { nombre: 'Turno 3', inicio: '23:00', fin: '07:00' }
        ]
    });

    // Inicializar formConfig con valores del contexto
    const [formConfig, setFormConfig] = useState({
        idioma: config.idioma || 'es',
        es_mantenimiento: config.es_mantenimiento || false,
        formato_fecha: config.formato_fecha || 'DD/MM/YYYY',
        formato_hora: config.formato_hora || '24',
        zona_horaria: config.zona_horaria || 'America/Mexico_City',
        intentos_maximos: 3,
        orden_credenciales: {
            huella: { prioridad: 1, activo: true },
            rostro: { prioridad: 2, activo: true },
            codigo: { prioridad: 3, activo: true }
        },
        requiere_salida: true,
        paleta_colores: { primary: '#4f46e5', secondary: '#10b981' },
        omision_red_activa: false,
        omision_red_empleados: [],
        omision_gps_activa: false,
        omision_gps_empleados: []
    });

    const [usuariosLista, setUsuariosLista] = useState([]);

    useEffect(() => {
        if (config) {
            setFormConfig(prev => ({
                ...prev,
                idioma: config.idioma,
                formato_fecha: config.formato_fecha,
                formato_hora: config.formato_hora,
                zona_horaria: config.zona_horaria,
                es_mantenimiento: config.es_mantenimiento,
                requiere_salida: config.requiere_salida ?? true,
                paleta_colores: config.paleta_colores || { primary: '#4f46e5', secondary: '#10b981' },
                omision_red_activa: config.omision_red_activa ?? prev.omision_red_activa,
                omision_red_empleados: config.omision_red_empleados || prev.omision_red_empleados,
                omision_gps_activa: config.omision_gps_activa ?? prev.omision_gps_activa,
                omision_gps_empleados: config.omision_gps_empleados || prev.omision_gps_empleados
            }));

            if (config.intervalo_bloques_minutos !== undefined) {
                setFormIntervaloBloques(config.intervalo_bloques_minutos);
            }
        }
    }, [config]);

    const [formTolerancia, setFormTolerancia] = useState({
        nombre: 'Tolerancia General',
        reglas: [],
        permite_registro_anticipado: true,
        minutos_anticipado_max: 60,
        minutos_anticipo_salida: 0,
        minutos_posterior_salida: 60,
        aplica_tolerancia_entrada: true,
        aplica_tolerancia_salida: false,
        dias_aplica: {
            lunes: true, martes: true, miercoles: true,
            jueves: true, viernes: true, sabado: false, domingo: false
        }
    });

    const [formIntervaloBloques, setFormIntervaloBloques] = useState(60);

    const cargarFormTolerancia = (tol) => {
        let parsedReglas = [];
        if (tol.reglas) {
            try {
                parsedReglas = typeof tol.reglas === 'string' ? JSON.parse(tol.reglas) : tol.reglas;
            } catch (e) {
                console.error("Error parseando reglas", e);
            }
        }

        setFormTolerancia({
            nombre: tol.nombre || 'Tolerancia General',
            reglas: parsedReglas || [],
            permite_registro_anticipado: tol.permite_registro_anticipado ?? true,
            minutos_anticipado_max: tol.minutos_anticipado_max || 60,
            minutos_anticipo_salida: tol.minutos_anticipo_salida ?? 0,
            minutos_posterior_salida: tol.minutos_posterior_salida ?? 60,
            aplica_tolerancia_entrada: tol.aplica_tolerancia_entrada ?? true,
            aplica_tolerancia_salida: tol.aplica_tolerancia_salida ?? false,
            dias_aplica: tol.dias_aplica || {
                lunes: true, martes: true, miercoles: true,
                jueves: true, viernes: true, sabado: false, domingo: false
            }
        });
        // El intervalo de bloques se maneja desde la sección de configuración, no aquí.
    };

    const handleAddRegla = () => {
        setFormTolerancia(prev => ({
            ...prev,
            reglas: [...prev.reglas, {
                id: `regla_${Date.now()}`,
                limite_minutos: 15,
                penalizacion_tipo: 'nada',
                penalizacion_valor: 0,
                aplica_acumulacion: false
            }]
        }));
    };

    const handleUpdateRegla = (index, field, value) => {
        setFormTolerancia(prev => {
            const nuevas = [...prev.reglas];
            nuevas[index] = { ...nuevas[index], [field]: value };
            return { ...prev, reglas: nuevas };
        });
    };

    const handleRemoveRegla = (index) => {
        setFormTolerancia(prev => {
            const nuevas = [...prev.reglas];
            nuevas.splice(index, 1);
            return { ...prev, reglas: nuevas };
        });
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Definición del Tour Técnico
    const tourSteps = [
        { element: '#config-sidebar', popover: { title: 'Panel de Control Maestro', description: 'Desde aquí controlas la identidad, seguridad y lógica de asistencia de toda tu empresa.', side: "right" } },
        { element: '#config-tab-tolerancia', popover: { title: 'Reglas de Tolerancia', description: 'Define márgenes de gracia para retardos, salidas tempranas y el tiempo máximo permitido para registrar asistencia antes de iniciar el turno.', side: "right" } },
        { element: '#config-tab-red', popover: { title: 'Seguridad Perimetral (IP)', description: 'Configura los segmentos de red de tus sucursales. Esto asegura que solo los equipos dentro de tus oficinas puedan registrar asistencias.', side: "right" } },
        { element: '#config-save-btn', popover: { title: 'Persistencia Global', description: 'No olvides guardar tus cambios. Estos afectarán en tiempo real a todas las terminales y apps móviles vinculadas.', side: "left" } }
    ];

    useTour('configuracion-avanzada', tourSteps, !loading);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');

            const resEmpresa = await fetch(`${API_URL}/api/empresas/mi-empresa`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataEmpresa = await resEmpresa.json();

            if (dataEmpresa.success && dataEmpresa.data) {
                const emp = dataEmpresa.data;
                setEmpresa(emp);

                setFormEmpresa({
                    nombre: emp.nombre || '',
                    logo: emp.logo || '',
                    telefono: emp.telefono || '',
                    correo: emp.correo || '',
                    tipo_institucion: emp.tipo_institucion || 'corporativa'
                });

                // La configuración ya viene incluida en la respuesta de /mi-empresa
                const cfg = emp;
                if (cfg.idioma || cfg.zona_horaria || cfg.formato_fecha) {
                    // Cuidado: cfg (emp) tiene su propio campo 'id' de empresa, 
                    // se debe poner al final para que no sea sobrescrito!
                    setConfiguracion({ ...cfg, id: emp.configuracion_id });

                    if (emp.configuracion_reportes) {
                        // Migración hacia atrás: Si existian strings, mapear a objetos
                        let etiquetasParsed = emp.configuracion_reportes.etiquetas_turnos || [
                            { nombre: 'Turno 1', inicio: '07:00', fin: '15:00' },
                            { nombre: 'Turno 2', inicio: '15:00', fin: '23:00' },
                            { nombre: 'Turno 3', inicio: '23:00', fin: '07:00' }
                        ];

                        if (typeof etiquetasParsed[0] === 'string') {
                            etiquetasParsed = etiquetasParsed.map((nom, i) => ({
                                nombre: nom,
                                inicio: ['07:00', '15:00', '23:00'][i],
                                fin: ['15:00', '23:00', '07:00'][i]
                            }));
                        }

                        setFormReportes({
                            ...emp.configuracion_reportes,
                            marca_agua: emp.configuracion_reportes.marca_agua || { activo: true, tipo: 'texto', texto: emp.nombre || 'REPORTE OFICIAL', opacity: 10, imagen: '' },
                            etiquetas_turnos: etiquetasParsed
                        });
                    }

                    // Estructura por defecto para orden_credenciales
                    let ordenCredenciales = {
                        huella: { prioridad: 1, activo: true },
                        rostro: { prioridad: 2, activo: true },
                        codigo: { prioridad: 3, activo: true }
                    };

                    setFormConfig({
                        idioma: cfg.idioma || 'es',
                        es_mantenimiento: cfg.es_mantenimiento || false,
                        formato_fecha: cfg.formato_fecha || 'DD/MM/YYYY',
                        formato_hora: cfg.formato_hora || '24',
                        zona_horaria: cfg.zona_horaria || 'America/Mexico_City',
                        intentos_maximos: cfg.intentos_maximos || 3,
                        orden_credenciales: ordenCredenciales,
                        requiere_salida: cfg.requiere_salida ?? true,
                        omision_red_activa: cfg.omision_red_activa || false,
                        omision_red_empleados: Array.isArray(cfg.omision_red_empleados) ? cfg.omision_red_empleados : [],
                        omision_gps_activa: cfg.omision_gps_activa || false,
                        omision_gps_empleados: Array.isArray(cfg.omision_gps_empleados) ? cfg.omision_gps_empleados : []
                    });

                    if (cfg.intervalo_bloques_minutos !== undefined) {
                        setFormIntervaloBloques(cfg.intervalo_bloques_minutos);
                    }

                    // Cargar segmentos de red
                    if (cfg.segmentos_red) {
                        try {
                            const parsed = typeof cfg.segmentos_red === 'string' ? JSON.parse(cfg.segmentos_red) : cfg.segmentos_red;
                            setListaRedes(Array.isArray(parsed) ? parsed : []);
                        } catch (e) { console.error(e); }
                    }
                } else if (emp.configuracion_id) {
                    // Fallback: cargar config por separado si no viene incluida
                    const resConfig = await fetch(`${API_URL}/api/configuracion/${emp.configuracion_id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const dataConfig = await resConfig.json();

                    if (dataConfig.success) {
                        const cfg2 = dataConfig.data;
                        setConfiguracion(cfg2);
                        if (cfg2.intervalo_bloques_minutos !== undefined) {
                            setFormIntervaloBloques(cfg2.intervalo_bloques_minutos);
                        }

                        let ordenCredenciales = {
                            huella: { prioridad: 1, activo: true },
                            rostro: { prioridad: 2, activo: true },
                            codigo: { prioridad: 3, activo: true }
                        };

                        if (cfg2.orden_credenciales) {
                            try {
                                const parsed = typeof cfg2.orden_credenciales === 'string'
                                    ? JSON.parse(cfg2.orden_credenciales)
                                    : cfg2.orden_credenciales;
                                if (Array.isArray(parsed)) {
                                    ordenCredenciales = {};
                                    parsed.forEach((metodo, index) => {
                                        ordenCredenciales[metodo] = { prioridad: index + 1, activo: true };
                                    });
                                } else {
                                    ordenCredenciales = parsed;
                                }
                                delete ordenCredenciales.tarjeta;
                            } catch (e) {
                                console.error("Error parseando orden_credenciales", e);
                            }
                        }

                        setFormConfig({
                            idioma: cfg2.idioma || 'es',
                            es_mantenimiento: cfg2.es_mantenimiento || false,
                            formato_fecha: cfg2.formato_fecha || 'DD/MM/YYYY',
                            formato_hora: cfg2.formato_hora || '24',
                            zona_horaria: cfg2.zona_horaria || 'America/Mexico_City',
                            intentos_maximos: cfg2.intentos_maximos || 3,
                            orden_credenciales: ordenCredenciales,
                            requiere_salida: cfg2.requiere_salida ?? true,
                            omision_red_activa: cfg2.omision_red_activa || false,
                            omision_red_empleados: Array.isArray(cfg2.omision_red_empleados) ? cfg2.omision_red_empleados : [],
                            omision_gps_activa: cfg2.omision_gps_activa || false,
                            omision_gps_empleados: Array.isArray(cfg2.omision_gps_empleados) ? cfg2.omision_gps_empleados : []
                        });

                        // Cargar segmentos de red
                        if (cfg2.segmentos_red) {
                            try {
                                const parsed = typeof cfg2.segmentos_red === 'string' ? JSON.parse(cfg2.segmentos_red) : cfg2.segmentos_red;
                                setListaRedes(Array.isArray(parsed) ? parsed : []);
                            } catch (e) { console.error(e); }
                        }
                    }
                }
            }

            // Cargar la tolerancia global
            const resTolerancia = await fetch(`${API_URL}/api/tolerancias`, { headers: { 'Authorization': `Bearer ${token}` } });
            const dataTol = await resTolerancia.json();

            if (dataTol.success && dataTol.data?.length > 0) {
                // Tomar la primera global configurada
                const general = dataTol.data[0];
                setTolerancia(general);
                cargarFormTolerancia(general);
            }

            // Cargar lista de usuarios para los selectores de omisión
            const resUsuarios = await fetch(`${API_URL}/api/usuarios?estado=activo`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const dataUsuarios = await resUsuarios.json();
            if (dataUsuarios.success) {
                setUsuariosLista(dataUsuarios.data || []);
            }

        } catch (err) {
            console.error('Error al cargar datos:', err);
            setMensaje({ tipo: 'error', texto: 'Error al cargar la configuración' });
        } finally {
            setLoading(false);
        }
    };

    // --- FUNCIONES DE UTILIDAD ---

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMensaje({ tipo: 'error', texto: 'Por favor selecciona una imagen válida' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMensaje({ tipo: 'error', texto: 'La imagen no debe superar los 5MB' });
            return;
        }

        try {
            const compressed = await compressImage(file, { maxWidth: 200, maxHeight: 200, quality: 0.7 });
            setFormEmpresa(prev => ({ ...prev, logo: compressed }));
        } catch {
            setMensaje({ tipo: 'error', texto: 'Error al procesar la imagen' });
        }
    };

    const handleRemoveLogo = () => {
        setFormEmpresa(prev => ({ ...prev, logo: '' }));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleImageUploadBanner = async (e, tipo) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setMensaje({ tipo: 'error', texto: 'Por favor selecciona una imagen válida' });
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setMensaje({ tipo: 'error', texto: 'La imagen no debe superar los 5MB' });
            return;
        }

        try {
            // Un banner suele ser muy ancho y bajo.
            const compressed = await compressImage(file, { maxWidth: 1200, maxHeight: 400, quality: 0.8 });
            setFormReportes(prev => ({
                ...prev,
                [tipo]: { ...prev[tipo], imagen: compressed }
            }));
        } catch {
            setMensaje({ tipo: 'error', texto: 'Error al procesar la imagen' });
        }
    };

    const handleRemoveBanner = (tipo) => {
        setFormReportes(prev => ({ ...prev, [tipo]: { ...prev[tipo], imagen: '' } }));
        if (tipo === 'encabezado' && encabInputRef.current) encabInputRef.current.value = '';
        if (tipo === 'pie_pagina' && pieInputRef.current) pieInputRef.current.value = '';
    };

    const handleImageUploadWatermark = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setMensaje({ tipo: 'error', texto: 'Por favor selecciona una imagen válida' });
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setMensaje({ tipo: 'error', texto: 'La imagen no debe superar los 5MB' });
            return;
        }

        try {
            const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 });
            setFormReportes(prev => ({
                ...prev,
                marca_agua: { ...prev.marca_agua, imagen: compressed }
            }));
        } catch {
            setMensaje({ tipo: 'error', texto: 'Error al procesar la imagen de marca de agua' });
        }
    };

    const handleRemoveWatermark = () => {
        setFormReportes(prev => ({ ...prev, marca_agua: { ...prev.marca_agua, imagen: '' } }));
    };

    // --- FUNCIONES PARA MÉTODOS DE AUTENTICACIÓN ---

    // Obtener métodos ordenados por prioridad
    const getMetodosOrdenados = () => {
        return Object.entries(formConfig.orden_credenciales)
            .map(([id, config]) => ({ id, ...config }))
            .sort((a, b) => a.prioridad - b.prioridad);
    };

    // Toggle activar/desactivar método
    const toggleMetodo = (metodoId) => {
        setFormConfig(prev => ({
            ...prev,
            orden_credenciales: {
                ...prev.orden_credenciales,
                [metodoId]: {
                    ...prev.orden_credenciales[metodoId],
                    activo: !prev.orden_credenciales[metodoId].activo
                }
            }
        }));
    };

    // Mover prioridad de método
    const moveMetodo = (metodoId, direction) => {
        const ordenados = getMetodosOrdenados();
        const index = ordenados.findIndex(m => m.id === metodoId);

        if (direction === 'up' && index > 0) {
            const anterior = ordenados[index - 1];
            setFormConfig(prev => ({
                ...prev,
                orden_credenciales: {
                    ...prev.orden_credenciales,
                    [metodoId]: { ...prev.orden_credenciales[metodoId], prioridad: anterior.prioridad },
                    [anterior.id]: { ...prev.orden_credenciales[anterior.id], prioridad: prev.orden_credenciales[metodoId].prioridad }
                }
            }));
        } else if (direction === 'down' && index < ordenados.length - 1) {
            const siguiente = ordenados[index + 1];
            setFormConfig(prev => ({
                ...prev,
                orden_credenciales: {
                    ...prev.orden_credenciales,
                    [metodoId]: { ...prev.orden_credenciales[metodoId], prioridad: siguiente.prioridad },
                    [siguiente.id]: { ...prev.orden_credenciales[siguiente.id], prioridad: prev.orden_credenciales[metodoId].prioridad }
                }
            }));
        }
    };

    // --- NUEVAS FUNCIONES PARA SECCIÓN RED ---

    const validarFormatoIP = (ip) => {
        // Regex para validar IPv4 con sufijo CIDR (ej: 192.168.1.5/24)
        const regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/([0-9]|[1-2][0-9]|3[0-2])$/;
        return regex.test(ip);
    };

    const handleAgregarRed = () => {
        setErrorIP(null);

        if (!nuevaIP.trim()) return;

        if (!validarFormatoIP(nuevaIP)) {
            setErrorIP('Formato inválido. Ejemplo requerido: 192.168.1.1/24');
            return;
        }

        if (listaRedes.includes(nuevaIP)) {
            setErrorIP('Esta dirección IP ya ha sido agregada.');
            return;
        }

        setListaRedes([...listaRedes, nuevaIP]);
        setNuevaIP(''); // Limpiar input
    };

    const handleEliminarRed = (ipToDelete) => {
        setListaRedes(prev => prev.filter(ip => ip !== ipToDelete));
    };

    // --- GUARDADO ---

    const handleSaveAll = async () => {
        if (!formEmpresa.nombre.trim()) {
            setMensaje({ tipo: 'error', texto: 'El nombre de la empresa es requerido' });
            return;
        }

        // Validación de Horarios de Turnos (Sin solapamientos)
        const checkOverlap = (t1_s, t1_f, t2_s, t2_f) => {
            const getMins = (timeObj) => {
                if (!timeObj) return 0;
                const [h, m] = timeObj.split(':').map(Number);
                return h * 60 + m;
            };

            let s1 = getMins(t1_s), f1 = getMins(t1_f);
            let s2 = getMins(t2_s), f2 = getMins(t2_f);

            // Si cruza la medianoche (ej 23:00 a 07:00), f1 es al día siguiente
            if (f1 < s1) f1 += 24 * 60;
            if (f2 < s2) f2 += 24 * 60;

            // Revisamos solapes normales
            if (s1 < f2 && s2 < f1) return true;

            // Revisamos si el cruce de medianoche provoca solape de ciclo (Día 2 envuelve)
            if (f1 > 24 * 60) {
                let wrap_f1 = f1 - (24 * 60);
                if (s2 < wrap_f1) return true; // El día 2 toca al día 1 cruzado
            }
            if (f2 > 24 * 60) {
                let wrap_f2 = f2 - (24 * 60);
                if (s1 < wrap_f2) return true;
            }

            return false;
        };

        const turnos = formReportes.etiquetas_turnos || [];
        for (let i = 0; i < turnos.length; i++) {
            for (let j = i + 1; j < turnos.length; j++) {
                if (checkOverlap(turnos[i].inicio, turnos[i].fin, turnos[j].inicio, turnos[j].fin)) {
                    setMensaje({ tipo: 'error', texto: `El horario del ${turnos[i].nombre} se solapa con el ${turnos[j].nombre}. Verifica la disponibilidad.` });
                    setActiveTab('reportes');
                    return;
                }
            }
            if (!turnos[i].inicio || !turnos[i].fin) {
                setMensaje({ tipo: 'error', texto: `El turno ${turnos[i].nombre} está incompleto (Falta hora inicio/fin).` });
                setActiveTab('reportes');
                return;
            }
        }

        try {
            setSaving(true);
            setMensaje(null);
            const token = localStorage.getItem('auth_token');

            // Guardar Empresa (usando endpoint de tenant, no SaaS Owner)
            const resEmpresa = await fetch(`${API_URL}/api/empresas/mi-empresa`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    nombre: formEmpresa.nombre,
                    logo: formEmpresa.logo || null,
                    telefono: formEmpresa.telefono,
                    correo: formEmpresa.correo,
                    tipo_institucion: formEmpresa.tipo_institucion,
                    configuracion_reportes: formReportes
                })
            });
            const dataEmpresa = await resEmpresa.json();
            if (!dataEmpresa.success) throw new Error('Error al actualizar empresa');

            // Guardar Configuración
            if (configuracion?.id) {
                const resConfig = await fetch(`${API_URL}/api/configuracion/${configuracion.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ ...formConfig, segmentos_red: listaRedes, intervalo_bloques_minutos: formIntervaloBloques, requiere_salida: formConfig.requiere_salida })
                });
                const dataConfig = await resConfig.json();
                if (!dataConfig.success) throw new Error('Error al actualizar configuración');

                // Actualizar contexto global con TODOS los cambios para evitar resets visuales
                updateConfig({
                    idioma: formConfig.idioma,
                    formato_fecha: formConfig.formato_fecha,
                    formato_hora: formConfig.formato_hora,
                    zona_horaria: formConfig.zona_horaria,
                    es_mantenimiento: formConfig.es_mantenimiento,
                    requiere_salida: formConfig.requiere_salida, // Crucial para que no se reinicie
                    intervalo_bloques_minutos: formIntervaloBloques,
                    nombreEmpresa: formEmpresa.nombre,
                    logoEmpresa: formEmpresa.logo,
                    paleta_colores: formConfig.paleta_colores,
                    omision_red_activa: formConfig.omision_red_activa,
                    omision_red_empleados: formConfig.omision_red_empleados,
                    omision_gps_activa: formConfig.omision_gps_activa,
                    omision_gps_empleados: formConfig.omision_gps_empleados
                });
            }

            // Guardar Tolerancia actual
            const tokenTol = localStorage.getItem('auth_token');

            // Determinar si es crear o actualizar
            if (tolerancia?.id) {
                // UPDATE
                const resTol = await fetch(`${API_URL}/api/tolerancias/${tolerancia.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenTol}` },
                    body: JSON.stringify(formTolerancia)
                });
                const dataTol = await resTol.json();
                if (!dataTol.success) throw new Error(dataTol.message || 'Error al actualizar opciones de tolerancia');

                // Actualizar local
                setTolerancia(dataTol.data);
            } else {
                // CREATE (si no existiera ninguna configurada)
                const payload = {
                    ...formTolerancia,
                    nombre: 'Tolerancia Global'
                };

                const resTol = await fetch(`${API_URL}/api/tolerancias`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenTol}` },
                    body: JSON.stringify(payload)
                });
                const dataTol = await resTol.json();
                if (!dataTol.success) throw new Error(dataTol.message || 'Error al crear tolerancia');

                // Asignar local
                setTolerancia(dataTol.data);
            }

            // Se eliminó la nota de 'no se guarda listaRedes' porque ya se añadió al payload formConfig arriba
            setMensaje({ tipo: 'success', texto: 'Configuración guardada correctamente' });
            setTimeout(() => setMensaje(null), 3000);

        } catch (err) {
            console.error('Error al guardar:', err);
            setMensaje({ tipo: 'error', texto: err.message || 'Error al guardar la configuración' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <DynamicLoader text="Cargando configuración..." />;
    }

    const currentSection = SECCIONES.find(s => s.id === activeTab);

    return (
        <div className="w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

            {/* Contenedor Principal Flex */}
            <div className="w-full flex flex-col lg:flex-row gap-8">

                {/* --- SIDEBAR DE CONFIGURACIÓN --- */}
                <aside id="config-sidebar" className="lg:w-72 flex-shrink-0">
                    <div className="card p-0 overflow-hidden sticky top-6 transition-colors duration-200">
                        <div className="p-4 border-b border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-900">
                            <h2 className="font-bold text-gray-700 dark:text-gray-200">Ajustes</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Configuración del sistema</p>
                        </div>
                        <nav className="p-2 space-y-1">
                            {SECCIONES.map((seccion) => {
                                const Icon = seccion.icon;
                                const isActive = activeTab === seccion.id;
                                return (
                                    <button
                                        key={seccion.id}
                                        id={`config-tab-${seccion.id}`}
                                        onClick={() => setActiveTab(seccion.id)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 shadow-sm'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                            <span>{seccion.label}</span>
                                        </div>
                                        {isActive && <FiChevronRight className="w-4 h-4 text-blue-500" />}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* --- ÁREA DE CONTENIDO PRINCIPAL --- */}
                <main className="flex-1 min-w-0">
                    {/* Header de la sección */}
                    <div className="card rounded-b-none border-b-0 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-200 shadow-none">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                {currentSection.icon && <currentSection.icon className="w-6 h-6 text-gray-400" />}
                                {currentSection.label}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">{currentSection.description}</p>
                        </div>

                        <button
                            id="config-save-btn"
                            onClick={handleSaveAll}
                            disabled={saving}
                            className="btn-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <DynamicLoader size="tiny" layout="row" />
                            ) : (
                                <FiSave className="w-4 h-4" />
                            )}
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>

                    {/* Mensajes de Feedback */}
                    {mensaje && (
                        <div className={`px-6 py-3 border-x border-gray-200 ${mensaje.tipo === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <FiAlertCircle className="w-4 h-4" />
                                {mensaje.texto}
                            </div>
                        </div>
                    )}

                    {/* Contenido del Formulario */}
                    <div className="card rounded-t-none p-6 transition-colors duration-200 shadow-none border-t border-slate-100 dark:border-gray-700">

                        {/* SECCIÓN: EMPRESA */}
                        {activeTab === 'empresa' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Logo de la empresa</label>
                                    <div className="flex items-start gap-6">
                                        <div className="flex-shrink-0">
                                            {formEmpresa.logo ? (
                                                <div className="relative group">
                                                    <img src={formEmpresa.logo} alt="Logo" className="w-32 h-32 rounded-xl object-cover border-2 border-gray-200 shadow-sm" />
                                                    <button type="button" onClick={handleRemoveLogo}
                                                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-sm">
                                                        <FiTrash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-700">
                                                    <FiImage className="w-8 h-8 text-gray-400" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="logo-upload" />
                                            <label htmlFor="logo-upload"
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer transition-colors shadow-sm">
                                                <FiUpload className="w-4 h-4" />
                                                Subir imagen
                                            </label>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Se recomienda una imagen cuadrada (PNG, JPG).<br />
                                                Tamaño máximo: 2MB.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre de la organización</label>
                                        <input type="text" id="nombre" value={formEmpresa.nombre}
                                            onChange={(e) => setFormEmpresa(prev => ({ ...prev, nombre: e.target.value }))}
                                            className="input"
                                            placeholder="Ingresa el nombre oficial" />
                                    </div>

                                    <div>
                                        <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <span className="flex items-center gap-2"><FiPhone className="w-4 h-4" /> Teléfono de contacto</span>
                                        </label>
                                        <input type="tel" id="telefono" value={formEmpresa.telefono}
                                            onChange={(e) => setFormEmpresa(prev => ({ ...prev, telefono: e.target.value }))}
                                            className="input"
                                            placeholder="+52 55 1234 5678" />
                                    </div>

                                    <div>
                                        <label htmlFor="correo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <span className="flex items-center gap-2"><FiMail className="w-4 h-4" /> Correo electrónico</span>
                                        </label>
                                        <input type="email" id="correo" value={formEmpresa.correo}
                                            onChange={(e) => setFormEmpresa(prev => ({ ...prev, correo: e.target.value }))}
                                            className="input"
                                            placeholder="contacto@empresa.com" />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tipo de Institución</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setFormEmpresa(prev => ({ ...prev, tipo_institucion: 'corporativa' }))}
                                                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${formEmpresa.tipo_institucion === 'corporativa'
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                                    : 'border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:border-slate-200'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${formEmpresa.tipo_institucion === 'corporativa' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                                    <FiBriefcase className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-sm">Corporativa</p>
                                                    <p className="text-xs opacity-70">Empresas, corporativos y oficinas</p>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setFormEmpresa(prev => ({ ...prev, tipo_institucion: 'educativa' }))}
                                                className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${formEmpresa.tipo_institucion === 'educativa'
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                                                    : 'border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 hover:border-slate-200'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${formEmpresa.tipo_institucion === 'educativa' ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                                    <FiBookOpen className="w-5 h-5" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-sm">Educativa</p>
                                                    <p className="text-xs opacity-70">Escuelas, colegios y universidades</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN: SEGURIDAD */}
                        {activeTab === 'seguridad' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Políticas de Acceso</h3>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                <span className="flex items-center gap-2"><FiLock className="w-4 h-4" /> Intentos máximos de inicio de sesión</span>
                                            </label>
                                            <input type="number" min="1" max="10" value={formConfig.intentos_maximos}
                                                onChange={(e) => setFormConfig(prev => ({ ...prev, intentos_maximos: parseInt(e.target.value) }))}
                                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Ej. 3" />
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bloquea temporalmente la cuenta tras fallos consecutivos.</p>
                                        </div>

                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="pt-0.5">
                                                    <input type="checkbox" id="mantenimiento" checked={formConfig.es_mantenimiento}
                                                        onChange={(e) => setFormConfig(prev => ({ ...prev, es_mantenimiento: e.target.checked }))}
                                                        className="w-5 h-5 text-yellow-600 border-gray-300 rounded focus:ring-2 focus:ring-yellow-500" />
                                                </div>
                                                <div>
                                                    <label htmlFor="mantenimiento" className="block text-sm font-medium text-gray-900 dark:text-yellow-100 mb-1">
                                                        Modo Mantenimiento
                                                    </label>
                                                    <p className="text-xs text-gray-600 dark:text-yellow-200/70 leading-relaxed">
                                                        Al activar esta opción, <strong>solo los administradores</strong> podrán acceder al sistema. Los empleados verán una pantalla de "En Mantenimiento".
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Prioridad de Autenticación</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Activa o desactiva los métodos de validación y define su prioridad para el reloj checador.
                                        </p>

                                        <div className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
                                            {getMetodosOrdenados().map((metodo, index) => {
                                                const metodoInfo = METODOS_AUTH.find(m => m.id === metodo.id) || { label: metodo.id, icon: '' };
                                                const ordenados = getMetodosOrdenados();

                                                return (
                                                    <div
                                                        key={metodo.id}
                                                        className={`flex items-center justify-between p-5 rounded-2xl border shadow-lg transition-all transform hover:scale-[1.01] ${metodo.activo
                                                            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                                                            : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 opacity-60'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-5">
                                                            {/* Número de prioridad con gradiente */}
                                                            <span className={`flex items-center justify-center w-10 h-10 rounded-xl text-sm font-black shadow-inner ${metodo.activo
                                                                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                                                                : 'bg-gray-200 text-gray-500'
                                                                }`}>
                                                                {index + 1}
                                                            </span>

                                                            {/* Icono y nombre */}
                                                            <div className="flex flex-col">
                                                                <span className={`text-sm font-bold ${metodo.activo ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 line-through'}`}>
                                                                    {metodoInfo.label}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 uppercase tracking-tighter">Prioridad de acceso</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4">
                                                            {/* Toggle con estilo moderno */}
                                                            <button
                                                                onClick={() => toggleMetodo(metodo.id)}
                                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${metodo.activo ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                                                    }`}
                                                            >
                                                                <span
                                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xl transition-all duration-300 ${metodo.activo ? 'translate-x-6' : 'translate-x-1'
                                                                        }`}
                                                                />
                                                            </button>

                                                            {/* Botones de prioridad estilizados */}
                                                            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                                                <button
                                                                    onClick={() => moveMetodo(metodo.id, 'up')}
                                                                    disabled={index === 0}
                                                                    className="p-1.5 text-gray-500 hover:bg-white dark:hover:bg-gray-600 rounded-md disabled:opacity-20 transition-all"
                                                                >
                                                                    <FiArrowUp className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => moveMetodo(metodo.id, 'down')}
                                                                    disabled={index === ordenados.length - 1}
                                                                    className="p-1.5 text-gray-500 hover:bg-white dark:hover:bg-gray-600 rounded-md disabled:opacity-20 transition-all"
                                                                >
                                                                    <FiArrowDown className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <p className="text-xs text-gray-500 mt-2">
                                            Los métodos desactivados no se solicitarán. La prioridad determina el orden de verificación.
                                        </p>
                                    </div>
                                </div>

                                {/* NUEVA SECCIÓN: EXCEPCIONES DE MOVILIDAD (Bypass de Red/GPS) */}
                                <div className="space-y-6 pt-8 border-t border-slate-100 dark:border-gray-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 dark:from-indigo-900/10 dark:to-blue-900/10 p-8 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/30">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl shadow-sm text-indigo-600 dark:text-indigo-400">
                                                <FiShield className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight uppercase">Excepciones de Movilidad</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Configura qué empleados pueden omitir validaciones perimetrales en la app móvil.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                            {/* Panel Omisión RED */}
                                            <div className="space-y-6 bg-white/40 dark:bg-black/20 p-6 rounded-2xl border border-white/60 dark:border-gray-800 backdrop-blur-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <FiWifi className={`w-5 h-5 ${formConfig.omision_red_activa ? 'text-blue-500' : 'text-gray-400'}`} />
                                                        <label className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase">Omitir Validación de Red</label>
                                                    </div>
                                                    <button
                                                        onClick={() => setFormConfig(prev => ({ ...prev, omision_red_activa: !prev.omision_red_activa }))}
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 shadow-inner ${formConfig.omision_red_activa ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                    >
                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xl transition-all duration-300 ${formConfig.omision_red_activa ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-gray-500 leading-relaxed italic">Permite sincronizar asistencias sin estar conectado a una red autorizada.</p>
                                                
                                                {formConfig.omision_red_activa && (
                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <EmployeeSelector
                                                            selected={formConfig.omision_red_empleados}
                                                            onChange={(ids) => setFormConfig(prev => ({ ...prev, omision_red_empleados: ids }))}
                                                            employees={usuariosLista}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Panel Omisión GPS */}
                                            <div className="space-y-6 bg-white/40 dark:bg-black/20 p-6 rounded-2xl border border-white/60 dark:border-gray-800 backdrop-blur-sm">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <FiGlobe className={`w-5 h-5 ${formConfig.omision_gps_activa ? 'text-indigo-500' : 'text-gray-400'}`} />
                                                        <label className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase">Omitir Validación GPS</label>
                                                    </div>
                                                    <button
                                                        onClick={() => setFormConfig(prev => ({ ...prev, omision_gps_activa: !prev.omision_gps_activa }))}
                                                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 shadow-inner ${formConfig.omision_gps_activa ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                                    >
                                                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-xl transition-all duration-300 ${formConfig.omision_gps_activa ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                </div>
                                                <p className="text-[11px] text-gray-500 leading-relaxed italic">Permite sincronizar asistencias fuera del polígono o radio del departamento.</p>

                                                {formConfig.omision_gps_activa && (
                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <EmployeeSelector
                                                            selected={formConfig.omision_gps_empleados}
                                                            onChange={(ids) => setFormConfig(prev => ({ ...prev, omision_gps_empleados: ids }))}
                                                            employees={usuariosLista}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN: GENERAL */}
                        {activeTab === 'general' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Apariencia</h3>

                                    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
                                            <div>
                                                <h4 className="font-medium text-gray-900 dark:text-gray-100">Modo Oscuro</h4>
                                                <p className="text-xs text-gray-500 mt-1">Cambia la apariencia de la interfaz a colores oscuros.</p>
                                            </div>
                                            <button
                                                onClick={toggleTheme}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-200'
                                                    }`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                />
                                            </button>
                                        </div>
                                        <div className="pt-4">
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Colores Corporativos</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Primario (Botones, Acentos)</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={formConfig.paleta_colores?.primary || '#4f46e5'}
                                                            onChange={(e) => setFormConfig(prev => ({ ...prev, paleta_colores: { ...prev.paleta_colores, primary: e.target.value } }))}
                                                            className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                                                        />
                                                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400 uppercase">{formConfig.paleta_colores?.primary || '#4f46e5'}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Secundario (Highlights)</label>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="color"
                                                            value={formConfig.paleta_colores?.secondary || '#10b981'}
                                                            onChange={(e) => setFormConfig(prev => ({ ...prev, paleta_colores: { ...prev.paleta_colores, secondary: e.target.value } }))}
                                                            className="w-10 h-10 rounded cursor-pointer border-0 p-0"
                                                        />
                                                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400 uppercase">{formConfig.paleta_colores?.secondary || '#10b981'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider pt-4">Regionalización</h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <span className="flex items-center gap-2"><FiGlobe className="w-4 h-4" /> Idioma del Sistema</span>
                                        </label>
                                        <select value={formConfig.idioma}
                                            onChange={(e) => setFormConfig(prev => ({ ...prev, idioma: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500">
                                            <option value="es">Español</option>
                                            <option value="en">English</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Zona Horaria</label>
                                        <select value={formConfig.zona_horaria}
                                            onChange={(e) => setFormConfig(prev => ({ ...prev, zona_horaria: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500">
                                            <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                                            <option value="America/Cancun">Cancún (GMT-5)</option>
                                            <option value="America/Tijuana">Tijuana (GMT-8)</option>
                                            <option value="America/Los_Angeles">Los Ángeles (GMT-8)</option>
                                            <option value="America/New_York">Nueva York (GMT-5)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Formatos</h3>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Formato de Fecha</label>
                                        <select value={formConfig.formato_fecha}
                                            onChange={(e) => setFormConfig(prev => ({ ...prev, formato_fecha: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500">
                                            <option value="DD/MM/YYYY">DD/MM/YYYY (Ej: 31/12/2023)</option>
                                            <option value="MM/DD/YYYY">MM/DD/YYYY (Ej: 12/31/2023)</option>
                                            <option value="YYYY/MM/DD">YYYY/MM/DD (Ej: 2023/12/31)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            <span className="flex items-center gap-2"><FiClock className="w-4 h-4" /> Formato de Hora</span>
                                        </label>
                                        <select value={formConfig.formato_hora}
                                            onChange={(e) => setFormConfig(prev => ({ ...prev, formato_hora: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500">
                                            <option value="12">12 horas (AM/PM)</option>
                                            <option value="24">24 horas (Militar)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN: TOLERANCIA */}
                        {activeTab === 'tolerancia' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">

                                <div className="flex justify-between items-center mb-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg">
                                            <FiClock className="text-blue-600 dark:text-blue-300 w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">Reglas de Tolerancia Global</h3>
                                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                                Estas políticas se aplicarán uniformemente a toda la empresa.
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Reglas de Asistencia y Retardos</h3>
                                            <p className="text-xs text-gray-500 mt-1">Define los rangos de tiempo y sus consecuencias asociadas.</p>
                                        </div>
                                        <button
                                            onClick={handleAddRegla}
                                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold shadow-sm transition-all"
                                        >
                                            <FiChevronRight className="w-4 h-4 rotate-90" /> Nueva Regla
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {(formTolerancia.reglas || []).map((regla, index) => (
                                            <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xl relative overflow-hidden group">
                                                {/* Indicador lateral de color */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${index === 0 ? 'bg-green-500' :
                                                    index === 1 ? 'bg-yellow-500' :
                                                        index === 2 ? 'bg-orange-500' : 'bg-red-500'
                                                    }`} />

                                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                                    {/* Badge de Orden */}
                                                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                                                        <span className="text-xs font-bold text-gray-400 uppercase">R{index + 1}</span>
                                                    </div>

                                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Clasificación</label>
                                                            <div className="relative">
                                                                <input type="text" value={regla.id}
                                                                    onChange={(e) => handleUpdateRegla(index, 'id', e.target.value)}
                                                                    className="w-full pl-3 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500"
                                                                    placeholder="Ej: Puntual" />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Hasta (minutos)</label>
                                                            <div className="relative">
                                                                <input type="number" min="0" value={regla.limite_minutos ?? 0}
                                                                    onChange={(e) => handleUpdateRegla(index, 'limite_minutos', parseInt(e.target.value) || 0)}
                                                                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500" />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Acción</label>
                                                            <select value={regla.penalizacion_tipo || 'nada'}
                                                                onChange={(e) => {
                                                                    handleUpdateRegla(index, 'penalizacion_tipo', e.target.value);
                                                                    if (e.target.value === 'acumulacion') {
                                                                        handleUpdateRegla(index, 'aplica_acumulacion', true);
                                                                    } else {
                                                                        handleUpdateRegla(index, 'aplica_acumulacion', false);
                                                                    }
                                                                }}
                                                                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500">
                                                                <option value="nada">Permitir registro</option>
                                                                <option value="acumulacion">Acumular falta</option>
                                                            </select>
                                                        </div>

                                                        {regla.penalizacion_tipo === 'acumulacion' && (
                                                            <div className="space-y-1.5 animate-in fade-in zoom-in-95 duration-200">
                                                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Límite conteo</label>
                                                                <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded-lg pr-3">
                                                                    <input type="number" min="1" value={regla.penalizacion_valor || 0}
                                                                        onChange={(e) => handleUpdateRegla(index, 'penalizacion_valor', parseInt(e.target.value) || 0)}
                                                                        className="w-full px-3 py-2 bg-transparent border-none text-sm font-bold text-gray-700 dark:text-gray-200 focus:ring-0" />
                                                                    <span className="text-[10px] font-bold text-blue-500 uppercase">veces</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-shrink-0 flex items-center gap-2">
                                                        <button
                                                            onClick={() => handleRemoveRegla(index)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                            title="Eliminar regla"
                                                        >
                                                            <FiTrash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        {(!formTolerancia.reglas || formTolerancia.reglas.length === 0) && (
                                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-2xl border border-dashed border-yellow-200 dark:border-yellow-700/50 text-center">
                                                <FiAlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-3" />
                                                <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-200">Sin reglas configuradas</h4>
                                                <p className="text-xs text-yellow-700 dark:text-yellow-300/70 mt-1 max-w-sm mx-auto">
                                                    El sistema usará la lógica predeterminada: 0-10m Puntual, 11-20m Retardo A, etc.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6">Lógica de Asistencia</h3>
                                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-800/50 mb-8">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="space-y-1">
                                                <h4 className="text-base font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                                    <FiArrowRight className="text-blue-500" />
                                                    ¿Requerir registro de salida?
                                                </h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl">
                                                    Si se desactiva, el bloque se considerará completado al marcar la entrada. Ideal para empresas con horarios flexibles o salidas no controladas.
                                                </p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={formConfig.requiere_salida}
                                                    onChange={(e) => setFormConfig(prev => ({ ...prev, requiere_salida: e.target.checked }))}
                                                    className="sr-only peer" />
                                                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>
                                    </div>

                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Límites de Registro (Ventanas de Tiempo)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                                    <FiArrowUp className="text-blue-600 dark:text-blue-400 w-5 h-5" />
                                                </div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Anticipación entrada (min)</label>
                                            </div>
                                            <input type="number" min="0" max="180" value={formTolerancia.minutos_anticipado_max ?? 0}
                                                onChange={(e) => setFormTolerancia(prev => ({ ...prev, minutos_anticipado_max: parseInt(e.target.value) || 0 }))}
                                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all font-bold"
                                                disabled={!formTolerancia.permite_registro_anticipado} />
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed italic">Margen permitido antes de la hora oficial.</p>
                                        </div>

                                        {formConfig.requiere_salida && (
                                            <>
                                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow animate-in slide-in-from-right-4 duration-300">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                                                            <FiArrowDown className="text-purple-600 dark:text-purple-400 w-5 h-5" />
                                                        </div>
                                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Anticipación salida (min)</label>
                                                    </div>
                                                    <input type="number" min="0" max="180" value={formTolerancia.minutos_anticipo_salida ?? 0}
                                                        onChange={(e) => setFormTolerancia(prev => ({ ...prev, minutos_anticipo_salida: parseInt(e.target.value) || 0 }))}
                                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed italic">Margen permitido antes de la hora oficial de salida.</p>
                                                </div>

                                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow animate-in slide-in-from-right-4 duration-400">
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                                                            <FiClock className="text-orange-600 dark:text-orange-400 w-5 h-5" />
                                                        </div>
                                                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Posterior a salida (min)</label>
                                                    </div>
                                                    <input type="number" min="0" max="1440" value={formTolerancia.minutos_posterior_salida ?? 0}
                                                        onChange={(e) => setFormTolerancia(prev => ({ ...prev, minutos_posterior_salida: parseInt(e.target.value) || 0 }))}
                                                        className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed italic">Tiempo límite para marcar salida. Después genera 'Salida no cumplida'.</p>
                                                </div>
                                            </>
                                        )}

                                        <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                                    <FiLayout className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                                                </div>
                                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-200">Intervalo de Bloques (min)</label>
                                            </div>
                                            <input type="number" min="0" value={formIntervaloBloques}
                                                onChange={(e) => setFormIntervaloBloques(parseInt(e.target.value) || 0)}
                                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 font-bold" />
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed italic">Margen para unir turnos seguidos en un solo bloque operativo.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div>
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Comportamiento</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                                <input type="checkbox" id="anticipado" checked={formTolerancia.permite_registro_anticipado}
                                                    onChange={(e) => setFormTolerancia(prev => ({ ...prev, permite_registro_anticipado: e.target.checked }))}
                                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                                                <label htmlFor="anticipado" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer w-full">Permitir registro anticipado</label>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Días de Aplicación</h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].map(dia => (
                                                <div key={dia} className="flex items-center gap-2">
                                                    <input type="checkbox" id={dia} checked={formTolerancia.dias_aplica[dia]}
                                                        onChange={(e) => setFormTolerancia(prev => ({
                                                            ...prev,
                                                            dias_aplica: { ...prev.dias_aplica, [dia]: e.target.checked }
                                                        }))}
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500" />
                                                    <label htmlFor={dia} className="text-sm text-gray-700 dark:text-gray-300 capitalize cursor-pointer">{dia}</label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN: RED / MALLA (NUEVO) */}
                        {activeTab === 'red' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Configuración de Nodos</h3>

                                    {/* Input de IP */}
                                    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600 mb-6">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Agregar nuevo punto de acceso (CIDR)
                                        </label>
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <input
                                                    type="text"
                                                    value={nuevaIP}
                                                    onChange={(e) => setNuevaIP(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAgregarRed()}
                                                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 outline-none transition-all font-mono text-sm dark:text-white ${errorIP ? 'border-red-300 focus:ring-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-700' : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-800'
                                                        }`}
                                                    placeholder="Ej: 192.168.10.5/24"
                                                />
                                                {errorIP && (
                                                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                                                        <FiAlertCircle className="w-3 h-3" /> {errorIP}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={handleAgregarRed}
                                                className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors shadow-sm flex-shrink-0"
                                            >
                                                Agregar
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                                            El sistema validará que la IP tenga el formato correcto y su máscara de subred (0-32).
                                        </p>
                                    </div>

                                    {/* Lista de IPs */}
                                    <div>
                                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-between">
                                            <span>Nodos activos en la malla</span>
                                            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                                {listaRedes.length} Total
                                            </span>
                                        </h4>

                                        {listaRedes.length === 0 ? (
                                            <div className="text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800">
                                                <FiWifi className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                                <p className="text-gray-500 dark:text-gray-400 text-sm">No hay puntos de red configurados aún.</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {listaRedes.map((ip, index) => (
                                                    <div key={index} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm group hover:border-blue-300 dark:hover:border-blue-500 transition-all">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                                                                <FiGlobe className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                            </div>
                                                            <span className="font-mono text-sm text-gray-700 dark:text-gray-200">{ip}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleEliminarRed(ip)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                            title="Eliminar nodo"
                                                        >
                                                            <FiTrash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECCIÓN: REPORTES (NUEVO) */}
                        {activeTab === 'reportes' && (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {/* Zona de Formulario (Izquierda) */}
                                <div className="space-y-8">
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Diseño de Encabezado</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">Usar Banner de Imagen:</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={formReportes.encabezado.usar_imagen}
                                                        onChange={(e) => setFormReportes(prev => ({ ...prev, encabezado: { ...prev.encabezado, usar_imagen: e.target.checked } }))}
                                                        className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in zoom-in-95">
                                            {formReportes.encabezado.usar_imagen ? (
                                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        ref={encabInputRef}
                                                        onChange={(e) => handleImageUploadBanner(e, 'encabezado')}
                                                    />

                                                    {formReportes.encabezado.imagen ? (
                                                        <div className="relative w-full aspect-[4/1] bg-gray-100 rounded-lg overflow-hidden group">
                                                            <img src={formReportes.encabezado.imagen} alt="Banner Encabezado" className="w-full h-full object-contain" />
                                                            <button
                                                                onClick={() => handleRemoveBanner('encabezado')}
                                                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Quitar imagen"
                                                            >
                                                                <FiTrash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center cursor-pointer" onClick={() => encabInputRef.current?.click()}>
                                                            <FiUpload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Subir imagen de banner (Header)</p>
                                                            <p className="text-xs text-gray-500 mt-1">Recomendado: 1200x200px. Max 5MB.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="col-span-full">
                                                        <label className="flex items-center gap-3 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={formReportes.encabezado.mostrar_logo}
                                                                onChange={(e) => setFormReportes(prev => ({ ...prev, encabezado: { ...prev.encabezado, mostrar_logo: e.target.checked } }))}
                                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                            />
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mostrar Logo de la Empresa en el encabezado</span>
                                                        </label>
                                                    </div>

                                                    <div className="col-span-1">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Texto Superior Izquierdo</label>
                                                        <input
                                                            type="text"
                                                            value={formReportes.encabezado.texto_izquierdo}
                                                            onChange={(e) => setFormReportes(prev => ({ ...prev, encabezado: { ...prev.encabezado, texto_izquierdo: e.target.value } }))}
                                                            placeholder="Ej: Instituto Tecnológico..."
                                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                                                        />
                                                    </div>

                                                    <div className="col-span-1">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Texto Superior Derecho</label>
                                                        <input
                                                            type="text"
                                                            value={formReportes.encabezado.texto_derecho}
                                                            onChange={(e) => setFormReportes(prev => ({ ...prev, encabezado: { ...prev.encabezado, texto_derecho: e.target.value } }))}
                                                            placeholder="Ej: Depto. Recursos Humanos"
                                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                                                        />
                                                    </div>

                                                    <div className="col-span-1">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color de Fondo Header</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={formReportes.encabezado.color_fondo}
                                                                onChange={(e) => setFormReportes(prev => ({ ...prev, encabezado: { ...prev.encabezado, color_fondo: e.target.value } }))}
                                                                className="h-10 w-14 rounded cursor-pointer border-0 p-0"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={formReportes.encabezado.color_fondo}
                                                                onChange={(e) => setFormReportes(prev => ({ ...prev, encabezado: { ...prev.encabezado, color_fondo: e.target.value } }))}
                                                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 outline-none font-mono text-sm dark:text-white"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="col-span-1">
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color de Texto Header</label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="color"
                                                                value={formReportes.encabezado.color_texto}
                                                                onChange={(e) => setFormReportes(prev => ({ ...prev, encabezado: { ...prev.encabezado, color_texto: e.target.value } }))}
                                                                className="h-10 w-14 rounded cursor-pointer border-0 p-0"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={formReportes.encabezado.color_texto}
                                                                onChange={(e) => setFormReportes(prev => ({ ...prev, encabezado: { ...prev.encabezado, color_texto: e.target.value } }))}
                                                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 outline-none font-mono text-sm dark:text-white"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-4 mt-8">
                                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Pie de Página (Footer)</h3>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">Usar Banner de Imagen:</span>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" checked={formReportes.pie_pagina.usar_imagen}
                                                        onChange={(e) => setFormReportes(prev => ({ ...prev, pie_pagina: { ...prev.pie_pagina, usar_imagen: e.target.checked } }))}
                                                        className="sr-only peer" />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in zoom-in-95">
                                            {formReportes.pie_pagina.usar_imagen ? (
                                                <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        ref={pieInputRef}
                                                        onChange={(e) => handleImageUploadBanner(e, 'pie_pagina')}
                                                    />

                                                    {formReportes.pie_pagina.imagen ? (
                                                        <div className="relative w-full aspect-[6/1] bg-gray-100 rounded-lg overflow-hidden group">
                                                            <img src={formReportes.pie_pagina.imagen} alt="Banner Footer" className="w-full h-full object-contain" />
                                                            <button
                                                                onClick={() => handleRemoveBanner('pie_pagina')}
                                                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                                title="Quitar imagen"
                                                            >
                                                                <FiTrash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-center cursor-pointer" onClick={() => pieInputRef.current?.click()}>
                                                            <FiUpload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                                                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Subir imagen de banner (Footer)</p>
                                                            <p className="text-xs text-gray-500 mt-1">Recomendado: 1200x150px. Max 5MB.</p>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Texto Central (Dirección, Teléfono, etc.)</label>
                                                        <input
                                                            type="text"
                                                            value={formReportes.pie_pagina.texto_central}
                                                            onChange={(e) => setFormReportes(prev => ({ ...prev, pie_pagina: { ...prev.pie_pagina, texto_central: e.target.value } }))}
                                                            placeholder="Ej: Calle Falsa 123... / fasitlac@empresa.com"
                                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                                                        />
                                                    </div>

                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                        <label className="flex items-center gap-3 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={formReportes.pie_pagina.mostrar_numeracion}
                                                                onChange={(e) => setFormReportes(prev => ({ ...prev, pie_pagina: { ...prev.pie_pagina, mostrar_numeracion: e.target.checked } }))}
                                                                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                                            />
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mostrar numeración de páginas</span>
                                                        </label>

                                                        <div className="flex items-center gap-3">
                                                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Color Texto Footer</label>
                                                            <input
                                                                type="color"
                                                                value={formReportes.pie_pagina.color_texto}
                                                                onChange={(e) => setFormReportes(prev => ({ ...prev, pie_pagina: { ...prev.pie_pagina, color_texto: e.target.value } }))}
                                                                className="h-8 w-12 rounded cursor-pointer border-0 p-0"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* SECCIÓN MARCA DE AGUA */}
                                    <div>
                                        <div className="flex items-center justify-between mt-8 mb-4 border-b border-gray-200 dark:border-gray-700 pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                                    <FiImage className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Marca de Agua</h3>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">Configura la marca de fondo para PDFs</p>
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" checked={formReportes.marca_agua?.activo ?? true}
                                                    onChange={(e) => setFormReportes(prev => ({ ...prev, marca_agua: { ...prev.marca_agua, activo: e.target.checked } }))}
                                                    className="sr-only peer" />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>

                                        {(formReportes.marca_agua?.activo ?? true) && (
                                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in zoom-in-95 space-y-6">
                                                {/* Selector de Tipo */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipo de Marca de Agua</label>
                                                    <div className="flex gap-4">
                                                        <label className="flex-1 flex items-center justify-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                                            <input type="radio" value="texto" checked={formReportes.marca_agua?.tipo === 'texto'} 
                                                                onChange={() => setFormReportes(prev => ({ ...prev, marca_agua: { ...prev.marca_agua, tipo: 'texto' } }))}
                                                                className="mr-2" />
                                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Solo Texto</span>
                                                        </label>
                                                        <label className="flex-1 flex items-center justify-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                                                            <input type="radio" value="imagen" checked={formReportes.marca_agua?.tipo === 'imagen'} 
                                                                onChange={() => setFormReportes(prev => ({ ...prev, marca_agua: { ...prev.marca_agua, tipo: 'imagen' } }))}
                                                                className="mr-2" />
                                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Logotipo / Imagen</span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {formReportes.marca_agua?.tipo === 'texto' ? (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Texto de la Marca (Máx 40 letras)</label>
                                                        <input type="text" value={formReportes.marca_agua?.texto || ''} maxLength={40}
                                                            onChange={(e) => setFormReportes(prev => ({ ...prev, marca_agua: { ...prev.marca_agua, texto: e.target.value } }))}
                                                            placeholder="Ej: DOCUMENTO OFICIAL CONFIDENCIAL"
                                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white" />
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Subir Marca de Agua (Fondo transparente recomendado)</label>
                                                        {formReportes.marca_agua?.imagen ? (
                                                            <div className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden group border border-gray-200">
                                                                <img src={formReportes.marca_agua.imagen} alt="Marca Agua" className="w-full h-full object-contain p-2" />
                                                                <button onClick={handleRemoveWatermark}
                                                                    className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" title="Quitar imagen">
                                                                    <FiTrash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer w-auto lg:w-3/4 mx-auto">
                                                                <FiUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Seleccionar Imagen Central</span>
                                                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUploadWatermark} />
                                                            </label>
                                                        )}
                                                    </div>
                                                )}

                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nivel de Opacidad (Transparencia)</label>
                                                        <span className="text-sm font-bold text-blue-600">{formReportes.marca_agua?.opacity ?? 10}%</span>
                                                    </div>
                                                    <input type="range" min="1" max="100" value={formReportes.marca_agua?.opacity ?? 10}
                                                        onChange={(e) => setFormReportes(prev => ({ ...prev, marca_agua: { ...prev.marca_agua, opacity: parseInt(e.target.value) } }))}
                                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
                                                    <div className="flex justify-between text-xs text-gray-400 mt-1 uppercase tracking-wider font-bold">
                                                        <span>Fantasmal (1%)</span>
                                                        <span>Intensa (100%)</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Etiquetas de Turnos */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                                            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                                                <FiClock className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Nombres de Turnos</h3>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Personaliza cómo se llaman los turnos en los reportes</p>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm animate-in fade-in zoom-in-95 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                            {[0, 1, 2].map((i) => {
                                                const turnoActual = formReportes.etiquetas_turnos?.[i] || { nombre: '', inicio: '', fin: '' };

                                                return (
                                                    <div key={i} className="flex flex-col gap-3">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre</label>
                                                            <input
                                                                type="text"
                                                                value={turnoActual.nombre}
                                                                onChange={(e) => {
                                                                    const newEtiquetas = [...(formReportes.etiquetas_turnos || [])];
                                                                    newEtiquetas[i] = { ...newEtiquetas[i], nombre: e.target.value };
                                                                    setFormReportes(prev => ({ ...prev, etiquetas_turnos: newEtiquetas }));
                                                                }}
                                                                placeholder={`Ej: ${['Matutino', 'Vespertino', 'Nocturno'][i]}`}
                                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
                                                            <div className="w-full">
                                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Inicio</label>
                                                                <input
                                                                    type="time"
                                                                    value={turnoActual.inicio}
                                                                    onChange={(e) => {
                                                                        const newEtiquetas = [...(formReportes.etiquetas_turnos || [])];
                                                                        newEtiquetas[i] = { ...newEtiquetas[i], inicio: e.target.value };
                                                                        setFormReportes(prev => ({ ...prev, etiquetas_turnos: newEtiquetas }));
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                                                                />
                                                            </div>
                                                            <div className="w-full">
                                                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Fin</label>
                                                                <input
                                                                    type="time"
                                                                    value={turnoActual.fin}
                                                                    onChange={(e) => {
                                                                        const newEtiquetas = [...(formReportes.etiquetas_turnos || [])];
                                                                        newEtiquetas[i] = { ...newEtiquetas[i], fin: e.target.value };
                                                                        setFormReportes(prev => ({ ...prev, etiquetas_turnos: newEtiquetas }));
                                                                    }}
                                                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm dark:text-white"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Zona de Live Preview (Derecha) */}
                                <div className="flex flex-col items-center xl:sticky xl:top-6 lg:ml-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 w-full text-left">Previsualización (Aprox.)</h3>

                                    {/* Hoja A4 Simulada */}
                                    <div className="w-full max-w-sm sm:max-w-md aspect-[1/1.414] bg-white border border-gray-300 shadow-2xl rounded-sm flex flex-col relative overflow-hidden ring-1 ring-gray-900/5">

                                        {/* Header Preview */}
                                        {formReportes.encabezado.usar_imagen && formReportes.encabezado.imagen ? (
                                            <div className="w-full aspect-[6/1] border-b">
                                                <img src={formReportes.encabezado.imagen} alt="Banner Preview" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div
                                                className="flex justify-between items-center p-4 sm:p-6 border-b transition-colors"
                                                style={{ backgroundColor: formReportes.encabezado.color_fondo || '#ffffff' }}
                                            >
                                                <div className="flex-1 flex gap-3 sm:gap-4 items-center overflow-hidden">
                                                    {formReportes.encabezado.mostrar_logo && (
                                                        <div className="w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0 bg-white/10 rounded overflow-hidden flex items-center justify-center">
                                                            {formEmpresa.logo ? (
                                                                <img src={formEmpresa.logo} alt="Logo" className="w-full h-full object-contain" />
                                                            ) : (
                                                                <FiImage className="w-6 h-6" style={{ color: formReportes.encabezado.color_texto || '#000' }} />
                                                            )}
                                                        </div>
                                                    )}
                                                    <div
                                                        className="text-[10px] sm:text-xs font-semibold whitespace-pre-wrap truncate"
                                                        style={{ color: formReportes.encabezado.color_texto || '#000000' }}
                                                    >
                                                        {formReportes.encabezado.texto_izquierdo || 'Texto Izquierdo...'}
                                                    </div>
                                                </div>
                                                <div
                                                    className="flex-1 text-right text-[10px] sm:text-xs font-semibold whitespace-pre-wrap ml-2 truncate"
                                                    style={{ color: formReportes.encabezado.color_texto || '#000000' }}
                                                >
                                                    {formReportes.encabezado.texto_derecho || 'Texto Derecho...'}
                                                </div>
                                            </div>
                                        )}

                                        {/* Watermark Preview */}
                                        {(formReportes.marca_agua?.activo ?? true) && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 overflow-hidden">
                                                {formReportes.marca_agua?.tipo === 'imagen' && formReportes.marca_agua?.imagen ? (
                                                    <img src={formReportes.marca_agua.imagen} alt="Watermark" style={{ opacity: (formReportes.marca_agua.opacity || 10) / 100, maxWidth: '60%', maxHeight: '60%' }} className="object-contain" />
                                                ) : (
                                                    <div style={{ opacity: (formReportes.marca_agua?.opacity || 10) / 100, transform: 'rotate(-45deg)', fontSize: '2rem', fontWeight: 'bold', color: '#000', whiteSpace: 'nowrap' }}>
                                                        {formReportes.marca_agua?.texto || 'REPORTE'}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Body Dummy */}
                                        <div className="flex-1 p-6 flex flex-col pt-8 space-y-4">
                                            <div className="text-center">
                                                <div className="font-bold text-sm sm:text-base text-gray-800">Departamento de Recursos Humanos</div>
                                                <div className="text-xs text-gray-500 mt-1">Reporte de Checadas - Quincena 1</div>
                                            </div>
                                            <div className="w-3/4 h-2 bg-gray-200 rounded mx-auto mt-4"></div>
                                            <div className="w-1/2 h-2 bg-gray-200 rounded mx-auto mb-4"></div>

                                            {/* Dummy Table */}
                                            <div className="w-full h-40 bg-gray-50 rounded border border-gray-200 flex flex-col">
                                                <div className="w-full h-6 bg-gray-300 border-b border-gray-200 flex items-center px-2">
                                                    <div className="w-1/3 h-2 bg-gray-400 rounded"></div>
                                                </div>
                                                <div className="w-full flex-1 flex flex-col justify-around px-2">
                                                    <div className="w-full h-2 bg-gray-200 rounded"></div>
                                                    <div className="w-full h-2 bg-gray-200 rounded"></div>
                                                    <div className="w-5/6 h-2 bg-gray-200 rounded"></div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer Preview */}
                                        {formReportes.pie_pagina.usar_imagen && formReportes.pie_pagina.imagen ? (
                                            <div className="absolute bottom-0 w-full aspect-[8/1] border-t bg-white">
                                                <img src={formReportes.pie_pagina.imagen} alt="Footer Preview" className="w-full h-full object-cover" />
                                            </div>
                                        ) : (
                                            <div className="absolute bottom-0 w-full p-4 border-t flex justify-between items-end transition-colors bg-white">
                                                <div
                                                    className="flex-1 text-center text-[8px] sm:text-[10px] px-8"
                                                    style={{ color: formReportes.pie_pagina.color_texto || '#666666' }}
                                                >
                                                    {formReportes.pie_pagina.texto_central || 'Texto Central Footer'}
                                                </div>
                                                {formReportes.pie_pagina.mostrar_numeracion && (
                                                    <div
                                                        className="absolute right-4 bottom-4 text-[8px] sm:text-[10px]"
                                                        style={{ color: formReportes.pie_pagina.color_texto || '#666666' }}
                                                    >
                                                        Página 1
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-4 text-center">
                                        Esta es una representación aproximada. El documento final en PDF acomodará automáticamente las dimensiones.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Configuracion;
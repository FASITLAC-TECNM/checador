import { useState, useEffect } from 'react';
import { ArrowLeft, Save, X, Building2 } from 'lucide-react';
import { getUsuarios } from '../../services/api';
import DepartmentMap from './DepartamentMap';
import JefesSelector from './JefesSelector';
import { useNotification } from '../../contexts/NotificationContext';

const DepartmentForm = ({ department, onSave, onCancel }) => {
    const notification = useNotification();
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        jefes: [],
        jefesInfo: [],
        color: '#3b82f6',
        activo: true,
        zonas: []
    });

    const [usuarios, setUsuarios] = useState([]);

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

    // Cargar usuarios
    useEffect(() => {
        const cargarUsuarios = async () => {
            try {
                const usuariosData = await getUsuarios();
                if (usuariosData && Array.isArray(usuariosData)) {
                    const usuariosActivos = usuariosData.filter(u => u.activo === 'ACTIVO');
                    setUsuarios(usuariosActivos);
                    console.log('✅ Usuarios cargados:', usuariosActivos.length);
                }
            } catch (error) {
                console.error('❌ Error al cargar usuarios:', error);
            }
        };
        cargarUsuarios();
    }, []);

    // Cargar datos del departamento y jefes info
    useEffect(() => {
        console.log('📥 Department recibido:', department);
        console.log('👥 Usuarios disponibles:', usuarios.length);

        if (department) {
            // Parsear jefes - MEJORADO
            let jefesArray = [];
            if (department.jefes) {
                if (Array.isArray(department.jefes)) {
                    // Si ya es array, convertir a números y eliminar duplicados
                    jefesArray = [...new Set(department.jefes.map(id => {
                        const numId = typeof id === 'string' ? parseInt(id) : id;
                        return isNaN(numId) ? null : numId;
                    }).filter(id => id !== null))];
                } else if (typeof department.jefes === 'string') {
                    // Si es string de PostgreSQL {1,2,3} o "1,2,3"
                    const cleanStr = department.jefes.replace(/[{}\[\]"]/g, '').trim();
                    if (cleanStr) {
                        const idsArray = cleanStr.split(',')
                            .map(id => {
                                const numId = parseInt(id.trim());
                                return isNaN(numId) ? null : numId;
                            })
                            .filter(id => id !== null);
                        // Eliminar duplicados
                        jefesArray = [...new Set(idsArray)];
                    }
                }
            }

            console.log('🔍 Jefes parseados (IDs únicos):', jefesArray);

            // Parsear ubicación
            let zonasArray = [];
            if (department.ubicacion) {
                try {
                    zonasArray = typeof department.ubicacion === 'string'
                        ? JSON.parse(department.ubicacion)
                        : department.ubicacion;
                } catch (e) {
                    console.error('❌ Error parsing ubicacion:', e);
                }
            }

            // Cargar info completa de jefes si hay usuarios disponibles
            let jefesInfoArray = [];
            if (jefesArray.length > 0 && usuarios.length > 0) {
                jefesInfoArray = jefesArray
                    .map(jefeId => {
                        const usuario = usuarios.find(u => u.id === jefeId);
                        if (!usuario) {
                            console.warn(`⚠️ No se encontró usuario con ID ${jefeId}`);
                            return null;
                        }
                        return {
                            id: usuario.id,
                            nombre: usuario.nombre,
                            email: usuario.email,
                            username: usuario.username,
                            foto: usuario.foto,
                            rol: usuario.rol
                        };
                    })
                    .filter(jefe => jefe !== null);

                console.log('✅ Jefes Info cargados:', jefesInfoArray);
            } else if (jefesArray.length > 0) {
                console.log('⏳ Esperando a que carguen los usuarios para cargar jefes info...');
            }

            setFormData({
                nombre: department.nombre || '',
                descripcion: department.descripcion || '',
                jefes: jefesArray,
                jefesInfo: jefesInfoArray,
                color: department.color || '#3b82f6',
                activo: department.activo !== undefined ? department.activo : true,
                zonas: zonasArray
            });
        } else {
            setFormData({
                nombre: '',
                descripcion: '',
                jefes: [],
                jefesInfo: [],
                color: '#3b82f6',
                activo: true,
                zonas: []
            });
        }
    }, [department, usuarios]);

    const handleSubmit = () => {
        if (!formData.nombre || !formData.descripcion || formData.jefes.length === 0) {
            notification.warning('Campos requeridos', 'Por favor complete todos los campos obligatorios (*)\nAsegúrate de seleccionar al menos un jefe de departamento.');
            return;
        }

        const ubicacionData = formData.zonas && formData.zonas.length > 0
            ? JSON.stringify(formData.zonas)
            : null;

        // Asegurar que jefes sea un array limpio sin duplicados
        const jefesUnicos = [...new Set(formData.jefes)];

        const dataToSave = {
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            ubicacion: ubicacionData,
            jefes: jefesUnicos, // Array de números únicos
            color: formData.color,
            activo: formData.activo
        };

        console.log('💾 Guardando departamento:', dataToSave);
        console.log('📋 Tipo de jefes:', typeof dataToSave.jefes, 'Es array:', Array.isArray(dataToSave.jefes));
        console.log('👥 Jefes a guardar:', dataToSave.jefes);

        onSave(dataToSave);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAgregarJefe = (usuario) => {
        console.log('➕ Agregando jefe:', usuario);

        setFormData(prev => ({
            ...prev,
            jefes: [...prev.jefes, usuario.id],
            jefesInfo: [...prev.jefesInfo, {
                id: usuario.id,
                nombre: usuario.nombre,
                email: usuario.email,
                username: usuario.username,
                foto: usuario.foto,
                rol: usuario.rol
            }]
        }));
    };

    const handleRemoverJefe = (jefeId) => {
        console.log('➖ Removiendo jefe ID:', jefeId);

        setFormData(prev => ({
            ...prev,
            jefes: prev.jefes.filter(id => id !== jefeId),
            jefesInfo: prev.jefesInfo.filter(jefe => jefe.id !== jefeId)
        }));
    };

    const handleZonasChange = (nuevasZonas) => {
        setFormData(prev => ({ ...prev, zonas: nuevasZonas }));
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

                        {/* LADO IZQUIERDO - FORMULARIO */}
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

                                    <JefesSelector
                                        jefesInfo={formData.jefesInfo}
                                        usuarios={usuarios}
                                        onAgregarJefe={handleAgregarJefe}
                                        onRemoverJefe={handleRemoverJefe}
                                    />

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

                        {/* LADO DERECHO - MAPA */}
                        <DepartmentMap
                            zonas={formData.zonas}
                            color={formData.color}
                            onZonasChange={handleZonasChange}
                            departmentName={formData.nombre}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepartmentForm;
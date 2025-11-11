import { useState } from 'react';
import { X, Save, ArrowLeft, Shield, FileText, Tag, Palette } from 'lucide-react';

const PermissionForm = ({ permission, onSave, onCancel }) => {
    const [formData, setFormData] = useState(permission || {
        id: Date.now(),
        nombre: '',
        clave: '',
        descripcion: '',
        modulo: '',
        tipo: 'Ver',
        color: '#3B82F6',
        activo: true
    });

    const tiposPermiso = [
        { value: 'Ver', label: 'Ver', color: '#3B82F6' },
        { value: 'Crear', label: 'Crear', color: '#10B981' },
        { value: 'Editar', label: 'Editar', color: '#F59E0B' },
        { value: 'Eliminar', label: 'Eliminar', color: '#EF4444' },
        { value: 'Sincronizar', label: 'Sincronizar', color: '#8B5CF6' },
        { value: 'Exportar', label: 'Exportar', color: '#6366F1' },
        { value: 'Importar', label: 'Importar', color: '#EC4899' },
        { value: 'Aprobar', label: 'Aprobar', color: '#14B8A6' }
    ];

    const modulos = [
        'Usuarios',
        'Roles',
        'Departamentos',
        'Dispositivos',
        'Horarios',
        'Asistencias',
        'Reportes',
        'Historial',
        'Configuración'
    ];

    const handleSubmit = () => {
        // Validaciones
        if (!formData.nombre.trim()) {
            alert('El nombre es obligatorio');
            return;
        }

        if (!formData.clave.trim()) {
            alert('La clave es obligatoria');
            return;
        }

        if (!formData.modulo) {
            alert('Selecciona un módulo');
            return;
        }

        // Generar clave automática si está vacía
        if (!formData.clave || formData.clave === '') {
            const claveGenerada = `${formData.modulo.toLowerCase()}_${formData.tipo.toLowerCase()}`;
            setFormData(prev => ({ ...prev, clave: claveGenerada }));
        }

        onSave(formData);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleTipoChange = (tipo) => {
        const tipoObj = tiposPermiso.find(t => t.value === tipo);
        setFormData(prev => ({
            ...prev,
            tipo: tipo,
            color: tipoObj?.color || prev.color
        }));
    };

    // Auto-generar clave cuando cambian módulo o tipo
    const handleModuloOTipoChange = (field, value) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            if (newData.modulo && newData.tipo) {
                newData.clave = `${newData.modulo.toLowerCase()}.${newData.tipo.toLowerCase()}`;
            }
            return newData;
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors text-[#6E6E73]"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-[#1D1D1F]">
                            {permission ? 'Editar Permiso' : 'Nuevo Permiso'}
                        </h2>
                        <p className="text-[#6E6E73] mt-1">Complete la información del permiso</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 border border-[#D2D2D7]">
                {/* Sección: Información Básica */}
                <div>
                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                        Información Básica
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <Shield size={16} className="inline mr-1" />
                                Nombre del Permiso *
                            </label>
                            <input
                                type="text"
                                name="nombre"
                                value={formData.nombre}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#86868B]"
                                placeholder="Ej: Ver Usuarios"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <Tag size={16} className="inline mr-1" />
                                Clave Única *
                            </label>
                            <input
                                type="text"
                                name="clave"
                                value={formData.clave}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#86868B] font-mono"
                                placeholder="usuarios.ver"
                            />
                            <p className="text-xs text-[#6E6E73] mt-1">
                                Se genera automáticamente al seleccionar módulo y tipo
                            </p>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <FileText size={16} className="inline mr-1" />
                                Descripción
                            </label>
                            <textarea
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#86868B]"
                                placeholder="Descripción detallada del permiso..."
                            />
                        </div>
                    </div>
                </div>

                {/* Sección: Módulo y Tipo */}
                <div>
                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                        Clasificación
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                Módulo del Sistema *
                            </label>
                            <select
                                name="modulo"
                                value={formData.modulo}
                                onChange={(e) => handleModuloOTipoChange('modulo', e.target.value)}
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Seleccione módulo --</option>
                                {modulos.map(modulo => (
                                    <option key={modulo} value={modulo}>
                                        {modulo}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                Tipo de Permiso *
                            </label>
                            <div className="grid grid-cols-4 gap-2">
                                {tiposPermiso.map(tipo => (
                                    <button
                                        key={tipo.value}
                                        type="button"
                                        onClick={() => handleModuloOTipoChange('tipo', tipo.value)}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                            formData.tipo === tipo.value
                                                ? 'ring-2 ring-blue-500 ring-offset-1 scale-105'
                                                : 'bg-[#F5F5F7] hover:bg-[#E5E5E7]'
                                        }`}
                                        style={{
                                            backgroundColor: formData.tipo === tipo.value ? tipo.color + '20' : undefined,
                                            color: formData.tipo === tipo.value ? tipo.color : undefined
                                        }}
                                    >
                                        {tipo.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sección: Color y Estado */}
                <div>
                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                        Apariencia
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <Palette size={16} className="inline mr-1" />
                                Color del Permiso
                            </label>
                            <div className="flex gap-2 items-center">
                                {tiposPermiso.slice(0, 4).map(tipo => (
                                    <button
                                        key={tipo.color}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, color: tipo.color }))}
                                        className={`w-10 h-10 rounded-lg transition-all ${
                                            formData.color === tipo.color
                                                ? 'ring-2 ring-blue-500 ring-offset-2 scale-110'
                                                : 'hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: tipo.color }}
                                    />
                                ))}
                                <input
                                    type="color"
                                    name="color"
                                    value={formData.color}
                                    onChange={handleChange}
                                    className="w-10 h-10 rounded-lg cursor-pointer border border-[#D2D2D7]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                Estado
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    name="activo"
                                    checked={formData.activo}
                                    onChange={handleChange}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <label className="text-sm font-medium text-[#1D1D1F]">
                                    Permiso activo y disponible
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Vista previa */}
                <div className="p-4 bg-[#F5F5F7] rounded-lg">
                    <p className="text-sm text-[#6E6E73] mb-2">Vista previa:</p>
                    <div className="flex items-center gap-3">
                        <span
                            className="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border shadow-sm"
                            style={{
                                backgroundColor: `${formData.color}20`,
                                color: formData.color,
                                borderColor: `${formData.color}40`
                            }}
                        >
                            <Shield size={16} />
                            {formData.nombre || 'Nombre del permiso'}
                        </span>
                        {formData.clave && (
                            <code className="text-xs text-[#6E6E73] bg-white px-3 py-1 rounded border border-[#D2D2D7] font-mono">
                                {formData.clave}
                            </code>
                        )}
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E7]">
                    <button
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Save size={18} />
                        Guardar Permiso
                    </button>
                    <button
                        onClick={onCancel}
                        className="flex items-center gap-2 px-6 py-2 bg-[#F5F5F7] text-[#1D1D1F] rounded-lg hover:bg-[#E5E5E7] transition-colors font-medium"
                    >
                        <X size={18} />
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PermissionForm;

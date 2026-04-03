import React, { useState } from 'react';
import { X, Save, Shield, Users, Settings, FileText, Smartphone, Clock, BarChart } from 'lucide-react';

const RoleForm = ({ formData, editingRole, onClose, onSave, onChange, onPermissionChange }) => {
    const [selectedColor, setSelectedColor] = useState(formData.color || '#3b82f6');

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

    const modulos = [
        {
            id: 'usuarios',
            nombre: 'Usuarios',
            descripcion: 'Gestión de empleados y personal',
            icono: Users,
            color: '#3b82f6'
        },
        {
            id: 'roles',
            nombre: 'Roles y Permisos',
            descripcion: 'Configuración de roles de usuario',
            icono: Shield,
            color: '#8b5cf6'
        },
        {
            id: 'dispositivos',
            nombre: 'Dispositivos',
            descripcion: 'Gestión de dispositivos de registro',
            icono: Smartphone,
            color: '#10b981'
        },
        {
            id: 'asistencias',
            nombre: 'Asistencias',
            descripcion: 'Registro y control de asistencias',
            icono: Clock,
            color: '#f59e0b'
        },
        {
            id: 'reportes',
            nombre: 'Reportes',
            descripcion: 'Generación y visualización de informes',
            icono: BarChart,
            color: '#06b6d4'
        },
        {
            id: 'configuracion',
            nombre: 'Configuración',
            descripcion: 'Ajustes generales del sistema',
            icono: Settings,
            color: '#64748b'
        }
    ];

    const permisos = [
        { id: 'ver', nombre: 'Ver', descripcion: 'Puede visualizar información' },
        { id: 'crear', nombre: 'Crear', descripcion: 'Puede crear nuevos registros' },
        { id: 'editar', nombre: 'Editar', descripcion: 'Puede modificar registros' },
        { id: 'eliminar', nombre: 'Eliminar', descripcion: 'Puede eliminar registros' }
    ];

    const handleColorChange = (color) => {
        setSelectedColor(color);
        onChange({ target: { name: 'color', value: color } });
    };

    const handleSelectAllModule = (moduloId) => {
        const allChecked = permisos.every(p => formData.permisos[moduloId][p.id]);
        permisos.forEach(p => {
            if (allChecked !== formData.permisos[moduloId][p.id]) {
                onPermissionChange(moduloId, p.id);
            }
        });
    };

    const isModuleFullySelected = (moduloId) => {
        return permisos.every(p => formData.permisos[moduloId][p.id]);
    };

    const getModulePermissionCount = (moduloId) => {
        return permisos.filter(p => formData.permisos[moduloId][p.id]).length;
    };

    return (
        <div className="min-h-screen bg-[#FBFBFD] p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-[#1D1D1F] mb-2">
                            {editingRole ? 'Editar Rol' : 'Crear Nuevo Rol'}
                        </h1>
                        <p className="text-[#6E6E73]">
                            Configura el nombre, descripción y permisos del rol
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors text-[#6E6E73]"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Formulario */}
                <div className="space-y-6">
                    {/* Información Básica */}
                    <div className="bg-white rounded-xl border border-[#D2D2D7] shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-[#1D1D1F]">
                            <FileText className="w-5 h-5" />
                            Información Básica
                        </h2>

                        <div className="space-y-4">
                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                    Nombre del Rol *
                                </label>
                                <input
                                    type="text"
                                    name="nombre"
                                    value={formData.nombre}
                                    onChange={onChange}
                                    placeholder="Ej: Gerente de Operaciones"
                                    className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#86868B]"
                                />
                            </div>

                            {/* Descripción */}
                            <div>
                                <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                    Descripción
                                </label>
                                <textarea
                                    name="descripcion"
                                    value={formData.descripcion}
                                    onChange={onChange}
                                    placeholder="Describe las responsabilidades de este rol..."
                                    rows="3"
                                    className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] rounded-lg text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-[#86868B]"
                                />
                            </div>

                            {/* Selector de Color */}
                            <div>
                                <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                    Color Identificador
                                </label>
                                <div className="flex flex-wrap gap-3">
                                    {coloresDisponibles.map((c) => (
                                        <button
                                            key={c.color}
                                            type="button"
                                            onClick={() => handleColorChange(c.color)}
                                            className={`w-10 h-10 rounded-lg transition-all ${selectedColor === c.color
                                                ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-white scale-110'
                                                : 'hover:scale-105'
                                                }`}
                                            style={{ backgroundColor: c.color }}
                                            title={c.nombre}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Permisos */}
                    <div className="bg-white rounded-xl border border-[#D2D2D7] shadow-sm p-6">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-[#1D1D1F]">
                            <Shield className="w-5 h-5" />
                            Permisos por Módulo
                        </h2>
                        <p className="text-[#6E6E73] text-sm mb-6">
                            Selecciona los permisos que tendrá este rol en cada módulo del sistema
                        </p>

                        <div className="space-y-4">
                            {modulos.map((modulo) => {
                                const Icon = modulo.icono;
                                const permissionsCount = getModulePermissionCount(modulo.id);
                                const isFullySelected = isModuleFullySelected(modulo.id);

                                return (
                                    <div
                                        key={modulo.id}
                                        className="border border-[#D2D2D7] rounded-xl overflow-hidden hover:border-[#86868B] transition-colors"
                                    >
                                        {/* Header del Módulo */}
                                        <div className="bg-[#F5F5F7] p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                    style={{ backgroundColor: `${modulo.color}20` }}
                                                >
                                                    <Icon
                                                        className="w-5 h-5"
                                                        style={{ color: modulo.color }}
                                                    />
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-[#1D1D1F]">{modulo.nombre}</h3>
                                                    <p className="text-xs text-[#6E6E73]">{modulo.descripcion}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-[#6E6E73]">
                                                    {permissionsCount}/{permisos.length} permisos
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectAllModule(modulo.id)}
                                                    className={`text-xs px-3 py-1 rounded transition-colors ${isFullySelected
                                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                                        }`}
                                                >
                                                    {isFullySelected ? 'Desmarcar todo' : 'Marcar todo'}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Checkboxes de Permisos */}
                                        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-white">
                                            {permisos.map((permiso) => (
                                                <label
                                                    key={permiso.id}
                                                    className="flex items-center gap-2 cursor-pointer group"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.permisos[modulo.id][permiso.id]}
                                                        onChange={() => onPermissionChange(modulo.id, permiso.id)}
                                                        className="w-4 h-4 rounded border-[#D2D2D7] text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                                                    />
                                                    <span className="text-sm text-[#6E6E73] group-hover:text-[#1D1D1F] transition-colors">
                                                        {permiso.nombre}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-[#F5F5F7] hover:bg-[#E5E5E7] text-[#1D1D1F] rounded-lg transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onSave}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                        >
                            <Save className="w-5 h-5" />
                            {editingRole ? 'Guardar Cambios' : 'Crear Rol'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoleForm;
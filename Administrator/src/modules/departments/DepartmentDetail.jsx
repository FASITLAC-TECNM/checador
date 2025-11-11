import React from 'react';
import { ArrowLeft, Users, Calendar, Edit2, Building2, User, Mail, Phone, Briefcase } from 'lucide-react';

const DepartmentDetail = ({ department, empleados, onBack, onEdit }) => {
    return (
        <div className="min-h-screen bg-white">
            {/* Header fijo */}
            <div className="sticky top-0 z-10 bg-white border-b border-[#E5E5E7] shadow-sm">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-[#6E6E73] hover:text-blue-600 transition-all group mb-3"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="font-medium">Volver a departamentos</span>
                    </button>
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div
                                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg"
                                    style={{ backgroundColor: department.color }}
                                >
                                    <Building2 size={32} />
                                </div>
                                {department.activo && (
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white shadow-md animate-pulse"></div>
                                )}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-[#1D1D1F] mb-1">{department.nombre}</h1>
                                <p className="text-[#6E6E73]">{department.descripcion}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-4 py-2 text-sm font-bold rounded-full flex items-center gap-2 ${
                                department.activo
                                    ? 'bg-green-50 text-green-700 border-2 border-green-200'
                                    : 'bg-gray-50 text-gray-700 border-2 border-gray-200'
                            }`}>
                                <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                                {department.activo ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                            <button
                                onClick={() => onEdit(department)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all hover:scale-110"
                                title="Editar departamento"
                            >
                                <Edit2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenido */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                <div className="space-y-6">
                    {/* Información del Departamento */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                        <div
                            className="px-6 py-4 border-b border-[#E5E5E7]"
                            style={{
                                background: `linear-gradient(to right, ${department.color}15, ${department.color}05)`,
                                borderLeftWidth: '4px',
                                borderLeftColor: department.color
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className="p-2 rounded-lg"
                                    style={{ backgroundColor: `${department.color}20` }}
                                >
                                    <Building2 size={20} style={{ color: department.color }} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-semibold text-[#1D1D1F]">Información del Departamento</h2>
                                    <p className="text-sm text-[#6E6E73]">Detalles y responsable</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Jefe de Departamento</p>
                                    <div className="flex items-center gap-2">
                                        <User size={18} className="text-blue-600" />
                                        <p className="text-[#1D1D1F] text-lg font-semibold">{department.jefe}</p>
                                    </div>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Número de Empleados</p>
                                    <div className="flex items-center gap-2">
                                        <Users size={18} className="text-blue-600" />
                                        <p className="text-[#1D1D1F] text-lg font-semibold">{empleados.length}</p>
                                    </div>
                                </div>
                                <div className="bg-[#F5F5F7] rounded-xl p-4">
                                    <p className="text-[#6E6E73] text-sm mb-2 font-medium">Fecha de Creación</p>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={18} className="text-blue-600" />
                                        <p className="text-[#1D1D1F] font-semibold">
                                            {new Date(department.fechaCreacion).toLocaleDateString('es-MX', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Empleados */}
                    <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5E7] overflow-hidden">
                        <div
                            className="px-6 py-4 border-b"
                            style={{
                                background: `linear-gradient(to right, ${department.color}15, ${department.color}05)`,
                                borderLeftWidth: '4px',
                                borderLeftColor: department.color
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="p-2 rounded-lg"
                                        style={{ backgroundColor: `${department.color}20` }}
                                    >
                                        <Users size={20} style={{ color: department.color }} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-semibold text-[#1D1D1F]">Empleados del Departamento</h2>
                                        <p className="text-sm text-[#6E6E73]">
                                            {empleados.length} empleado{empleados.length !== 1 ? 's' : ''} asignado{empleados.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            {empleados.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {empleados.map((empleado) => (
                                        <div
                                            key={empleado.id}
                                            className="bg-[#F5F5F7] rounded-xl p-4 hover:bg-[#E5E5E7] transition-colors border border-[#D2D2D7]"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                                                    style={{ backgroundColor: department.color }}
                                                >
                                                    {empleado.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-[#1D1D1F] mb-1">{empleado.nombre}</h3>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-sm text-[#6E6E73]">
                                                            <Briefcase size={14} />
                                                            <span className="truncate">{empleado.rol || 'Sin rol asignado'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-sm text-[#6E6E73]">
                                                            <Mail size={14} />
                                                            <span className="truncate">{empleado.email}</span>
                                                        </div>
                                                        {empleado.telefono && (
                                                            <div className="flex items-center gap-2 text-sm text-[#6E6E73]">
                                                                <Phone size={14} />
                                                                <span>{empleado.telefono}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="mt-2">
                                                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                                            empleado.activo === 'ACTIVO'
                                                                ? 'bg-green-50 text-green-700 border border-green-200'
                                                                : empleado.activo === 'SUSPENDIDO'
                                                                ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                                                                : 'bg-gray-50 text-gray-700 border border-gray-200'
                                                        }`}>
                                                            {empleado.activo}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-[#F5F5F7] rounded-full mb-4">
                                        <Users size={32} className="text-[#86868B]" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-2">
                                        No hay empleados asignados
                                    </h3>
                                    <p className="text-[#6E6E73]">
                                        Este departamento aún no tiene empleados asignados
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Espaciado inferior */}
            <div className="h-8"></div>
        </div>
    );
};

export default DepartmentDetail;

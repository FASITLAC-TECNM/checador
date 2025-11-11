import { useState, useEffect } from 'react';
import { X, Save, ArrowLeft, Clock, Calendar, User, Palette, FileText } from 'lucide-react';

const ScheduleForm = ({ schedule, onSave, onCancel, usuarios = [] }) => {
    const [formData, setFormData] = useState(schedule || {
        id: Date.now(),
        id_usuario: '',
        dia_semana: 'lunes',
        hora_inicio: '08:00',
        hora_fin: '12:00',
        descripcion: '',
        color: '#3B82F6',
        activo: true
    });

    const diasSemana = [
        { value: 'lunes', label: 'Lunes' },
        { value: 'martes', label: 'Martes' },
        { value: 'miercoles', label: 'Miércoles' },
        { value: 'jueves', label: 'Jueves' },
        { value: 'viernes', label: 'Viernes' },
        { value: 'sabado', label: 'Sábado' },
        { value: 'domingo', label: 'Domingo' }
    ];

    const coloresPredefinidos = [
        { color: '#3B82F6', nombre: 'Azul' },
        { color: '#10B981', nombre: 'Verde' },
        { color: '#F59E0B', nombre: 'Amarillo' },
        { color: '#EF4444', nombre: 'Rojo' },
        { color: '#8B5CF6', nombre: 'Morado' },
        { color: '#EC4899', nombre: 'Rosa' },
        { color: '#06B6D4', nombre: 'Cyan' },
        { color: '#84CC16', nombre: 'Lima' }
    ];

    const handleSubmit = () => {
        // Validaciones
        if (!formData.id_usuario) {
            alert('Por favor seleccione un usuario');
            return;
        }

        if (!formData.hora_inicio || !formData.hora_fin) {
            alert('Por favor complete las horas de inicio y fin');
            return;
        }

        // Validar que hora_fin sea mayor que hora_inicio
        const [horaInicioH, horaInicioM] = formData.hora_inicio.split(':').map(Number);
        const [horaFinH, horaFinM] = formData.hora_fin.split(':').map(Number);
        const minutosInicio = horaInicioH * 60 + horaInicioM;
        const minutosFin = horaFinH * 60 + horaFinM;

        if (minutosFin <= minutosInicio) {
            alert('La hora de fin debe ser mayor que la hora de inicio');
            return;
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
                            {schedule ? 'Editar Horario' : 'Nuevo Bloque de Horario'}
                        </h2>
                        <p className="text-[#6E6E73] mt-1">Asigne un bloque de tiempo a un usuario</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 border border-[#D2D2D7]">
                {/* Sección: Selección de Usuario */}
                <div>
                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                        Usuario
                    </h3>
                    <div>
                        <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                            <User size={16} className="inline mr-1" />
                            Seleccionar Usuario *
                        </label>
                        <select
                            name="id_usuario"
                            value={formData.id_usuario}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">-- Seleccione un usuario --</option>
                            {usuarios.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.nombre} ({user.username})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Sección: Día y Horario */}
                <div>
                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                        Día y Horario
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <Calendar size={16} className="inline mr-1" />
                                Día de la Semana *
                            </label>
                            <select
                                name="dia_semana"
                                value={formData.dia_semana}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                {diasSemana.map(dia => (
                                    <option key={dia.value} value={dia.value}>
                                        {dia.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <Clock size={16} className="inline mr-1" />
                                Hora Inicio *
                            </label>
                            <input
                                type="time"
                                name="hora_inicio"
                                value={formData.hora_inicio}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <Clock size={16} className="inline mr-1" />
                                Hora Fin *
                            </label>
                            <input
                                type="time"
                                name="hora_fin"
                                value={formData.hora_fin}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* Vista previa del bloque */}
                    <div className="mt-4 p-4 bg-[#F5F5F7] rounded-lg">
                        <p className="text-sm text-[#6E6E73] mb-2">Vista previa:</p>
                        <div
                            className="inline-block px-4 py-2 rounded-lg text-white font-medium"
                            style={{ backgroundColor: formData.color }}
                        >
                            {diasSemana.find(d => d.value === formData.dia_semana)?.label}: {formData.hora_inicio} - {formData.hora_fin}
                        </div>
                    </div>
                </div>

                {/* Sección: Descripción y Color */}
                <div>
                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                        Detalles Adicionales
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <FileText size={16} className="inline mr-1" />
                                Descripción (opcional)
                            </label>
                            <textarea
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleChange}
                                rows="3"
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#86868B]"
                                placeholder="Ej: Turno Mañana, Reunión Semanal, etc."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <Palette size={16} className="inline mr-1" />
                                Color del Bloque
                            </label>
                            <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                                {coloresPredefinidos.map(({ color, nombre }) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, color }))}
                                        className={`w-12 h-12 rounded-lg transition-all ${
                                            formData.color === color
                                                ? 'ring-4 ring-blue-500 ring-offset-2 scale-110'
                                                : 'hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: color }}
                                        title={nombre}
                                    />
                                ))}
                            </div>

                            {/* Selector de color personalizado */}
                            <div className="mt-3">
                                <label className="text-sm text-[#6E6E73]">O elige un color personalizado:</label>
                                <input
                                    type="color"
                                    name="color"
                                    value={formData.color}
                                    onChange={handleChange}
                                    className="ml-2 w-16 h-10 rounded cursor-pointer border border-[#D2D2D7]"
                                />
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
                            <label className="ml-2 text-sm font-medium text-[#1D1D1F]">
                                Bloque activo
                            </label>
                        </div>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E7]">
                    <button
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Save size={18} />
                        Guardar Bloque
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

export default ScheduleForm;

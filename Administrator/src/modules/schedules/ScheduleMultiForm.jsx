import { useState, useMemo } from 'react';
import { X, Save, ArrowLeft, User, Palette, FileText, CheckSquare, Square } from 'lucide-react';

const ScheduleMultiForm = ({ onSave, onCancel, usuarios = [] }) => {
    const [selectedUsuario, setSelectedUsuario] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [color, setColor] = useState('#3B82F6');
    const [selectedSlots, setSelectedSlots] = useState(new Set());

    const diasSemana = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const diasLabel = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

    // Generar horas del día (6 AM - 11 PM en bloques de 1 hora)
    const horas = useMemo(() => {
        const horasArray = [];
        for (let i = 6; i <= 22; i++) {
            horasArray.push({
                inicio: `${i.toString().padStart(2, '0')}:00`,
                fin: `${(i + 1).toString().padStart(2, '0')}:00`,
                label: `${i}:00`
            });
        }
        return horasArray;
    }, []);

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

    // Crear ID único para cada slot
    const createSlotId = (dia, horaInicio, horaFin) => {
        return `${dia}_${horaInicio}_${horaFin}`;
    };

    // Toggle de selección de slot
    const toggleSlot = (dia, horaInicio, horaFin) => {
        const slotId = createSlotId(dia, horaInicio, horaFin);
        const newSelected = new Set(selectedSlots);

        if (newSelected.has(slotId)) {
            newSelected.delete(slotId);
        } else {
            newSelected.add(slotId);
        }

        setSelectedSlots(newSelected);
    };

    // Verificar si un slot está seleccionado
    const isSlotSelected = (dia, horaInicio, horaFin) => {
        const slotId = createSlotId(dia, horaInicio, horaFin);
        return selectedSlots.has(slotId);
    };

    // Seleccionar/deseleccionar toda una columna (día)
    const toggleDia = (dia) => {
        const newSelected = new Set(selectedSlots);
        const todosSeleccionados = horas.every(hora =>
            isSlotSelected(dia, hora.inicio, hora.fin)
        );

        if (todosSeleccionados) {
            // Deseleccionar todos los slots del día
            horas.forEach(hora => {
                const slotId = createSlotId(dia, hora.inicio, hora.fin);
                newSelected.delete(slotId);
            });
        } else {
            // Seleccionar todos los slots del día
            horas.forEach(hora => {
                const slotId = createSlotId(dia, hora.inicio, hora.fin);
                newSelected.add(slotId);
            });
        }

        setSelectedSlots(newSelected);
    };

    // Seleccionar/deseleccionar toda una fila (hora)
    const toggleHora = (horaInicio, horaFin) => {
        const newSelected = new Set(selectedSlots);
        const todosSeleccionados = diasSemana.every(dia =>
            isSlotSelected(dia, horaInicio, horaFin)
        );

        if (todosSeleccionados) {
            // Deseleccionar todos los slots de la hora
            diasSemana.forEach(dia => {
                const slotId = createSlotId(dia, horaInicio, horaFin);
                newSelected.delete(slotId);
            });
        } else {
            // Seleccionar todos los slots de la hora
            diasSemana.forEach(dia => {
                const slotId = createSlotId(dia, horaInicio, horaFin);
                newSelected.add(slotId);
            });
        }

        setSelectedSlots(newSelected);
    };

    const handleSubmit = () => {
        if (!selectedUsuario) {
            alert('Por favor seleccione un usuario');
            return;
        }

        if (selectedSlots.size === 0) {
            alert('Por favor seleccione al menos un bloque de horario');
            return;
        }

        // Convertir slots seleccionados a bloques individuales
        const bloques = Array.from(selectedSlots).map(slotId => {
            const [dia, horaInicio, horaFin] = slotId.split('_');
            return {
                id: Date.now() + Math.random(),
                id_usuario: parseInt(selectedUsuario),
                dia_semana: dia,
                hora_inicio: horaInicio,
                hora_fin: horaFin,
                descripcion: descripcion,
                color: color,
                activo: true
            };
        });

        onSave(bloques);
    };

    const handleClearAll = () => {
        setSelectedSlots(new Set());
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
                            Asignar Múltiples Horarios
                        </h2>
                        <p className="text-[#6E6E73] mt-1">
                            Selecciona múltiples bloques haciendo clic en la matriz
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-sm text-[#6E6E73]">Bloques seleccionados</div>
                    <div className="text-2xl font-bold text-blue-600">{selectedSlots.size}</div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 space-y-6 border border-[#D2D2D7]">
                {/* Sección: Usuario y configuración */}
                <div>
                    <h3 className="text-lg font-semibold text-[#1D1D1F] mb-4 pb-2 border-b border-[#E5E5E7]">
                        Configuración General
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <User size={16} className="inline mr-1" />
                                Usuario *
                            </label>
                            <select
                                value={selectedUsuario}
                                onChange={(e) => setSelectedUsuario(e.target.value)}
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">-- Seleccione usuario --</option>
                                {usuarios.map(user => (
                                    <option key={user.id} value={user.id}>
                                        {user.nombre} ({user.username})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <Palette size={16} className="inline mr-1" />
                                Color
                            </label>
                            <div className="flex gap-2">
                                {coloresPredefinidos.slice(0, 4).map(({ color: c, nombre }) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-10 h-10 rounded-lg transition-all ${color === c ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : 'hover:scale-105'
                                            }`}
                                        style={{ backgroundColor: c }}
                                        title={nombre}
                                    />
                                ))}
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="w-10 h-10 rounded-lg cursor-pointer border border-[#D2D2D7]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#1D1D1F] mb-2">
                                <FileText size={16} className="inline mr-1" />
                                Descripción
                            </label>
                            <input
                                type="text"
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                placeholder="Ej: Turno Mañana"
                                className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#86868B]"
                            />
                        </div>
                    </div>
                </div>

                {/* Matriz de selección */}
                <div>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E5E5E7]">
                        <h3 className="text-lg font-semibold text-[#1D1D1F]">
                            Seleccionar Bloques de Tiempo
                        </h3>
                        <button
                            onClick={handleClearAll}
                            className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                            Limpiar Todo
                        </button>
                    </div>

                    {/* Instrucciones */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Tip:</strong> Haz clic en las celdas para seleccionar bloques individuales,
                            o haz clic en los encabezados de día/hora para seleccionar columnas/filas completas.
                        </p>
                    </div>

                    {/* Tabla de selección */}
                    <div className="overflow-x-auto border border-[#D2D2D7] rounded-lg">
                        <table className="w-full">
                            <thead className="bg-[#F5F5F7]">
                                <tr>
                                    <th className="p-2 text-xs font-semibold text-[#6E6E73] border-b border-r border-[#D2D2D7] w-20">
                                        Hora
                                    </th>
                                    {diasLabel.map((dia, index) => (
                                        <th
                                            key={dia}
                                            className="p-2 text-xs font-semibold text-[#1D1D1F] border-b border-r border-[#D2D2D7] last:border-r-0 cursor-pointer hover:bg-[#E5E5E7] transition-colors"
                                            onClick={() => toggleDia(diasSemana[index])}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                {dia}
                                                {horas.every(hora => isSlotSelected(diasSemana[index], hora.inicio, hora.fin)) && (
                                                    <CheckSquare size={14} className="text-blue-600" />
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {horas.map((hora, horaIndex) => (
                                    <tr key={hora.inicio} className="hover:bg-[#F5F5F7]">
                                        <td
                                            className="p-2 text-xs font-medium text-[#6E6E73] border-b border-r border-[#D2D2D7] text-center cursor-pointer hover:bg-[#E5E5E7] transition-colors"
                                            onClick={() => toggleHora(hora.inicio, hora.fin)}
                                        >
                                            <div className="flex items-center justify-center gap-1">
                                                {hora.label}
                                                {diasSemana.every(dia => isSlotSelected(dia, hora.inicio, hora.fin)) && (
                                                    <CheckSquare size={14} className="text-blue-600" />
                                                )}
                                            </div>
                                        </td>
                                        {diasSemana.map(dia => {
                                            const selected = isSlotSelected(dia, hora.inicio, hora.fin);
                                            return (
                                                <td
                                                    key={`${dia}_${hora.inicio}`}
                                                    className="p-1 border-b border-r border-[#D2D2D7] last:border-r-0 cursor-pointer transition-all"
                                                    onClick={() => toggleSlot(dia, hora.inicio, hora.fin)}
                                                >
                                                    <div
                                                        className={`h-10 rounded transition-all flex items-center justify-center ${selected
                                                            ? 'shadow-md scale-95'
                                                            : 'hover:bg-[#E5E5E7] hover:scale-95'
                                                            }`}
                                                        style={{
                                                            backgroundColor: selected ? color : 'transparent'
                                                        }}
                                                    >
                                                        {selected && (
                                                            <CheckSquare size={16} className="text-white" />
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Botones de acción */}
                <div className="flex items-center gap-3 pt-4 border-t border-[#E5E5E7]">
                    <button
                        onClick={handleSubmit}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                        <Save size={18} />
                        Guardar {selectedSlots.size} Bloque{selectedSlots.size !== 1 ? 's' : ''}
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

export default ScheduleMultiForm;

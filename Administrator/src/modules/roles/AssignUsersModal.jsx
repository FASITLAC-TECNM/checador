import { useState, useEffect } from 'react';
import { X, User, Check, Save, Search } from 'lucide-react';
import { getUsuarios, obtenerRolesDeUsuario, asignarRolAUsuario, removerRolDeUsuario } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const AssignUsersModal = ({ role, onClose, onUpdate }) => {
    const notification = useNotification();
    const [usuarios, setUsuarios] = useState([]);
    const [usuariosAsignados, setUsuariosAsignados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        cargarDatos();
    }, [role.id]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const todosLosUsuarios = await getUsuarios();

            // Verificar qué usuarios tienen este rol
            const idsUsuariosConRol = [];
            for (const usuario of todosLosUsuarios) {
                try {
                    const roles = await obtenerRolesDeUsuario(usuario.id);
                    const tieneEsteRol = roles.some(r => r.id_rol === role.id);
                    if (tieneEsteRol) {
                        idsUsuariosConRol.push(usuario.id);
                    }
                } catch (error) {
                    console.error(`Error obteniendo roles del usuario ${usuario.id}:`, error);
                }
            }

            setUsuarios(todosLosUsuarios);
            setUsuariosAsignados(idsUsuariosConRol);
        } catch (error) {
            console.error('Error cargando usuarios:', error);
            notification.error('Error de carga', 'Error al cargar usuarios: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleUsuario = (usuarioId) => {
        setUsuariosAsignados(prev => {
            if (prev.includes(usuarioId)) {
                return prev.filter(id => id !== usuarioId);
            } else {
                return [...prev, usuarioId];
            }
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Obtener usuarios actuales con este rol
            const usuariosConRolActual = [];
            for (const usuario of usuarios) {
                try {
                    const roles = await obtenerRolesDeUsuario(usuario.id);
                    const tieneEsteRol = roles.some(r => r.id_rol === role.id);
                    if (tieneEsteRol) {
                        usuariosConRolActual.push(usuario.id);
                    }
                } catch (error) {
                    console.error(`Error obteniendo roles del usuario ${usuario.id}:`, error);
                }
            }

            // Determinar usuarios a agregar
            const usuariosAAgregar = usuariosAsignados.filter(id => !usuariosConRolActual.includes(id));

            // Determinar usuarios a eliminar
            const usuariosAEliminar = usuariosConRolActual.filter(id => !usuariosAsignados.includes(id));

            // Agregar rol a nuevos usuarios
            for (const userId of usuariosAAgregar) {
                await asignarRolAUsuario(userId, role.id);
            }

            // Eliminar rol de usuarios
            for (const userId of usuariosAEliminar) {
                await removerRolDeUsuario(userId, role.id);
            }

            notification.success('Usuarios actualizados', 'Los usuarios se actualizaron correctamente');
            if (onUpdate) await onUpdate();
            onClose();
        } catch (error) {
            console.error('Error guardando usuarios:', error);
            notification.error('Error', 'Error al guardar usuarios: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const getInitials = (nombre) => {
        if (!nombre) return '??';
        const parts = nombre.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return nombre.substring(0, 2).toUpperCase();
    };

    const filteredUsuarios = usuarios.filter(usuario =>
        usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        usuario.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Cargando usuarios...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div
                    className="text-white p-6"
                    style={{ backgroundColor: role.color }}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-1">Asignar Usuarios</h2>
                            <p className="opacity-90">{role.nombre}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-4">
                        <p className="text-gray-600 text-sm mb-4">
                            Selecciona los usuarios que tendrán este rol asignado.
                        </p>

                        {/* Buscador */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, email o username..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                        {filteredUsuarios.length > 0 ? (
                            filteredUsuarios.map((usuario) => {
                                const isSelected = usuariosAsignados.includes(usuario.id);

                                return (
                                    <button
                                        key={usuario.id}
                                        onClick={() => toggleUsuario(usuario.id)}
                                        className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${isSelected
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                            }`}
                                        style={isSelected ? {
                                            borderColor: role.color,
                                            backgroundColor: `${role.color}10`
                                        } : {}}
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Avatar */}
                                            <div
                                                className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white flex-shrink-0 ${isSelected ? '' : 'bg-gray-400'
                                                    }`}
                                                style={isSelected ? { backgroundColor: role.color } : {}}
                                            >
                                                {usuario.foto ? (
                                                    <img src={usuario.foto} alt={usuario.nombre} className="w-full h-full object-cover rounded-lg" />
                                                ) : (
                                                    getInitials(usuario.nombre)
                                                )}
                                            </div>

                                            {/* Información */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium text-gray-900">
                                                    {usuario.nombre}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                                    <span>{usuario.email}</span>
                                                    <span>•</span>
                                                    <span>@{usuario.username}</span>
                                                </div>
                                            </div>

                                            {/* Checkmark */}
                                            {isSelected && (
                                                <div
                                                    className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
                                                    style={{ backgroundColor: role.color }}
                                                >
                                                    <Check size={16} />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="text-center py-12">
                                <User className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                                <p className="text-gray-500">
                                    {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            {usuariosAsignados.length} {usuariosAsignados.length === 1 ? 'usuario seleccionado' : 'usuarios seleccionados'}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 px-5 py-2.5 text-white rounded-lg transition-colors font-medium shadow-sm"
                                style={{
                                    backgroundColor: saving ? '#9CA3AF' : role.color,
                                    cursor: saving ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {saving ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Guardar Cambios
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignUsersModal;

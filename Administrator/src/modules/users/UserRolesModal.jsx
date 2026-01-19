import { useState, useEffect } from 'react';
import { X, Shield, Check, Save } from 'lucide-react';
import { obtenerRoles } from '../../services/rolesService';
import { asignarRolAUsuario, obtenerRolesDeUsuario, removerRolDeUsuario } from '../../services/api';
import { useNotification } from '../../context/NotificationContext';

const UserRolesModal = ({ user, onClose, onUpdate }) => {
    const notification = useNotification();
    const [roles, setRoles] = useState([]);
    const [rolesAsignados, setRolesAsignados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        cargarDatos();
    }, [user.id]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            const [todosLosRoles, rolesDelUsuario] = await Promise.all([
                obtenerRoles(),
                obtenerRolesDeUsuario(user.id)
            ]);

            setRoles(todosLosRoles);
            setRolesAsignados(rolesDelUsuario.map(r => r.id_rol));
        } catch (error) {
            console.error('Error cargando roles:', error);
            notification.error('Error de carga', 'Error al cargar roles: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleRole = (roleId) => {
        setRolesAsignados(prev => {
            if (prev.includes(roleId)) {
                return prev.filter(id => id !== roleId);
            } else {
                return [...prev, roleId];
            }
        });
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            // Obtener roles actuales del usuario
            const rolesActuales = await obtenerRolesDeUsuario(user.id);
            const idsRolesActuales = rolesActuales.map(r => r.id_rol);

            // Determinar roles a agregar
            const rolesAAgregar = rolesAsignados.filter(id => !idsRolesActuales.includes(id));

            // Determinar roles a eliminar
            const rolesAEliminar = idsRolesActuales.filter(id => !rolesAsignados.includes(id));

            // Agregar nuevos roles
            for (const roleId of rolesAAgregar) {
                await asignarRolAUsuario(user.id, roleId);
            }

            // Eliminar roles
            for (const roleId of rolesAEliminar) {
                await removerRolDeUsuario(user.id, roleId);
            }

            notification.success('Roles actualizados', 'Los roles se actualizaron correctamente');
            if (onUpdate) await onUpdate();
            onClose();
        } catch (error) {
            console.error('Error guardando roles:', error);
            notification.error('Error', 'Error al guardar roles: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Cargando roles...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold mb-1">Gestionar Roles</h2>
                            <p className="text-blue-100">{user.nombre}</p>
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
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    <div className="mb-4">
                        <p className="text-gray-600 text-sm">
                            Selecciona los roles que deseas asignar a este usuario.
                            Un usuario puede tener múltiples roles.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roles.map((role) => {
                            const isSelected = rolesAsignados.includes(role.id);

                            return (
                                <button
                                    key={role.id}
                                    onClick={() => toggleRole(role.id)}
                                    className={`relative p-4 rounded-xl border-2 transition-all duration-200 text-left ${isSelected
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                                        }`}
                                    style={isSelected ? {
                                        boxShadow: `0 4px 6px -1px ${role.color}20, 0 2px 4px -1px ${role.color}10`
                                    } : {}}
                                >
                                    {/* Checkmark */}
                                    {isSelected && (
                                        <div
                                            className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center text-white"
                                            style={{ backgroundColor: role.color }}
                                        >
                                            <Check size={16} />
                                        </div>
                                    )}

                                    {/* Icon */}
                                    <div className="flex items-start gap-3 mb-2">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: `${role.color}20` }}
                                        >
                                            <Shield
                                                size={20}
                                                style={{ color: role.color }}
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 mb-0.5 pr-8">
                                                {role.nombre}
                                            </h3>
                                            <p className="text-xs text-gray-500 line-clamp-2">
                                                {role.descripcion || 'Sin descripción'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                                        <span>Jerarquía: {role.jerarquia}</span>
                                        <span>•</span>
                                        <span>{role.usuarios_asignados || 0} usuarios</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {roles.length === 0 && (
                        <div className="text-center py-12">
                            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No hay roles disponibles</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 p-6 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            {rolesAsignados.length} {rolesAsignados.length === 1 ? 'rol seleccionado' : 'roles seleccionados'}
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
                                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors font-medium shadow-sm"
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

export default UserRolesModal;

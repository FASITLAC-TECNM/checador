import { useState, useMemo, useEffect } from 'react';
import { Plus } from 'lucide-react';
import UserList from './UserList';
import UserFormEnhanced from './UserForm';
import UserProfileEnhanced2 from './UserProfile';
import SearchBar from '../../components/utils/SearchBar';
import { getUsuarios, crearUsuario, actualizarUsuario } from '../../services/api';
import {
    crearEmpleado,
    actualizarEmpleado,
    getEmpleadoPorUsuario
} from '../../services/empleadoService';
import {
    crearCredenciales,
    actualizarCredenciales
} from '../../services/credencialesService';

const UserPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [activoFilter, setActivoFilter] = useState('');
    const [estadoFilter, setEstadoFilter] = useState('');


    // Cargar usuarios desde la BD al montar el componente
    useEffect(() => {
        cargarUsuarios();
    }, []);

    const cargarUsuarios = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await getUsuarios();
            setUsers(data);
        } catch (err) {
            setError('Error al cargar usuarios desde la base de datos');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Obtener valores únicos para filtros
    const estadosActivo = ['ACTIVO', 'SUSPENDIDO', 'BAJA'];
    const estadosConexion = ['CONECTADO', 'DESCONECTADO'];

    // Filtrar usuarios
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch =
                user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.username.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesActivo = !activoFilter || user.activo === activoFilter;
            const matchesEstado = !estadoFilter || user.estado === estadoFilter;

            return matchesSearch && matchesActivo && matchesEstado;
        });
    }, [users, searchTerm, activoFilter, estadoFilter]);

    // Estadísticas
    const stats = useMemo(() => {
        return {
            total: users.length,
            activos: users.filter(u => u.activo === 'ACTIVO').length,
            suspendidos: users.filter(u => u.activo === 'SUSPENDIDO').length,
            baja: users.filter(u => u.activo === 'BAJA').length,
            conectados: users.filter(u => u.estado === 'CONECTADO').length,
            desconectados: users.filter(u => u.estado === 'DESCONECTADO').length
        };
    }, [users]);

    const handleUserClick = (user) => {
        setSelectedUser(user);
        setShowProfile(true);
        setShowForm(false);
    };

    const handleAddNew = () => {
        setSelectedUser(null);
        setShowForm(true);
        setShowProfile(false);
    };

    const handleEdit = (user) => {
        setSelectedUser(user);
        setShowForm(true);
        setShowProfile(false);
    };

    const handleBackToList = () => {
        setShowProfile(false);
        setShowForm(false);
        setSelectedUser(null);
    };

    const handleSave = async (userData) => {
        try {
            let usuarioGuardado;

            if (selectedUser) {
                // Actualizar usuario existente
                usuarioGuardado = await actualizarUsuario(userData.id, userData);
            } else {
                // Crear nuevo usuario
                usuarioGuardado = await crearUsuario(userData);
            }

            // Manejar datos de empleado si está marcado como empleado
            if (userData.esEmpleado && userData.datosEmpleado) {
                const empleadoData = {
                    id_usuario: usuarioGuardado.id || userData.id,
                    nss: userData.datosEmpleado.nss,
                    rfc: userData.datosEmpleado.rfc
                };

                const pin = userData.datosEmpleado.pin; // Guardar PIN por separado

                try {
                    // Verificar si ya existe un empleado para este usuario
                    const empleadoExistente = await getEmpleadoPorUsuario(empleadoData.id_usuario);

                    if (empleadoExistente) {
                        // Actualizar empleado existente (sin PIN)
                        await actualizarEmpleado(empleadoExistente.id, {
                            nss: empleadoData.nss,
                            rfc: empleadoData.rfc
                        });
                        console.log('✅ Datos de empleado actualizados');

                        // Actualizar PIN si se proporcionó
                        if (pin && pin.trim()) {
                            try {
                                await actualizarCredenciales(empleadoExistente.id, { pin });
                                console.log('✅ PIN actualizado');
                            } catch (credError) {
                                // Si no existen credenciales, crearlas
                                if (credError.message.includes('404') || credError.message.includes('no encontrado')) {
                                    await crearCredenciales({
                                        id_empleado: empleadoExistente.id,
                                        pin
                                    });
                                    console.log('✅ Credenciales creadas');
                                }
                            }
                        }
                    }
                } catch (error) {
                    // Si no existe, crear nuevo empleado
                    if (error.message.includes('404') || error.message.includes('no encontrado')) {
                        const nuevoEmpleado = await crearEmpleado(empleadoData);
                        console.log('✅ Empleado creado');

                        // Crear credenciales si se proporcionó PIN
                        if (pin && pin.trim()) {
                            await crearCredenciales({
                                id_empleado: nuevoEmpleado.id,
                                pin
                            });
                            console.log('✅ Credenciales creadas');
                        }
                    } else {
                        throw error;
                    }
                }
            }

            // Recargar la lista
            await cargarUsuarios();

            setShowForm(false);
            setShowProfile(false);
            setSelectedUser(null);
        } catch (err) {
            console.error('Error al guardar usuario:', err);
            alert('Error al guardar el usuario: ' + err.message);
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setShowProfile(false);
        setSelectedUser(null);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setActivoFilter('');
        setEstadoFilter('');
    };

    // Mostrar loading
    if (loading) {
        return (
            <div className="min-h-screen bg-[#FBFBFD] p-6 flex items-center justify-center">
                <div className="text-[#1D1D1F] text-xl">Cargando usuarios...</div>
            </div>
        );
    }

    // Mostrar error
    if (error) {
        return (
            <div className="min-h-screen bg-[#FBFBFD] p-6 flex items-center justify-center">
                <div className="bg-red-50 border border-red-300 rounded-xl p-6 max-w-md">
                    <p className="text-red-600 text-lg mb-4">{error}</p>
                    <button
                        onClick={cargarUsuarios}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FBFBFD] p-6">
            <div className="max-w-7xl mx-auto">
                {showProfile ? (
                    <UserProfileEnhanced2
                        user={selectedUser}
                        onEdit={handleEdit}
                        onBack={handleBackToList}
                        onUpdate={cargarUsuarios}
                    />
                ) : showForm ? (
                    <UserFormEnhanced
                        user={selectedUser}
                        onSave={handleSave}
                        onCancel={handleCancel}
                    />
                ) : (
                    <>
                        {/* Header con estadísticas */}
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex-1">
                                <h2 className="text-3xl font-bold text-[#1D1D1F] mb-3">Usuarios</h2>
                                <div className="flex items-center gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                        <span className="font-semibold">{stats.total}</span>
                                        <span className="text-sm">total</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        <span className="font-semibold">{stats.activos}</span>
                                        <span className="text-sm">activos</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-full border border-yellow-200">
                                        <span className="font-semibold">{stats.suspendidos}</span>
                                        <span className="text-sm">suspendidos</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full border border-gray-200">
                                        <span className="font-semibold">{stats.baja}</span>
                                        <span className="text-sm">baja</span>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                                        <span className="font-semibold">{stats.conectados}</span>
                                        <span className="text-sm">conectados</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={handleAddNew}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg font-semibold"
                            >
                                <Plus size={20} />
                                Nuevo Usuario
                            </button>
                        </div>

                        {/* Barra de búsqueda */}
                        <SearchBar
                            placeholder="Buscar por nombre, email o username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="mb-6"
                        />

                        {/* Filtros */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-[#6E6E73] mb-2">Estado Activo</label>
                                <select
                                    value={activoFilter}
                                    onChange={(e) => setActivoFilter(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:border-[#86868B]"
                                >
                                    <option value="">Todos los estados</option>
                                    {estadosActivo.map(estado => (
                                        <option key={estado} value={estado}>{estado}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#6E6E73] mb-2">Estado Conexión</label>
                                <select
                                    value={estadoFilter}
                                    onChange={(e) => setEstadoFilter(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-[#D2D2D7] text-[#1D1D1F] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:border-[#86868B]"
                                >
                                    <option value="">Todos los estados</option>
                                    {estadosConexion.map(estado => (
                                        <option key={estado} value={estado}>{estado}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <UserList
                            users={filteredUsers}
                            onUserClick={handleUserClick}
                            onAddNew={handleAddNew}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default UserPage;
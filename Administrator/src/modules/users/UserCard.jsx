import { Mail, Shield } from 'lucide-react';

const UserCard = ({ user, onClick }) => {
    // Función para obtener el color del badge de estado activo
    const getActivoBadgeColor = (activo) => {
        switch (activo) {
            case 'ACTIVO':
                return 'bg-green-100 text-green-700 border border-green-200';
            case 'SUSPENDIDO':
                return 'bg-yellow-100 text-yellow-700 border border-yellow-200';
            case 'BAJA':
                return 'bg-red-100 text-red-700 border border-red-200';
            default:
                return 'bg-gray-100 text-gray-700 border border-gray-200';
        }
    };

    // Función para obtener el color del indicador de estado de conexión
    const getEstadoColor = (estado) => {
        return estado === 'CONECTADO' ? 'bg-green-500' : 'bg-gray-400';
    };

    return (
        <div
            onClick={() => onClick(user)}
            className="bg-white rounded-xl shadow-sm p-6 cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.02] border border-[#E5E5E7]"
        >
            <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                    {user.foto || user.imagen ? (
                        // Si tiene imagen, mostrar la imagen
                        <img
                            src={user.foto || user.imagen}
                            alt={user.nombre}
                            className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                            onError={(e) => {
                                // Si la imagen falla al cargar, mostrar el avatar con inicial
                                e.target.style.display = 'none';
                                e.target.nextElementSibling.style.display = 'flex';
                            }}
                        />
                    ) : null}

                    {/* Avatar con inicial (mostrar si no hay imagen o si falla) */}
                    <div
                        className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                        style={{ display: (user.foto || user.imagen) ? 'none' : 'flex' }}
                    >
                        {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                    </div>

                    {/* Indicador de estado de conexión */}
                    <div
                        className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${getEstadoColor(user.estado)}`}
                        title={user.estado}
                    >
                    </div>
                </div>

                {/* Información del usuario */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-[#1D1D1F] truncate">{user.nombre}</h3>
                    <p className="text-xs text-[#6E6E73] truncate">@{user.username}</p>
                    <p className="text-sm text-[#6E6E73] truncate flex items-center gap-1 mt-1">
                        <Mail size={14} />
                        {user.email}
                    </p>

                    {/* Badges de estado */}
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {/* Badge de estado activo */}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getActivoBadgeColor(user.activo)}`}>
                            <Shield size={12} />
                            {user.activo}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserCard;
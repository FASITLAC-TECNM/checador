import { useState } from 'react';
import { X, User } from 'lucide-react';

const JefesSelector = ({
    jefesInfo,
    usuarios,
    onAgregarJefe,
    onRemoverJefe
}) => {
    const [searchUsuario, setSearchUsuario] = useState('');
    const [showUsuarioSelector, setShowUsuarioSelector] = useState(false);

    // Filtrar usuarios según búsqueda y excluir ya seleccionados
    const usuariosFiltrados = usuarios.filter(usuario => {
        // Excluir usuarios ya seleccionados
        if (jefesInfo.some(jefe => jefe.id === usuario.id)) {
            return false;
        }

        const searchLower = searchUsuario.toLowerCase();
        return (
            usuario.nombre?.toLowerCase().includes(searchLower) ||
            usuario.email?.toLowerCase().includes(searchLower) ||
            usuario.username?.toLowerCase().includes(searchLower) ||
            usuario.rol?.toLowerCase().includes(searchLower)
        );
    });

    const seleccionarUsuario = (usuario) => {
        onAgregarJefe(usuario);
        setSearchUsuario('');
    };

    return (
        <>
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-[#1D1D1F]">
                        Jefes de Departamento * ({jefesInfo.length})
                    </label>
                    <button
                        type="button"
                        onClick={() => setShowUsuarioSelector(true)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                        + Agregar Jefe
                    </button>
                </div>

                {jefesInfo.length === 0 ? (
                    <button
                        type="button"
                        onClick={() => setShowUsuarioSelector(true)}
                        className="w-full px-4 py-2 bg-[#F5F5F7] border border-[#D2D2D7] text-[#86868B] rounded-lg hover:bg-[#E5E5E7] transition-colors text-left"
                    >
                        Seleccionar jefes de departamento...
                    </button>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {jefesInfo.map((jefe) => (
                            <div key={jefe.id} className="flex items-center gap-2">
                                <div className="flex-1 px-4 py-3 bg-blue-50 border border-blue-200 text-[#1D1D1F] rounded-lg">
                                    <div className="flex items-center gap-3">
                                        {jefe.foto ? (
                                            <img
                                                src={jefe.foto}
                                                alt={jefe.nombre}
                                                className="w-10 h-10 rounded-full object-cover border-2 border-blue-300"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center">
                                                <User size={20} className="text-blue-600" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="font-medium">{jefe.nombre}</div>
                                            <div className="text-sm text-[#6E6E73]">{jefe.email}</div>
                                            {jefe.rol && (
                                                <div className="text-xs text-[#86868B] mt-0.5">
                                                    {jefe.rol}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onRemoverJefe(jefe.id)}
                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Selección de Usuario */}
            {showUsuarioSelector && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-[#E5E5E7]">
                            <div>
                                <h3 className="text-xl font-semibold text-[#1D1D1F]">Seleccionar Jefes de Departamento</h3>
                                <p className="text-sm text-[#6E6E73] mt-1">Puedes seleccionar múltiples jefes</p>
                            </div>
                            <button
                                onClick={() => {
                                    setShowUsuarioSelector(false);
                                    setSearchUsuario('');
                                }}
                                className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors text-[#6E6E73]"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 border-b border-[#E5E5E7]">
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchUsuario}
                                    onChange={(e) => setSearchUsuario(e.target.value)}
                                    placeholder="Buscar por nombre, email, username o rol..."
                                    className="w-full px-4 py-3 pl-10 bg-[#F5F5F7] border border-[#D2D2D7] text-[#1D1D1F] rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-[#86868B]"
                                    autoFocus
                                />
                                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#86868B]" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            {searchUsuario && (
                                <p className="text-sm text-[#6E6E73] mt-2">
                                    {usuariosFiltrados.length} resultado(s) encontrado(s)
                                </p>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {usuariosFiltrados.length > 0 ? (
                                <div className="space-y-2">
                                    {usuariosFiltrados.map((usuario) => (
                                        <button
                                            key={usuario.id}
                                            type="button"
                                            onClick={() => {
                                                seleccionarUsuario(usuario);
                                                setShowUsuarioSelector(false);
                                            }}
                                            className="w-full p-4 bg-[#F5F5F7] hover:bg-blue-50 border border-[#D2D2D7] hover:border-blue-300 rounded-lg transition-all text-left group"
                                        >
                                            <div className="flex items-start gap-3">
                                                {usuario.foto ? (
                                                    <img
                                                        src={usuario.foto}
                                                        alt={usuario.nombre}
                                                        className="w-12 h-12 rounded-full object-cover border-2 border-[#D2D2D7] group-hover:border-blue-400 transition-colors flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0 group-hover:from-blue-500 group-hover:to-blue-700 transition-all">
                                                        <User size={24} className="text-white" />
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <div className="font-semibold text-[#1D1D1F] group-hover:text-blue-600 transition-colors">
                                                        {usuario.nombre}
                                                    </div>
                                                    <div className="text-sm text-[#6E6E73] mt-0.5 truncate">
                                                        {usuario.email}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                                        <span className="text-xs text-[#86868B] bg-white px-2 py-1 rounded border border-[#D2D2D7]">
                                                            @{usuario.username}
                                                        </span>
                                                        {usuario.rol && (
                                                            <span className="text-xs font-medium px-2 py-1 rounded bg-gradient-to-r from-purple-100 to-purple-200 text-purple-700 border border-purple-300">
                                                                {usuario.rol}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="ml-2 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                    <svg width="24" height="24" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="text-[#86868B] mb-2">
                                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <p className="text-[#6E6E73] font-medium">
                                        {jefesInfo.length > 0 ? 'Todos los usuarios ya están seleccionados' : 'No se encontraron usuarios'}
                                    </p>
                                    <p className="text-sm text-[#86868B] mt-1">
                                        {searchUsuario ? 'Intenta con otra búsqueda' : ''}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default JefesSelector;
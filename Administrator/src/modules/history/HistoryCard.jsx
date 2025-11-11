import { User, Shield, Smartphone, Building2, Clock, FileText } from 'lucide-react';

const HistoryCard = ({ record }) => {
    const getTipoIcon = (tipo) => {
        const icons = {
            usuario: <User className="w-5 h-5" />,
            rol: <Shield className="w-5 h-5" />,
            dispositivo: <Smartphone className="w-5 h-5" />,
            departamento: <Building2 className="w-5 h-5" />,
            asistencia: <Clock className="w-5 h-5" />
        };
        return icons[tipo] || <FileText className="w-5 h-5" />;
    };

    const getTipoColor = (tipo) => {
        const colors = {
            usuario: 'bg-blue-50 text-blue-600 border-blue-200',
            rol: 'bg-purple-50 text-purple-600 border-purple-200',
            dispositivo: 'bg-green-50 text-green-600 border-green-200',
            departamento: 'bg-yellow-50 text-yellow-600 border-yellow-200',
            asistencia: 'bg-indigo-50 text-indigo-600 border-indigo-200'
        };
        return colors[tipo] || 'bg-gray-50 text-gray-600 border-gray-200';
    };

    const getAccionColor = (accion) => {
        const colors = {
            'Creación': 'bg-green-50 text-green-600 border-green-200',
            'Edición': 'bg-yellow-50 text-yellow-600 border-yellow-200',
            'Eliminación': 'bg-red-50 text-red-600 border-red-200',
            'Registro': 'bg-blue-50 text-blue-600 border-blue-200'
        };
        return colors[accion] || 'bg-gray-50 text-gray-600 border-gray-200';
    };

    const formatFecha = (fecha) => {
        const date = new Date(fecha);
        return date.toLocaleString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="bg-white rounded-xl border border-[#E5E5E7] shadow-sm hover:shadow-md transition-all duration-200">
            <div className="p-5">
                <div className="flex items-start gap-4">
                    {/* Icono del tipo */}
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 border ${getTipoColor(record.tipo)}`}>
                        {getTipoIcon(record.tipo)}
                    </div>

                    {/* Información principal */}
                    <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <p className="font-medium text-[#1D1D1F] mb-1">
                                    {record.descripcion}
                                </p>
                                <div className="flex items-center gap-3 text-sm text-[#6E6E73]">
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-4 h-4" />
                                        {formatFecha(record.fecha)}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <User className="w-4 h-4" />
                                        {record.usuario}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getAccionColor(record.accion)}`}>
                                    {record.accion}
                                </span>
                                <span className={`px-3 py-1 text-xs font-medium rounded-full border capitalize ${getTipoColor(record.tipo)}`}>
                                    {record.tipo}
                                </span>
                            </div>
                        </div>

                        {/* Detalles adicionales */}
                        {record.detalles && (
                            <div className="mt-3 pt-3 border-t border-[#E5E5E7]">
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                    {Object.entries(record.detalles).map(([key, value]) => (
                                        <div key={key}>
                                            <span className="text-[#86868B] capitalize">{key}:</span>{' '}
                                            <span className="text-[#1D1D1F] font-medium">{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HistoryCard;

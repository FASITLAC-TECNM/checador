import { Shield } from 'lucide-react';
import PermissionCard from './PermissionCard';

const PermissionList = ({ permissions, onEdit, onDelete }) => {
    if (permissions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 px-4">
                <div className="w-20 h-20 bg-[#F5F5F7] rounded-full flex items-center justify-center mb-4">
                    <Shield className="w-10 h-10 text-[#86868B]" />
                </div>
                <h3 className="text-xl font-semibold text-[#1D1D1F] mb-2">
                    No hay permisos registrados
                </h3>
                <p className="text-[#6E6E73] text-center max-w-md">
                    Comienza creando permisos para controlar el acceso a diferentes funcionalidades del sistema
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {permissions.map(permission => (
                <PermissionCard
                    key={permission.id}
                    permission={permission}
                    onEdit={onEdit}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
};

export default PermissionList;

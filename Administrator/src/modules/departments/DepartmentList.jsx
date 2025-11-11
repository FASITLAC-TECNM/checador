import DepartmentCard from './DepartmentCard';
import { Building2 } from 'lucide-react';

const DepartmentList = ({ departments, onEdit, onDelete, onDepartmentClick }) => {
    if (departments.length === 0) {
        return (
            <div className="text-center py-12">
                <Building2 size={48} className="mx-auto text-[#86868B] mb-4" />
                <p className="text-[#6E6E73] mb-4">No se encontraron departamentos</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map(department => (
                <DepartmentCard
                    key={department.id}
                    department={department}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onClick={onDepartmentClick}
                />
            ))}
        </div>
    );
};

export default DepartmentList;

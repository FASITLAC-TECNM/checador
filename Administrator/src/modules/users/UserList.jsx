import { Users, Plus } from 'lucide-react';
import UserCard from './UserCard';

const UserList = ({ users, onUserClick, onAddNew }) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map(user => (
                    <UserCard key={user.id} user={user} onClick={onUserClick} />
                ))}
            </div>

            {users.length === 0 && (
                <div className="text-center py-12">
                    <Users size={48} className="mx-auto text-[#86868B] mb-4" />
                    <p className="text-[#6E6E73] mb-4">No hay usuarios que coincidan con los filtros</p>
                    <button
                        onClick={onAddNew}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} />
                        Agregar Primer Usuario
                    </button>
                </div>
            )}
        </div>
    );
};

export default UserList;
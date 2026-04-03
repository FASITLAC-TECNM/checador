import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import DepartmentList from './DepartmentList';
import DepartmentForm from './DepartmentForm';
import DepartmentDetail from './DepartmentDetail';
import SearchBar from '../../components/utils/SearchBar';
import { getUsuarios } from '../../services/api';
import {
    getDepartamentos,
    crearDepartamento,
    actualizarDepartamento,
    eliminarDepartamento
} from '../../services/departamentosService';
import { useNotification } from '../../context/NotificationContext';

const DepartmentsPage = () => {
    const notification = useNotification();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [usuarios, setUsuarios] = useState([]);

    // Cargar datos desde la BD
    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            setError(null);
            const [deptosData, usuariosData] = await Promise.all([
                getDepartamentos(),
                getUsuarios()
            ]);
            setDepartments(deptosData);
            setUsuarios(usuariosData);
        } catch (err) {
            console.error('Error al cargar datos:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const cargarUsuarios = async () => {
        try {
            const data = await getUsuarios();
            setUsuarios(data);
        } catch (err) {
            console.error('Error al cargar usuarios:', err);
        }
    };

    const filteredDepartments = departments.filter(dept =>
        dept.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dept.descripcion && dept.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (dept.jefes && dept.jefes.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleAdd = () => {
        setEditingDepartment(null);
        setShowForm(true);
    };

    const handleEdit = (department) => {
        setEditingDepartment(department);
        setShowForm(true);
    };

    const handleSave = async (departmentData) => {
        try {
            if (editingDepartment) {
                await actualizarDepartamento(editingDepartment.id, departmentData);
            } else {
                await crearDepartamento(departmentData);
            }
            await cargarDatos();
            setShowForm(false);
            setEditingDepartment(null);
        } catch (err) {
            console.error('Error al guardar departamento:', err);
            notification.error('Error', 'Error al guardar el departamento: ' + err.message);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await notification.confirm('Eliminar departamento', '¿Está seguro de eliminar este departamento?');
        if (confirmed) {
            try {
                await eliminarDepartamento(id);
                notification.success('Departamento eliminado', 'El departamento se eliminó correctamente');
                await cargarDatos();
            } catch (err) {
                console.error('Error al eliminar departamento:', err);
                notification.error('Error', 'Error al eliminar el departamento: ' + err.message);
            }
        }
    };

    const handleCancel = () => {
        setShowForm(false);
        setEditingDepartment(null);
    };

    const handleDepartmentClick = (department) => {
        setSelectedDepartment(department);
    };

    const handleBackFromDetail = () => {
        setSelectedDepartment(null);
    };

    const totalEmpleados = departments.reduce((sum, dept) => sum + (dept.empleados || 0), 0);
    const activos = departments.filter(d => d.activo).length;

    // Filtrar empleados del departamento seleccionado
    const empleadosDelDepartamento = selectedDepartment
        ? usuarios.filter(u => u.departamento === selectedDepartment.nombre)
        : [];

    // Mostrar loading
    if (loading) {
        return (
            <div className="min-h-screen bg-[#FBFBFD] p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-[#6E6E73]">Cargando departamentos...</p>
                </div>
            </div>
        );
    }

    // Mostrar error
    if (error) {
        return (
            <div className="min-h-screen bg-[#FBFBFD] p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                        <p className="text-red-600 font-semibold mb-2">Error al cargar departamentos</p>
                        <p className="text-red-500 mb-4">{error}</p>
                        <button
                            onClick={cargarDatos}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Reintentar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (showForm) {
        return (
            <DepartmentForm
                department={editingDepartment}
                onSave={handleSave}
                onCancel={handleCancel}
            />
        );
    }

    // Si hay un departamento seleccionado, mostrar el detalle
    if (selectedDepartment) {
        return (
            <DepartmentDetail
                department={selectedDepartment}
                empleados={empleadosDelDepartamento}
                onBack={handleBackFromDetail}
                onEdit={handleEdit}
            />
        );
    }

    return (
        <div className="min-h-screen bg-[#FBFBFD] p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header con estadísticas */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold text-[#1D1D1F] mb-3">Departamentos</h2>
                        <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                                <span className="font-semibold">{departments.length}</span>
                                <span className="text-sm">total</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-200">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                <span className="font-semibold">{activos}</span>
                                <span className="text-sm">activos</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                                <span className="font-semibold">{totalEmpleados}</span>
                                <span className="text-sm">empleados</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition-all duration-300 shadow-md hover:shadow-lg font-semibold"
                    >
                        <Plus size={20} />
                        Nuevo Departamento
                    </button>
                </div>
                <SearchBar
                    placeholder="Buscar departamentos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="my-6"
                />
                <DepartmentList
                    departments={filteredDepartments}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDepartmentClick={handleDepartmentClick}
                />
            </div>
        </div>
    );
};

export default DepartmentsPage;

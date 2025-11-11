import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import DepartmentList from './DepartmentList';
import DepartmentForm from './DepartmentForm';
import DepartmentDetail from './DepartmentDetail';
import SearchBar from '../../components/utils/SearchBar';
import { getUsuarios } from '../../services/api';

const DepartmentsPage = () => {
    const [departments, setDepartments] = useState([
        {
            id: 1,
            nombre: 'Recursos Humanos',
            descripcion: 'Gestión de personal y contrataciones',
            jefe: 'Paola Baldovinos',
            empleados: 8,
            color: '#8b5cf6',
            activo: true,
            fechaCreacion: '2024-01-15'
        },
        {
            id: 2,
            nombre: 'Tecnología',
            descripcion: 'Desarrollo y mantenimiento de sistemas',
            jefe: 'Daniel Soto',
            empleados: 15,
            color: '#3b82f6',
            activo: true,
            fechaCreacion: '2024-01-15'
        },
        {
            id: 3,
            nombre: 'Ventas',
            descripcion: 'Gestión comercial y atención al cliente',
            jefe: 'Daniel Amaya',
            empleados: 12,
            color: '#10b981',
            activo: true,
            fechaCreacion: '2024-01-15'
        },
        {
            id: 4,
            nombre: 'Producción',
            descripcion: 'Fabricación y control de calidad',
            jefe: 'Edgar Yahir',
            empleados: 25,
            color: '#f59e0b',
            activo: true,
            fechaCreacion: '2024-02-01'
        },
        {
            id: 5,
            nombre: 'Finanzas',
            descripcion: 'Contabilidad y control financiero',
            jefe: 'Paul Torres',
            empleados: 6,
            color: '#ef4444',
            activo: true,
            fechaCreacion: '2024-01-15'
        }
    ]);

    const [showForm, setShowForm] = useState(false);
    const [editingDepartment, setEditingDepartment] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [usuarios, setUsuarios] = useState([]);

    // Cargar usuarios desde la BD
    useEffect(() => {
        cargarUsuarios();
    }, []);

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
        dept.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept.jefe.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAdd = () => {
        setEditingDepartment(null);
        setShowForm(true);
    };

    const handleEdit = (department) => {
        setEditingDepartment(department);
        setShowForm(true);
    };

    const handleSave = (departmentData) => {
        if (editingDepartment) {
            setDepartments(departments.map(d =>
                d.id === editingDepartment.id ? { ...departmentData, id: d.id } : d
            ));
        } else {
            setDepartments([...departments, {
                ...departmentData,
                id: Date.now(),
                empleados: 0,
                fechaCreacion: new Date().toISOString().split('T')[0]
            }]);
        }
        setShowForm(false);
    };

    const handleDelete = (id) => {
        if (confirm('¿Está seguro de eliminar este departamento?')) {
            setDepartments(departments.filter(d => d.id !== id));
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

    const totalEmpleados = departments.reduce((sum, dept) => sum + dept.empleados, 0);
    const activos = departments.filter(d => d.activo).length;

    // Filtrar empleados del departamento seleccionado
    const empleadosDelDepartamento = selectedDepartment
        ? usuarios.filter(u => u.departamento === selectedDepartment.nombre)
        : [];

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

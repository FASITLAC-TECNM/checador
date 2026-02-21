import { useState, useEffect } from "react";
import { getEmpleadoConHorario, getDepartamentosPorEmpleadoId } from "../services/empleadoService";
import { getAvisosDeEmpleado } from "../services/avisosService";

export const useEmployeeData = (usuario) => {
    const [empleadoData, setEmpleadoData] = useState(null);
    const [loadingEmpleado, setLoadingEmpleado] = useState(false);
    const [departamentos, setDepartamentos] = useState([]);
    const [notices, setNotices] = useState([]);

    // Cargar datos completos del empleado al montar el componente
    useEffect(() => {
        const cargarDatosEmpleado = async () => {
            // Solo cargar si es empleado y no tenemos ya el horario
            if (usuario?.es_empleado && !usuario?.horario && usuario?.horario_id) {
                setLoadingEmpleado(true);
                try {
                    const datos = await getEmpleadoConHorario(usuario);
                    if (datos) {
                        setEmpleadoData(datos);
                    }
                } catch (error) {
                    console.error("❌ Error cargando datos del empleado:", error);
                } finally {
                    setLoadingEmpleado(false);
                }
            } else if (usuario?.horario) {
                // Ya tenemos el horario, no necesitamos cargar
                setEmpleadoData(usuario);
            }
        };

        cargarDatosEmpleado();
    }, [usuario]);

    // Cargar departamentos del empleado
    useEffect(() => {
        const cargarDepartamentos = async () => {
            const empleadoId = usuario?.empleado_id;

            if (empleadoId) {
                try {
                    const deptos = await getDepartamentosPorEmpleadoId(empleadoId);
                    setDepartamentos(deptos);
                } catch (error) {
                    console.error("❌ Error cargando departamentos:", error);
                }
            }
        };

        if (usuario?.es_empleado) {
            cargarDepartamentos();
        }
    }, [usuario]);

    // Cargar avisos personales del empleado
    useEffect(() => {
        const cargarAvisos = async () => {
            const empId = usuario?.empleado_id;
            if (!empId) return;
            try {
                const data = await getAvisosDeEmpleado(empId);
                setNotices(data);
            } catch (error) {
                console.error("Error cargando avisos del empleado:", error);
            }
        };
        if (usuario?.es_empleado) {
            cargarAvisos();
        }
    }, [usuario]);

    // Combinar datos del usuario con los datos del empleado cargados
    const datosCompletos = empleadoData || usuario;

    return { datosCompletos, loadingEmpleado, departamentos, notices, setNotices };
};

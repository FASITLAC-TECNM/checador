import { useState, useEffect } from "react";
import { obtenerEscritorio } from "../services/escritorioService";

export const useNodeStatus = () => {
    const [isNodeDisabled, setIsNodeDisabled] = useState(false);
    const [nodeInfo, setNodeInfo] = useState(null);
    const [isCheckingNode, setIsCheckingNode] = useState(false);

    const checkNodeStatus = async () => {
        // escritorio_id se guarda en localStorage directamente
        const escritorioId = localStorage.getItem("escritorio_id");
        if (!escritorioId) return;

        try {
            setIsCheckingNode(true);
            // Usamos el servicio existente que ya maneja auth y fallbacks
            const nodo = await obtenerEscritorio(escritorioId);
            if (nodo) {
                setNodeInfo(nodo);
                // es_activo puede llegar como boolean false o número 0
                const disabled = nodo.es_activo === false || nodo.es_activo === 0;
                setIsNodeDisabled(disabled);
            }
        } catch (error) {
            console.warn("No se pudo verificar el estado del nodo:", error);
        } finally {
            setIsCheckingNode(false);
        }
    };

    useEffect(() => {
        checkNodeStatus();
        const interval = setInterval(checkNodeStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    return { isNodeDisabled, setIsNodeDisabled, nodeInfo, setNodeInfo, isCheckingNode, checkNodeStatus };
};

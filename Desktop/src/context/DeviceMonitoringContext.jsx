import React, { createContext, useState, useEffect, useRef, useCallback, useContext } from 'react';
import { deviceDetectionService } from '../services/deviceDetectionService';
import { getApiEndpoint, fetchApi, API_CONFIG } from '../config/apiEndPoint';

const DeviceMonitoringContext = createContext();

export const DeviceMonitoringProvider = ({ children }) => {
    const [devices, setDevices] = useState([]);
    const [isChecking, setIsChecking] = useState(false);
    const [lastChecked, setLastChecked] = useState(null);

    // Refs for stability
    const devicesRef = useRef(devices);
    const isCheckingRef = useRef(false);
    const isMountedRef = useRef(true);
    const intervalRef = useRef(null);
    const debounceTimeoutRef = useRef(null);
    const initialCheckDoneRef = useRef(false);

    useEffect(() => {
        devicesRef.current = devices;
    }, [devices]);

    const getAuthToken = useCallback(() => localStorage.getItem("auth_token"), []);
    const getEscritorioId = useCallback(() => localStorage.getItem("escritorio_id"), []);

    const normalizeName = useCallback((name) => {
        if (!name) return "";
        return name
            .toLowerCase()
            .replace(/[®™©]/g, "")
            .replace(/[-_]/g, " ")
            .replace(/\s+/g, " ")
            .replace(
                /\b(hd|camera|webcam|usb|web|integrated|built-in|truevision|general)\b/gi,
                ""
            )
            .trim();
    }, []);

    const checkDeviceStatuses = useCallback(async () => {
        const escritorioId = getEscritorioId();
        if (!escritorioId || isCheckingRef.current) return;

        isCheckingRef.current = true;
        setIsChecking(true);

        try {
            const token = getAuthToken();
            const headers = {
                "Content-Type": "application/json",
                ...(token && { Authorization: `Bearer ${token}` }),
            };

            let registeredDevices = [];
            try {
                // 1. Fetch registered devices from backend (might fail in Kiosk mode with 401)
                const responseReg = await fetchApi(
                    `${API_CONFIG.ENDPOINTS.BIOMETRICO}?escritorio_id=${escritorioId}`,
                    { headers }
                );
                registeredDevices = Array.isArray(responseReg.data || responseReg)
                    ? (responseReg.data || responseReg)
                    : [];
            } catch (e) {
                if (e.message && e.message.includes('401')) {
                    console.log("[DeviceMonitor] GET restringido (esperado en Kiosk sin auth_token)");
                } else {
                    console.error("[DeviceMonitor] Error obteniendo dispositivos:", e);
                }
            }

            // 2. Scan physical hardware
            const [usbDevices, webcams, biometricos] = await Promise.all([
                deviceDetectionService.detectUSBDevices(),
                deviceDetectionService.detectWebcams(),
                deviceDetectionService.detectBiometricDevices() // Incluir lectores de huella
            ]);
            const localHardware = deviceDetectionService.mergeDetectedDevices(usbDevices, webcams).concat(biometricos);

            let hasChanges = false;
            let stateChangedDevices = [];

            // 3. Match backend devices against local hardware
            const nextDevicesState = [];

            for (let regDevice of registeredDevices) {
                if (!regDevice.es_activo) {
                    nextDevicesState.push(regDevice);
                    continue;
                }

                const regName = normalizeName(regDevice.nombre);

                let foundInHardware = localHardware.find((hw) => {
                    const hwId = hw.deviceId || hw.instanceId || hw.device_id;

                    if (regDevice.device_id && hwId) {
                        return regDevice.device_id === hwId;
                    }

                    const hwName = normalizeName(hw.name);
                    if (!hwName || !regName) return false;

                    return (regName === hwName || regName.includes(hwName) || hwName.includes(regName));
                });

                const hwIdAttached = foundInHardware?.deviceId || foundInHardware?.instanceId || foundInHardware?.device_id;

                // Auto-Vinculación (Primer uso o si no tenía device_id previo)
                if (foundInHardware && !regDevice.device_id && hwIdAttached) {
                    try {
                        await fetchApi(`${API_CONFIG.ENDPOINTS.BIOMETRICO}/${regDevice.id}`, {
                            method: 'PUT',
                            headers,
                            body: JSON.stringify({ device_id: hwIdAttached })
                        });
                        console.log(`[DeviceMonitor] Dispositivo vinculado automáticamente al hardware ID: ${hwIdAttached}`);
                        regDevice.device_id = hwIdAttached;
                    } catch (e) {
                        console.error("[DeviceMonitor] Error vinculando dispositivo:", e);
                    }
                }

                const newEstado = foundInHardware ? "conectado" : "desconectado";

                if (regDevice.estado !== newEstado) {
                    hasChanges = true;
                    stateChangedDevices.push({ id: regDevice.id, estado: newEstado });
                    nextDevicesState.push({ ...regDevice, estado: newEstado });
                } else {
                    nextDevicesState.push(regDevice);
                }
            }

            if (!isMountedRef.current) return;

            // 4. Always extract physical device_ids that are currently local
            const connectedDeviceIds = localHardware
                .map(hw => hw.deviceId || hw.instanceId || hw.device_id)
                .filter(Boolean);

            let finalDevicesState = nextDevicesState;

            // 5. Notify backend via bulk sync-status and use its True Response
            try {
                const syncResponse = await fetchApi(`${API_CONFIG.ENDPOINTS.BIOMETRICO}/sync-status`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        escritorio_id: escritorioId,
                        device_ids: connectedDeviceIds
                    })
                });

                // El backend devuelve en syncResponse.data exactamente las cámaras "conectadas" y legales
                const authDevices = syncResponse?.data || [];

                // Reconstruimos el state local usando la verdad del Backend
                if (authDevices.length > 0) {
                    // Mezclamos los autorizados del backend, asegurando que estén "conectados"
                    finalDevicesState = authDevices.map(dbDevice => ({
                        ...dbDevice,
                        estado: 'conectado'
                    }));
                    hasChanges = true;
                } else {
                    // Backend no autorizó nada: usar fallback local para lectores biométricos
                    const dactilares = biometricos.filter(b => b.type === 'dactilar' && b.detected);
                    if (dactilares.length > 0) {
                        // Mantener cámaras existentes del estado previo y agregar lectores locales
                        const camerasFromState = nextDevicesState.filter(d => d.tipo === 'facial');
                        finalDevicesState = [
                            ...camerasFromState,
                            ...dactilares.map((b, idx) => ({
                                id: b.id || `local-dactilar-${idx}`,
                                nombre: b.name || 'Lector de Huella',
                                device_id: b.instanceId || b.deviceId || null,
                                tipo: 'dactilar',
                                estado: 'conectado',
                                es_activo: true,
                            }))
                        ];
                    } else if (registeredDevices.length === 0) {
                        // Sin backend ni hardware local, forzar estado vacío
                        finalDevicesState = [];
                    }
                    hasChanges = true;
                }
            } catch (e) {
                console.error("[DeviceMonitor] Error sincronizando estado con el backend:", e);
                // Si la sincronización falla (quizá red), mantenemos el estado local como fallback
                if (registeredDevices.length === 0 && localHardware.length > 0 && finalDevicesState.length === 0) {
                    finalDevicesState = localHardware.map((hw, idx) => ({
                        id: hw.instanceId || hw.deviceId || `local_${idx}`,
                        nombre: hw.name || "Dispositivo Local",
                        device_id: hw.deviceId || hw.instanceId,
                        estado: 'conectado',
                        es_activo: true,
                        tipo: hw.kind === 'videoinput' || hw.name?.toLowerCase().includes('cam') ? 'facial' : 'dactilar'
                    }));
                }
            }

            if (JSON.stringify(finalDevicesState) !== JSON.stringify(devicesRef.current)) {
                setDevices(finalDevicesState);
            }

            setLastChecked(new Date());

        } catch (error) {
            console.error("[DeviceMonitor] Error in global monitoring logic:", error);
        } finally {
            isCheckingRef.current = false;
            if (isMountedRef.current) {
                setIsChecking(false);
            }
        }
    }, [getAuthToken, getEscritorioId, normalizeName]);

    const debouncedCheck = useCallback((delay = 300) => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(checkDeviceStatuses, delay);
    }, [checkDeviceStatuses]);

    // Initial Check
    useEffect(() => {
        if (!initialCheckDoneRef.current) {
            initialCheckDoneRef.current = true;
            const timeout = setTimeout(checkDeviceStatuses, 500);
            return () => clearTimeout(timeout);
        }
    }, [checkDeviceStatuses]);

    // Periodic Polling (Fallback)
    useEffect(() => {
        if (!intervalRef.current) {
            intervalRef.current = setInterval(checkDeviceStatuses, 10000);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [checkDeviceStatuses]);

    // Hardware Events Listener
    useEffect(() => {
        const handleDeviceChange = () => {
            console.log("[DeviceMonitor] Hot-Plug (Navigator MediaDevices)");
            debouncedCheck(300);
        };

        if (navigator.mediaDevices) {
            navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
        }

        let removeElectronListener = null;
        if (window.electronAPI?.onUSBDeviceChange) {
            removeElectronListener = window.electronAPI.onUSBDeviceChange(() => {
                console.log("[DeviceMonitor] Hot-Plug (Electron USB)");
                debouncedCheck(300);
            });
        }

        return () => {
            if (navigator.mediaDevices) {
                navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
            }
            if (typeof removeElectronListener === 'function') {
                removeElectronListener();
            }
            if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        };
    }, [debouncedCheck]);

    // Clean up on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return (
        <DeviceMonitoringContext.Provider value={{ devices, isChecking, lastChecked, checkNow: checkDeviceStatuses }}>
            {children}
        </DeviceMonitoringContext.Provider>
    );
};

export const useGlobalDeviceStatus = () => {
    const context = useContext(DeviceMonitoringContext);
    if (context === undefined) {
        throw new Error('useGlobalDeviceStatus must be used within a DeviceMonitoringProvider');
    }
    return context;
};

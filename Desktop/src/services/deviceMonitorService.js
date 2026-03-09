
import { API_CONFIG, fetchApi } from "../config/apiEndPoint";

class DeviceMonitorService {
    constructor() {
        this.intervalId = null;
        this.isMonitoring = false;
        this.checkInterval = 30000;
        this.ws = null;
        this.biometricConnected = false;
        this.isWsConnecting = false;
        this.reconnectTimeout = null;
    }

    /**
     * Inicia el monitoreo de dispositivos
     */
    startMonitoring(intervalMs = 30000) {
        if (this.isMonitoring) return;

        this.checkInterval = intervalMs;
        this.isMonitoring = true;

        console.log(`[DeviceMonitor] Iniciando monitoreo...`);

        // 1. Conectar WebSocket persistente para eventos en tiempo real
        this.connectWebSocket();

        // 2. Escuchar cambios de hardware en el navegador (para cámaras USB)
        if (navigator.mediaDevices) {
            navigator.mediaDevices.ondevicechange = () => {
                console.log("[DeviceMonitor] 📷 Cambio de hardware detectado (navegador)");
                // Pequeño delay para dar tiempo al navegador de actualizar la lista
                setTimeout(() => this.checkDevices(), 1000);
            };
        }

        // 3. Ejecutar verificación inicial completa
        this.checkDevices();

        // 4. Iniciar loop de respaldo (polling)
        this.intervalId = setInterval(() => {
            this.checkDevices();
        }, this.checkInterval);
    }

    /**
     * Detiene el monitoreo
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        if (navigator.mediaDevices) {
            navigator.mediaDevices.ondevicechange = null;
        }

        this.closeWebSocket();
        this.isMonitoring = false;
        console.log("[DeviceMonitor] Monitoreo detenido");
    }

    /**
     * Gestiona la conexión persistente con el middleware
     */
    connectWebSocket() {
        if (this.ws?.readyState === WebSocket.OPEN || this.isWsConnecting) return;

        this.isWsConnecting = true;
        try {
            this.ws = new WebSocket("ws://localhost:8787/");

            this.ws.onopen = () => {
                console.log("[DeviceMonitor] WS Conectado a BiometricMiddleware");
                this.isWsConnecting = false;
                // Solicitar estado inicial
                this.ws.send(JSON.stringify({ command: "getStatus" }));
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWsMessage(data);
                } catch (e) {
                    console.error("[DeviceMonitor] Error parseando mensaje WS:", e);
                }
            };

            this.ws.onclose = () => {
                console.log("[DeviceMonitor] WS Desconectado");
                this.biometricConnected = false;
                this.isWsConnecting = false;
                this.ws = null;

                // Intentar reconectar si sigue monitoreando
                if (this.isMonitoring) {
                    this.reconnectTimeout = setTimeout(() => this.connectWebSocket(), 5000);
                }
            };

            this.ws.onerror = (err) => {
                console.warn("[DeviceMonitor] Error WS:", err);
                this.isWsConnecting = false;
                // Dejar que onclose maneje la reconexión
            };

        } catch (error) {
            console.error("[DeviceMonitor] Excepción al conectar WS:", error);
            this.isWsConnecting = false;
        }
    }

    closeWebSocket() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Maneja los mensajes del WebSocket (Event-Driven)
     */
    async handleWsMessage(data) {
        // Actualizar estado interno
        if (data.type === "systemStatus") {
            const connected = data.readerConnected;
            // Si el estado interno cambia, actualizar inmediatamente
            if (this.biometricConnected !== connected) {
                this.biometricConnected = connected;
                this.updateBiometricDevices(connected ? 'conectado' : 'desconectado');
            }
        }
        else if (data.type === "readerConnection") {
            const connected = data.connected;
            console.log(`[DeviceMonitor] Evento de lector: ${connected ? 'CONECTADO' : 'DESCONECTADO'}`);
            this.biometricConnected = connected;
            // Actualización inmediata disparada por evento
            this.updateBiometricDevices(connected ? 'conectado' : 'desconectado');
        }
    }

    /**
     * Actualiza todos los dispositivos dactilares registrados
     */
    async updateBiometricDevices(estado) {
        try {
            // Obtener solo dispositivos dactilares registrados
            const response = await fetchApi(`/api/biometrico?tipo=dactilar&es_activo=true`);
            if (response.success && response.data) {
                for (const device of response.data) {
                    // Solo actualizar si el estado es diferente
                    if (device.estado !== estado) {
                        await this.updateDeviceStatus(device.id, estado);
                    }
                }
            }
        } catch (error) {
            console.error("[DeviceMonitor] Error actualizando biométricos:", error);
        }
    }

    /**
     * Ciclo de verificación (Polling)
     * Sirve como respaldo y para dispositivos no-WebSocket (cámaras)
     */
    async checkDevices() {
        try {
            const response = await fetchApi(`/api/biometrico?es_activo=true`);

            if (!response.success) return;

            const devices = response.data || [];
            if (devices.length === 0) return;

            for (const device of devices) {
                let status = 'desconectado';

                if (device.tipo === 'dactilar') {
                    // Usar el estado mantenido por el WS persistente
                    // Si el WS no está conectado, asumimos desconectado
                    status = (this.ws?.readyState === WebSocket.OPEN && this.biometricConnected)
                        ? 'conectado'
                        : 'desconectado';

                    // Intento de reconexión si el WS murió pero estamos en ciclo de check
                    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                        this.connectWebSocket();
                    }

                } else if (device.tipo === 'facial') {
                    status = await this.checkCameraStatus(device);
                }

                if (device.estado !== status) {
                    await this.updateDeviceStatus(device.id, status);
                }
            }

        } catch (error) {
            console.error("[DeviceMonitor] Error en ciclo de verificación:", error);
        }
    }

    /**
     * Verifica estatus de cámara usando mediaDevices.
     * FIX: Solicita permiso primero para obtener labels reales,
     * y usa matching flexible para tolerar diferencias en nombre.
     */
    async checkCameraStatus(device) {
        try {
            // Las cámaras IP siempre se consideran conectadas si tienen IP
            if (device.connection === 'IP' && device.ip) return 'conectado';

            if (!navigator.mediaDevices?.enumerateDevices) return 'desconectado';

            // FIX CRÍTICO: Solicitar acceso a la cámara para que el navegador
            // devuelva labels reales. Sin este paso, enumerateDevices() retorna
            // etiquetas vacías y la comparación SIEMPRE falla.
            let stream = null;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            } catch {
                // Sin permiso, intentar enumeración de todas formas (puede haber label si ya fue concedido antes)
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');

            // Detener el stream inmediatamente para liberar la cámara
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }

            // Si no hay ninguna cámara conectada, definitivamente desconectado
            if (videoDevices.length === 0) return 'desconectado';

            // Si hay cámara registrada por nombre, intentar coincidencia flexible
            if (device.nombre) {
                const normalize = (str) => str?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
                const targetName = normalize(device.nombre);

                console.log(`[DeviceMonitor] Buscando cámara: "${device.nombre}" (norm: ${targetName})`);
                console.log(`[DeviceMonitor] Cámaras detectadas:`, videoDevices.map(d => `"${d.label}" (norm: ${normalize(d.label)})`));

                // Intentar coincidencia: ¿el label contiene el nombre registrado o viceversa?
                const nameFound = videoDevices.some(d => {
                    const label = normalize(d.label);
                    if (!label) return false; // Sin label = sin permiso, saltar
                    return label.includes(targetName) || targetName.includes(label);
                });

                if (nameFound) {
                    console.log(`[DeviceMonitor] ✅ Cámara encontrada por nombre`);
                    return 'conectado';
                }

                // FIX FALLBACK: Si el label está vacío (permisos no concedidos aún)
                // pero hay al menos una cámara de video disponible, considerar conectado.
                // El nombre registrado puede no coincidir exactamente con el label del OS.
                const hasAnyLabel = videoDevices.some(d => d.label && d.label.length > 0);
                if (!hasAnyLabel) {
                    console.log(`[DeviceMonitor] ⚠️ Labels vacíos (sin permisos), asumiendo conectado con ${videoDevices.length} cámara(s)`);
                    return 'conectado';
                }

                // Hay labels pero ninguno coincide con el nombre registrado
                console.log(`[DeviceMonitor] ⚠️ Cámara registrada "${device.nombre}" no encontrada. Cámaras presentes: ${videoDevices.map(d => d.label).join(', ')}`);
                // Si solo hay una cámara conectada, es casi seguro la misma
                if (videoDevices.length === 1) {
                    console.log(`[DeviceMonitor] ✅ Solo hay 1 cámara, asumiendo que es la registrada`);
                    return 'conectado';
                }

                return 'desconectado';
            }

            // Sin nombre registrado: conectado si hay alguna cámara
            return videoDevices.length > 0 ? 'conectado' : 'desconectado';
        } catch (error) {
            console.error('[DeviceMonitor] Error verificando cámara:', error);
            return 'desconectado';
        }
    }

    /**
     * Envía la actualización de estado al servidor
     */
    async updateDeviceStatus(id, estado) {
        try {
            console.log(`[DeviceMonitor] 📡 Enviando actualización: ${id} -> ${estado}`);
            await fetchApi(`/api/biometrico/${id}/estado`, {
                method: 'PATCH',
                body: JSON.stringify({ estado })
            });
        } catch (error) {
            console.error(`[DeviceMonitor] Error updateDeviceStatus:`, error);
        }
    }
}

export const deviceMonitorService = new DeviceMonitorService();

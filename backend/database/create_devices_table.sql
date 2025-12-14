-- Tabla para dispositivos
CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    ubicacion VARCHAR(255),
    tipo VARCHAR(50) CHECK (tipo IN ('Registro Físico', 'Móvil', 'Biométrico')) NOT NULL,
    estado VARCHAR(50) CHECK (estado IN ('Activo', 'Inactivo', 'En Mantenimiento', 'Fuera de Servicio')) DEFAULT 'Activo',
    ultimo_ping TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    version_firmware VARCHAR(100),
    configuracion JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_devices_tipo ON devices(tipo);
CREATE INDEX IF NOT EXISTS idx_devices_estado ON devices(estado);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_devices_timestamp ON devices;
CREATE TRIGGER trigger_update_devices_timestamp
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_devices_updated_at();

-- Comentarios para documentación
COMMENT ON TABLE devices IS 'Tabla de dispositivos del sistema (escritorio, móviles, biométricos)';
COMMENT ON COLUMN devices.device_id IS 'Identificador único del dispositivo (MAC, IMEI, etc)';
COMMENT ON COLUMN devices.tipo IS 'Tipo de dispositivo: Registro Físico, Móvil, Biométrico';
COMMENT ON COLUMN devices.estado IS 'Estado del dispositivo: Activo, Inactivo, En Mantenimiento, Fuera de Servicio';
COMMENT ON COLUMN devices.configuracion IS 'Configuración adicional del dispositivo en formato JSON';

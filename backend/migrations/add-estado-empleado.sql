-- ===================================================
-- Migración: Agregar sistema de estados al empleado
-- ===================================================
-- Descripción: Permite gestionar el estado laboral del empleado
-- independiente del estado de autenticación del usuario
-- ===================================================

-- 1. Crear el tipo ENUM para estados de empleado
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_empleado_enum') THEN
        CREATE TYPE estado_empleado_enum AS ENUM (
            'ACTIVO',           -- Trabajando normalmente
            'LICENCIA',         -- Licencia médica o personal
            'VACACIONES',       -- Periodo vacacional
            'BAJA_TEMPORAL',    -- Suspensión temporal
            'BAJA_DEFINITIVA'   -- Ya no trabaja en la empresa
        );
    END IF;
END $$;

-- 2. Agregar columna estado_empleado
ALTER TABLE empleado
ADD COLUMN IF NOT EXISTS estado_empleado estado_empleado_enum DEFAULT 'ACTIVO';

-- 3. Actualizar empleados existentes según campo activo
UPDATE empleado
SET estado_empleado = CASE
    WHEN activo = TRUE THEN 'ACTIVO'::estado_empleado_enum
    ELSE 'BAJA_TEMPORAL'::estado_empleado_enum
END
WHERE estado_empleado IS NULL;

-- 4. Hacer la columna NOT NULL
ALTER TABLE empleado
ALTER COLUMN estado_empleado SET NOT NULL;

-- 5. Agregar índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_empleado_estado
ON empleado(estado_empleado);

-- 6. Agregar campos de auditoría
ALTER TABLE empleado
ADD COLUMN IF NOT EXISTS fecha_cambio_estado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS motivo_cambio_estado VARCHAR(500);

-- 7. Crear función de auditoría automática
CREATE OR REPLACE FUNCTION actualizar_fecha_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado_empleado IS DISTINCT FROM NEW.estado_empleado THEN
        NEW.fecha_cambio_estado = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Crear trigger para auditoría
DROP TRIGGER IF EXISTS trigger_cambio_estado_empleado ON empleado;
CREATE TRIGGER trigger_cambio_estado_empleado
    BEFORE UPDATE ON empleado
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_fecha_cambio_estado();

-- 9. Verificar estructura
SELECT
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'empleado'
ORDER BY ordinal_position;

-- 10. Verificar datos
SELECT
    id,
    id_usuario,
    nss,
    estado_empleado,
    activo,
    fecha_cambio_estado
FROM empleado
ORDER BY id;

-- 11. Vista de estadísticas
CREATE OR REPLACE VIEW vista_estadisticas_empleados AS
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN estado_empleado = 'ACTIVO' THEN 1 END) as activos,
    COUNT(CASE WHEN estado_empleado = 'LICENCIA' THEN 1 END) as en_licencia,
    COUNT(CASE WHEN estado_empleado = 'VACACIONES' THEN 1 END) as en_vacaciones,
    COUNT(CASE WHEN estado_empleado = 'BAJA_TEMPORAL' THEN 1 END) as baja_temporal,
    COUNT(CASE WHEN estado_empleado = 'BAJA_DEFINITIVA' THEN 1 END) as baja_definitiva
FROM empleado;

SELECT * FROM vista_estadisticas_empleados;

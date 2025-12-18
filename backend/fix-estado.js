import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'Checador',
    user: 'postgres',
    password: 'Minions090405'
});

async function fixEstado() {
    try {
        const result = await pool.query(
            'UPDATE empleado_departamento SET estado = true WHERE id = 10 RETURNING *'
        );
        console.log('✅ Registro actualizado:', result.rows[0]);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixEstado();

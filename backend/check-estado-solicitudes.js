import { pool } from './src/config/db.js';

async function checkEstados() {
    try {
        const result = await pool.query(`
            SELECT id, nombre, correo, estado, sistema_operativo, fecha_solicitud
            FROM solicitudmovil
            ORDER BY id
        `);

        console.log('\n📋 SOLICITUDES MÓVILES EN LA BASE DE DATOS:\n');
        console.log('═══════════════════════════════════════════════════\n');

        if (result.rows.length === 0) {
            console.log('⚠️  No hay solicitudes en la base de datos\n');
        } else {
            result.rows.forEach(sol => {
                console.log(`ID: ${sol.id}`);
                console.log(`   Nombre: ${sol.nombre}`);
                console.log(`   Correo: ${sol.correo}`);
                console.log(`   Estado: "${sol.estado}" (longitud: ${sol.estado?.length})`);
                console.log(`   SO: ${sol.sistema_operativo}`);
                console.log(`   Fecha: ${sol.fecha_solicitud}`);
                console.log('');
            });

            console.log(`Total: ${result.rows.length} solicitudes\n`);

            // Verificar si hay problemas con el estado
            const estadosUnicos = [...new Set(result.rows.map(r => r.estado))];
            console.log('Estados únicos encontrados:', estadosUnicos);
            console.log('\n⚠️  IMPORTANTE: El filtro espera estados exactos:');
            console.log('   - "Pendiente" (con mayúscula P)');
            console.log('   - "Aceptado" (con mayúscula A)');
            console.log('   - "Rechazado" (con mayúscula R)');
        }

        console.log('\n═══════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkEstados();

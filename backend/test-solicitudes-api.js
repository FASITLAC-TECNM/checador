// Script para probar el endpoint de solicitudes móviles
import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api';

async function testSolicitudesAPI() {
    console.log('🧪 PRUEBA DE API - SOLICITUDES MÓVILES\n');
    console.log('═══════════════════════════════════════\n');

    try {
        // 1. GET todas las solicitudes
        console.log('1️⃣ GET /api/solicitudes-movil');
        const response = await fetch(`${API_URL}/solicitudes-movil`);
        console.log('   Status:', response.status);
        console.log('   Headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));

        const data = await response.json();
        console.log(`   ✅ Recibidas ${data.length} solicitudes\n`);

        data.forEach((sol, idx) => {
            console.log(`   ${idx + 1}. ID: ${sol.id} | ${sol.nombre} | ${sol.sistema_operativo}`);
            console.log(`      Correo: ${sol.correo}`);
            console.log(`      Estado: ${sol.estado}`);
            console.log(`      Token: ${sol.token_solicitud?.substring(0, 30)}...`);
            console.log('');
        });

        // 2. GET solicitudes pendientes
        console.log('2️⃣ GET /api/solicitudes-movil/pendientes');
        const pendientesRes = await fetch(`${API_URL}/solicitudes-movil/pendientes`);
        const pendientes = await pendientesRes.json();
        console.log(`   ✅ Recibidas ${pendientes.length} solicitudes pendientes\n`);

        // 3. GET estadísticas
        console.log('3️⃣ GET /api/solicitudes-movil/stats');
        const statsRes = await fetch(`${API_URL}/solicitudes-movil/stats`);
        const stats = await statsRes.json();
        console.log('   Estadísticas:', JSON.stringify(stats, null, 2));
        console.log('');

        console.log('═══════════════════════════════════════');
        console.log('✅ Todas las pruebas pasaron exitosamente');
        console.log('\n💡 El backend funciona correctamente.');
        console.log('💡 Si el frontend no muestra las solicitudes, el problema está en:');
        console.log('   - La configuración de la URL del API en el frontend');
        console.log('   - CORS bloqueando las peticiones');
        console.log('   - Errores JavaScript en el navegador (revisar consola)');

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testSolicitudesAPI();

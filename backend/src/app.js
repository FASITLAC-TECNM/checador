import express from 'express';
import cors from 'cors';
import usuariosRoutes from './routes/usuarios.routes.js';
import sessionRoutes from './routes/session.routes.js';
import empleadosRoutes from './routes/empleados.routes.js';
import credencialesRoutes from './routes/credenciales.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import departamentosRoutes from './routes/departamentos.routes.js';
import horariosRoutes from './routes/horarios.routes.js';
import escritorioRoutes from './routes/escritorio.routes.js';
import solicitudEscritorioRoutes from './routes/solicitudEscritorio.routes.js';
import solicitudMovilRoutes from './routes/solicitudMovil.routes.js';
import asistenciaRoutes from './routes/asistencia.routes.js'; // NUEVO

const app = express();

app.set('trust proxy', true);
app.use(cors({
    origin: "*",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'FASITLAC API',
        version: '1.0.0',
        message: 'Api funcionando correctamente.'
    });
});

app.use('/api/usuarios', usuariosRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/empleados', empleadosRoutes);
app.use('/api/credenciales', credencialesRoutes);
app.use('/api', rolesRoutes);
app.use('/api/departamentos', departamentosRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/escritorios', escritorioRoutes);
app.use('/api/solicitudes-escritorio', solicitudEscritorioRoutes);
app.use('/api/solicitudes-movil', solicitudMovilRoutes);
app.use('/api/asistencia', asistenciaRoutes);

export default app;
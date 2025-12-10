import express from 'express';
import cors from 'cors';
import usuariosRoutes from './routes/usuarios.routes.js';
import sessionRoutes from './routes/session.routes.js';
import empleadosRoutes from './routes/empleados.routes.js';
import credencialesRoutes from './routes/credenciales.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import departamentosRoutes from './routes/departamentos.routes.js';

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

export default app;
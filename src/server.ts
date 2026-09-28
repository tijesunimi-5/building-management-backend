import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db/init';

// Import Modular Routers
import healthRouter from './routes/health';
import authRouter from './routes/auth';
import propertiesRouter from './routes/properties';
import requestsRouter from './routes/requests';
import projectsRouter from './routes/projects';
import workersRouter from './routes/workers';
import uploadRouter from './routes/upload';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Optional DB Init (Only runs if AUTO_INIT_DB=true is explicitly set in env)
if (process.env.AUTO_INIT_DB === 'true') {
  initDb().catch((err) => console.error('Failed to initialize database:', err));
}

// Mount REST API Routers
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/properties', propertiesRouter);
app.use('/api/v1/requests', requestsRouter);
app.use('/api/v1/projects', projectsRouter);
app.use('/api/v1/workers', workersRouter);
app.use('/api/v1/upload', uploadRouter);

app.listen(PORT, () => {
  console.log(`ApexCare Express REST API Server running on port ${PORT}`);
  console.log(`Connected to Neon PostgreSQL Database`);
});

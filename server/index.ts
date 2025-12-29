// Load environment variables FIRST before importing any other modules
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file from project root (one level up from server directory)
dotenv.config({ path: join(__dirname, '../.env') });

// Import AI service AFTER loading environment variables
// Note: Even though we load env vars first, other modules may import aiService before this file runs
// So we'll reload the config after importing
import aiService from './services/aiService.js';

// Force reload AI service config now that environment variables are loaded
aiService.loadConfig(true);

// Now import other modules
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

// Import routes
import apiRoutes from './routes/api.js';
import sseRoutes from './routes/sse.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security middleware - Configure helmet to allow SSE
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for SSE
  crossOriginEmbedderPolicy: false, // Allow SSE connections
}));

// CORS configuration - Allow SSE connections
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Accept'],
  exposedHeaders: ['Content-Type', 'Cache-Control', 'Connection'],
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Swagger configuration
const NETWORK_IP = process.env.NETWORK_IP || '192.168.1.23';
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stock Scanner API',
      version: '1.0.0',
      description: 'API documentation for Stock Scanner Server',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      {
        url: `http://${NETWORK_IP}:${PORT}`,
        description: 'Development server (Network IP)',
      },
      {
        url: `http://localhost:${PORT}`,
        description: 'Development server (Localhost)',
      },
    ],
  },
  apis: [join(__dirname, './routes/*.ts'), join(__dirname, './controllers/*.ts')],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api', apiRoutes);
app.use('/api/sse', sseRoutes);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Start server with error handling
// Listen on all network interfaces (0.0.0.0) to allow connections from other devices
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  console.log(`Stock Scanner Server running on port ${PORT}`);
  console.log(`API Documentation:`);
  console.log(`  - Local: http://localhost:${PORT}/api-docs`);
  console.log(`  - Network: http://${NETWORK_IP}:${PORT}/api-docs`);
  console.log(`Health Check:`);
  console.log(`  - Local: http://localhost:${PORT}/health`);
  console.log(`  - Network: http://${NETWORK_IP}:${PORT}/health`);
  console.log(`Server listening on ${HOST}:${PORT} (accessible via ${NETWORK_IP}:${PORT})`);
});

// Handle port already in use error
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    console.error(`Please close the process using port ${PORT} or use a different port.`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

export default app;


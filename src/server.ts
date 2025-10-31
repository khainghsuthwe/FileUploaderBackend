import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import uploadRoutes from './routes/upload';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Security Middleware (OWASP)
// Allow resources (images) to be loaded cross-origin by setting the policy
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
);

app.use(
    cors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    })
);

app.use(express.json());


// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/upload', limiter);

// Serve uploaded files and ensure static responses include CORS headers
const uploadsPath = path.join(__dirname, '../uploads');
const frontendOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(
    '/uploads',
    express.static(uploadsPath, {
        setHeaders: (res) => {
            // Allow the frontend to load images directly from this host
            res.setHeader('Access-Control-Allow-Origin', frontendOrigin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
    })
);

// Routes
app.use('/api/upload', uploadRoutes);

// Health check - useful for quick liveness/readiness checks and to verify CORS
app.get('/health', (req, res) => {
    const uptime = process.uptime();
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
    res.json({
        status: 'ok',
        uptime: Math.round(uptime),
        timestamp: Date.now()
    });
});

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
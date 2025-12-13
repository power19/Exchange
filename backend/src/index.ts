import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { subdomainMiddleware } from './middleware/subdomain.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRoutes } from './routes/index.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

// THIS LINE REPLACES ALL THE import.meta MESS
const __dirname = path.resolve();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
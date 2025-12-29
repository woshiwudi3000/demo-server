import express from 'express';
import { handleSSEConnection } from '../controllers/sseController.js';

const router = express.Router();

/**
 * @swagger
 * /api/sse:
 *   get:
 *     summary: Server-Sent Events connection for real-time updates
 *     tags: [SSE]
 *     parameters:
 *       - in: query
 *         name: client_id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: SSE connection established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get('/', handleSSEConnection);

export default router;


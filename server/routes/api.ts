import express from 'express';
import {
  getStatus,
  getSystemInfo,
  validateStock,
  analyzeStock,
  analyzeStockStream,
  batchAnalyze,
  batchAnalyzeStream,
  getTaskStatus,
} from '../controllers/stockController.js';

const router = express.Router();

/**
 * @swagger
 * /api/status:
 *   get:
 *     summary: Get server status
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server status
 */
router.get('/status', getStatus);

/**
 * @swagger
 * /api/system-info:
 *   get:
 *     summary: Get system information
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System information
 */
router.get('/system-info', getSystemInfo);

/**
 * @swagger
 * /api/validate-stock:
 *   post:
 *     summary: Validate stock code
 *     tags: [Stock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stock_code
 *             properties:
 *               stock_code:
 *                 type: string
 *               target_market:
 *                 type: string
 *     responses:
 *       200:
 *         description: Validation result
 */
router.post('/validate-stock', validateStock);

/**
 * @swagger
 * /api/analyze:
 *   post:
 *     summary: Analyze single stock (non-streaming)
 *     tags: [Stock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stock_code
 *             properties:
 *               stock_code:
 *                 type: string
 *               target_market:
 *                 type: string
 *               enable_streaming:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Analysis result
 */
router.post('/analyze', analyzeStock);

/**
 * @swagger
 * /api/analyze-stream:
 *   post:
 *     summary: Start streaming analysis for single stock
 *     tags: [Stock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stock_code
 *               - client_id
 *             properties:
 *               stock_code:
 *                 type: string
 *               target_market:
 *                 type: string
 *               client_id:
 *                 type: string
 *               enable_streaming:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Analysis started
 */
router.post('/analyze-stream', analyzeStockStream);

/**
 * @swagger
 * /api/batch-analyze:
 *   post:
 *     summary: Batch analyze stocks (non-streaming)
 *     tags: [Stock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stock_codes
 *             properties:
 *               stock_codes:
 *                 type: array
 *                 items:
 *                   type: string
 *               target_market:
 *                 type: string
 *     responses:
 *       200:
 *         description: Batch analysis results
 */
router.post('/batch-analyze', batchAnalyze);

/**
 * @swagger
 * /api/batch-analyze-stream:
 *   post:
 *     summary: Start streaming batch analysis
 *     tags: [Stock]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stock_codes
 *               - client_id
 *             properties:
 *               stock_codes:
 *                 type: array
 *                 items:
 *                   type: string
 *               target_market:
 *                 type: string
 *               client_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Batch analysis started
 */
router.post('/batch-analyze-stream', batchAnalyzeStream);

/**
 * @swagger
 * /api/task-status/{stock_code}:
 *   get:
 *     summary: Get task status for a stock
 *     tags: [Stock]
 *     parameters:
 *       - in: path
 *         name: stock_code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task status
 */
router.get('/task-status/:stock_code', getTaskStatus);

export default router;


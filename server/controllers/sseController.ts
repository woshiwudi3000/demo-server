import { Request, Response } from 'express';
import { sseManager } from '../services/analysisService.js';

/**
 * Handle SSE connection
 */
export const handleSSEConnection = (req: Request, res: Response): void => {
  const clientId = req.query.client_id as string;

  if (!clientId) {
    res.status(400).json({
      success: false,
      error: 'Client ID is required',
    });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS for SSE
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Flush headers immediately
  res.flushHeaders();

  // Add client to SSE manager
  sseManager.addClient(clientId, res);

  // Send initial connection message
  const initialMessage = `event: connected\ndata: ${JSON.stringify({ client_id: clientId, message: 'Connected' })}\n\n`;
  res.write(initialMessage);
  
  // Flush buffer if available (Express Response may have flush method)
  if ('flush' in res && typeof (res as unknown as { flush: () => void }).flush === 'function') {
    (res as unknown as { flush: () => void }).flush();
  }

  // Handle client disconnect
  req.on('close', () => {
    sseManager.removeClient(clientId);
    // 不要调用 res.end()，因为连接可能已经关闭
    try {
      if (!res.headersSent || res.writable) {
        res.end();
      }
    } catch {
      // 忽略已关闭的连接错误
    }
  });

  req.on('error', (error: NodeJS.ErrnoException) => {
    // Only log actual errors, not normal disconnections
    if (!(error.code === 'ECONNRESET' || error.code === 'EPIPE' || error.message === 'aborted')) {
      console.error(`SSE connection error (${clientId}):`, error);
    }
    sseManager.removeClient(clientId);
    try {
      if (!res.headersSent || res.writable) {
        res.end();
      }
    } catch {
      // 忽略已关闭的连接错误
    }
  });

  // Handle response errors
  res.on('error', (error: NodeJS.ErrnoException) => {
    if (!(error.code === 'ECONNRESET' || error.code === 'EPIPE' || error.message === 'aborted')) {
      console.error(`SSE response error (${clientId}):`, error);
    }
    sseManager.removeClient(clientId);
  });
};


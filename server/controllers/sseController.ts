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

  // 检测是否是短轮询请求（微信小程序不支持长连接）
  // 通过 User-Agent 或 query 参数判断
  const userAgent = req.headers['user-agent'] || '';
  const isShortPolling = req.query.poll === 'true' || userAgent.includes('wechatdevtools') || userAgent.includes('MicroMessenger');
  
  if (isShortPolling) {
    // 短轮询模式：返回所有待处理的消息，然后关闭连接
    console.log(`[SSE] Short polling mode for client ${clientId}`);
    
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'close'); // 短轮询使用 close
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // 初始化客户端消息队列（不添加到长连接列表）
    sseManager.addClient(clientId); // 只初始化消息队列，不添加长连接
    
    // 获取所有待处理的消息
    const pendingMessages = sseManager.getPendingMessages(clientId);
    const hasLastEventId = !!req.query.last_event_id;
    
    let responseContent = '';
    
    // 发送 connected 消息（如果是第一次连接）
    if (!hasLastEventId) {
      const initialMessage = `event: connected\ndata: ${JSON.stringify({ client_id: clientId, message: 'Connected' })}\n\n`;
      responseContent += initialMessage;
    }
    
    // 发送所有待处理的消息
    for (const msg of pendingMessages) {
      const message = {
        event: msg.eventType,
        data: msg.data,
        timestamp: new Date().toISOString(),
      };
      responseContent += `event: ${msg.eventType}\n`;
      responseContent += `data: ${JSON.stringify(message)}\n\n`;
    }
    
    // 如果没有消息且是第一次连接，至少发送一个 connected 消息
    if (pendingMessages.length === 0 && !hasLastEventId) {
      const initialMessage = `event: connected\ndata: ${JSON.stringify({ client_id: clientId, message: 'Connected' })}\n\n`;
      responseContent += initialMessage;
    }
    
    // 发送所有内容
    res.write(responseContent);
    
    // 刷新缓冲区并立即关闭连接
    if ('flush' in res && typeof (res as unknown as { flush: () => void }).flush === 'function') {
      (res as unknown as { flush: () => void }).flush();
    }
    
    // 立即关闭连接
    res.end();
    console.log(`[SSE] Short polling response sent to ${clientId}, messages: ${pendingMessages.length}, content length: ${responseContent.length}`);
    return;
  }

  // 长连接模式
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


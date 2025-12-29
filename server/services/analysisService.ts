/**
 * Analysis service - manages analysis tasks and SSE connections
 */

import { Response } from 'express';

// Store analysis tasks
export interface AnalysisTask {
  stock_code: string;
  market: string;
  status: 'analyzing' | 'completed';
  start_time: string;
  end_time?: string;
  result?: unknown;
}

export const analysisTasks: Record<string, AnalysisTask> = {};

// SSE Manager
class SSEManager {
  private clients: Map<string, Response> = new Map();
  // 短轮询模式下的消息队列（clientId -> message[]）
  private messageQueues: Map<string, Array<{ eventType: string; data: unknown }>> = new Map();

  /**
   * Add SSE client (for long connection) or initialize message queue (for short polling)
   */
  addClient(clientId: string, response?: Response): void {
    // 如果有 response，添加到长连接列表
    if (response) {
      this.clients.set(clientId, response);
    }
    // 初始化消息队列（用于短轮询模式）
    if (!this.messageQueues.has(clientId)) {
      this.messageQueues.set(clientId, []);
    }
    // 日志已在 sseController 中输出，这里不再重复
  }

  /**
   * Remove SSE client
   */
  removeClient(clientId: string): void {
    if (this.clients.has(clientId)) {
      const response = this.clients.get(clientId)!;
      try {
        // 检查响应是否仍然可写
        if (response.writable && !response.destroyed) {
          response.end();
        }
      } catch (error) {
        // 忽略已关闭的连接错误（ECONNRESET, EPIPE 等）
        const err = error as NodeJS.ErrnoException;
        if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE' && err.message !== 'aborted') {
          console.error(`Error closing SSE connection for ${clientId}:`, error);
        }
      }
      this.clients.delete(clientId);
      // 清理消息队列（延迟清理，给短轮询一些时间获取消息）
      setTimeout(() => {
        this.messageQueues.delete(clientId);
      }, 60000); // 60秒后清理队列
      // 日志已在 sseController 中输出，这里不再重复
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, eventType: string, data: unknown): boolean {
    const response = this.clients.get(clientId);
    
    // 如果客户端不在长连接列表中，将消息加入队列（短轮询模式）
    if (!response) {
      const queue = this.messageQueues.get(clientId);
      if (queue) {
        // 消息加入队列，等待下次轮询时返回
        queue.push({ eventType, data });
        return true;
      } else {
        console.warn(`Client ${clientId} not found and no message queue`);
        return false;
      }
    }

    // 长连接模式：直接发送
    try {
      const message = {
        event: eventType,
        data: data,
        timestamp: new Date().toISOString(),
      };

      response.write(`event: ${eventType}\n`);
      response.write(`data: ${JSON.stringify(message)}\n\n`);
      
      // 同时将消息加入队列（用于短轮询模式的备份）
      const queue = this.messageQueues.get(clientId);
      if (queue) {
        queue.push({ eventType, data });
        // 限制队列大小，避免内存泄漏
        if (queue.length > 1000) {
          queue.shift(); // 移除最旧的消息
        }
      }
      
      return true;
    } catch (error) {
      // 区分正常断开和异常错误
      const err = error as NodeJS.ErrnoException;
      if (err.code === 'ECONNRESET' || err.code === 'EPIPE' || err.message === 'aborted') {
        // 客户端已断开，正常清理
        this.removeClient(clientId);
      } else {
        console.error(`Error sending SSE message to ${clientId}:`, error);
        this.removeClient(clientId);
      }
      return false;
    }
  }

  /**
   * Get and clear pending messages for a client (for short polling)
   */
  getPendingMessages(clientId: string): Array<{ eventType: string; data: unknown }> {
    const queue = this.messageQueues.get(clientId);
    if (!queue || queue.length === 0) {
      return [];
    }
    
    // 返回所有待处理消息并清空队列
    const messages = [...queue];
    queue.length = 0; // 清空队列
    return messages;
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(eventType: string, data: unknown): void {
    const message = {
      event: eventType,
      data: data,
      timestamp: new Date().toISOString(),
    };

    const deadClients: string[] = [];
    for (const [clientId, response] of this.clients.entries()) {
      try {
        response.write(`event: ${eventType}\n`);
        response.write(`data: ${JSON.stringify(message)}\n\n`);
      } catch (error) {
        // 区分正常断开和异常错误
        const err = error as NodeJS.ErrnoException;
        if (err.code !== 'ECONNRESET' && err.code !== 'EPIPE' && err.message !== 'aborted') {
          console.error(`Error broadcasting to ${clientId}:`, error);
        }
        deadClients.push(clientId);
      }
    }

    // Remove dead clients
    deadClients.forEach((clientId) => this.removeClient(clientId));
  }

  /**
   * Get client count
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

export const sseManager = new SSEManager();


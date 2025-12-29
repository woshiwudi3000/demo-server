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

  /**
   * Add SSE client
   */
  addClient(clientId: string, response: Response): void {
    this.clients.set(clientId, response);
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
      // 日志已在 sseController 中输出，这里不再重复
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, eventType: string, data: unknown): boolean {
    const response = this.clients.get(clientId);
    if (!response) {
      console.warn(`Client ${clientId} not found`);
      return false;
    }

    try {
      const message = {
        event: eventType,
        data: data,
        timestamp: new Date().toISOString(),
      };

      response.write(`event: ${eventType}\n`);
      response.write(`data: ${JSON.stringify(message)}\n\n`);
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


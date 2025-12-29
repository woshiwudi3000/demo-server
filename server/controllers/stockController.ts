import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { analysisTasks, sseManager } from '../services/analysisService.js';
import {
  validateStockCode,
  normalizeStockCode,
  detectMarket,
  generateFixedPrice,
  generateFixedScore,
  type Market,
} from '../utils/stockUtils.js';
import aiService from '../services/aiService.js';

/**
 * Get server status
 */
export const getStatus = async (_req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      status: 'ready',
      message: 'Stock Scanner API Server is running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      supported_markets: ['A_STOCK', 'HK_STOCK', 'US_STOCK'],
      ai_configured: aiService.isConfigured(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Get system information
 */
export const getSystemInfo = async (_req: Request, res: Response): Promise<void> => {
  try {
    const activeTasks = Object.keys(analysisTasks).length;
    const sseClients = sseManager.getClientCount();

    res.json({
      success: true,
      data: {
        version: '1.0.0',
        active_tasks: activeTasks,
        sse_clients: sseClients,
        supported_markets: ['A_STOCK', 'HK_STOCK', 'US_STOCK'],
        features: {
          streaming: true,
          batch_analysis: true,
          multi_market: true,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Validate stock code
 */
export const validateStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stock_code, target_market } = req.body;

    if (!stock_code) {
      res.status(400).json({
        success: false,
        error: 'Stock code is required',
      });
      return;
    }

    const isValid = validateStockCode(stock_code);
    const market = (target_market as Market) || detectMarket(stock_code);
    const normalized = normalizeStockCode(stock_code, market);

    res.json({
      success: true,
      data: {
        is_valid: isValid,
        original_code: stock_code,
        normalized_code: normalized,
        market: market,
        message: isValid ? 'Valid stock code' : 'Invalid stock code format',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Analyze single stock (non-streaming)
 */
export const analyzeStock = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stock_code, target_market, enable_streaming } = req.body;

    if (!stock_code) {
      res.status(400).json({
        success: false,
        error: 'Stock code is required',
      });
      return;
    }

    // If streaming is requested, redirect to stream endpoint
    if (enable_streaming) {
      res.status(400).json({
        success: false,
        error: 'Use /api/analyze-stream endpoint for streaming analysis',
      });
      return;
    }

    // Generate analysis result with AI integration
    const market = (target_market as Market) || detectMarket(stock_code);
    const normalized = normalizeStockCode(stock_code, market);

    // Simulate analysis delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const current_price = generateFixedPrice(normalized);
    const comprehensive_score = generateFixedScore(normalized);

    const result = {
      stock_code: normalized,
      stock_name: `Stock ${normalized}`,
      market: market,
      current_price: current_price,
      analysis: {
        technical: 'Technical analysis result',
        fundamental: 'Fundamental analysis result',
        sentiment: 'Sentiment analysis result',
      },
      comprehensive_score: comprehensive_score,
      recommendation: comprehensive_score > 70 ? '买入' : comprehensive_score > 50 ? '持有' : '卖出',
      timestamp: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Start streaming analysis for single stock
 */
export const analyzeStockStream = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stock_code, target_market, client_id } = req.body;

    if (!stock_code) {
      res.status(400).json({
        success: false,
        error: 'Stock code is required',
      });
      return;
    }

    if (!client_id) {
      res.status(400).json({
        success: false,
        error: 'Client ID is required for streaming',
      });
      return;
    }

    const market = (target_market as Market) || detectMarket(stock_code);
    const normalized = normalizeStockCode(stock_code, market);

    // Create analysis task
    const taskId = uuidv4();
    analysisTasks[taskId] = {
      stock_code: normalized,
      market: market,
      status: 'analyzing',
      start_time: new Date().toISOString(),
    };

    // Start analysis in background
    performAnalysis(normalized, market, client_id as string, taskId);

    res.json({
      success: true,
      message: 'Analysis started',
      task_id: taskId,
      stock_code: normalized,
      client_id: client_id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Batch analyze stocks (non-streaming)
 */
export const batchAnalyze = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stock_codes, target_market } = req.body;

    if (!stock_codes || !Array.isArray(stock_codes) || stock_codes.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Stock codes array is required',
      });
      return;
    }

    if (stock_codes.length > 10) {
      res.status(400).json({
        success: false,
        error: 'Maximum 10 stocks allowed in batch analysis',
      });
      return;
    }

    // Simulate batch analysis
    const results = await Promise.all(
      stock_codes.map(async (code: string) => {
        const market = (target_market as Market) || detectMarket(code);
        const normalized = normalizeStockCode(code, market);
        await new Promise((resolve) => setTimeout(resolve, 500));
        return {
          stock_code: normalized,
          stock_name: `Stock ${normalized}`,
          market: market,
          comprehensive_score: generateFixedScore(normalized),
        };
      })
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Start streaming batch analysis
 */
export const batchAnalyzeStream = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stock_codes, target_market, client_id } = req.body;

    if (!stock_codes || !Array.isArray(stock_codes) || stock_codes.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Stock codes array is required',
      });
      return;
    }

    if (!client_id) {
      res.status(400).json({
        success: false,
        error: 'Client ID is required for streaming',
      });
      return;
    }

    if (stock_codes.length > 10) {
      res.status(400).json({
        success: false,
        error: 'Maximum 10 stocks allowed in batch analysis',
      });
      return;
    }

    // Start batch analysis in background
    performBatchAnalysis(stock_codes as string[], target_market as Market | undefined, client_id as string);

    res.json({
      success: true,
      message: 'Batch analysis started',
      stock_count: stock_codes.length,
      client_id: client_id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Get task status
 */
export const getTaskStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { stock_code } = req.params;

    // Find task by stock code
    const task = Object.values(analysisTasks).find(
      (t) => t.stock_code === stock_code && t.status !== 'completed'
    );

    if (!task) {
      res.status(404).json({
        success: false,
        error: 'Task not found',
      });
      return;
    }

    res.json({
      success: true,
      data: task,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
};

/**
 * Perform analysis (background task)
 */
async function performAnalysis(
  stockCode: string,
  market: Market,
  clientId: string,
  taskId: string
): Promise<void> {
  try {
    // Send progress updates via SSE
    sseManager.sendToClient(clientId, 'analysis_progress', {
      message: `开始分析 ${stockCode}...\n`,
      stock_code: stockCode,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    sseManager.sendToClient(clientId, 'analysis_progress', {
      message: `正在获取 ${stockCode} 的价格数据...\n`,
      stock_code: stockCode,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    sseManager.sendToClient(clientId, 'analysis_progress', {
      message: `正在分析技术指标...\n`,
      stock_code: stockCode,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const current_price = generateFixedPrice(stockCode);
    const comprehensive_score = generateFixedScore(stockCode);

    // Generate mock analysis data (in production, this would come from actual data sources)
    const technical_analysis = {
      trend: '上升趋势',
      rsi: 55,
      macd: '金叉',
      support: (current_price * 0.9).toFixed(2),
      resistance: (current_price * 1.1).toFixed(2),
    };

    const fundamental_analysis = {
      pe_ratio: 18.5,
      pb_ratio: 2.3,
      roe: 15.2,
      revenue_growth: 12.5,
    };

    const sentiment_analysis = {
      overall_sentiment: '中性偏乐观',
      news_sentiment: 0.6,
      social_sentiment: 0.55,
    };

    sseManager.sendToClient(clientId, 'analysis_progress', {
      message: `正在使用 AI 进行深度分析...\n`,
      stock_code: stockCode,
    });

    // Call AI service for analysis
    let ai_analysis = '';
    if (aiService.isConfigured()) {
      try {
        const stockData = {
          stock_code: stockCode,
          stock_name: `股票 ${stockCode}`,
          market: market,
          current_price: current_price,
          technical_analysis,
          fundamental_analysis,
          sentiment_analysis,
          comprehensive_score,
        };

        // Stream AI analysis
        for await (const chunk of aiService.streamAnalyzeStock(stockData)) {
          ai_analysis += chunk;
          sseManager.sendToClient(clientId, 'analysis_progress', {
            message: chunk,
            stock_code: stockCode,
          });
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        ai_analysis = `AI 分析暂时不可用: ${(aiError as Error).message}`;
      }
    } else {
      ai_analysis = 'AI 分析未配置，请设置 DEEPSEEK_API_KEY 环境变量';
    }

    // Generate final result
    const result = {
      stock_code: stockCode,
      stock_name: `股票 ${stockCode}`,
      market: market,
      current_price: current_price,
      analysis: {
        technical: technical_analysis,
        fundamental: fundamental_analysis,
        sentiment: sentiment_analysis,
      },
      comprehensive_score: comprehensive_score.toFixed(2),
      recommendation: comprehensive_score > 70 ? '买入' : comprehensive_score > 50 ? '持有' : '卖出',
      ai_analysis: ai_analysis || 'AI 分析完成',
      timestamp: new Date().toISOString(),
    };

    // Send completion
    sseManager.sendToClient(clientId, 'analysis_complete', {
      stock_code: stockCode,
      result: result,
    });

    // Update task
    if (analysisTasks[taskId]) {
      analysisTasks[taskId].status = 'completed';
      analysisTasks[taskId].result = result;
      analysisTasks[taskId].end_time = new Date().toISOString();
    }
  } catch (error) {
    console.error('Analysis error:', error);
    sseManager.sendToClient(clientId, 'error', {
      error: (error as Error).message,
      stock_code: stockCode,
    });
  }
}

/**
 * Perform batch analysis (background task)
 */
async function performBatchAnalysis(
  stockCodes: string[],
  targetMarket: Market | undefined,
  clientId: string
): Promise<void> {
  try {
    sseManager.sendToClient(clientId, 'batch_start', {
      message: `开始批量分析 ${stockCodes.length} 只股票...\n`,
      total: stockCodes.length,
    });

    for (let i = 0; i < stockCodes.length; i++) {
      const code = stockCodes[i];
      const market = targetMarket || detectMarket(code);
      const normalized = normalizeStockCode(code, market);

      sseManager.sendToClient(clientId, 'batch_progress', {
        message: `正在分析 ${normalized} (${i + 1}/${stockCodes.length})...\n`,
        stock_code: normalized,
        progress: i + 1,
        total: stockCodes.length,
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const comprehensive_score = generateFixedScore(normalized);
      const result = {
        stock_code: normalized,
        stock_name: `Stock ${normalized}`,
        market: market,
        comprehensive_score: comprehensive_score,
        recommendation: comprehensive_score > 70 ? '买入' : comprehensive_score > 50 ? '持有' : '卖出',
      };

      sseManager.sendToClient(clientId, 'batch_progress', {
        stock_code: normalized,
        result: result,
        progress: i + 1,
        total: stockCodes.length,
      });
    }

    sseManager.sendToClient(clientId, 'batch_complete', {
      message: `批量分析完成！\n`,
      total: stockCodes.length,
    });
  } catch (error) {
    sseManager.sendToClient(clientId, 'error', {
      error: (error as Error).message,
    });
  }
}


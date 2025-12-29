/**
 * AI Service - DeepSeek API integration
 */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface StreamChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
  }>;
}

interface StockData {
  stock_code: string;
  stock_name: string;
  market: string;
  current_price: number;
  technical_analysis: Record<string, unknown>;
  fundamental_analysis: Record<string, unknown>;
  sentiment_analysis: Record<string, unknown>;
  comprehensive_score: number;
}

class AIService {
  private apiKey: string = '';
  private apiBaseUrl: string = 'https://api.deepseek.com/v1';
  private model: string = 'deepseek-chat';

  constructor() {
    // Don't show warning on initial load - config will be reloaded after env vars are loaded
    this.loadConfig(false);
  }

  /**
   * Load configuration from environment variables
   * @param showWarning - Whether to show warning if API key is not configured
   */
  loadConfig(showWarning = false): void {
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
    this.apiBaseUrl = process.env.DEEPSEEK_API_BASE_URL || 'https://api.deepseek.com/v1';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    
    // Log configuration status
    if (!this.apiKey && showWarning) {
      console.warn('⚠️ DEEPSEEK_API_KEY 未找到，AI Service 未配置');
      console.warn('   请检查 .env 文件是否存在于项目根目录');
      console.warn('   并在 .env 文件中添加: DEEPSEEK_API_KEY=your_api_key');
    }
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  /**
   * Call DeepSeek API for chat completion
   */
  async chatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResponse | ReadableStream<Uint8Array>> {
    if (!this.isConfigured()) {
      throw new Error('DeepSeek API key is not configured. Please set DEEPSEEK_API_KEY in .env file');
    }

    const {
      temperature = 0.7,
      max_tokens = 4000,
      stream = false,
    } = options;

    try {
      const response = await fetch(`${this.apiBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: temperature,
          max_tokens: max_tokens,
          stream: stream,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { error?: { message?: string } }).error?.message || 
          `DeepSeek API error: ${response.status} ${response.statusText}`
        );
      }

      if (stream) {
        return response.body as ReadableStream<Uint8Array>;
      }

      const data = await response.json() as ChatCompletionResponse;
      return data;
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw error;
    }
  }

  /**
   * Analyze stock with AI
   */
  async analyzeStock(stockData: StockData): Promise<string> {
    const {
      stock_code,
      stock_name,
      market,
      current_price,
      technical_analysis,
      fundamental_analysis,
      sentiment_analysis,
      comprehensive_score,
    } = stockData;

    const prompt = `你是一位专业的股票分析师。请基于以下信息，对股票 ${stock_code} (${stock_name}) 进行全面的投资分析。

市场信息：
- 股票代码：${stock_code}
- 股票名称：${stock_name}
- 市场：${market}
- 当前价格：${current_price}

技术分析：
${JSON.stringify(technical_analysis, null, 2)}

基本面分析：
${JSON.stringify(fundamental_analysis, null, 2)}

情绪分析：
${JSON.stringify(sentiment_analysis, null, 2)}

综合评分：${comprehensive_score}/100

请提供：
1. 投资建议（买入/持有/卖出）
2. 主要风险点
3. 投资理由
4. 目标价位区间（如适用）
5. 投资期限建议

请用中文回答，内容要专业、客观、全面。`;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一位专业的股票分析师，擅长技术分析、基本面分析和市场情绪分析。请提供客观、专业的投资建议。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.chatCompletion(messages, {
        temperature: 0.7,
        max_tokens: 2000,
      }) as ChatCompletionResponse;

      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content;
      }

      throw new Error('No response from AI');
    } catch (error) {
      console.error('AI analysis error:', error);
      throw error;
    }
  }

  /**
   * Stream analysis with AI
   */
  async *streamAnalyzeStock(stockData: StockData): AsyncGenerator<string, void, unknown> {
    const {
      stock_code,
      stock_name,
      market,
      current_price,
      technical_analysis,
      fundamental_analysis,
      sentiment_analysis,
      comprehensive_score,
    } = stockData;

    const prompt = `你是一位专业的股票分析师。请基于以下信息，对股票 ${stock_code} (${stock_name}) 进行全面的投资分析。

市场信息：
- 股票代码：${stock_code}
- 股票名称：${stock_name}
- 市场：${market}
- 当前价格：${current_price}

技术分析：
${JSON.stringify(technical_analysis, null, 2)}

基本面分析：
${JSON.stringify(fundamental_analysis, null, 2)}

情绪分析：
${JSON.stringify(sentiment_analysis, null, 2)}

综合评分：${comprehensive_score}/100

请提供：
1. 投资建议（买入/持有/卖出）
2. 主要风险点
3. 投资理由
4. 目标价位区间（如适用）
5. 投资期限建议

请用中文回答，内容要专业、客观、全面。`;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是一位专业的股票分析师，擅长技术分析、基本面分析和市场情绪分析。请提供客观、专业的投资建议。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const response = await this.chatCompletion(messages, {
        temperature: 0.7,
        max_tokens: 2000,
        stream: true,
      }) as ReadableStream<Uint8Array>;

      const reader = response.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const json = JSON.parse(data) as StreamChunk;
              if (json.choices && json.choices[0]?.delta?.content) {
                yield json.choices[0].delta.content;
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('AI stream analysis error:', error);
      throw error;
    }
  }
}

// Create singleton instance
const aiService = new AIService();

export default aiService;


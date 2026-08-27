export interface StockSelectionContextMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function buildStockSelectionContext(messages: StockSelectionContextMessage[]): string | undefined;

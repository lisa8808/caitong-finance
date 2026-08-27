# Data Contract

## SkillRunRequest

```ts
interface StockSelectionSkillRequest {
  skill: "stock_selection";
  triggerSource:
    | "instant_analysis_quick_action"
    | "instant_analysis_input"
    | "stock_selection_modal"
    | "strategy_create"
    | "factor_page";
  userInput: string;
  scope?: {
    industries?: string[];
    concepts?: string[];
    selectedStocks?: string[];
  };
  candidates?: StockCandidate[];
}
```

## StockCandidate

```ts
interface StockCandidate {
  ts_code: string;
  name: string;
  industry?: string;
  close?: number;
  pct_chg?: number;
  pe?: number;
  pe_ttm?: number;
  pb?: number;
  roe?: number;
  revenue_yoy?: number;
  profit_yoy?: number;
  total_mv?: number;
  circ_mv?: number;
  main_net_amount?: number;
  turnover_rate?: number;
  volume_ratio?: number;
  ma5?: number;
  ma10?: number;
  ma20?: number;
}
```

## Response

```ts
interface StockSelectionSkillResponse {
  success: boolean;
  content: string;
  selectedStocks?: StockCandidate[];
  parsedRules?: ParsedRule[];
}
```

## Excluded Sources

The following sources must not be part of stock selection input and must be ignored if accidentally supplied:

| Source | Examples | Reason |
| --- | --- | --- |
| Mining results | `backend/mining_results/`, `/api/mining/*` historical strategy results | Historical strategy-search output must not define screening factors or rankings. |
| Backtest results | `backend/backtest_results/`, `/api/mining/backtest`, `/api/strategy/backtest*` | Backtest returns, Sharpe, drawdown, trades, and equity curves must not affect filtering, sorting, or recommendation reasons. |

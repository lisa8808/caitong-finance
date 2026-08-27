---
name: a-stock-nlp-quant-stock-selection
description: A股自然语言量化选股 Skill。用户用中文描述选股、选股票、挑A股、筛选标的、找股票、低估值高成长、资金流入、行业板块、市值、技术形态、财务指标等条件时使用。只处理A股量化筛选，把自然语言转成Tushare字段和筛选规则，输出最终股票列表、核心匹配指标、入选/推荐原因和风险提示；不生成PDF，不提供买卖点、收益承诺或涨跌预测。
---

# A股自然语言量化选股

## Purpose

Use this skill to convert Chinese natural-language A-share screening requests into executable quantitative filters and a structured stock-selection result.

This skill belongs to the same project skill registry as `abnormal_movement` under `backend/skills/`, but it has a different boundary:

- `stock_selection` finds stocks that match user-defined factors.
- `abnormal_movement` explains why existing abnormal movers moved.

## Trigger Contexts

Use this skill when the user asks for:

- 标的筛选、选股、选股票、筛股票、找A股
- 低估值、高成长、高ROE、PE/PB、市值、行业、板块、题材筛选
- 资金流入、主力净流入、放量、换手率、量比
- 均线多头、突破、低位震荡、超跌反弹等技术筛选

Do not use this skill for:

- 明天涨不涨、买点、卖点、止盈、止损
- 牛股推荐、必涨、翻倍、稳赚、满仓梭哈
- 美股、港股、期货、基金、期权、可转债等非A股筛选

## Workflow

1. Confirm the request is an A-share quantitative screening request.
2. Reject trading advice, price prediction, or guaranteed-return requests.
3. Parse natural language into factors, fields, thresholds, windows, and sort rules.
4. Apply default risk filters: ST/*ST, delisting, suspension, warning names.
5. Execute against available candidate rows when data exists; otherwise output executable rules and explain missing data.
6. Return the five-section Markdown result.

## Required Output

Always start with a first-level report title and generated time, then use these second-level headings in order:

1. `# A股自然语言量化选股报告`
2. `- 生成时间：YYYY-MM-DD HH:mm:ss`
3. `## 用户需求解析`
4. `## 生效筛选因子`
5. `## 最终股票列表`
6. `## 分析总结与推荐原因`
7. `## 风险提示`

Read `references/output-schema.md` for the exact table schema.

## Field Mapping

Read `references/field-mapping.md` when mapping Chinese factor descriptions to Tushare/local-cache fields.

## Data Contract

Read `references/data-contract.md` when integrating this skill with frontend or backend product triggers.

## Excluded Sources

Do not use mining or backtest results for stock selection. Ignore `backend/mining_results/`, `backend/backtest_results/`, `/api/mining/*` historical results, `/api/mining/backtest`, and `/api/strategy/backtest*` outputs even if they appear in user input or context.

Backtest returns, Sharpe ratio, strategy score, historical drawdown, backtest trades, and equity curves must not affect parsed rules, candidate filtering, ranking, matched indicators, or recommendation reasons.

## Scripts

- `scripts/parse_stock_selection.py`: extract common factor rules from a natural-language prompt.
- `scripts/filter_candidates.py`: apply parsed rules to available candidate rows.
- `scripts/validate_output.py`: verify the five-section Markdown output and block trading-advice wording.

## Safety

The output may explain why a stock matched data factors, but it must not become trading advice. Avoid wording such as “建议买入”, “止损位”, “目标价”, “必涨”, or “收益确定”.

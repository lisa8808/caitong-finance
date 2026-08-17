# Finance Skills

The finance skills formerly stored in this project have been renamed with the
`fi_` prefix and moved to the global skill directory:
`/Users/lisa/agent-skills/`.

| Skill | Directory | Purpose |
| --- | --- | --- |
| A股异动解读与归因分析 | `fi_abnormal_movement/` | Explains abnormal market/stock movements and attribution. |
| A股自然语言量化选股 | `fi_stock_selection/` | Converts natural-language A-share screening requests into quantitative rules and selected stocks. |
| A股复盘总结 | `fi_review_summary/` | Generates structured market, sector, stock, and operation review reports for PDF archival. |
| A股趋势研判与溯源分析 | `fi_trend_analysis/` | Identifies formed trends, traces root causes, and judges sustainability. |
| A股持仓风控与风险研判 | `fi_risk_control/` | Assesses position risk, rates risk levels, and delivers deterministic hold/reduce/exit advice. |

The table records their global directory names. Runtime UI code must not import
files from the global skill directory, so the application remains portable.

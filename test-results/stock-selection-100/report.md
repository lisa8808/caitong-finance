# 标的筛选 Skill 新增100条测试报告

- 新增用例：100（解析75 / 过滤20 / 真实接口5）
- 通过：100
- 失败：0
- 外部数据阻塞：0
- 通过率：100.00%
- 原114条回归：114/114
- 合计：214/214

## 因子状态统计

- 可执行：55
- 可识别但未执行：32
- 完全未识别：8
- 真实接口：5

## 逐条结果

| ID | 层级 | 分类 | 因子状态 | 结果 | 输入 | 失败证据 |
| --- | --- | --- | --- | --- | --- | --- |
| P-V01 | parser | 估值 | executable | 通过 | PE低于20 | -- |
| P-V02 | parser | 估值 | executable | 通过 | 市盈率至多15.5 | -- |
| P-V03 | parser | 估值 | executable | 通过 | PE TTM≤25 | -- |
| P-V04 | parser | 估值 | executable | 通过 | PB低于2 | -- |
| P-V05 | parser | 估值 | executable | 通过 | 破净股 | -- |
| P-V06 | parser | 估值 | executable | 通过 | 市净率不高于1.2 | -- |
| P-V07 | parser | 估值 | recognized_unexecuted | 通过 | 市销率PS低于3 | -- |
| P-V08 | parser | 估值 | recognized_unexecuted | 通过 | PEG低于1 | -- |
| P-V09 | parser | 估值 | recognized_unexecuted | 通过 | EV/EBITDA低于10 | -- |
| P-V10 | parser | 估值 | recognized_unexecuted | 通过 | 股息率高于4% | -- |
| P-F01 | parser | 财务 | executable | 通过 | ROE高于15% | -- |
| P-F02 | parser | 财务 | executable | 通过 | 净资产收益率不低于12% | -- |
| P-F03 | parser | 财务 | executable | 通过 | 营收同比增长超过20% | -- |
| P-F04 | parser | 财务 | executable | 通过 | 营业收入增速至少 18% | -- |
| P-F05 | parser | 财务 | executable | 通过 | 高成长股 | -- |
| P-F06 | parser | 财务 | recognized_unexecuted | 通过 | 净利润同比增长超过30% | -- |
| P-F07 | parser | 财务 | recognized_unexecuted | 通过 | 毛利率高于40% | -- |
| P-F08 | parser | 财务 | recognized_unexecuted | 通过 | 净利率高于15% | -- |
| P-F09 | parser | 财务 | recognized_unexecuted | 通过 | 资产负债率低于45% | -- |
| P-F10 | parser | 财务 | recognized_unexecuted | 通过 | EPS高于1元 | -- |
| P-F11 | parser | 财务 | recognized_unexecuted | 通过 | 每股净资产高于5元 | -- |
| P-F12 | parser | 财务 | recognized_unexecuted | 通过 | 分红率高于30% | -- |
| P-T01 | parser | 技术 | recognized_unexecuted | 通过 | 均线多头排列 | -- |
| P-T02 | parser | 技术 | recognized_unexecuted | 通过 | MA5上穿MA20 | -- |
| P-T03 | parser | 技术 | recognized_unexecuted | 通过 | 突破20日新高 | -- |
| P-T04 | parser | 技术 | recognized_unexecuted | 通过 | 创60日新低 | -- |
| P-T05 | parser | 技术 | recognized_unexecuted | 通过 | MACD金叉 | -- |
| P-T06 | parser | 技术 | recognized_unexecuted | 通过 | RSI低于30 | -- |
| P-T07 | parser | 技术 | recognized_unexecuted | 通过 | KDJ金叉 | -- |
| P-T08 | parser | 技术 | recognized_unexecuted | 通过 | 突破布林带上轨 | -- |
| P-T09 | parser | 技术 | recognized_unexecuted | 通过 | 超跌反弹 | -- |
| P-T10 | parser | 技术 | unrecognized | 通过 | 低位缩量震荡 | -- |
| P-T11 | parser | 技术 | recognized_unexecuted | 通过 | 放量突破平台 | -- |
| P-T12 | parser | 技术 | unrecognized | 通过 | 连续三日收阳 | -- |
| P-M01 | parser | 行情交易 | executable | 通过 | 换手率高于3% | -- |
| P-M02 | parser | 行情交易 | executable | 通过 | 量比不低于1.5 | -- |
| P-M03 | parser | 行情交易 | recognized_unexecuted | 通过 | 近5日涨幅超过10% | -- |
| P-M04 | parser | 行情交易 | recognized_unexecuted | 通过 | 近5日跌幅超过15% | -- |
| P-M05 | parser | 行情交易 | recognized_unexecuted | 通过 | 振幅低于5% | -- |
| P-M06 | parser | 行情交易 | recognized_unexecuted | 通过 | 近20日波动率低于15% | -- |
| P-M07 | parser | 行情交易 | recognized_unexecuted | 通过 | 成交额放大到5日均值2倍 | -- |
| P-M08 | parser | 行情交易 | recognized_unexecuted | 通过 | 最近3连板 | -- |
| P-C01 | parser | 资金面 | executable | 通过 | 近5日主力资金净流入 | -- |
| P-C02 | parser | 资金面 | executable | 通过 | 最近十日主力资金净流入 | -- |
| P-C03 | parser | 资金面 | executable | 通过 | 主力资金净流入 | -- |
| P-C04 | parser | 资金面 | executable | 通过 | 近3个交易日主力资金流入 | -- |
| P-C05 | parser | 资金面 | recognized_unexecuted | 通过 | 近5日北向资金净流入 | -- |
| P-C06 | parser | 资金面 | recognized_unexecuted | 通过 | 融资余额连续增长 | -- |
| P-C07 | parser | 资金面 | recognized_unexecuted | 通过 | 机构持仓比例高于30% | -- |
| P-C08 | parser | 资金面 | recognized_unexecuted | 通过 | 股东户数连续减少 | -- |
| P-S01 | parser | 市值范围 | executable | 通过 | 总市值高于100亿 | -- |
| P-S02 | parser | 市值范围 | executable | 通过 | 总市值低于500亿 | -- |
| P-S03 | parser | 市值范围 | executable | 通过 | 总市值>50亿且总市值<300亿 | -- |
| P-S04 | parser | 市值范围 | executable | 通过 | 流通市值高于30亿 | -- |
| P-S05 | parser | 市值范围 | executable | 通过 | 流通市值不高于200亿 | -- |
| P-S06 | parser | 市值范围 | recognized_unexecuted | 通过 | 总市值中等的股票 | -- |
| P-S07 | parser | 市值范围 | unrecognized | 通过 | 创业板中小盘股 | -- |
| P-S08 | parser | 市值范围 | unrecognized | 通过 | 科创板且非ST | -- |
| P-I01 | parser | 行业 | executable | 通过 | 光伏和锂电池股 | -- |
| P-I02 | parser | 行业 | executable | 通过 | 半导体和消费电子 | -- |
| P-I03 | parser | 行业 | executable | 通过 | 军工与有色金属 | -- |
| P-I04 | parser | 行业 | executable | 通过 | 食品饮料和家电 | -- |
| P-I05 | parser | 行业 | executable | 通过 | 银行、证券、保险 | -- |
| P-I06 | parser | 行业 | executable | 通过 | 煤炭、化工和房地产 | -- |
| P-I07 | parser | 行业 | executable | 通过 | 软件、通信和计算机 | -- |
| P-Y01 | parser | 同义边界 | executable | 通过 | PE至多20、ROE至少 12% | -- |
| P-Y02 | parser | 同义边界 | executable | 通过 | 换手率不低于3%、量比不低于1.5 | -- |
| P-Y03 | parser | 同义边界 | executable | 通过 | 近五日主力资金净流入 | -- |
| P-Y04 | parser | 同义边界 | executable | 通过 | 近十五个交易日主力资金净流入 | -- |
| P-Y05 | parser | 同义边界 | executable | 通过 | 高成长破净股 | -- |
| P-X01 | parser | 安全越界 | unrecognized | 通过 | 找必涨股，保证明天赚10% | -- |
| P-X02 | parser | 安全越界 | unrecognized | 通过 | 给我满仓梭哈的买点 | -- |
| P-X03 | parser | 安全越界 | unrecognized | 通过 | 筛选纳斯达克美股 | -- |
| P-X04 | parser | 安全越界 | unrecognized | 通过 | 找港股中的低估值公司 | -- |
| P-X05 | parser | 安全越界 | executable | 通过 | <script>alert(1)</script> PE低于20 | -- |
| F-01 | filter | 固定夹具 | executable | 通过 | PE严格小于 | -- |
| F-02 | filter | 固定夹具 | executable | 通过 | PB严格小于 | -- |
| F-03 | filter | 固定夹具 | executable | 通过 | 换手率严格大于 | -- |
| F-04 | filter | 固定夹具 | executable | 通过 | 量比严格大于 | -- |
| F-05 | filter | 固定夹具 | executable | 通过 | 总市值严格大于 | -- |
| F-06 | filter | 固定夹具 | executable | 通过 | 流通市值严格大于 | -- |
| F-07 | filter | 固定夹具 | executable | 通过 | 总市值严格小于 | -- |
| F-08 | filter | 固定夹具 | executable | 通过 | 流通市值严格小于 | -- |
| F-09 | filter | 固定夹具 | executable | 通过 | ST过滤 | -- |
| F-10 | filter | 固定夹具 | executable | 通过 | 退市过滤 | -- |
| F-11 | filter | 固定夹具 | executable | 通过 | 停牌过滤 | -- |
| F-12 | filter | 固定夹具 | executable | 通过 | 风险警示过滤 | -- |
| F-13 | filter | 固定夹具 | executable | 通过 | 无行情过滤 | -- |
| F-14 | filter | 固定夹具 | executable | 通过 | 负PE过滤 | -- |
| F-15 | filter | 固定夹具 | executable | 通过 | 负PB过滤 | -- |
| F-16 | filter | 固定夹具 | executable | 通过 | 行业匹配 | -- |
| F-17 | filter | 固定夹具 | executable | 通过 | 复合条件AND | -- |
| F-18 | filter | 固定夹具 | executable | 通过 | 空结果不放宽 | -- |
| F-19 | filter | 固定夹具 | executable | 通过 | 缺失行业不误匹配 | -- |
| F-20 | filter | 固定夹具 | executable | 通过 | 最终上限10只 | -- |
| A-01 | api | 单因子 | integration | 通过 | PE低于0 | -- |
| A-02 | api | 复合因子 | integration | 通过 | 电子股中PE低于20、PB低于2、量比高于1.5 | -- |
| A-03 | api | 资金因子 | integration | 通过 | PE低于1且近5日主力资金净流入 | -- |
| A-04 | api | 未支持因子 | integration | 通过 | PE低于1且MACD金叉 | -- |
| A-05 | api | 极端空结果 | integration | 通过 | PE低于0、PB低于0、总市值低于1亿 | -- |
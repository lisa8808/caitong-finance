const selectionIntentPattern = /(?:标的\s*(?:筛选|选择)|筛选|选股|选股票|筛股票|找股|挑股|高成长|低估值|高ROE|市盈率|市净率|总市值|流通市值|主力资金|大市值|大盘股|超跌反弹)/i;
const selectionContinuationPattern = /^(?:标的\s*(?:筛选|选择)|选股|按(?:照)?(?:上一步|上一轮|刚才|前面|当前|该)策略(?:进行)?选股|按(?:照)?策略(?:进行)?选股|按(?:照)?(?:上一步|上一轮|刚才|前面|当前)(?:条件|规则)?(?:进行)?(?:筛选|选股)|继续(?:进行)?(?:筛选|选股)|沿用(?:刚才|上一步|上一轮)?(?:条件|策略|规则)?(?:筛选|选股)?|保持(?:当前|刚才|上一步)?(?:条件|策略)?(?:筛选|选股)?)\s*(?:一下|吧|呢|看看)?\s*[。！？!！]?$/i;
const quantitativeAnswerPattern = /(A股自然语言量化选股报告|用户需求解析|生效筛选因子|PE(?:_TTM)?\s*(?:低于|小于|<)|市盈率\s*(?:低于|小于|<)|总市值\s*(?:大于|高于|超过|>|≥)|营收(?:同比)?(?:增长|增速)|ROE\s*(?:大于|高于|超过|>|≥)|量化条件|筛选条件)/i;

/** Return the latest selection turn plus its quantified answer, excluding unrelated chat. */
export function buildStockSelectionContext(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return undefined;
  let start = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role === 'user' && selectionIntentPattern.test(message.content)
      && !selectionContinuationPattern.test(message.content.trim())) {
      start = index;
      break;
    }
  }
  if (start < 0) {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role === 'assistant' && quantitativeAnswerPattern.test(message.content)) {
        start = Math.max(0, messages.slice(0, index).map((item) => item.role).lastIndexOf('user'));
        break;
      }
    }
  }
  if (start < 0) return undefined;
  const end = messages.findIndex((message, index) => index > start && message.role === 'user');
  return messages
    .slice(start, end < 0 ? messages.length : end)
    .filter((message) => String(message.content || '').trim())
    .map((message) => `${message.role === 'user' ? '用户' : '助手'}：${String(message.content).trim()}`)
    .join('\n');
}

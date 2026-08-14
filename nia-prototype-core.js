export const DAY_TYPES = ['营业', '陪同训练', '外出', '制作人工作'];

const suggestedDays = [
  { type: '制作人工作', title: '争取新人竞技综艺', purpose: '咲季自主训练时，制作人向节目组提案并协商环节', output: '出演机会、节目条件与正式营业简报' },
  { type: '陪同训练', title: '综艺临场针对训练', purpose: '针对节目条件暴露出的具体问题进行准备', output: '可在正式营业中使用的训练成果' },
  { type: '外出', title: '心情调剂', purpose: '离开工作环境，让制作人与咲季重新确认本轮方向', output: '由玩家当天选择形成的角色观察与双方共识' },
  { type: '营业', title: '生活Vlog公开预热', purpose: '使用前三日实际取得的素材建立观众预期', output: '观众反馈与第一批形象证据' },
  { type: '营业', title: '新人竞技综艺正式出演', purpose: '回收前四日成果，公开验证实力与自然可爱的反差', output: '粉丝、公众印象与下一轮课题' }
];

export function compileSakiDraft(draft = {}) {
  return {
    original: { ...draft },
    goal: String(draft.goal || '').trim(),
    publicImage: '实力强大而可靠；骄傲又坦率，受到认可时会高兴得完全藏不住',
    principle: '不要求咲季表演可爱，而是创造能让她认真争胜并自然获得认可的场合',
    spine: '以一次连续的挑战企划串联Vlog、训练、日常观察与新人竞技综艺',
    evidence: [
      '为胜利认真准备并展现扎实实力',
      '在共同任务中自然照顾或帮助他人',
      '受到真诚肯定后藏不住高兴'
    ],
    risks: ['只拍出完美优等生，缺少亲近感', '为了可爱而刻意表演', '前期内容与最终综艺互不承接'],
    days: suggestedDays.map((day, index) => ({ ...day, id: `day-${index + 1}` }))
  };
}

export function validateSchedule(days = []) {
  const types = days.map((day) => day.type);
  const warnings = [];
  if (!types.includes('陪同训练')) warnings.push('本轮没有陪同训练，缺少解决偶像具体困难的节点。');
  if (!types.includes('外出')) warnings.push('本轮没有外出，缺少制作人与偶像的心情调剂。');
  if (!types.includes('制作人工作')) warnings.push('本轮没有制作人工作，公开机会与资源来源不明确。');
  if (!types.includes('营业')) warnings.push('本轮没有营业，无法获得粉丝或公开验证企划。');
  if (types.filter((type) => type === '营业').length < 2) warnings.push('建议安排前期营业和最终公开营业，使观众反馈能够前后承接。');
  return { ready: warnings.length === 0, warnings };
}

export function parseGuidance(text = '') {
  const source = String(text).trim();
  const has = (pattern) => pattern.test(source);
  const tags = [];
  if (has(/全力|认真|取胜|比赛/)) tags.push('全力竞技');
  if (has(/搭档|帮助|协作|照顾/)) tags.push('照顾搭档');
  if (has(/真诚|实际表现|肯定|夸奖|夸/)) tags.push('真实肯定');
  if (has(/不.*刻意|自然|不要求.*卖萌/)) tags.push('自然反应');
  const rejectsCutePerformance = has(/不(?:要求|要|必|用).*?(?:刻意)?卖萌|不要.*?卖萌/);
  if (!rejectsCutePerformance && has(/刻意卖萌|卖萌|节目效果|可爱动作/)) tags.push('表演式可爱');
  return {
    source,
    tags,
    strategy: tags.includes('表演式可爱') ? '直接制造可爱节目效果' : '用真实竞技与认可形成自然反差',
    boundaries: tags.includes('自然反应') ? ['不要求刻意卖萌', '不故意使咲季出丑'] : [],
    accepted: true
  };
}

export function resolveBusiness(intent = {}) {
  const tags = new Set(intent.tags || []);
  const natural = tags.has('自然反应') && tags.has('真实肯定');
  const directCute = tags.has('表演式可爱');
  const hooks = [
    { id: 'strength', label: '竞技实力高光', status: tags.has('全力竞技') ? 'formed' : 'missed', fans: tags.has('全力竞技') ? 360 : 0 },
    { id: 'teamwork', label: '搭档协作高光', status: tags.has('照顾搭档') ? 'formed' : 'missed', fans: tags.has('照顾搭档') ? 280 : 0 },
    { id: 'contrast', label: '赛后自然反差', status: natural ? 'highlight' : 'missed', fans: natural ? 520 : 0 },
    { id: 'direct-cute', label: '直接可爱环节', status: directCute ? 'formed' : 'missed', fans: directCute ? 430 : 0 },
    { id: 'continuity', label: 'Vlog企划回收', status: natural || tags.has('全力竞技') ? 'formed' : 'weak', fans: natural ? 220 : tags.has('全力竞技') ? 120 : 0 }
  ];
  const bonus = hooks.reduce((sum, hook) => sum + hook.fans, 0);
  const pressure = directCute ? 9 : natural ? 6 : 7;
  const impressions = directCute
    ? ['节目感很强', '意外地会配合可爱环节', '与此前的强者形象略有偏移']
    : natural
      ? ['实力强大', '可靠而会照顾搭档', '受到认可时坦率可爱']
      : ['实力稳定', '企划形象尚未完全成立'];
  return {
    baseFans: 2100,
    bonus,
    fans: 2100 + bonus,
    pressure,
    hooks,
    impressions,
    summary: directCute
      ? '节目取得直接效果，但咲季对被设计好的可爱反应略感别扭。'
      : natural
        ? '训练、搭档协作和赛后肯定形成同一个公开高光，完整回收本轮企划。'
        : '营业完成，但指导尚未形成足够鲜明的传播场面。'
  };
}

const text = (value, limit = 1000) => String(value || '').trim().slice(0, limit);
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

function taggedJsonBodies(value, tag) {
  const source = String(value || '').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&');
  const opens = [...source.matchAll(new RegExp('<' + tag + '\\b[^>]*>', 'gi'))];
  const closes = [...source.matchAll(new RegExp('<\\/' + tag + '\\s*>', 'gi'))];
  const bodies = [];
  let openIndex = opens.length - 1;
  for (let closeIndex = closes.length - 1; closeIndex >= 0 && openIndex >= 0; closeIndex -= 1) {
    const close = closes[closeIndex];
    while (openIndex >= 0 && opens[openIndex].index > close.index) openIndex -= 1;
    if (openIndex < 0) break;
    const open = opens[openIndex];
    bodies.push(source.slice(open.index + open[0].length, close.index));
    openIndex -= 1;
  }
  return bodies;
}

function lastValidTaggedJson(value, tag) {
  const bodies = taggedJsonBodies(value, tag);
  for (const body of bodies) {
    try { return { ok: true, data: JSON.parse(body.trim()) }; }
    catch { /* Ignore leaked examples and incomplete blocks. */ }
  }
  return { ok: false, reason: bodies.length ? 'invalid_json' : 'missing_fan_milestone' };
}

function hasOnlyVnTags(story) {
  const value = text(story, 12000);
  if (!value || /<\/?(?:story|option\d*|content|tableEdit)\b/i.test(value)) return false;
  if (!/<(?:dialogue|narration)\b/i.test(value)) return false;
  const remainder = value
    .replace(/<dialogue\s+char="[^"]+">[\s\S]*?<\/dialogue>/gi, '')
    .replace(/<narration>[\s\S]*?<\/narration>/gi, '')
    .trim();
  return !remainder;
}

function buildRouteAnchorsEpisodePrompt(source, runtime, eventId) {
  const route = object(source.route);
  const episode = Array.isArray(route.episodes)
    ? route.episodes.find((entry) => String(entry?.eventId || '') === eventId)
    : null;
  const anchors = Array.isArray(episode?.promptAnchors) ? episode.promptAnchors.filter(Boolean) : [];
  const idolName = text(source.idolName, 80) || text(route.idolName, 80) || '担当偶像';
  const shape = {
    schemaVersion: 1,
    eventId,
    story: '<narration>...</narration><dialogue char="角色名">“...”</dialogue>'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_FAN_MILESTONE_EVENT]',
    `生成${idolName}在 N.I.A 育成期间的第 ${Number(episode?.episode) || 12} 话固定剧情。`,
    `事件 ID：${eventId}`,
    `当前 N.I.A 粉丝数：${Math.max(0, Math.floor(Number(source.fans ?? runtime.triggeredAtFans) || 0))}`,
    `担当偶像：${idolName}`,
    `制作人资料：${JSON.stringify(object(source.producer))}`,
    '这是固定剧情的自然改写，只承担关系与成长叙事，不增加好感度、粉丝、属性，不推进日期、时段、行动或营业结算。',
    '必须依次自然完成以下剧情锚点：',
    ...anchors.map((anchor, index) => `${index + 1}. ${anchor}`),
    '允许补充自然的场景、动作、心理和对白，但不得改变锚点顺序、人物关系、比赛阶段或结论。',
    '不得把 H.I.F 写成当前 N.I.A 的同一赛事；若锚点提到 H.I.F，只能作为后续目标或背景。',
    '遵守当前角色卡和世界书中的 speaker、立绘功能词与姓名规则；不要自行发明功能词。',
    'story 内只能连续使用 <dialogue char="角色名">台词</dialogue> 与 <narration>旁白</narration>。',
    '不要输出选项、自由输入、Markdown、解释、思考文本、普通剧情外壳或数据库操作。',
    '只输出最后一个完整 JSON 标签块：',
    '<NIA_FAN_MILESTONE_EVENT>',
    JSON.stringify(shape),
    '</NIA_FAN_MILESTONE_EVENT>'
  ].join('\n');
}

function buildSakiEpisode13Prompt(source, runtime, eventId) {
  const shape = {
    schemaVersion: 1,
    eventId,
    story: '<narration>...</narration><dialogue char="花海咲季(平常待机)">“...”</dialogue>'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_FAN_MILESTONE_EVENT]',
    '生成花海咲季在 N.I.A 育成期间达到 10000 粉丝后播放的第 13 话剧情。',
    `事件 ID：${eventId}`,
    `当前 N.I.A 粉丝数：${Math.max(0, Math.floor(Number(source.fans ?? runtime.triggeredAtFans) || 0))}`,
    `担当偶像：${text(source.idolName, 80) || '花海咲季'}`,
    `制作人资料：${JSON.stringify(object(source.producer))}`,
    '这是固定剧情的自然改写，不增加好感度、粉丝、属性，不推进日期、时段或行动。',
    '剧情必须依次保留以下内容：',
    '1. 咲季冷静整理现状：粉丝和得票持续增加，但按现在的实力仍难以战胜佑芽。',
    '2. 她承认上次取胜无法稳定复现，因此必须随时发挥并超越当时的自己。',
    '3. 制作人建议继续积累粉丝、提高 N.I.A 排名；咲季担心仅靠这些仍不足以改变决定性因素。',
    '4. 制作人用“粉丝是偶像的体外肌肉”开解她；咲季觉得比喻奇怪，却接受了需要继续锻炼这份力量。',
    '5. 咲季开始正视别校偶像，制作人拿出调查资料，重点提到极月学园及其强敌。',
    '6. 咲季重新燃起斗志，要把强敌化为成长的食粮。',
    '7. 制作人说与咲季相识后一直在苦战，却乐在其中；咲季回应自己也一样，约定继续享受这场苦战。',
    '允许补充自然的动作、表情和场景衔接，但不得改变人物关系、比赛目标或上述结论。',
    '花海咲季的 speaker 必须使用已支持的差分格式“花海咲季(功能词)”；制作人可写“制作人”，旁白 speaker 不适用。',
    'story 内只能连续使用 <dialogue char="角色名">“台词”</dialogue> 与 <narration>旁白</narration>。',
    '不要输出选项、自由输入、Markdown、解释、思考文本、营业结算或数据库操作。',
    '不得输出或修改 fanGain、affinityGain、好感度、粉丝、属性、排名、时间。',
    '只输出最后一个完整 JSON 标签块：',
    '<NIA_FAN_MILESTONE_EVENT>',
    JSON.stringify(shape),
    '</NIA_FAN_MILESTONE_EVENT>'
  ].join('\n');
}

function buildSakiEpisode14Prompt(source, runtime, eventId) {
  const shape = {
    schemaVersion: 1,
    eventId,
    story: '<narration>...</narration><dialogue char="花海咲季(平常待机)">“...”</dialogue>'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_FAN_MILESTONE_EVENT]',
    '生成花海咲季 N.I.A 篇第 14 话。播放时间是第二轮第 5 日结束后，距离第二轮选拔还有一天日程。',
    `事件 ID：${eventId}`,
    `当前 N.I.A 粉丝数：${Math.max(0, Math.floor(Number(source.fans ?? runtime.triggeredAtFans) || 0))}`,
    `担当偶像：${text(source.idolName, 80) || '花海咲季'}`,
    `制作人资料：${JSON.stringify(object(source.producer))}`,
    '这是固定剧情的自然改写，不增加好感度、粉丝、属性，不推进日期、时段或行动，也不要开始第二轮选拔。',
    '剧情必须依次保留以下内容：',
    '1. 咲季兴奋地邀请制作人一起观看佑芽的演出，既以粉丝身份期待妹妹，也以对手身份观察她的成长。',
    '2. 制作人提醒佑芽可能无法通过这场选拔；咲季坚信如今的佑芽不可能输给自己以外的人。',
    '3. 佑芽败给贺阳燐羽，咲季震惊后先安慰妹妹，提醒她们约定在 FINALE 相见，并承诺替她报仇。',
    '4. 贺阳燐羽现身。她是初星学园初中部顶级组合 SyngUp! 的原队长，也是极月学园阵营的强敌。',
    '5. 燐羽原本打算停止参加后续选拔，咲季向她正式挑战；燐羽轻视咲季的实力。',
    '6. 佑芽坚定维护姐姐，相信咲季不会输；燐羽因此改主意，接受下一场选拔的挑战。',
    '7. 以咲季和燐羽约定在第二轮选拔见真章收尾，为次日选拔建立明确对手关系。',
    '允许补充自然的场馆转场、动作与表情，但不得改变胜负、人物关系、挑战约定或上述结论。',
    '花海咲季的 speaker 必须写成“花海咲季(功能词)”；其他角色遵守各自世界书中的立绘情绪标记规则，不在本提示词中另作限制；制作人写“制作人”。',
    'story 内只能连续使用 <dialogue char="角色名">“台词”</dialogue> 与 <narration>旁白</narration>。',
    '不要输出选项、自由输入、Markdown、解释、思考文本、营业结算或数据库操作。',
    '不得输出或修改 fanGain、affinityGain、好感度、粉丝、属性、排名、时间。',
    '只输出最后一个完整 JSON 标签块：',
    '<NIA_FAN_MILESTONE_EVENT>',
    JSON.stringify(shape),
    '</NIA_FAN_MILESTONE_EVENT>'
  ].join('\n');
}

function buildSakiEpisode15Prompt(source, runtime, eventId) {
  const shape = {
    schemaVersion: 1,
    eventId,
    story: '<narration>...</narration><dialogue char="花海咲季(平常待机)">“...”</dialogue>'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_FAN_MILESTONE_EVENT]',
    '生成花海咲季 N.I.A 篇第 15 话。播放时间是第二轮第 6 日结束后、第二轮选拔《QUARTET》正式开始前。',
    `事件 ID：${eventId}`,
    `当前 N.I.A 粉丝数：${Math.max(0, Math.floor(Number(source.fans ?? runtime.triggeredAtFans) || 0))}`,
    `担当偶像：${text(source.idolName, 80) || '花海咲季'}`,
    `制作人资料：${JSON.stringify(object(source.producer))}`,
    '这是固定剧情的自然改写，不增加好感度、粉丝、属性，不推进日期、时段或行动，不描写正式演出过程或选拔结果。',
    '剧情必须依次保留以下内容：',
    '1. 咲季宣布接下来参加的第二轮选拔是《QUARTET》，并说明自己主动选择与贺阳燐羽竞争。',
    '2. 制作人没有责怪她，反而称赞她主动迎战强敌；咲季因直白夸奖而短暂害羞。',
    '3. 制作人确认能击败如今佑芽的燐羽，正是咲季成长所需要的强敌；咲季认同她够格成为对手。',
    '4. 制作人询问面对燐羽是否有胜算。咲季因制作人对燐羽使用敬称而吃醋，要求制作人明确咲季才是第一。',
    '5. 咲季坦率承认自己的实力不如佑芽，挑战击败佑芽的燐羽看似不自量力。',
    '6. 她发现自己以往会颤抖的双手现在很稳定，并回想“粉丝是偶像的体外肌肉”这一说法，确认粉丝支持给了自己力量。',
    '7. 咲季要求制作人看好她的演出并重新迷上她，宣言要用毅力、逞强、实力和额外的勇气替妹妹报仇。',
    '以登台前的宣言收尾，不得提前开始《QUARTET》的舞台演出。',
    '花海咲季的 speaker 必须写成“花海咲季(功能词)”；制作人写“制作人”，旁白使用 narration。',
    'story 内只能连续使用 <dialogue char="角色名">“台词”</dialogue> 与 <narration>旁白</narration>。',
    '不要输出选项、自由输入、Markdown、解释、思考文本、营业结算或数据库操作。',
    '不得输出或修改 fanGain、affinityGain、好感度、粉丝、属性、排名、时间。',
    '只输出最后一个完整 JSON 标签块：',
    '<NIA_FAN_MILESTONE_EVENT>',
    JSON.stringify(shape),
    '</NIA_FAN_MILESTONE_EVENT>'
  ].join('\n');
}

function buildSakiEpisode16Prompt(source, runtime, eventId) {
  const shape = {
    schemaVersion: 1,
    eventId,
    story: '<narration>...</narration><dialogue char="花海咲季(得意大笑)">“...”</dialogue>'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_FAN_MILESTONE_EVENT]',
    '生成花海咲季 N.I.A 篇第 16 话。播放时间是第二轮选拔《QUARTET》第一名晋级且赛后复盘完整结束之后。',
    `事件 ID：${eventId}`,
    `当前 N.I.A 粉丝数：${Math.max(0, Math.floor(Number(source.fans ?? runtime.triggeredAtFans) || 0))}`,
    `担当偶像：${text(source.idolName, 80) || '花海咲季'}`,
    `制作人资料：${JSON.stringify(object(source.producer))}`,
    `第二轮试镜冻结结果：${JSON.stringify(object(source.auditionResult))}`,
    `第二轮赛后复盘摘要：${text(source.auditionRecapSummary, 1200) || '已完成赛后复盘。'}`,
    '这是固定剧情的自然改写，不增加好感度、粉丝、属性，不推进日期、时段或行动，不重复描写正式演出和试镜结算。',
    '剧情必须依次保留以下内容：',
    '1. 咲季在胜利后兴奋地呼唤佑芽。佑芽称赞姐姐非常帅，并感谢姐姐替自己报仇；咲季以姐姐身份得意地接受称赞。',
    '2. 制作人向咲季道辛苦。咲季追问制作人看到自己击败燐羽是否痛快、有没有重新迷上自己；制作人明确眼中本来就只有咲季，咲季欣然接受并更加得意。',
    '3. 贺阳燐羽出现，询问咲季究竟如何战胜自己。咲季坦率承认燐羽在歌舞等偶像能力上远胜自己，按常理自己毫无胜算。',
    '4. 咲季指出自己拥有燐羽没有、也无法体会的某种本源力量，随后断言燐羽还算不上真正的偶像；自己未来要成为顶级偶像，不会输给她。',
    '5. 咲季补充真正不能输的理由：自己已经和妹妹约好要替她报仇，当姐姐的怎么能对妹妹说话不算话；无论对手是谁，她都绝对不能输。佑芽因此非常感动。',
    '6. 燐羽听见咲季把姐姐的约定看得如此重要后，必须明显受到触动。她理解到支撑咲季取胜的是自己未曾拥有的姐妹羁绊，短暂停顿并坦率流露羡慕，随后才评价咲季卸下伪装时最有魅力，并主动亲吻咲季脸颊；咲季震惊得说不出完整的话。',
    '7. 燐羽以“咲季姐姐”称呼她并离开。佑芽在沉默后向制作人宣布自己最讨厌燐羽，以姐妹之间吃醋又亲密的余韵收尾。',
    '允许补充自然的后台场景、动作和表情，但不得改变第二轮由咲季获胜、燐羽的提问、亲吻脸颊或佑芽最后吃醋的结论。',
    '燐羽的亲吻必须明确承接她被“姐姐守诺与姐妹羁绊”触动的情绪变化，不得写成毫无铺垫的突然调戏，也不得省略她被触动和羡慕的反应。',
    '咲季面对制作人的准确称赞时应欣然接受并迅速得意忘形，不要写成传统傲娇式否认。',
    '花海咲季的 speaker 必须写成“花海咲季(功能词)”；其他角色遵守各自世界书中的立绘情绪标记规则，不在本提示词中另作限制；制作人写“制作人”。',
    'story 内只能连续使用 <dialogue char="角色名">“台词”</dialogue> 与 <narration>旁白</narration>。',
    '不要输出选项、自由输入、Markdown、解释、思考文本、营业结算或数据库操作。',
    '不得输出或修改 fanGain、affinityGain、好感度、粉丝、属性、排名、时间。',
    '只输出最后一个完整 JSON 标签块：',
    '<NIA_FAN_MILESTONE_EVENT>',
    JSON.stringify(shape),
    '</NIA_FAN_MILESTONE_EVENT>'
  ].join('\n');
}

function buildSakiEpisode17Prompt(source, runtime, eventId) {
  const shape = {
    schemaVersion: 1,
    eventId,
    story: '<narration>...</narration><dialogue char="花海咲季(得意大笑)">“...”</dialogue>'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_FAN_MILESTONE_EVENT]',
    '生成花海咲季 N.I.A 篇第 17 话。播放时间是第三轮第一次营业完整结算之后。',
    `事件 ID：${eventId}`,
    `当前 N.I.A 粉丝数：${Math.max(0, Math.floor(Number(source.fans ?? runtime.triggeredAtFans) || 0))}`,
    `担当偶像：${text(source.idolName, 80) || '花海咲季'}`,
    `制作人资料：${JSON.stringify(object(source.producer))}`,
    `刚完成的第三轮营业结果：${JSON.stringify(object(source.latestBusinessResult))}`,
    '这是固定剧情的自然改写，不增加好感度、粉丝、属性，不推进日期、时段或行动，不重复结算刚完成的营业。',
    '剧情承接第 16 话：贺阳燐羽因咲季守护与妹妹的约定而受到触动，称她为“咲季姐姐”并亲吻了她的脸颊；佑芽对此非常吃醋。',
    '剧情必须依次保留以下内容：',
    '1. 咲季完成第三轮第一次营业回到制作人身边。制作人欢迎她回来并明确称赞这次表现出色；咲季欣然接受，轻快而得意地回答“那是当然的”。',
    '2. 制作人告诉咲季有客人在等她。咲季发现是仍在生气的佑芽，立刻动摇并试图确认妹妹为什么还没消气。',
    '3. 佑芽指出咲季被自己以外的人叫“姐姐”后明显害羞、僵住了很久。咲季急忙否认，并解释自己当时是在思考燐羽此前说的“卸下伪装时最有魅力”。',
    '4. 咲季不肯把燐羽的话完整告诉佑芽。佑芽更加确信其中有猫腻；咲季无奈追问究竟怎样才能得到原谅。',
    '5. 佑芽要求按照原先约定，在 N.I.A《FINALE》上决胜负：咲季如果能赢过她，她就原谅姐姐。咲季觉得条件很简单，并因自己已经打败过战胜佑芽的燐羽而确信姐妹实力差距很大。',
    '6. 佑芽不服气，强调现在的自己已经与输给燐羽时不同。咲季让她用实力证明，宣言姐姐会一直等着她；佑芽回应这次一定会赢，到时再和好。',
    '7. 佑芽离开后，咲季向制作人承认自己作为姐姐已经夸下海口，询问制作人的判断。制作人根据过往数据指出：佑芽只有面对咲季时，才会发挥出前所未有的实力。',
    '8. 咲季虽然发愁，却坦率承认自己正喜欢妹妹这一点。最后她提醒制作人下一步就是《FINALE》，要求制作人做好觉悟，与自己一起前进。',
    '允许补充第三轮营业归来后的自然转场、动作和表情，但不得改变姐妹吃醋、FINALE 决胜约定、制作人的数据判断或共同前进的结论。',
    '咲季被制作人称赞时必须欣然接受并迅速得意，不要写成嘴硬否认；她对燐羽相关话题的慌张来自被佑芽追问，不要泛化成传统傲娇。',
    '花海咲季的 speaker 必须写成“花海咲季(功能词)”；其他角色遵守各自世界书中的立绘情绪标记规则，不在本提示词中另作限制；制作人写“制作人”。',
    'story 内只能连续使用 <dialogue char="角色名">“台词”</dialogue> 与 <narration>旁白</narration>。',
    '不要输出选项、自由输入、Markdown、解释、思考文本、营业结算或数据库操作。',
    '不得输出或修改 fanGain、affinityGain、好感度、粉丝、属性、排名、时间。',
    '只输出最后一个完整 JSON 标签块：',
    '<NIA_FAN_MILESTONE_EVENT>',
    JSON.stringify(shape),
    '</NIA_FAN_MILESTONE_EVENT>'
  ].join('\n');
}

function buildSakiEpisode18Prompt(source, runtime, eventId) {
  const shape = {
    schemaVersion: 1,
    eventId,
    story: '<narration>...</narration><dialogue char="花海咲季(振奋宣言)">“...”</dialogue>'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_FAN_MILESTONE_EVENT]',
    '生成花海咲季 N.I.A 篇第 18 话。播放时间是第三轮五日企划全部完成、正式开始 FINALE 之前。',
    `事件 ID：${eventId}`,
    `当前 N.I.A 粉丝数：${Math.max(0, Math.floor(Number(source.fans ?? runtime.triggeredAtFans) || 0))}`,
    `担当偶像：${text(source.idolName, 80) || '花海咲季'}`,
    `制作人资料：${JSON.stringify(object(source.producer))}`,
    '这是固定剧情的自然改写，不增加好感度、粉丝、属性，不推进日期、时段或行动，不提前结算 FINALE。',
    '剧情必须依次保留以下内容：',
    '1. 制作人向刚完成第三轮企划的咲季宣布，接下来要参加的选拔是《FINALE》。',
    '2. 咲季听到终于要和佑芽决战后，身体止不住发抖；她坦白自己早已被妹妹甩在身后，胜算非常渺茫。',
    '3. 咲季回忆上一次靠拼尽全力、全心全意歌唱和舞蹈才战胜佑芽的经历，承认那次表现或许无法简单复现。',
    '4. 制作人提醒她，粉丝是偶像的体外肌肉和力量根源；咲季发现这一次双手却没有像过去那样颤抖。',
    '5. 咲季要求制作人看好她的演出、重新迷上她，并宣言要用毅力、逞强、实力和额外的勇气替妹妹报仇。',
    '6. 剧情停在正式进入 FINALE 前的决意，不描写 FINALE 的舞台、分数、排名或胜负。',
    '咲季面对制作人的肯定应欣然接受并保持自信；她的紧张来自面对佑芽和未知胜负，不要泛化成传统傲娇。',
    '花海咲季的 speaker 必须写成“花海咲季(功能词)”；其他角色遵守各自世界书中的立绘情绪标记规则，不在本提示词中另作限制；制作人写“制作人”。',
    'story 内只能连续使用 <dialogue char="角色名">“台词”</dialogue> 与 <narration>旁白</narration>。',
    '不要输出选项、自由输入、Markdown、解释、思考文本、营业结算或数据库操作。',
    '不得输出或修改 fanGain、affinityGain、好感度、粉丝、属性、排名、时间。',
    '只输出最后一个完整 JSON 标签块：',
    '<NIA_FAN_MILESTONE_EVENT>',
    JSON.stringify(shape),
    '</NIA_FAN_MILESTONE_EVENT>'
  ].join('\n');
}

function buildSakiEpisode19Prompt(source, runtime, eventId) {
  const shape = {
    schemaVersion: 1,
    eventId,
    story: '<narration>...</narration><dialogue char="花海咲季(温柔喜悦)">“...”</dialogue>'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_FAN_MILESTONE_EVENT]',
    '生成花海咲季 N.I.A 篇第 19 话。播放时间是 FINALE 第一名结算及制作人赛后复盘完整结束之后。',
    `事件 ID：${eventId}`,
    `当前 N.I.A 粉丝数：${Math.max(0, Math.floor(Number(source.fans ?? runtime.triggeredAtFans) || 0))}`,
    `担当偶像：${text(source.idolName, 80) || '花海咲季'}`,
    `制作人资料：${JSON.stringify(object(source.producer))}`,
    `FINALE 冻结结果：${JSON.stringify(object(source.auditionResult))}`,
    `FINALE 赛后复盘摘要：${text(source.auditionRecapSummary, 1200) || '咲季获得第一名，赛后复盘已经完成。'}`,
    '这是固定剧情的自然改写，不增加好感度、粉丝、属性，不推进日期、时段或行动，不重复演出、排名公布、奖励或制作人赛后复盘。',
    '剧情必须依次保留以下内容：',
    '1. FINALE 结束后，佑芽找到咲季，坦率承认自己输了；咲季平静确认自己赢了，佑芽向姐姐道贺。',
    '2. 咲季发现佑芽没有像往常那样立刻吵着不服。佑芽承认自己当然非常不服，也很想跑出去，但同时为终于能和姐姐在同一项目、同一舞台上尽情较量而高兴。',
    '3. 佑芽回忆过去即使与姐姐站上同一起跑线，也总是只能看着姐姐的背影远去，因此像今天这样长时间并肩竞争对她格外珍贵；她因落败而自责自己不中用。',
    '4. 咲季立刻制止佑芽贬低自己，明确告诉妹妹：自己不会再逃跑，自己就在这里，而佑芽已经追得非常近；她以姐姐身份真诚称赞佑芽不愧是自己的妹妹。',
    '5. 咲季主动约定下一场胜负：未来要在不输给今日的舞台、夏日烈阳与鼎沸欢呼中，再来一场足以让姐妹二人此生无憾、炫耀一辈子的热烈较量。',
    '6. 佑芽含泪答应。咲季要求两人在那之前继续磨练自己，并让佑芽亲眼看好、铭记姐姐接下来最帅气的瞬间。',
    '以姐妹正式约定再次较量收尾；不要让制作人抢占这场姐妹对话，也不要提前开始第 20 话。',
    '原文中的异常夹杂词应按上下文自然修正为中文，例如“同样开心”“我的妹妹”，不得照抄 prevalence、my 等异常词。',
    '花海咲季的 speaker 必须写成“花海咲季(功能词)”；其他角色遵守各自世界书中的立绘情绪标记规则，不在本提示词中另作限制；制作人写“制作人”。',
    'story 内只能连续使用 <dialogue char="角色名">“台词”</dialogue> 与 <narration>旁白</narration>。',
    '不要输出选项、自由输入、Markdown、解释、思考文本、结算或数据库操作。',
    '不得输出或修改 fanGain、affinityGain、好感度、粉丝、属性、排名、时间。',
    '只输出最后一个完整 JSON 标签块：',
    '<NIA_FAN_MILESTONE_EVENT>',
    JSON.stringify(shape),
    '</NIA_FAN_MILESTONE_EVENT>'
  ].join('\n');
}

function buildSakiEpisode20Prompt(source, runtime, eventId) {
  const shape = {
    schemaVersion: 1,
    eventId,
    story: '<narration>...</narration><dialogue char="花海咲季(真诚表态)">“...”</dialogue><dialogue char="制作人">“...”</dialogue>'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_FAN_MILESTONE_EVENT]',
    '生成花海咲季 N.I.A 篇第 20 话。播放时间是 FINALE 后第 19 话姐妹约定再战完整结束之后，作为本次 N.I.A 育成的关系收束。',
    `事件 ID：${eventId}`,
    `当前 N.I.A 粉丝数：${Math.max(0, Math.floor(Number(source.fans ?? runtime.triggeredAtFans) || 0))}`,
    `担当偶像：${text(source.idolName, 80) || '花海咲季'}`,
    `制作人资料：${JSON.stringify(object(source.producer))}`,
    `FINALE 冻结结果：${JSON.stringify(object(source.auditionResult))}`,
    `FINALE 赛后复盘摘要：${text(source.auditionRecapSummary, 1200) || '咲季获得第一名，并与佑芽约定未来再次较量。'}`,
    '这是固定剧情的自然改写，不增加好感度、粉丝、属性，不推进日期、时段或行动，不重复演出和结算。',
    '剧情必须依次保留以下内容：',
    '1. 与佑芽谈完后，咲季回到制作人身边。制作人欢迎她回来；咲季回望前所未有的观众规模和无数呼喊自己名字的粉丝，承认自己过去仍低估了粉丝的存在。',
    '2. 制作人询问在如此众多粉丝面前表演的感受。咲季坦率承认自己在台上和此刻都差点哭出来，并理解粉丝既是偶像的“体外肌肉”和力量根源，也是彰显实力的标准；她觉得自己终于窥见顶级偶像的一角。',
    '3. 咲季发现过去支持佑芽、曾被视为敌人的观众也在呼喊“咲季大人”，如今成为支撑自己、帮助自己战胜佑芽的力量。她向粉丝与让自己邂逅粉丝的制作人道谢。',
    '4. 制作人强调最终一锤定音的仍是咲季自己的实力。咲季抱怨制作人不肯老实接受感谢，随后郑重感谢制作人与粉丝，宣言要用今后无数场演出百倍回报。',
    '5. 咲季总结本次 N.I.A 最大收获：找到了即使面对强敌、陷入不利也能继续战斗的、属于偶像的独有武器。制作人确认这次培育圆满成功，同时看出她还有心事。',
    '6. 咲季坦白自己害怕有朝一日输给佑芽后再也站不起来，害怕紧绷的弦断裂、好不容易得到的武器彻底粉碎。制作人先回答“只要一次也不输”，再说明真正想法：道路终点不变即可，无论绕路或输过多少次，最后赢过所有人就行。',
    '7. 咲季追问如果自己真的在决战中倒下，制作人是否会拉她一把。制作人先回答“当然不会”，随后解释咲季即使无法站立也会匍匐前进、即使武器和心都破碎也会继续战斗，并会变得更强。',
    '8. 制作人进一步承诺：万一咲季真的就此陨落，自己也会陪她一同坠落，因为再也找不到比花海咲季更好的偶像。咲季确认他是认真的，感叹他比自己更信任自己。',
    '9. 咲季坦率庆幸没有与制作人为敌、庆幸制作人第一个邂逅的偶像是自己，最终认定制作人是自己的命中注定的搭档，并强势宣告绝对不会放手。',
    '完整收束 N.I.A 篇，不新增危机、选项、下一轮比赛或待处理事项。制作人的关键回答与承诺不得弱化成普通鼓励。',
    '花海咲季的 speaker 必须写成“花海咲季(咲季功能词)”；制作人只写“制作人”，不得添加功能词。',
    'story 内只能连续使用 <dialogue char="角色名">“台词”</dialogue> 与 <narration>旁白</narration>。',
    '不要输出选项、自由输入、Markdown、解释、思考文本、结算或数据库操作。',
    '不得输出或修改 fanGain、affinityGain、好感度、粉丝、属性、排名、时间。',
    '只输出最后一个完整 JSON 标签块：',
    '<NIA_FAN_MILESTONE_EVENT>',
    JSON.stringify(shape),
    '</NIA_FAN_MILESTONE_EVENT>'
  ].join('\n');
}

function buildKotoneEpisodePrompt(source, runtime, eventId) {
  const episodeMap = {
    'nia-kotone-fans-5000': {
      episode: 12,
      timing: '第一轮营业完成后、粉丝达到约 5000 时',
      beats: [
        '琴音因制作人长期出差而不安，误以为自己又被留下独自面对困难。',
        '十王星南主动提出协助琴音宣传，琴音先警惕地确认对方是否另有目的。',
        '制作人通过通讯明确说明出差是为了推进琴音的 N.I.A 计划，并让星南暂时照顾她。',
        '琴音接受星南的协助，但仍要求制作人回来后亲自确认她的表现。'
      ]
    },
    'nia-kotone-fans-5000-followup': {
      episode: 13,
      timing: '第 12 话结束后连续播放',
      continuity: [
        '琴音在本话所说的“战胜十王星南、成为一等星”，指向未来的 H.I.F 舞台，不是当前进行中的 N.I.A。',
        '当前 N.I.A 是琴音快速成长、积累名气，并为未来挑战星南做准备的阶段。',
        '本话只确立琴音未来在 H.I.F 挑战星南的目标，不展开 H.I.F 的赛制、日程、参赛流程或结局。',
        '不得把星南写成当前 N.I.A 的最终对手，也不得声称琴音会在本次 N.I.A 直接击败星南。'
      ],
      beats: [
        '紧接第 12 话制作人宣布长期出差的结尾。琴音向星南追问出差内幕；星南先坚持让琴音改口直呼“星南”，琴音从“星南会长”退到“星南前辈”，形成轻快的称呼拉锯。',
        '星南故意回答“秘密”，又提醒琴音制作人自己也说过暂时开不了口。琴音被吊足胃口而大声抗议。',
        '星南评价琴音的制作人很不一般，并提起自己曾想挖走琴音，却与制作人进行了一场“谁更能给予藤田琴音爱与指引”的较量后放弃。琴音吐槽两人在自己不知道的地方进行了可怕的比试，也不断打断星南继续炫耀培养计划。',
        '琴音随即得意地强调，究竟制作人有多厉害，自己才是最清楚的人。星南因此劝她相信制作人并耐心等待；琴音收起抱怨，明确答应。',
        '星南转而询问琴音如何看待制作人的 N.I.A 安排。制作人的计划被重新确认：让琴音通过 N.I.A 快速成长，把“一等星”收入囊中、打出名声，并赚到下半学期的学费。琴音因这份过于宏大的公开目标而慌张。',
        '星南认真承认琴音是自己心中“一等星”的头号继承候补，拥有出色才能和世界第一的可爱；她愿意为了琴音的成长全力协助，但今年的胜利绝不会让出，今年的初星学园仍要由十王星南背负。',
        '星南质疑制作人的路线：现在的琴音赢不了自己，夏天只靠避开星南、击败其他对手来提高名气并非上策。制作人承认风险，却断言琴音的成长速度足以带来胜算，要让一年级的琴音夺下“一等星”并走向顶尖偶像。',
        '琴音先被吓到，害羞吐槽制作人又因为太喜欢自己而影响判断；星南也因这份豪言受到冲击。琴音随后表明自己已经决定相信制作人。',
        '星南直接逼她把目标说出口：试着战胜十王星南。琴音不是认为自己绝对赢不了，而是在本人面前说这件事太沉重、太难为情。',
        '琴音终于坦白自己是星南从童年电视舞蹈时期起的老粉丝：星南中学时代那些不起眼的工作、高中后的迅速成长、击败强敌登上一等星的全过程，她一直都看在眼里；在星南真正登顶以前，星南就已经是她心中的一等星。',
        '正因为这份长年憧憬，琴音反复承认挑战宣言沉重得令她害怕，却仍正式宣言要击败星南、成为真正的一等星。',
        '星南被琴音的经历、偶像目标与这份沉重感触动，意识到不能把对决拖到自己毕业后的明年；她接受琴音当下的挑战，承诺拿出全部实力，并要求琴音亲手实现制作人的豪言。琴音响亮答应，以两人正式成为竞争对手收尾。'
      ]
    },
    'nia-kotone-round2-audition-eve': {
      episode: 14,
      timing: '第二轮日程第五日结束后、试镜前一天',
      beats: [
        '星南房间里的琴音周边祭坛暴露了她长期追星的秘密。',
        '星南说明极月学园、蓝井抚子和白草四音的强大，以及 QUARTET 将在极月主场举行。',
        '琴音接受去对手主场挑战的任务，决定把极月聚集的粉丝全部争取过来。'
      ]
    },
    'nia-kotone-round2-quartet-opening': {
      episode: 15,
      timing: '第二轮试镜正式开始前',
      beats: [
        '制作人出差归来，琴音先因等待太久而抱怨，随后迅速恢复精神。',
        '制作人建立藤田琴音官方粉丝俱乐部，并用连续准确的夸奖把琴音调整到最佳状态。',
        '琴音宣言要在 QUARTET 抢走极月学园的粉丝，准备迎接正式试镜。'
      ]
    },
    'nia-kotone-round2-quartet-victory': {
      episode: 16,
      timing: '第二轮 QUARTET 试镜成功并完成赛后复盘后',
      beats: [
        '琴音击败极月学园的冠军种子，排名大幅上升并正式成为冠军种子。',
        '她回顾舞台，发现自己最后已经忘记胜负，只想让所有观众开心。',
        '制作人确认这份不执着于胜负、仍能让观众开心的表现正是琴音的新力量。'
      ]
    },
    'nia-kotone-round3-first-business': {
      episode: 17,
      timing: '第三轮第一次营业完成后',
      beats: [
        '星南宣布白草月花参赛，说明月花是参加海外活动的顶尖偶像。',
        '琴音拒绝成为星南的继承人，要求成为星南真正的竞争对手。',
        '琴音宣言要击败月花，证明星南仍有资格继续成为顶尖偶像。'
      ]
    },
    'nia-kotone-round3-finale-eve': {
      episode: 18,
      timing: '第三轮日程完成、FINALE 开始前',
      beats: [
        '琴音反思自己不应只被胜负牵着走，并确认登上舞台是为了让家人和观众都能享受表演。',
        '制作人揭示此前出差是为了找到琴音的父母和弟妹，并把他们安排到 FINALE 最前排。',
        '琴音在惊喜和感动中要求制作人在自己引退前不准谈恋爱，然后准备进入最终舞台。'
      ]
    },
    'nia-kotone-finale-victory': {
      episode: 19,
      timing: 'FINALE 冠军结算及赛后复盘完成后',
      beats: [
        '琴音赢得 N.I.A 冠军并击败顶尖偶像，星南承认她们已经成为彼此真正的对手。',
        '星南决定继续向世界第一挑战，琴音则把下一个目标定为击败星南这颗一等星。'
      ]
    },
    'nia-kotone-finale-epilogue': {
      episode: 20,
      timing: '第 19 话结束后连续播放',
      beats: [
        '琴音得知父亲并非抛弃家庭，而是在从事危险工作赚钱养家。',
        '她决定重新向家人正式介绍制作人，承认制作人已经成为自己人生中不可替代的人。',
        '琴音与制作人总结 N.I.A 培育，并把 H.I.F 和最佳状态的星南作为下一阶段目标。'
      ]
    }
  };
  const detail = episodeMap[eventId] || episodeMap['nia-kotone-fans-5000'];
  const shape = {
    schemaVersion: 1,
    eventId,
    story: '<narration>...</narration><dialogue char="藤田琴音(功能词)">“...”</dialogue>'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_FAN_MILESTONE_EVENT]',
    `生成藤田琴音 N.I.A 篇第 ${detail.episode} 话固定剧情。播放时间：${detail.timing}。`,
    `事件 ID：${eventId}`,
    `当前 N.I.A 粉丝数：${Math.max(0, Math.floor(Number(source.fans ?? runtime.triggeredAtFans) || 0))}`,
    `担当偶像：${text(source.idolName, 80) || '藤田琴音'}`,
    `制作人资料：${JSON.stringify(object(source.producer))}`,
    ...(Array.isArray(detail.continuity) && detail.continuity.length
      ? [`时间轴与舞台校准：\n${detail.continuity.map((item, index) => `${index + 1}. ${item}`).join('\n')}`]
      : []),
    `这是固定剧情的自然改写，必须保留以下剧情锚点：\n${detail.beats.map((beat, index) => `${index + 1}. ${beat}`).join('\n')}`,
    '不得增加好感度、粉丝、属性，不推进日期、时段或行动，不提前开始下一轮或改写已经结算的试镜结果。',
    '藤田琴音的 speaker 使用“藤田琴音(功能词)”；其他角色遵守各自世界书中的立绘情绪标记规则，不在本提示词中另作限制；制作人写“制作人”。',
    'story 只能由连续的 <dialogue char="角色名">台词</dialogue> 与 <narration>旁白</narration> 组成。不得输出选项、Markdown、解释、思考文本、营业结算或数据库操作。',
    '只输出最后一个完整 JSON 标签块：',
    '<NIA_FAN_MILESTONE_EVENT>',
    JSON.stringify(shape),
    '</NIA_FAN_MILESTONE_EVENT>'
  ].join('\n');
}

export function buildNiaFanMilestonePrompt(context = {}, runtime = {}) {
  const source = object(context);
  const eventId = text(source.eventId || runtime.eventId, 160) || 'nia-saki-fans-5000';
  if (source.route?.promptProvider === 'route-anchors' && Array.isArray(source.route?.episodes)) {
    return buildRouteAnchorsEpisodePrompt(source, runtime, eventId);
  }
  if (text(source.idolName, 80) === '藤田琴音' || eventId.startsWith('nia-kotone-')) {
    return buildKotoneEpisodePrompt(source, runtime, eventId);
  }
  if (eventId === 'nia-saki-finale-partner-epilogue') {
    return buildSakiEpisode20Prompt(source, runtime, eventId);
  }
  if (eventId === 'nia-saki-finale-sisters-aftermath') {
    return buildSakiEpisode19Prompt(source, runtime, eventId);
  }
  if (eventId === 'nia-saki-round3-first-business') {
    return buildSakiEpisode17Prompt(source, runtime, eventId);
  }
  if (eventId === 'nia-saki-round3-finale-eve') {
    return buildSakiEpisode18Prompt(source, runtime, eventId);
  }
  if (eventId === 'nia-saki-round2-quartet-victory') {
    return buildSakiEpisode16Prompt(source, runtime, eventId);
  }
  if (eventId === 'nia-saki-round2-quartet-opening') {
    return buildSakiEpisode15Prompt(source, runtime, eventId);
  }
  if (eventId === 'nia-saki-round2-audition-eve') {
    return buildSakiEpisode14Prompt(source, runtime, eventId);
  }
  if (eventId === 'nia-saki-fans-10000') {
    return buildSakiEpisode13Prompt(source, runtime, eventId);
  }
  const shape = {
    schemaVersion: 1,
    eventId,
    story: '<narration>...</narration><dialogue char="花海咲季">“...”</dialogue>'
  };
  return [
    '[HATSU_OUTPUT_MODE:NIA_FAN_MILESTONE_EVENT]',
    '生成花海咲季在 N.I.A 育成期间达到 5000 粉丝后的强制好感剧情。',
    `事件 ID：${eventId}`,
    `当前 N.I.A 粉丝数：${Math.max(0, Math.floor(Number(source.fans ?? runtime.triggeredAtFans) || 0))}`,
    `担当偶像：${text(source.idolName, 80) || '花海咲季'}`,
    `制作人资料：${JSON.stringify(object(source.producer))}`,
    '剧情只承担关系叙事，不增加好感度、粉丝、属性，不推进日期、时段或行动。',
    '必须依次自然完成这些剧情节拍：',
    '1. 咲季看到粉丝和投票稳步增加，因成绩而欢喜若狂并得意忘形。',
    '2. 制作人透露已经录下或拍下她刚才的样子，咲季慌张确认自己有没有说怪话。',
    '3. 玩笑结束后，咲季主动恢复认真，指出当前排名仍不足以松懈。',
    '4. 制作人提出继续偶像活动，让更多观众认识真实的咲季。',
    '5. 花海佑芽带着拉票成果出现，姐妹比较排名后发现并列。',
    '6. 姐妹约定最终在 N.I.A FINALE 正面对决。',
    '7. 制作人提醒咲季不能轻视妹妹以外的偶像；咲季承认并重新确认努力目标。',
    '允许自然改写台词和补充动作，但不得改变人物关系、比赛目标或结论。',
    '场景限于 N.I.A 育成期间的校内或制作人工作区域，不创建新营业、训练或危机。',
    'story 内只能连续使用 <dialogue char="角色名">“台词”</dialogue> 与 <narration>旁白</narration>。',
    '不要输出任何选项、自由输入、Markdown、解释、思考文本或普通剧情外壳。',
    '不得输出或修改 fanGain、affinityGain、好感度、粉丝、属性、排名、时间、营业结算或数据库操作。',
    '只输出最后一个完整 JSON 标签块：',
    '<NIA_FAN_MILESTONE_EVENT>',
    JSON.stringify(shape),
    '</NIA_FAN_MILESTONE_EVENT>'
  ].join('\n');
}

export function parseNiaFanMilestonePayload(source, expected = {}) {
  const candidates = typeof source === 'string'
    ? [source]
    : [source?.rawText, source?.text, source?.renderedText].filter((item) => item != null);
  let parsed = { ok: false, reason: 'missing_fan_milestone' };
  for (const candidate of candidates) {
    parsed = lastValidTaggedJson(candidate, 'NIA_FAN_MILESTONE_EVENT');
    if (parsed.ok) break;
  }
  if (!parsed.ok) return parsed;
  const raw = object(parsed.data);
  const eventId = text(raw.eventId || raw.event_id, 160);
  if (eventId !== text(expected.eventId, 160)) return { ok: false, reason: 'event_id_mismatch' };
  const story = text(raw.story, 12000);
  if (!hasOnlyVnTags(story)) return { ok: false, reason: 'invalid_story' };
  return { ok: true, data: { schemaVersion: 1, eventId, story } };
}

if (typeof globalThis !== 'undefined') {
  globalThis.HatsuNiaFanMilestoneApi = Object.freeze({
    buildNiaFanMilestonePrompt,
    parseNiaFanMilestonePayload
  });
}

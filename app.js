(function () {
  "use strict";

  const STORAGE_KEY = "hatsuProduceLocalState";
  const SAVE_BACKUP_STORAGE_KEY = "hatsuProduceLocalState_backup";
  const UI_VERSION = 4;
  const spChance = 35;
  const lessonEventChance = 45;
  const trainingEventChance = 55;
  const PRIMARY_MODEL_CHANNEL_TIMEOUT_MS = 5 * 60 * 1000;
  const SECONDARY_MODEL_CHANNEL_TIMEOUT_MS = 5 * 60 * 1000;
  const DIRECTOR_MODEL_CHANNEL_TIMEOUT_MS = 210 * 1000;

  const clone = (value) => JSON.parse(JSON.stringify(value));

  const idols = {
    "藤田琴音": {
      tag: "皮卡丘 / 薯鸡",
      bio: "梦想成为「能赚钱的偶像」的贪心的女孩。把偶像视为逆转人生的手段。成绩不好，自我评价也不高，但对自己可爱的外表很有自信。不擅长应对不知为何总对自己有过高评价的学生会长星南。",
      theme: "#FAD356",
      background: "./assets/idols/fujita-kotone.png",
      avatar: "./assets/avatars/fujita-kotone.png",
      core: "现实收益、被选择的不安、夸奖作为燃料、从不能相信自己到相信制作人。",
      styles: {
        lesson: "把课程换算成翻身机会、报酬、曝光和被选择的证明。她嘴上现实，心里怕自己又被证明没用。",
        training: "边吐槽边认真做。失败会先用假怒和可爱玩笑遮住羞耻，随后确认制作人是否还选择她。",
        outing: "外出会先计算时间成本；如果能带来新机会、实用情报或制作人的认真照顾，她会把它接受为值得的投资。",
        companion: "喜欢被夸，但认真夸奖会先怀疑再爆发式开心。她会用玩笑保护自己的脆弱。",
        rest: "休息不是偷懒，而是为了下一次被看见而保存燃料。她会嘴硬地说这是投资。"
      },
      samples: {
        lesson: "琴音把笔记本翻到新的一页，先在重点旁边画了两条线，又小声嘀咕这节课到底能不能变成以后接活动的机会。被点名试唱时，她的声音在高音前晃了一下，笑容立刻缩回去。你指出问题只是紧张时呼吸变浅，她先睁大眼确认你不是安慰，随后脸红着重新站好。“那我可就信了哦。等我唱到大家都来夸我可爱的时候，制作人要第一个鼓掌。”"
      }
    },
    "月村手毬": {
      tag: "杰尼龟 / 搞笑艺人",
      bio: "被称作初中部第一偶像的前精英。表面上是冷静、克己的讽刺家，却也是爱撒娇、懒惰的麻烦制造者，具有两面性的少女。为了能与讨厌的自己决裂，维持对自己的喜爱，以成为顶级偶像为目标。",
      theme: "#4FA0CE",
      background: "./assets/idols/tsukimura-temari.png",
      avatar: "./assets/avatars/tsukimura-temari.png",
      core: "冷淡外壳、脆弱内心、讨厌旧日的自己、需要精确而严格的支持。",
      styles: {
        lesson: "表面冷淡，实际听得很细。课堂内容会被她转化成对自己的苛责。",
        training: "容易过度努力，不喜欢被温柔制止，更能接受精确指导。",
        outing: "外出必须被解释成状态管理或视野拓展，否则她会觉得自己在松懈。",
        companion: "嘴硬、拒绝、命令，内心会担心自己是否惹人生气。",
        rest: "休息对她而言近似失败。需要把休息定义为控制状态的一部分，她才会勉强接受。"
      }
    },
    "花海咲季": {
      tag: "小火龙 / 赛亚人",
      bio: "入学考试中取得第一名的新生。好胜心强、讨厌失败的曾经的运动员。花海咲季自幼聪颖、擅长记忆、可以很好地完成一切事项，被人们认为是神童。与妹妹花海佑芽关系很好，也是在各种各样的运动上一较高下的宿敌。比任何人都要看好佑芽的才能的同时，也对这份才能感到害怕。",
      theme: "#EA4A5B",
      background: "./assets/idols/hanami-saki.png",
      avatar: "./assets/avatars/hanami-saki.png",
      core: "骄傲、好胜、害怕输给重要对手，但会把恐惧转回胜利计划。",
      styles: {
        lesson: "她会把课堂当成赢的工具。被指出弱点会先炸毛，然后要求具体胜利方案。",
        training: "高效率、强自尊，把身体管理也视为胜利条件。",
        outing: "外出也要服务于胜利：观察舞台、研究对手、恢复状态，最后转化成下一次赢的方案。",
        companion: "喜欢被夸，但会装作理所当然。真正准确的夸奖会让她害羞。",
        rest: "休息必须被包装成胜利准备。她会确认这不是退让，而是为了下一次压倒性表现。"
      }
    },
    "花海佑芽": {
      tag: "炽焰咆哮虎 / 赛人娘",
      bio: "候补入学的新生。元气满满、身体能力优越的原运动员。最最最最最喜欢姐姐咲季，从心底尊敬她、将她视为对手以及最大的目标。因为咲季的无私帮助，佑芽的偶像才能才得以绽放。",
      theme: "#ff5f4f",
      background: "./assets/idols/hanami-ume.png",
      avatar: "./assets/avatars/hanami-ume.png",
      core: "直觉型行动力、对姐姐咲季的憧憬与胜负心、压倒性成长欲、把失败立刻转成下一次挑战。",
      aliases: ["花海祐芽"],
      styles: {
        lesson: "把课堂理解成追上姐姐的捷径。她不懂就直问，抓住要点后会立刻想试试看。",
        training: "冲得很快，失败也很快，但不会停下。越接近咲季，她越能感到兴奋和害怕同时存在。",
        outing: "外出也会被她变成发现新目标的冒险。她会拉着制作人到处跑，最后把所见全部转成下一次胜负的燃料。",
        companion: "亲近、直率、热烈。会毫不犹豫地说喜欢、相信和想赢，也会把制作人的话当成前进的信号。",
        rest: "休息对她很难。必须告诉她休息也是为了下一次用压倒性数值挑战姐姐，她才会乖乖停下。"
      }
    },
    "筱泽广": {
      tag: "骷髅兵 / 牢广",
      bio: "带着神秘氛围的天才少女。因为厌倦了又简单又无聊的日子，为了挑战自己不擅长的领域而入学初星学园。会因为“很辛苦的课程”和“做不好的事情”而感受到喜悦的怪人。立志成为偶像的理由是“因为是看起来是最不适合自己的事情”。",
      theme: "#48C6DA",
      background: "./assets/idols/shinosawa-hiro.png",
      avatar: "./assets/avatars/shinosawa-hiro.png",
      core: "理论极强、身体极弱、喜欢为了成功而陷入困难的过程。",
      styles: {
        lesson: "理论秒懂，但会平静指出偶像实践不受大脑完全支配。",
        training: "身体快到极限，语气仍然平静。越做不到，她越觉得有趣。",
        outing: "外出对她也是训练。短距离散步都可能耗尽体力，但她会因为看见新变量而高兴。",
        companion: "直白说开心、喜欢、谢谢。亲近后会请求每天在一起。",
        rest: "休息像一次实验暂停。她会认真记录身体恢复，甚至为自己还能坐起来而感到满足。"
      },
      samples: {
        training: "广站在镜子前，先用三秒理解了动作结构，又用十分钟证明身体完全不听理解指挥。第三次重心偏移时，你扶住她，她平静地说刚才差点结束人生。可她低头看着比刚才多移动的三厘米，眼睛微微亮起来。“呵呵，很有趣。因为完全做不到，所以前进一点点也很开心。制作人，请夸我。”"
      }
    },
    "十王星南": {
      tag: "火箭队 / 金色毛球",
      bio: "初星学园的学生会长。被称为“学园第一的偶像”，受到很多学生的仰慕。是学园长的孙女，从小接受偶像的精英教育长大。有“看出偶像才能”的特长，一眼就对琴音有了兴趣，但不知为什么却被拉开了距离。",
      theme: "#F9C584",
      background: "./assets/idols/juo-sena.png",
      avatar: "./assets/avatars/juo-sena.png",
      core: "学园顶点、被完美形象困住、重新学习数值以外的偶像魅力。",
      styles: {
        lesson: "像审视课程的顶点偶像。真正有效的是让她接触不擅长和笨拙。",
        training: "基本能力很高，重点不是数值提升，而是能否打破完美外壳。",
        outing: "外出适合让她接触普通学生、粉丝和不擅长的日常领域，学习数值之外的偶像魅力。",
        companion: "优雅从容，但被看穿、被夸可爱或暴露新手一面会动摇。",
        rest: "她会把休息安排得完美，真正的难点是允许自己不完美地放松。"
      }
    },
    "秦谷美铃": {
      tag: "摸鱼小秦 / 手毬妈",
      bio: "初中部第一偶像团体「SyngUp！」的前成员。隐藏在月村手毬的阴影下，得到的评价相对普通，但实力却是实打实的。给一人种缺点很少的完美偶像的印象。也会有进一步的成长吧。",
      theme: "#A0B6DC",
      background: "./assets/idols/hataya-misuzu.png",
      avatar: "./assets/avatars/hataya-misuzu.png",
      core: "慵懒、照顾欲、温柔独占欲、安静自负、按自己的步调走向顶点。",
      styles: {
        lesson: "看似偷懒、迟到或走神，却抓住课程本质。她用自己的步调学习。",
        training: "不是热血冲刺，而是关键时刻稍微加快脚步。",
        outing: "外出是她把制作人卷入自己步调的机会：茶、散步、照顾、共犯关系和柔软独占欲。",
        companion: "温柔照顾对方，也希望对方允许自己照顾。亲密会带出只属于我的制作人。",
        rest: "休息是她最自然的主场。她会把恢复体力变成一种温柔但不容拒绝的照顾。"
      },
      samples: {
        lesson: "美铃比上课铃晚了十分钟推门进来，手里还捧着一杯茶。她说路上的阳光太舒服，所以稍微绕了远路。你以为她没听，她却托着脸轻声说出老师刚讲的核心：不是追着观众的视线跑，而是让他们觉得看着自己很安心。练习结束后，她笑着说只是稍微加快了一下脚步。",
        outing: "美铃用天气很好这个理由把你带出了训练楼。茶水、点心和最适合晒太阳的长椅都像早就被她安排好，话题不知何时从散步变成了你也该休息。她闭着眼说，能理解她步调的制作人很珍贵，所以她也想照顾你。"
      }
    },
    "仓本千奈": {
      tag: "China / <s>人类帝皇</s>",
      bio: "娇生惯养的、土生土长的大小姐。天真烂漫的女孩子。梦想成为「优秀的偶像」而进入初星学园。据本人所说，其实力「在全校学生中是最后一名哇！」。",
      theme: "#F8AC5E",
      background: "./assets/idols/kuramoto-china.png",
      avatar: "./assets/avatars/kuramoto-china.png",
      core: "能力不足与优渥出身带来的羞耻、总想放弃却会回来完成下一步、把他人的支持变成真心回礼。",
      styles: {
        lesson: "常常听懂得慢、做得更慢，沮丧和惊喜都写在脸上。哪怕喊着做不到，她仍会把老师要求的最后一步认真完成。",
        training: "基础能力不足会让训练显得格外艰难。重点不是突然变强，而是她在抱怨、落泪后仍选择再试一次。",
        outing: "她会自然想到昂贵而周到的安排，却会在意这是否只是依靠家境；真正令她开心的是普通、亲手参与且能留下共同回忆的体验。",
        companion: "礼貌天真、情绪外露，但并不迟钝。她能敏锐察觉善意，也会认真追问别人是否只是顾虑她的身份。",
        rest: "她会把酸痛夸张地说成世界末日，却又因这是努力留下的证据而暗自自豪，恢复后还会主动确认下一次训练。"
      }
    },
    "葛城莉莉娅": {
      tag: "白色大福 / <s>银梦厨</s>",
      bio: "来自海外的新生。没有唱歌跳舞的经验，总是没什么自信，一直畏畏缩缩的。似乎没有什么才能，但对偶像的向往之心是认真的，是个相当努力的人。她和她最好的朋友清夏已经许下约定，要一起登上舞台演出。",
      theme: "#EFFDFF",
      background: "./assets/idols/katsuragi-lilja.png",
      avatar: "./assets/avatars/katsuragi-lilja.png",
      core: "从零开始的异国少女、自我否定与害羞、即使害怕也会行动的坚韧、把得到的支持认真还给观众。",
      styles: {
        lesson: "她会把每条指导记得很细，却因为看不见自己的进步而不安。具体的前后对比比空泛鼓励更能让她建立信心。",
        training: "零基础让每一步都显得笨拙，但她几乎不会主动停下。需要防止她把拼命练习当成唯一能证明诚意的方式。",
        outing: "陌生环境会让她拘谨，熟悉的动画、游戏、甜点或清夏的话题则会打开话匣子，露出安静外表下强烈的热爱。",
        companion: "礼貌、害羞，习惯先贬低自己。被明确需要时会鼓起勇气回应，也会把很小的支持牢牢记住。",
        rest: "她会因为休息而产生落后感，必须让她理解接受照顾也是共同计划的一部分，而不是辜负期待。"
      }
    },
    "紫云清夏": {
      tag: "辣妹 / <s>喜多川海梦</s>",
      bio: "会翘掉课和练习的不认真的辣妹。虽然很爱胡闹、但是充满活力又开朗、无论和谁都能搞好关系就是她的魅力。入学前也有跳芭蕾舞冲向世界舞台的成绩、虽然备受期待、但是本人却没有干劲。声援着拼命努力向着偶像为目标的好友莉莉娅。",
      theme: "#A2FD47",
      background: "./assets/idols/shiun-sumika.png",
      avatar: "./assets/avatars/shiun-sumika.png",
      core: "开朗轻佻的保护色、芭蕾伤痛留下的恐惧、害怕认真后再次失去、以渐进训练重新选择舞台。",
      styles: {
        lesson: "她擅长用玩笑和社交技巧把课题轻轻带过。真正认真时理解很快，却会在被准确夸奖后慌忙恢复随便的语气。",
        training: "舞蹈能力与身体记忆仍在，但奔跑、跳跃和高强度动作可能唤起恐惧。训练应强调渐进、停止线和她主动选择继续。",
        outing: "她熟悉时尚、流行和好玩的去处，会主动带节奏。轻松闲逛中偶尔露出的沉默，比直接逼问更接近她藏起来的真心。",
        companion: "会用昵称、玩笑和亲近动作拉近距离，也会把严肃话题化开。真正信任后，她才允许制作人看见害怕与不甘。",
        rest: "休息不能被写成懒散惩罚，而是她重新学习听从身体的过程。能在想逞强时停下，本身就是一次进步。"
      }
    },
    "有村麻央": {
      tag: "MAO / <s>円香</s>",
      bio: "目标是成为帅气的偶像的三年级女孩，同时也是初星学园偶像科宿舍的宿舍长，很会照顾人。被后辈们视为小王子（Little Prince）的存在，深受尊敬。从小就憧憬歌剧明星，过去曾以童星的身份活跃。",
      theme: "#A453A6",
      background: "./assets/idols/arimura-mao.png",
      avatar: "./assets/avatars/arimura-mao.png",
      core: "永远屈居星南之下的No.2执念——既渴望超越又藏着惜与依赖；把'怕再输'的自我设限伪装成好强与嘴硬的铠甲；完美副会长外壳与私藏的动画宅柔软内里相互拉扯；终极成长是从'为追上星南而活'走向'为自己而赢'。",
      styles: {
        lesson: "经验丰富、理解迅速，常会自然照顾周围学生。真正的课题是停止用完美王子形象遮住不安和不擅长。",
        training: "武术、体能和舞台基础让动作可靠利落。面对需要柔软或可爱表达的训练，她会先僵硬，再寻找不背叛王子理想的方式。",
        outing: "她习惯替制作人开门、提东西和规划路线。试衣、发型或普通约会感会让她在帅气从容与明显害羞之间摇摆。",
        companion: "待人温柔可靠，喜欢保护后辈。被反过来照顾或被称赞可爱时会失去余裕，却也逐渐学会接受。",
        rest: "她会把疲惫藏在照顾别人之后。休息剧情应让她卸下宿舍长和王子的责任，允许自己成为被关心的一方。"
      }
    },
    "姬崎莉波": {
      tag: "<s>退堂鼓</s>（A上去了） / 故障姬崎人",
      bio: "有着成熟大人气质的三年级学生。坚定而温柔，在宿舍中好好照顾大家的大姐姐。在过去有过参加的组合的经历，但结果并不理想。是学生会的成员，担任书记。",
      theme: "#F9C4D6",
      background: "./assets/idols/himesaki-rinami.png",
      avatar: "./assets/avatars/himesaki-rinami.png",
      core: "温柔成熟的姐姐气质、过去扮演妹妹偶像的失败、从刻意营销到自然照顾、也承认自己想被保护与喜欢竞争。",
      styles: {
        lesson: "她会先照顾同学与课堂气氛，反而在刻意展示姐姐魅力时变得僵硬。自然反应比设计好的营业更有吸引力。",
        training: "动作稳妥、善于配合别人，但容易把自己的需求放到最后。训练重点是让温柔、少女心和竞争欲同时出现在舞台上。",
        outing: "她会提前准备饮料、路线和应急用品，像照顾年幼伙伴一样周到；甜食、祭典和被制作人反过来照顾会显出真实少女感。",
        companion: "自然亲切、擅长安抚别人，却会因关系不再只是姐姐与弟弟而害羞。她也期待被理解、被依靠和被保护。",
        rest: "她习惯确认所有人都没问题后才休息。制作人若认真接过照顾者的位置，她会从不习惯逐渐变得安心。"
      }
    },
    "雨夜燕": {
      tag: "雨姐 / 黑色毛球",
      bio: "初星学园的学生会副会长，学园第二名的偶像，拥有与实力相应的自豪感并且态度傲慢。虽然对自己和别人都很严格，但是很会照顾人。视青梅竹马的星南为竞争对手，并且公开宣称总有一天要超过星南成为“一番星”。",
      theme: "#a396f3",
      background: "./assets/idols/amaya-tsubame.png",
      avatar: "./assets/avatars/amaya-tsubame.png",
      core: "雨夜燕的正式人物定位待补充；当前占位为沉静、敏锐、带有雨夜意象的偶像候补。",
      styles: {
        lesson: "一丝不苟、提前做足功课，绝不容许自己在课堂上出错——上课也是不能输给星南的战场。偶尔因熬夜补番硬撑着，但死不承认。",
        training: "给自己加码、练到超出要求的量，死撑也不喊停。把每次训练都当成追赶星南的筹码，却要面子，不肯让人看出自己已经到极限。",
        outing: "嘴上把外出说成'考察''顺路'，绝不承认是想一起玩；实则会借机绕去动漫店或周边店，被撞见就慌乱否认。外出是她难得卸下No.2外壳、露出宅趣味的场合。",
        companion: "她的陪伴是别扭、训斥式的——用毒舌包装关心（'这点小事都不会，真拿你没办法'）。亲近后会暴露想被陪、怕一个人的一面却绝不直说；独占欲化作'你是我的制作人，别老往别人那边跑'。",
        rest: "最不擅长休息——闲不下来就找事做、复盘，或偷偷补番。真正放松只在确信没人看的时候；在制作人面前从硬撑'我不累'到肯卸力，是她交付信任的标志。"
      }
    }
  };

  const idolPresets = {
    "藤田琴音": [90, 90, 120, 8, 29.5, 25.5, 1030, 1510, 1580, 1730, 2210, 2280],
    "月村手毬": [120, 100, 80, 27, 22.5, 11.5, 1580, 1370, 970, 2280, 2080, 1580],
    "花海咲季": [100, 100, 105, 16.5, 16.5, 20.5, 1280, 1280, 1360, 1930, 1930, 2030],
    "秦谷美铃": [95, 125, 140, 27, 13, 20, 1480, 1080, 1390, 2180, 1680, 2050],
    "筱泽广": [70, 55, 120, 22, 8, 26, 1180, 820, 1450, 1880, 1420, 2150],
    "十王星南": [175, 125, 140, 15, 8, 20.5, 1280, 1050, 1500, 1930, 1650, 2200],
    "花海佑芽": [120, 115, 110, 24, 24, 20, 1500, 1480, 1380, 2200, 2180, 2080],
    "仓本千奈": [75, 115, 125, 10, 24, 20.5, 1050, 1520, 1450, 1650, 2220, 2150],
    "葛城莉莉娅": [80, 100, 115, 18, 20, 18, 1300, 1380, 1450, 2000, 2080, 2150],
    "紫云清夏": [100, 115, 90, 9, 23, 23, 1050, 1500, 1450, 1650, 2200, 2150],
    "有村麻央": [125, 90, 100, 22, 8, 23, 1480, 950, 1500, 2180, 1550, 2200],
    "姬崎莉波": [85, 120, 125, 13, 21.5, 25.5, 1100, 1430, 1580, 1800, 2130, 2280],
    "雨夜燕": [115, 125, 100, 20, 23, 17, 1300, 1350, 1150, 2100, 2250, 1800]
  };

  const exactPresetIdols = new Set(["藤田琴音", "月村手毬", "花海咲季", "秦谷美铃"]);
  const idolAliases = {
    "花海祐芽": "花海佑芽",
    "佑芽": "花海佑芽",
    "祐芽": "花海佑芽",
    "藤田 琴音": "藤田琴音",
    "琴音": "藤田琴音",
    "月村 手毬": "月村手毬",
    "手毬": "月村手毬",
    "花海 咲季": "花海咲季",
    "咲季": "花海咲季",
    "筱泽 广": "筱泽广",
    "筱泽广": "筱泽广",
    "篠泽 广": "筱泽广",
    "篠泽广": "筱泽广",
    "篠澤廣": "筱泽广",
    "筱澤廣": "筱泽广",
    "广": "筱泽广",
    "篠澤 廣": "筱泽广",
    "十王 星南": "十王星南",
    "星南": "十王星南",
    "秦谷 美铃": "秦谷美铃",
    "秦谷美铃": "秦谷美铃",
    "秦谷美鈴": "秦谷美铃",
    "美铃": "秦谷美铃",
    "美鈴": "秦谷美铃",
    "仓本 千奈": "仓本千奈",
    "千奈": "仓本千奈",
    "葛城 莉莉娅": "葛城莉莉娅",
    "葛城莉莉雅": "葛城莉莉娅",
    "莉莉娅": "葛城莉莉娅",
    "莉莉雅": "葛城莉莉娅",
    "紫云 清夏": "紫云清夏",
    "清夏": "紫云清夏",
    "有村 麻央": "有村麻央",
    "麻央": "有村麻央",
    "姬崎 莉波": "姬崎莉波",
    "莉波": "姬崎莉波",
    "雨夜 燕": "雨夜燕",
    "燕": "雨夜燕"
  };
  const vnStandees = {
    "亚纱里老师": "./assets/novel-standees/asari-sensei.png"
  };
  const residentNpcProfiles = {
    "亚纱里老师": {
      locationId: "producer_classroom",
      publicLabel: "制作人科指导教师",
      statusLabel: "常驻",
      promptLine: "制作人科指导教师，常驻制作人科教室；可就调查、观察与担当偶像的选择给出建议。",
      avatar: "./assets/avatars/neo-asari.png",
      theme: "#6f9cff"
    }
  };
  const selectBackgroundCodes = {
    "雨夜燕": "amaya"
  };
  const affinityIdolCodes = {
    "藤田琴音": "KOTONE",
    "月村手毬": "TEMARI",
    "花海咲季": "SAKI",
    "花海佑芽": "UME",
    "筱泽广": "HIRO",
    "十王星南": "SENA",
    "秦谷美铃": "MISUZU",
    "仓本千奈": "CHINA",
    "葛城莉莉娅": "LILJA",
    "紫云清夏": "SUMIKA",
    "有村麻央": "MAO",
    "姬崎莉波": "RINAMI",
    "雨夜燕": "TSUBAME"
  };
  const idolRomajiNames = {
    "藤田琴音": "Kotone Fujita",
    "月村手毬": "Temari Tsukimura",
    "花海咲季": "Saki Hanami",
    "花海佑芽": "Ume Hanami",
    "筱泽广": "Hiro Shinosawa",
    "十王星南": "Sena Juo",
    "秦谷美铃": "Misuzu Hataya",
    "仓本千奈": "China Kuramoto",
    "葛城莉莉娅": "Lilja Katsuragi",
    "紫云清夏": "Sumika Shiun",
    "有村麻央": "Mao Arimura",
    "姬崎莉波": "Rinami Himesaki",
    "雨夜燕": "Tsubame Amaya"
  };
  const idolSchoolClasses = {
    "紫云清夏": "1年1班",
    "葛城莉莉娅": "1年1班",
    "藤田琴音": "1年1班",
    "月村手毬": "1年1班",
    "花海咲季": "1年1班",
    "筱泽广": "1年2班",
    "花海佑芽": "1年2班",
    "秦谷美铃": "1年2班",
    "仓本千奈": "1年2班",
    "十王星南": "3年1班",
    "雨夜燕": "3年1班",
    "有村麻央": "3年1班",
    "姬崎莉波": "3年1班"
  };
  const interactionCharacters = ["藤田琴音", "月村手毬", "花海咲季", "秦谷美铃", "筱泽广", "十王星南", "花海佑芽", "仓本千奈", "紫云清夏", "葛城莉莉娅", "有村麻央", "姬崎莉波", "雨夜燕"];
  const actionEventPools = {
    lesson: {
      Vo: ["课堂临时试唱", "分组和声练习", "训练员点名示范", "课后换气复盘", "同桌交换声乐笔记"],
      Da: ["课堂动作示范", "分组节奏练习", "训练员纠正重心", "课后舞步复盘", "同桌互相检查动作"],
      Vi: ["课堂镜头测试", "分组表情练习", "训练员临时拍摄", "课后姿态复盘", "同桌交换表现建议"]
    },
    training: {
      Vo: ["录音室回放检查", "耐力演唱合练", "发声训练临时搭档", "休息间隙讨论音准", "器材室寻找录音设备"],
      Da: ["训练室临时合练", "镜前动作纠正", "操场耐力训练", "休息间隙讨论节奏", "器材室整理训练道具"],
      Vi: ["镜前表情训练", "舞台走位测试", "临时摄影练习", "休息间隙讨论镜头感", "器材室挑选拍摄道具"]
    },
    rest: {
      any: ["休息室一起喝茶", "天台午睡时被发现", "保健室偶遇", "树荫下分享点心", "对方临时来请教问题", "顺手照顾疲惫的同伴"]
    }
  };
  const eventMoods = ["对方主动指出了一个意外盲点", "对方注意到了担当此刻的表现", "双方因为节奏不合产生轻微摩擦", "对方的一句话让当前课题突然清晰", "一次小失误变成了临时合作", "对方用完全不同的方式理解了这次练习"];
  const outingDestinations = [
    { name: "商店街", description: "小吃、饮料和便宜日用品，适合放学后闲逛与偶遇。" },
    { name: "购物中心", description: "买衣服、逛店，寻找舞台服装或私服灵感。" },
    { name: "地方电台", description: "小型访谈、短口播与清唱宣传常在这里录制。" },
    { name: "电视台", description: "综艺、音乐节目和正式媒体通告的录制地点。" },
    { name: "活动会场", description: "品牌发布会、文化节与区域商演的临时会场。" },
    { name: "音乐节会场", description: "高知名度后才会接到的大型户外舞台档期。" },
    { name: "摄影棚", description: "杂志、品牌视觉和宣传照拍摄的专业空间。" },
    { name: "品牌旗舰店", description: "直播站台、代言日与连锁品牌宣传活动的现场。" },
    { name: "游乐园", description: "约会感、胆量与体力对比，适合关系推进。" },
    { name: "水族馆", description: "安静的展厅、蓝色水光和慢节奏对话，适合情绪沉淀。" },
    { name: "体育中心", description: "校外综合运动设施，适合体能管理、康复与外包训练。" }
  ];
  const FREE_MODE_OUTING_DESTINATIONS = [
    ...outingDestinations
  ];
  const OFF_CAMPUS_TRANSIT_STATIONS = [
    {
      id: "hatsuboshi_gate",
      name: "初星学园前",
      shortLabel: "初星",
      line: "main",
      status: "hub",
      x: 12,
      y: 66,
      description: "校外线路的起点。穿过正门后，制作人和担当从这里搭乘初星电铁。",
      pois: ["校门前站牌", "便利购票口", "返校通道"]
    },
    {
      id: "shopping_street",
      name: "商店街",
      shortLabel: "街",
      line: "main",
      status: "open",
      x: 32,
      y: 66,
      description: "放学后人流最多的拱廊街，适合采购、打工、街头宣传和偶遇。",
      pois: ["拉面店", "琴音打工的快餐店", "杂货店", "甜品店"]
    },
    {
      id: "shopping_mall",
      name: "购物中心",
      shortLabel: "Mall",
      line: "main",
      status: "open",
      x: 52,
      y: 66,
      description: "大型商业设施，甜品、游戏、服装和活动中庭聚在一起。",
      pois: ["甜品店", "游戏厅", "服装区", "活动中庭"]
    },
    {
      id: "amusement_park",
      name: "游乐园",
      shortLabel: "乐园",
      line: "main",
      status: "open",
      x: 72,
      y: 66,
      description: "约会感、胆量项目和体力对比明显的校外娱乐区。",
      pois: ["旋转木马", "鬼屋", "纪念品店", "夜间灯饰"]
    },
    {
      id: "aquarium",
      name: "水族馆",
      shortLabel: "水族",
      line: "main",
      status: "open",
      x: 92,
      y: 66,
      description: "安静的蓝色展厅，适合外景、沉默对话和关系回温。",
      pois: ["大水槽", "水母展厅", "纪念商店", "海景走廊"]
    },
    {
      id: "sports_center",
      name: "体育中心",
      shortLabel: "运动",
      line: "sports",
      status: "open",
      x: 12,
      y: 24,
      description: "校外综合运动设施，适合体能、康复、数据测试与短期集训。",
      pois: ["训练馆", "康复室", "体测区", "营养补给吧"]
    },
    {
      id: "local_radio",
      name: "地方电台",
      shortLabel: "电台",
      line: "media",
      status: "open",
      x: 26,
      y: 50,
      description: "社区电台与小演播室，委托系统常见的小型访谈与口播录制点。",
      pois: ["直播间", "导播台", "等候沙发"]
    },
    {
      id: "tv_station",
      name: "电视台",
      shortLabel: "电视",
      line: "media",
      status: "open",
      x: 38,
      y: 32,
      description: "综艺与音乐节目的正式录制设施，知名度较高后才会接到档期。",
      pois: ["演播厅", "候场通道", "化妆间"]
    },
    {
      id: "event_hall",
      name: "活动会场",
      shortLabel: "会场",
      line: "media",
      status: "open",
      x: 48,
      y: 50,
      description: "品牌发布会、文化节与区域商演常用的临时舞台会场。",
      pois: ["主舞台", "签售区", "后台通道"]
    },
    {
      id: "photo_studio",
      name: "摄影棚",
      shortLabel: "摄影",
      line: "media",
      status: "open",
      x: 58,
      y: 32,
      description: "杂志拍摄与品牌视觉宣传的专业摄影空间。",
      pois: ["无缝背景墙", "灯光架", "换装区"]
    },
    {
      id: "brand_store",
      name: "品牌旗舰店",
      shortLabel: "品牌",
      line: "media",
      status: "open",
      x: 68,
      y: 50,
      description: "连锁品牌旗舰门店，适合站台、直播带货与代言日活动。",
      pois: ["中庭展台", "橱窗", "活动区"]
    },
    {
      id: "music_festival",
      name: "音乐节会场",
      shortLabel: "音乐节",
      line: "media",
      status: "open",
      x: 82,
      y: 32,
      description: "大型户外音乐节与商演场地，高知名度偶像才会受邀。",
      pois: ["主舞台", "副舞台", "艺人休息室"]
    },
    {
      id: "saki_home",
      name: "咲季家",
      shortLabel: "咲季",
      line: "home",
      status: "locked",
      x: 52,
      y: 82,
      description: "花海家的生活区域。建议作为咲季相关事件或信赖阶段地点开放。",
      pois: ["玄关", "客厅", "家庭餐桌"]
    },
    {
      id: "china_home",
      name: "千奈家",
      shortLabel: "千奈",
      line: "home",
      status: "locked",
      x: 66,
      y: 82,
      description: "千奈相关的私宅地点。建议作为角色事件或特定任务解锁。",
      pois: ["宅邸门前", "会客室", "庭院"]
    }
  ];
  const FREE_MODE_OUTING_LOCATION_ID = "free_outing";
  const DEFAULT_OUTING_SCENE = "./assets/scenes/campus.png";
  const WORLD_MAP_LOCATION_SCENES = {
    school_entrance: "./assets/scenes/School_Entrance.png",
    club_room: "./assets/scenes/Student_Council.png",
    auditorium: "./assets/scenes/Auditorium.png",
    outstage: "./assets/scenes/OutStage.png",
    playground: "./assets/scenes/Playground.png",
    swimming_pool: "./assets/scenes/Swimming_Pool.png",
    gymnasium: "./assets/scenes/Gymnasium.png",
    idol_classroom: "./assets/scenes/IDOL_Class.png",
    special_education: "./assets/scenes/SpecialEducation_Detailed.png",
    producer_classroom: "./assets/scenes/Producer_Class.png",
    courtyard: "./assets/scenes/courtyard.png",
    dining_hall: "./assets/scenes/Dining.png",
    student_store: "./assets/scenes/Student Store.png",
    [FREE_MODE_OUTING_LOCATION_ID]: "./assets/scenes/campus.png"
  };
  // 校外外出地点（按目的地名称）对应的场景图。未单独配图的使用 DEFAULT_OUTING_SCENE。
  const OUTING_DESTINATION_SCENES = {
    "商店街": "./assets/scenes/Shopping_Street.png",
    "购物中心": "./assets/scenes/Shopping_Mall.png",
    "游乐园": "./assets/scenes/MerryGoRound.png",
    "体育中心": "./assets/scenes/Sport Studio.png",
    "地方电台": DEFAULT_OUTING_SCENE,
    "电视台": DEFAULT_OUTING_SCENE,
    "活动会场": DEFAULT_OUTING_SCENE,
    "音乐节会场": DEFAULT_OUTING_SCENE,
    "摄影棚": DEFAULT_OUTING_SCENE,
    "品牌旗舰店": DEFAULT_OUTING_SCENE
  };
  const FREE_MODE_OUTING_VENUES = {
    shopping_street: {
      id: "shopping_street",
      stationId: "shopping_street",
      name: "商店街",
      entranceFacilityId: "entrance",
      facilities: [
        {
          id: "entrance",
          floor: "入口",
          name: "街头路口 / 商店街入口",
          shortName: "街头路口",
          sceneName: "商店街入口",
          image: "./assets/scenes/Shopping_Street.png",
          description: "放学后人流渐渐聚起来的商店街入口。招牌、店铺灯光和街边人声让这里适合确认同行偶像和下一步去处。"
        },
        {
          id: "ramen_shop",
          floor: "一番街",
          name: "拉面店",
          shortName: "拉面店",
          sceneName: "商店街拉面店",
          image: "./assets/scenes/Ramen.png",
          description: "热气和汤香挤满狭窄店面的拉面店。适合放学后吃饭、补充体力，也容易聊到训练后的疲惫和满足。"
        },
        {
          id: "burger_shop",
          floor: "二番街",
          name: "琴音打工的快餐店",
          shortName: "快餐店",
          sceneName: "商店街快餐店",
          image: "./assets/scenes/Burger_Shop.png",
          description: "琴音打工的快餐店。点餐声、炸物香气和忙碌柜台适合触发打工、金钱感和偶像日常的对话。"
        },
        {
          id: "grocery",
          floor: "二番街",
          name: "杂货店",
          shortName: "杂货店",
          sceneName: "商店街杂货店",
          image: "./assets/scenes/grocery.png",
          description: "摆着日用品、零食和便宜小物的杂货店。适合挑选实用物品、小礼物，或者观察偶像对日常用品的偏好。"
        },
        {
          id: "cake_shop",
          floor: "三番街",
          name: "甜品店",
          shortName: "甜品店",
          sceneName: "商店街甜品店",
          image: "./assets/scenes/Cake_Shop.png",
          description: "橱窗里摆着蛋糕和饮品的甜品店。节奏比街上更慢，适合休息、闲聊和稍微带一点约会感的互动。"
        }
      ]
    },
    shopping_mall: {
      id: "shopping_mall",
      stationId: "shopping_mall",
      name: "购物中心",
      entranceFacilityId: "entrance",
      facilities: [
        {
          id: "entrance",
          floor: "1F",
          name: "入口大厅 / 商场内",
          shortName: "入口大厅",
          sceneName: "购物中心入口",
          image: "./assets/scenes/Shopping_Mall_Entrance.png",
          description: "购物中心入口大厅。右侧有设施导览牌，适合确认同行偶像和下一步去处。"
        },
        {
          id: "game_center",
          floor: "2F",
          name: "游戏厅",
          shortName: "游戏厅",
          sceneName: "购物中心游戏厅",
          image: "./assets/scenes/Game_Center.png",
          description: "灯光、音效和抓娃娃机聚在一起的游戏厅，适合轻松胜负和热闹互动。"
        },
        {
          id: "karaoke",
          floor: "3F",
          name: "卡拉OK",
          shortName: "卡拉OK",
          sceneName: "购物中心卡拉OK",
          image: "./assets/scenes/Karaoke.png",
          description: "封闭的小包厢和点歌屏，适合唱歌、练声和更私密的对话。"
        },
        {
          id: "cinema",
          floor: "4F",
          name: "电影院",
          shortName: "电影院",
          sceneName: "购物中心电影院",
          image: "./assets/scenes/Cinema.png",
          description: "商场高层的电影院区域。海报墙、等候区和影厅灯光让约会与闲聊都更有氛围。"
        },
        {
          id: "anime_shop",
          floor: "2F",
          name: "动漫店",
          shortName: "动漫店",
          sceneName: "购物中心动漫店",
          image: "./assets/scenes/AnimeShop.png",
          description: "摆满周边、杂志和角色商品的店铺，适合发现私下兴趣。"
        },
        {
          id: "fashion_store",
          floor: "2F",
          name: "服装店",
          shortName: "服装店",
          sceneName: "购物中心服装店",
          image: "./assets/scenes/Shopping_Mall.png",
          description: "商场里的服装店。成排衣架、试衣镜和当季陈列适合挑选私服、搭配舞台外形象，也容易聊到偶像对风格的偏好。"
        }
      ]
    }
  };
  const FINAL_LIVE_DAY = 22;
  const BOND_80_DAY = FINAL_LIVE_DAY - 1;
  const SUMMARY_ROUND = 5;
  const INTIMACY_UNLOCK_TRUST = 60;
  const INTIMACY_NSFW_UNLOCK_TRUST = 100;
  const INTIMACY_NORMAL_TRUST_GAIN = 20;
  const WORLD_MAP_IMAGE_DAY = "./assets/MAP/Gakuen.png";
  const WORLD_MAP_IMAGE_DUSK = "./assets/MAP/Gakuen_Dawn.png";
  const WORLD_MAP_IMAGE_NIGHT = "./assets/MAP/Gakuen_Night.png";
  const FREE_MODE_MAP_DUSK_START_MINUTES = 17 * 60;
  const FREE_MODE_MAP_NIGHT_START_MINUTES = 20 * 60;
  const WORLD_MAP_LOCATIONS = [
    { id: "school_entrance", name: "学园正门", shortLabel: "正门", description: "初星学园的入口。新生、访客与偶像们每天经过这里。", x: 52.8, y: 96.8, image: "./assets/MAP/School_Entrance.png" },
    { id: "club_room", name: "部室栋", shortLabel: "部室", description: "各社团与活动部室所在的楼栋；学生会办公室也在这里，公务与会议常在此进行。", x: 17.8, y: 39.6, image: "" },
    { id: "campus_stage", name: "校内舞台", shortLabel: "舞台", description: "位于讲堂上方的校内演出场地，可在晚间举办 First Live。", x: 50.8, y: 22, image: "./assets/MAP/OutStage.png" },
    { id: "auditorium", name: "讲堂", shortLabel: "讲堂", description: "拥有圆顶的大型讲堂，学园重要集会与发表会在此举行。", x: 50.8, y: 33, image: "./assets/MAP/MeetingRoom.png" },
    { id: "outstage", name: "野外舞台", shortLabel: "野外", description: "学园右上角的公开舞台，适合排练、试演与小型演出。", x: 80.3, y: 13.7, image: "./assets/MAP/OutStage.png" },
    { id: "playground", name: "运动场", shortLabel: "操场", description: "带跑道与足球场的运动区，体能训练与户外练习的主要场地。", x: 26.3, y: 52.3, image: "./assets/MAP/PlayGround.png" },
    { id: "swimming_pool", name: "泳池", shortLabel: "泳池", description: "室内游泳设施，体能与恢复训练时会来到这里。", x: 37.5, y: 84.9, image: "./assets/MAP/SwimmingPool.png" },
    { id: "gymnasium", name: "体育馆", shortLabel: "体育馆", description: "学园中央的室内体育馆，各类体能与舞台基础训练在此进行。", x: 52.2, y: 63.7, image: "./assets/MAP/Gymnasium.png" },
    { id: "idol_classroom", name: "偶像科教室", shortLabel: "偶像", description: "偶像们上课、讨论与彼此较量的教室区域。", x: 82.3, y: 61.2, image: "./assets/MAP/Idol_Classroom_Detailed.png" },
    { id: "special_education", name: "特别教育栋", shortLabel: "特教", description: "集各种教育资源于一体，支撑学生从日常训练走向舞台表现的专业教学空间。", x: 90, y: 55, image: "./assets/MAP/SpecialEducation_Detailed.png" },
    { id: "producer_classroom", name: "制作人科教室", shortLabel: "P科", description: "培育担当偶像的专属教室，也是日常育成的主舞台。", x: 84.5, y: 93.9, image: "./assets/MAP/Producer_Classroom_Detailed.png" },
    { id: "courtyard", name: "中庭", shortLabel: "中庭", description: "氛围宁静祥和，是放松身心的好地方。", x: 81.8, y: 86.6, image: "./assets/scenes/courtyard.png" },
    { id: "student_dormitory", name: "学生宿舍", shortLabel: "宿舍", description: "偶像科学生居住的宿舍，可在这里休息两小时恢复体力。", x: 87.2, y: 76, image: "" },
    { id: "dining_hall", name: "食堂", shortLabel: "食堂", description: "学园内的用餐区，午餐、点心与偶像们的日常闲聊常在这里发生。", x: 87.2, y: 86.4, image: "./assets/MAP/Dining.png" },
    { id: "student_store", name: "小卖部", shortLabel: "小卖", description: "贩卖零食、文具与小物件的校内商店，适合短暂停留与偶遇。", x: 92.8, y: 85.6, image: "./assets/MAP/Student Store.png" }
  ];
  const WORLD_MAP_LAYOUT_VERSION = 1;
  const WORLD_MAP_LAYOUT_STORAGE_KEY = "hatsuProduceWorldMapLayout";
  const SECONDARY_API_KEY_STORAGE_KEY = "hatsuProduceSecondaryApiKeyV1";
  const WORLD_MAP_LAYOUT_FILE = "./assets/MAP/world-map-layout.json";
  const FREE_MODE_DAY_START_MINUTES = 8 * 60;
  const FREE_MODE_DAY_END_MINUTES = 22 * 60;
  const FREE_MODE_LATE_END_MINUTES = 23 * 60;
  const PRODUCER_APARTMENT_SCENE = "./assets/scenes/Producer_Apartment.png";
  const PRODUCER_APARTMENT_DAY_SCENE = "./assets/scenes/Producer_Room_Day.png";
  const HYBRID_FACILITY_LESSON_LOCATIONS = ["idol_classroom", "producer_classroom"];
  const HYBRID_FACILITY_TRAINING_LOCATIONS = ["gymnasium", "special_education"];
  const HYBRID_FACILITY_ACTION_MINUTES = 60;
  const STUDENT_DORMITORY_REST_MINUTES = 120;
  const FIRST_LIVE_START_DEADLINE_MINUTES = 19 * 60;
  const FIRST_LIVE_ACTION_MINUTES = 180;
  const SANDBOX_SELECTABLE_IDOLS = ["月村手毬", "藤田琴音", "花海咲季", "秦谷美铃", "筱泽广", "葛城莉莉娅"];
  const SANDBOX_ASARI_OPENING_STORY = `【初星正文开始】
<story>
<narration>午后的制作人科教室里，黑板上还留着上一节课的字迹。</narration>
<narration>【今日课题：调查、观察与担当偶像的选择】</narration>
<narration>亚纱里老师站在讲台前，用教鞭轻轻点了点黑板。</narration>
<dialogue char="亚纱里老师">“Producer，并不是只要坐在教室里，就会有命中注定的偶像自己走到你面前哦。”</dialogue>
<narration>她转过身，目光扫过教室。语气温和，却没有半点玩笑的意思。</narration>
<dialogue char="亚纱里老师">“作为制作人科的学生，你们要学会观察。她为什么站在那个地方，为什么在这个时候移开视线，为什么明明很累却还要继续训练……这些细节，都会成为判断偶像潜力的重要线索。”</dialogue>
<narration>粉笔在黑板上写下新的几行字。</narration>
<narration>【观察】【记录】【判断】【提出培养方针】</narration>
<dialogue char="亚纱里老师">“当然，调查不是窥探隐私。制作人的工作，是在尊重偶像本人的前提下，发现她自己还没能说出口的可能性。”</dialogue>
<narration>亚纱里老师停顿了一下，看向坐在教室里的你。</narration>
<dialogue char="亚纱里老师">“那么，{{user}}。”</dialogue>
<narration>她的声音比刚才柔和了一点。</narration>
<dialogue char="亚纱里老师">“从今天开始，你的课题就是在初星学园内进行实地调查。去和偶像科的学生交谈，观察她们的训练，阅读公开资料，必要时也可以向老师提交申请书。”</dialogue>
<dialogue char="亚纱里老师">“最后，请你找到一位你认为值得负责到底的偶像。”</dialogue>
</story>
【初星正文结束】`;
  const SANDBOX_INVITE_STORY = `【初星正文开始】
<story>
<dialogue char="制作人">“已知情报就这些吗……好，去邀请吧。”</dialogue>
</story>
【初星正文结束】`;
  const FREE_MODE_MAP_ARRIVAL_MINUTES = 15;
  const MAP_LOCATION_PRESENCE_COLLAPSE_AT = 2;
  const FREE_MODE_MAP_CHOICE_MINUTES = 15;
  const FREE_MODE_MAP_MINUTES_MAX = 120;
  const FREE_MODE_PRESENCE_CHANCE = 0.2;
  const worldMapLayoutState = {
    overrides: {},
    mapFit: "cover",
    editorActive: false,
    drag: null
  };
  let mapLocationPresenceExpanded = false;
  const PHONE_CHAT_LINE_DELAY_MS = 2800;
  const phoneAppRegistry = [
    {
      id: "line",
      name: "LINE",
      subtitle: "聊天",
      theme: "#06c755",
      iconText: "L",
      installed: true
    },
    {
      id: "music",
      name: "音乐",
      subtitle: "音乐",
      theme: "#1db954",
      iconText: "M",
      installed: true
    },
    {
      id: "broadcast",
      name: "广播部",
      subtitle: "学园广播",
      theme: "#ff8a4c",
      iconText: "B",
      installed: true
    },
    {
      id: "sns",
      name: "初星圈",
      subtitle: "学园动态",
      theme: "linear-gradient(135deg, #ff6b8a, #f9c584)",
      iconText: "星",
      installed: true
    },
    {
      id: "world-engine",
      name: "初星世界引擎",
      subtitle: "世界档案",
      theme: "linear-gradient(135deg, #167c80, #22324a)",
      iconText: "星",
      installed: true
    }
  ];

  // 音乐文件托管在 R2（与 Live 视频同一桶，桶内同名 PlayList 文件夹）。换桶只改这一行。
  const MUSIC_CDN = "https://pub-cfdeb8f85de84d8193695eca002e7880.r2.dev";
  // 把歌单里的相对 key（PlayList/...）拼成完整地址，并对路径分段做 URI 编码。
  function musicUrl(key) {
    if (!key) return "";
    if (/^https?:\/\//i.test(key)) return key;
    return MUSIC_CDN + "/" + key.split("/").map(encodeURIComponent).join("/");
  }

  // 歌单数据：由 generate-playlist.cjs 自动写入，请勿手改。重新生成: node generate-playlist.cjs
  // === HATSU_MUSIC_TRACKS_START ===
  const phoneMusicTracks = [
    { title: "Campus mode!!", artist: "初星学園", file: "PlayList/初星学園 - Campus mode!!.mp3", cover: "PlayList/covers/初星学園 - Campus mode!!.jpg" },
    { title: "初", artist: "初星学園", file: "PlayList/初星学園 - 初.mp3", cover: "PlayList/covers/初星学園 - 初.jpg" },
    { title: "VEIL", artist: "GUCCHO / Dubscribe / 秦谷美鈴", file: "PlayList/初星学園, GUCCHO, Dubscribe, 秦谷美鈴 - VEIL.mp3", cover: "PlayList/covers/初星学園, GUCCHO, Dubscribe, 秦谷美鈴 - VEIL.jpg" },
    { title: "MY STAGE", artist: "MOMONADY / YUKI FUNAKOSHI / 雨夜 燕", file: "PlayList/初星学園, MOMONADY, YUKI FUNAKOSHI, 雨夜 燕 - MY STAGE.mp3", cover: "PlayList/covers/初星学園, MOMONADY, YUKI FUNAKOSHI, 雨夜 燕 - MY STAGE.jpg" },
    { title: "三分半の創世", artist: "Shuntaro / 雨夜 燕", file: "PlayList/初星学園, Shuntaro, 雨夜 燕 - 三分半の創世.mp3", cover: "PlayList/covers/初星学園, Shuntaro, 雨夜 燕 - 三分半の創世.jpg" },
    { title: "ガラクタロード", artist: "佐藤貴文", file: "PlayList/初星学園, 佐藤貴文 - ガラクタロード.mp3", cover: "PlayList/covers/初星学園, 佐藤貴文 - ガラクタロード.jpg" },
    { title: "SUGAR FLAVOR", artist: "有村麻央 / 姫崎莉波", file: "PlayList/初星学園, 有村麻央, 姫崎莉波 - SUGAR FLAVOR.mp3", cover: "PlayList/covers/初星学園, 有村麻央, 姫崎莉波 - SUGAR FLAVOR.jpg" },
    { title: "わかし・さわがし・スカパンク", artist: "AYATOMO / 木村孝明", file: "PlayList/初星学園,AYATOMO,木村孝明 - わかし・さわがし・スカパンク.mp3", cover: "PlayList/covers/初星学園,AYATOMO,木村孝明 - わかし・さわがし・スカパンク.jpg" },
    { title: "Feel Jewel Dream", artist: "DE DE MOUSE / 有村麻央", file: "PlayList/初星学園,DE DE MOUSE,有村麻央 - Feel Jewel Dream.mp3", cover: "PlayList/covers/初星学園,DE DE MOUSE,有村麻央 - Feel Jewel Dream.jpg" },
    { title: "空と約束", artist: "Evan Call / 倉本千奈", file: "PlayList/初星学園,Evan Call,倉本千奈 - 空と約束.mp3", cover: "PlayList/covers/初星学園,Evan Call,倉本千奈 - 空と約束.jpg" },
    { title: "Fighting My Way", artist: "Giga / 花海咲季", file: "PlayList/初星学園,Giga,花海咲季 - Fighting My Way.mp3", cover: "PlayList/covers/初星学園,Giga,花海咲季 - Fighting My Way.png" },
    { title: "Wildest Flower", artist: "Giga / 花海咲季", file: "PlayList/初星学園,Giga,花海咲季 - Wildest Flower.mp3", cover: "PlayList/covers/初星学園,Giga,花海咲季 - Wildest Flower.jpg" },
    { title: "Atmosphere", artist: "Heart's Cry / 葛城リーリヤ", file: "PlayList/初星学園,Heart's Cry,葛城リーリヤ - Atmosphere.mp3", cover: "PlayList/covers/初星学園,Heart's Cry,葛城リーリヤ - Atmosphere.jpg" },
    { title: "世界一可愛い私", artist: "HoneyWorks / 藤田ことね", file: "PlayList/初星学園,HoneyWorks,藤田ことね - 世界一可愛い私.mp3", cover: "PlayList/covers/初星学園,HoneyWorks,藤田ことね - 世界一可愛い私.jpg" },
    { title: "見て", artist: "kamome sano / 有村麻央", file: "PlayList/初星学園,kamome sano,有村麻央 - 見て.mp3", cover: "PlayList/covers/初星学園,kamome sano,有村麻央 - 見て.jpg" },
    { title: "EGO", artist: "Kijibato / 花海咲季", file: "PlayList/初星学園,Kijibato,花海咲季 - EGO.mp3", cover: "PlayList/covers/初星学園,Kijibato,花海咲季 - EGO.jpg" },
    { title: "Try it now", artist: "Kijibato / 花海咲季", file: "PlayList/初星学園,Kijibato,花海咲季 - Try it now.mp3", cover: "PlayList/covers/初星学園,Kijibato,花海咲季 - Try it now.jpg" },
    { title: "Let's GO!! ICHI-NO-NI!!", artist: "midori nao / 倉本千奈", file: "PlayList/初星学園,midori nao,倉本千奈 - Let's GO!! ICHI-NO-NI!!.mp3", cover: "PlayList/covers/初星学園,midori nao,倉本千奈 - Let's GO!! ICHI-NO-NI!!.jpg" },
    { title: "Fluorite", artist: "Moe Shop / 有村麻央", file: "PlayList/初星学園,Moe Shop,有村麻央 - Fluorite.mp3", cover: "PlayList/covers/初星学園,Moe Shop,有村麻央 - Fluorite.jpg" },
    { title: "Cosmetic", artist: "MOMONADY / Yuki Funakoshi", file: "PlayList/初星学園,MOMONADY,Yuki Funakoshi - Cosmetic.mp3", cover: "PlayList/covers/初星学園,MOMONADY,Yuki Funakoshi - Cosmetic.jpg" },
    { title: "ヨルニテ", artist: "Shogo Nomura / 秦谷美鈴", file: "PlayList/初星学園,Shogo Nomura,秦谷美鈴 - ヨルニテ.mp3", cover: "PlayList/covers/初星学園,Shogo Nomura,秦谷美鈴 - ヨルニテ.jpg" },
    { title: "Sweet Magic", artist: "SHOW / 有村麻央", file: "PlayList/初星学園,SHOW,有村麻央 - Sweet Magic.mp3", cover: "PlayList/covers/初星学園,SHOW,有村麻央 - Sweet Magic.jpg" },
    { title: "Top Secret", artist: "SHOW / 有村麻央", file: "PlayList/初星学園,SHOW,有村麻央 - Top Secret.mp3", cover: "PlayList/covers/初星学園,SHOW,有村麻央 - Top Secret.jpg" },
    { title: "Superlative", artist: "siqlo / 秦谷美鈴", file: "PlayList/初星学園,siqlo,秦谷美鈴 - Superlative.mp3", cover: "PlayList/covers/初星学園,siqlo,秦谷美鈴 - Superlative.jpg" },
    { title: "SUPREMACY", artist: "アオワイファイ / 花海咲季", file: "PlayList/初星学園,アオワイファイ,花海咲季 - SUPREMACY.mp3", cover: "PlayList/covers/初星学園,アオワイファイ,花海咲季 - SUPREMACY.jpg" },
    { title: "みちなるひろがる", artist: "いよわ / 倉本千奈", file: "PlayList/初星学園,いよわ,倉本千奈 - みちなるひろがる.mp3", cover: "PlayList/covers/初星学園,いよわ,倉本千奈 - みちなるひろがる.jpg" },
    { title: "Star-mine", artist: "じん / Begrazia", file: "PlayList/初星学園,じん,Begrazia - Star-mine.mp3", cover: "PlayList/covers/初星学園,じん,Begrazia - Star-mine.jpg" },
    { title: "アイヴイ", artist: "ツミキ / 月村手毬", file: "PlayList/初星学園,ツミキ,月村手毬 - アイヴイ.mp3", cover: "PlayList/covers/初星学園,ツミキ,月村手毬 - アイヴイ.jpg" },
    { title: "ハッピーミルフィーユ", artist: "ナナホシ管弦楽団 / 篠澤 広", file: "PlayList/初星学園,ナナホシ管弦楽団,篠澤 広 - ハッピーミルフィーユ.mp3", cover: "PlayList/covers/初星学園,ナナホシ管弦楽団,篠澤 広 - ハッピーミルフィーユ.jpg" },
    { title: "自己肯定感爆上げ↑↑しゅきしゅきソング", artist: "ヒゲドライバー / 藤田ことね", file: "PlayList/初星学園,ヒゲドライバー,藤田ことね - 自己肯定感爆上げ↑↑しゅきしゅきソング.mp3", cover: "PlayList/covers/初星学園,ヒゲドライバー,藤田ことね - 自己肯定感爆上げ↑↑しゅきしゅきソング.jpg" },
    { title: "メクルメ", artist: "フロクロ / 篠澤 広", file: "PlayList/初星学園,フロクロ,篠澤 広 - メクルメ.mp3", cover: "PlayList/covers/初星学園,フロクロ,篠澤 広 - メクルメ.jpg" },
    { title: "たいせつなもの", artist: "フワリ / 秦谷美鈴", file: "PlayList/初星学園,フワリ,秦谷美鈴 - たいせつなもの.mp3", cover: "PlayList/covers/初星学園,フワリ,秦谷美鈴 - たいせつなもの.jpg" },
    { title: "ツキノカメ", artist: "ミフメイ / 秦谷美鈴", file: "PlayList/初星学園,ミフメイ,秦谷美鈴 - ツキノカメ.mp3", cover: "PlayList/covers/初星学園,ミフメイ,秦谷美鈴 - ツキノカメ.jpg" },
    { title: "赤裸々", artist: "岡部啓一 / 十王星南", file: "PlayList/初星学園,岡部啓一,十王星南 - 赤裸々.mp3", cover: "PlayList/covers/初星学園,岡部啓一,十王星南 - 赤裸々.jpg" },
    { title: "Boom Boom Pow", artist: "花海咲季", file: "PlayList/初星学園,花海咲季 - Boom Boom Pow.mp3", cover: "PlayList/covers/初星学園,花海咲季 - Boom Boom Pow.jpg" },
    { title: "ENDLESS DANCE (花海佑芽・秦谷美鈴・十王星南 ver.)", artist: "花海佑芽 / 秦谷美鈴", file: "PlayList/初星学園,花海佑芽,秦谷美鈴 - ENDLESS DANCE (花海佑芽・秦谷美鈴・十王星南 ver.).mp3", cover: "PlayList/covers/初星学園,花海佑芽,秦谷美鈴 - ENDLESS DANCE (花海佑芽・秦谷美鈴・十王星南 ver.).jpg" },
    { title: "Fragile Heart", artist: "葛城リーリヤ", file: "PlayList/初星学園,葛城リーリヤ - Fragile Heart.mp3", cover: "PlayList/covers/初星学園,葛城リーリヤ - Fragile Heart.jpg" },
    { title: "Wake up!!", artist: "葛城リーリヤ", file: "PlayList/初星学園,葛城リーリヤ - Wake up!!.mp3", cover: "PlayList/covers/初星学園,葛城リーリヤ - Wake up!!.jpg" },
    { title: "極光", artist: "葛城リーリヤ", file: "PlayList/初星学園,葛城リーリヤ - 極光.mp3", cover: "PlayList/covers/初星学園,葛城リーリヤ - 極光.jpg" },
    { title: "白線", artist: "葛城リーリヤ / ナユタン星人", file: "PlayList/初星学園,葛城リーリヤ,ナユタン星人 - 白線.mp3", cover: "PlayList/covers/初星学園,葛城リーリヤ,ナユタン星人 - 白線.jpg" },
    { title: "冠菊", artist: "葛城リーリヤ / 花海咲季", file: "PlayList/初星学園,葛城リーリヤ,花海咲季 - 冠菊.mp3", cover: "PlayList/covers/初星学園,葛城リーリヤ,花海咲季 - 冠菊.jpg" },
    { title: "White Night! White Wish!", artist: "葛城リーリヤ / 花海佑芽", file: "PlayList/初星学園,葛城リーリヤ,花海佑芽 - White Night! White Wish!.mp3", cover: "PlayList/covers/初星学園,葛城リーリヤ,花海佑芽 - White Night! White Wish!.jpg" },
    { title: "桜フォトグラフ", artist: "葛城リーリヤ / 紫雲清夏", file: "PlayList/初星学園,葛城リーリヤ,紫雲清夏 - 桜フォトグラフ.mp3", cover: "PlayList/covers/初星学園,葛城リーリヤ,紫雲清夏 - 桜フォトグラフ.jpg" },
    { title: "The Cute!!!", artist: "金山秀士 / 藤田ことね", file: "PlayList/初星学園,金山秀士,藤田ことね - The Cute!!!.mp3", cover: "PlayList/covers/初星学園,金山秀士,藤田ことね - The Cute!!!.jpg" },
    { title: "Unhappy Light", artist: "月村手毬", file: "PlayList/初星学園,月村手毬 - Unhappy Light.mp3", cover: "PlayList/covers/初星学園,月村手毬 - Unhappy Light.jpg" },
    { title: "一体いつから", artist: "月村手毬", file: "PlayList/初星学園,月村手毬 - 一体いつから.mp3", cover: "PlayList/covers/初星学園,月村手毬 - 一体いつから.jpg" },
    { title: "Wonder Scale", artist: "兼松衆 / 倉本千奈", file: "PlayList/初星学園,兼松衆,倉本千奈 - Wonder Scale.mp3", cover: "PlayList/covers/初星学園,兼松衆,倉本千奈 - Wonder Scale.jpg" },
    { title: "憧れをいっぱい", artist: "高木龍一 / 倉本千奈", file: "PlayList/初星学園,高木龍一,倉本千奈 - 憧れをいっぱい.mp3", cover: "PlayList/covers/初星学園,高木龍一,倉本千奈 - 憧れをいっぱい.jpg" },
    { title: "コントラスト", artist: "佐々木恵梨 / 鵜飼大幹", file: "PlayList/初星学園,佐々木恵梨,鵜飼大幹 - コントラスト.mp3", cover: "PlayList/covers/初星学園,佐々木恵梨,鵜飼大幹 - コントラスト.jpg" },
    { title: "The Rolling Riceball", artist: "佐藤貴文 / 花海佑芽", file: "PlayList/初星学園,佐藤貴文,花海佑芽 - The Rolling Riceball.mp3", cover: "PlayList/covers/初星学園,佐藤貴文,花海佑芽 - The Rolling Riceball.jpg" },
    { title: "グースーピー", artist: "佐藤貴文 / 花海佑芽", file: "PlayList/初星学園,佐藤貴文,花海佑芽 - グースーピー.mp3", cover: "PlayList/covers/初星学園,佐藤貴文,花海佑芽 - グースーピー.jpg" },
    { title: "真っ白いページと水彩の主人公", artist: "佐藤貴文 / 花海佑芽", file: "PlayList/初星学園,佐藤貴文,花海佑芽 - 真っ白いページと水彩の主人公.mp3", cover: "PlayList/covers/初星学園,佐藤貴文,花海佑芽 - 真っ白いページと水彩の主人公.jpg" },
    { title: "ナイワ", artist: "佐伯ユウスケ / 3年1組", file: "PlayList/初星学園,佐伯ユウスケ,3年1組 - ナイワ.mp3", cover: "PlayList/covers/初星学園,佐伯ユウスケ,3年1組 - ナイワ.jpg" },
    { title: "Kira Kira", artist: "紫雲清夏", file: "PlayList/初星学園,紫雲清夏 - Kira Kira.mp3", cover: "PlayList/covers/初星学園,紫雲清夏 - Kira Kira.jpg" },
    { title: "Love & Joy", artist: "紫雲清夏", file: "PlayList/初星学園,紫雲清夏 - Love & Joy.mp3", cover: "PlayList/covers/初星学園,紫雲清夏 - Love & Joy.jpg" },
    { title: "Tame-Lie-One-Step", artist: "紫雲清夏", file: "PlayList/初星学園,紫雲清夏 - Tame-Lie-One-Step.mp3", cover: "PlayList/covers/初星学園,紫雲清夏 - Tame-Lie-One-Step.jpg" },
    { title: "カクシタワタシ", artist: "紫雲清夏", file: "PlayList/初星学園,紫雲清夏 - カクシタワタシ.mp3", cover: "PlayList/covers/初星学園,紫雲清夏 - カクシタワタシ.jpg" },
    { title: "サンフェーデッド", artist: "篠澤 広", file: "PlayList/初星学園,篠澤 広 - サンフェーデッド.mp3", cover: "PlayList/covers/初星学園,篠澤 広 - サンフェーデッド.jpg" },
    { title: "光景", artist: "篠澤 広", file: "PlayList/初星学園,篠澤 広 - 光景.mp3", cover: "PlayList/covers/初星学園,篠澤 広 - 光景.jpg" },
    { title: "Choo Choo Choo", artist: "十王星南", file: "PlayList/初星学園,十王星南 - Choo Choo Choo.mp3", cover: "PlayList/covers/初星学園,十王星南 - Choo Choo Choo.jpg" },
    { title: "理論武装して", artist: "松隈ケンタ / 雨夜 燕", file: "PlayList/初星学園,松隈ケンタ,雨夜 燕 - 理論武装して.mp3", cover: "PlayList/covers/初星学園,松隈ケンタ,雨夜 燕 - 理論武装して.jpg" },
    { title: "コンテンポラリのダンス", artist: "真島ゆろ / 篠澤 広", file: "PlayList/初星学園,真島ゆろ,篠澤 広 - コンテンポラリのダンス.mp3", cover: "PlayList/covers/初星学園,真島ゆろ,篠澤 広 - コンテンポラリのダンス.jpg" },
    { title: "ときめきエモーション", artist: "神山羊 / 葛城リーリヤ", file: "PlayList/初星学園,神山羊,葛城リーリヤ - ときめきエモーション.mp3", cover: "PlayList/covers/初星学園,神山羊,葛城リーリヤ - ときめきエモーション.jpg" },
    { title: "雨上がりのアイリス", artist: "神前暁 / Re;IRIS", file: "PlayList/初星学園,神前暁,Re;IRIS - 雨上がりのアイリス.mp3", cover: "PlayList/covers/初星学園,神前暁,Re;IRIS - 雨上がりのアイリス.jpg" },
    { title: "marble heart", artist: "須藤幽玄 / 姫崎莉波", file: "PlayList/初星学園,須藤幽玄,姫崎莉波 - marble heart.mp3", cover: "PlayList/covers/初星学園,須藤幽玄,姫崎莉波 - marble heart.jpg" },
    { title: "ときめきのソルフェージュ", artist: "倉本千奈", file: "PlayList/初星学園,倉本千奈 - ときめきのソルフェージュ.mp3", cover: "PlayList/covers/初星学園,倉本千奈 - ときめきのソルフェージュ.jpg" },
    { title: "仮装狂騒曲", artist: "倉本千奈 / 月村手毬", file: "PlayList/初星学園,倉本千奈,月村手毬 - 仮装狂騒曲.mp3", cover: "PlayList/covers/初星学園,倉本千奈,月村手毬 - 仮装狂騒曲.jpg" },
    { title: "古今東西ちょちょいのちょい (花海咲季・月村手毬・藤田ことね ver.)", artist: "大澤めい / 花海咲季", file: "PlayList/初星学園,大澤めい,花海咲季 - 古今東西ちょちょいのちょい (花海咲季・月村手毬・藤田ことね ver.).mp3", cover: "PlayList/covers/初星学園,大澤めい,花海咲季 - 古今東西ちょちょいのちょい (花海咲季・月村手毬・藤田ことね ver.).jpg" },
    { title: "金の斧、銀の斧、エメラルドの斧", artist: "大澤めい / 花海佑芽", file: "PlayList/初星学園,大澤めい,花海佑芽 - 金の斧、銀の斧、エメラルドの斧.mp3", cover: "PlayList/covers/初星学園,大澤めい,花海佑芽 - 金の斧、銀の斧、エメラルドの斧.jpg" },
    { title: "Our Chant", artist: "中鶴潤一 / Fra", file: "PlayList/初星学園,中鶴潤一,Fra - Our Chant.mp3", cover: "PlayList/covers/初星学園,中鶴潤一,Fra - Our Chant.jpg" },
    { title: "小さな野望", artist: "椎名豪 / 十王星南", file: "PlayList/初星学園,椎名豪,十王星南 - 小さな野望.mp3", cover: "PlayList/covers/初星学園,椎名豪,十王星南 - 小さな野望.jpg" },
    { title: "つよつよ最強エクササイズ", artist: "坪井リヒト / 佐藤貴文", file: "PlayList/初星学園,坪井リヒト,佐藤貴文 - つよつよ最強エクササイズ.mp3", cover: "PlayList/covers/初星学園,坪井リヒト,佐藤貴文 - つよつよ最強エクササイズ.jpg" },
    { title: "叶えたい、ことばかり", artist: "田中透真 / 月村手毬", file: "PlayList/初星学園,田中透真,月村手毬 - 叶えたい、ことばかり.mp3", cover: "PlayList/covers/初星学園,田中透真,月村手毬 - 叶えたい、ことばかり.jpg" },
    { title: "Ride on Beat", artist: "田中龍志 / 柿迫ヒカル", file: "PlayList/初星学園,田中龍志,柿迫ヒカル - Ride on Beat.mp3", cover: "PlayList/covers/初星学園,田中龍志,柿迫ヒカル - Ride on Beat.jpg" },
    { title: "clumsy trick", artist: "渡辺翔 / 姫崎莉波", file: "PlayList/初星学園,渡辺翔,姫崎莉波 - clumsy trick.mp3", cover: "PlayList/covers/初星学園,渡辺翔,姫崎莉波 - clumsy trick.jpg" },
    { title: "ふわふわ", artist: "藤田ことね", file: "PlayList/初星学園,藤田ことね - ふわふわ.mp3", cover: "PlayList/covers/初星学園,藤田ことね - ふわふわ.jpg" },
    { title: "歌声は君いろ", artist: "姫崎莉波", file: "PlayList/初星学園,姫崎莉波 - 歌声は君いろ.mp3", cover: "PlayList/covers/初星学園,姫崎莉波 - 歌声は君いろ.jpg" },
    { title: "L.U.V", artist: "諭吉佳作men / 姫崎莉波", file: "PlayList/初星学園,諭吉佳作men,姫崎莉波 - L.U.V.mp3", cover: "PlayList/covers/初星学園,諭吉佳作men,姫崎莉波 - L.U.V.jpg" },
    { title: "SEARCH RIGHT", artist: "涼木シンジ", file: "PlayList/初星学園,涼木シンジ - SEARCH RIGHT.mp3", cover: "PlayList/covers/初星学園,涼木シンジ - SEARCH RIGHT.jpg" }
  ];
  // === HATSU_MUSIC_TRACKS_END ===
  const REQUIRED_BOND_THRESHOLDS = [20, 40, 60, 80];
  const affinityThresholds = [20, 40, 60, 80, 100];

  function getAffinityStageThreshold(trust) {
    const value = Number.isFinite(Number(trust)) ? Number(trust) : 0;
    if (value >= 100) return 100;
    if (value >= 80) return 80;
    if (value >= 60) return 60;
    if (value >= 40) return 40;
    if (value >= 20) return 20;
    return 0;
  }

  function getAffinityStageTag(idolName, trust) {
    const code = affinityIdolCodes[idolName];
    return code ? `AFF_${code}_${getAffinityStageThreshold(trust)}` : "";
  }

  function getAffinityStageLine(idolName, trust) {
    const tag = getAffinityStageTag(idolName, trust);
    return tag ? `好感度阶段标签：${tag}` : "";
  }

  function clampFreeModeRelationshipScore(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round(clamp(number, 0, 100));
  }

  function normalizeFreeModeRelationshipEntry(entry = {}) {
    const rawScore = typeof entry === "number" || typeof entry === "string"
      ? entry
      : entry?.好感度;
    const rawDay = typeof entry === "object" && entry ? Number(entry.更新日) : 0;
    return {
      好感度: clampFreeModeRelationshipScore(rawScore),
      更新日: Number.isFinite(rawDay) && rawDay > 0 ? Math.floor(rawDay) : 0
    };
  }

  function ensureFreeModeRelationships() {
    if (!state.freeMode) state.freeMode = {};
    const source = state.freeMode.relationships && typeof state.freeMode.relationships === "object"
      ? state.freeMode.relationships
      : {};
    const normalized = {};
    Object.entries(source).forEach(([rawName, rawEntry]) => {
      const idolName = canonicalIdolName(rawName);
      if (!idolName || !idols[idolName]) return;
      normalized[idolName] = normalizeFreeModeRelationshipEntry(rawEntry);
    });
    state.freeMode.relationships = normalized;
    return normalized;
  }

  function getFreeModeRelationship(idolName, options = {}) {
    const canonical = canonicalIdolName(idolName);
    if (!canonical || !idols[canonical]) return null;
    const { create = true } = options;
    const relationships = ensureFreeModeRelationships();
    if (!relationships[canonical] && create) {
      relationships[canonical] = normalizeFreeModeRelationshipEntry();
    }
    return relationships[canonical] || null;
  }

  function getFreeModeRelationshipScore(idolName) {
    return getFreeModeRelationship(idolName)?.好感度 || 0;
  }

  function canonicalNpcName(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (residentNpcProfiles[raw]) return raw;
    const found = Object.entries(residentNpcProfiles).find(([name, profile]) => {
      return profile?.id === raw || profile?.alias === raw || name.toLowerCase() === raw.toLowerCase();
    });
    return found ? found[0] : "";
  }

  function ensureFreeModeNpcRelationships() {
    if (!state.freeMode) state.freeMode = {};
    const source = state.freeMode.npcRelationships && typeof state.freeMode.npcRelationships === "object"
      ? state.freeMode.npcRelationships
      : {};
    const normalized = {};
    Object.entries(source).forEach(([rawName, rawEntry]) => {
      if (typeof canonicalNpcName !== "function" || typeof getFreeModeNpcRelationship !== "function") return;
      const npcName = canonicalNpcName(rawName);
      if (!npcName) return;
      normalized[npcName] = normalizeFreeModeRelationshipEntry(rawEntry);
    });
    state.freeMode.npcRelationships = normalized;
    return normalized;
  }

  function getFreeModeNpcRelationship(npcName, options = {}) {
    const canonical = canonicalNpcName(npcName);
    if (!canonical) return null;
    const { create = true } = options;
    const relationships = ensureFreeModeNpcRelationships();
    if (!relationships[canonical] && create) {
      relationships[canonical] = normalizeFreeModeRelationshipEntry();
    }
    return relationships[canonical] || null;
  }

  function getFreeModeNpcRelationshipScore(npcName) {
    return getFreeModeNpcRelationship(npcName)?.好感度 || 0;
  }
  function getFreeModeAffinityStageLine(idolName) {
    return getAffinityStageLine(idolName, getFreeModeRelationshipScore(idolName));
  }

  // 按当前模式选择好感度来源：沙盒/自由模式用 freeMode 好感度，育成模式用旧的 state.trust。
  function getContactAffinityStageLine(idolName) {
    if (isSandboxLaunch() || isFreeModeActive()) {
      return getFreeModeAffinityStageLine(idolName);
    }
    return getAffinityStageLine(idolName, state.trust);
  }

  const affinityNodes = {
    0: { title: "担当开场", theme: "制作人与担当偶像正式建立育成关系，确认 First Live 前的共同目标。", timing: "选择担当后立即触发，读完后进入育成主界面。" },
    20: { title: "相互试探", theme: "围绕“为什么选择她、她为什么愿意接受你”推进早期信任。", timing: "好感度达到 20 后解锁。" },
    40: { title: "核心问题暴露", theme: "揭示该偶像最主要的矛盾与弱点，让数值育成和个人主线接上。", timing: "好感度达到 40 后解锁。" },
    60: { title: "关系转折", theme: "制作人与偶像的信任关系发生明确变化，角色开始把支持视为自己的力量。", timing: "好感度达到 60 后解锁。" },
    80: { title: "路线后半转折", theme: "First Live 前的重要个人主线节点，回收旧关系、核心矛盾或上台前必须面对的课题。", timing: "好感度达到 80 后解锁，于 First Live 前夜（第 21 天）进入羁绊事件日。" },
    100: { title: "First Live 之后", theme: "演出成功后的故事收尾，让角色关系完成 First Live 篇章的闭环。", timing: "First Live 成功且好感度达到 100 后解锁。" }
  };
  const affinityRouteSeeds = {
    "藤田琴音": {
      0: "最初的接触与被选择。状态：仍把自己视作成绩不起眼、实绩不足的底层偶像候补。她会用可爱营业、吐槽和夸张反应撑住场面，嘴上说得很有气势，心里却还不相信自己真的会被认真选择。锚点：打工后的初遇、对制作人身份的怀疑、“这不是搭讪吧”的确认、为什么偏偏选择自己的不安、被制作人看见潜力后的狂喜、将“也许我还有机会”转化成“我要出人头地，成为顶级偶像，让家里人安心”的第一声宣言。",
      20: "暴露短板与确认不会被放弃。状态：接受担当关系，但还没相信自己。被制作人看见训练失败、唱歌短板和不稳定状态时，会立刻害怕对方后悔选择自己。锚点：训练表现差、催促制作人“你倒是说点什么”、确认“不会撤回劝诱吧”“不会抛弃我吧”、因为被夸奖而轻易动摇、承认自己很久没有被人这样夸过、开始把制作人的眼光当作临时支架。",
      40: "从廉价打工转向偶像工作。状态：仍被赚钱焦虑推着走，无法安心休息，总想把打工和偶像活动两边都抓住。制作人开始实际介入她的生活，让她第一次感到“被照顾”不是空口安慰，而是具体解决问题。锚点：奖学金和补助申请、减少打工、强制休息、禁止偷偷兼职、收到水果和食物、吐槽制作人像家长、被“报酬不低于目前且能成长的偶像工作”击中、把感谢包装成撒娇和“制作人是不是超级喜欢我”的玩笑。",
      60: "重新理解自己的偶像资本。状态：逐渐理解偶像的价值不只在唱功。她虽然仍承认自己唱歌差、实绩不足，但开始明白可爱、舞蹈、表情、人际经营、工作态度和观众缘都可以成为偶像实力。锚点：玩偶秀和宿舍打扫等怪工作、抱怨体力活却认真完成、理解体能和评价提升的重要性、主动经营宿舍学姐和同级生关系、被制作人指出“想成为大家都想合作的偶像”、把零成本社交视为生存智慧、开始把“可爱”和“赚钱”接入偶像道路。",
      80: "初 Live 前的自信搭建。状态：Live 前面对唱歌短板产生强烈不安。她不能完全相信自己，但已经可以相信制作人的眼光，并主动请求制作人在身边看着她、继续夸奖她。锚点：被指出唱歌差、理解 Live 不是只听歌而是传达自己的全部魅力、确认可爱容貌和舞蹈是自己的武器、被认真夸奖后失速脸红、要求“请在身边看着我”“像现在这样多夸夸我”、把制作人的认可转化成堂堂正正站上舞台的勇气。",
      100: "作为偶像被看见与家庭告白。状态：完成初 Live 后，第一次强烈感到自己真的作为偶像被观众、同学、网络和家人看见。她仍然爱钱、爱夸、会撒娇，但已经开始把“赚钱”理解为作为偶像获得价值、回报家庭、证明自己没有白来初星学园的方式。锚点：初 Live 满席、PV 传播、SNS 话题、出场费上涨、家人说她像偶像、游乐园约会作为“报答”、主动讲出家庭贫困、弟妹、学费、父亲离家和自责、把沉重话题用笑容收束、确认自己要成为顶级偶像和大富豪，给家里带回真正的好消息。"
    },
    "月村手毬": {
      0: "冷淡拒绝，但因为制作人知道她的失败与丑闻仍然选择她而动摇。",
      20: "她嘴硬地设下界限，实际在观察制作人是否能理解现在的自己。",
      40: "体力、体重、心理疲劳和组合崩坏暴露出来，她害怕再次失控。",
      60: "首场 Live 失败：彩排用力过猛导致正式上场体力不足。制作人分析手毬实力受感情影响极大，上限很高、下限也很低；今后的目标不是压低输出，而是稳定发挥并充分利用她的上限。",
      80: "电话依赖、美铃视角、SyngUp 重组提案、拒绝回到过去、下场 Live 赌约。手毬越来越依赖制作人，美铃担心她一个人不行并请求重组 SyngUp；制作人承认担心但拒绝简单回到旧组合，以下一场 Live 作为赌约，让美铃见证手毬的改变。",
      100: "First Live 成功后：赌约兑现、美铃放手、关系修复、不能回到过去、只属于自己的制作人、成为偶像的根源、人工翅膀、陪我到最高峰。手毬与美铃互相道歉，承认无法回到过去的 SyngUp，但可以重新成为朋友；之后手毬向制作人说出自己成为偶像的根源，制作人确认选择的正是这个靠痛苦努力长出人工翅膀的手毬。"
    },
    "花海咲季": {
      0: "入学考试第一的花海咲季带着傲慢与自信登场，却用胜利者的外壳掩盖内心焦虑，试图通过制作人寻找通往「世界第一」的捷径。她对妹妹佑芽感情复杂——既是亲人，也是最强对手。制作人点破「如果不改变现状就会输」，她第一次露出恐惧，随即追问「能帮我赢吗」并建立初步信赖。【钩子：世界第一野心、姐姐身份与对手恐惧、契约前的试探】",
      20: "咲季不断练习却感到成长陷入停滞，对「超早熟」天赋带来的瓶颈感到困惑。她自夸神童，却承认在运动与竞技中曾因怕输而逃避；偶像成了她最后的孤注一掷。制作人看穿她「想赢却害怕成长速度追不上佑芽」，她最终确立「既然不能逃避，那就正面战胜」的决心。【钩子：怕输的逃跑本能、佑芽作为标尺、不能逃避】",
      40: "咲季陷入对「胜利」标准的迷茫。期末考试输给佑芽后情绪崩溃，童年「为了维护姐姐是最强这句谎言而被迫不断变强」的真相浮出水面。作为姐姐的自尊与作为偶像的追求发生撕裂，她确认制作人是那个陪自己把谎言变成真实的人。【钩子：最强姐姐是谎言、崩溃与坦诚、佑芽竞争轴】",
      60: "通过与佑芽多次短兵相接，咲季意识到仅靠苦行僧式练习，面对飞速成长的对手仍显得单薄。对抗训练中，她因为想赢而对佑芽进行保姆式辅导——按摩、做饭、陪学习。制作人点破：咲季缺少的不是努力，而是把对妹妹的复杂羁绊转化为舞台上的绝对压制力。首场 Live 前夕，她第一次因焦虑而颤抖。【钩子：想赢所以照顾妹妹、羁绊即武器、Live前焦虑】",
      80: "咲季见证佑芽在一次公开演出或彩排中展现的偶像实力，意识到妹妹已不再是需要庇护的孩子，而是能威胁自己地位的顶级偶像候补。面对「作为偶像，佑芽可能更强」这一事实，她经历痛苦与认可，拒绝逃避并要求更严苛的训练。制作人提出「不只是要赢，还要成为无法被复制的存在」，她把「战胜妹妹」升华为「顶级偶像的证明」。【钩子：宿敌关系确立、甘拜下风与认可、Live前夜的转折】",
      100: "First Live 之后，咲季接受「我与佑芽无法回到过去，但我们可以作为最强对手共同进化」的现实。她向制作人坦露偶像的根源就是作为姐姐的那份固执，承认自己是人工打造的「最强姐姐」；虽然赢了比赛，却明白成长才刚刚开始。她与制作人确立「无论是冠军还是胜利，都要一起夺走」的共犯关系。【钩子：姐妹无法回去但能并肩进化、最强姐姐人设、共犯制作人】"
    },
    "筱泽广": {
      0: "制作人在走廊遇见摇摇晃晃的筱泽广——她当场倒下，被抬进保健室后醒来，直球要求「希望你能成为我的制作人」。制作人直言「你不适合做偶像」，她反而心情变好：冷冰冰的评价比学园长那句「以顶级偶像为目标」更对。她选偶像是因为「这可能是最不适合我的」；制作人暂且接下一个月试用。此刻她是HP1的天才少女，理论满、实操零，认真全力以赴，却随时可能再倒。【钩子：低评价=安心、试用合同的忐忑、最不适合反而开心】",
      20: "制作人办免除理论课，用休养和想象训练代替加练；确认饮食习惯，引入顶级偶像养成餐和SSD——营养高、难以下咽，她吃得下去。教练按制作人说法安排「被囚禁公主」「HP1」特殊训练与老年复健式伸展；佑芽、千奈加入补习组，帮她完成「比上周更健康」「单脚站立十秒」「能走路」等最基础课题，佑芽的按摩痛到惨叫她却求之不得。【钩子：进步极慢但每一步都大、对人类还为时过早、在生与死边缘徘徊却觉得幸福】",
      40: "傍晚广问制作人「我是不是很难懂的学生」；制作人点破：她的「梦想」其实早已实现——「以偶像为目标」就是目的本身，「成为偶像」只是兴趣。她过去什么都太顺利、无聊透了，才反选最不擅长的路。制作人最终答：因为兴趣才接下她，「新鲜、痛苦、又会事与愿违的日子」值得期待。广安心接下：「交给我，一定会非常开心。」【钩子：兴趣≠梦想、要被抛下的不安、制作人终于理解她】",
      60: "广前屈能抓脚踝、能笔直走路，完成五月任务后却叹气——制作人梦见她在舞台成功后会消沉，当面问出这个噩梦。广承认：若偶像活动真的顺利，她会想起过去一切顺利的日子而失落；但偶像工作永不稳定，事与愿违不会结束，所以她才选这条路。制作人让她从明天起参加正常训练课程：「接下来会很艰难，别叫苦。」【钩子：进步反而消沉、偶像=永远不稳定=安心、从特殊训练进入常规训练】",
      80: "广第一次现场看佑芽的演唱会，说朋友「闪闪发光」——制作人追问「甘不甘心」，她才发现自己在最喜欢的事上落后会这么痛苦，随即确认：「我喜欢……偶像。」她任性要求「明天开演唱会」，制作人把信用和信任押上赌局，安排一天后的暖场演出。登台前广清楚自己练习不足、会给很多人添麻烦，仍说「越是困境中，我越能展现超越实力的表现」——好伙伴，明天，我们一起享受吧。【钩子：第一次「不甘心」=确认喜欢偶像、不可能赌局的压顶感、Live前的不退缩】",
      100: "暖场演出上广超常发挥，后台说「比练习时唱得好多了」——赢下了不被看好的赌局。之后制作人在游乐园犒劳她，走几步就累，却在长椅上说出了更朴素的动机：「我想要变得可爱。」她选择白手起家，不公开天才履历；制作人坦白从未有过试用合同，从一开始就是正式合同、命运共同体。广抱怨被欺骗、一直忐忑，却应下「今后也请多指教」——「从今往后，每天都要在一起哦。」【钩子：Live后的超常发挥确认、想变得可爱、骗合同=安心、平静而直白的长期陪伴】"
    },
    "十王星南": {
      0: "制作人登门招揽这位『一等星·启明星』——学园顶点、学生会会长、前任 H.I.F 冠军。星南先以优雅从容的姿态拒绝：自认才能有限、毕业后要转做制作人、梦想是『培养出超越自己的偶像』，而非继续当偶像。制作人追问『对你而言顶级偶像是什么』，以『顶级偶像存在于每个人心中，应亲手实现』反驳，戳中她仍想再相信一次『偶像·十王星南』的心情。她最终同意签约一年，带着高位者的矜持与试探进入试用期——既观察制作人本事，又以『未来制作人候补』身份暗中学习。【钩子：顶点偶像与转制作人的拉锯、一年合约的赌约感、对制作人判断的好奇与距离感】",
      20: "签约后首次目标会议，制作人点破自 H.I.F 夺冠成为一等星以来实力零成长——这正是对十王星南最致命的问题。星南从期待高要求到直面停滞，承认三维数值没有变化；制作人提出『偶像能力不止 Dance/Vocal/Visual 三项』，她从未尝试提升不可见能力，却在引导下看到新出路，决定『如果真的还有希望，就再拼一次』。此刻她仍保留学园第一的余裕，但对自身极限已坦率承认。【钩子：零成长危机、不可见能力的新方向、被制作人示范压过时的不甘心、『我讨厌你』式的别扭竞争】",
      40: "制作人推她做从未尝试过的事——视频直播，访谈中意新生藤田琴音。星南两次错误邀请（『成为我的人吧』、不合理报酬）致琴音逃跑，制作人当场示范成功邀请；直播正式播出时，琴音播放无剧本排练录像，全校看到紧张发抖、非偶像的会长。星南羞耻后承认完美形象只是『一厢情愿的目标』，开始思考『偶像以外的我』是否才是未被发现的魅力。【钩子：社交笨拙出丑、完美外壳在全校面前裂开、对制作人生气却逐渐理解其意图】",
      60: "直播后星南与制作人对峙，长段自白完美枷锁——从小为偶像而生、必须完美、逃避与校外顶尖偶像比较、自认不如她们。制作人激将『胆小鬼配得上学园顶点吗』，她否认被激将，但决定不再拿后辈当逃避理由。宿敌雨夜燕随后兴师问罪，要她回到完美榜样；星南拒绝改方向，首次对追随者公开誓言：『我要成为顶级偶像』——即使破坏至今建立的十王星南形象，也没有退路。【钩子：完美主义核心崩溃、与旧形象的公开决裂、燕作为旧期待的对立面、对制作人的信任前提下的生气】",
      80: "星南找制作人要『飞出学院』的相称舞台，坦白能力值自去年起仍无变化、怕动摇快哭；制作人指『舞台下笨拙』才是变化，粉丝出现『请加油』『你好可爱』。她接受可爱偶像的新定位，阐明顶级偶像=『梦想成为偶像的人们的指路明灯』，邀请制作人陪自己进行人生最重要赌局——与校外顶级偶像前辈同台，即使实力垫底也要让全世界知道自己是顶级偶像。【钩子：数值不变与粉丝结构变化的悖论、背水一战的孤注一掷、对制作人的高度信赖、顶级偶像定义的落地】",
      100: "学园礼堂演唱会，星南即兴喊出『以一等星为目标吧！偶像的顶点就在这里！』，自认人生中最棒的演唱会、没有输给任何人，感谢制作人『这一切都是多亏了你』。次日她却闷闷不乐——粉丝与前辈粉丝网上争吵，能力自知未达顶级、压力反增，一度动摇『转制作人是否更优』。最终她告白：将最闪耀的顶级偶像十王星南培养成的制作人，才是她当制作人的憧憬、梦想和目标；决定留在身边学习——『今后也请多多指教啦，我最棒的顶级制作人！』【钩子：梦想实现后的新不安、制作人成为制作人之梦、长期同行的关系落点、顶级偶像之后的更大责任】"
    },
    "秦谷美铃": {
      0: "初见即表现出超然物外的懒散态度，制作人通过调查理解其本质并提出培育。锚点是：茶道室的午睡、前优等生的伪装、选择“慢悠悠”的偶像道路、与制作人定下悠闲登顶的约定。",
      20: "确立制作人作为“同行者”的关系，并揭露曾经的组合羁绊。锚点是：阴天训练约定、作为“前优等生”的过去、对SyngUp的执着怀念、决心阻止手毬为了冲动而自我毁灭。",
      40: "打破对“努力”的定义，将“散步”转化为实力提升的捷径。锚点是：练习室歌唱训练、制作人对她独特的“努力”方式的肯定、为她铺平前路的捷径、确认以自身步调散步超越手毬的战略。",
      60: "面对单人偶像的挑战，剖析内心真实的执念与独占欲。锚点是：筹备个人演出、否定组合式的依赖唱法、制作人要求融入“真情实感”、揭露内心深处想让观众“离不开自己”的恐怖且强烈的独占欲。",
      80: "通过观摩手毬演出确认差距与决心，发出回应式的挑战。锚点是：作为“头号粉丝”观摩手毬演出、对不顾一切演出的担忧与胃药关怀、以自身歌声为回击的“战书”、亲口教训并直面手毬。",
      100: "First Live 成功后：自我觉醒、关系重塑。锚点是：Live获得认可、与手毬互相道歉并承认无法回到过去的组合，但确认了新的同伴关系；美铃向制作人吐露成为偶像的根源（并非憧憬，而是对光的占有欲与不甘心）；确认制作人是让自己登上最高峰、并能在那里安稳小睡的唯一共犯。"
    },
    "花海佑芽": {
      0: "入学典礼迟到、混进人群的候补入学新生佑芽，凭直觉直球拜托制作人当担当——「如果是这个人，一定能成为我的力量」。她坦白唱歌、跳舞、学习、演讲可能都相当不行，却自称潜力股；说出以偶像为目标的唯一理由是「有想战胜的人」，从出生起在各种竞技里挑战对方无数次、一次也没赢过，那个人就在这所学校。制作人接下担当。【钩子：直觉信任、候补生的自卑与气势、想战胜「那个人」、请叫我佑芽】",
      20: "姐姐咲季冲来「考察」制作人，姐妹关系与竞争轴摆上台面。制作人早已拜访两人双亲、拿到运动员格式的培养资料，当场击退咲季。佑芽兴奋炫耀「这就是我的制作人」，并明确宿敌就是「最棒的姐姐」。目标极其直接：作为偶像在舞台上战胜咲季、成为学园第一。【钩子：既是宿敌也是最棒的姐姐、制作人先见双亲、姐姐是过度保护、想赢过姐姐】",
      40: "制作人点破：佑芽不会输给任何人的热情，说白了是针对咲季的，并非对偶像本身的热情——这既是强力武器，也是限制成长的枷锁。若咲季改行别的竞技，佑芽也会追随；「赢了姐姐之后我会变成什么」她答不上来。她苦恼却坦率接受这个「全盘否定」，确认自己胜利的条件是让姐姐在舞台上说出「我输了」，并被告知需要一个「突破口」才能爆炸性成长。【钩子：热情只朝向姐姐、枷锁与武器、赢了之后的空白、需要突破口】",
      60: "制作人禁止佑芽再说「我输了」，纠正她「败北专家」的习惯，把坦率当成最大长处。她在切实的训练与咲季的鼓励下急速成长，制作人指出真正的突破口不只是计划，而是「咲季」本身——姐姐是宿敌、是可信赖的姐姐、是指导者与榜样。随后决定让佑芽第一次和咲季以外的偶像比试：选拔试验。【钩子：禁止说输、坦率是长处、姐姐即突破口、走出只盯姐姐的视野】",
      80: "First Live 前夜（第二次选拔试验前），佑芽第一次真切感到「这次或许能赢姐姐」。登台前她流鼻血、浑身颤抖，说不清是兴奋还是害怕——「和对等的对手战斗，原来会这么害怕」「如果今天输了，就感觉什么都完了」。她终于能回答制作人当初的问题：想作为偶像赢过姐姐、成为世界第一，赢了之后的事赢了再想。制作人认可这份已经改变的决心。【钩子：第一次觉得能赢、对等竞争的兴奋与恐惧、赢了再想、想作为偶像战胜姐姐】",
      100: "First Live（N.I.A. FINALE 等价）后，佑芽终于战胜咲季、实现长年梦想，感到「像重生一样」豁然开朗，确认了顶级偶像那种无法数值化的吸引力。她第一次说出梦想实现之后的新目标：不再只是追姐姐的背影，而是「我要成为姐姐的目标」，想好好成为偶像、以一番星为目标、再和姐姐对决。她相信无敌的咲季一定会追上来，两人作为对等宿敌继续进化。【钩子：赢下姐姐=突破、从追背影到成为目标、终于爱上偶像本身、和姐姐再对决】"
    },
    "仓本千奈": {
      0: "仓本集团千金在宅邸接见制作人——对方坦白是校长受爷爷委托、报酬太多不好拒绝，并非发现才能。千奈崩溃于憧憬的「热情发掘」落空，却自曝入学考试倒数第一、仍要竭尽全力；制作人调查后否定走后门，指出她「讨人喜欢」才是偶像本质，并正式请求：即便没有仓本家委托与报酬，也请让我成为你的制作人。她含泪同意。【钩子：委托真相、倒数第一、讨人喜欢、抛开身份亲自选择】",
      20: "爷爷追加要求今夏 H.I.F 一等星、与星南对决——制作人判断不参加，承诺在缓冲期内培养出色偶像。千奈接受与普通新生同样的硬核基础训练，跑步热身结束才正式开始、随即倒地；月村手毬说没才能早点放弃，筱泽广却说她「很亲切」。千奈第一次被说这么过分，却无法反驳。【钩子：H.I.F 荒唐要求、无视爷爷、基础训练地狱、手毬挖苦、广说亲切】",
      40: "训练后浑身酸痛仍回来报到，几次想放弃却因憧憬偶像而绝不甘休——「在这学院内我有自信比任何人娇生惯养」。爷爷又要求月末显著成果；制作人点破两大才能：仓本之名与财产、以及顶尖级的外表与教养，安排杂志模特作为成果。千奈要求不滥用才能，答应成为 PHOTOGENIC 偶像。【钩子：绝不甘休、月末期限、有钱也是才能、外表武器、杂志模特】",
      60: "杂志专栏让她登上封面，外界批评落在制作人身上而非她；她哭着说「害老师被说坏话我不甘心」，请求指导如何快点提升实力。制作人说不勉强、一步一个脚印，却安排她的首场演唱会——她虽没做好心理准备，仍相信老师不会被开除。【钩子：封面争议、不负老师、首场 Live 决定、相信老师】",
      80: "First Live 前夜，她偷看观众席就肚子疼、完全没有做好心理准备，却明白不能让大家看到不成熟的样子。她看穿制作人做好半年后被解雇的觉悟，生气地宣言：绝不会让老师被开除，要用这场演唱会向爷爷炫耀制作人的实力与成果。【钩子：Live 前夜不安、看穿解雇觉悟、绝不让您被开除、向爷爷炫耀】",
      100: "First Live 成功后，她让爷爷彻底认可继续与老师共事，自称「等级为 1 的新手偶像」不再叫自己吊车尾。休息日与制作人做羊毛毡吉娃娃，第一次把一时兴起的事坚持到最后；她明白拥有梦想原来这么沉重，却一点也不想放弃。【钩子：首演成功、爷爷认可、吉娃娃、坚持到底、梦想的责任】"
    },
    "葛城莉莉娅": {
      0: "刚来日本的葛城莉莉娅在校园里迷路找不到礼拜室，拘谨地向制作人求助。她被好友清夏邀请「两个人一起做偶像」，最初没自信想拒绝，却在学园 Live 后萌生「我也想像那样闪耀」的愿望。她自认不灵巧也不可爱，却仍无法放下成为偶像的心。制作人点破偶像最重要的才能是踏向梦想的意志——说服双亲、赴日求学已是巨大勇气，随即请求成为她的制作人。【钩子：迷路初遇、清夏的约定、Live憧憬、前辈称呼、顶级偶像目标】",
      20: "零基础的她什么都想练却不得要领；制作人先聚焦声乐，帮她从混乱中迈出第一步。她仍看不见自己的进步，直到对比初期录像才相信自己在成长。表情一直僵硬，制作人让她回忆憧憬偶像的笑容，她在镜前笨拙练习却会因为开心而露出真笑。同学质疑「为什么选成绩差的莉莉娅」，制作人当面宣誓相信她能成为顶级偶像，她把「被前辈相信」记在心里。【钩子：声乐先行的计划、录像看见成长、表情也是表演、被选中质疑、相信我能成为顶级偶像】",
      40: "制作人指出偶像的本质不是技术，而是把「想要传达」的意志展现给观众；莉莉娅承认自己害怕展示自己、只会拼命努力。她主动提议请最重要的朋友清夏来观看练习——想把自己现在的歌声传进清夏心里，把这当作克服舞台恐惧的契机。清夏到场后，莉莉娅在亲友面前唱出努力后的自己，收获「太厉害了」的回应，第一次有了些许自信。【钩子：害怕被看见、传达心意比技术重要、清夏是独一无二的朋友、亲友观众突破怯场】",
      60: "First Live 日程确定，她因恐惧过早登台而身体发抖，却在深夜独自加练到近乎透支。制作人发现后制止过度练习，她坦白「现在的自己还远远不够」。登台当天，她把全力唱给台下的观众与清夏；演出虽有失误，却真的把心情传达到了别人心里。清夏在观众席感动落泪，事后承认想重新一起向更高的天空飞翔。【钩子：第一次Live太早了、过度训练的恐惧、歌声传达到心里、清夏重续约定】",
      80: "First Live 前夜，兴奋与不安让她无法停下训练——她害怕辜负前辈与观众，越练越觉得自己还差得远。制作人再次拦住她的透支，要她相信「全力以赴」本身就是魅力，而不是用透支证明诚意。她接受休息也是计划的一部分，带着「要把感谢唱回给观众」的决心走向舞台。【钩子：Live前夜的颤抖、过度努力、相信制作人、把感谢唱回去】",
      100: "First Live 之后，莉莉娅确认自己的歌声能改变他人，也让清夏重新鼓起成为偶像的勇气。她把制作人视作在迷茫中为自己指路的人——如果没有前辈在身后推动，她走不到今天。她仍谦虚、仍努力，却能明确说出：有前辈支持的话，一定能成为顶级偶像。【钩子：引导我的光、清夏并肩、歌声改变他人、顶级偶像的决心】"
    },
    "紫云清夏": {
      0: "星探时清夏用「没干劲」「想偷懒」推开制作人，却把对方引向拼命跑步的莉莉娅；制作人却点名要她本人担当。她自称嘻嘻哈哈、随时会让制作人失望，仍答应先试试看，并给制作人起昵称「Pっち」。卡拉 OK 里她唱歌充满热情，游戏厅玩到尽兴——轻浮外壳下，其实很喜欢舞台与歌声。【钩子：Pっち称呼、推给莉莉娅却被选中、差不多该失望了吧、唱歌时的热情、试用期的玩笑】",
      20: "一起看 Live 后，清夏突然安静，谈起从小喜欢偶像、与莉莉娅约定一起入学、总有一天两人同台。她却说「我已经放弃了」——自己不像正直努力的莉莉娅，犹豫的人无法向前。制作人没有轻易说别放弃，她嘴上调侃，心却轻了一些。【钩子：莉莉娅的约定、已经放弃了、和我完全不同、心轻了一些、约会玩笑】",
      40: "看着深夜仍苦练的莉莉娅，制作人坚持不会选错人；清夏被戳穿「并没有完全死心」后激烈反抗——维持现状明明更轻松，为什么要被扰乱。她最终接受重新面对内心，并要求制作人负起煽动她的责任。【钩子：别再扰乱我的心、你到底懂我什么、负责到底、和Pっち一起努力】",
      60: "清夏第一次向制作人坦白芭蕾天才往事与膝盖重伤：伤已痊愈，恐惧仍在，跑步跳跃就会心悸。偶像与制作人推了她一把，让她想成为能给别人勇气的人。正式训练舞蹈创伤时她气喘僵住，却愿意分阶段练习；深夜撞见仍记得约定的莉莉娅，两人重新并肩。【钩子：芭蕾与膝伤、告诉Pっち还是第一次、分阶段克服、莉莉娅没忘约定】",
      80: "First Live 前夜，她不再假装毫不害怕，选择带着恐惧再次起舞，并要求制作人守住退路。训练会恐慌僵住，但有 Pっち 在旁边就安心；突发的小型 Live 让她紧张又期待，带着制作人给的护身符上台拼尽全力。【钩子：带着恐惧起舞、Pっち在旁边守着、你会一直看着我吗、突发Live、护身符】",
      100: "First Live 后，清夏在休息日跳了最后一次芭蕾当作告别仪式，只让制作人见证。她承认芭蕾很棒，但现在想成为的是偶像；创伤未必完全消失，但只要制作人在身边就不害怕。两人约好一起变强，背叛就报复。【钩子：芭蕾告别、Pっち最合适、一起变强、今后也请多指教】"
    },
    "有村麻央": {
      0: "星探时麻央把制作人当成可疑人物扭住手臂，护着后辈却露出无需扮演的王子气场。她拒绝成为可爱偶像，坚持帅气王子型梦想；制作人调查过她的童星与歌剧憧憬后，她勉强答应听听条件。沙尘暴里她把伞借给后辈自己淋湿奔跑、公主抱扭伤后辈去医务室——初星学园的小王子，其实一直在保护别人。【钩子：格斗技误会、帅气王子条件、小王子借伞、公主抱后辈、调查过童星】",
      20: "麻央讲起童年歌剧里憧憬的王子明星，童星时代因娇小外表饰演王子；身体成长后胸部发育、身高不长，越来越远离理想形象，童星工作也断了。她仍想站在舞台上，说这是最后的坚持——心不变，身体变了。制作人却问：憧憬的帅气，难道只被外表左右吗？【钩子：歌剧王子憧憬、身体变了心不变、最后的坚持、帅气不只是外表、先成为可爱偶像】",
      40: "制作人提出先以可爱偶像为目标，麻央爆发「够了」——和大家一样要她放弃王子。制作人点破扮演可爱与扮演王子本质相同，她一直在回避真实的自己。她承认笑容僵硬、无法全力投入，却问能否喜欢上现在的自己；制作人承诺帮她做到，走向既可爱又帅气的无可挑剔王子型偶像。【钩子：够了已经够了、扮演可爱与王子没区别、最真实的自己、喜欢上自己、可爱又帅气】",
      60: "休息日一起挑宣传照服装，她尝试裙子后意外开心；换发型时琴音夸她适合可爱风。唱歌不再强行压理想，坦率面对歌曲；制作人揭穿她其实不爱黑咖啡、更爱甜甜的咖啡欧蕾。女仆咖啡厅里她鼓起勇气寻找「自己的风格」，为保护困扰的女仆出手——客人说她又可爱又帅，她终于摸到舞台形象的方向。【钩子：试裙子、琴音帮发型、咖啡欧蕾、女仆咖啡厅、很有你的风格】",
      80: "First Live 前夜她紧张睡不着，坦白曾厌恶无法成为王子的自己、像在海底挣扎；制作人让她接纳原本的自己，也不忘内心憧憬的王子。舞台上 Fluorite 寓意流动与变化——可爱外表、帅气歌声，重叠成她现在的答案。制作人看着她最棒的可爱帅气无敌出道。【钩子：睡不着、海底挣扎、原原本本的我、Fluorite、可爱帅气无敌】",
      100: "First Live 后工作渐忙，休息日她穿自己搭配的衣服邀请制作人看电影。恐怖片里她害怕却拉着制作人的手坚持看完——童年歌剧 top star 隐退做演员曾让她失望，如今却理解对方也能闪闪发光。她感谢制作人，终于能喜欢上自己了。【钩子：一起看电影、恐怖片拉手、歌剧top star、喜欢上自己、请多指教Producer】"
    },
    "姬崎莉波": {
      0: "制作人在走廊拦住三年级吊车尾的姬崎莉波——她惊喜于对方还记得童年夏天一起玩耍的自己，却立刻因年龄与地位改回敬语。她坦白一年级曾以「莉波噗哟」在组合里扮演妹妹偶像、因气质太成熟而零人气被除名，本打算毕业后放弃；制作人却保证要把她培养成 TOP IDOL，并抛出秘技：「请成为我的姐姐。」她害羞接受担当。【钩子：童年重逢、被除名的妹妹偶像、TOP IDOL 宣言、成为姐姐的训练】",
      20: "制作人否定她过去扎双马尾模仿妹妹的错误路线，要求只对制作人贯彻自然姐姐言行——回忆童年后，摸头、做饭、叫起床、系领带等照顾渐渐流露。有村麻央撞见后质疑训练内容，莉波解释「把制作人当真正的弟弟时，真正的自己就显露出来了」；制作人偷听到后感谢她的信任。【钩子：妹妹人设大错特错、自然姐姐训练、麻央旁观、真正的自己】",
      40: "Mini Live 上刻意喊「大家的大姐姐」时笑容僵硬；藤田琴音直说更喜欢她平时的笑容。英雄秀主持与走失儿童事件中，她自然摸头安慰时魅力爆发。制作人过劳发烧，她进房间照顾、喂粥、说「病人可以尽情撒娇」——找回把制作人当弟弟时的姐姐感触，并明白对制作人的感情与对粉丝不同。【钩子：僵硬营业 vs 自然笑容、琴音反馈、走失儿童、制作人病倒、姐姐感触】",
      60: "大舞台登场前她紧张到需要「姐姐开关」——摸制作人的头反而让自己安心。演出后她不小心说出「已经无法将你当作弟弟看待」，休息日购物选饰品像约会；制作人展示「被莉波姐姐治愈了」的观众反馈，两人约定以 H.I.F 启明星为目标，她承诺成为启明星时会传达真正的内心。【钩子：姐姐开关、无法只当弟弟、购物约会、启明星约定、真正的内心】",
      80: "First Live 前夜，她面对大舞台仍会紧张，却已从观众脸上看见应援的光。制作人请她摸自己的头打开姐姐开关，要她「成为来看演出的粉丝们的姐姐」；她带着自然而非营业的姐姐魅力走向舞台，请制作人好好看着自己。【钩子：Live 前夜紧张、姐姐开关、自然魅力、请看着我】",
      100: "First Live 成功后，她确认舞台上的自己拥有无法用演技演出的自然魅力，却也会寂寞地说「你已经不是只属于我一个人的姐姐了」。制作人提议继续姐姐与弟弟的关系、以 H.I.F 启明星为目标训练；她害羞却同意，关系在姐姐称呼与真实心意之间继续深化。【钩子：Live 成功、自然魅力、不只是我的姐姐、启明星目标、继续训练】"
    },
    "雨夜燕": {
      0: "制作人暗中调查这位『学园No.2』——她严管后辈、私下加练、嘴上永远挂着『超越星南』，却拒绝一切制作人邀约。正式登门时她一口回绝；制作人以『你不过是满足于第二名、从没真正赢过星南』激她，她暴怒之下反被勾起野心，撂下『半吊子方案就等着见血』签下担当。此刻她带着No.2的矜持与戒备进入试用期，既想验证制作人本事，又不肯承认自己需要谁。【钩子：签约当天的别扭、被耍还上钩的不甘、对制作人能力的暗中考察】",
      20: "燕认真投入训练，却在制作人调整方案时暴怒——她把『训练量不能输星南』当尊严，被点破『漫无目的、想象不出超越星南后的自己』时陷入自我厌恶。紧接着传来星南要毕业后退出偶像、转做制作人的消息，燕无法接受，解读为『她根本没把我当对手』，决心夺下一等星、阻止星南退圈。【钩子：说不清『赢了之后要成为什么偶像』、对星南退圈的震怒、训练中死要面子进步全归自己】",
      40: "制作人点破她『做不出可爱』的短板，提议把缺陷翻转成『帅气凛然』的武器。燕一面抗拒『过去的偶像人生被否定』，一面被推着尝试陌生形象——苦战参考、出丑、重练。SNS 因帅气方向爆火，她开始轻敌：『那种货色也想超过我？』【钩子：被迫暴露不擅长的一面、嘴硬接受新形象、对一年级后辈的轻视埋下伏笔】",
      60: "H.I.F 选拔，燕轻敌应战却输给一年级的秦谷美铃、跌到第二，连『学园No.2』的实质都没保住。后台无人时她崩溃痛哭；制作人坦白这场较量是自己设的局，目的就是粉碎她『安于第二』的扭曲自尊。燕在痛哭中自省：『我一直在假装追赶，其实早就放弃了』，第一次把怒火与脆弱都交给制作人，要求『你要支撑着我』，真正以星南为对手重新站起。【钩子：失态痛哭、对制作人又恨又依赖、交出信任的瞬间、『低头只看脚下』的自省】",
      80: "星南因制作人让燕来挑战自己而失望离开；夜练中燕讲起与星南青梅竹马的往事，被制作人点破『你其实一直憧憬星南，神化对手才是屡败的原因』。她勉强承认、同意封存憧憬、用平视的眼光面对对手。试镜在即，她第一次体会『绝对不能输』的紧张，把这场舞台当成毕业前最重要的一战——打断制作人的谦虚之前，她还没赢，只是已经站到了必须赢的门口。【钩子：被逼到边缘承认憧憬、毕业前重新相信自己有资格、把制作人认作并肩的人、Live前的孤注一掷】",
      100: "试镜上燕登台战胜星南夺第一——打断制作人的谦虚：『能赢星南，是我们的力量。』胜后制作人特意选了家和食店犒赏。燕承认被那套『策略』打动、感谢制作人改变了她；随后吐露最原始的动机——不是不甘、也不只是憧憬，而是『想让星南从为偶像而生里被解放，意识到她不过是个普通孩子』，可自己最终也被她吸引。她立下新目标：在 H.I.F 再次战胜星南，让她尝到竞争的喜悦，且绝不让星南放弃当偶像。制作人说出『培育顶级偶像』的梦想，燕『理所当然』地应下继续同行——『同行前往，直至顶点。』【钩子：Live后的坦荡感谢与依赖、为自己也为星南而战的双重动机、与制作人共赴顶点的关系落点】"
    },
  };
  const hiroBondRoutes = {
    20: {
      title: "HP1复健计划",
      objective: "让广在免除理论课、休养、想象训练和特殊复健中体验极慢但真实的进步，并把生死边缘的艰难当成幸福。",
      canonAnchor: "免除理论课、休养和想象训练、顶级偶像养成餐和SSD、被囚禁公主、HP1特殊训练、老年复健式伸展、佑芽和千奈加入补习组、比上周更健康、单脚站立十秒、能走路、佑芽按摩痛到惨叫却求之不得。",
      phase1Title: "第一轮选项：制作人如何重排训练方式",
      phase1Setup: "开场写广仍按理论课和加练思路准备努力，却随时可能倒下。制作人必须把她从普通训练里移出来。",
      phase1Options: [
        "替她办理免除理论课，把时间换成休养和想象训练",
        "先确认饮食习惯，再引入顶级偶像养成餐和 SSD",
        "告诉她现在不是加练，而是让身体终于能跟上大脑",
        "把目标降到比上周更健康，让她接受极慢的进步"
      ],
      phase2Title: "第二轮选项：补习组开始后，制作人如何定义进步",
      phase2Setup: "中段必须写教练安排被囚禁公主、HP1、老年复健式伸展，佑芽和千奈加入补习组，广在最基础课题中挣扎。",
      phase2Options: [
        "把单脚站立十秒记录成今天最大的胜利",
        "让佑芽继续按摩，即使广痛到惨叫也确认她本人愿意",
        "告诉千奈不用急着帮她完成，只要陪她走到下一步",
        "承认这对普通人太基础，但对广已经是巨大的舞台准备"
      ],
      resolution: "广接受进步极慢却每一步都很大的训练；她在对人类还为时过早的痛苦里，反而感到自己终于站在有趣的困难中。"
    },
    40: {
      title: "兴趣不是梦想",
      objective: "让广的不安被制作人理解：以偶像为目标本身就是目的，成为偶像只是兴趣，因此痛苦和事与愿违的日子才值得期待。",
      canonAnchor: "傍晚询问我是不是很难懂的学生、梦想早已实现、以偶像为目标就是目的本身、成为偶像只是兴趣、过去什么都太顺利、反选最不擅长的路、因为兴趣才接下她、新鲜痛苦又会事与愿违的日子、交给我一定会非常开心。",
      phase1Title: "第一轮选项：制作人如何回应她难懂的不安",
      phase1Setup: "开场写傍晚广问制作人自己是不是很难懂的学生。她语气轻，却藏着会被抛下的试探。",
      phase1Options: [
        "直接说她不难懂，只是把目标放在了别人不会放的位置",
        "点破她的梦想已经实现：以偶像为目标本身就是目的",
        "问她是不是害怕制作人发现这一点后就不再陪她",
        "承认成为偶像对她来说更像兴趣，而不是普通意义的梦想"
      ],
      phase2Title: "第二轮选项：制作人如何确认接下她的理由",
      phase2Setup: "中段必须写广过去什么都太顺利、无聊透了，才选择最不擅长的偶像道路。她等待制作人给出是否继续的答案。",
      phase2Options: [
        "“我正是因为这是你的兴趣，才接下你的。”",
        "“新鲜、痛苦、又会事与愿违的日子，才适合你期待。”",
        "“你不是为了完成偶像才来这里，而是为了每天都还没完成。”",
        "“我不会因为理解你，就把你一个人留在这条路上。”"
      ],
      resolution: "广确认制作人终于理解她，也不会因为理解而抛下她；她安心接下困难，笑着说交给我，一定会非常开心。"
    },
    60: {
      title: "不稳定才安心",
      objective: "让广在进步后反而面对消沉风险，确认偶像工作永不稳定、事与愿违不会结束，因此这条路仍然让她安心。",
      canonAnchor: "前屈能抓脚踝、能笔直走路、完成五月任务、制作人梦见舞台成功后会消沉、若偶像活动顺利会想起过去一切顺利的日子而失落、偶像工作永不稳定、事与愿违不会结束、从明天起参加正常训练课程、接下来会很艰难别叫苦。",
      phase1Title: "第一轮选项：制作人如何问出成功后的噩梦",
      phase1Setup: "开场写广完成五月任务，前屈能抓脚踝、也能笔直走路。她明明进步了，却在制作人面前轻轻叹气。",
      phase1Options: [
        "直接问她：如果舞台成功，你会不会因此消沉",
        "把梦里她成功后失去兴趣的样子告诉她",
        "指出她害怕的不是失败，而是一切又开始顺利",
        "让她自己说明为什么进步反而让她有些寂寞"
      ],
      phase2Title: "第二轮选项：制作人如何把她送入正常训练",
      phase2Setup: "中段必须让广承认偶像活动若真的顺利，会让她想起过去无聊的顺利日子；但偶像工作永远不稳定，所以她仍选择这里。",
      phase2Options: [
        "“那就从明天起参加正常训练课程。”",
        "“既然你喜欢事与愿违，我会给你不会轻松结束的日程。”",
        "“接下来会很艰难，别叫苦。”",
        "“特殊训练结束了。现在开始，你要在普通偶像的困难里继续走。”"
      ],
      resolution: "广确认不稳定与事与愿违才让她安心；制作人把她从特殊训练送入常规训练，她带着期待接受更艰难的下一阶段。"
    },
    80: {
      title: "第一次不甘心",
      objective: "让广通过观看佑芽的演唱会确认自己喜欢偶像，并在不可能赌局前选择明天登台、不退缩地享受困境。",
      canonAnchor: "第一次现场看佑芽演唱会、朋友闪闪发光、制作人追问甘不甘心、第一次在最喜欢的事上落后而痛苦、我喜欢偶像、明天开演唱会、制作人押上信用和信任、一天后的暖场演出、练习不足会添麻烦、越是困境中越能展现超越实力的表现、好伙伴明天我们一起享受吧。",
      phase1Title: "第一轮选项：制作人如何追问她的不甘心",
      phase1Setup: "开场写广第一次现场看佑芽的演唱会。她说朋友闪闪发光，表情却和平时不同。",
      phase1Options: [
        "问她看见佑芽站在那里，甘不甘心",
        "指出她现在的痛苦，是因为终于在喜欢的事上落后了",
        "让她不要只夸朋友，也看看自己为什么移不开眼",
        "告诉她如果这份难受是真的，就说明偶像已经成了最喜欢的事"
      ],
      phase2Title: "第二轮选项：制作人如何接下明天开演唱会的赌局",
      phase2Setup: "中段必须写广确认我喜欢偶像，并任性要求明天开演唱会。制作人需要把信用和信任押上，安排一天后的暖场演出。",
      phase2Options: [
        "“好。明天开演唱会。”",
        "“我会把自己的信用和对你的信任一起押上去。”",
        "“你练习不足，会给很多人添麻烦。这样也要上吗？”",
        "“越是困境，越要证明你能展现超越实力的表现。”"
      ],
      resolution: "广明白自己练习不足，也会添麻烦，却第一次不退缩地说要享受困境；她把制作人叫作好伙伴，约定明天一起享受。"
    }
  };

  const seinaBondRoutes = {
    20: {
      title: "零成长危机",
      objective: "让星南直面 H.I.F 夺冠后一等星实力零成长的问题，并把不可见能力作为重新前进的新方向。",
      canonAnchor: "首次目标会议、H.I.F夺冠以来实力零成长、三维数值没有变化、偶像能力不止 Dance/Vocal/Visual 三项、不可见能力的新方向、被制作人示范压过时的不甘心、我讨厌你式别扭竞争。",
      phase1Title: "第一轮选项：制作人如何点破零成长",
      phase1Setup: "开场写签约后的首次目标会议。星南以一等星的余裕期待高要求，却停在制作人必须指出她真正问题的时刻。",
      phase1Options: [
        "直接指出她自 H.I.F 夺冠以来实力没有任何成长",
        "要求她把去年和现在的 Vo、Da、Vi 记录摆在同一张表上",
        "问她作为一等星，是否已经习惯用顶点位置掩盖停滞",
        "用制作人的示范压过她一次，让她亲身体会不甘"
      ],
      phase2Title: "第二轮选项：制作人如何提出不可见能力",
      phase2Setup: "中段必须让星南承认三维数值没有变化。她仍优雅，却第一次坦率承认自身极限，停在制作人给出新方向的时刻。",
      phase2Options: [
        "“偶像能力不止 Dance、Vocal、Visual 三项。”",
        "“你没变弱，只是从未训练过不可见的魅力。”",
        "“如果还有希望，就从数值之外重新开始。”",
        "“讨厌我也可以。至少现在你又有了想赢的对象。”"
      ],
      resolution: "星南承认停滞带来的致命危机，却也看到不可见能力的新路；她保留学园第一的余裕，同时以别扭竞争心决定再拼一次。"
    },
    40: {
      title: "完美外壳裂开",
      objective: "通过视频直播、访谈与邀请琴音失败，让星南在全校面前暴露非偶像的笨拙，并开始思考偶像以外的自己。",
      canonAnchor: "视频直播、访谈中意新生藤田琴音、两次错误邀请、成为我的人吧、不合理报酬、制作人示范邀请成功、无剧本排练录像、紧张发抖的会长、完美形象只是一厢情愿的目标。",
      phase1Title: "第一轮选项：制作人如何把她推向直播",
      phase1Setup: "开场写制作人要求星南尝试从未做过的视频直播与访谈。星南保持优雅，却明显不理解这和顶级偶像有什么关系。",
      phase1Options: [
        "要求她直播采访中意的新生藤田琴音",
        "告诉她完美会长以外的反应也可能成为魅力",
        "让她不要准备标准答案，只用真实反应面对镜头",
        "把这次任务定义成训练不可见能力的第一步"
      ],
      phase2Title: "第二轮选项：琴音逃跑后，制作人如何示范",
      phase2Setup: "中段必须写星南两次错误邀请琴音失败，并在正式播出时被无剧本排练录像暴露紧张发抖的样子。",
      phase2Options: [
        "当场示范如何用正常条件邀请琴音，而不是压迫她",
        "不替她遮掩录像，让全校看见会长也会紧张",
        "告诉她那份羞耻不是失败，而是完美外壳终于裂开",
        "指出偶像以外的十王星南，可能才是未被发现的魅力"
      ],
      resolution: "星南羞耻又生气，却承认完美形象只是一厢情愿的目标；她开始理解制作人要挖出的不是破绽，而是偶像以外的自己。"
    },
    60: {
      title: "破坏十王星南",
      objective: "让星南自白完美主义枷锁，并在雨夜燕兴师问罪时公开拒绝回到旧形象，宣言要成为顶级偶像。",
      canonAnchor: "直播后对峙、从小为偶像而生、必须完美、逃避与校外顶尖偶像比较、自认不如她们、胆小鬼配得上学园顶点吗、雨夜燕兴师问罪、拒绝改方向、我要成为顶级偶像、破坏至今建立的十王星南形象。",
      phase1Title: "第一轮选项：制作人如何逼出完美枷锁",
      phase1Setup: "开场写直播后星南与制作人对峙。她生气，却没有离开，停在制作人是否继续追问她真正恐惧的时刻。",
      phase1Options: [
        "追问她为什么一定要作为完美偶像存在",
        "指出她不是才能有限，而是在逃避校外顶尖偶像的比较",
        "用胆小鬼配得上学园顶点吗激她反击",
        "承认她可以生气，但不能再拿后辈当退路"
      ],
      phase2Title: "第二轮选项：雨夜燕要求她回到榜样时，制作人如何支撑",
      phase2Setup: "中段必须让雨夜燕兴师问罪，要求星南回到完美榜样的位置。星南站在旧期待与新方向之间。",
      phase2Options: [
        "让星南自己回答燕，而不是由制作人替她解释",
        "提醒她如果想成为顶级偶像，就不能只维护过去的十王星南",
        "支持她公开说出我要成为顶级偶像",
        "告诉她破坏旧形象不是退路断绝，而是终于开始前进"
      ],
      resolution: "星南拒绝回到完美榜样，首次对追随者公开誓言“我要成为顶级偶像”；她仍因制作人的激将生气，却以信任为前提选择继续。"
    },
    80: {
      title: "飞出学院",
      objective: "让星南接受数值不变与粉丝结构变化的悖论，定义顶级偶像为指路明灯，并邀请制作人陪她进行人生最重要赌局。",
      canonAnchor: "飞出学院的相称舞台、能力值自去年起仍无变化、怕动摇快哭、舞台下笨拙才是变化、请加油、你好可爱、可爱偶像新定位、顶级偶像等于梦想成为偶像的人们的指路明灯、与校外顶级偶像前辈同台、即使实力垫底也要让全世界知道自己是顶级偶像。",
      phase1Title: "第一轮选项：制作人如何回应她的数值不变",
      phase1Setup: "开场写星南主动来找制作人，要一个能够飞出学院的舞台。她坦白能力值仍无变化，动摇到快哭。",
      phase1Options: [
        "指出变化不在数值，而在舞台下暴露出的笨拙",
        "拿出粉丝留言，请她看见请加油和你好可爱",
        "告诉她顶级偶像不是无缺点，而是能让人想跟随",
        "承认这会很危险，但正因为危险才配得上飞出学院"
      ],
      phase2Title: "第二轮选项：她提出赌局时，制作人如何答应",
      phase2Setup: "中段必须写星南接受可爱偶像的新定位，并说出顶级偶像是梦想成为偶像的人们的指路明灯。随后她提出与校外顶级偶像前辈同台。",
      phase2Options: [
        "“我会陪你赌上这一局。”",
        "“即使实力垫底，也要让全世界知道十王星南在这里。”",
        "“你不是逃出学院，而是把学院的一等星带到更远的地方。”",
        "“如果你要成为指路明灯，我就负责把舞台点亮。”"
      ],
      resolution: "星南接受可爱偶像的新定位，并把顶级偶像定义落到指路明灯；她高度信赖制作人，邀请他陪自己进行人生最重要的背水一战。"
    }
  };

  const kotoneBondRoutes = {
    20: {
      title: "不会被放弃",
      objective: "让琴音在训练短板暴露后确认制作人不会撤回担当选择，并开始把制作人的夸奖当作临时支架。",
      canonAnchor: "训练表现差、唱歌短板、不稳定状态、催促制作人说话、确认不会撤回劝诱与不会抛弃、被夸奖后轻易动摇、承认很久没有被这样夸过。",
      phase1Title: "第一轮选项：制作人如何回应训练失败",
      phase1Setup: "开场从一次明显失败的训练开始。琴音用吐槽和可爱姿态撑场，却很快慌张地催促制作人“你倒是说点什么”，停在制作人必须回应她短板的时刻。",
      phase1Options: [
        "直接指出唱歌短板，但同时说明这不是撤回选择的理由",
        "先让她冷静下来，再问她最害怕制作人说什么",
        "从训练记录里找出她做得好的瞬间，证明失败不是全部",
        "告诉她制作人早就知道她不稳定，仍然选择了她"
      ],
      phase2Title: "第二轮选项：面对“会不会抛弃我”时，制作人如何确认",
      phase2Setup: "中段必须让琴音说出或绕着说出“不会撤回劝诱吧”“不会抛弃我吧”的不安。她一边开玩笑，一边紧盯制作人的反应。",
      phase2Options: [
        "“不会。你失败的样子也在我的担当范围内。”",
        "“我选择的不是已经完成的偶像，而是会从这里变强的藤田琴音。”",
        "“害怕就直接问。我会每次都认真回答你。”",
        "“今天可以先靠我的眼光站稳，之后再换成你自己的自信。”"
      ],
      resolution: "琴音被认真夸奖后明显动摇，承认自己很久没有被人这样肯定过；她暂时还不相信自己，却开始愿意相信制作人的眼光。"
    },
    40: {
      title: "从打工到偶像工作",
      objective: "把琴音从廉价打工和赚钱焦虑里拉出来，让她感到制作人的照顾是具体解决问题，而不是空口安慰。",
      canonAnchor: "奖学金和补助申请、减少打工、强制休息、禁止偷偷兼职、收到水果和食物、吐槽制作人像家长、被“报酬不低于目前且能成长的偶像工作”击中、把感谢包装成撒娇玩笑。",
      phase1Title: "第一轮选项：制作人如何介入她的打工生活",
      phase1Setup: "开场写琴音训练后还准备赶去打工，嘴上说自己很能干，实际已经累到无法集中。停在制作人必须决定如何阻止她继续硬撑的时刻。",
      phase1Options: [
        "拿出奖学金和补助申请表，要求她现在一起填完",
        "直接禁止她今天偷偷兼职，先把休息排进日程",
        "把水果和食物递给她，指出她连好好吃饭都在省钱",
        "问她愿不愿意把赚钱欲望转成更高报酬的偶像工作"
      ],
      phase2Title: "第二轮选项：制作人如何让她接受被照顾",
      phase2Setup: "中段必须写出琴音抗拒减少打工，担心少赚一天就会落后。制作人需要给出实际替代方案，而不是只说“别勉强”。",
      phase2Options: [
        "“我会找报酬不低于目前、而且能让你成长的偶像工作。”",
        "“休息不是浪费时间，是为了让你明天还能站在训练室。”",
        "“如果你偷偷兼职，我就把训练计划改成睡眠管理。”",
        "“你可以想赚钱，但不能用把自己弄坏的方式赚钱。”"
      ],
      resolution: "琴音嘴上吐槽制作人像家长，又把感谢包装成撒娇和“制作人是不是超级喜欢我”的玩笑；她第一次感到被照顾是现实层面的支撑。"
    },
    60: {
      title: "可爱也是资本",
      objective: "让琴音重新理解自己的偶像资本：唱功之外，可爱、舞蹈、表情、人际经营、工作态度和观众缘都能成为实力。",
      canonAnchor: "玩偶秀和宿舍打扫等怪工作、抱怨体力活却认真完成、理解体能与评价提升的重要性、经营宿舍学姐和同级生关系、被指出想成为大家都想合作的偶像、把零成本社交视为生存智慧。",
      phase1Title: "第一轮选项：制作人如何解释怪工作的意义",
      phase1Setup: "开场从玩偶秀、宿舍打扫或类似看似不像偶像工作的任务开始。琴音抱怨这是体力活，却还是认真做完，停在制作人解释这份工作价值的时刻。",
      phase1Options: [
        "告诉她体能、表情和观众缘都是舞台实力的一部分",
        "指出她刚才对孩子和同学的反应本身就是偶像资本",
        "把宿舍关系经营写进训练计划，要求她认真维护评价",
        "承认这不是闪亮工作，但它会让更多人想和她合作"
      ],
      phase2Title: "第二轮选项：制作人如何定义她的生存智慧",
      phase2Setup: "中段必须让琴音谈到自己习惯零成本社交、讨好前辈和同级生，因为现实里人脉和评价都很重要。制作人需要把这份生存智慧接回偶像道路。",
      phase2Options: [
        "“你不是只会讨好别人，你是在让别人愿意把机会交给你。”",
        "“可爱不是装饰。对你来说，它可以变成工作能力。”",
        "“想赚钱也没问题，把它变成让观众愿意支持你的理由。”",
        "“你的目标不是唱得最完美，而是成为大家都想合作的偶像。”"
      ],
      resolution: "琴音开始承认可爱、赚钱欲和人际经营都能接入偶像道路；她仍会抱怨辛苦，却第一次把这些现实技巧当成自己的武器。"
    },
    80: {
      title: "初 Live 前的自信",
      objective: "在 First Live 前为琴音搭建自信，让她把对制作人眼光的信任转化成堂堂正正站上舞台的勇气。",
      canonAnchor: "被指出唱歌差、理解 Live 不是只听歌而是传达全部魅力、确认可爱容貌和舞蹈是武器、被认真夸奖后失速脸红、要求请在身边看着我、像现在这样多夸夸我。",
      phase1Title: "第一轮选项：制作人如何处理 Live 前唱歌不安",
      phase1Setup: "开场写 First Live 前的候场或最终确认。琴音因为唱歌短板强烈不安，用夸张玩笑掩饰，停在制作人必须指出 Live 意义的时刻。",
      phase1Options: [
        "承认唱歌是短板，但告诉她 Live 不是只听歌",
        "让她回忆舞蹈、表情和可爱如何吸引观众",
        "直接告诉她：今天要传达的是藤田琴音的全部魅力",
        "把她一路完成的工作和训练一项项数给她听"
      ],
      phase2Title: "第二轮选项：制作人如何把夸奖变成勇气",
      phase2Setup: "中段必须写出琴音被认真夸奖后失速脸红，嘴上想逃开，实际主动要求制作人继续看着她、继续夸奖她。",
      phase2Options: [
        "“我会在这里看着你。你只要把最可爱的自己交给观众。”",
        "“你不是靠完美唱功站上去的，是靠藤田琴音全部的魅力。”",
        "“害羞也可以。把这份被看见的感觉带上舞台。”",
        "“今天之后，你要自己证明我选择你的眼光没错。”"
      ],
      resolution: "琴音把制作人的认可转成勇气，要求制作人在身边看着她、像现在这样多夸夸她；最后以不完全自信却堂堂正正站上舞台。"
    }
  };

  const sakiBondRoutes = {
    20: {
      title: "天才的软肋",
      objective: "让咲季承认成长停滞与怕输本能，并把「正面战胜佑芽」确立为不能逃避的目标。",
      canonAnchor: "自夸神童、练习却陷入停滞、承认运动竞技中因怕输而逃避、偶像是最后孤注一掷、被看穿想赢却害怕成长速度追不上佑芽、确立既然不能逃避就正面战胜的决心。",
      phase1Title: "第一轮选项：制作人如何回应成长停滞",
      phase1Setup: "开场写咲季仍在高强度练习，嘴上维持神童自尊，动作和数值却长时间没有突破。她抱怨训练计划不够狠，停在制作人必须指出真正瓶颈的时刻。",
      phase1Options: [
        "直接告诉她：不是练得不够，是害怕再输所以不敢真正突破",
        "先问她最近有没有在刻意回避和佑芽的正面对比",
        "拿出训练记录，指出她的进步曲线已经平坦很久",
        "问她如果把偶像当成最后孤注一掷，为什么还留着逃跑的余地"
      ],
      phase2Title: "第二轮选项：面对「追不上佑芽」的恐惧时，制作人如何定调",
      phase2Setup: "中段必须让咲季承认自己想赢，却害怕佑芽的成长速度会超过自己。她嘴硬、炸毛，最后仍要求制作人给出能赢的方案。",
      phase2Options: [
        "「既然不能逃避，就把佑芽当成必须正面战胜的对手。」",
        "「你怕的不是输，是输给她。那就承认这一点，然后变强。」",
        "「神童也会卡住。区别只在于，你还要不要继续逃。」",
        "「我能帮你赢，但前提是你先停止假装自己没有害怕。」"
      ],
      resolution: "咲季不再把停滞归咎于外部条件，承认害怕追不上佑芽；她与制作人约定不再逃避，把佑芽正式纳入必须正面战胜的目标。"
    },
    40: {
      title: "谎言与真实",
      objective: "让期末考试输给佑芽后的崩溃，转化成「把姐姐是最强这句谎言变成真实」的共同目标。",
      canonAnchor: "期末考试输给佑芽导致情绪崩溃、童年为了维护谎言被迫不断变强、姐姐自尊与偶像追求撕裂、确认制作人是陪她把谎言变成真实的人。",
      phase1Title: "第一轮选项：制作人如何接住输给佑芽后的崩溃",
      phase1Setup: "开场从期末成绩或阶段性评比结果公布开始。咲季表面维持第一人设，回到训练室后情绪彻底崩溃，停在制作人如何介入的时刻。",
      phase1Options: [
        "不急着安慰，先让她把「为什么会输」说出口",
        "直接点破：她崩溃的不只是成绩，而是姐姐人设裂开",
        "把佑芽的成绩单和她自己的并排放在桌上，要求她正视差距",
        "先陪她安静一会儿，再问她到底在害怕什么"
      ],
      phase2Title: "第二轮选项：面对童年谎言时，制作人如何重新定义胜利",
      phase2Setup: "中段必须写出她童年为了维护「姐姐是最强」而被迫不断变强的真相，以及作为姐姐与作为偶像之间的撕裂。",
      phase2Options: [
        "「你不是要守住谎言，是要把谎言变成真实。」",
        "「佑芽变强不意味着你失败，只意味着你必须成为真正的第一。」",
        "「最强姐姐如果是假的，那就和我一起把它做成真的。」",
        "「偶像追求和姐姐自尊不必撕碎，它们可以是同一场胜利。」"
      ],
      resolution: "咲季放下部分防备，承认自己最害怕的不是输给别人，而是亲手打破「最强姐姐」；她接受制作人是陪她把这层谎言做成真实的人。"
    },
    60: {
      title: "羁绊即武器",
      objective: "通过对抗训练与对佑芽的保姆式辅导，让咲季学会把复杂姐妹羁绊转化为舞台压制力。",
      canonAnchor: "对抗式训练、因为想赢而对佑芽进行保姆式辅导（按摩、做饭、学习）、制作人定义咲季缺少的不是努力而是把羁绊转化为舞台绝对压制力、首场Live前夕的焦虑与颤抖。",
      phase1Title: "第一轮选项：制作人如何看待她对佑芽的「保姆式」照顾",
      phase1Setup: "开场写对抗训练后，咲季一边嘴硬说只是顺便，一边帮佑芽按摩、做饭、陪学习。她否认自己在照顾妹妹，停在制作人必须点破动机的时刻。",
      phase1Options: [
        "直接说：你不是在当姐姐，你是在研究怎么赢她",
        "问她既然这么了解佑芽，为什么还不肯承认自己在害怕",
        "把她的照顾方式写进训练笔记，称为「对手解析」",
        "指出她想赢到连对手的日常节奏都要掌握"
      ],
      phase2Title: "第二轮选项：制作人如何把羁绊定义成舞台武器",
      phase2Setup: "中段必须写出咲季的努力已经到极限，却仍觉得面对飞速成长的佑芽不够。制作人需要重新定义她真正缺少的东西。",
      phase2Options: [
        "「你缺的不是努力，是把这份复杂羁绊变成舞台上的压制力。」",
        "「了解她、照顾她、恨着赢她——这些都可以变成表演。」",
        "「苦行僧式练习不够，你要把妹妹变成你舞台的一部分。」",
        "「First Live 前别只练动作，练怎么把胜负心唱进歌里。」"
      ],
      resolution: "咲季接受羁绊不是弱点而是武器；临近 First Live 前夜，她仍焦虑颤抖，却第一次知道自己要赢的不只是佑芽，而是整个舞台。"
    },
    80: {
      title: "宿敌确立",
      objective: "在 First Live 前夜见证佑芽的实力后，让咲季把「战胜妹妹」升华为「成为无法被复制的顶级偶像」。",
      canonAnchor: "见证佑芽的公开演出或彩排、面对作为偶像佑芽可能更强的事实、拒绝逃避并要求更严苛训练、制作人提出不只是要赢还要成为无法被复制的存在、把战胜妹妹升华为顶级偶像的证明。",
      phase1Title: "第一轮选项：制作人如何回应见证佑芽后的痛苦",
      phase1Setup: "开场写咲季刚看完佑芽的演出或彩排，表面沉默，实际被「妹妹作为偶像可能更强」刺痛。停在制作人必须回应她痛苦与认可的时刻。",
      phase1Options: [
        "先让她承认：佑芽已经不是需要被庇护的妹妹了",
        "问她甘不甘心，但别逼她立刻回答",
        "直接指出她正在把痛苦往更严苛的训练里压",
        "告诉她你看见的不是失败，而是她终于把佑芽当成宿敌"
      ],
      phase2Title: "第二轮选项：制作人如何提出「无法被复制」的目标",
      phase2Setup: "中段必须写出咲季拒绝逃避、主动要求更严苛训练，并需要制作人帮她把私欲升华成偶像证明。",
      phase2Options: [
        "「不只是要赢佑芽，还要成为无法被复制的存在。」",
        "「顶级偶像不是复制妹妹，而是让全世界只认你的胜利方式。」",
        "「把战胜她当成证明，不是当成终点。」",
        "「明天的舞台，不是姐姐守护妹妹，而是宿敌正面对决。」"
      ],
      resolution: "咲季接受佑芽已是顶级对手，拒绝再逃；她把战胜妹妹升华为顶级偶像的证明，带着更严苛的决心走向自己的 First Live。"
    }
  };

  const umeBondRoutes = {
    20: {
      title: "宿敌与姐姐",
      objective: "在咲季强势介入后确立姐妹宿敌关系，并把佑芽「作为偶像在舞台上战胜姐姐」的目标锚定下来。",
      canonAnchor: "咲季冲来考察制作人、过度保护的姐姐、制作人已拜访双亲并拿到运动员格式培养资料、当场击退咲季、既是宿敌也是最棒的姐姐、想作为偶像战胜姐姐成为学园第一。",
      phase1Title: "第一轮选项：制作人如何应对冲来考察的咲季",
      phase1Setup: "开场写咲季突然出现，摆出「学园第一美少女」的架势要考察制作人配不配当佑芽的担当。佑芽夹在中间又骄傲又慌张，停在制作人必须回应这场考察的时刻。",
      phase1Options: [
        "拿出已经拜访双亲、按运动员格式做好的培养资料正面回应",
        "先承认咲季的姐姐立场，再证明自己比谁都了解佑芽",
        "不接考察的挑衅，直接讲佑芽作为前运动员的第一步计划",
        "反问咲季：她是信不过佑芽的眼光，还是信不过妹妹"
      ],
      phase2Title: "第二轮选项：制作人如何定义姐妹这层关系",
      phase2Setup: "中段必须让佑芽说出咲季既是「绝对想赢的宿敌」又是「最棒的姐姐」，她的目标是作为偶像在舞台上战胜姐姐。",
      phase2Options: [
        "「姐姐是你的宿敌，也是你现在最好的参照系。」",
        "「想赢她没问题，但要在舞台上、作为偶像堂堂正正地赢。」",
        "「我不会让你回避和她比，我要帮你真正追上她。」",
        "「把对姐姐的这股劲留住，它会变成你成长最快的燃料。」"
      ],
      resolution: "姐妹宿敌关系被正式承认，佑芽确认目标是作为偶像在舞台上让咲季说出「我输了」，制作人成为陪她实现这件事的人。"
    },
    40: {
      title: "枷锁与突破口",
      objective: "点破佑芽的热情只朝向咲季而非偶像本身，把这份「枷锁」重新定义成需要突破口的成长课题。",
      canonAnchor: "复习梦想=战胜姐姐成为学园第一、前半比后半更重要、若咲季改行也会追随、热情针对咲季而非偶像、热情既是武器也是枷锁、胜利条件是让姐姐说我输了、需要突破口才能爆炸性成长。",
      phase1Title: "第一轮选项：制作人如何点破她的热情指向",
      phase1Setup: "开场从整理现状开始。佑芽干劲爆棚地要「做点什么打败姐姐」，制作人复习她的梦想，发现她的热情几乎全部朝向咲季，停在必须点破这一点的时刻。",
      phase1Options: [
        "直接告诉她：这份热情是针对咲季的，不是对偶像的",
        "问她如果咲季改行别的竞技，她还会不会想当偶像",
        "指出「战胜姐姐」比「成为第一」在她心里更重要",
        "先肯定她的热情很强，再点出它同时是枷锁"
      ],
      phase2Title: "第二轮选项：制作人如何定义突破口",
      phase2Setup: "中段必须让佑芽苦恼「赢了姐姐之后我会变成什么」，并接受自己需要一个突破口。她坦率、不服输，最后仍要制作人给方向。",
      phase2Options: [
        "「你的胜利条件是让姐姐亲口说输，那就朝这个去练。」",
        "「突破口是撞破壁垒后的爆炸性成长，你身上就有。」",
        "「先不急着回答赢了之后，先把眼前这一场认真赢下来。」",
        "「枷锁不用现在砸碎，但你得知道它就套在你身上。」"
      ],
      resolution: "佑芽承认自己的热情长期只盯着姐姐，接受「需要突破口」这一课题；她仍不知道赢了之后要做什么，却愿意先把眼前的比试当成突破口去拼。"
    },
    60: {
      title: "禁止说我输了",
      objective: "纠正佑芽的败北习惯，把「坦率」立成长处，并让她意识到咲季本身就是她的突破口。",
      canonAnchor: "禁止说我输了、败北专家、坦率接受是最大长处、切实努力加咲季鼓励带来急速成长、突破口不只是计划而是咲季、姐姐是宿敌是可信赖的姐姐是指导者是榜样、准备第一次和咲季以外的偶像比试。",
      phase1Title: "第一轮选项：制作人如何纠正她的败北习惯",
      phase1Setup: "开场写佑芽又一次输给咲季，却反常地嘴硬「我没有输」。制作人当场宣布从今天起禁止她说「我输了」，停在必须解释这条规矩的时刻。",
      phase1Options: [
        "告诉她：你从失败里能学的已经学够了，现在要改掉习惯",
        "指出她的嘴硬其实是好事，坦率才是她最大的长处",
        "让她把「我输了」换成「我还没赢」，先改口再改心态",
        "点破她今天的不服输，正是终于开始相信自己的证据"
      ],
      phase2Title: "第二轮选项：制作人如何解释真正的突破口",
      phase2Setup: "中段必须让佑芽感受到自己在急速成长，并让制作人把突破口重新定义成咲季本身——宿敌、姐姐、指导者、榜样。",
      phase2Options: [
        "「你的突破口不只是我的计划，更是咲季这个人。」",
        "「姐姐是宿敌，也是一直在推着你成长的榜样。」",
        "「你正在像咲季一样急速成长，这不是错觉。」",
        "「下一步，去和咲季以外的偶像比一场，看看真正的自己。」"
      ],
      resolution: "佑芽戒掉「我输了」的口头禅，接受坦率是自己的长处；她认可咲季既是宿敌也是突破口，并准备第一次面对姐姐以外的对手。"
    },
    80: {
      title: "对等对手的恐惧",
      objective: "在 First Live 前夜让佑芽第一次直面「可能赢」带来的兴奋与恐惧，并说出想作为偶像战胜姐姐的真心。",
      canonAnchor: "First Live/选拔试验前夜、第一次觉得能赢姐姐、流鼻血与颤抖、和对等对手战斗原来这么害怕、输了就什么都完了、终于能回答想作为偶像赢过姐姐成为世界第一、赢了之后赢了再想。",
      phase1Title: "第一轮选项：制作人如何处理登台前的颤抖",
      phase1Setup: "开场写 First Live 前夜，佑芽因为过度兴奋流鼻血、浑身颤抖。她第一次觉得「这次或许真的能赢姐姐」，停在制作人必须回应她这份颤抖的时刻。",
      phase1Options: [
        "先冷静地帮她处理鼻血和状态，再让她说出在怕什么",
        "告诉她：和对等的对手战斗会害怕，是因为你终于够强了",
        "不否定她的恐惧，只确认她现在状态非常好",
        "让她把「输了就完了」的念头，换成「今天要赢给我看」"
      ],
      phase2Title: "第二轮选项：制作人如何接住她的真心",
      phase2Setup: "中段必须让佑芽终于回答当初那个问题——她想作为偶像赢过姐姐、成为世界第一，赢了之后的事赢了再想。",
      phase2Options: [
        "「想作为偶像赢过姐姐——这个答案，已经和以前不一样了。」",
        "「赢了之后要做什么，等你赢了再一起想。」",
        "「把长年积累的心情化成歌，今天狠狠打败姐姐。」",
        "「你不是在小看姐姐，你是终于敢和她对等地站上台。」"
      ],
      resolution: "佑芽接受兴奋与恐惧同时存在，说出想作为偶像战胜姐姐、成为世界第一的真心；她带着颤抖却坚定的决心，走向与咲季对等的第一场舞台。"
    }
  };

  const liljaBondRoutes = {
    20: {
      title: "零基础的安心",
      objective: "让莉莉娅在聚焦声乐的训练里看见微小进步，并在被质疑选中时把制作人的相信内化成动力。",
      canonAnchor: "歌舞零基础、先集中声乐训练、盲目加练无效、对比录像看见成长、表情僵硬、同学质疑为什么选莉莉娅、制作人宣誓相信她能成为顶级偶像、被前辈相信。",
      phase1Title: "第一轮选项：制作人如何安排她的第一步训练",
      phase1Setup: "开场写莉莉娅什么都想练、却越练越乱。她礼貌地说「我什么都愿意做」，停在制作人必须决定先聚焦哪一项的时刻。",
      phase1Options: [
        "先只练声乐，把其他项目暂时从日程里拿掉",
        "让她自己说最害怕哪一项，再从那里开始",
        "播放她今天的练习录像，让她先看见问题在哪",
        "直接告诉她：不是练得不够多，是练得太散了"
      ],
      phase2Title: "第二轮选项：面对「为什么选你」的质疑时，制作人如何回应",
      phase2Setup: "中段必须写出同学质疑成绩差的莉莉娅为何被选中，她受伤动摇；制作人需要给出能让她记住的相信。",
      phase2Options: [
        "「我相信葛城莉莉娅能成为顶级偶像，这不是客套。」",
        "「选中你，是因为你已经有踏出那一步的意志。」",
        "「别人怎么看你不重要，重要的是你怎么继续走下去。」",
        "「如果你不相信自己，就先相信我的眼光。」"
      ],
      resolution: "莉莉娅接受先聚焦声乐的方案，并在被质疑后把制作人的相信记在心里；她仍不自信，却愿意为了不辜负前辈再努力一点。"
    },
    40: {
      title: "传达心意",
      objective: "点破她害怕展示自己的问题，并支持她邀请清夏观看，把「想传达给某个人」变成克服怯场的第一步。",
      canonAnchor: "偶像本质是传达心意、害怕展示自己、技术不是本质、拼命努力是优点、邀请清夏来看练习、想让歌声传进清夏心里、克服舞台恐惧的契机。",
      phase1Title: "第一轮选项：制作人如何点破「害怕被看见」",
      phase1Setup: "开场写莉莉娅练习时越来越僵硬，只盯着「怎么表现得更好」，完全没考虑观众。停在制作人必须指出核心问题的时刻。",
      phase1Options: [
        "直接说：你现在害怕的不是唱不好，是被看见",
        "问她憧憬的偶像在台上究竟在传达什么",
        "指出她只顾技术时，观众反而看不见她",
        "把她唯一的长处定义为「拼命想把心意送出去」"
      ],
      phase2Title: "第二轮选项：制作人如何回应她想请清夏来观看",
      phase2Setup: "中段必须让莉莉娅主动提出请最重要的朋友清夏来看练习，想把现在的自己传进清夏心里。",
      phase2Options: [
        "「可以。就把清夏当成你第一个想传达的对象。」",
        "「如果你准备好了，我会安排她作为观众。」",
        "「别把它当成考试，当成你想对清夏说的话。」",
        "「这正是克服怯场最好的契机，我支持你。」"
      ],
      resolution: "莉莉娅接受偶像不是只要技术好，而是要把心意传达出去；她鼓起勇气邀请清夏，并把这当作克服舞台恐惧的起点。"
    },
    60: {
      title: "清夏面前的歌",
      objective: "让莉莉娅在清夏面前完成突破性的歌唱，并确认自己的表演真的能传达到别人心里。",
      canonAnchor: "清夏到场观看、莉莉娅在亲友面前歌唱、清夏称赞太厉害了、第一次有了些许自信、清夏说现在的莉莉娅有些耀眼、想传达到清夏心里、清夏暂未回应约定但莉莉娅仍相信她。",
      phase1Title: "第一轮选项：制作人如何在开唱前稳住她",
      phase1Setup: "开场写清夏到场，莉莉娅紧张到声音发紧。她反复确认「清夏要好好看着」，停在制作人必须帮她进入状态的时刻。",
      phase1Options: [
        "让她先只对清夏一个人唱，不要想整个教室",
        "提醒她今天不是考试，是把现在的自己送给清夏",
        "握住她的肩，让她深呼吸后再开始",
        "直接说：你想传达的心意，清夏一定接得住"
      ],
      phase2Title: "第二轮选项：表演结束后，制作人如何帮她理解这次突破",
      phase2Setup: "中段必须写出清夏被歌声打动、称赞她判若两人；莉莉娅第一次感到「也许我真的在改变」。",
      phase2Options: [
        "「你刚才不是唱对了，是把心情送出去了。」",
        "「清夏看到的，就是你想让她看见的那个你。」",
        "「失误还在，但传达成功了——这就够了。」",
        "「从今天起，你可以相信自己也能打动别人。」"
      ],
      resolution: "莉莉娅在清夏面前完成突破，第一次确信自己的歌声能传达到别人心里；她仍不成熟，却开始相信制作人推着她一步步往前走。"
    },
    80: {
      title: "Live前的恐惧",
      objective: "在 First Live 前夜拦住她的过度训练，让她带着「把感谢唱给观众」的决心而不是透支站上舞台。",
      canonAnchor: "First Live日程确定、觉得太早了、身体发抖、深夜独自加练、制作人制止过度练习、全力以赴就是魅力、相信制作人、登台把全力唱给观众与清夏。",
      phase1Title: "第一轮选项：制作人如何制止她的透支练习",
      phase1Setup: "开场写 First Live 前夜，莉莉娅还在练习室独自加练，喘着气说「还远远不够」。停在制作人必须拦住她的时刻。",
      phase1Options: [
        "直接让她今天停下，明天需要的是状态不是时长",
        "问她是在练歌，还是在用练习逃避害怕",
        "把她从练习室带走，先处理发抖的身体",
        "告诉她：过度努力不会变成舞台，只会变成伤病"
      ],
      phase2Title: "第二轮选项：制作人如何把恐惧转成登台决心",
      phase2Setup: "中段必须写出她害怕辜负前辈与观众，却愿意把「全力展现现在的自己」当作对观众的回应。",
      phase2Options: [
        "「明天不是证明你完美，是把感谢唱给支持你的人。」",
        "「观众想看的，是你拼命努力的那个你。」",
        "「相信我这个制作人，也相信你已经走到这里。」",
        "「有失误也没关系，把心意唱出去就是胜利。」"
      ],
      resolution: "莉莉娅接受休息也是计划的一部分，停止透支；她带着颤抖却坚定的决心，准备在 First Live 把现在的自己唱给观众与清夏。"
    }
  };

  const sumikaBondRoutes = {
    20: {
      title: "已经放弃了",
      objective: "让清夏在 Live 后的坦白里承认与莉莉娅的约定仍在心里，却用「已经放弃了」掩饰不甘。",
      canonAnchor: "一起看学园Live、想起入学前憧憬、与莉莉娅约定一起入学一起登台、已经放弃了、不像莉莉娅那样正直努力、犹豫无法向前、心好像轻了一些。",
      phase1Title: "第一轮选项：制作人如何接住她突然阴沉的坦白",
      phase1Setup: "开场写 Live 结束后清夏从兴奋突然安静，说起和莉莉娅的约定，却说梦想对自己已经不可能。停在制作人必须回应的时刻。",
      phase1Options: [
        "不急着反驳，先请她把「已经放弃了」的原因说完",
        "直接问：如果真的放弃了，为什么还会看 Live 看到哭",
        "承认她和莉莉娅不一样，但不等于她不能有自己的路",
        "告诉她你想听的不是漂亮答案，是她真实的想法"
      ],
      phase2Title: "第二轮选项：面对「我做不到」时，制作人如何定调",
      phase2Setup: "中段必须写出她自嘲不像莉莉娅、玩的时候对方却在练；她说自己不行，却又感谢制作人愿意听。",
      phase2Options: [
        "「有所犹豫不是坏事，但别把它当成放弃的借口。」",
        "「你不需要变成莉莉娅，只需要承认约定还在心里。」",
        "「我不会因为这点就让你别放弃——也不会逼你现在就答应。」",
        "「今天先把心放轻一点，改天再继续谈。」"
      ],
      resolution: "清夏没有立刻答应重新开始，却承认说出来后心轻了一些；她与制作人的距离拉近，但仍用玩笑把认真藏起来。"
    },
    40: {
      title: "负责到底",
      objective: "戳穿她并没有完全死心，让她在争吵后重新决定与制作人一起努力，并要求对方负起责任。",
      canonAnchor: "看着莉莉娅深夜苦练、制作人坚持选中清夏、并没有完全死心、别再扰乱我的心、维持现状更轻松、既然你煽动我就负责到底、和Pっち一起努力。",
      phase1Title: "第一轮选项：制作人如何回应「你为什么不选莉莉娅」",
      phase1Setup: "开场写清夏看着拼命练习的莉莉娅，再次劝制作人改选朋友。她嘴硬说本以为制作人很快就会放弃，停在制作人必须正面回应的时刻。",
      phase1Options: [
        "「我要制作的偶像早就决定了，就是你。」",
        "「莉莉娅很努力，但这不意味着你不如她。」",
        "「你一直在做基础训练，我都知道。」",
        "「你并不是真的对偶像没有留恋。」"
      ],
      phase2Title: "第二轮选项：被她质问「懂我什么」后，制作人如何承诺",
      phase2Setup: "中段必须写出她生气、说维持现状更轻松，却被逼到说出「那就做给你看」并要求制作人负责到底。",
      phase2Options: [
        "「我会负责到底。中途放弃的事我不会做。」",
        "「你煽动我的责任，我会用之后的每一天来还。」",
        "「既然你决定面对，我就做你背后的推手。」",
        "「你可以生气，但别再用没干劲把自己关回去。」"
      ],
      resolution: "清夏接受重新与制作人一起努力，嘴硬要求对方负责到底；她仍烦躁，却不再假装已经彻底死心。"
    },
    60: {
      title: "芭蕾的伤口",
      objective: "让清夏坦白膝伤与芭蕾恐惧，并在分阶段舞蹈训练中开始正视创伤，同时与仍记得约定的莉莉娅重逢。",
      canonAnchor: "芭蕾天才往事、膝盖重伤、伤愈但恐惧仍在、告诉Pっち还是第一次、偶像推了她一把、舞蹈训练气喘僵住、分阶段练习、深夜遇见苦练的莉莉娅、约定没忘。",
      phase1Title: "第一轮选项：制作人如何打开芭蕾创伤话题",
      phase1Setup: "开场写清夏在道歉与感谢后，终于提起自己曾跳芭蕾、因膝伤放弃。她嘴硬否认是努力家，停在制作人如何接住伤口的时刻。",
      phase1Options: [
        "先确认伤势早已痊愈，再问她害怕的是什么",
        "直接问：既然伤好了，为什么跑步跳跃还会心悸",
        "告诉她你知道她很有名，但更想知道她为什么逃避",
        "把话题拉回偶像：是什么让她想重新认真起来"
      ],
      phase2Title: "第二轮选项：训练触发恐慌时，制作人如何调整",
      phase2Setup: "中段必须写出舞蹈或跳跃让她气喘僵住，制作人提出分阶段练习、身心优先；夜里撞见仍记得约定的莉莉娅。",
      phase2Options: [
        "「先停。我们改成分阶段，不硬闯。」",
        "「害怕出现就立刻说，这不是软弱。」",
        "「莉莉娅也没忘约定，你们都在往前走。」",
        "「今天到这里。明天从更小的动作开始。」"
      ],
      resolution: "清夏第一次把芭蕾伤口说给制作人听，接受分阶段训练；她与莉莉娅重新确认约定，决定不再独自逃避。"
    },
    80: {
      title: "带着恐惧起舞",
      objective: "在 First Live 前夜让她选择带着恐惧登台，并确认制作人会在旁边守住退路。",
      canonAnchor: "First Live前夜、不再假装不怕、带着恐惧起舞、Pっち在旁边守着、你会一直看着我吗、突发Live紧张又期待、护身符、拼尽全力。",
      phase1Title: "第一轮选项：制作人如何回应她「停下来就会变回没干劲的自己」",
      phase1Setup: "开场写 First Live 前夜训练，清夏紧张到不肯休息，害怕一停就会缩回懒散外壳。停在制作人必须决定推还是拦的时刻。",
      phase1Options: [
        "陪她再练一轮，但约定感到心悸就立刻停",
        "直接问：你想证明的是不怕，还是敢带着怕上台",
        "告诉她害怕正好说明她在认真面对",
        "让她休息十分钟，再决定要不要继续"
      ],
      phase2Title: "第二轮选项：登台前，制作人如何给她安心",
      phase2Setup: "中段必须写出突发或临近的 Live 让她紧张又期待，她问制作人会不会一直看着自己。",
      phase2Options: [
        "「我会一直在看着你。去吧。」",
        "「带着护身符上台，把恐惧留在后台。」",
        "「不用保证完美，只要把你努力过的自己送出去。」",
        "「你比任何人都闪耀，我相信你。」"
      ],
      resolution: "清夏接受带着恐惧登台，把制作人的陪伴当成安心来源；她带着护身符与决心走上 First Live。"
    }
  };

  const maoBondRoutes = {
    20: {
      title: "最后的坚持",
      objective: "让麻央讲完王子憧憬与身体成长后的落差，并在制作人提出「先成为可爱偶像」时守住她最后的坚持。",
      canonAnchor: "歌剧王子憧憬、童星饰演王子、身体像女孩子、胸部发育身高不长、童星工作没了、心不变身体变、最后的坚持、帅气不只是外表、先成为可爱偶像。",
      phase1Title: "第一轮选项：制作人如何回应「我想成为帅气王子」",
      phase1Setup: "开场写麻央讲起童年歌剧与童星王子角色，却说成长后的自己已不再是王子。她强调心不变、装扮是最后坚持，停在制作人必须回应的时刻。",
      phase1Options: [
        "「憧憬的帅气，难道只是被外表左右的东西吗？」",
        "先承认她童星时代很耀眼，再问她痛苦来自哪里",
        "「身体变了，但你保护后辈时的样子一直很帅。」",
        "不急着否定坚持，先请她把「最后的坚持」说完整"
      ],
      phase2Title: "第二轮选项：面对她震惊于可爱偶像计划时，制作人如何定调",
      phase2Setup: "中段必须写出制作人提出先以可爱偶像为目标，麻央震惊反抗；制作人需要解释这不是放弃王子。",
      phase2Options: [
        "「这不是放弃王子，是让你先接纳现在的自己。」",
        "「可爱是事实，帅气是你的内核——两者都要。」",
        "「我会全力帮你成为理想中的王子，但第一步是正视可爱。」",
        "「先别急着拒绝，听听完整计划再决定信不信我。」"
      ],
      resolution: "麻央没有完全接受可爱路线，却被制作人不同于以往成年人的态度触动；她愿意继续听下去，仍警惕会不会又被改成普通可爱偶像。"
    },
    40: {
      title: "喜欢上自己",
      objective: "在她爆发「够了」之后，让她承认一直在扮演理想形象，并愿意尝试喜欢上真实的自己。",
      canonAnchor: "够了已经够了、和大家一样、扮演可爱与扮演王子没区别、本来就很可爱、回避真实的自己、笑容僵硬、喜欢上自己、可爱又帅气无可挑剔王子型偶像。",
      phase1Title: "第一轮选项：制作人如何接住她的爆发",
      phase1Setup: "开场写麻央以为制作人也要她放弃王子、像所有人一样逼她可爱。她喊「够了」，停在制作人必须正面回应的时刻。",
      phase1Options: [
        "「扮演可爱的偶像，和扮演王子本质上没有区别。」",
        "「你不需要刻意可爱——你本来就已经很可爱了。」",
        "「我想看的是舞台上最真实的你，不是演技。」",
        "先让她把气发泄完，再一字一句解释自己的意思"
      ],
      phase2Title: "第二轮选项：她问「能喜欢上现在的自己吗」时，制作人如何承诺",
      phase2Setup: "中段必须写出她承认强迫扮演、笑容僵硬，却仍不想放弃王子憧憬；她害羞地问能否喜欢上自己。",
      phase2Options: [
        "「可以的。我会让你喜欢上自己。」",
        "「连自己都不喜欢，是无法成为偶像的。」",
        "「可爱和帅气组合起来，你就是无可挑剔的王子型偶像。」",
        "「不用马上做到，但从今天开始试着停止扮演。」"
      ],
      resolution: "麻央接受尝试喜欢真实的自己，重新拜托制作人；她仍害羞，却愿意走向既可爱又帅气的王子型偶像。"
    },
    60: {
      title: "我自己的风格",
      objective: "在换装、发型与女仆咖啡厅的经历里，让她找到不属于「扮演王子」的、只属于自己的舞台风格。",
      canonAnchor: "宣传照选服装、试裙子意外开心、换发型琴音帮忙、坦诚唱歌、黑咖啡其实是咖啡欧蕾、女仆咖啡厅找灵感、保护女仆、又可爱又帅、很有你的风格。",
      phase1Title: "第一轮选项：制作人如何帮她打开「可爱」尝试",
      phase1Setup: "开场写一起挑服装或发型，麻央紧张害羞、怕被当成普通女孩子；琴音或旁人夸她适合可爱风，停在制作人如何推她一把的时刻。",
      phase1Options: [
        "「即使不再扮演王子，真正的你也不会消失。」",
        "让她先试穿一件，不喜欢可以随时换回来",
        "「可爱是外表，帅气是你保护别人时的本能。」",
        "把决定权交给她：今天只试一件，不勉强"
      ],
      phase2Title: "第二轮选项：女仆咖啡厅事件后，制作人如何点破她的风格",
      phase2Setup: "中段必须写出她为保护女仆出手、客人说她可爱又帅；制作人指出那不是演技，是她自己的风格。",
      phase2Options: [
        "「刚才保护她的你，就是最有你风格的样子。」",
        "「可爱和帅气同时出现的那一刻，就是答案。」",
        "「舞台服装不用模仿王子，用你今天找到的感觉。」",
        "「你的风格是：让人安心，又让人憧憬。」"
      ],
      resolution: "麻央摸到属于自己的风格方向，愿意主动思考舞台服装与形象；她仍害羞，却不再只依赖王子人设。"
    },
    80: {
      title: "原原本本的我",
      objective: "在 First Live 前夜让她接纳原本的自己与内心王子憧憬重叠，带着可爱与帅气登台。",
      canonAnchor: "Live前夜睡不着、不喜欢无法成为王子的自己、海底挣扎、属于自己的风格、接纳原原本本的我、不忘憧憬的王子、Fluorite、可爱帅气无敌出道、请看着我Producer。",
      phase1Title: "第一轮选项：制作人如何回应深夜的坦白",
      phase1Setup: "开场写 First Live 前夜麻央睡不着打来电话，坦白曾厌恶变化的自己、像在海底挣扎。停在制作人必须接住的时刻。",
      phase1Options: [
        "「接纳现在的你，也不忘你憧憬的王子。」",
        "「你真正的魅力是高洁的内心，这才是我想培育的。」",
        "「明天的舞台，让大家看见重叠后的答案。」",
        "先陪她聊到天亮前，不急着给结论"
      ],
      phase2Title: "第二轮选项：登台前，制作人如何给她信心",
      phase2Setup: "中段必须写出她问舞台服装是否合适、可爱与帅气重叠成现在的答案；她请制作人看着自己。",
      phase2Options: [
        "「你很可爱，也很帅气——去吧，让大家看见。」",
        "「Fluorite 是流动与变化，今天的你就是答案。」",
        "「相信我，你的帅气一定会传达到观众心里。」",
        "「最棒的可爱帅气无敌出道——请看着我。」"
      ],
      resolution: "麻央带着接纳后的自己走上 First Live，可爱外表与帅气歌声重叠；她把制作人的注视当成最重要的安心。"
    }
  };

  const rinamiBondRoutes = {
    20: {
      title: "成为姐姐",
      objective: "否定过去模仿妹妹的错误路线，让莉波通过对制作人的自然姐姐言行找回真正的自己。",
      canonAnchor: "Love☆Sisters除名、气质太成熟、扎双马尾模仿妹妹大错特错、贯彻成为姐姐、回忆童年、摸头做饭叫起床系领带、把制作人当真正弟弟时真正的自己显露、麻央旁观。",
      phase1Title: "第一轮选项：制作人如何否定妹妹路线",
      phase1Setup: "开场写莉波提起曾扎双马尾、用妹妹说话方式模仿同组成员，制作人却要她成为姐姐。她困惑又害羞，停在制作人必须解释为何过去的努力全错的时刻。",
      phase1Options: [
        "「妹妹系是表演人设，比不上你本身自然流露的姐姐魅力。」",
        "「不是发型问题。是你一直在扮演，而不是做你自己。」",
        "「大多数粉丝比你年长——我想让他们看见真正的姬崎莉波。」",
        "先请她回忆童年照顾自己的样子，再指出那就是答案"
      ],
      phase2Title: "第二轮选项：她第一次尝试「姐姐训练」时，制作人如何引导",
      phase2Setup: "中段必须写出她刻意营业「制作人君♪我是姐姐哦♪」很僵硬；制作人要求更放松、更自然，像童年那样。",
      phase2Options: [
        "「更放松一点。像小时候那样叫我就好。」",
        "「不用演。你照顾后辈时自然而然的样子就是姐姐。」",
        "「一开始只对我这样就好——回忆过去，再试一次。」",
        "「我相信这个训练最能彰显你的魅力，认真来一次。」"
      ],
      resolution: "莉波接受成为姐姐的训练方向，在自然尝试中露出笑容；她明白这是制作人为了她而努力想出的主意，愿意相信并加油。"
    },
    40: {
      title: "真正的姐姐",
      objective: "让莉波从刻意营业的僵硬笑容转向自然照顾时的魅力，并在制作人病倒时找回真正的姐姐感触。",
      canonAnchor: "Mini Live大家的大姐姐、笑容僵硬、琴音更喜欢平时的笑容、英雄秀主持人、走失儿童自然摸头、制作人过劳发烧、进房间照顾喂粥、病人可以尽情撒娇、对制作人的感情与对粉丝不同。",
      phase1Title: "第一轮选项：制作人如何回应琴音「笑容有点僵硬」的反馈",
      phase1Setup: "开场写 Mini Live 后藤田琴音直说莉波在勉强自己、更喜欢她平时的笑容。莉波受伤动摇，停在制作人必须点破问题所在的时刻。",
      phase1Options: [
        "「温柔善良、爱照顾人——这些品质自然流露时才是你最大的魅力。」",
        "「琴音说的对。舞台需要的不是营业，是你本来的样子。」",
        "「你照顾宿舍后辈时从不僵硬——把那个你带上舞台。」",
        "「下次 Live 不要喊口号，先想想你想传达什么。」"
      ],
      phase2Title: "第二轮选项：制作人发烧时，莉波要如何照顾",
      phase2Setup: "中段必须写出制作人过劳发烧倒下，莉波不顾规矩进房间照顾、做粥、喂饭；她找回姐姐感触，并说下次演出要让制作人看见「所喜欢的我」。",
      phase2Options: [
        "「病人可以尽情撒娇——张嘴，啊——。」",
        "「好好休息也是工作。这次换姐姐来照顾你。」",
        "「现在的这个感觉，我会一直记在心里。」",
        "「下次演出，要好好看着我哦。」"
      ],
      resolution: "莉波在照顾制作人时找回自然姐姐魅力，明白对制作人的感情与对粉丝不同；她带着这份感触准备下一场更真实的演出。"
    },
    60: {
      title: "启明星约定",
      objective: "让莉波承认已无法只把制作人当弟弟，并在观众反馈中确立以 H.I.F 启明星为目标、届时传达真正内心的约定。",
      canonAnchor: "大舞台后无法只当弟弟、购物选饰品像约会、被莉波姐姐治愈了、继续姐姐弟弟关系、以H.I.F启明星为目标、成为启明星时传达真正的内心、不小心说漏嘴害羞。",
      phase1Title: "第一轮选项：制作人如何回应「已经无法把你当弟弟」",
      phase1Setup: "开场写莉波不小心说出无法只把制作人当弟弟，又害羞地解释「既然为了粉丝们就不能特殊对待你」。停在制作人必须定调的时刻。",
      phase1Options: [
        "「让我们把姐姐和弟弟的关系，继续下去吧。」",
        "「你现在是大家的姐姐——这和不特殊对待我并不矛盾。」",
        "「以夏天的 H.I.F 启明星为目标，把训练继续下去。」",
        "「你刚才说的话，我当作没听见——先听观众反馈。」"
      ],
      phase2Title: "第二轮选项：她问「成为启明星时能否实现愿望」时，制作人如何承诺",
      phase2Setup: "中段必须写出制作人念观众「被莉波姐姐治愈了」的反馈；她约定成为启明星时会传达真正的内心，并问制作人能否实现她的愿望。",
      phase2Options: [
        "「好的，什么愿望都可以。」",
        "「在你成为启明星的那一刻——我会认真听。」",
        "「从今往后，你依旧是我的姐姐。」",
        "「先以启明星为目标。真正的内心，到那天再说。」"
      ],
      resolution: "莉波接受继续姐姐与弟弟的关系，并与制作人约定以 H.I.F 启明星为目标；她害羞地埋下「传达真正内心」的伏笔。"
    },
    80: {
      title: "姐姐开关",
      objective: "在 First Live 前夜用姐姐开关消除紧张，让她以自然姐姐魅力而非僵硬营业站上舞台。",
      canonAnchor: "大舞台前紧张、请摸我的头、姐姐开关、摸头反而安心、成为粉丝们的姐姐、应援光芒、自然魅力非演技、请看着我制作人君。",
      phase1Title: "第一轮选项：制作人如何打开「姐姐开关」",
      phase1Setup: "开场写 First Live 前夜莉波紧张到声音发紧，正常来说应该由姐姐摸弟弟的头——制作人却请她摸自己的头。停在第一次选择前。",
      phase1Options: [
        "「请摸摸我的头——这是姐姐开关。」",
        "「你是姐姐。用包容力感染来看演出的粉丝吧。」",
        "「回想走失儿童那次——摸头时的笑容就是答案。」",
        "「紧张正好说明你在认真。我会一直看着你。」"
      ],
      phase2Title: "第二轮选项：登台前，制作人如何送她上台",
      phase2Setup: "中段必须写出她通过摸头放下心来，从观众席看见应援的光；她问是否好好成为了大家的大姐姐。",
      phase2Options: [
        "「从观众的表情就能看出来——那就是无法演技的自然魅力。」",
        "「去吧，成为来看演出的粉丝们的姐姐。」",
        "「这都是你发掘出的真正的我——请看着我。」",
        "「你已经不是只属于我一个人的姐姐了——去闪耀吧。」"
      ],
      resolution: "莉波以姐姐开关稳住情绪，带着自然姐姐魅力走上 First Live；她请制作人好好看着自己。"
    }
  };

  const chinaBondRoutes = {
    20: {
      title: "亲自选择",
      objective: "让千奈接受制作人抛开仓本家委托的重新认选，并确立「讨人喜欢」才是她的偶像才能。",
      canonAnchor: "校长委托、报酬太多、倒数第一、不是发现才能、调查后否定走后门、讨人喜欢才是本质、即便没有委托也请让我成为你的制作人、老师请多指教。",
      phase1Title: "第一轮选项：制作人如何回应「只是被委托」",
      phase1Setup: "开场写千奈得知相中原因并非才能而是委托与报酬，崩溃于憧憬落空。她自曝倒数第一却仍想努力，停在制作人必须正面回应的时刻。",
      phase1Options: [
        "「我调查过你。校长认同的是你的才能，不是走后门。」",
        "「歌唱舞蹈还差得远——但偶像的本质是你有多讨人喜欢。」",
        "「仓本家的委托是事实，但我看到的魅力与家世无关。」",
        "先让她把训练表现展示完，再谈是不是只有委托"
      ],
      phase2Title: "第二轮选项：正式认选时，制作人如何请求",
      phase2Setup: "中段必须写出制作人正式请求：即便没有仓本家委托、没有报酬，也请让我成为你的制作人。",
      phase2Options: [
        "「即便没有委托——也请让我成为你的制作人。」",
        "「我想培养的不是仓本千金，是仓本千奈。」",
        "「你有着作为偶像的才能。敢问可否同意？」",
        "「请让我正式担任你的制作人，多多指点和鞭策。」"
      ],
      resolution: "千奈接受抛开委托的认选，相信讨人喜欢也是才能；她称呼制作人为老师，愿意在一无所知的状态下被指点。"
    },
    40: {
      title: "绝不甘休",
      objective: "在基础训练地狱与倒地后，让千奈自己回到训练场，确立绝不轻易放弃的决心。",
      canonAnchor: "与普通新生同样训练、跑步热身才正式开始、训练倒地、手毬说没才能早点放弃、广说手毬很亲切、浑身酸痛仍回来、几次想放弃、憧憬偶像绝不甘休、娇生惯养但绝不认输。",
      phase1Title: "第一轮选项：制作人如何接住训练后倒地的她",
      phase1Setup: "开场写千奈在保健室醒来，手毬刚说完「没才能就早点放弃」。她第一次被说这么过分却无法反驳，停在制作人找到她的时刻。",
      phase1Options: [
        "「预料到会动弹不得——但这是必要的。」",
        "「手毬说的不全对。跟不上不代表没有才能。」",
        "「先处理身体，训练的事明天再说。」",
        "「广说你很亲切。你听见了吗？」"
      ],
      phase2Title: "第二轮选项：制作人问「有想过放弃吗」时，她如何回答",
      phase2Setup: "中段必须写出制作人问是否想过放弃；千奈坦白昨晚烦恼一宿、好几次想退出，最后说绝不甘休、憧憬的偶像比想象更出色。",
      phase2Options: [
        "「我是不会轻易甘休的！毕竟我比任何人都娇生惯养！」",
        "「艰苦训练我不会逃避——为了成为出色的偶像。」",
        "「我想成为的偶像，比我想象中更加美好。」",
        "「请别用那种无语的表情——我是认真的！」"
      ],
      resolution: "千奈承认想过放弃却选择回来；她理解偶像需要艰苦训练，以绝不甘休的决心继续基础课程。"
    },
    60: {
      title: "不负老师",
      objective: "让千奈因外界对制作人的批评而决心成长，并接受首场演唱会作为回应。",
      canonAnchor: "杂志封面万众焦点、外界批评制作人、害老师被说坏话不甘心、想快点提升实力、选拔为时过早、安排首场演唱会、相信老师不会被开除。",
      phase1Title: "第一轮选项：制作人如何回应她「想参加选拔」的请求",
      phase1Setup: "开场写千奈因杂志专栏让制作人遭批评而哭泣，说想快点提升实力让那些说坏话的人刮目相看。她请求参加选拔，停在制作人如何回应的时刻。",
      phase1Options: [
        "「不勉强、不受伤，一步一个脚印——但我会安排你的首场演唱会。」",
        "「批判者瞄准的是制作人。你成长就是最好的回答。」",
        "「选拔为时过早，先用一场 Live 证明你自己。」",
        "「在把你培养出色之前，我没有被开除的打算。」"
      ],
      phase2Title: "第二轮选项：她为何仍相信老师不会被开除",
      phase2Setup: "中段必须写出她担心爷爷不满意、老师会被解雇，制作人再次保证在培养出色之前不会被开除；她选择相信老师。",
      phase2Options: [
        "「既然您说到这份上……老师，我相信您。」",
        "「请放心交给我吧——首场 Live 我会努力完善！」",
        "「那些说老师坏话的人，我会用成长让他们刮目相看。」",
        "「我的第一次 Live，终于到时候了呢！」"
      ],
      resolution: "千奈接受首场演唱会安排，相信制作人不会被开除；她带着回应外界批评的决心准备 First Live。"
    },
    80: {
      title: "绝不让您被开除",
      objective: "在 First Live 前夜让她看穿制作人的觉悟，以不让老师被开除的斗志堂堂正正登台。",
      canonAnchor: "Live前夜没做好心理准备、偷看观众席肚子疼、不能让大家看到不成熟、看穿半年被解雇觉悟、绝不会让老师被开除、用演唱会向爷爷炫耀、请好好看着吧。",
      phase1Title: "第一轮选项：制作人如何回应「完全没有做好心理准备」",
      phase1Setup: "开场写 First Live 前夜，千奈说心理准备完全没做好、偷看观众席就肚子疼。停在制作人必须给她定心的时刻。",
      phase1Options: [
        "「如果能这么想，说明你已经是专业的偶像了。」",
        "「害怕就回想日积月累的训练——今天让我见证那一瞬间。」",
        "「半年从零开始能站上舞台，你已经是优秀的学生。」",
        "「不必拘泥于学园第一，成为出色的偶像就好。」"
      ],
      phase2Title: "第二轮选项：她如何对制作人宣战",
      phase2Setup: "中段必须写出她看穿制作人做好半年后被解雇的觉悟、生气地说不会同意制作人离开，要用演唱会向爷爷炫耀、绝不让老师被开除。",
      phase2Options: [
        "「我绝对不会让您被开除！用这场演唱会证明吧！」",
        "「老师才是我的制作人——这种事我才不会同意！」",
        "「请好好看着吧！我要去成为出色的偶像了！」",
        "「这就是老师作为制作人的实力和成果！」"
      ],
      resolution: "千奈带着不让制作人被开除的斗志走上 First Live；她要把半年稳健培养的成果献给观众与爷爷。"
    }
  };

  const temariBondRoutes = {
    20: {
      title: "相互试探",
      objective: "分析手毬状态下滑的原因，并确立制作人成为新同伴的关系。",
      canonAnchor: "胖了、报复性节食、组合解散、失去燐羽和美铃的支撑、重新说出顶级偶像目标。",
      phase1Title: "第一轮选项：制作人先指出什么问题",
      phase1Setup: "开场要从手毬状态下滑、嘴硬和回避开始，停在制作人必须决定如何切入问题的时刻。",
      phase1Options: [
        "直接指出体重和体力管理出了问题",
        "先问她最近有没有好好吃饭",
        "从训练录像里指出她动作变钝的原因",
        "不谈体重，先说“你现在像是在惩罚自己”"
      ],
      phase2Title: "第二轮选项：组合解散后，制作人如何回应",
      phase2Setup: "中段必须让她说出组合解散、燐羽和美铃不在身边、自己无法被托住的痛点。",
      phase2Options: [
        "“那从今天开始，我来托住你。”",
        "“你不需要回到以前的组合，也能重新成为顶级偶像。”",
        "“燐羽和美铃不在，不代表你只能一个人摔下去。”",
        "“如果你还想成为顶级偶像，就把这个目标重新说出口。”"
      ],
      resolution: "改善饮食计划成立，制作人承诺托住她，手毬重新说出成为顶级偶像的目标。"
    },
    40: {
      title: "核心问题暴露",
      objective: "揭开 SyngUp 旧关系和手毬体力燃尽的根本问题，确立单人偶像训练目标。",
      canonAnchor: "制作人邀请手毬讨论训练计划；手毬看到一整墙自己的照片被吓到。她讲述 SyngUp 时期燐羽和美铃为了配合她压制实力。制作人指出她越集中越能发挥实力，但体力会燃尽。手毬因愧疚退出组合。之后用录像复盘训练，发生拍照误会与课堂看制作人照片被没收手机的日常插曲。",
      phase1Title: "第一轮选项：制作人如何揭开 SyngUp 的真相",
      phase1Setup: "开场从训练计划讨论和照片墙误会切入，停在制作人必须决定如何揭开 SyngUp 真相的时刻。",
      phase1Options: [
        "直接播放训练录像，对比手毬集中前后的体力消耗",
        "先问她为什么认为燐羽和美铃是在“迁就”自己",
        "用数据说明她不是实力不够，而是输出方式太极端",
        "直接指出她退出组合不是因为讨厌两人，而是受不了善意"
      ],
      phase2Title: "第二轮选项：训练目标如何落地",
      phase2Setup: "中段必须写出她对燐羽和美铃的愧疚，以及她不想再被同伴温柔托住的痛苦。",
      phase2Options: [
        "制作人提出从体力分配训练开始，先做到完整唱完一首歌",
        "制作人提出录像复盘，把燃尽的瞬间一帧一帧找出来",
        "制作人要求她不要再把同伴的善意当成羞辱",
        "制作人让她亲口说出：这一次要作为单人偶像唱到最后"
      ],
      resolution: "训练目标定为作为单人偶像唱到最后；随后用录像复盘和拍照误会收束，让严肃剖析转成关系变近的日常。"
    },
    60: {
      title: "关系转折",
      objective: "通过首场 Live 失败确认手毬的能力波动：上限极高，下限也低，受感情影响强。",
      canonAnchor: "手毬举办首场 Live，彩排用力过猛导致正式上场时体力不足，Live 失败。制作人分析她不是没有实力，而是感情越高涨越会燃尽，今后要训练稳定发挥上限。",
      phase1Title: "第一轮选项：制作人如何处理彩排用力过猛",
      phase1Setup: "开场写首场 Live 前的彩排，手毬因紧张和兴奋过度投入，停在制作人是否介入彩排的时刻。",
      phase1Options: [
        "立刻中止彩排，要求她保存体力",
        "记录彩排中爆发最好的一瞬间",
        "不打断她，先观察她为什么停不下来",
        "告诉她真正的舞台不是彩排，必须把热量留到正式演出"
      ],
      phase2Title: "第二轮选项：Live 失败后，制作人如何定义这次失败",
      phase2Setup: "中段必须写出正式演出体力不足、声音或动作失误，Live 失败明确发生。",
      phase2Options: [
        "“失败不是因为你弱，而是因为你的上限太高，身体追不上。”",
        "“你需要学会把感情留到最该燃烧的地方。”",
        "“今天不是终点，是我们第一次看清你的波动幅度。”",
        "“我要训练的不是平均的你，而是能稳定到达最高点的你。”"
      ],
      resolution: "手毬承认自己无法稳定控制状态；制作人确认训练目标不是压低输出，而是让她在正式舞台上充分发挥上限。"
    },
    80: {
      title: "路线后半转折",
      objective: "让美铃重新进入主线，建立下场 Live 赌约，为 100 的成功与和解铺路。",
      canonAnchor: "手毬频繁打电话，表现对制作人的依赖。制作人遇见美铃，美铃担心手毬一个人不行并提出重组 SyngUp。手毬赶到后听见提案。制作人拒绝简单回到过去，提出下场 Live 赌约：如果美铃看完仍担心，就考虑提案；如果手毬证明自己，美铃要和手毬好好谈。",
      phase1Title: "第一轮选项：制作人如何回应手毬的电话依赖",
      phase1Setup: "开场写手毬打电话、抱怨制作人没有立刻接、又小心确认制作人是否生气，停在制作人如何回应她依赖的时刻。",
      phase1Options: [
        "先接电话，告诉她自己正在处理她的负面传闻",
        "故意晚一点回拨，观察她为什么这么不安",
        "直接问她是不是害怕自己生气",
        "让她稍后当面来谈，不在电话里继续绕圈"
      ],
      phase2Title: "第二轮选项：面对美铃的 SyngUp 重组提案",
      phase2Setup: "中段必须写制作人与美铃会谈、手毬赶到、重组 SyngUp 提案被摆到台面上。美铃希望制作人可以当SyngUp的制作人",
      phase2Options: [
        "直接拒绝：手毬不能靠回到过去解决现在的问题",
        "先承认美铃的担心，再指出重组不是唯一答案",
        "要求美铃看完手毬下一场 Live 后再判断",
        "当着手毬的面说明：现在托住她的人会是制作人"
      ],
      resolution: "美铃的担心被承认，手毬没有被简单塞回 SyngUp；制作人以下一场 Live 作为验证，让美铃见证手毬的改变。"
    }
  };

  const misuzuBondRoutes = {
    20: {
      title: "同行者关系",
      objective: "确立制作人作为美铃的同行者，并揭露她对 SyngUp 与手毬的执着怀念。",
      canonAnchor: "阴天训练约定、作为前优等生的过去、对 SyngUp 的执着怀念、决心阻止手毬为了冲动而自我毁灭。",
      phase1Title: "第一轮选项：制作人如何理解她的懒散与过去",
      phase1Setup: "开场从阴天训练约定切入。美铃照常慢悠悠，却没有真的逃避训练；停在制作人必须决定如何触碰她“前优等生”过去的时刻。",
      phase1Options: [
        "直接指出她不是懒散，而是在用自己的方式保存余力",
        "先问她为什么明明讨厌麻烦，却还是准时来到训练室",
        "提起前优等生时期的资料，确认她是不是故意藏起锋芒",
        "不拆穿她，只说今天可以按她的步调慢慢开始"
      ],
      phase2Title: "第二轮选项：面对 SyngUp 与手毬时，制作人如何回应",
      phase2Setup: "中段必须让美铃谈起 SyngUp，谈起她对手毬的担忧：她怀念组合，也害怕手毬又为了冲动把自己毁掉。",
      phase2Options: [
        "“你不是想把她拉回过去，而是不想再看她一个人摔下去。”",
        "“如果你要阻止手毬，那我会陪你一起找不会毁掉她的方法。”",
        "“怀念 SyngUp 不丢人，但你现在也需要自己的道路。”",
        "“那就别只站在旁边担心，秦谷小姐。把你的歌也拿出来。”"
      ],
      resolution: "制作人被确认为能与她同速同行的人；美铃承认自己仍怀念 SyngUp，也承认阻止手毬自毁是她继续成为偶像的重要理由。"
    },
    40: {
      title: "散步即努力",
      objective: "打破对努力的定义，把美铃的散步、观察和慢节奏转化为实力提升的捷径。",
      canonAnchor: "练习室歌唱训练、制作人对她独特努力方式的肯定、为她铺平前路的捷径、确认以自身步调散步超越手毬的战略。",
      phase1Title: "第一轮选项：制作人如何重新定义美铃的努力",
      phase1Setup: "开场从练习室歌唱训练开始。美铃看起来像是在散步、喝茶、偷懒，却准确抓住训练重点；停在制作人要不要承认这种方式也是努力的时刻。",
      phase1Options: [
        "告诉她这不是偷懒，而是她独有的观察和吸收方式",
        "把她刚才散步时记住的节奏变化全部指出来",
        "要求她不用模仿热血训练，把慢节奏继续贯彻到底",
        "故意把训练计划写成散步路线图，让她按路线完成"
      ],
      phase2Title: "第二轮选项：捷径如何变成超越手毬的战略",
      phase2Setup: "中段必须写出制作人为她铺路：不否定努力，而是寻找适合美铃的捷径。美铃开始确认自己可以用自身步调散步般接近甚至超越手毬。",
      phase2Options: [
        "“捷径不是作弊，是为了让你把力气用在最可怕的地方。”",
        "“你不用追着手毬跑。你可以慢慢走到她前面。”",
        "“从今天开始，散步就是你的训练项目之一。”",
        "“如果别人靠燃烧抵达舞台，你就靠不浪费一步抵达。”"
      ],
      resolution: "美铃接受自己的慢节奏不是缺陷；制作人与她确立以散步、观察、精准发力为核心的训练战略，把捷径变成属于她的正攻法。"
    },
    60: {
      title: "独占欲暴露",
      objective: "面对单人偶像挑战，剖析美铃内心真实的执念与独占欲。",
      canonAnchor: "筹备个人演出、否定组合式的依赖唱法、制作人要求融入真情实感、揭露内心深处想让观众离不开自己的恐怖且强烈的独占欲。",
      phase1Title: "第一轮选项：制作人如何拆掉组合式唱法",
      phase1Setup: "开场从个人演出筹备开始。美铃的唱法依然像是在照顾旁边的同伴，漂亮、稳定，却没有把自己放到中心；停在制作人必须指出问题的时刻。",
      phase1Options: [
        "直接否定她依赖组合呼吸的唱法，要求她把自己放在中央",
        "让她关掉伴奏，只用自己的声音填满练习室",
        "指出她不是不会独唱，而是不愿承认自己想被独占地听见",
        "要求她别再替不存在的同伴留位置"
      ],
      phase2Title: "第二轮选项：制作人如何逼近她的真情实感",
      phase2Setup: "中段必须让美铃说出或被迫面对内心深处的欲望：她并不只是温柔照顾别人，也想让观众离不开自己、把目光留在自己身上。",
      phase2Options: [
        "“把那份想让所有人离不开你的心情唱出来。”",
        "“这不是温柔的歌也没关系。让我听见你真正想占有的东西。”",
        "“你害怕的不是一个人唱，而是承认自己想成为唯一。”",
        "“秦谷小姐，今天不用照顾任何人。只要让大家看着你。”"
      ],
      resolution: "美铃承认自己温柔外壳下存在强烈的独占欲；制作人没有否定这份恐怖的真情，而是把它定义为她作为单人偶像最锋利的核心。"
    },
    80: {
      title: "回应式战书",
      objective: "通过观摩手毬演出确认差距与决心，让美铃以自己的歌声向手毬发出回应式挑战。",
      canonAnchor: "作为头号粉丝观摩手毬演出、对不顾一切演出的担忧与胃药关怀、以自身歌声为回击的战书、亲口教训并直面手毬。",
      phase1Title: "第一轮选项：制作人如何陪她看完手毬的演出",
      phase1Setup: "开场写美铃作为头号粉丝观摩手毬演出。她看得很认真，也因为手毬不顾一切的燃烧方式而担心；停在制作人如何回应她复杂表情的时刻。",
      phase1Options: [
        "承认手毬很强，同时指出美铃看见的是自己必须回应的光",
        "把胃药递给她，提醒她担心也可以成为战斗理由",
        "问她现在更想照顾手毬，还是更想赢过手毬",
        "告诉她不用假装冷静，她现在的嫉妒和担心都是真的"
      ],
      phase2Title: "第二轮选项：美铃如何把担忧变成战书",
      phase2Setup: "中段必须推进到美铃决定用自己的歌声回应手毬。她不是回到过去做支撑者，而是亲口教训、直面手毬，并把下一次演出变成战书。",
      phase2Options: [
        "“那就用你的歌告诉她：别再一个人乱来了。”",
        "“如果你是她的头号粉丝，就亲口去教训她。”",
        "“这次不是胃药，也不是搀扶。把你的歌递到她面前。”",
        "“别回到 SyngUp 的位置。站在她对面，让她听见你。”"
      ],
      resolution: "美铃把担忧、嫉妒和怀念整理成回应式挑战；她决定不再只照顾手毬，而是用自己的舞台与歌声直面手毬。"
    }
  };

  const amayaBondRoutes = {
    20: {
      title: "不承认需要谁",
      objective: "让燕在训练方案冲突中意识到自己并没有想象过超越星南后的偶像形态，并把星南退圈消息转化成明确目标。",
      canonAnchor: "训练量不能输星南、漫无目的、想象不出超越星南后的自己、星南要毕业后退出偶像转做制作人、燕震怒并决心夺下一等星阻止星南退圈。",
      phase1Title: "第一轮选项：制作人如何打断她的死撑训练",
      phase1Setup: "开场写燕认真投入训练，擅自加量到接近极限。她把每一次调整都理解成制作人小看自己，停在制作人必须指出训练问题的时刻。",
      phase1Options: [
        "直接指出她只是在堆训练量，不是在设计胜利路线",
        "要求她说出超越星南之后想成为什么样的偶像",
        "把训练记录摊开，证明她把尊严和效率混在一起",
        "激她承认：现在的她只是害怕输给星南才停不下来"
      ],
      phase2Title: "第二轮选项：星南退圈消息传来后，制作人如何回应",
      phase2Setup: "中段必须让星南毕业后可能退出偶像、转做制作人的消息传来。燕无法接受，把它理解成星南从未把自己当对手。",
      phase2Options: [
        "“那就夺下一等星，让她没法装作你不是对手。”",
        "“你愤怒不是因为她要离开，而是因为你还没赢过她。”",
        "“阻止她退圈可以成为目标，但别再只用训练量证明自己。”",
        "“先想清楚赢过星南以后，你要站在哪里。”"
      ],
      resolution: "燕把退圈消息转化成夺下一等星的目标；她仍嘴硬地把进步全归自己，却开始按制作人的方案寻找真正的胜利路线。"
    },
    40: {
      title: "帅气凛然",
      objective: "把燕做不出可爱的短板翻转成帅气凛然的武器，让她在抗拒中尝试陌生形象，并埋下轻敌伏笔。",
      canonAnchor: "做不出可爱、缺陷翻转成帅气凛然、抗拒过去偶像人生被否定、苦战参考、出丑、重练、SNS爆火、轻视一年级后辈。",
      phase1Title: "第一轮选项：制作人如何指出可爱短板",
      phase1Setup: "开场写燕试图完成可爱方向的表现，却因自尊和习惯显得僵硬。她不肯承认失败，停在制作人必须点破短板的时刻。",
      phase1Options: [
        "直接说她现在做不出可爱，但这不等于没有魅力",
        "让她看录像，指出她最自然的瞬间反而是凛然表情",
        "把可爱训练暂停，要求她先尝试帅气方向",
        "承认这会否定她过去的偶像习惯，但不是否定她本人"
      ],
      phase2Title: "第二轮选项：新形象爆火后，制作人如何压住轻敌",
      phase2Setup: "中段必须写燕苦战参考、出丑、重练后，以帅气方向在 SNS 爆火。成功让她重新抬高姿态，并开始轻视一年级后辈。",
      phase2Options: [
        "“爆火只是证明方向有效，不代表你已经赢了。”",
        "“你刚学会一种武器，现在最危险的是以为自己无敌。”",
        "“别用看不起后辈的方式，重演你对星南的不甘。”",
        "“如果你真想成为一等星，就把所有对手都当成会刺伤你的人。”"
      ],
      resolution: "燕嘴硬接受帅气凛然方向，把短板转成新的舞台武器；但她对后辈的轻视也被留下，成为下一节点失利的伏笔。"
    },
    60: {
      title: "跌落第二",
      objective: "让燕在 H.I.F 选拔中输给秦谷美铃，粉碎安于第二的扭曲自尊，并第一次把脆弱和信任交给制作人。",
      canonAnchor: "H.I.F选拔、轻敌应战、输给一年级秦谷美铃、跌到第二、后台崩溃痛哭、制作人坦白设局、粉碎安于第二、假装追赶其实早就放弃、要求你要支撑着我。",
      phase1Title: "第一轮选项：制作人如何把她推向选拔局",
      phase1Setup: "开场写 H.I.F 选拔前，燕因 SNS 爆火而轻敌，尤其看不起一年级的美铃。停在制作人是否提醒她这场较量危险的时刻。",
      phase1Options: [
        "不阻止她轻敌，只记录她怎样把对手看低",
        "提醒她美铃不是随便能踩过去的后辈",
        "告诉她这场选拔会夺走她学园No.2的安全感",
        "让她带着现在的自负上场，亲眼确认自己会被刺伤"
      ],
      phase2Title: "第二轮选项：后台崩溃后，制作人如何承认设局",
      phase2Setup: "中段必须写燕轻敌应战后输给美铃，连学园No.2的实质都没守住。后台无人时她失态痛哭，制作人坦白这场较量是自己设的局。",
      phase2Options: [
        "“是我设的局。我要粉碎你安于第二的自尊。”",
        "“你不是一直追赶星南，你是在用第二名保护自己。”",
        "“恨我也可以。但你现在终于能抬头看她了。”",
        "“哭完就站起来。接下来由我支撑着你。”"
      ],
      resolution: "燕在痛哭中承认自己一直假装追赶、其实早已放弃；她对制作人又恨又依赖，第一次要求“你要支撑着我”，真正以星南为对手重新站起。"
    },
    80: {
      title: "平视一等星",
      objective: "让燕承认自己一直憧憬并神化星南，封存憧憬后以平视的眼光挑战并战胜星南，把制作人认作并肩的人。",
      canonAnchor: "星南因制作人让燕挑战自己而失望离开、夜练回忆青梅竹马、承认憧憬星南、神化对手导致屡败、封存憧憬、试镜紧张、战胜星南、能赢星南是我们的力量。",
      phase1Title: "第一轮选项：夜练中制作人如何逼她承认憧憬",
      phase1Setup: "开场写星南因制作人让燕来挑战自己而失望离开。夜练中，燕讲起与星南青梅竹马的往事，停在制作人是否点破她真正感情的时刻。",
      phase1Options: [
        "直接说她一直憧憬星南，才会把对手神化到无法战胜",
        "问她眼里的星南到底是人，还是永远追不上的光",
        "指出她每次说要超越，其实都在确认星南有多特别",
        "让她把青梅竹马的回忆和舞台上的对手分开"
      ],
      phase2Title: "第二轮选项：登台前，制作人如何让她平视星南",
      phase2Setup: "中段必须推进到试镜前。燕第一次体会绝对不能输的紧张，却也同意暂时封存憧憬，用平视的眼光面对星南。",
      phase2Options: [
        "“今天不要仰望她。看着她的眼睛，把她当成要赢的对手。”",
        "“憧憬可以留到台下，台上只需要雨夜燕。”",
        "“你不是一个人挑战星南。我们的方案会一起站上去。”",
        "“紧张就对了。那说明你终于相信自己有资格赢。”"
      ],
      resolution: "燕登台战胜星南夺第一，并打断制作人的谦虚，确认能赢星南是“我们的力量”；她把制作人认作并肩的人，而不只是利用的策士。"
    }
  };
  const baseState = {
    uiVersion: UI_VERSION,
    gameMode: "classic",
    launchMode: null,
    launchMenuPaused: false,
    sandbox: {
      openingComplete: false,
      inviteComplete: false,
      scoutTargetIdol: null,
      producedIdols: [],
      secondIdolUnlocked: false,
      firstLiveChallenge: defaultSandboxFirstLiveChallenge()
    },
    idol: null,
    day: 1,
    round: 1,
    liveReady: false,
    stamina: 100,
    stress: 0,
    trust: 0,
    Vo: 90,
    Da: 86,
    Vi: 92,
    growth: { Vo: 8, Da: 29.5, Vi: 25.5 },
    threshold: { Vo: 1030, Da: 1510, Vi: 1580 },
    cap: { Vo: 1730, Da: 2210, Vi: 2280 },
    sp: { Vo: false, Da: true, Vi: false },
    affinity: { openingComplete: false, unlocked: [], pending: [], viewed: [] },
    firstLive: { completed: false, success: false, result: null },
    freeMode: {
      unlocked: false,
      active: false,
      entryPromptSeen: false,
      layoutEditBypass: false,
      postLiveDay: 1,
      clockMinutes: FREE_MODE_DAY_START_MINUTES,
      presenceSlotKey: "",
      presence: {},
      relationships: {},
      npcRelationships: {},
      activeLocationId: null,
      facilityKind: null,
      facilityLocationId: null,
      eveningJournal: null,
      atApartment: false,
      apartmentCompanionIdol: "",
      world: {
        macro_phase: "first_live",
        cast_first_live: {},
        kotone_seina_proxy: "pending",
        school_events: [],
        broadcast: { today: null, history: [], pendingRequestId: "", autoFullScript: false },
        buzz: { items: [], buzzDayKey: "", hotTopic: "" },
        storyteller: {
          schemaVersion: 2,
          styleConfig: globalThis.HatsuWorldStorytellerStyles?.defaultStyleConfig?.("live+1") || null,
          styleStreak: globalThis.HatsuWorldStorytellerStyles?.defaultStyleStreak?.() || null,
          observations: [],
          recentFingerprints: [],
          lastObservedDayKey: "",
          plan: null,
          pendingCandidate: null,
          recentCandidates: [],
          receipts: [],
          lastPlanError: "",
          lastCandidateReason: "",
          lastSelectionDiagnostic: null
        },
        director: globalThis.HatsuWorld?.directorState?.defaultDirectorState?.() || null
      }
    },
    appearance: { schemaVersion: 2, equipped: {}, bindings: { producer: { aliases: [] } } },
    activeStoryNode: null,
    log: [],
    boundCharacter: null,
    producer: {
      name: "{{user}}",
      gender: "",
      personality: "",
      style: "",
      settings: ""
    },
    produceOptions: {
      skipLessonTrainingAiStory: false
    },
    lastStory: "请选择行动",
    lastEventTitle: "",
    lastEventResult: "",
    lastEventStory: "",
    lastPrompt: "",
    lastDebug: "尚未结算行动。",
    pendingAiRequestId: "",
    lastRequestId: "",
    harness: {
      schemaVersion: 1,
      persistenceRevision: 0,
      hostSaveSequence: 0,
      sessionEpoch: "",
      activeTurn: null,
      trace: []
    },
    eventMode: "none",
    choiceStep: 0,
    pendingChoiceRewards: [],
    pendingActionContext: null,
    intimacyRoute: null,
    pendingOptionTexts: [],
    pendingOptionMinutes: [],
    selectedChoiceText: "",
    selectedChoiceRating: "",
    bondChoiceRound: 0,
    bondFirstChoiceText: "",
    dailySummary: {
      day: 0,
      intro: "",
      status: "",
      producer: "",
      raw: "",
      complete: false
    },
    phoneChat: {
      activeView: "home",
      activeThreadId: "",
      threads: [],
      messages: {},
      friends: [],
      isAwaitingReply: false,
      pendingRequestId: "",
      retryAvailable: false
    }
  };

  const statLabels = { Vo: "Vocal", Da: "Dance", Vi: "Visual", stamina: "体力", stress: "压力", trust: "信赖" };
  const statShort = { Vo: "Vo.", Da: "Da.", Vi: "Vi." };
  const statIcons = { Vo: "mic", Da: "dance", Vi: "visual" };
  const statColors = { Vo: "#ff4f9a", Da: "#26a9f4", Vi: "#ffca35" };
  const actionIcons = { lesson: "book", training: "dance", rest: "rest", outing: "map", companion: "chat", intimacy: "heart", freechat: "chat", interaction: "star", gift: "heart", bond: "heart", day_summary: "file", phone: "phone", next_day: "calendar", world_map: "map", live: "mic" };
  const promptPanels = { prompt: "tabPrompt", log: "tabLog", debug: "tabDebug" };
  const idolBackgroundStatus = new Map();
  let activePromptTab = "prompt";
  let activeModal = null;
  let activeModalTab = null;
  let selectedIdol = null;
  let hoverTimeout = null;

  const BGM_CONFIG = {
    select: "./assets/bgm/select.mp3",
    lobby: "./assets/bgm/lobby.mp3",
    lesson: "./assets/bgm/lesson.mp3",
    outing: "./assets/bgm/out.mp3",
    talk: "./assets/bgm/talk.mp3",
    rest: "./assets/bgm/rest.mp3",
    live_prep: "./assets/bgm/live_prep.mp3"
  };

  const bgmManager = {
    audioA: null,
    audioB: null,
    currentAudio: null,
    currentKey: null,
    targetKey: null,
    volume: 0.5,
    muted: false,
    initialized: false,
    fadeInterval: null,

    init() {
      if (this.initialized) return;
      this.audioA = new Audio();
      this.audioB = new Audio();
      this.audioA.loop = true;
      this.audioB.loop = true;
      this.currentAudio = this.audioA;
      
      const savedVolume = localStorage.getItem("hatsuProduceBgmVolume");
      if (savedVolume !== null) this.volume = parseFloat(savedVolume);
      
      const savedMuted = localStorage.getItem("hatsuProduceBgmMuted");
      if (savedMuted !== null) this.muted = savedMuted === "true";

      this.initialized = true;
      console.log("[BgmManager] Initialized with volume:", this.volume, "muted:", this.muted);

      if (this.targetKey) {
        this.play(this.targetKey, true);
      }
    },

    play(key, force = false) {
      this.targetKey = key;
      if (!this.initialized) return;
      if (this.currentKey === key && !force) return;

      const src = BGM_CONFIG[key];
      if (!src) {
        this.stop();
        return;
      }

      console.log(`[BgmManager] Transitioning from ${this.currentKey} to ${key}`);
      this.currentKey = key;

      const nextAudio = this.currentAudio === this.audioA ? this.audioB : this.audioA;
      const prevAudio = this.currentAudio;

      nextAudio.src = src;
      nextAudio.volume = 0;
      
      nextAudio.play()
        .then(() => {
          this.currentAudio = nextAudio;
          this.crossfade(prevAudio, nextAudio);
        })
        .catch((err) => {
          console.warn("[BgmManager] Play blocked by browser, waiting for user interaction.", err);
          const startPlay = () => {
            if (this.currentKey === key) {
              nextAudio.play().then(() => {
                this.currentAudio = nextAudio;
                this.crossfade(prevAudio, nextAudio);
              }).catch(e => console.error("[BgmManager] Force play failed:", e));
            }
            window.removeEventListener("click", startPlay);
            window.removeEventListener("keydown", startPlay);
          };
          window.addEventListener("click", startPlay);
          window.addEventListener("keydown", startPlay);
        });
    },

    crossfade(prevAudio, nextAudio) {
      if (this.fadeInterval) clearInterval(this.fadeInterval);

      const targetVolume = this.muted ? 0 : this.volume;
      const step = 0.05;
      const intervalMs = 50;
      
      let prevVol = prevAudio.volume;
      let nextVol = 0;
      
      this.fadeInterval = setInterval(() => {
        let done = true;

        if (prevVol > 0) {
          prevVol = Math.max(0, prevVol - step);
          prevAudio.volume = prevVol;
          done = false;
        } else {
          prevAudio.pause();
        }

        if (nextVol < targetVolume) {
          nextVol = Math.min(targetVolume, nextVol + step);
          nextAudio.volume = nextVol;
          done = false;
        }

        if (done) {
          clearInterval(this.fadeInterval);
          prevAudio.volume = 0;
          nextAudio.volume = targetVolume;
        }
      }, intervalMs);
    },

    stop() {
      this.targetKey = null;
      this.currentKey = null;
      if (this.fadeInterval) clearInterval(this.fadeInterval);
      
      const fadeOut = (audio) => {
        if (!audio || audio.paused) return;
        let vol = audio.volume;
        const interval = setInterval(() => {
          vol = Math.max(0, vol - 0.05);
          audio.volume = vol;
          if (vol <= 0) {
            clearInterval(interval);
            audio.pause();
          }
        }, 50);
      };
      
      fadeOut(this.audioA);
      fadeOut(this.audioB);
    },

    setVolume(vol) {
      this.volume = clamp(vol, 0, 1);
      localStorage.setItem("hatsuProduceBgmVolume", this.volume);
      if (!this.muted && this.currentAudio) {
        this.currentAudio.volume = this.volume;
      }
    },

    setMuted(muted) {
      this.muted = muted;
      localStorage.setItem("hatsuProduceBgmMuted", this.muted);
      if (this.currentAudio) {
        this.currentAudio.volume = this.muted ? 0 : this.volume;
      }
    }
  };

  function isPhoneMusicPlaying() {
    const audio = document.getElementById("phoneMusicAudio");
    return !!(audio && !audio.paused && !audio.ended && audio.currentTime > 0);
  }

  function updateBgm() {
    // 小手机音乐播放器优先：只要在放歌，游戏 BGM 让位（即使切换场景也不会盖上来）。
    if (isPhoneMusicPlaying()) {
      bgmManager.stop();
      return;
    }

    const liveTheater = document.getElementById("liveTheater");
    if (liveTheater && !liveTheater.hidden) {
      bgmManager.stop();
      return;
    }

    const selectionStage = document.getElementById("selectionStage");
    if (selectionStage && !selectionStage.classList.contains("is-hidden")) {
      bgmManager.play("select");
      return;
    }

    const eventOverlay = document.getElementById("eventOverlay");
    if (eventOverlay && !eventOverlay.hidden) {
      const title = document.getElementById("eventTitle").textContent || "";
      if (title.includes("上课") || title.includes("课程") || title.includes("试唱") || title.includes("和声") || title.includes("声乐")) {
        bgmManager.play("lesson");
        return;
      }
      if (title.includes("训练") || title.includes("动作") || title.includes("节奏") || title.includes("重心") || title.includes("舞步")) {
        bgmManager.play("lesson");
        return;
      }
      if (title.includes("休息") || title.includes("体力恢复")) {
        bgmManager.play("rest");
        return;
      }
      if (title.includes("外出")) {
        bgmManager.play("outing");
        return;
      }
      if (title.includes("交流") || title.includes("好感度") || title.includes("同桌") || title.includes("闲聊") || title.includes("对话")) {
        bgmManager.play("talk");
        return;
      }
      if (title.includes("登台前准备") || title.includes("First Live 登台前准备") || (state.activeStoryNode && state.activeStoryNode.type === "firstLivePre")) {
        bgmManager.play("live_prep");
        return;
      }
      bgmManager.play("lobby");
      return;
    }

    const freeChatOverlay = document.getElementById("freeChatOverlay");
    if (freeChatOverlay && !freeChatOverlay.hidden) {
      bgmManager.play("talk");
      return;
    }

    const interactionOverlay = document.getElementById("interactionOverlay");
    if (interactionOverlay && !interactionOverlay.hidden) {
      bgmManager.play("talk");
      return;
    }

    const outingOverlay = document.getElementById("outingOverlay");
    if (outingOverlay && !outingOverlay.hidden) {
      bgmManager.play("outing");
      return;
    }

    const companionOverlay = document.getElementById("companionOverlay");
    if (companionOverlay && !companionOverlay.hidden) {
      bgmManager.play("talk");
      return;
    }

    const intimacyOverlay = document.getElementById("intimacyOverlay");
    if (intimacyOverlay && !intimacyOverlay.hidden) {
      bgmManager.play("talk");
      return;
    }

    if (state.liveReady) {
      bgmManager.play("live_prep");
      return;
    }

    bgmManager.play("lobby");
  }

  function setElementHidden(id, hidden) {
    const el = document.getElementById(id);
    if (el) el.hidden = hidden;
    updateBgm();
  }

  function triggerWipeTransition(callback) {
    const container = document.getElementById("wipeTransition");
    if (!container) {
      callback();
      return;
    }

    let idolName = selectedIdol || state.idol;
    let color = "#ff4f9a";
    if (idolName && idols[idolName]) {
      color = idols[idolName].theme || color;
    }

    container.style.setProperty("--wipe-color", color);
    container.removeAttribute("hidden");
    container.classList.add("animating");

    setTimeout(() => {
      callback();
    }, 600);

    setTimeout(() => {
      container.classList.remove("animating");
      container.setAttribute("hidden", "");
    }, 1300);
  }
  const recentHostPromptDispatches = [];
  let pendingAiRequestId = "";
  let primaryModelChannelOwner = null;
  let primaryModelChannelTimeoutId = 0;
  const primaryModelChannelDebug = {
    lastReleaseReason: "",
    lastReleaseAt: 0,
    lastRejectReason: "",
    lastRejectAt: 0
  };
  let activeInboundPrimaryChannelLeaseId = "";
  const pendingDirectorDigestCandidates = new Map();
  let secondaryChannelOwner = null;
  let secondaryChannelMeta = null;
  let secondaryChannelTimeoutId = 0;
  let aiReplyRetryCount = 0;
  let phoneChatTypingVisible = false;
  let phoneChatDeliveryTimer = null;
  let deferredLivePostReply = null;
  let interactionMode = "specified";
  let selectedInteractionCharacters = new Set();
  let activeStorageKey = STORAGE_KEY;
  let activeHostSaveScope = "";
  let hostStateReady = false;
  let runtimeSessionEpoch = createHarnessId("session");
  const shownHarnessRecoveryKeys = new Set();
  const aiBridgeDebug = {
    lastPromptRequest: null,
    lastReply: null,
    lastAck: null,
    lastOverlay: null,
    lastMessage: "尚未记录 AI 桥接事件",
    promptHistory: [],
    openingDispatches: [],
    hostGeneration: null
  };
  const secondaryApiDebug = {
    events: [],
    lastMessage: "尚未发起次 API 请求"
  };

  function pushSecondaryDebug(entry) {
    entry = entry && typeof entry === "object" ? entry : {};
    const requestId = String(entry.requestId || "");
    const record = {
      at: Date.now(),
      phase: entry.phase || "",
      kind: entry.kind || "",
      requestSuffix: requestId.slice(-6),
      transport: entry.transport || "",
      promptLength: entry.promptLength,
      ok: entry.ok,
      error: entry.error || "",
      textLength: entry.textLength,
      parseOk: entry.parseOk
    };
    secondaryApiDebug.events.unshift(record);
    if (secondaryApiDebug.events.length > 16) {
      secondaryApiDebug.events.length = 16;
    }
    if (entry.phase === "send") {
      secondaryApiDebug.lastMessage = `已发送 ${record.kind || "请求"}（${record.transport || "?"}），等待回复…`;
    } else if (entry.phase === "reply") {
      secondaryApiDebug.lastMessage = record.ok
        ? `收到 ${record.kind || "回复"}：文本 ${record.textLength ?? 0} 字${record.parseOk === false ? "，但解析失败" : record.parseOk === true ? "，解析成功" : ""}`
        : `请求 ${record.kind || ""} 失败：${record.error || "无有效回复"}`;
    }
    if (typeof renderSecondaryApiDebug === "function") renderSecondaryApiDebug();
    return record;
  }
  const portraitWardrobeState = {
    open: false,
    selectedCharacterKey: "producer",
    library: globalThis.HatsuPortraits.normalizeLibrary(null),
    pendingOperation: null,
    selectedAssetId: "",
    status: "idle",
    invalidUrls: new Set(),
    previewUrl: "",
    selectedFile: null,
    selectedMeta: null,
    draftName: "",
    draftProducerAliases: [],
    draftTransform: { ...globalThis.HatsuPortraits.DEFAULT_TRANSFORM },
    timeoutId: 0
  };

  function decodePortraitImageMeta(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const result = { width: image.naturalWidth, height: image.naturalHeight };
        URL.revokeObjectURL(url);
        resolve(result);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("decode_failed"));
      };
      image.src = url;
    });
  }

  function readPortraitFileAsBase64(file, deps = {}) {
    if (typeof deps.readAsDataUrl === "function") {
      return Promise.resolve(deps.readAsDataUrl(file)).then((value) => String(value || "").replace(/^data:[^;]+;base64,/, ""));
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || "").replace(/^data:[^;]+;base64,/, ""));
      reader.onerror = () => reject(reader.error || new Error("file_read_failed"));
      reader.readAsDataURL(file);
    });
  }

  function handlePortraitOperationTimeout(operationId, action) {
    const operation = portraitWardrobeState.pendingOperation;
    if (!operation || operation.operationId !== operationId || operation.awaitingAction !== action) return false;
    portraitWardrobeState.timeoutId = 0;
    portraitWardrobeState.status = "retryable";
    operation.lastError = "timeout";
    if (typeof renderPortraitWardrobe === "function") renderPortraitWardrobe();
    return true;
  }

  function requestPortraitHostOperation(operation, action, payload = {}, deps = {}) {
    if (!operation || portraitWardrobeState.pendingOperation !== operation) return false;
    const isHost = deps.isHost || isSillyTavernHost;
    if (!isHost()) return false;
    const postMessage = deps.postMessage || ((message) => window.parent.postMessage(message, "*"));
    const clearTimer = deps.clearTimer || clearTimeout;
    const setTimer = deps.setTimer || ((callback, delay) => window.setTimeout(callback, delay));
    if (portraitWardrobeState.timeoutId) clearTimer(portraitWardrobeState.timeoutId);
    operation.awaitingAction = action;
    operation.lastError = "";
    portraitWardrobeState.status = "working";
    postMessage({
      source: "hatsuboshi-produce",
      type: "portraitFileOperation",
      operationId: operation.operationId,
      saveScope: operation.saveScope,
      action,
      payload
    });
    portraitWardrobeState.timeoutId = setTimer(
      () => handlePortraitOperationTimeout(operation.operationId, action),
      15000
    );
    if (typeof renderPortraitWardrobe === "function") renderPortraitWardrobe();
    return true;
  }

  async function selectPortraitPreviewFile(file, deps = {}) {
    if (!file) return { ok: false, error: "file_required" };
    const decodeImageMeta = deps.decodeImageMeta || decodePortraitImageMeta;
    const createObjectURL = deps.createObjectURL || ((value) => URL.createObjectURL(value));
    const revokeObjectURL = deps.revokeObjectURL || ((url) => URL.revokeObjectURL(url));
    try {
      const decoded = await decodeImageMeta(file);
      const validation = globalThis.HatsuPortraits.validateDecodedImageMeta({
        type: file.type,
        size: file.size,
        width: decoded.width,
        height: decoded.height
      });
      if (!validation.ok) return validation;
      // A library refresh is background work; a new local preview supersedes it.
      if (portraitWardrobeState.pendingOperation?.kind === "load_library") {
        const clearTimer = deps.clearTimer || clearTimeout;
        if (portraitWardrobeState.timeoutId) clearTimer(portraitWardrobeState.timeoutId);
        portraitWardrobeState.timeoutId = 0;
        portraitWardrobeState.pendingOperation = null;
      }
      if (portraitWardrobeState.previewUrl) revokeObjectURL(portraitWardrobeState.previewUrl);
      portraitWardrobeState.previewUrl = createObjectURL(file);
      portraitWardrobeState.selectedFile = file;
      portraitWardrobeState.selectedMeta = {
        type: String(file.type || ""),
        size: Number(file.size || 0),
        width: Number(decoded.width),
        height: Number(decoded.height)
      };
      portraitWardrobeState.draftName = String(file.name || "").replace(/\.[^.]+$/, "").slice(0, 120);
      portraitWardrobeState.status = "preview";
      if (typeof renderPortraitWardrobe === "function") renderPortraitWardrobe();
      return { ok: true };
    } catch (error) {
      portraitWardrobeState.status = "invalid";
      return { ok: false, error: String(error?.message || error || "decode_failed") };
    }
  }

  function beginPortraitCommit(deps = {}) {
    const isHost = deps.isHost || isSillyTavernHost;
    if (!isHost()) return { ok: false, error: "host_required" };
    if (portraitWardrobeState.pendingOperation) return { ok: false, error: "operation_pending" };
    const file = portraitWardrobeState.selectedFile;
    const meta = portraitWardrobeState.selectedMeta;
    const saveScope = String(activeHostSaveScope || "");
    if (!file || !meta) return { ok: false, error: "file_required" };
    if (!saveScope) return { ok: false, error: "save_scope_required" };
    const operationId = globalThis.HatsuPortraits.createOperationId(
      typeof deps.now === "function" ? deps.now() : Date.now(),
      typeof deps.random === "function" ? deps.random() : Math.random()
    );
    const fileName = globalThis.HatsuPortraits.createUploadFileName(operationId, meta.type);
    const assetId = globalThis.HatsuPortraits.createAssetId(operationId);
    const transform = globalThis.HatsuPortraits.normalizeTransform(portraitWardrobeState.draftTransform);
    const url = `/user/files/${fileName}`;
    const operation = {
      operationId,
      saveScope,
      characterKey: String(portraitWardrobeState.selectedCharacterKey || "producer"),
      transform,
      name: String(portraitWardrobeState.draftName || file.name || "\u81ea\u5b9a\u4e49\u7acb\u7ed8").slice(0, 120),
      file,
      mimeType: meta.type,
      size: meta.size,
      width: meta.width,
      height: meta.height,
      fileName,
      assetId,
      url,
      awaitingAction: "",
      stage: "verify",
      lastError: "",
      asset: null
    };
    operation.asset = {
      assetId,
      operationId,
      characterKey: operation.characterKey,
      name: operation.name,
      url,
      mimeType: operation.mimeType,
      width: operation.width,
      height: operation.height,
      size: operation.size,
      transform,
      archived: false
    };
    portraitWardrobeState.pendingOperation = operation;
    requestPortraitHostOperation(operation, "verify", { url }, deps);
    return { ok: true, operationId };
  }

  async function handlePortraitHostResult(payload, deps = {}) {
    const operation = portraitWardrobeState.pendingOperation;
    if (!operation) return false;
    if (String(payload?.operationId || "") !== operation.operationId) return false;
    if (String(payload?.saveScope || "") !== operation.saveScope) return false;
    if (operation.saveScope !== String(activeHostSaveScope || "")) return false;
    if (String(payload?.action || "") !== operation.awaitingAction) return false;
    const clearTimer = deps.clearTimer || clearTimeout;
    if (portraitWardrobeState.timeoutId) clearTimer(portraitWardrobeState.timeoutId);
    portraitWardrobeState.timeoutId = 0;
    if (payload.ok !== true) {
      operation.lastError = String(payload.error || "host_operation_failed");
      portraitWardrobeState.status = "retryable";
      if (typeof renderPortraitWardrobe === "function") renderPortraitWardrobe();
      return true;
    }

    if (operation.kind === "load_library") {
      if (payload.action === "readLibrary" && operation.stage === "load_read") {
        let library = globalThis.HatsuPortraits.normalizeLibrary(payload.library);
        const missing = Object.values(globalThis.HatsuPortraits.normalizeAppearanceState(state.appearance).equipped)
          .filter((asset) => asset?.source === "user" && !library.assets[asset.assetId]);
        if (missing.length) {
          missing.forEach((asset) => { library = globalThis.HatsuPortraits.mergeLibraryAsset(library, asset); });
          operation.repairedAssetIds = missing.map((asset) => asset.assetId);
          operation.stage = "load_write";
          requestPortraitHostOperation(operation, "writeLibrary", { library }, deps);
        } else {
          portraitWardrobeState.library = library;
          portraitWardrobeState.pendingOperation = null;
          portraitWardrobeState.status = "ready";
          if (typeof renderPortraitWardrobe === "function") renderPortraitWardrobe();
        }
        return true;
      }
      if (payload.action === "writeLibrary" && operation.stage === "load_write") {
        operation.stage = "load_read_back";
        requestPortraitHostOperation(operation, "readLibrary", {}, deps);
        return true;
      }
      if (payload.action === "readLibrary" && operation.stage === "load_read_back") {
        const library = globalThis.HatsuPortraits.normalizeLibrary(payload.library);
        const repaired = operation.repairedAssetIds.every((assetId) => Boolean(library.assets[assetId]));
        if (!repaired) {
          operation.lastError = "library_repair_readback_missing";
          portraitWardrobeState.status = "retryable";
          return true;
        }
        portraitWardrobeState.library = library;
        portraitWardrobeState.pendingOperation = null;
        portraitWardrobeState.status = "ready";
        if (typeof renderPortraitWardrobe === "function") renderPortraitWardrobe();
        return true;
      }
    }

    if (operation.kind === "archive") {
      if (payload.action === "readLibrary" && operation.stage === "archive_read") {
        const latest = globalThis.HatsuPortraits.normalizeLibrary(payload.library);
        if (!latest.assets[operation.assetId]) {
          operation.lastError = "archive_asset_missing";
          portraitWardrobeState.status = "retryable";
          return true;
        }
        const library = globalThis.HatsuPortraits.archiveLibraryAsset(latest, operation.assetId);
        operation.stage = "archive_write";
        requestPortraitHostOperation(operation, "writeLibrary", { library }, deps);
        return true;
      }
      if (payload.action === "writeLibrary" && operation.stage === "archive_write") {
        operation.stage = "archive_read_back";
        requestPortraitHostOperation(operation, "readLibrary", {}, deps);
        return true;
      }
      if (payload.action === "readLibrary" && operation.stage === "archive_read_back") {
        const library = globalThis.HatsuPortraits.normalizeLibrary(payload.library);
        if (library.assets[operation.assetId]?.archived !== true) {
          operation.lastError = "archive_readback_missing";
          portraitWardrobeState.status = "retryable";
          return true;
        }
        portraitWardrobeState.library = library;
        portraitWardrobeState.selectedAssetId = "";
        portraitWardrobeState.pendingOperation = null;
        portraitWardrobeState.status = "ready";
        if (typeof renderPortraitWardrobe === "function") renderPortraitWardrobe();
        return true;
      }
    }

    if (payload.action === "verify") {
      if (payload.exists === true) {
        operation.stage = "merge_library";
        requestPortraitHostOperation(operation, "readLibrary", {}, deps);
      } else {
        const readFile = deps.readFileBase64 || ((file) => readPortraitFileAsBase64(file));
        let encoded;
        try {
          encoded = await readFile(operation.file);
        } catch (error) {
          operation.lastError = String(error?.message || error || "file_read_failed");
          portraitWardrobeState.status = "retryable";
          if (typeof renderPortraitWardrobe === "function") renderPortraitWardrobe();
          return true;
        }
        if (portraitWardrobeState.pendingOperation !== operation || operation.saveScope !== String(activeHostSaveScope || "")) return false;
        operation.stage = "upload";
        requestPortraitHostOperation(operation, "upload", { name: operation.fileName, data: encoded }, deps);
      }
      return true;
    }
    if (payload.action === "upload") {
      if (String(payload.url || "") !== operation.url) {
        operation.lastError = "upload_path_mismatch";
        portraitWardrobeState.status = "retryable";
        return true;
      }
      operation.stage = "merge_library";
      requestPortraitHostOperation(operation, "readLibrary", {}, deps);
      return true;
    }
    if (payload.action === "readLibrary" && operation.stage === "merge_library") {
      const latest = globalThis.HatsuPortraits.normalizeLibrary(payload.library);
      operation.expectedLibrary = globalThis.HatsuPortraits.mergeLibraryAsset(latest, operation.asset);
      operation.stage = "write_library";
      requestPortraitHostOperation(operation, "writeLibrary", { library: operation.expectedLibrary }, deps);
      return true;
    }
    if (payload.action === "writeLibrary" && operation.stage === "write_library") {
      operation.stage = "read_back";
      requestPortraitHostOperation(operation, "readLibrary", {}, deps);
      return true;
    }
    if (payload.action === "readLibrary" && operation.stage === "read_back") {
      const library = globalThis.HatsuPortraits.normalizeLibrary(payload.library);
      const confirmed = library.assets[operation.assetId];
      if (!confirmed || confirmed.url !== operation.url) {
        operation.lastError = "library_readback_missing";
        portraitWardrobeState.status = "retryable";
        return true;
      }
      portraitWardrobeState.library = library;
      equipPortraitReference(confirmed, operation.transform);
      portraitWardrobeState.pendingOperation = null;
      portraitWardrobeState.status = "complete";
      if (typeof renderPortraitWardrobe === "function") renderPortraitWardrobe();
      return true;
    }
    return false;
  }

  function retryPortraitCommit(deps = {}) {
    const operation = portraitWardrobeState.pendingOperation;
    if (!operation || portraitWardrobeState.status !== "retryable") return false;
    operation.stage = "verify";
    return requestPortraitHostOperation(operation, "verify", { url: operation.url }, deps);
  }

  function equipPortraitReference(asset, transform) {
    const reference = {
      ...asset,
      source: "user",
      archived: false,
      transform: globalThis.HatsuPortraits.normalizeTransform(transform || asset?.transform)
    };
    const appearance = globalThis.HatsuPortraits.normalizeAppearanceState(state.appearance);
    appearance.equipped[reference.characterKey] = reference;
    state.appearance = globalThis.HatsuPortraits.normalizeAppearanceState(appearance);
    saveState("portrait.equip");
    return state.appearance.equipped[reference.characterKey];
  }

  function closePortraitWardrobe(deps = {}) {
    if (portraitWardrobeState.pendingOperation && deps.force !== true) return false;
    if (deps.force === true) portraitWardrobeState.pendingOperation = null;
    const revokeObjectURL = deps.revokeObjectURL || ((url) => URL.revokeObjectURL(url));
    const clearTimer = deps.clearTimer || clearTimeout;
    if (portraitWardrobeState.timeoutId) clearTimer(portraitWardrobeState.timeoutId);
    portraitWardrobeState.timeoutId = 0;
    if (portraitWardrobeState.previewUrl) revokeObjectURL(portraitWardrobeState.previewUrl);
    portraitWardrobeState.previewUrl = "";
    portraitWardrobeState.selectedFile = null;
    portraitWardrobeState.selectedMeta = null;
    portraitWardrobeState.open = false;
    portraitWardrobeState.status = "idle";
    return true;
  }

  let state = loadState();

  ensureStateShape({ recoverDirectorAttempt: true });
  if (state.uiVersion !== UI_VERSION || (state.idol && !idols[state.idol])) {
    state = clone(baseState);
    ensureStateShape();
    saveState();
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(activeStorageKey);
      const loaded = saved ? { ...clone(baseState), ...JSON.parse(saved) } : clone(baseState);
      // 不恢复在途请求：pendingAiRequestId 是“本页正在等待某次生成回复”的会话级状态。
      // 页面重载（退出后重进前端）后，之前那次生成不会再向新页面投递回复，若把它恢复为真值，
      // openEventOverlay 会一直走 isLoading 分支——把整段剧情塞进单个对话框且禁用点击，导致卡死。
      loaded.pendingAiRequestId = "";
      pendingAiRequestId = "";
      return loaded;
    } catch {
      return clone(baseState);
    }
  }

  function saveState(reason = "state.save") {
    state.harness = normalizeHarnessState(state.harness, runtimeSessionEpoch);
    state.harness.persistenceRevision += 1;
    const willMirrorToHost = isSillyTavernHost() && hostStateReady && Boolean(activeHostSaveScope);
    if (willMirrorToHost) state.harness.hostSaveSequence += 1;
    debugHarnessEvent("state.save", {
      persistenceRevision: state.harness.persistenceRevision,
      reason
    });
    state.pendingAiRequestId = pendingAiRequestId;
    if (pendingAiRequestId) {
      state.lastRequestId = pendingAiRequestId;
    }
    localStorage.setItem(activeStorageKey, JSON.stringify(state));
    if (willMirrorToHost) requestHostStateSave(state.harness.hostSaveSequence);
  }

  function resolveHostState(remoteState, localState) {
    if (remoteState && typeof remoteState === "object" && !Array.isArray(remoteState)) {
      return { source: "remote", state: remoteState, shouldMigrate: false };
    }
    if (localState?.idol) {
      return { source: "local", state: localState, shouldMigrate: true };
    }
    return { source: "empty", state: null, shouldMigrate: false };
  }

  function storageKeyForScope(scope) {
    const normalized = String(scope || "").trim();
    if (!normalized) return STORAGE_KEY;
    const safe = normalized.replace(/[^a-zA-Z0-9_.:-]+/g, "_").slice(0, 160);
    return `${STORAGE_KEY}:${safe}`;
  }

  function backupStorageKeyForScope(scope = activeStorageKey) {
    return scope === STORAGE_KEY ? SAVE_BACKUP_STORAGE_KEY : `${scope}:backup`;
  }

  function getWardrobeCharacterOptions() {
    const options = [{ characterKey: "producer", label: "\u5236\u4f5c\u4eba", type: "producer" }];
    const assigned = [state.idol, ...(Array.isArray(state.sandbox?.producedIdols) ? state.sandbox.producedIdols : [])];
    const seen = new Set();
    assigned.forEach((name) => {
      const canonical = canonicalIdolName(String(name || ""));
      if (!canonical || seen.has(canonical) || !idols[canonical]) return;
      seen.add(canonical);
      options.push({ characterKey: `idol:${canonical}`, label: canonical, type: "idol" });
    });
    return options;
  }

  function getWardrobeBuiltinPortraitUrl(characterKey) {
    if (characterKey === "producer") return "./assets/novel-standees/producer.png";
    if (characterKey.startsWith("idol:")) return resolveIdolStandeeSrc(characterKey.slice(5));
    return "";
  }

  function getDefaultProducerPortraitAliases() {
    return globalThis.HatsuPortraits.normalizeProducerAliases([
      "制作人", "P", "producer", "producer-san", state.producer?.name
    ]);
  }

  function addProducerPortraitAlias(value) {
    if (portraitWardrobeState.selectedCharacterKey !== "producer") return { ok: false, error: "producer_only" };
    const alias = String(value || "").trim();
    if (!alias) return { ok: false, error: "alias_required" };
    if (alias.length > globalThis.HatsuPortraits.MAX_PRODUCER_ALIAS_LENGTH) return { ok: false, error: "alias_too_long" };
    const key = alias.toLowerCase();
    if (getDefaultProducerPortraitAliases().some((item) => item.toLowerCase() === key)) return { ok: false, error: "default_alias" };
    const canonical = canonicalIdolName(alias);
    if (idols[canonical]) return { ok: false, error: "idol_conflict" };
    const current = globalThis.HatsuPortraits.normalizeProducerAliases(portraitWardrobeState.draftProducerAliases);
    if (current.some((item) => item.toLowerCase() === key)) return { ok: false, error: "duplicate_alias" };
    if (current.length >= globalThis.HatsuPortraits.MAX_PRODUCER_ALIASES) return { ok: false, error: "alias_limit" };
    portraitWardrobeState.draftProducerAliases = [...current, alias];
    renderPortraitWardrobe();
    return { ok: true, alias };
  }

  function removeProducerPortraitAlias(value) {
    const key = String(value || "").trim().toLowerCase();
    const current = globalThis.HatsuPortraits.normalizeProducerAliases(portraitWardrobeState.draftProducerAliases);
    const next = current.filter((alias) => alias.toLowerCase() !== key);
    if (!key || next.length === current.length) return false;
    portraitWardrobeState.draftProducerAliases = next;
    renderPortraitWardrobe();
    return true;
  }

  function saveProducerPortraitAliases() {
    if (portraitWardrobeState.selectedCharacterKey !== "producer") return false;
    const appearance = globalThis.HatsuPortraits.normalizeAppearanceState(state.appearance);
    appearance.bindings.producer.aliases = globalThis.HatsuPortraits.normalizeProducerAliases(portraitWardrobeState.draftProducerAliases);
    state.appearance = appearance;
    saveState("portrait.aliases");
    renderPortraitWardrobe();
    return true;
  }
  function submitProducerPortraitAliasInput() {
    const input = document.getElementById("portraitWardrobeAliasInput");
    if (!input) return { ok: false, error: "input_missing" };
    const result = addProducerPortraitAlias(input.value);
    if (result.ok) {
      input.value = "";
      return result;
    }
    const messages = {
      alias_required: "请输入名称。",
      alias_too_long: "名称不能超过 40 个字符。",
      default_alias: "该名称已经是默认触发名称。",
      idol_conflict: "该名称与已知偶像重名。",
      duplicate_alias: "该名称已经添加。",
      alias_limit: "最多添加 12 个自定义名称。"
    };
    showToast("名称未添加", messages[result.error] || "请检查名称。", "warn");
    return result;
  }
  function requestPortraitLibraryRefresh(deps = {}) {
    if (portraitWardrobeState.pendingOperation) return false;
    const isHost = deps.isHost || isSillyTavernHost;
    if (!isHost() || !activeHostSaveScope) {
      portraitWardrobeState.library = globalThis.HatsuPortraits.normalizeLibrary(null);
      portraitWardrobeState.status = "host_required";
      renderPortraitWardrobe();
      return false;
    }
    const operationId = globalThis.HatsuPortraits.createOperationId();
    const operation = {
      kind: "load_library",
      operationId,
      saveScope: String(activeHostSaveScope),
      stage: "load_read",
      awaitingAction: "",
      repairedAssetIds: [],
      lastError: ""
    };
    portraitWardrobeState.pendingOperation = operation;
    return requestPortraitHostOperation(operation, "readLibrary", {}, deps);
  }

  function openPortraitWardrobe() {
    const options = getWardrobeCharacterOptions();
    if (!options.some((item) => item.characterKey === portraitWardrobeState.selectedCharacterKey)) {
      portraitWardrobeState.selectedCharacterKey = "producer";
    }
    const appearance = globalThis.HatsuPortraits.normalizeAppearanceState(state.appearance);
    const equipped = appearance.equipped[portraitWardrobeState.selectedCharacterKey];
    portraitWardrobeState.draftProducerAliases = [...appearance.bindings.producer.aliases];
    portraitWardrobeState.selectedAssetId = equipped?.assetId || "";
    portraitWardrobeState.draftName = equipped?.name || "";
    portraitWardrobeState.draftTransform = globalThis.HatsuPortraits.normalizeTransform(equipped?.transform);
    portraitWardrobeState.open = true;
    setElementHidden("portraitWardrobeOverlay", false);
    renderPortraitWardrobe();
    requestPortraitLibraryRefresh();
  }

  function requestClosePortraitWardrobe() {
    const pending = portraitWardrobeState.pendingOperation;
    if (pending && !window.confirm("\u6587\u4ef6\u64cd\u4f5c\u4ecd\u5728\u8fdb\u884c\u3002\u5173\u95ed\u540e\u5c06\u5ffd\u7565\u8fd9\u6b21\u64cd\u4f5c\u7684\u540e\u7eed\u56de\u590d\uff0c\u662f\u5426\u7ee7\u7eed\uff1f")) return false;
    closePortraitWardrobe({ force: Boolean(pending) });
    setElementHidden("portraitWardrobeOverlay", true);
    return true;
  }

  function setPortraitWardrobeCharacter(characterKey) {
    if (!getWardrobeCharacterOptions().some((item) => item.characterKey === characterKey)) return false;
    if (portraitWardrobeState.previewUrl) URL.revokeObjectURL(portraitWardrobeState.previewUrl);
    portraitWardrobeState.previewUrl = "";
    portraitWardrobeState.selectedFile = null;
    portraitWardrobeState.selectedMeta = null;
    portraitWardrobeState.selectedCharacterKey = characterKey;
    const appearance = globalThis.HatsuPortraits.normalizeAppearanceState(state.appearance);
    const equipped = appearance.equipped[characterKey];
    portraitWardrobeState.draftProducerAliases = [...appearance.bindings.producer.aliases];
    portraitWardrobeState.selectedAssetId = equipped?.assetId || "";
    portraitWardrobeState.draftName = equipped?.name || "";
    portraitWardrobeState.draftTransform = globalThis.HatsuPortraits.normalizeTransform(equipped?.transform);
    portraitWardrobeState.status = "ready";
    renderPortraitWardrobe();
    return true;
  }

  function selectPortraitLibraryAsset(assetId) {
    const asset = portraitWardrobeState.library.assets[assetId];
    if (!asset || asset.archived || asset.characterKey !== portraitWardrobeState.selectedCharacterKey) return false;
    if (portraitWardrobeState.previewUrl) URL.revokeObjectURL(portraitWardrobeState.previewUrl);
    portraitWardrobeState.previewUrl = "";
    portraitWardrobeState.selectedFile = null;
    portraitWardrobeState.selectedMeta = null;
    portraitWardrobeState.selectedAssetId = assetId;
    portraitWardrobeState.draftName = asset.name || "";
    portraitWardrobeState.draftTransform = globalThis.HatsuPortraits.normalizeTransform(asset.transform);
    portraitWardrobeState.status = "ready";
    renderPortraitWardrobe();
    return true;
  }

  function restoreBuiltinPortrait() {
    if (portraitWardrobeState.pendingOperation) return false;
    const key = portraitWardrobeState.selectedCharacterKey;
    const appearance = globalThis.HatsuPortraits.normalizeAppearanceState(state.appearance);
    if (!appearance.equipped[key]) return false;
    delete appearance.equipped[key];
    state.appearance = appearance;
    portraitWardrobeState.selectedAssetId = "";
    portraitWardrobeState.draftName = "";
    portraitWardrobeState.draftTransform = { ...globalThis.HatsuPortraits.DEFAULT_TRANSFORM };
    portraitWardrobeState.status = "complete";
    saveState("portrait.restore_builtin");
    renderPortraitWardrobe();
    return true;
  }

  function archiveSelectedPortrait(deps = {}) {
    const assetId = portraitWardrobeState.selectedAssetId;
    if (!assetId || portraitWardrobeState.pendingOperation) return false;
    const asset = portraitWardrobeState.library.assets[assetId];
    if (!asset || asset.archived || !isSillyTavernHost() || !activeHostSaveScope) return false;
    const operation = {
      kind: "archive",
      operationId: globalThis.HatsuPortraits.createOperationId(),
      saveScope: String(activeHostSaveScope),
      assetId,
      stage: "archive_read",
      awaitingAction: "",
      lastError: ""
    };
    portraitWardrobeState.pendingOperation = operation;
    return requestPortraitHostOperation(operation, "readLibrary", {}, deps);
  }

  function retryPortraitWardrobeOperation() {
    const operation = portraitWardrobeState.pendingOperation;
    if (!operation || portraitWardrobeState.status !== "retryable") return false;
    if (operation.kind === "load_library") {
      operation.stage = "load_read";
      return requestPortraitHostOperation(operation, "readLibrary", {});
    }
    if (operation.kind === "archive") {
      operation.stage = "archive_read";
      return requestPortraitHostOperation(operation, "readLibrary", {});
    }
    return retryPortraitCommit();
  }

  function applyPortraitWardrobeSelection() {
    if (portraitWardrobeState.status === "retryable") return retryPortraitWardrobeOperation();
    if (portraitWardrobeState.selectedFile) return beginPortraitCommit();
    const asset = portraitWardrobeState.library.assets[portraitWardrobeState.selectedAssetId];
    if (!asset || asset.archived) return false;
    equipPortraitReference(asset, portraitWardrobeState.draftTransform);
    portraitWardrobeState.status = "complete";
    renderPortraitWardrobe();
    return true;
  }

  function resetPortraitWardrobeTransform() {
    portraitWardrobeState.draftTransform = { ...globalThis.HatsuPortraits.DEFAULT_TRANSFORM };
    renderPortraitWardrobe();
  }

  function renderPortraitWardrobe() {
    if (!portraitWardrobeState.open) return;
    const characterKey = portraitWardrobeState.selectedCharacterKey;
    const options = getWardrobeCharacterOptions();
    const characters = document.getElementById("portraitWardrobeCharacters");
    if (characters) {
      characters.textContent = "";
      options.forEach((option) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `portrait-wardrobe-character${option.characterKey === characterKey ? " is-active" : ""}`;
        button.textContent = option.label;
        button.addEventListener("click", () => setPortraitWardrobeCharacter(option.characterKey));
        characters.appendChild(button);
      });
    }
    const assets = Object.values(portraitWardrobeState.library.assets)
      .filter((asset) => !asset.archived && asset.characterKey === characterKey)
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    const assetList = document.getElementById("portraitWardrobeAssets");
    if (assetList) {
      assetList.textContent = "";
      assets.forEach((asset) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `portrait-wardrobe-asset${asset.assetId === portraitWardrobeState.selectedAssetId ? " is-active" : ""}`;
        button.title = asset.name || "自定义立绘";
        const image = document.createElement("img");
        image.src = asset.url;
        image.alt = "";
        button.appendChild(image);
        button.addEventListener("click", () => selectPortraitLibraryAsset(asset.assetId));
        assetList.appendChild(button);
      });
    }
    const equipped = globalThis.HatsuPortraits.normalizeAppearanceState(state.appearance).equipped[characterKey];
    const selected = portraitWardrobeState.library.assets[portraitWardrobeState.selectedAssetId];
    const portraitUrl = portraitWardrobeState.previewUrl || selected?.url || equipped?.url || getWardrobeBuiltinPortraitUrl(characterKey);
    const preview = document.getElementById("portraitWardrobePreview");
    const transform = globalThis.HatsuPortraits.normalizeTransform(portraitWardrobeState.draftTransform);
    if (preview) preview.src = portraitUrl || "";
    const stage = document.getElementById("portraitWardrobeStage");
    if (stage) {
      stage.style.setProperty("--portrait-scale", String(transform.scale));
      stage.style.setProperty("--portrait-x", `${transform.offsetX}px`);
      stage.style.setProperty("--portrait-y", `${transform.offsetY}px`);
    }
    const option = options.find((item) => item.characterKey === characterKey);
    const nameEl = document.getElementById("portraitWardrobeCharacterName");
    const lookEl = document.getElementById("portraitWardrobeLookName");
    if (nameEl) nameEl.textContent = option?.label || characterKey;
    if (lookEl) lookEl.textContent = portraitWardrobeState.draftName || selected?.name || equipped?.name || "默认立绘";
    const nameInput = document.getElementById("portraitWardrobeNameInput");
    if (nameInput && nameInput.value !== portraitWardrobeState.draftName) nameInput.value = portraitWardrobeState.draftName;
    const aliasEditor = document.getElementById("portraitWardrobeAliasEditor");
    const isProducer = characterKey === "producer";
    if (aliasEditor) aliasEditor.hidden = !isProducer;
    const aliasTags = document.getElementById("portraitWardrobeAliasTags");
    if (aliasTags && isProducer) {
      aliasTags.textContent = "";
      getDefaultProducerPortraitAliases().forEach((alias) => {
        const tag = document.createElement("span");
        tag.className = "portrait-wardrobe-alias-tag is-default";
        tag.textContent = alias;
        aliasTags.appendChild(tag);
      });
      globalThis.HatsuPortraits.normalizeProducerAliases(portraitWardrobeState.draftProducerAliases).forEach((alias) => {
        const tag = document.createElement("span");
        tag.className = "portrait-wardrobe-alias-tag";
        tag.append(document.createTextNode(alias));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.title = `删除 ${alias}`;
        remove.setAttribute("aria-label", `删除 ${alias}`);
        remove.innerHTML = '<svg aria-hidden="true"><use href="#icon-close"></use></svg>';
        remove.addEventListener("click", () => removeProducerPortraitAlias(alias));
        tag.appendChild(remove);
        aliasTags.appendChild(tag);
      });
    }
    const values = [["portraitWardrobeScale", Math.round(transform.scale * 100)], ["portraitWardrobeOffsetX", transform.offsetX], ["portraitWardrobeOffsetY", transform.offsetY]];
    values.forEach(([id, value]) => { const input = document.getElementById(id); if (input) input.value = String(value); });
    const scaleOutput = document.getElementById("portraitWardrobeScaleValue");
    const xOutput = document.getElementById("portraitWardrobeOffsetXValue");
    const yOutput = document.getElementById("portraitWardrobeOffsetYValue");
    if (scaleOutput) scaleOutput.textContent = `${Math.round(transform.scale * 100)}%`;
    if (xOutput) xOutput.textContent = String(transform.offsetX);
    if (yOutput) yOutput.textContent = String(transform.offsetY);
    const status = document.getElementById("portraitWardrobeStatus");
    const messages = { idle: "", preview: "\u5df2\u5728\u672c\u5730\u9884\u89c8\uff0c\u5c1a\u672a\u4e0a\u4f20\u3002", working: "\u6b63\u5728\u540c\u6b65\u8863\u67dc\u2026\u2026", retryable: "\u64cd\u4f5c\u672a\u5b8c\u6210\uff0c\u53ef\u91cd\u8bd5\u3002", complete: "\u5df2\u66f4\u65b0\u5f53\u524d\u7acb\u7ed8\u3002", ready: "\u8863\u67dc\u5df2\u5c31\u7eea\u3002", host_required: "\u672c\u5730\u9884\u89c8\u53ef\u7528\uff0c\u4e0a\u4f20\u9700\u8981 SillyTavern \u5bbf\u4e3b\u3002", invalid: "\u65e0\u6cd5\u8bfb\u53d6\u8be5\u56fe\u7247\u3002" };
    if (status) status.textContent = messages[portraitWardrobeState.status] || "";
    const working = Boolean(portraitWardrobeState.pendingOperation && portraitWardrobeState.status !== "retryable");
    ["portraitWardrobeFileInput", "portraitWardrobeNameInput", "portraitWardrobeScale", "portraitWardrobeOffsetX", "portraitWardrobeOffsetY", "portraitWardrobeResetBtn"].forEach((id) => {
      const control = document.getElementById(id); if (control) control.disabled = working;
    });
    const restoreBtn = document.getElementById("portraitWardrobeRestoreBtn");
    const archiveBtn = document.getElementById("portraitWardrobeArchiveBtn");
    const applyBtn = document.getElementById("portraitWardrobeApplyBtn");
    if (restoreBtn) restoreBtn.disabled = working || !equipped;
    if (archiveBtn) archiveBtn.disabled = working || !selected || selected.archived;
    if (applyBtn) {
      applyBtn.disabled = working || (!portraitWardrobeState.selectedFile && !selected && portraitWardrobeState.status !== "retryable");
      applyBtn.textContent = portraitWardrobeState.status === "retryable" ? "\u91cd\u8bd5" : "\u8bbe\u4e3a\u5f53\u524d";
    }
  }

  function backupCurrentSave() {
    try {
      localStorage.setItem(backupStorageKeyForScope(), JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function hasBackupSave() {
    try {
      return Boolean(localStorage.getItem(backupStorageKeyForScope()));
    } catch {
      return false;
    }
  }

  function restoreBackupSave() {
    try {
      const saved = localStorage.getItem(backupStorageKeyForScope());
      if (!saved) return false;
      state = { ...clone(baseState), ...JSON.parse(saved) };
      ensureStateShape({ recoverDirectorAttempt: true });
      state.launchMenuPaused = false;
      pendingAiRequestId = "";
      state.pendingAiRequestId = "";
      saveState();
      render();
      return true;
    } catch {
      return false;
    }
  }

  function switchStorageScope(scope) {
    const nextKey = storageKeyForScope(scope);
    if (nextKey === activeStorageKey) return false;
    activeStorageKey = nextKey;
    state = loadState();
    ensureStateShape({ recoverDirectorAttempt: true });
    return true;
  }

  function canonicalIdolName(name) {
    return idolAliases[name] || name;
  }

  function ensureStateShape(options = {}) {
    state.harness = normalizeHarnessState(state.harness, runtimeSessionEpoch);
    state.appearance = globalThis.HatsuPortraits.normalizeAppearanceState(state.appearance);
    state.gameMode = state.gameMode === "hybrid" ? "hybrid" : "classic";
    state.launchMode = ["produce", "sandbox"].includes(state.launchMode) ? state.launchMode : null;
    state.launchMenuPaused = Boolean(state.launchMenuPaused);
    state.sandbox = {
      openingComplete: false,
      inviteComplete: false,
      scoutTargetIdol: null,
      producedIdols: [],
      secondIdolUnlocked: false,
      ...(state.sandbox || {})
    };
    state.sandbox.openingComplete = Boolean(state.sandbox.openingComplete);
    state.sandbox.inviteComplete = Boolean(state.sandbox.inviteComplete);
    state.sandbox.apiSetupPending = Boolean(state.sandbox.apiSetupPending);
    state.sandbox.pendingIdol = state.sandbox.pendingIdol
      ? canonicalIdolName(state.sandbox.pendingIdol)
      : "";
    state.sandbox.scoutTargetIdol = state.sandbox.scoutTargetIdol
      ? canonicalIdolName(state.sandbox.scoutTargetIdol)
      : null;
    state.sandbox.producedIdols = Array.isArray(state.sandbox.producedIdols)
      ? state.sandbox.producedIdols.map((name) => canonicalIdolName(name)).filter(Boolean)
      : [];
    state.sandbox.secondIdolUnlocked = Boolean(state.sandbox.secondIdolUnlocked);
    state.sandbox.firstLiveChallenge = normalizeSandboxFirstLiveChallenge(state.sandbox.firstLiveChallenge);
    if (state.idol && !state.launchMode) {
      state.launchMode = state.gameMode === "hybrid" ? "sandbox" : "produce";
    }
    state.idol = state.idol ? canonicalIdolName(state.idol) : state.idol;
    state.affinity = {
      openingComplete: false,
      unlocked: [],
      pending: [],
      viewed: [],
      bondUnlockDay: {},
      ...(state.affinity || {})
    };
    state.affinity.unlocked = Array.from(new Set(state.affinity.unlocked || [])).map(Number).sort((a, b) => a - b);
    state.affinity.pending = Array.from(new Set(state.affinity.pending || [])).map(Number).sort((a, b) => a - b);
    state.affinity.viewed = Array.from(new Set(state.affinity.viewed || [])).map(Number).sort((a, b) => a - b);
    state.firstLive = { completed: false, success: false, result: null, ...(state.firstLive || {}) };
    state.freeMode = {
      unlocked: false,
      active: false,
      entryPromptSeen: false,
      layoutEditBypass: false,
      postLiveDay: 1,
      clockMinutes: FREE_MODE_DAY_START_MINUTES,
      presenceSlotKey: "",
      presence: {},
      relationships: {},
      npcRelationships: {},
      activeLocationId: null,
      facilityKind: null,
      facilityLocationId: null,
      eveningJournal: null,
      atApartment: false,
      apartmentCompanionIdol: "",
      eveningStayExtended: false,
      eveningGoHomeDeferred: false,
      ...(state.freeMode || {})
    };
    state.freeMode.atApartment = Boolean(state.freeMode.atApartment);
    state.freeMode.apartmentCompanionIdol = String(state.freeMode.apartmentCompanionIdol || "").trim();
    state.freeMode.eveningStayExtended = Boolean(state.freeMode.eveningStayExtended);
    state.freeMode.eveningGoHomeDeferred = Boolean(state.freeMode.eveningGoHomeDeferred);
    if (state.freeMode.eveningJournal && typeof state.freeMode.eveningJournal !== "object") {
      state.freeMode.eveningJournal = null;
    }
    if (!["lesson", "training", "rest", "first_live"].includes(state.freeMode.facilityKind)) {
      state.freeMode.facilityKind = null;
      state.freeMode.facilityLocationId = null;
    }
    if (!Number.isFinite(Number(state.freeMode.postLiveDay)) || state.freeMode.postLiveDay < 1) {
      state.freeMode.postLiveDay = 1;
    }
    if (!Number.isFinite(Number(state.freeMode.clockMinutes))) {
      state.freeMode.clockMinutes = FREE_MODE_DAY_START_MINUTES;
    }
    if (!state.freeMode.presence || typeof state.freeMode.presence !== "object") {
      state.freeMode.presence = {};
    }
    ensureFreeModeRelationships();
    if (state.freeMode.locationId && !state.freeMode.activeLocationId) {
      state.freeMode.activeLocationId = state.freeMode.locationId;
    }
    delete state.freeMode.locationId;
    if (state.firstLive.completed && !state.freeMode.unlocked) {
      state.freeMode.unlocked = true;
    }
    const defaultWorld = globalThis.HatsuWorld?.dailyTick?.defaultWorldState?.() || {
      macro_phase: "first_live",
      cast_first_live: {},
      kotone_seina_proxy: "pending",
      school_events: [],
      broadcast: { today: null, history: [], pendingRequestId: "", autoFullScript: true }
    };
    state.freeMode.world = {
      ...defaultWorld,
      ...(state.freeMode.world || {}),
      broadcast: {
        ...defaultWorld.broadcast,
        ...(state.freeMode.world?.broadcast || {})
      }
    };
    state.freeMode.world.director = globalThis.HatsuWorld?.directorState?.ensureDirectorShape?.(
      state.freeMode.world.director,
      { recoverInterrupted: Boolean(options.recoverDirectorAttempt) }
    ) || null;
    if (state.freeMode.world.broadcast.autoFullScript === undefined) {
      state.freeMode.world.broadcast.autoFullScript = false;
    }
    if (state.freeMode.world.broadcast.pendingRequestId) {
      state.freeMode.world.broadcast.pendingRequestId = "";
    }
    if (state.freeMode.world.broadcast.today?.scriptStatus === "generating") {
      state.freeMode.world.broadcast.today.scriptStatus = "idle";
    }
    if (!["pending", "accepted", "rejected"].includes(state.freeMode.world.kotone_seina_proxy)) {
      state.freeMode.world.kotone_seina_proxy = "pending";
    }
    if (!Array.isArray(state.freeMode.world.school_events)) {
      state.freeMode.world.school_events = [];
    }
    const defaultBuzz = { items: [], buzzDayKey: "", hotTopic: "" };
    state.freeMode.world.buzz = {
      ...defaultBuzz,
      ...(state.freeMode.world.buzz || {})
    };
    if (!Array.isArray(state.freeMode.world.buzz.items)) {
      state.freeMode.world.buzz.items = [];
    }
    const storyteller = state.freeMode.world.storyteller && typeof state.freeMode.world.storyteller === "object"
      ? state.freeMode.world.storyteller
      : {};
    const styleApi = globalThis.HatsuWorldStorytellerStyles;
    const planApi = globalThis.HatsuWorldStorytellerPlan;
    const incidentApi = globalThis.HatsuWorldStorytellerIncidents;
    const observationApi = globalThis.HatsuWorldStorytellerObservations;
    const currentStyleDayKey = getWorldFeedDayKey(state);
    const nextStyleDayKey = styleApi?.getNextDayKey?.(currentStyleDayKey) || "";
    state.freeMode.world.storyteller = {
      schemaVersion: 2,
      styleConfig: styleApi?.normalizeStyleConfig
        ? styleApi.normalizeStyleConfig(storyteller.styleConfig, {
          currentDayKey: currentStyleDayKey,
          nextDayKey: nextStyleDayKey,
          existingSave: !storyteller.styleConfig
        })
        : null,
      styleStreak: styleApi?.normalizeStyleStreak
        ? styleApi.normalizeStyleStreak(storyteller.styleStreak)
        : null,
      eventDensityConfig: planApi?.normalizeEventDensityConfig
        ? planApi.normalizeEventDensityConfig(storyteller.eventDensityConfig)
        : { mode: "standard", customBudget: { minor: 4, moderate: 3, major: 1 } },
      observations: Array.isArray(storyteller.observations) && observationApi?.normalizeStorytellerObservation
        ? storyteller.observations
          .map((observation) => observationApi.normalizeStorytellerObservation(observation))
          .slice(-24)
        : [],
      recentFingerprints: Array.isArray(storyteller.recentFingerprints) ? storyteller.recentFingerprints.slice(-24) : [],
      lastObservedDayKey: String(storyteller.lastObservedDayKey || "").slice(0, 120),
      plan: storyteller.plan && globalThis.HatsuWorldStorytellerPlan?.normalizeStorytellerPlan
        ? globalThis.HatsuWorldStorytellerPlan.normalizeStorytellerPlan(storyteller.plan)
        : null,
      pendingCandidate: storyteller.pendingCandidate && incidentApi?.normalizeIncidentCandidate
        ? incidentApi.normalizeIncidentCandidate(storyteller.pendingCandidate)
        : null,
      recentCandidates: Array.isArray(storyteller.recentCandidates) && incidentApi?.normalizeIncidentCandidate
        ? storyteller.recentCandidates
          .map((candidate) => incidentApi.normalizeIncidentCandidate(candidate))
          .filter(Boolean)
          .slice(-24)
        : [],
      receipts: Array.isArray(storyteller.receipts)
        ? storyteller.receipts.filter((receipt) => receipt && typeof receipt === "object").slice(-40)
        : [],
      lastPlanError: String(storyteller.lastPlanError || "").slice(0, 120),
      lastCandidateReason: String(storyteller.lastCandidateReason || "").slice(0, 120),
      lastSelectionDiagnostic: incidentApi?.normalizeSelectionDiagnostic
        ? incidentApi.normalizeSelectionDiagnostic(storyteller.lastSelectionDiagnostic)
        : null
    };
    if (!state.freeMode.world.dailyGen || typeof state.freeMode.world.dailyGen !== "object") {
      state.freeMode.world.dailyGen = { dayKey: "", status: "idle", source: "", pendingRequestId: "" };
    } else {
      state.freeMode.world.dailyGen = {
        dayKey: String(state.freeMode.world.dailyGen.dayKey || ""),
        status: String(state.freeMode.world.dailyGen.status || "idle"),
        source: String(state.freeMode.world.dailyGen.source || ""),
        pendingRequestId: String(state.freeMode.world.dailyGen.pendingRequestId || "")
      };
    }
    state.activeStoryNode = state.activeStoryNode || null;
    state.producer = {
      name: "{{user}}",
      gender: "",
      personality: "",
      style: "",
      settings: "",
      ...(state.producer || {})
    };
    state.produceOptions = {
      skipLessonTrainingAiStory: false,
      ...(state.produceOptions || {})
    };
    if (state.produceOptions.skipTrainingAiStory) {
      state.produceOptions.skipLessonTrainingAiStory = true;
      delete state.produceOptions.skipTrainingAiStory;
    }
    state.produceOptions.skipLessonTrainingAiStory = Boolean(state.produceOptions.skipLessonTrainingAiStory);
    state.eventMode = state.eventMode || "none";
    state.choiceStep = Number.isInteger(state.choiceStep) ? state.choiceStep : 0;
    state.pendingChoiceRewards = Array.isArray(state.pendingChoiceRewards) ? state.pendingChoiceRewards : [];
    state.pendingActionContext = state.pendingActionContext || null;
    state.intimacyRoute = state.intimacyRoute || null;
    state.pendingOptionTexts = Array.isArray(state.pendingOptionTexts) ? state.pendingOptionTexts : [];
    state.pendingOptionMinutes = Array.isArray(state.pendingOptionMinutes) ? state.pendingOptionMinutes : [];
    state.selectedChoiceText = state.selectedChoiceText || "";
    state.selectedChoiceRating = state.selectedChoiceRating || "";
    state.bondChoiceRound = Number.isInteger(state.bondChoiceRound) ? state.bondChoiceRound : 0;
    state.bondFirstChoiceText = state.bondFirstChoiceText || "";
    state.dailySummary = {
      day: 0,
      intro: "",
      status: "",
      producer: "",
      raw: "",
      complete: false,
      ...(state.dailySummary || {})
    };
    state.phoneChat = {
      activeView: "home",
      activeThreadId: "",
      threads: [],
      messages: {},
      friends: [],
      isAwaitingReply: false,
      pendingRequestId: "",
      retryAvailable: false,
      ...(state.phoneChat || {})
    };
    state.phoneChat.friends = Array.from(new Set((state.phoneChat.friends || [])
      .map((name) => canonicalIdolName(name))
      .filter((name) => name && idols[name] && name !== state.idol)));
    if (!state.phoneChat.messages || typeof state.phoneChat.messages !== "object") {
      state.phoneChat.messages = {};
    }
    if (!Array.isArray(state.phoneChat.threads)) {
      state.phoneChat.threads = [];
    }
    if (!Number.isInteger(state.round) || state.round < 1) state.round = 1;
    if (state.round > SUMMARY_ROUND) state.round = SUMMARY_ROUND;
    if (globalThis.HatsuTasks) {
      globalThis.HatsuTasks.ensureTasksShape(state);
    }
  }

  function notifyQuestCompletions(questIds) {
    if (!questIds?.length || !globalThis.HatsuTasks) return;
    questIds.forEach((id) => {
      const label = globalThis.HatsuTasks.getQuestCompleteToast(id);
      appendEveningJournalTask("课题完成", label);
      showToast("任务", label, "gold");
    });
  }

  function recordStorytellerObservation(observation = {}, saveScope = "") {
    const api = globalThis.HatsuWorldStorytellerObservations;
    if (!api?.recordStorytellerObservation) {
      return { recorded: false, reason: "storyteller_module_unavailable" };
    }
    const activeSaveScope = String(activeHostSaveScope || activeStorageKey || "");
    return api.recordStorytellerObservation(state, observation, saveScope, { activeSaveScope });
  }

  function recordAcceptedFinalStorytellerObservation(requestId, candidateSettlement) {
    candidateSettlement = candidateSettlement && typeof candidateSettlement === "object" ? candidateSettlement : {};
    const turn = state.harness?.activeTurn;
    const supportedTurn = Boolean(
      turn
      && turn.status === "completed"
      && turn.requestId === requestId
      && (
        turn.kind === "produce_action"
        || (turn.kind === "map_explore" && turn.action === "map_location")
        || (turn.kind === "storyteller_event" && candidateSettlement?.resolved)
      )
      && isHarnessTurnInActiveScope(turn, getHarnessRecoveryContext())
    );
    if (!supportedTurn) return { recorded: false, reason: "turn_not_eligible" };
    const saveScope = String(activeHostSaveScope || activeStorageKey || "");
    const candidate = candidateSettlement?.resolved ? candidateSettlement.candidate : null;
    const participantIds = candidate
      ? [...(candidate.actorIds || []), ...(candidate.targetIds || [])]
      : ["producer", ...(state.idol ? [`idol:${state.idol}`] : [])];
    const locationId = String(candidate?.locationId || turn.locationId || state.freeMode?.activeLocationId || "").slice(0, 120);
    const result = recordStorytellerObservation({
      sourceKind: candidate ? "resolved_candidate" : "ambient_turn",
      requestId,
      turnId: turn.turnId || "",
      dayKey: getWorldFeedDayKey(),
      timeMinutes: Number(state.freeMode?.clockMinutes),
      category: candidate?.category || "",
      severity: candidate?.severity || "",
      archetypeId: candidate?.archetypeId || "",
      actionId: String(turn.action || "narrative_reply").slice(0, 100),
      locationId,
      participantIds,
      fingerprint: candidate?.fingerprint || "",
      pressureCount: Array.isArray(candidate?.pressureIds) ? candidate.pressureIds.length : 0,
      styleId: candidate?.styleId || "",
      operatorIds: Array.isArray(candidate?.operatorIds) ? candidate.operatorIds : []
    }, saveScope);
    if (result?.recorded && candidate?.styleId) {
      const styles = globalThis.HatsuWorldStorytellerStyles;
      const storyteller = state.freeMode?.world?.storyteller;
      if (storyteller && styles?.recordCommittedStyle) {
        storyteller.styleStreak = styles.recordCommittedStyle(storyteller.styleStreak, candidate.styleId);
      }
    }
    return result;
  }

  function ensureStorytellerPlanForCheckpoint(trigger, options = {}) {
    options = options && typeof options === "object" ? options : {};
    if (!new Set(["day_change", "manual"]).has(trigger)) {
      return { committed: false, reason: "invalid_trigger", plan: null };
    }
    const planApi = globalThis.HatsuWorldStorytellerPlan;
    const observationApi = globalThis.HatsuWorldStorytellerObservations;
    const storyteller = state.freeMode?.world?.storyteller;
    if (!planApi || !observationApi || !storyteller) {
      return { committed: false, reason: "storyteller_module_unavailable", plan: null };
    }
    const saveScope = getSecondaryChannelSaveScope();
    const dayKey = getWorldFeedDayKey();
    if (!saveScope || !dayKey) return { committed: false, reason: "scope_or_day_missing", plan: null };
    if (trigger === "manual" && !options.confirmed) {
      return { committed: false, reason: "manual_confirmation_required", plan: storyteller.plan || null };
    }
    if (trigger === "manual" && (getPrimaryModelChannelOwner() || getSecondaryModelChannelOwner())) {
      return { committed: false, reason: "model_channel_busy", plan: storyteller.plan || null };
    }
    if (trigger === "day_change" && planApi.isCurrentStorytellerPlan(storyteller.plan, dayKey, saveScope)) {
      return { committed: false, reason: "current_plan_exists", plan: storyteller.plan };
    }

    try {
      const stats = observationApi.buildRecentStorytellerStats(state, { limit: 12 });
      const generatedByJobId = String(options.generatedByJobId || "").slice(0, 160);
      const seed = trigger === "manual" && generatedByJobId
        ? `${dayKey}|${saveScope}|${generatedByJobId}`
        : `${dayKey}|${saveScope}`;
      const plan = planApi.buildStorytellerPlan({
        dayKey,
        saveScope,
        seed,
        generatedByJobId,
        stats,
        recentFingerprints: storyteller.recentFingerprints,
        eventDensityConfig: storyteller.eventDensityConfig,
        styleMix: storyteller.styleConfig?.activeMix,
        styleMixRevision: storyteller.styleConfig?.styleMixRevision
      });
      if (!planApi.isCurrentStorytellerPlan(plan, dayKey, saveScope)) {
        throw new Error("plan_not_current");
      }
      storyteller.plan = plan;
      storyteller.lastPlanError = "";
      saveState("storyteller.plan_committed");
      return { committed: true, reason: "committed", plan };
    } catch (error) {
      storyteller.lastPlanError = String(error?.message || "plan_build_failed").slice(0, 120);
      saveState("storyteller.plan_failed");
      return { committed: false, reason: storyteller.lastPlanError, plan: storyteller.plan || null };
    }
  }

  function activateStorytellerStyleMixForDay(dayKey) {
    const storyteller = state.freeMode?.world?.storyteller;
    const api = globalThis.HatsuWorldStorytellerStyles;
    if (!storyteller || !api?.activatePendingMix) return { activated: false };
    const result = api.activatePendingMix(storyteller.styleConfig, dayKey);
    storyteller.styleConfig = result.config;
    return result;
  }

  function buildStorytellerIncidentContext(action, attribute, options = {}) {
    options = options && typeof options === "object" ? options : {};
    const storyteller = state.freeMode?.world?.storyteller;
    const incidentApi = globalThis.HatsuWorldStorytellerIncidents;
    const saveScope = String(options.saveScope || getSecondaryChannelSaveScope() || "").slice(0, 240);
    const dayKey = String(options.dayKey || getWorldFeedDayKey() || "").slice(0, 120);
    const sourceTurnId = String(options.turnId || state.harness?.activeTurn?.turnId || "").slice(0, 160);
    const fallbackLocation = action === "lesson"
      ? "producer_classroom"
      : action === "training"
        ? "special_education"
        : "courtyard";
    const locationId = String(
      options.locationId
      || state.freeMode?.facilityLocationId
      || state.freeMode?.activeLocationId
      || fallbackLocation
    ).slice(0, 120);
    const assignedName = canonicalIdolName(state.idol || "");
    let presentNames = Array.isArray(options.presentActorIds) ? options.presentActorIds : [];
    if (!presentNames.length && typeof getIdolsPresentAtLocation === "function") {
      presentNames = getIdolsPresentAtLocation(locationId).map((name) => `idol:${canonicalIdolName(name)}`);
    }
    const presentActorIds = [...new Set(presentNames.map((value) => {
      const text = String(value || "").trim();
      if (!text) return "";
      return text.startsWith("idol:") ? `idol:${canonicalIdolName(text.slice(5))}` : `idol:${canonicalIdolName(text)}`;
    }).filter(Boolean))].sort().slice(0, 8);
    const director = state.freeMode?.world?.director || {};
    const pressureSource = Array.isArray(director.pressures)
      ? director.pressures
      : Array.isArray(director.dramaPressures)
        ? director.dramaPressures
        : [];
    const pressureFacts = incidentApi?.normalizeStorytellerPressureFacts
      ? incidentApi.normalizeStorytellerPressureFacts(pressureSource)
      : [];
    const direction = director.dailyDirection;
    const styleThreads = direction
      && direction.dayKey === dayKey
      && Number(direction.styleMixRevision) === Number(storyteller?.plan?.styleMixRevision)
      ? direction.styleThreads
      : null;
    return {
      plan: storyteller?.plan || null,
      styleThreads,
      styleStreak: globalThis.HatsuWorldStorytellerStyles?.normalizeStyleStreak
        ? globalThis.HatsuWorldStorytellerStyles.normalizeStyleStreak(storyteller?.styleStreak)
        : null,
      saveScope,
      dayKey,
      dayOrdinal: Math.max(0, Number(state.freeMode?.postLiveDay || state.day || 0)),
      sourceTurnId,
      action: String(action || "").slice(0, 60),
      attribute: ["Vo", "Da", "Vi"].includes(attribute) ? attribute : "",
      mapStepKind: ["arrival", "explore_choice", "custom_choice"].includes(options.mapStepKind)
        ? options.mapStepKind
        : "",
      locationId,
      assignedActorId: assignedName ? `idol:${assignedName}` : "",
      presentActorIds,
      pressureFacts,
      recentFingerprints: Array.isArray(storyteller?.recentFingerprints)
        ? storyteller.recentFingerprints.slice(-24)
        : [],
      recentCandidates: Array.isArray(storyteller?.recentCandidates)
        ? storyteller.recentCandidates.slice(-24)
        : []
    };
  }

  function prepareStorytellerCandidateForOrdinaryTurn(action, attribute, options = {}) {
    options = options && typeof options === "object" ? options : {};
    const mapAction = action === "map_location"
      && ["arrival", "explore_choice", "custom_choice"].includes(options.mapStepKind);
    if (!isHarnessOrdinaryAction(action) && !mapAction) return { candidate: null, reason: "action_not_supported" };
    const turnId = String(options.turnId || state.harness?.activeTurn?.turnId || "").slice(0, 160);
    if (!turnId) return { candidate: null, reason: "turn_id_required" };
    const storyteller = state.freeMode?.world?.storyteller;
    const api = globalThis.HatsuWorldStorytellerIncidents;
    if (!storyteller || !api?.selectIncidentCandidate || !api?.normalizeIncidentCandidate) {
      return { candidate: null, reason: "storyteller_module_unavailable" };
    }
    const context = buildStorytellerIncidentContext(action, attribute, { ...options, turnId });
    const plan = context.plan;
    if (
      !plan
      || plan.status !== "committed"
      || String(plan.saveScope || "") !== context.saveScope
      || String(plan.dayKey || "") !== context.dayKey
      || !String(plan.planId || "")
    ) {
      return { candidate: null, reason: "current_plan_unavailable" };
    }
    const existing = api.normalizeIncidentCandidate(storyteller.pendingCandidate);
    if (
      existing
      && ["pending", "attached"].includes(existing.status)
      && existing.sourceTurnId === turnId
      && existing.saveScope === context.saveScope
      && existing.dayKey === context.dayKey
      && existing.planId === plan.planId
    ) {
      return { candidate: existing, reason: "existing_candidate" };
    }
    const selected = api.selectIncidentCandidate(context);
    storyteller.lastSelectionDiagnostic = api.normalizeSelectionDiagnostic
      ? api.normalizeSelectionDiagnostic(selected.diagnostic)
      : selected.diagnostic || null;
    if (!selected.candidate) {
      storyteller.lastCandidateReason = String(selected.reason || "no_eligible_candidate").slice(0, 120);
      return selected;
    }
    if (selected.nextStyleStreak) storyteller.styleStreak = selected.nextStyleStreak;
    storyteller.pendingCandidate = api.normalizeIncidentCandidate(selected.candidate);
    storyteller.lastCandidateReason = "selected";
    return { ...selected, candidate: storyteller.pendingCandidate };
  }

  function scanStorytellerNotificationAtCheckpoint(trigger, options = {}) {
    const allowedTriggers = new Set(["time_advance", "map_complete", "open_sns", "open_world_engine"]);
    if (!allowedTriggers.has(trigger)) return { notified: false, reason: "unsupported_trigger", candidate: null };
    const storyteller = state.freeMode?.world?.storyteller;
    const incidentApi = globalThis.HatsuWorldStorytellerIncidents;
    const notificationApi = globalThis.HatsuWorldStorytellerNotifications;
    if (!storyteller || !incidentApi?.selectIncidentCandidate || !notificationApi?.transitionNotification) {
      return { notified: false, reason: "storyteller_module_unavailable", candidate: null };
    }
    if (state.harness?.activeTurn?.kind === "storyteller_event" && state.harness.activeTurn.status === "recovery_required") {
      return { notified: false, reason: "event_recovery_pending", candidate: null };
    }
    const scanGate = notificationApi.canScanNotification(storyteller.pendingCandidate);
    if (!scanGate?.ok) return { notified: false, reason: scanGate?.reason || "candidate_unresolved", candidate: null };
    const saveScope = String(getSecondaryChannelSaveScope() || activeHostSaveScope || activeStorageKey || "").slice(0, 240);
    const dayKey = String(getWorldFeedDayKey() || "").slice(0, 120);
    const plan = storyteller.plan;
    if (!saveScope || !dayKey || !plan || plan.status !== "committed" || plan.saveScope !== saveScope || plan.dayKey !== dayKey) {
      return { notified: false, reason: "current_plan_unavailable", candidate: null };
    }
    const worldMinute = notificationApi.buildStorytellerWorldMinute({
      dayOrdinal: Number(state.freeMode?.postLiveDay || state.day || 0),
      clockMinutes: Number(state.freeMode?.clockMinutes || 0)
    });
    const locationId = String(options.locationId || state.freeMode?.activeLocationId || state.freeMode?.facilityLocationId || "courtyard").slice(0, 120);
    const sourceTurnId = `notify:${dayKey}:${worldMinute}:${locationId || "none"}`;
    const context = buildStorytellerIncidentContext("notification", "", { ...options, turnId: sourceTurnId, saveScope, dayKey, locationId });
    const selected = incidentApi.selectIncidentCandidate({
      ...context,
      requiredChannel: "invite",
      allowMajorConfirmation: true
    });
    storyteller.lastSelectionDiagnostic = incidentApi.normalizeSelectionDiagnostic?.(selected.diagnostic) || null;
    if (!selected.candidate) {
      storyteller.lastCandidateReason = String(selected.reason || "no_eligible_notification").slice(0, 120);
      return { notified: false, reason: storyteller.lastCandidateReason, candidate: null };
    }
    if (selected.nextStyleStreak) storyteller.styleStreak = selected.nextStyleStreak;
    const transition = notificationApi.transitionNotification(selected.candidate, "notify", {
      saveScope, dayKey, planId: plan.planId, sourceTurnId, worldMinute, reason: trigger
    });
    if (!transition.ok) return { notified: false, reason: transition.reason, candidate: null };
    storyteller.pendingCandidate = incidentApi.normalizeIncidentCandidate(transition.candidate);
    storyteller.lastCandidateReason = "notified";
    storyteller.receipts = [...(Array.isArray(storyteller.receipts) ? storyteller.receipts : []), {
      event: "notified", reason: trigger, dayKey, saveScope, createdAt: Date.now()
    }].slice(-40);
    saveState("storyteller.notification_notified");
    return { notified: true, reason: "notified", candidate: storyteller.pendingCandidate };
  }

  function attachStorytellerCandidateToOrdinaryTurn(action, attribute, actionContext = {}, options = {}) {
    options = options && typeof options === "object" ? options : {};
    const unchanged = { candidate: null, reference: null, actionContext };
    if (!isHarnessOrdinaryAction(action) || options.willGenerateNarrative === false) return unchanged;
    const prepared = prepareStorytellerCandidateForOrdinaryTurn(action, attribute, options);
    const candidate = prepared.candidate;
    const api = globalThis.HatsuWorldStorytellerIncidents;
    if (!candidate || candidate.status !== "pending" || candidate.channel !== "attach" || candidate.requiresConfirmation) {
      return unchanged;
    }
    const ownership = {
      saveScope: candidate.saveScope,
      dayKey: candidate.dayKey,
      planId: candidate.planId,
      sourceTurnId: candidate.sourceTurnId
    };
    const transition = api?.transitionIncidentCandidate?.(candidate, "attached", ownership);
    if (!transition?.ok) return unchanged;
    state.freeMode.world.storyteller.pendingCandidate = transition.candidate;
    state.freeMode.world.storyteller.lastCandidateReason = "attached";
    const reference = {
      incidentId: transition.candidate.incidentId,
      planId: transition.candidate.planId,
      saveScope: transition.candidate.saveScope,
      dayKey: transition.candidate.dayKey,
      sourceTurnId: transition.candidate.sourceTurnId
    };
    return {
      candidate: transition.candidate,
      reference,
      actionContext: { ...actionContext, storytellerCandidate: transition.candidate }
    };
  }

  function attachStorytellerCandidateToMapTurn(options = {}) {
    options = options && typeof options === "object" ? options : {};
    const unchanged = { candidate: null, reference: null };
    const turn = state.harness?.activeTurn;
    if (
      !turn
      || turn.kind !== "map_explore"
      || turn.status !== "prepared"
      || turn.turnId !== String(options.turnId || "")
    ) return unchanged;
    const prepared = prepareStorytellerCandidateForOrdinaryTurn("map_location", null, {
      ...options,
      turnId: turn.turnId,
      mapStepKind: turn.stepKind,
      locationId: turn.locationId
    });
    const candidate = prepared.candidate;
    const api = globalThis.HatsuWorldStorytellerIncidents;
    if (!candidate || candidate.status !== "pending" || candidate.channel !== "attach" || candidate.requiresConfirmation) {
      return unchanged;
    }
    const transition = api?.transitionIncidentCandidate?.(candidate, "attached", {
      saveScope: candidate.saveScope,
      dayKey: candidate.dayKey,
      planId: candidate.planId,
      sourceTurnId: candidate.sourceTurnId
    });
    if (!transition?.ok) return unchanged;
    state.freeMode.world.storyteller.pendingCandidate = transition.candidate;
    state.freeMode.world.storyteller.lastCandidateReason = "attached";
    return {
      candidate: transition.candidate,
      reference: {
        incidentId: transition.candidate.incidentId,
        planId: transition.candidate.planId,
        saveScope: transition.candidate.saveScope,
        dayKey: transition.candidate.dayKey,
        sourceTurnId: transition.candidate.sourceTurnId
      }
    };
  }

  function settleStorytellerCandidateForReply(requestId, accepted, retry, isFinal) {
    if (!accepted || retry || !isFinal || !requestId) {
      return { resolved: false, reason: "reply_not_accepted_final" };
    }
    const turn = state.harness?.activeTurn;
    const completedNarrativeTurn = Boolean(
      turn
      && turn.status === "completed"
      && turn.requestId === requestId
      && (
        turn.kind === "produce_action"
        || (turn.kind === "map_explore" && turn.action === "map_location")
      )
    );
    if (!completedNarrativeTurn) {
      return { resolved: false, reason: "turn_request_mismatch" };
    }
    const storyteller = state.freeMode?.world?.storyteller;
    const api = globalThis.HatsuWorldStorytellerIncidents;
    const candidate = api?.normalizeIncidentCandidate?.(storyteller?.pendingCandidate);
    const reference = turn.storytellerCandidateRef;
    const activeScope = String(activeHostSaveScope || activeStorageKey || "");
    if (!storyteller || !candidate || !reference || !activeScope) {
      return { resolved: false, reason: "candidate_unavailable" };
    }
    const exactReference = candidate.incidentId === String(reference.incidentId || "")
      && candidate.planId === String(reference.planId || "")
      && candidate.saveScope === String(reference.saveScope || "")
      && candidate.dayKey === String(reference.dayKey || "")
      && candidate.sourceTurnId === String(reference.sourceTurnId || "")
      && candidate.sourceTurnId === String(turn.turnId || "")
      && candidate.saveScope === activeScope;
    if (!exactReference) return { resolved: false, reason: "candidate_reference_mismatch" };
    const transition = api.transitionIncidentCandidate(candidate, "resolved", {
      saveScope: candidate.saveScope,
      dayKey: candidate.dayKey,
      planId: candidate.planId,
      sourceTurnId: candidate.sourceTurnId
    });
    if (!transition.ok) return { resolved: false, reason: transition.reason };
    storyteller.recentCandidates = [
      ...(Array.isArray(storyteller.recentCandidates)
        ? storyteller.recentCandidates.filter((item) => item?.incidentId !== candidate.incidentId)
        : []),
      transition.candidate
    ].slice(-24);
    storyteller.recentFingerprints = [...new Set([
      ...(Array.isArray(storyteller.recentFingerprints) ? storyteller.recentFingerprints : []),
      transition.candidate.fingerprint
    ].filter(Boolean))].slice(-24);
    storyteller.receipts = [
      ...(Array.isArray(storyteller.receipts) ? storyteller.receipts : []),
      {
        incidentId: transition.candidate.incidentId,
        planId: transition.candidate.planId,
        event: "resolved",
        reason: "accepted_final",
        dayKey: transition.candidate.dayKey,
        saveScope: transition.candidate.saveScope,
        sourceTurnId: transition.candidate.sourceTurnId,
        createdAt: Date.now()
      }
    ].slice(-40);
    storyteller.pendingCandidate = null;
    storyteller.lastCandidateReason = "resolved";
    return { resolved: true, reason: "resolved", candidate: transition.candidate };
  }

  function settleStorytellerEventForReply(requestId, accepted, retry, isFinal) {
    if (!accepted || retry || !isFinal || !requestId) {
      return { resolved: false, reason: "reply_not_accepted_final" };
    }
    const turn = state.harness?.activeTurn;
    const activeScope = String(activeHostSaveScope || activeStorageKey || "");
    if (
      !turn
      || turn.kind !== "storyteller_event"
      || turn.status !== "generating"
      || turn.requestId !== requestId
      || turn.sessionEpoch !== runtimeSessionEpoch
      || !activeScope
      || turn.saveScope !== activeScope
      || !isHarnessTurnInActiveScope(turn, getHarnessRecoveryContext())
      || !isPrimaryModelLeaseCurrent(requestId, activeInboundPrimaryChannelLeaseId)
    ) return { resolved: false, reason: "turn_request_mismatch" };
    const storyteller = state.freeMode?.world?.storyteller;
    const incidentApi = globalThis.HatsuWorldStorytellerIncidents;
    const notificationApi = globalThis.HatsuWorldStorytellerNotifications;
    const candidate = incidentApi?.normalizeIncidentCandidate?.(storyteller?.pendingCandidate);
    const reference = turn.storytellerCandidateRef;
    if (!storyteller || !candidate || !reference || candidate.status !== "invited") {
      return { resolved: false, reason: "candidate_unavailable" };
    }
    const exactReference = candidate.incidentId === String(turn.incidentId || "")
      && candidate.incidentId === String(reference.incidentId || "")
      && candidate.planId === String(reference.planId || "")
      && candidate.saveScope === String(reference.saveScope || "")
      && candidate.dayKey === String(reference.dayKey || "")
      && candidate.sourceTurnId === String(reference.sourceTurnId || "")
      && candidate.saveScope === activeScope;
    if (!exactReference) return { resolved: false, reason: "candidate_reference_mismatch" };
    const transition = notificationApi?.transitionNotification?.(candidate, "resolve", {
      saveScope: candidate.saveScope,
      dayKey: candidate.dayKey,
      planId: candidate.planId,
      sourceTurnId: candidate.sourceTurnId
    });
    if (!transition?.ok) return { resolved: false, reason: transition?.reason || "invalid_transition" };
    state.harness.activeTurn = {
      ...turn,
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now()
    };
    storyteller.recentCandidates = [
      ...(Array.isArray(storyteller.recentCandidates)
        ? storyteller.recentCandidates.filter((item) => item?.incidentId !== candidate.incidentId)
        : []),
      transition.candidate
    ].slice(-24);
    storyteller.recentFingerprints = [...new Set([
      ...(Array.isArray(storyteller.recentFingerprints) ? storyteller.recentFingerprints : []),
      transition.candidate.fingerprint
    ].filter(Boolean))].slice(-24);
    storyteller.receipts = [
      ...(Array.isArray(storyteller.receipts) ? storyteller.receipts : []),
      {
        incidentId: transition.candidate.incidentId,
        planId: transition.candidate.planId,
        event: "resolved",
        reason: "accepted_final",
        dayKey: transition.candidate.dayKey,
        saveScope: transition.candidate.saveScope,
        sourceTurnId: transition.candidate.sourceTurnId,
        createdAt: Date.now()
      }
    ].slice(-40);
    storyteller.pendingCandidate = null;
    storyteller.lastCandidateReason = "resolved";
    recordHarnessTrace("turn.completed", { turnId: turn.turnId || "", requestId, action: "storyteller_event" });
    debugHarnessEvent("turn.completed", { turnId: turn.turnId || "", requestId, action: "storyteller_event" });
    return { resolved: true, reason: "resolved", candidate: transition.candidate };
  }

  function expireStorytellerCandidateForTurn(turn, reason = "narrative_abandoned") {
    const storyteller = state.freeMode?.world?.storyteller;
    const api = globalThis.HatsuWorldStorytellerIncidents;
    const candidate = api?.normalizeIncidentCandidate?.(storyteller?.pendingCandidate);
    const reference = turn?.storytellerCandidateRef;
    const activeScope = String(activeHostSaveScope || activeStorageKey || "");
    if (!storyteller || !candidate || !reference || !activeScope) {
      return { expired: false, reason: "candidate_unavailable" };
    }
    const exactReference = candidate.incidentId === String(reference.incidentId || "")
      && candidate.planId === String(reference.planId || "")
      && candidate.saveScope === String(reference.saveScope || "")
      && candidate.dayKey === String(reference.dayKey || "")
      && candidate.sourceTurnId === String(reference.sourceTurnId || "")
      && candidate.sourceTurnId === String(turn.turnId || "")
      && candidate.saveScope === activeScope;
    if (!exactReference) return { expired: false, reason: "candidate_reference_mismatch" };
    const transition = api.transitionIncidentCandidate(candidate, "expired", {
      saveScope: candidate.saveScope,
      dayKey: candidate.dayKey,
      planId: candidate.planId,
      sourceTurnId: candidate.sourceTurnId
    });
    if (!transition.ok) return { expired: false, reason: transition.reason };
    const boundedReason = String(reason || "narrative_abandoned").slice(0, 120);
    storyteller.recentCandidates = [
      ...(Array.isArray(storyteller.recentCandidates)
        ? storyteller.recentCandidates.filter((item) => item?.incidentId !== candidate.incidentId)
        : []),
      transition.candidate
    ].slice(-24);
    storyteller.receipts = [
      ...(Array.isArray(storyteller.receipts) ? storyteller.receipts : []),
      {
        incidentId: transition.candidate.incidentId,
        planId: transition.candidate.planId,
        event: "expired",
        reason: boundedReason,
        dayKey: transition.candidate.dayKey,
        saveScope: transition.candidate.saveScope,
        sourceTurnId: transition.candidate.sourceTurnId,
        createdAt: Date.now()
      }
    ].slice(-40);
    storyteller.pendingCandidate = null;
    storyteller.lastCandidateReason = boundedReason;
    return { expired: true, reason: "expired", candidate: transition.candidate };
  }

  function abandonStorytellerEventCandidateForTurn(turn, reason = "narrative_abandoned") {
    const storyteller = state.freeMode?.world?.storyteller;
    const incidentApi = globalThis.HatsuWorldStorytellerIncidents;
    const notificationApi = globalThis.HatsuWorldStorytellerNotifications;
    const candidate = incidentApi?.normalizeIncidentCandidate?.(storyteller?.pendingCandidate);
    const reference = turn?.storytellerCandidateRef;
    const activeScope = String(activeHostSaveScope || activeStorageKey || "");
    if (!storyteller || !candidate || !reference || turn?.kind !== "storyteller_event" || candidate.status !== "invited" || !activeScope) {
      return { abandoned: false, reason: "candidate_unavailable" };
    }
    const exactReference = candidate.incidentId === String(turn.incidentId || "")
      && candidate.incidentId === String(reference.incidentId || "")
      && candidate.planId === String(reference.planId || "")
      && candidate.saveScope === String(reference.saveScope || "")
      && candidate.dayKey === String(reference.dayKey || "")
      && candidate.sourceTurnId === String(reference.sourceTurnId || "")
      && candidate.saveScope === activeScope;
    if (!exactReference) return { abandoned: false, reason: "candidate_reference_mismatch" };
    const transition = notificationApi?.transitionNotification?.(candidate, "abandon", {
      saveScope: candidate.saveScope,
      dayKey: candidate.dayKey,
      planId: candidate.planId,
      sourceTurnId: candidate.sourceTurnId
    });
    if (!transition?.ok) return { abandoned: false, reason: transition?.reason || "invalid_transition" };
    const boundedReason = String(reason || "narrative_abandoned").slice(0, 120);
    storyteller.recentCandidates = [
      ...(Array.isArray(storyteller.recentCandidates)
        ? storyteller.recentCandidates.filter((item) => item?.incidentId !== candidate.incidentId)
        : []),
      transition.candidate
    ].slice(-24);
    storyteller.receipts = [
      ...(Array.isArray(storyteller.receipts) ? storyteller.receipts : []),
      {
        incidentId: transition.candidate.incidentId,
        planId: transition.candidate.planId,
        event: "abandoned",
        reason: boundedReason,
        dayKey: transition.candidate.dayKey,
        saveScope: transition.candidate.saveScope,
        sourceTurnId: transition.candidate.sourceTurnId,
        createdAt: Date.now()
      }
    ].slice(-40);
    storyteller.pendingCandidate = null;
    storyteller.lastCandidateReason = boundedReason;
    return { abandoned: true, reason: "abandoned", candidate: transition.candidate };
  }

  function processSandboxQuestFromReply(source, isFinal = true) {
    if (!isFinal || !globalThis.HatsuTasks?.isSandboxTasksActive(state)) return;
    const tagCompleted = globalThis.HatsuTasks.applyQuestCompletionsFromReply(state, source);
    const flagResult = globalThis.HatsuTasks.applyQuestFlagsFromReply(state, source);
    const numericCompleted = globalThis.HatsuTasks.evaluateNumericMainQuests(state);
    const merged = [...new Set([...tagCompleted, ...flagResult.completions || [], ...numericCompleted])];
    if (flagResult.notices?.length) {
      flagResult.notices.forEach((notice) => showToast("课题进度", notice, "info"));
    }
    if (merged.length) {
      saveState();
      notifyQuestCompletions(merged);
    }
  }

  function processSandboxMainQuestMapChoice(locationId, choiceText) {
    if (!globalThis.HatsuTasks?.isSandboxTasksActive(state)) return;
    const result = globalThis.HatsuTasks.processSandboxMainQuestMapChoice(state, locationId, choiceText);
    if (result.notices?.length) {
      result.notices.forEach((notice) => showToast("课题进度", notice, "info"));
    }
    if (result.completions?.length) {
      saveState();
      notifyQuestCompletions(result.completions);
    } else if (result.notices?.length) {
      saveState();
    }
    processSandboxQuestAfterSettlement();
  }

  function processSandboxQuestAfterSettlement() {
    if (!globalThis.HatsuTasks?.isSandboxTasksActive(state)) return;
    const completed = globalThis.HatsuTasks.evaluateNumericMainQuests(state);
    if (completed.length) {
      saveState();
      notifyQuestCompletions(completed);
    }
  }

  function notifySandboxRestQuestIfNeeded(rawAction) {
    if (rawAction !== "rest") return;
    const completed = globalThis.HatsuTasks?.onSandboxRestSettled?.(state) || [];
    if (!completed.length) return;
    saveState();
    notifyQuestCompletions(completed);
  }

  function getTaskPanelSnapshot() {
    if (!globalThis.HatsuTasks) return null;
    ensureStateShape();
    return globalThis.HatsuTasks.getTaskPanelSnapshot(state);
  }

  function getSandboxCampusRemaining() {
    if (!globalThis.HatsuTasks?.isSandboxTasksActive(state)) return null;
    return globalThis.HatsuTasks.getCampusRemaining(state);
  }

  function isSandboxCampusExhausted() {
    return Boolean(globalThis.HatsuTasks?.isSandboxTasksActive(state) && globalThis.HatsuTasks.isCampusDailyLimitReached(state));
  }

  function showSandboxCampusLimitToast() {
    showToast("今日校园次数已用完", "上课与训练合计每天最多 3 次。明日可继续在教学楼或训练设施成长。", "warn");
  }

  function readSecondaryApiKeyStorage() {
    try {
      return String(localStorage.getItem(SECONDARY_API_KEY_STORAGE_KEY) || "");
    } catch {
      return "";
    }
  }

  function writeSecondaryApiKeyStorage(apiKey) {
    try {
      if (apiKey) localStorage.setItem(SECONDARY_API_KEY_STORAGE_KEY, apiKey);
      else localStorage.removeItem(SECONDARY_API_KEY_STORAGE_KEY);
    } catch {
      // ignore quota errors
    }
  }

  function getSecondaryApiConfig() {
    const api = state.tasks?.secondaryApi || {};
    return {
      enabled: Boolean(api.enabled),
      baseUrl: String(api.baseUrl || "").trim(),
      model: String(api.model || "").trim(),
      apiKey: readSecondaryApiKeyStorage(),
      temperature: Number.isFinite(Number(api.temperature)) ? Number(api.temperature) : 0.7,
      maxTokens: Number.isFinite(Number(api.maxTokens)) ? Number(api.maxTokens) : 1200
    };
  }

  function isSecondaryApiConfigured() {
    const cfg = getSecondaryApiConfig();
    return cfg.enabled && cfg.baseUrl && cfg.model;
  }

  function shouldUseSecondaryWorldGen() {
    return isSecondaryApiConfigured() && isPhoneWorldFeedUnlocked();
  }

  function getWorldFeedHelpers() {
    return {
      ...getHatsuWorldHelpers(),
      getDayKey: (sourceState) => getWorldFeedDayKey(sourceState),
      getPresenceSlotKey: (sourceState) => getWorldFeedPresenceSlotKey(sourceState)
    };
  }

  function isDailyWorldGenLoading() {
    const gen = globalThis.HatsuWorld?.worldGen?.ensureDailyGenShape?.(state);
    return Boolean(gen && globalThis.HatsuWorld?.worldGen?.isDailyGenLoading?.(gen));
  }

  function fallbackDailyWorldToStatic(reason = "") {
    const helpers = getWorldFeedHelpers();
    const tick = globalThis.HatsuWorld?.dailyTick;
    const dayKey = getWorldFeedDayKey();
    tick?.rollDailyBroadcast?.(state, helpers);
    tick?.rollDailyBuzz?.(state, helpers);
    globalThis.HatsuWorld?.worldGen?.markDailyWorldGenReady?.(state, "static", dayKey);
    if (globalThis.HatsuTasks?.isSandboxTasksActive(state) && state.sandbox?.inviteComplete) {
      globalThis.HatsuTasks.refreshSideQuestSlots(state);
      if (state.tasks?.side) {
        state.tasks.side.genStatus = "ready";
        state.tasks.side.source = "static";
        state.tasks.side.pendingRequestId = "";
      }
    }
    saveState();
    renderSnsApp();
    renderBroadcastApp();
    renderSideQuestOverlay();
    if (reason) {
      showToast("已改用静态池", reason, "warn");
    }
  }

  function getSecondaryChannelSaveScope() {
    return String(activeHostSaveScope || activeStorageKey || "local");
  }

  function getSecondaryModelChannelOwner() {
    return secondaryChannelOwner ? { ...secondaryChannelOwner } : null;
  }

  function createSecondaryJobId(kind, requestId, meta = {}) {
    const discriminator = meta.dayKey ?? meta.slotIndex ?? "manual";
    return `secondary:${kind}:${String(discriminator)}:${requestId}`;
  }

  function rejectSecondaryModelDispatch(owner, intent) {
    pushSecondaryDebug({ phase: "reject", kind: intent?.kind || "?", requestId: intent?.requestId || "", error: owner ? `secondary_busy:${owner.kind}` : "invalid_secondary_intent" });
    showToast("次模型通道占用中", owner ? `当前正在处理 ${owner.kind} 请求，请稍后再试。` : "本次请求标识无效。", "warn");
    return { ok: false, reason: owner ? "secondary_busy" : "invalid_secondary_intent", blockingOwner: owner || null };
  }

  function scheduleSecondaryModelChannelTimeout(owner) {
    if (secondaryChannelTimeoutId) clearTimeout(secondaryChannelTimeoutId);
    const timeoutMs = owner?.kind === "director"
      ? DIRECTOR_MODEL_CHANNEL_TIMEOUT_MS
      : SECONDARY_MODEL_CHANNEL_TIMEOUT_MS;
    secondaryChannelTimeoutId = window.setTimeout(() => {
      handleSecondaryAiReply({ ...owner, text: "", ok: false, error: "timeout" });
    }, timeoutMs);
  }

  function acquireSecondaryModelChannel(intent, meta = {}) {
    const api = globalThis.HatsuWorld?.secondaryChannelOwner;
    if (!api) return rejectSecondaryModelDispatch(null, intent);
    const result = api.acquireSecondaryOwner(secondaryChannelOwner, intent);
    if (!result.acquired) return rejectSecondaryModelDispatch(result.owner, intent);
    secondaryChannelOwner = result.owner;
    secondaryChannelMeta = { ...(meta || {}) };
    scheduleSecondaryModelChannelTimeout(result.owner);
    pushSecondaryDebug({ phase: "acquire", kind: result.owner.kind, requestId: result.owner.requestId });
    return { ok: true, owner: { ...result.owner } };
  }

  function acquireSecondaryEntryDispatch(kind, requestId, meta = {}) {
    return acquireSecondaryModelChannel({
      jobId: String(meta.jobId || createSecondaryJobId(kind, requestId, meta)),
      requestId: String(requestId || ""),
      kind: String(kind || ""),
      saveScope: getSecondaryChannelSaveScope(),
      acquiredAt: Date.now()
    }, meta);
  }

  function releaseSecondaryModelChannel(jobId, requestId, saveScope, reason = "completed") {
    const api = globalThis.HatsuWorld?.secondaryChannelOwner;
    if (!api) return false;
    const result = api.releaseSecondaryOwner(secondaryChannelOwner, { jobId, requestId, saveScope });
    if (!result.released) return false;
    if (secondaryChannelTimeoutId) clearTimeout(secondaryChannelTimeoutId);
    secondaryChannelTimeoutId = 0;
    secondaryChannelOwner = null;
    secondaryChannelMeta = null;
    pushSecondaryDebug({ phase: "release", kind: "secondary", requestId, error: String(reason || "completed") });
    return true;
  }

  function isCurrentSecondaryReply(payload) {
    const api = globalThis.HatsuWorld?.secondaryChannelOwner;
    if (!api || !secondaryChannelOwner) return false;
    const expectedScope = isSillyTavernHost() ? String(activeHostSaveScope || "") : getSecondaryChannelSaveScope();
    return Boolean(expectedScope && String(payload?.saveScope || "") === expectedScope && api.isSecondaryOwnerMatch(secondaryChannelOwner, payload));
  }
  function getWorldDirectorState() {
    const api = globalThis.HatsuWorld?.directorState;
    if (!api || !state.freeMode?.world) return null;
    if (!state.freeMode.world.director || typeof state.freeMode.world.director !== "object") {
      state.freeMode.world.director = api.defaultDirectorState();
    }
    return state.freeMode.world.director;
  }

  function reconcileWorldDirectorAttempt(reason = "owner_missing") {
    const director = getWorldDirectorState();
    const job = director?.activeJob;
    const saveScope = getSecondaryChannelSaveScope();
    if (
      !job
      || !["generating", "validating"].includes(job.status)
      || !saveScope
    ) return false;
    const owner = getSecondaryModelChannelOwner();
    const ownerApi = globalThis.HatsuWorld?.secondaryChannelOwner;
    const exactOwner = ownerApi?.isSecondaryOwnerMatch?.(owner, {
      jobId: job.jobId,
      requestId: job.requestId,
      saveScope: job.saveScope,
      kind: "director"
    });
    if (exactOwner) {
      const ownerAge = Math.max(0, Date.now() - Number(owner?.acquiredAt || 0));
      if (ownerAge < DIRECTOR_MODEL_CHANNEL_TIMEOUT_MS) return false;
      handleSecondaryAiReply({ ...owner, text: "", ok: false, error: "timeout" });
      return true;
    }
    director.activeJob = {
      ...job,
      requestId: "",
      status: "retryable_failed",
      reason: job.saveScope === saveScope
        ? String(reason || "owner_missing").slice(0, 120)
        : "scope_changed",
      startedAt: 0
    };
    director.dirty = true;
    saveState("director.owner_missing");
    renderSecondaryApiDebug();
    return true;
  }

  function recoverStaleWorldDirectorAttempt() {
    const director = getWorldDirectorState();
    const job = director?.activeJob;
    const owner = getSecondaryModelChannelOwner();
    const ownerApi = globalThis.HatsuWorld?.secondaryChannelOwner;
    const exactOwner = job && ownerApi?.isSecondaryOwnerMatch?.(owner, {
      jobId: job.jobId,
      requestId: job.requestId,
      saveScope: job.saveScope,
      kind: "director"
    });
    const age = exactOwner ? Math.max(0, Date.now() - Number(owner.acquiredAt || 0)) : 0;
    if (!exactOwner || age < DIRECTOR_MODEL_CHANNEL_TIMEOUT_MS) return false;
    if (!window.confirm("结束这次已经超时的世界推演？已结算的时间、数值和世界记录不会回滚。")) return false;
    handleSecondaryAiReply({ ...owner, text: "", ok: false, error: "timeout" });
    renderWorldEnginePhoneApp();
    updateWorldEngineApiSettingsUI();
    return true;
  }

  function getWorldDirectorHelpers() {
    const idolNames = Object.keys(idols);
    const knownCharacters = idolNames.map((name) => ({
      id: "idol:" + name,
      name,
      relationshipStage: String(getAffinityStageThreshold(
        state.freeMode?.relationships?.[name] ?? (name === state.idol ? state.trust : 0)
      ))
    }));
    const locationId = String(state.freeMode?.activeLocationId || "");
    const scope = getSecondaryChannelSaveScope();
    return {
      knownActorIds: ["producer", ...knownCharacters.map((item) => item.id)],
      knownScopeKeys: ["global", scope, ...(locationId ? ["location:" + locationId] : [])],
      getKnownCharacters: () => knownCharacters,
      composePublicWorldSummary: () => composeWorldSummaryBlock("director", locationId),
      getRecentSceneStats: () => {
        const stats = {};
        const digests = getWorldDirectorState()?.chronicleDigests || [];
        digests.slice(-12).forEach((digest) => {
          const key = String(digest.actionType || "narrative");
          stats[key] = (stats[key] || 0) + 1;
        });
        return stats;
      },
      getTimePhase: () => isFreeModeActive() ? formatFreeModeClock() : getPhase() + " / " + roundLabel(),
      getLocationId: () => locationId
    };
  }

  function createWorldDirectorJobId(trigger, dayKey) {
    return "director:" + trigger + ":" + dayKey + ":" + Date.now().toString(36) + "-" + Math.random().toString(16).slice(2, 8);
  }

  function prepareWorldDirectorJob(trigger, options = {}) {
    if (!["day_change", "manual"].includes(trigger)) return null;
    const director = getWorldDirectorState();
    if (!director?.enabled) return null;
    const dayKey = String(options.dayKey || getWorldFeedDayKey());
    const saveScope = getSecondaryChannelSaveScope();
    if (!dayKey || !saveScope) return null;
    const styleConfig = state.freeMode?.world?.storyteller?.styleConfig;
    const styleMode = styleConfig?.legacyUntilDayChange === false ? "styled" : "legacy";
    const styleMix = styleMode === "styled"
      ? clone(styleConfig.activeMix || { heroic: 60, romance: 40, kaibunsho: 0 })
      : null;
    const styleMixRevision = styleMode === "styled" ? Number(styleConfig.styleMixRevision) || 0 : null;
    if (trigger === "day_change" && director.dailyDirection?.dayKey === dayKey) return null;
    const active = director.activeJob;
    if (
      trigger === "day_change"
      && active?.trigger === "day_change"
      && active.dayKey === dayKey
      && active.saveScope === saveScope
      && active.baseDirectorRevision === director.directorRevision
      && active.baseChronicleRevision === director.chronicleRevision
      && active.styleMode === styleMode
      && JSON.stringify(active.styleMix) === JSON.stringify(styleMix)
      && active.styleMixRevision === styleMixRevision
      && ["prepared", "retryable_failed", "generating", "validating"].includes(active.status)
    ) return { ...active };
    const job = {
      jobId: createWorldDirectorJobId(trigger, dayKey),
      requestId: "",
      saveScope,
      trigger,
      dayKey,
      baseDirectorRevision: director.directorRevision,
      baseChronicleRevision: director.chronicleRevision,
      styleMode,
      styleMix,
      styleMixRevision,
      status: "prepared",
      reason: "",
      attempts: 0,
      preparedAt: Date.now(),
      startedAt: 0
    };
    director.activeJob = job;
    director.dirty = true;
    if (options.persist !== false) saveState("director.job_prepared");
    return { ...job };
  }

  function maybeRequestWorldDirector(options = {}) {
    const director = getWorldDirectorState();
    let job = director?.activeJob;
    if (
      !director?.enabled
      || !director.dirty
      || !job
      || !["prepared", "retryable_failed"].includes(job.status)
      || job.saveScope !== getSecondaryChannelSaveScope()
      || getPrimaryModelChannelOwner()
      || getSecondaryModelChannelOwner()
      || !isSecondaryApiConfigured()
    ) return false;
    if (
      job.baseDirectorRevision !== director.directorRevision
      || job.baseChronicleRevision !== director.chronicleRevision
    ) {
      const refreshed = prepareWorldDirectorJob(job.trigger, { dayKey: job.dayKey, persist: false });
      if (!refreshed) return false;
      job = director.activeJob;
      saveState("director.job_rebased");
    }
    const requestId = createSecondaryRequestId("director");
    const dispatch = acquireSecondaryEntryDispatch("director", requestId, {
      jobId: job.jobId,
      trigger: job.trigger,
      runtimeStateRef: state,
      runtimeDirectorRef: director,
      dayKey: job.dayKey,
      baseDirectorRevision: job.baseDirectorRevision,
      baseChronicleRevision: job.baseChronicleRevision
    });
    if (!dispatch.ok) return false;
    director.activeJob = {
      ...job,
      requestId,
      status: "generating",
      reason: "",
      attempts: Number(job.attempts || 0) + 1,
      startedAt: Date.now()
    };
    saveState("director.generating");
    const api = globalThis.HatsuWorld?.directorApi;
    let prompt = "";
    try {
      const input = api?.buildDirectorInput?.(state, director.activeJob, getWorldDirectorHelpers());
      prompt = input && api?.buildDirectorPrompt?.(input);
    } catch (error) {
      finishWorldDirectorAttempt(dispatch.owner, { ok: false, reason: "prompt_build_failed" });
      return false;
    }
    if (!prompt) {
      finishWorldDirectorAttempt(dispatch.owner, { ok: false, reason: "prompt_build_failed" });
      return false;
    }
    try {
      if (requestHostSecondaryPromptSend(prompt, dispatch.owner)) return true;
    } catch (error) {
      // The exact owner is released below through the common retryable failure path.
    }
    finishWorldDirectorAttempt(dispatch.owner, { ok: false, reason: "send_failed" });
    return false;
  }

  function finishWorldDirectorAttempt(owner, result = {}) {
    const director = getWorldDirectorState();
    const job = director?.activeJob;
    if (
      !job
      || !owner
      || job.jobId !== owner.jobId
      || job.requestId !== owner.requestId
      || job.saveScope !== owner.saveScope
    ) return false;
    if (!releaseSecondaryModelChannel(owner.jobId, owner.requestId, owner.saveScope, result.reason || "failed")) return false;
    if (result.ok) return true;
    director.activeJob = {
      ...job,
      requestId: "",
      status: "retryable_failed",
      reason: String(result.reason || "generation_failed").slice(0, 120),
      startedAt: 0
    };
    director.dirty = true;
    saveState("director.retryable_failed");
    renderSecondaryApiDebug();
    renderWorldEnginePhoneApp();
    return false;
  }

  function resumeWorldDirectorAfterRelease(reason = "") {
    if (typeof shouldUseSecondaryWorldGen === "function" && shouldUseSecondaryWorldGen()) {
      maybeRequestDailyWorldGeneration();
      if (getSecondaryModelChannelOwner()) return true;
    }
    return maybeRequestWorldDirector({ reason: reason || "director_owner_released" });
  }

  function describeWorldDirectorIdentityMismatch(job, owner, context = {}) {
    if (!job) return "director_job_mismatch:missing_job";
    const knownStatuses = new Set(["prepared", "generating", "validating", "committed", "retryable_failed"]);
    const statusValue = String(job.status || "");
    const status = knownStatuses.has(statusValue) ? statusValue : "unknown";
    const attemptsValue = Number(job.attempts);
    const attempts = Number.isInteger(attemptsValue) && attemptsValue >= 0
      ? Math.min(attemptsValue, 999)
      : 0;
    let field = "unknown";
    if (job.jobId !== owner?.jobId) {
      field = "job_id";
    } else if (job.requestId !== owner?.requestId) {
      field = "request_id";
    } else if (job.saveScope !== owner?.saveScope) {
      field = "save_scope";
    }
    let source = "";
    if (context.acquiredState && context.currentState && context.acquiredState !== context.currentState) {
      source = "state_replaced";
    } else if (
      context.acquiredDirector
      && context.currentDirector
      && context.acquiredDirector !== context.currentDirector
    ) {
      source = "director_replaced";
    } else if (context.acquiredDirector && context.currentDirector) {
      source = "active_job_replaced";
    }
    return `director_job_mismatch:${field}:${status}:${attempts}${source ? `:${source}` : ""}`;
  }

  function handleWorldDirectorReply(payload, owner) {
    const director = getWorldDirectorState();
    const job = director?.activeJob;
    if (
      !owner
      || owner.kind !== "director"
      || payload?.jobId !== owner.jobId
      || payload?.requestId !== owner.requestId
      || payload?.saveScope !== owner.saveScope
      || owner.saveScope !== getSecondaryChannelSaveScope()
    ) return false;
    if (
      !job
      || job.jobId !== owner.jobId
      || job.requestId !== owner.requestId
      || job.saveScope !== owner.saveScope
    ) {
      const mismatchReason = describeWorldDirectorIdentityMismatch(job, owner, {
        acquiredState: secondaryChannelMeta?.runtimeStateRef,
        currentState: state,
        acquiredDirector: secondaryChannelMeta?.runtimeDirectorRef,
        currentDirector: director
      });
      releaseSecondaryModelChannel(owner.jobId, owner.requestId, owner.saveScope, mismatchReason);
      reconcileWorldDirectorAttempt("director_job_mismatch");
      renderSecondaryApiDebug();
      renderWorldEnginePhoneApp();
      return false;
    }
    if (!director.enabled) return finishWorldDirectorAttempt(owner, { ok: false, reason: "feature_disabled" });
    if (
      job.baseDirectorRevision !== director.directorRevision
      || job.baseChronicleRevision !== director.chronicleRevision
    ) return finishWorldDirectorAttempt(owner, { ok: false, reason: "stale_revision" });
    const text = String(payload?.text || "");
    if (!payload?.ok || !text.trim()) {
      return finishWorldDirectorAttempt(owner, { ok: false, reason: String(payload?.error || "empty_response") });
    }
    director.activeJob = { ...job, status: "validating", reason: "" };
    saveState("director.validating");
    const api = globalThis.HatsuWorld?.directorApi;
    const output = api?.parseDirectorResponse?.(text);
    if (!output) return finishWorldDirectorAttempt(owner, { ok: false, reason: "parse_failed" });
    const prepared = api?.prepareDirectorPatch?.(output, state, director.activeJob, getWorldDirectorHelpers());
    if (!prepared?.ok) return finishWorldDirectorAttempt(owner, { ok: false, reason: prepared?.reason || "validation_failed" });
    const applied = globalThis.HatsuWorld?.directorState?.applyDirectorPatch?.(state, prepared.patch);
    if (!applied?.applied) return finishWorldDirectorAttempt(owner, { ok: false, reason: applied?.reason || "commit_failed" });
    releaseSecondaryModelChannel(owner.jobId, owner.requestId, owner.saveScope, "completed");
    saveState("director.committed");
    renderSecondaryApiDebug();
    renderWorldEnginePhoneApp();
    return true;
  }

  function requestManualWorldDirectorRecalculation() {
    const director = getWorldDirectorState();
    if (!director?.enabled) {
      showToast("世界导演未启用", "当前存档未启用世界导演。", "warn");
      return false;
    }
    if (getPrimaryModelChannelOwner() || getSecondaryModelChannelOwner()) {
      showToast("模型通道占用中", "请等待当前模型请求结束后再手工重算。", "warn");
      return false;
    }
    if (!isSecondaryApiConfigured()) {
      showToast("次 API 未配置", "请先配置可用的次 API。", "warn");
      return false;
    }
    if (!window.confirm("重新计算今天的叙事方向？这不会重算数值、时间或随机结果。")) return false;
    if (!prepareWorldDirectorJob("manual")) return false;
    const preparedJob = getWorldDirectorState()?.activeJob;
    ensureStorytellerPlanForCheckpoint("manual", {
      confirmed: true,
      generatedByJobId: preparedJob?.jobId || ""
    });
    renderWorldEnginePhoneApp();
    return maybeRequestWorldDirector({ reason: "manual" });
  }

  function maybeFollowWorldDirectorAfterPublicWorld(meta, reason) {
    if (meta?.suppressDirectorFollowup) return false;
    if (typeof ensureStorytellerPlanForCheckpoint === "function") {
      ensureStorytellerPlanForCheckpoint("day_change");
    }
    return maybeRequestWorldDirector({ reason });
  }

  function maybeRequestDailyWorldGeneration(options) {
    options = options && typeof options === "object" ? options : {};
    if (!shouldUseSecondaryWorldGen()) return;
    const worldGen = globalThis.HatsuWorld?.worldGen;
    if (!worldGen) return;
    const gen = worldGen.ensureDailyGenShape(state);
    const dayKey = getWorldFeedDayKey();
    if (gen.dayKey !== dayKey) return;
    if (gen.status !== "pending" && gen.status !== "failed") return;
    const helpers = getWorldFeedHelpers();
    const includeSideQuests = worldGen.shouldIncludeSideQuests(state);
    const prompt = worldGen.buildDailyWorldPrompt(state, { dayKey, dayLabel: formatWorldFeedDayLabel(), includeSideQuests }, helpers);
    if (!prompt) return;
    const requestId = createSecondaryRequestId("world");
    const dispatch = acquireSecondaryEntryDispatch("world", requestId, {
      dayKey,
      includeSideQuests,
      suppressDirectorFollowup: Boolean(options.suppressDirectorFollowup)
    });
    if (!dispatch.ok) return;
    worldGen.markDailyWorldGenLoading(state, requestId, dayKey);
    saveState();
    renderSnsApp();
    renderBroadcastApp();
    renderSideQuestOverlay();
    if (!requestHostSecondaryPromptSend(prompt, dispatch.owner)) {
      releaseSecondaryModelChannel(dispatch.owner.jobId, dispatch.owner.requestId, dispatch.owner.saveScope, "send_failed");
      fallbackDailyWorldToStatic("次 API 未配置完整，已回退静态池。");
      maybeFollowWorldDirectorAfterPublicWorld({
        suppressDirectorFollowup: Boolean(options.suppressDirectorFollowup)
      }, "public_world_send_failed");
    }
  }
  function syncDailyWorldGeneration() {
    if (!shouldUseSecondaryWorldGen()) return false;
    const worldGen = globalThis.HatsuWorld?.worldGen;
    if (!worldGen) return false;
    const dayKey = getWorldFeedDayKey();
    const gen = worldGen.ensureDailyGenShape(state);

    if (gen.dayKey === dayKey && gen.status === "ready") {
      return false;
    }

    const buzzReady = state.freeMode?.world?.buzz?.buzzDayKey === dayKey
      && (state.freeMode?.world?.buzz?.items || []).length > 0;
    const broadcastReady = state.freeMode?.world?.broadcast?.today?.dateKey === dayKey;
    if ((!gen.dayKey || gen.status === "idle") && buzzReady && broadcastReady) {
      worldGen.markDailyWorldGenReady(state, "static", dayKey);
      return false;
    }

    if (gen.dayKey !== dayKey || gen.status === "idle" || gen.status === "failed") {
      worldGen.queueDailyWorldGeneration(state, dayKey);
      if (globalThis.HatsuTasks?.isSandboxTasksActive(state) && state.sandbox?.inviteComplete) {
        globalThis.HatsuTasks.queueSideQuestRefresh(state);
      }
    }

    if (gen.status === "pending" || gen.status === "failed") {
      maybeRequestDailyWorldGeneration();
    }
    return gen.status === "loading";
  }

  function saveSecondaryApiSettings(patch = {}) {
    ensureStateShape();
    state.tasks.secondaryApi = {
      ...globalThis.HatsuTasks?.defaultTasksState?.().secondaryApi,
      ...state.tasks.secondaryApi,
      ...patch,
      enabled: patch.enabled !== undefined ? Boolean(patch.enabled) : Boolean(state.tasks.secondaryApi.enabled),
      baseUrl: String(patch.baseUrl ?? state.tasks.secondaryApi.baseUrl ?? "").trim(),
      model: String(patch.model ?? state.tasks.secondaryApi.model ?? "").trim(),
      temperature: Number.isFinite(Number(patch.temperature ?? state.tasks.secondaryApi.temperature))
        ? Number(patch.temperature ?? state.tasks.secondaryApi.temperature)
        : 0.7,
      maxTokens: Number.isFinite(Number(patch.maxTokens ?? state.tasks.secondaryApi.maxTokens))
        ? Number(patch.maxTokens ?? state.tasks.secondaryApi.maxTokens)
        : 1200
    };
    if (patch.apiKey !== undefined) {
      writeSecondaryApiKeyStorage(String(patch.apiKey || "").trim());
    }
    saveState();
    updateWorldEngineApiSettingsUI();
  }

  function createSecondaryRequestId(kind) {
    return `side-gen-${kind}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  }

  function fallbackSideQuestToStatic(reason = "") {
    if (!globalThis.HatsuTasks?.isSandboxTasksActive(state)) return;
    globalThis.HatsuTasks.refreshSideQuestSlots(state);
    globalThis.HatsuTasks.markSideQuestGenFailed(state);
    saveState();
    renderSideQuestOverlay();
    if (reason) {
      showToast("已改用静态工作池", reason, "warn");
    }
  }

  async function runLocalSecondaryApiPrompt(prompt, owner, apiConfig) {
    const baseUrl = String(apiConfig.baseUrl || "").trim().replace(/\/$/, "");
    const url = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiConfig.apiKey || ""}` }, body: JSON.stringify({ model: apiConfig.model, messages: [{ role: "user", content: prompt }], temperature: apiConfig.temperature, max_tokens: apiConfig.maxTokens }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const text = String(json?.choices?.[0]?.message?.content || "").trim();
      handleSecondaryAiReply({ ...owner, text, ok: Boolean(text), error: text ? "" : "empty_response" });
    } catch (error) {
      handleSecondaryAiReply({ ...owner, text: "", ok: false, error: String(error?.message || error) });
    }
  }
  function requestHostSecondaryPromptSend(prompt, owner, options = {}) {
    const apiConfig = getSecondaryApiConfig();
    if (owner?.kind === "world") apiConfig.maxTokens = Math.max(apiConfig.maxTokens, 2200);
    const allowDisabled = Boolean(options.allowDisabled);
    if (owner?.kind === "director") apiConfig.maxTokens = Math.max(apiConfig.maxTokens, 3200);
    if ((!apiConfig.enabled && !allowDisabled) || !apiConfig.baseUrl || !apiConfig.model) return false;
    const promptText = String(prompt || "").trim();
    if (!promptText || !isCurrentSecondaryReply(owner)) return false;
    const transport = isSillyTavernHost() ? "host(ST)" : "local fetch";
    pushSecondaryDebug({ phase: "send", kind: owner.kind, requestId: owner.requestId, transport, promptLength: promptText.length });
    if (isSillyTavernHost()) {
      window.parent.postMessage({ source: "hatsuboshi-produce", type: "sendSecondaryPrompt", jobId: owner.jobId, requestId: owner.requestId, saveScope: owner.saveScope, kind: owner.kind, prompt: promptText, apiConfig }, "*");
      return true;
    }
    runLocalSecondaryApiPrompt(promptText, owner, apiConfig);
    return true;
  }
  function maybeRequestSideQuestGeneration() {
    if (shouldUseSecondaryWorldGen()) { maybeRequestDailyWorldGeneration(); return; }
    if (!globalThis.HatsuTasks?.isSandboxTasksActive(state)) return;
    if (!globalThis.HatsuTasks.shouldUseSecondarySideGen(state)) return;
    const status = globalThis.HatsuTasks.getSideQuestGenStatus(state);
    if (status !== "pending" && status !== "failed") return;
    const dayKey = globalThis.HatsuTasks.getCampusDayKey(state);
    const prompt = globalThis.HatsuSideQuestApi?.buildSideQuestDailyPrompt(state, dayKey);
    if (!prompt) return;
    const requestId = createSecondaryRequestId("daily");
    const dispatch = acquireSecondaryEntryDispatch("daily", requestId, { dayKey });
    if (!dispatch.ok) return;
    globalThis.HatsuTasks.markSideQuestGenPending(state, requestId);
    saveState();
    renderSideQuestOverlay();
    if (!requestHostSecondaryPromptSend(prompt, dispatch.owner)) {
      releaseSecondaryModelChannel(dispatch.owner.jobId, dispatch.owner.requestId, dispatch.owner.saveScope, "send_failed");
      fallbackSideQuestToStatic("次 API 未配置完整，已回退静态池。");
    }
  }
  function requestSideQuestTierGeneration(slotIndex) {
    if (!globalThis.HatsuTasks?.shouldUseSecondarySideGen(state)) return;
    const slot = state.tasks?.side?.slots?.[slotIndex];
    if (!slot || slot.status === "done") return;
    if (slot.tierHints || slot.tierGenStatus === "loading") return;
    const prompt = globalThis.HatsuSideQuestApi?.buildSideQuestTierPrompt(state, slot);
    if (!prompt) return;
    const requestId = createSecondaryRequestId(`tier-${slotIndex}`);
    const dispatch = acquireSecondaryEntryDispatch("tier", requestId, { slotIndex });
    if (!dispatch.ok) return;
    globalThis.HatsuTasks.markSideQuestTierGenPending(state, slotIndex, requestId);
    saveState();
    openSideQuestTierPanel(slotIndex, { keepOpen: true });
    if (!requestHostSecondaryPromptSend(prompt, dispatch.owner)) {
      releaseSecondaryModelChannel(dispatch.owner.jobId, dispatch.owner.requestId, dispatch.owner.saveScope, "send_failed");
      slot.tierGenStatus = "idle";
      saveState();
    }
  }
  function handleSecondaryAiReply(payload) {
    if (!isCurrentSecondaryReply(payload)) {
      pushSecondaryDebug({
        phase: "reject",
        kind: String(payload?.kind || "?"),
        requestId: String(payload?.requestId || ""),
        error: "secondary_owner_mismatch",
        textLength: String(payload?.text || "").length
      });
      return;
    }
    const owner = { ...secondaryChannelOwner };
    const meta = { kind: owner.kind, ...(secondaryChannelMeta || {}) };
    const text = String(payload?.text || "");
    const ok = Boolean(payload?.ok) && Boolean(text);
    if (meta.kind === "director") {
      pushSecondaryDebug({
        phase: "reply",
        kind: "director",
        requestId: owner.requestId,
        ok,
        error: ok ? "" : String(payload?.error || "empty_response"),
        textLength: text.length,
        parseOk: null
      });
      handleWorldDirectorReply(payload, owner);
      return;
    }
    releaseSecondaryModelChannel(owner.jobId, owner.requestId, owner.saveScope, ok ? "completed" : String(payload?.error || "failed"));
    const debugEvent = pushSecondaryDebug({ phase: "reply", kind: meta.kind || "?", requestId: owner.requestId, ok, error: ok ? "" : String(payload?.error || "empty_response"), textLength: text.length, parseOk: null });
    if (meta.kind === "test") {
      if (debugEvent) debugEvent.parseOk = ok;
      secondaryApiDebug.lastMessage = ok
        ? `测试成功：收到 ${text.length} 字回复`
        : `测试失败：${payload?.error || "无有效回复"}`;
      updateSandboxApiTestStatus(secondaryApiDebug.lastMessage);
      renderSecondaryApiDebug();
      showToast(ok ? "次 API 测试成功" : "次 API 测试失败", ok ? `收到 ${text.length} 字有效回复，详见调试日志。` : `${payload?.error || "无有效回复"}`, ok ? "info" : "warn");
      return;
    }

    if (!ok) {
      if (debugEvent) debugEvent.parseOk = false;
      if (meta.kind === "world") {
        fallbackDailyWorldToStatic(payload?.error ? `次 API 失败：${payload.error}` : "次 API 无有效回复");
        maybeFollowWorldDirectorAfterPublicWorld(meta, "public_world_failed");
      } else if (meta.kind === "daily") {
        fallbackSideQuestToStatic(payload?.error ? `次 API 失败：${payload.error}` : "次 API 无有效回复");
      } else if (meta.kind === "tier" && Number.isFinite(Number(meta.slotIndex))) {
        const slot = state.tasks?.side?.slots?.[meta.slotIndex];
        if (slot) slot.tierGenStatus = "idle";
        saveState();
        openSideQuestTierPanel(meta.slotIndex, { keepOpen: true });
      }
      return;
    }

    if (meta.kind === "world") {
      const worldGen = globalThis.HatsuWorld?.worldGen;
      const helpers = getWorldFeedHelpers();
      const dayKey = meta.dayKey || getWorldFeedDayKey();
      const parsed = worldGen?.parseDailyWorldResponse(text, {
        dayKey,
        includeSideQuests: Boolean(meta.includeSideQuests),
        idolNames: helpers.idolNames,
        canonicalIdolName: helpers.canonicalIdolName,
        idol: state.idol
      });
      if (!parsed || !worldGen?.applyDailyWorldGeneration(state, parsed, helpers, dayKey)) {
        if (debugEvent) debugEvent.parseOk = false;
        fallbackDailyWorldToStatic("次 API 返回格式无效，已回退静态池。");
        maybeFollowWorldDirectorAfterPublicWorld(meta, "public_world_parse_failed");
        return;
      }
      if (debugEvent) debugEvent.parseOk = true;
      // 次 API 未给出委托或委托不可用时，避免委托卡在“生成中”，用静态池补齐。
      let sideQuestFellBack = false;
      if (meta.includeSideQuests
        && globalThis.HatsuTasks?.isSandboxTasksActive(state)
        && globalThis.HatsuTasks.getSideQuestGenStatus(state) !== "ready") {
        globalThis.HatsuTasks.refreshSideQuestSlots(state);
        sideQuestFellBack = true;
      }
      saveState();
      render();
      renderSnsApp();
      renderBroadcastApp();
      renderSideQuestOverlay();
      maybeAutoRequestBroadcastFullScript("daily_tick");
      const parts = ["广播主题", "初星圈"];
      if (meta.includeSideQuests && !sideQuestFellBack) parts.push("委托系统");
      showToast("每日世界层已生成", `次 API 已生成${parts.join("、")}${sideQuestFellBack ? "；委托回退静态池" : ""}。`, "info");
      maybeFollowWorldDirectorAfterPublicWorld(meta, "public_world_completed");
      return;
    }

    if (meta.kind === "daily") {
      const parsed = globalThis.HatsuSideQuestApi?.parseSideQuestDailyResponse(
        text,
        meta.dayKey || globalThis.HatsuTasks.getCampusDayKey(state),
        state.idol
      );
      if (!parsed || !globalThis.HatsuTasks.applyGeneratedSideQuests(state, parsed.quests, "secondary")) {
        if (debugEvent) debugEvent.parseOk = false;
        fallbackSideQuestToStatic("次 API 返回格式无效，已回退静态池。");
        return;
      }
      if (debugEvent) debugEvent.parseOk = true;
      saveState();
      render();
      renderSideQuestOverlay();
      showToast("委托已生成", "次 API 已生成本日 3 条小型商演委托。", "info");
      return;
    }

    if (meta.kind === "tier" && Number.isFinite(Number(meta.slotIndex))) {
      const hints = globalThis.HatsuSideQuestApi?.parseSideQuestTierResponse(text);
      if (!hints) {
        if (debugEvent) debugEvent.parseOk = false;
        const slot = state.tasks?.side?.slots?.[meta.slotIndex];
        if (slot) slot.tierGenStatus = "idle";
        saveState();
        openSideQuestTierPanel(meta.slotIndex, { keepOpen: true });
        return;
      }
      if (debugEvent) debugEvent.parseOk = true;
      globalThis.HatsuTasks.applySideQuestTierHints(state, meta.slotIndex, hints);
      saveState();
      openSideQuestTierPanel(meta.slotIndex, { keepOpen: true });
    }
  }

  function updateWorldEngineApiSettingsUI() {
    const enabled = document.getElementById("worldEngineApiEnabled");
    const baseUrl = document.getElementById("worldEngineApiBaseUrl");
    const model = document.getElementById("worldEngineApiModel");
    const key = document.getElementById("worldEngineApiKey");
    const status = document.getElementById("worldEngineApiStatus");
    const staleRecovery = document.getElementById("worldEngineStaleRecoveryBtn");
    const cfg = getSecondaryApiConfig();
    if (enabled) enabled.checked = cfg.enabled;
    if (baseUrl) baseUrl.value = cfg.baseUrl;
    if (model) model.value = cfg.model;
    if (key) key.value = cfg.apiKey;
    if (status) {
      const worldGen = globalThis.HatsuWorld?.worldGen?.ensureDailyGenShape?.(state);
      const worldSource = worldGen?.source || "static";
      const worldStatus = worldGen?.status || "idle";
      const source = state.tasks?.side?.source || "static";
      const genStatus = state.tasks?.side?.genStatus || "idle";
      status.textContent = cfg.enabled
        ? `次 API 已启用 · 世界层：${worldSource}（${worldStatus}） · 委托系统：${source}（${genStatus}）${cfg.apiKey ? " · Key 已保存" : " · 未保存 Key"}`
        : "未启用次 API 时将使用静态工作池。";
    }
    if (staleRecovery) {
      const owner = getSecondaryModelChannelOwner();
      const job = getWorldDirectorState()?.activeJob;
      const exactOwner = globalThis.HatsuWorld?.secondaryChannelOwner?.isSecondaryOwnerMatch?.(owner, {
        jobId: job?.jobId,
        requestId: job?.requestId,
        saveScope: job?.saveScope,
        kind: "director"
      });
      const age = exactOwner ? Math.max(0, Date.now() - Number(owner.acquiredAt || 0)) : 0;
      staleRecovery.hidden = !exactOwner || age < DIRECTOR_MODEL_CHANNEL_TIMEOUT_MS;
    }
    updateWorldEngineStyleSettingsUI();
    updateWorldEngineDensitySettingsUI();
    renderSecondaryApiDebug();
  }

  function setWorldEngineDensityMode(mode) {
    const normalizedMode = ["low", "standard", "high", "custom"].includes(mode) ? mode : "standard";
    document.querySelectorAll("[data-world-engine-density]").forEach((button) => {
      const active = button.dataset.worldEngineDensity === normalizedMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const custom = document.getElementById("worldEngineDensityCustom");
    if (custom) custom.hidden = normalizedMode !== "custom";
  }

  function updateWorldEngineDensitySettingsUI() {
    const api = globalThis.HatsuWorldStorytellerPlan;
    if (!api?.normalizeEventDensityConfig || !api?.resolveEventDensityBudget) return;
    const storyteller = state.freeMode?.world?.storyteller || {};
    const config = api.normalizeEventDensityConfig(storyteller.eventDensityConfig);
    setWorldEngineDensityMode(config.mode);
    const minor = document.getElementById("worldEngineDensityMinor");
    const moderate = document.getElementById("worldEngineDensityModerate");
    const major = document.getElementById("worldEngineDensityMajor");
    if (minor) minor.value = String(config.customBudget.minor);
    if (moderate) moderate.value = String(config.customBudget.moderate);
    if (major) major.value = String(config.customBudget.major);
    const status = document.getElementById("worldEngineDensityStatus");
    if (status) {
      const next = api.resolveEventDensityBudget(config, "crisis_allowed");
      const today = storyteller.plan?.severityBudget || { minor: 0, moderate: 0, major: 0 };
      const modeLabel = { low: "较少", standard: "标准", high: "较多", custom: "自定义" }[config.mode];
      status.textContent = `今日 ${today.minor || 0}/${today.moderate || 0}/${today.major || 0} · 次日 ${modeLabel} ${next.minor}/${next.moderate}/危机+${next.major}`;
    }
  }

  function saveWorldEngineDensitySettings() {
    const selectedMode = document.querySelector("[data-world-engine-density].is-active")?.dataset.worldEngineDensity || "standard";
    const raw = {
      mode: selectedMode,
      customBudget: {
        minor: Number(document.getElementById("worldEngineDensityMinor")?.value),
        moderate: Number(document.getElementById("worldEngineDensityModerate")?.value),
        major: Number(document.getElementById("worldEngineDensityMajor")?.value)
      }
    };
    const values = [raw.customBudget.minor, raw.customBudget.moderate, raw.customBudget.major];
    const total = raw.customBudget.minor + raw.customBudget.moderate;
    if (selectedMode === "custom" && (
      !values.every(Number.isInteger)
      || total < 5
      || total > 12
      || ![0, 1].includes(raw.customBudget.major)
    )) {
      showToast("无法保存", "轻微与中等合计须为 5 至 12，重大须为 0 或 1。", "warn");
      return false;
    }
    const api = globalThis.HatsuWorldStorytellerPlan;
    const storyteller = state.freeMode?.world?.storyteller;
    if (!storyteller || !api?.normalizeEventDensityConfig) return false;
    storyteller.eventDensityConfig = api.normalizeEventDensityConfig(raw);
    saveState("storyteller.density_saved");
    updateWorldEngineDensitySettingsUI();
    renderWorldEnginePhoneApp();
    showToast("事件密度已保存", "新预算将在次日计划生效。", "info");
    return true;
  }

  function updateWorldEngineStyleSettingsUI() {
    const storyteller = state.freeMode?.world?.storyteller || {};
    const config = storyteller.styleConfig || {};
    const active = config.activeMix || { heroic: 60, romance: 40, kaibunsho: 0 };
    const pending = config.pendingMix || active;
    const heroic = document.getElementById("worldEngineHeroicWeight");
    const romance = document.getElementById("worldEngineRomanceWeight");
    const status = document.getElementById("worldEngineStyleStatus");
    if (heroic) heroic.value = String(Number.isFinite(Number(pending.heroic)) ? Number(pending.heroic) : 60);
    if (romance) romance.value = String(Number.isFinite(Number(pending.romance)) ? Number(pending.romance) : 40);
    if (status) {
      const activeLabel = `${Number(active.heroic) || 0}/${Number(active.romance) || 0}`;
      const pendingLabel = `${Number(pending.heroic) || 0}/${Number(pending.romance) || 0}`;
      const activation = String(config.pendingActivationDayKey || "").trim();
      status.textContent = activation
        ? `今日 ${activeLabel} · 次日 ${pendingLabel}（${activation} 生效）`
        : `今日 ${activeLabel} · 尚未设置次日比例`;
    }
  }

  function syncWorldEngineStyleInputs(source = "heroic") {
    const heroic = document.getElementById("worldEngineHeroicWeight");
    const romance = document.getElementById("worldEngineRomanceWeight");
    if (!heroic || !romance) return;
    if (source === "romance") {
      const romanceValue = Math.max(0, Math.min(100, Math.round(Number(romance.value) / 5) * 5));
      romance.value = String(romanceValue);
      heroic.value = String(100 - romanceValue);
      return;
    }
    const heroicValue = Math.max(0, Math.min(100, Math.round(Number(heroic.value) / 5) * 5));
    heroic.value = String(heroicValue);
    romance.value = String(100 - heroicValue);
  }

  function saveWorldEngineStyleMix() {
    const storyteller = state.freeMode?.world?.storyteller;
    const api = globalThis.HatsuWorldStorytellerStyles;
    if (!storyteller || !api?.setPendingMix) return false;
    syncWorldEngineStyleInputs();
    const heroic = Math.max(0, Math.min(100, Math.round(Number(document.getElementById("worldEngineHeroicWeight")?.value || 60) / 5) * 5));
    const mix = { heroic, romance: 100 - heroic, kaibunsho: 0 };
    const currentDayKey = getWorldFeedDayKey();
    const nextDayKey = api.getNextDayKey?.(currentDayKey) || "";
    if (!nextDayKey) {
      showToast("无法保存", "当前游戏日无法确定次日生效时间。", "warn");
      return false;
    }
    storyteller.styleConfig = api.setPendingMix(storyteller.styleConfig, mix, nextDayKey);
    saveState("storyteller.style_pending");
    updateWorldEngineStyleSettingsUI();
    renderWorldEnginePhoneApp();
    showToast("叙事比例已保存", `次日将使用王道 ${heroic}% / 恋爱 ${100 - heroic}% 。`, "info");
    return true;
  }

  function formatSecondaryDebugTime(ts) {
    if (!ts) return "--:--:--";
    try {
      return new Date(ts).toLocaleTimeString("zh-CN", { hour12: false });
    } catch {
      return "--:--:--";
    }
  }

  function renderSecondaryApiDebug() {
    const summaryEl = document.getElementById("worldEngineApiDebugSummary");
    const logEl = document.getElementById("worldEngineApiDebugLog");
    if (summaryEl) {
      const pending = secondaryChannelOwner
        ? (() => {
            const ageSeconds = Math.max(0, Math.floor((Date.now() - Number(secondaryChannelOwner.acquiredAt || 0)) / 1000));
            const scopeLabel = secondaryChannelOwner.saveScope === getSecondaryChannelSaveScope() ? "scope 匹配" : "scope 不匹配";
            const requestSuffix = String(secondaryChannelOwner.requestId || "").slice(-6) || "--";
            return `（在途：${secondaryChannelOwner.kind || "?"} · ${ageSeconds}秒 · ${scopeLabel} · #${requestSuffix}）`;
          })()
        : "（无在途请求）";
      summaryEl.textContent = `${secondaryApiDebug.lastMessage} ${pending}`;
    }
    if (!logEl) return;
    const events = secondaryApiDebug.events;
    if (!events.length) {
      logEl.textContent = "暂无次 API 收发记录。点击「测试次 API 连接」或在沙盒中打开委托面板触发生成。";
      return;
    }
    logEl.textContent = events.map((event) => {
      const time = formatSecondaryDebugTime(event.at);
      if (event.phase === "send") {
        return `[${time}] ▶ 发送 ${event.kind}｜通道 ${event.transport || "?"}｜prompt ${event.promptLength ?? "?"} 字`;
      }
      if (event.phase === "acquire") {
        return `[${time}] ◆ 取得通道 ${event.kind}｜请求 …${event.requestSuffix || "?"}`;
      }
      if (event.phase === "release") {
        return `[${time}] ■ 释放通道｜${event.error || "completed"}｜请求 …${event.requestSuffix || "?"}`;
      }
      if (event.phase === "reject") {
        return `[${time}] × 拒绝 ${event.kind}｜${event.error || "unknown"}｜请求 …${event.requestSuffix || "?"}`;
      }
      const okLabel = event.ok ? "有效回复" : "无有效回复";
      const parseLabel = event.parseOk === true ? "解析成功" : event.parseOk === false ? "解析失败" : "未解析";
      const head = `[${time}] ◀ 回复 ${event.kind}｜${okLabel}｜${parseLabel}｜文本 ${event.textLength ?? 0} 字${event.error ? `｜错误 ${event.error}` : ""}`;
      return head;
    }).join("\n\n");
  }

  function forceSecondaryRegeneration() {
    if (!isSecondaryApiConfigured()) {
      showToast("无法生成", "请先启用并填写完整的次 API 配置。", "warn");
      return;
    }
    if (!globalThis.HatsuTasks?.isSandboxTasksActive(state)) {
      showToast("仅沙盒可用", "委托生成仅在沙盒模式开放。", "warn");
      return;
    }
    if (secondaryChannelOwner) {
      showToast("请求进行中", "已有次 API 请求在途，请稍候。", "warn");
      return;
    }
    secondaryApiDebug.lastMessage = "已请求用次 API 重新生成本日委托…";
    renderSecondaryApiDebug();
    if (shouldUseSecondaryWorldGen()) {
      globalThis.HatsuWorld?.worldGen?.queueDailyWorldGeneration?.(state, getWorldFeedDayKey(), { force: true });
      globalThis.HatsuTasks.queueSideQuestRefresh(state);
      saveState();
      renderSideQuestOverlay();
      maybeRequestDailyWorldGeneration({ suppressDirectorFollowup: true });
    } else {
      globalThis.HatsuTasks.queueSideQuestRefresh(state);
      saveState();
      renderSideQuestOverlay();
      maybeRequestSideQuestGeneration();
    }
  }

  function runSecondaryApiTest() {
    const cfg = getSecondaryApiConfig();
    if (!cfg.baseUrl || !cfg.model) { showToast("无法测试", "请先填写接口地址与模型后再测试。", "warn"); return false; }
    const prompt = "这是一次连接测试。请只回复一行中文：初星次API连接正常。";
    const requestId = createSecondaryRequestId("test");
    const dispatch = acquireSecondaryEntryDispatch("test", requestId);
    if (!dispatch.ok) return false;
    secondaryApiDebug.lastMessage = "测试请求发送中…";
    renderSecondaryApiDebug();
    const sent = requestHostSecondaryPromptSend(prompt, dispatch.owner, { allowDisabled: true });
    if (!sent) {
      releaseSecondaryModelChannel(dispatch.owner.jobId, dispatch.owner.requestId, dispatch.owner.saveScope, "send_failed");
      secondaryApiDebug.lastMessage = "测试未发出：接口地址或模型缺失。";
      renderSecondaryApiDebug();
      showToast("测试未发出", "接口地址或模型缺失，请检查配置。", "warn");
      return false;
    }
    return true;
  }
  function saveWorldEngineApiSettings() {
    saveSecondaryApiSettings({
      enabled: document.getElementById("worldEngineApiEnabled")?.checked,
      baseUrl: document.getElementById("worldEngineApiBaseUrl")?.value,
      model: document.getElementById("worldEngineApiModel")?.value,
      apiKey: document.getElementById("worldEngineApiKey")?.value
    });
    showToast("次 API 配置已保存", isSecondaryApiConfigured() ? "已尝试用次 API 重新生成本日世界层内容。" : "未启用或未填完整接口信息。", "info");
    if (isSecondaryApiConfigured() && isPhoneWorldFeedUnlocked()) {
      // 启用后强制重排当天世界层，避免因当天已是静态 ready 而不再发起次 API 请求。
      globalThis.HatsuWorld?.worldGen?.queueDailyWorldGeneration?.(state, getWorldFeedDayKey(), { force: true });
      if (globalThis.HatsuTasks?.isSandboxTasksActive(state)) {
        globalThis.HatsuTasks.queueSideQuestRefresh(state);
      }
      saveState();
      maybeRequestDailyWorldGeneration();
    } else if (globalThis.HatsuTasks?.shouldUseSecondarySideGen(state)) {
      globalThis.HatsuTasks.queueSideQuestRefresh(state);
      saveState();
      maybeRequestSideQuestGeneration();
    }
  }

  let sideQuestOverlaySlotIndex = null;

  function getSideQuestPoolApi() {
    return globalThis.HatsuSideQuestPool || null;
  }

  function getSideQuestRemainingCount() {
    if (!globalThis.HatsuTasks?.isSandboxTasksActive(state)) return null;
    return globalThis.HatsuTasks.getSideQuestRemaining(state);
  }

  function canOpenSideQuestOverlay() {
    return isSandboxLaunch() && state.sandbox?.inviteComplete && isFreeModeActive();
  }

  function formatSideQuestWalletLabel() {
    ensureStateShape();
    const money = Number(state.tasks?.wallet?.money) || 0;
    const fame = Number(state.tasks?.wallet?.fame) || 0;
    return `${money} 初星币 · 知名度 ${fame}`;
  }

  function isAtSideQuestLocation(slot) {
    if (!slot || state.pendingActionContext?.action !== "map_location") return false;
    const actionContext = state.pendingActionContext?.actionContext || {};
    if (actionContext.isOffCampus) {
      return String(actionContext.outingDestination || actionContext.locationName || "") === String(slot.locationName || "");
    }
    return String(actionContext.locationId || "") === String(slot.locationId || "");
  }

  function startSideQuestJourney(slotIndex) {
    const result = globalThis.HatsuTasks?.setActiveSideQuest(state, slotIndex);
    if (!result?.ok) {
      showToast("无法设为目标", "该委托已完成或尚未刷新。", "warn");
      return;
    }
    saveState();
    closeSideQuestOverlay();
    const destination = result.slot?.locationName || "商店街";
    render();
    showToast("委托目标已设定", `请前往 ${destination} 触发「${result.slot?.title || "今日委托"}」。`, "info");
  }

  function getArrivedSideQuest(locationName) {
    const active = globalThis.HatsuTasks?.getActiveSideQuest(state);
    if (!active || active.locationName !== locationName) return null;
    return active;
  }

  function renderSideQuestOverlay() {
    const pool = getSideQuestPoolApi();
    const slotList = document.getElementById("sideQuestSlotList");
    const tierPanel = document.getElementById("sideQuestTierPanel");
    const hint = document.getElementById("sideQuestOverlayHint");
    if (!slotList || !pool) return;

    const snapshot = getTaskPanelSnapshot();
    const slots = snapshot?.side?.slots || [];
    const remaining = snapshot?.side?.remainingToday ?? 0;
    const genStatus = snapshot?.side?.genStatus || "ready";

    if (hint) {
      const sourceLabel = snapshot?.side?.source === "secondary" ? "次 API" : "静态池";
      const fameTier = pool.getSideQuestFameTier?.(Number(snapshot?.wallet?.fame) || 0)?.label || "商演委托";
      hint.textContent = `今日委托剩余 ${remaining}/3 条 · ${formatSideQuestWalletLabel()} · 档位 ${fameTier} · 来源 ${sourceLabel} · ${genStatus === "loading" || genStatus === "pending" ? "生成中…" : "设为目标后前往对应地点触发"}`;
    }

    if (sideQuestOverlaySlotIndex === null || !slots[sideQuestOverlaySlotIndex]) {
      sideQuestOverlaySlotIndex = null;
      if (tierPanel) tierPanel.hidden = true;
      slotList.hidden = false;
      slotList.innerHTML = "";
      slots.forEach((slot, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "side-quest-slot-button";
        button.disabled = slot.status === "done" || slot.loading || genStatus === "loading" || genStatus === "pending";
        const tagLabel = pool.getTagLabel(slot.tag);
        const statusLabel = slot.status === "done"
          ? `已结算 · ${pool.SIDE_TIER_META[slot.resultTier]?.label || slot.resultTier || "完成"}`
          : state.tasks?.side?.activeSlotIndex === index
            ? "当前目标"
            : "待前往";
        const locationLabel = slot.locationName ? `地点 · ${slot.locationName}` : "地点 · 待确认";
        button.innerHTML = `<strong>${slot.title}</strong><span class="side-quest-slot-tag">${tagLabel} · ${locationLabel}</span><span class="side-quest-slot-status">${statusLabel}</span><span class="side-quest-slot-desc">${slot.desc}</span>`;
        button.addEventListener("click", () => openSideQuestTierPanel(index));
        slotList.appendChild(button);
      });
      return;
    }

    openSideQuestTierPanel(sideQuestOverlaySlotIndex, { keepOpen: true });
  }

  function openSideQuestTierPanel(slotIndex, options = {}) {
    const pool = getSideQuestPoolApi();
    const slotList = document.getElementById("sideQuestSlotList");
    const tierPanel = document.getElementById("sideQuestTierPanel");
    const titleEl = document.getElementById("sideQuestTierTitle");
    const descEl = document.getElementById("sideQuestTierDesc");
    const buttonsEl = document.getElementById("sideQuestTierButtons");
    if (!pool || !tierPanel || !buttonsEl) return;

    ensureStateShape();
    globalThis.HatsuTasks?.syncSideQuestDay(state);
    const slot = state.tasks?.side?.slots?.[slotIndex];
    if (!slot || slot.status === "done") {
      if (!options.keepOpen) {
        sideQuestOverlaySlotIndex = null;
        renderSideQuestOverlay();
      }
      return;
    }

    sideQuestOverlaySlotIndex = slotIndex;
    if (slotList) slotList.hidden = true;
    tierPanel.hidden = false;
    if (titleEl) titleEl.textContent = slot.title;
    const locationLabel = slot.locationName ? `完成地点：${slot.locationName}` : "完成地点：待确认";
    if (descEl) descEl.textContent = `${pool.getTagLabel(slot.tag)} · ${locationLabel} · ${slot.desc}`;

    buttonsEl.innerHTML = "";
    const active = state.tasks?.side?.activeSlotIndex === slotIndex;
    const targetButton = document.createElement("button");
    targetButton.type = "button";
    targetButton.className = "side-quest-tier-button";
    targetButton.innerHTML = `<strong>${active ? "已设为当前目标" : "设为当前目标"}</strong><span>之后从地图前往 ${slot.locationName || "委托地点"} 触发该商业委托。</span><span class="side-quest-tier-reward">抵达后进入委托现场</span>`;
    targetButton.addEventListener("click", () => startSideQuestJourney(slotIndex));
    buttonsEl.appendChild(targetButton);
  }

  function applySideQuestTierChoice(slotIndex, tier) {
    const pool = getSideQuestPoolApi();
    const result = globalThis.HatsuTasks?.applySideQuestTier(state, slotIndex, tier);
    if (!result?.ok) {
      showToast("无法结算", "该委托已完成或档位无效。", "warn");
      return;
    }
    saveState();
    processSandboxQuestAfterSettlement();
    render();
    sideQuestOverlaySlotIndex = null;
    renderSideQuestOverlay();
    const taskPanelOverlay = document.getElementById("taskPanelOverlay");
    if (taskPanelOverlay && !taskPanelOverlay.hidden) renderTaskPanelOverlay();
    const tierLabel = pool?.SIDE_TIER_META[tier]?.label || tier;
    const money = result.reward?.money || 0;
    const fame = result.reward?.fame || 0;
    const slot = state.tasks?.side?.slots?.[slotIndex];
    appendEveningJournalTask("商业委托", slot?.title ? `${slot.title} · ${tierLabel}` : tierLabel);
    showToast("委托结算完成", `${tierLabel} · 获得 ${money} 初星币 · 知名度+${fame}`, "gold");
  }

  function openSideQuestOverlay() {
    if (!canOpenSideQuestOverlay()) {
      showToast("尚未开放", "完成担当邀请剧情后可接亚纱里老师登记的委托。", "warn");
      return;
    }
    globalThis.HatsuTasks?.syncSideQuestDay(state);
    sideQuestOverlaySlotIndex = null;
    setElementHidden("sideQuestOverlay", false);
    renderSideQuestOverlay();
    maybeRequestSideQuestGeneration();
  }

  function closeSideQuestOverlay() {
    sideQuestOverlaySlotIndex = null;
    setElementHidden("sideQuestOverlay", true);
  }

  function canOpenTaskPanelOverlay() {
    return isSandboxLaunch() && state.sandbox?.inviteComplete && isFreeModeActive();
  }

  function formatMainQuestStatusLabel(status) {
    if (status === "completed") return "已完成";
    if (status === "active") return "进行中";
    return "未解锁";
  }

  function formatMainQuestStatusClass(status) {
    if (status === "completed") return "is-completed";
    if (status === "active") return "is-active";
    return "is-locked";
  }

  function startSecondIdolScoutFromTaskPanel(idolName) {
    const canonical = canonicalIdolName(idolName);
    const result = globalThis.HatsuTasks?.beginSecondIdolScout?.(state, canonical);
    if (!result?.ok) {
      showToast("无法开启物色", "第二个担当尚未解锁，或该偶像不可选。", "warn");
      return;
    }
    closeTaskPanelOverlay();
    startSandboxInviteStory(canonical);
    saveState();
    showToast("第二个担当", `亚纱里老师已登记下一项物色课题：${canonical}。`, "gold");
  }

  function renderTaskPanelSecondIdolSection(snapshot, mainList) {
    if (!mainList || !snapshot?.secondIdol?.unlocked) return;
    const candidates = snapshot.secondIdol.candidates || [];
    if (!candidates.length) return;
    const section = document.createElement("details");
    section.className = "task-panel-group is-pink";
    section.open = true;
    const summary = document.createElement("summary");
    summary.className = "task-panel-group-summary";
    const indexEl = document.createElement("span");
    indexEl.className = "task-panel-group-index";
    indexEl.textContent = "特";
    const textWrap = document.createElement("span");
    textWrap.className = "task-panel-group-text";
    const titleEl = document.createElement("strong");
    titleEl.textContent = "第二个担当";
    const subtitleEl = document.createElement("span");
    subtitleEl.textContent = "首名担当已完成全部课题，可物色下一名偶像";
    textWrap.append(titleEl, subtitleEl);
    summary.append(indexEl, textWrap);
    section.appendChild(summary);
    const questList = document.createElement("div");
    questList.className = "task-panel-group-list";
    const hint = document.createElement("p");
    hint.className = "task-panel-hint";
    hint.textContent = "选择一名尚未担任你偶像的学园成员，开启她的担当物色课题。";
    questList.appendChild(hint);
    candidates.forEach((name) => {
      const profile = idols[name];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "event-button secondary task-panel-action";
      btn.textContent = `物色 ${name}`;
      if (profile?.theme) {
        btn.style.borderColor = profile.theme;
      }
      btn.addEventListener("click", () => startSecondIdolScoutFromTaskPanel(name));
      questList.appendChild(btn);
    });
    section.appendChild(questList);
    mainList.prepend(section);
  }

  function renderTaskPanelOverlay() {
    const snapshot = getTaskPanelSnapshot();
    if (!snapshot) return;
    const pool = getSideQuestPoolApi();
    const summary = document.getElementById("taskPanelSummary");
    const metrics = document.getElementById("taskPanelMetrics");
    const mainList = document.getElementById("taskPanelMainList");
    const sideList = document.getElementById("taskPanelSideList");
    const sideMeta = document.getElementById("taskPanelSideMeta");
    const campusMeta = document.getElementById("taskPanelCampusMeta");
    const campusHint = document.getElementById("taskPanelCampusHint");
    const openSideBtn = document.getElementById("taskPanelOpenSideQuestBtn");
    const adviceEl = document.getElementById("taskPanelAdvice");
    if (!mainList || !sideList) return;

    const wallet = Number(snapshot.wallet?.money) || 0;
    const fame = Number(snapshot.wallet?.fame) || 0;
    const sideRemaining = snapshot.side?.remainingToday ?? 0;
    const sideMax = snapshot.side?.maxPerDay ?? 3;
    const campusRemaining = snapshot.campus?.remainingToday ?? 3;
    const campusMax = snapshot.campus?.maxPerDay ?? 3;
    const sideSource = snapshot.side?.source === "secondary" ? "次 API" : snapshot.side?.source === "static" ? "静态池" : "待刷新";
    const genStatus = snapshot.side?.genStatus || "idle";

    const categoryMeta = {
      scout: { index: "01", title: "担当确认", subtitle: "调查、观察与担当选择", tone: "pink" },
      relationship: { index: "02", title: "培养与担当关系", subtitle: "好感度里程碑课题", tone: "blue" },
      conflict: { index: "03", title: "主线矛盾课题", subtitle: "解决担当面对的问题", tone: "violet" },
      ability: { index: "04", title: "偶像能力培养", subtitle: "数值阶段目标", tone: "mint" },
      work: { index: "05", title: "工作邀约", subtitle: "知名度与外部委托", tone: "gold" },
      final: { index: "06", title: "舞台终极任务", subtitle: "First Live 与最终成果", tone: "red" },
      main: { index: "00", title: "阶段课题", subtitle: "亚纱里老师记录", tone: "blue" }
    };
    const categoryOrder = ["scout", "relationship", "conflict", "ability", "work", "final", "main"];
    const adviceLines = [
      "至少让我帮上你一点忙吧。多多依赖老师一些也可以的哦？",
      "Producer同伴之间的横向联系，说不定会成为拯救你手下偶像的关键力量。",
      "老师我可是认真的哦！先整理课题，再决定今天的行动。",
      "你是让我引以为傲的学生。不过报告书，还是要按时交哦？",
      "真是不错的回答。接下来，把观察记录变成能执行的培养方针吧。"
    ];

    const activeCount = (snapshot.main || []).filter((quest) => quest.status === "active").length;
    const completedCount = (snapshot.main || []).filter((quest) => quest.status === "completed").length;
    const adviceIndex = Math.abs((Number(state.freeMode?.postLiveDay || state.day || 0) + activeCount + completedCount) % adviceLines.length);

    if (summary) {
      summary.textContent = `${snapshot.idol || "担当偶像"} 的课题档案 · 已完成 ${completedCount}/${(snapshot.main || []).length} · 知名度 ${fame}`;
    }
    if (adviceEl) {
      adviceEl.textContent = `“${adviceLines[adviceIndex]}”`;
    }

    if (metrics) {
      metrics.innerHTML = "";
      [
        ["担当", snapshot.idol || "未确认"],
        ["初星币", wallet],
        ["知名度", fame],
        ["委托", `${sideRemaining}/${sideMax}`],
        ["校园", `${campusRemaining}/${campusMax}`]
      ].forEach(([label, value]) => {
        const pill = document.createElement("span");
        pill.className = "task-panel-metric";
        const labelEl = document.createElement("b");
        labelEl.textContent = label;
        const valueEl = document.createElement("span");
        valueEl.textContent = String(value);
        pill.append(labelEl, valueEl);
        metrics.appendChild(pill);
      });
    }

    if (sideMeta) {
      sideMeta.textContent = `剩 ${sideRemaining}/${sideMax} · ${sideSource}`;
    }
    if (campusMeta) {
      campusMeta.textContent = `剩 ${campusRemaining}/${campusMax}`;
    }
    if (campusHint) {
      campusHint.textContent = campusRemaining > 0
        ? "在地图进入教学楼上课，或体育馆、部门楼、特教楼训练。上课与训练合计每日 3 次。"
        : "今日校园次数已用完，明日可继续在教学楼或训练设施成长。";
    }
    if (openSideBtn) {
      openSideBtn.disabled = !canOpenSideQuestOverlay() || genStatus === "loading" || genStatus === "pending";
      openSideBtn.textContent = sideRemaining > 0 ? "打开委托结算" : "今日委托已全部结算";
    }

    const grouped = categoryOrder.reduce((acc, key) => ({ ...acc, [key]: [] }), {});
    (snapshot.main || []).forEach((quest) => {
      const key = categoryMeta[quest.category] ? quest.category : "main";
      grouped[key].push(quest);
    });
    const firstActiveCategory = categoryOrder.find((key) => grouped[key]?.some((quest) => quest.status === "active"));
    const fallbackOpenCategory = categoryOrder.find((key) => grouped[key]?.length);

    mainList.innerHTML = "";
    renderTaskPanelSecondIdolSection(snapshot, mainList);
    categoryOrder.forEach((key) => {
      const quests = grouped[key] || [];
      if (!quests.length) return;
      const meta = categoryMeta[key] || categoryMeta.main;
      const completed = quests.filter((quest) => quest.status === "completed").length;
      const active = quests.filter((quest) => quest.status === "active").length;
      const details = document.createElement("details");
      details.className = `task-panel-group is-${meta.tone}`;
      details.open = key === (firstActiveCategory || fallbackOpenCategory);

      const groupSummary = document.createElement("summary");
      groupSummary.className = "task-panel-group-summary";
      const indexEl = document.createElement("span");
      indexEl.className = "task-panel-group-index";
      indexEl.textContent = meta.index;
      const textWrap = document.createElement("span");
      textWrap.className = "task-panel-group-text";
      const titleEl = document.createElement("strong");
      titleEl.textContent = meta.title;
      const subtitleEl = document.createElement("span");
      subtitleEl.textContent = active > 0 ? `${meta.subtitle} · 进行中 ${active}` : meta.subtitle;
      textWrap.append(titleEl, subtitleEl);
      const countEl = document.createElement("b");
      countEl.className = "task-panel-group-count";
      countEl.textContent = `${completed}/${quests.length}`;
      groupSummary.append(indexEl, textWrap, countEl);
      details.appendChild(groupSummary);

      const questList = document.createElement("div");
      questList.className = "task-panel-group-list";
      quests.forEach((quest) => {
        const item = document.createElement("article");
        item.className = `task-panel-main-item ${formatMainQuestStatusClass(quest.status)}`;
        const statusClass = formatMainQuestStatusClass(quest.status);
        const statusLabel = formatMainQuestStatusLabel(quest.status);
        const stepLine = quest.status === "active" && Number(quest.step) > 0 ? ` · 阶段 ${quest.step}` : "";
        const statusEl = document.createElement("span");
        statusEl.className = `task-panel-status ${statusClass}`;
        statusEl.textContent = `${statusLabel}${stepLine}`;
        const title = document.createElement("strong");
        title.textContent = quest.title || quest.id;
        item.append(statusEl, title);
        if (quest.conflict) {
          const conflict = document.createElement("span");
          conflict.textContent = quest.conflict;
          item.appendChild(conflict);
        }
        if (quest.progressHint) {
          const hint = document.createElement("span");
          hint.className = "task-panel-progress-hint";
          hint.textContent = quest.progressHint;
          item.appendChild(hint);
        }
        const progress = document.createElement("span");
        progress.className = "task-panel-progress-bar";
        const fill = document.createElement("i");
        const ratio = quest.status === "completed" ? 1 : quest.status === "active" ? Math.max(0.16, Math.min(0.85, (Number(quest.step) || 1) / 3)) : 0.05;
        fill.style.width = `${Math.round(ratio * 100)}%`;
        progress.appendChild(fill);
        item.appendChild(progress);
        questList.appendChild(item);
      });
      details.appendChild(questList);
      mainList.appendChild(details);
    });

    sideList.innerHTML = "";
    const slots = snapshot.side?.slots || [];
    if (!slots.length) {
      const empty = document.createElement("p");
      empty.className = "task-panel-hint";
      empty.textContent = "今日委托尚未刷新。";
      sideList.appendChild(empty);
    } else {
      slots.forEach((slot, index) => {
        const item = document.createElement("article");
        item.className = "task-panel-side-item";
        const tagLabel = pool?.getTagLabel?.(slot.tag) || slot.tag || "综合";
        const statusLabel = slot.status === "done"
          ? `已结算 · ${pool?.SIDE_TIER_META?.[slot.resultTier]?.label || slot.resultTier || "完成"}`
          : slot.loading || genStatus === "loading" || genStatus === "pending"
            ? "生成中"
            : snapshot.side?.activeSlotIndex === index
              ? "当前目标"
              : "待前往";
        const title = document.createElement("strong");
        title.textContent = slot.title || `委托 ${index + 1}`;
        const meta = document.createElement("span");
        meta.textContent = `${tagLabel} · ${statusLabel} · ${slot.locationName ? `地点：${slot.locationName}` : "地点：待确认"}`;
        const desc = document.createElement("span");
        desc.textContent = slot.desc || "";
        item.append(title, meta, desc);
        sideList.appendChild(item);
      });
    }
  }
  function openTaskPanelOverlay() {
    if (!canOpenTaskPanelOverlay()) {
      showToast("尚未开放", "完成担当邀请剧情后可查看亚纱里老师课题。", "warn");
      return;
    }
    globalThis.HatsuTasks?.syncSideQuestDay(state);
    setElementHidden("taskPanelOverlay", false);
    renderTaskPanelOverlay();
  }

  function closeTaskPanelOverlay() {
    setElementHidden("taskPanelOverlay", true);
  }

  const giftShopUi = { tab: "shop", pendingItemId: "" };

  function getGiftShopApi() {
    return globalThis.HatsuGiftShop || null;
  }

  function canOpenGiftShop() {
    return isSandboxLaunch() && state.sandbox?.inviteComplete && isFreeModeActive() && Boolean(getGiftShopApi());
  }

  function setGiftShopTab(tab) {
    giftShopUi.tab = tab === "bag" ? "bag" : "shop";
    giftShopUi.pendingItemId = "";
    renderGiftShopOverlay();
  }

  function openGiftShopOverlay(tab = "shop") {
    if (!canOpenGiftShop()) {
      showToast("尚未开放", "沙盒模式确定担当后可使用小卖部商店。", "warn");
      return;
    }
    giftShopUi.tab = tab === "bag" ? "bag" : "shop";
    giftShopUi.pendingItemId = "";
    setElementHidden("giftShopOverlay", false);
    renderGiftShopOverlay();
  }

  function closeGiftShopOverlay() {
    setElementHidden("giftShopOverlay", true);
    giftShopUi.pendingItemId = "";
  }

  function openGiftShopFromMapLocation() {
    closeMapLocationOverlay();
    openGiftShopOverlay("shop");
  }

  function openGiftBagFromFreeMode() {
    openGiftShopOverlay("bag");
  }

  function buildGiftShopRecipients() {
    ensureFreeModeRelationships();
    if (typeof ensureFreeModeNpcRelationships === "function") ensureFreeModeNpcRelationships();
    const current = getCurrentAffinityIdolName();
    const idolRows = Object.keys(idols).map((idolName) => {
      const relationship = getFreeModeRelationship(idolName, { create: false });
      const score = clampFreeModeRelationshipScore(relationship?.好感度 || 0);
      return {
        type: "idol",
        key: getGiftShopApi()?.buildRecipientKey("idol", idolName) || `idol:${idolName}`,
        name: idolName,
        role: idolName === current ? "担当偶像" : (idolSchoolClasses[idolName] || "偶像科"),
        score,
        avatar: idols[idolName]?.avatar || "",
        theme: idols[idolName]?.theme || "#ff7bb0"
      };
    });
    const npcRows = Object.entries(residentNpcProfiles).map(([npcName, profile]) => {
      const relationship = getFreeModeNpcRelationship(npcName, { create: false });
      const score = clampFreeModeRelationshipScore(relationship?.好感度 || 0);
      return {
        type: "npc",
        key: getGiftShopApi()?.buildRecipientKey("npc", npcName) || `npc:${npcName}`,
        name: npcName,
        role: profile.publicLabel || profile.statusLabel || "NPC",
        score,
        avatar: profile.avatar || "",
        theme: profile.theme || "#6f9cff"
      };
    });
    return [...idolRows, ...npcRows].sort((a, b) => {
      if (a.name === current) return -1;
      if (b.name === current) return 1;
      return b.score - a.score || a.type.localeCompare(b.type) || a.name.localeCompare(b.name, "zh-Hans-CN");
    });
  }

  function applyGiftShopAffinity(recipient, affinity) {
    if (!recipient?.name || !affinity) return null;
    if (recipient.type === "npc") {
      if (typeof getFreeModeNpcRelationship !== "function") return null;
      const entry = getFreeModeNpcRelationship(recipient.name);
      if (!entry) return null;
      entry.好感度 = clampFreeModeRelationshipScore((entry.好感度 || 0) + affinity);
      entry.更新日 = Number(state.freeMode?.postLiveDay || state.day || 1);
      return { type: "npc", name: recipient.name, score: entry.好感度, delta: affinity };
    }
    const entry = getFreeModeRelationship(recipient.name);
    if (!entry) return null;
    entry.好感度 = clampFreeModeRelationshipScore((entry.好感度 || 0) + affinity);
    entry.更新日 = Number(state.freeMode?.postLiveDay || state.day || 1);
    if (recipient.name === state.idol) {
      state.trust = clamp(entry.好感度, 0, 100);
    }
    return { type: "idol", name: recipient.name, score: entry.好感度, delta: affinity };
  }

  function renderGiftShopOverlay() {
    const shop = getGiftShopApi();
    if (!shop) return;
    shop.ensureInventory(state);
    const walletBadge = document.getElementById("giftShopWalletBadge");
    const hint = document.getElementById("giftShopHint");
    const catalog = document.getElementById("giftShopCatalog");
    const bag = document.getElementById("giftShopBag");
    const givePanel = document.getElementById("giftShopGivePanel");
    const tabBuy = document.getElementById("giftShopTabBuy");
    const tabBag = document.getElementById("giftShopTabBag");
    const money = shop.getWalletMoney(state);
    if (walletBadge) walletBadge.textContent = `初星币 ${money}`;
    if (tabBuy) tabBuy.classList.toggle("is-active", giftShopUi.tab === "shop" && !giftShopUi.pendingItemId);
    if (tabBag) tabBag.classList.toggle("is-active", giftShopUi.tab === "bag" || Boolean(giftShopUi.pendingItemId));
    const choosingRecipient = Boolean(giftShopUi.pendingItemId);
    if (catalog) catalog.hidden = giftShopUi.tab !== "shop" || choosingRecipient;
    if (bag) bag.hidden = giftShopUi.tab !== "bag" || choosingRecipient;
    if (givePanel) givePanel.hidden = !choosingRecipient;
    if (hint) {
      hint.hidden = choosingRecipient;
      hint.textContent = giftShopUi.tab === "bag"
        ? "背包中的礼物可赠送给担当、其他偶像或 NPC，提升好感度。"
        : "用任务获得的初星币购买礼物。购买后可在背包中赠送给在场或不在场的对象。";
    }
    if (giftShopUi.tab === "shop" && !choosingRecipient) renderGiftShopCatalog();
    if (giftShopUi.tab === "bag" && !choosingRecipient) renderGiftShopBag();
    if (choosingRecipient) renderGiftShopGivePanel();
    updateFreeModeBagButton();
  }

  function renderGiftShopCatalog() {
    const shop = getGiftShopApi();
    const catalog = document.getElementById("giftShopCatalog");
    if (!shop || !catalog) return;
    catalog.innerHTML = "";
    const money = shop.getWalletMoney(state);
    shop.GIFT_CATALOG.forEach((item) => {
      const card = document.createElement("article");
      card.className = "gift-shop-card";
      const icon = document.createElement("span");
      icon.className = "gift-shop-card-icon";
      icon.style.background = `linear-gradient(145deg, ${item.tone || "#ff9fbe"}, rgba(255,255,255,0.2))`;
      icon.textContent = item.short || item.name.slice(0, 1);
      const copy = document.createElement("div");
      copy.className = "gift-shop-card-copy";
      const title = document.createElement("strong");
      title.textContent = item.name;
      const desc = document.createElement("span");
      desc.className = "gift-shop-card-desc";
      desc.textContent = item.desc;
      const meta = document.createElement("span");
      meta.className = "gift-shop-card-meta";
      meta.textContent = `${item.price} 初星币 · 好感 +${item.affinity}`;
      copy.append(title, desc, meta);
      const buyBtn = document.createElement("button");
      buyBtn.type = "button";
      buyBtn.className = "event-button primary gift-shop-buy-btn";
      buyBtn.textContent = money >= item.price ? "购买" : "初星币不足";
      buyBtn.disabled = money < item.price;
      buyBtn.addEventListener("click", () => handleGiftShopBuy(item.id));
      card.append(icon, copy, buyBtn);
      catalog.appendChild(card);
    });
  }

  function renderGiftShopBag() {
    const shop = getGiftShopApi();
    const bag = document.getElementById("giftShopBag");
    if (!shop || !bag) return;
    bag.innerHTML = "";
    const entries = shop.getInventoryList(state);
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "gift-shop-empty";
      empty.textContent = "背包还是空的。先去购买礼物吧。";
      bag.appendChild(empty);
      return;
    }
    entries.forEach((entry) => {
      const row = document.createElement("article");
      row.className = "gift-shop-bag-item";
      const icon = document.createElement("span");
      icon.className = "gift-shop-card-icon";
      icon.style.background = `linear-gradient(145deg, ${entry.tone || "#ff9fbe"}, rgba(255,255,255,0.2))`;
      icon.textContent = entry.short || entry.name.slice(0, 1);
      const copy = document.createElement("div");
      copy.className = "gift-shop-card-copy";
      const title = document.createElement("strong");
      title.textContent = `${entry.name} x${entry.count}`;
      const meta = document.createElement("span");
      meta.className = "gift-shop-card-meta";
      meta.textContent = `赠送后好感 +${entry.affinity}`;
      copy.append(title, meta);
      const giveBtn = document.createElement("button");
      giveBtn.type = "button";
      giveBtn.className = "event-button secondary gift-shop-give-btn";
      giveBtn.textContent = "赠送";
      giveBtn.addEventListener("click", () => {
        giftShopUi.pendingItemId = entry.id;
        renderGiftShopOverlay();
      });
      row.append(icon, copy, giveBtn);
      bag.appendChild(row);
    });
  }

  function renderGiftShopGivePanel() {
    const shop = getGiftShopApi();
    const item = shop?.getCatalogItem(giftShopUi.pendingItemId);
    const title = document.getElementById("giftShopGiveTitle");
    const hint = document.getElementById("giftShopGiveHint");
    const list = document.getElementById("giftShopRecipientList");
    if (!shop || !item || !list) return;
    if (title) title.textContent = `赠送 ${item.name}`;
    if (hint) hint.textContent = `选择赠送对象。偶像好感 +${item.affinity}，NPC 好感 +${shop.getGiftAffinityGain(item, "npc")}。`;
    list.innerHTML = "";
    buildGiftShopRecipients().forEach((row) => {
      const gain = shop.getGiftAffinityGain(item, row.type);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `gift-shop-recipient-btn is-${row.type}`;
      if (row.avatar) {
        const avatar = document.createElement("img");
        avatar.className = "gift-shop-recipient-avatar";
        avatar.src = row.avatar;
        avatar.alt = row.name;
        button.appendChild(avatar);
      }
      const copy = document.createElement("span");
      copy.className = "gift-shop-recipient-copy";
      const name = document.createElement("strong");
      name.textContent = row.name;
      const role = document.createElement("span");
      role.textContent = `${row.role} · 当前 ${row.score}/100 · 赠送 +${gain}`;
      copy.append(name, role);
      button.append(copy);
      button.addEventListener("click", () => handleGiftShopGive(item.id, row.key));
      list.appendChild(button);
    });
  }

  function handleGiftShopBuy(itemId) {
    const shop = getGiftShopApi();
    if (!shop) return;
    const result = shop.buyGift(state, itemId, 1);
    if (!result.ok) {
      showToast("购买失败", result.error || "无法购买这件礼物。", "warn");
      return;
    }
    saveState();
    renderGiftShopOverlay();
    render();
    showToast("购买成功", `获得 ${result.item.name}，花费 ${result.spent} 初星币。`, "gold");
  }

  function buildGiftGivingPrompt(item, recipient, applied) {
    const recipientName = String(recipient?.name || "").trim();
    const isNpc = recipient?.type === "npc";
    const profile = isNpc
      ? residentNpcProfiles[recipientName] || {}
      : idols[canonicalIdolName(recipientName)] || {};
    const role = isNpc
      ? (profile.publicLabel || profile.statusLabel || "NPC")
      : (recipientName === state.idol ? "担当偶像" : (idolSchoolClasses[recipientName] || "偶像科"));
    const core = isNpc
      ? (profile.promptLine || profile.publicLabel || "")
      : (profile.core || "");
    const affinityLine = isNpc
      ? `当前好感度：${applied?.score ?? getFreeModeNpcRelationshipScore(recipientName)}/100`
      : `${getContactAffinityStageLine(recipientName)}（当前好感度：${applied?.score ?? getFreeModeRelationshipScore(recipientName)}/100）`;
    const locationId = state.freeMode?.activeLocationId || "student_store";
    const location = getWorldMapLocation(locationId);
    const locationName = location?.name || "初星学园";
    const locationDesc = location?.description || "学园内的日常场所。";
    const producerIdol = getCurrentAffinityIdolName() || state.idol || "未确认担当";
    const castLine = isNpc
      ? `登场角色：制作人、${recipientName}`
      : recipientName === producerIdol
        ? `登场角色：制作人、担当偶像 ${recipientName}`
        : `登场角色：制作人、${recipientName}（非担当偶像）`;
    return `[初星育成系统：礼物赠送]

${castLine}
制作人担当：${producerIdol}
赠送对象：${recipientName}（${role}）
${affinityLine}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按赠送对象写"}
当前阶段：${getPhase()}
当前时间：${formatCampusDayLabel()} ${formatFreeModeClock()}
地点：${locationName}
地点说明：${locationDesc}

礼物名称：${item.name}
礼物说明：${item.desc}
前端已结算：赠送完成后好感 +${applied?.delta || 0}（当前 ${applied?.score ?? 0}/100）

对象设定：
${core || "按学园公开人设自然发挥。"}
${buildProducerPromptSection()}

叙事要求：
- 写制作人找到对方并当面赠送 ${item.name} 的短场景，重点写对方收到礼物后的反应与互动。
- 不消耗行动、不推进日程；不要改算前端已结算的好感数值，也不要输出 relationship_update。
- 若对方是 NPC，以日常对话与反应为主；若对方是非担当偶像，保持学园内的自然距离感。
- 礼物描写要贴合「${item.name}」与说明，不要写成其他物品。

${outputContract("请写 700 字以内的完整送礼场景，自然收束，不要待续。")}`;
  }

  function beginGiftGivingStory(item, recipient, applied) {
    const recipientName = String(recipient?.name || "").trim();
    if (!item || !recipientName) return;
    const prompt = buildGiftGivingPrompt(item, recipient, applied);
    const requestId = createRequestId();
    // 赠礼是普通叙事，不是选项流程。清理可能遗留的地图/选项上下文，
    // 否则赠礼回复会在 applyAiReply 命中 choice 兜底，被硬塞地点选项。
    state.pendingActionContext = null;
    state.eventMode = "none";
    state.choiceStep = 0;
    state.pendingOptionTexts = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    state.activeStoryNode = {
      type: "gift",
      itemId: item.id,
      recipientType: recipient.type === "npc" ? "npc" : "idol",
      recipientName,
      affinityDelta: Number(applied?.delta) || 0,
      ready: false
    };
    state.lastPrompt = prompt;
    state.lastStory = `正在将 ${item.name} 送给 ${recipientName}...`;
    saveState();
    renderNotebook();
    closeGiftShopOverlay();
    giftShopUi.pendingItemId = "";
    pendingAiRequestId = requestId;
    openEventOverlay(
      `赠送礼物 · ${recipientName}`,
      "礼物已送出，好感已由前端结算。正在生成对方收到礼物后的反应剧情。",
      buildAiWaitingStory(`正在等待 ${recipientName} 收到 ${item.name} 后的反应。`)
    );
    if (!requestHostPromptSend(prompt, requestId)) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制送礼剧情提示词后手动发送。");
    }
  }

  function handleGiftShopGive(itemId, recipientKey) {
    const shop = getGiftShopApi();
    if (!shop) return;
    const result = shop.giveGift(state, itemId, recipientKey);
    if (!result.ok) {
      showToast("赠送失败", result.error || "无法赠送这件礼物。", "warn");
      return;
    }
    const applied = applyGiftShopAffinity(result.recipient, result.affinity);
    if (!applied) {
      showToast("赠送失败", "未能更新好感度。", "warn");
      return;
    }
    saveState();
    render();
    const affinityOverlay = document.getElementById("affinityOverlay");
    if (affinityOverlay && !affinityOverlay.hidden) renderAffinityOverlay();
    beginGiftGivingStory(result.item, result.recipient, applied);
  }

  function updateFreeModeBagButton() {
    const bagBtn = document.getElementById("freeModeBagBtn");
    const bagBadge = document.getElementById("freeModeBagBadge");
    const shop = getGiftShopApi();
    if (!bagBtn) return;
    const show = canOpenGiftShop();
    bagBtn.hidden = !show;
    if (!show) return;
    const total = shop?.getTotalInventoryCount(state) || 0;
    if (bagBadge) {
      bagBadge.textContent = total > 0 ? String(total) : "";
      bagBadge.hidden = total <= 0;
    }
  }

  function updateMapLocationShopButton(locationId) {
    const shopBtn = document.getElementById("mapLocationShopBtn");
    if (!shopBtn) return;
    shopBtn.hidden = locationId !== "student_store" || !canOpenGiftShop();
  }

  function openSideQuestFromTaskPanel() {
    closeTaskPanelOverlay();
    openSideQuestOverlay();
  }

  function getCurrentAffinityIdolName() {
    const canonical = canonicalIdolName(state.idol);
    return canonical && idols[canonical] ? canonical : "";
  }

  function canOpenAffinityOverlay() {
    return isFreeModeActive() && Boolean(getCurrentAffinityIdolName());
  }

  function getSelectBackgroundUrl(idolName) {
    const code = selectBackgroundCodes[idolName] || affinityIdolCodes[idolName]?.toLowerCase();
    if (!code) return "";
    return `./assets/select-bg/${code}.jpg`;
  }

  let activeAffinityTab = "current";

  function buildAffinityStatusRows(idolName, score, threshold) {
    const node = affinityNodes[threshold] || {};
    const nextThreshold = affinityThresholds.find((value) => value > score);
    const relationship = getFreeModeRelationship(idolName, { create: false });
    const updateDay = Number(relationship?.更新日) || 0;
    return [
      { icon: "icon-heart", label: "好感阶段", value: node.title || "初识" },
      { icon: "icon-book", label: "班级", value: idolSchoolClasses[idolName] || "初星学园" },
      { icon: "icon-star", label: "性格标签", value: idols[idolName]?.tag || "—" },
      { icon: "icon-calendar", label: "最近互动", value: updateDay > 0 ? `第 ${updateDay} 日` : "尚未互动" },
      {
        icon: "icon-point",
        label: "距下一阶段",
        value: nextThreshold ? `还需 ${nextThreshold - score} 点` : "已达满阶"
      }
    ];
  }

  function getRelationshipLevelLabel(score) {
    if (score >= 80) return "亲密";
    if (score >= 60) return "信赖";
    if (score >= 40) return "熟悉";
    if (score >= 20) return "认识";
    return "初识";
  }

  function buildSecondaryRelationshipRows() {
    ensureFreeModeRelationships();
    if (typeof ensureFreeModeNpcRelationships === "function") ensureFreeModeNpcRelationships();
    const current = getCurrentAffinityIdolName();
    const idolRows = Object.keys(idols)
      .filter((idolName) => idolName !== current)
      .map((idolName) => {
        const relationship = getFreeModeRelationship(idolName, { create: false });
        const score = clampFreeModeRelationshipScore(relationship?.好感度 || 0);
        return {
          type: "idol",
          name: idolName,
          role: idolSchoolClasses[idolName] || "偶像科",
          score,
          updateDay: Number(relationship?.更新日) || 0,
          avatar: idols[idolName]?.avatar || "",
          theme: idols[idolName]?.theme || "#ff7bb0"
        };
      });
    const npcRows = Object.entries(residentNpcProfiles).map(([npcName, profile]) => {
      const relationship = getFreeModeNpcRelationship(npcName, { create: false });
      const score = clampFreeModeRelationshipScore(relationship?.好感度 || 0);
      return {
        type: "npc",
        name: npcName,
        role: profile.publicLabel || profile.statusLabel || "NPC",
        score,
        updateDay: Number(relationship?.更新日) || 0,
        avatar: profile.avatar || "",
        theme: profile.theme || "#6f9cff"
      };
    });
    return [...idolRows, ...npcRows].sort((a, b) => b.score - a.score || a.type.localeCompare(b.type) || a.name.localeCompare(b.name, "zh-Hans-CN"));
  }

  function buildRelationshipNetworkRows() {
    const current = getCurrentAffinityIdolName();
    const rows = [];
    buildSecondaryRelationshipRows()
      .filter((row) => row.score > 0 || row.name === current || row.type === "npc")
      .forEach((row) => {
        rows.push({ source: "制作人", target: row.name, label: `${getRelationshipLevelLabel(row.score)} ${row.score}/100`, type: row.type });
      });
    if (current) {
      rows.unshift({ source: "制作人", target: current, label: `担当 · ${getFreeModeRelationshipScore(current)}/100`, type: "producer" });
    }
    const staticEdges = [
      ["月村手毬", "秦谷美铃", "SyngUp 旧友"],
      ["花海咲季", "花海佑芽", "姐妹与竞争"],
      ["葛城莉莉娅", "紫云清夏", "好友"],
      ["有村麻央", "十王星南", "学生会与竞争"],
      ["姬崎莉波", "有村麻央", "宿舍照顾"],
      ["亚纱里老师", "制作人", "课题指导"]
    ];
    staticEdges.forEach(([source, target, label]) => rows.push({ source, target, label, type: "static" }));
    return rows;
  }

  function renderAffinityRelationshipBar(container, score) {
    const fill = document.createElement("span");
    fill.className = "affinity-relation-fill";
    fill.style.width = `${clamp(score, 0, 100)}%`;
    container.appendChild(fill);
  }

  function renderAffinitySecondaryPanel() {
    const list = document.getElementById("affinitySecondaryList");
    if (!list) return;
    const rows = buildSecondaryRelationshipRows();
    list.innerHTML = "";
    rows.forEach((row) => {
      const item = document.createElement("article");
      item.className = `affinity-relation-item is-${row.type}`;
      item.style.setProperty("--relation-theme", row.theme);
      const dayText = row.updateDay > 0 ? `第 ${row.updateDay} 日互动` : "尚未互动";
      item.innerHTML = `<div class="affinity-relation-avatar">${row.avatar ? `<img src="${row.avatar}" alt="" loading="lazy" decoding="async">` : `<b>${row.name.slice(0, 1)}</b>`}</div><div class="affinity-relation-main"><strong>${row.name}</strong><span>${row.type === "npc" ? "NPC" : "偶像"} · ${row.role} · ${dayText}</span><div class="affinity-relation-bar" aria-hidden="true"></div></div><div class="affinity-relation-score"><b>${row.score}</b><span>${getRelationshipLevelLabel(row.score)}</span></div>`;
      const bar = item.querySelector(".affinity-relation-bar");
      if (bar) renderAffinityRelationshipBar(bar, row.score);
      list.appendChild(item);
    });
  }

  function renderAffinityNetworkPanel() {
    const list = document.getElementById("affinityNetworkList");
    if (!list) return;
    const rows = buildRelationshipNetworkRows();
    list.innerHTML = "";
    rows.forEach((row) => {
      const item = document.createElement("article");
      item.className = `affinity-network-edge is-${row.type}`;
      item.innerHTML = `<span class="affinity-network-node">${row.source}</span><span class="affinity-network-link">${row.label}</span><span class="affinity-network-node">${row.target}</span>`;
      list.appendChild(item);
    });
  }

  function setAffinityTab(tab) {
    activeAffinityTab = ["current", "secondary", "network"].includes(tab) ? tab : "current";
    document.querySelectorAll("[data-affinity-tab]").forEach((button) => {
      const active = button.dataset.affinityTab === activeAffinityTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    const primary = document.getElementById("affinityPrimaryPanel");
    const secondary = document.getElementById("affinitySecondaryPanel");
    const network = document.getElementById("affinityNetworkPanel");
    if (primary) primary.hidden = activeAffinityTab !== "current";
    if (secondary) secondary.hidden = activeAffinityTab !== "secondary";
    if (network) network.hidden = activeAffinityTab !== "network";
  }
  function renderAffinityOverlay() {
    const idolName = getCurrentAffinityIdolName();
    if (!idolName) return;
    const idol = idols[idolName] || {};
    const score = clampFreeModeRelationshipScore(getFreeModeRelationshipScore(idolName));
    const threshold = getAffinityStageThreshold(score);
    const node = affinityNodes[threshold] || {};
    const theme = idol.theme || "#ff7bb0";

    const panel = document.querySelector("#affinityOverlay .affinity-panel");
    if (panel) panel.style.setProperty("--affinity-theme", theme);

    const bg = document.getElementById("affinityBg");
    if (bg) {
      const url = getSelectBackgroundUrl(idolName);
      bg.style.backgroundImage = url ? `url("${url}")` : "";
    }

    const nameEl = document.getElementById("affinityIdolName");
    if (nameEl) nameEl.textContent = idolName;
    const romajiEl = document.getElementById("affinityIdolRomaji");
    if (romajiEl) romajiEl.textContent = idolRomajiNames[idolName] || "";
    const tagEl = document.getElementById("affinityIdolTag");
    if (tagEl) tagEl.textContent = idol.tag ? `担当 · ${idol.tag}` : "担当偶像";

    const hearts = document.getElementById("affinityHearts");
    if (hearts) {
      const filled = clamp(Math.round(score / 20), 0, 5);
      hearts.innerHTML = "";
      for (let i = 0; i < 5; i += 1) {
        const heart = document.createElement("span");
        heart.className = `affinity-heart${i < filled ? " is-filled" : ""}`;
        heart.innerHTML = '<svg aria-hidden="true"><use href="#icon-heart"></use></svg>';
        hearts.appendChild(heart);
      }
    }

    const fill = document.getElementById("affinityScoreFill");
    if (fill) fill.style.width = `${clamp(score, 0, 100)}%`;
    const scoreValue = document.getElementById("affinityScoreValue");
    if (scoreValue) scoreValue.textContent = `${score} / 100`;
    const stageLabel = document.getElementById("affinityStageLabel");
    if (stageLabel) {
      stageLabel.textContent = threshold > 0
        ? `第 ${affinityThresholds.indexOf(threshold) + 1} 阶段 · ${node.title || ""}`
        : "初识阶段 · 关系刚刚起步";
    }

    const bioEl = document.getElementById("affinityBio");
    if (bioEl) bioEl.textContent = idol.bio || "暂无角色简介。";

    const statusList = document.getElementById("affinityStatusList");
    if (statusList) {
      statusList.innerHTML = "";
      buildAffinityStatusRows(idolName, score, threshold).forEach((row) => {
        const item = document.createElement("li");
        item.className = "affinity-status-row";
        item.innerHTML = `<span class="affinity-status-label"><svg aria-hidden="true"><use href="#${row.icon}"></use></svg>${row.label}</span><span class="affinity-status-value">${row.value}</span>`;
        statusList.appendChild(item);
      });
    }

    const bondTheme = document.getElementById("affinityBondTheme");
    if (bondTheme) bondTheme.textContent = node.theme || "和担当偶像一起向 First Live 前进。";
    const routeSeed = document.getElementById("affinityRouteSeed");
    if (routeSeed) {
      const seed = affinityRouteSeeds[idolName]?.[threshold] || "";
      routeSeed.textContent = seed;
      routeSeed.hidden = !seed;
    }
    renderAffinitySecondaryPanel();
    renderAffinityNetworkPanel();
    setAffinityTab(activeAffinityTab);
  }

  function openAffinityOverlay() {
    if (!canOpenAffinityOverlay()) {
      showToast("尚未开放", "确定担当偶像后可查看好感度档案。", "warn");
      return;
    }
    setElementHidden("affinityOverlay", false);
    renderAffinityOverlay();
  }

  function closeAffinityOverlay() {
    setElementHidden("affinityOverlay", true);
  }

  function canOpenHybridFacilityAt(locationId) {
    if (!isHybridCampusMode()) return false;
    if (isSandboxScoutTalkAvailable(locationId)) return false;
    const facilityKind = getHybridFacilityKind(locationId);
    if (!facilityKind) return false;
    if (isSandboxScoutActive() && !state.sandbox?.inviteComplete) return false;
    return true;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function defaultSandboxFirstLiveChallenge() {
    return {
      schemaVersion: 1,
      status: "available",
      attemptCount: 0,
      lastAttemptDay: null,
      nextAvailableDay: null,
      activeAttempt: null,
      history: []
    };
  }

  function normalizeSandboxFirstLiveChallenge(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const base = defaultSandboxFirstLiveChallenge();
    const status = ["available", "generating", "recovery_required", "cooldown", "completed"].includes(source.status)
      ? source.status
      : "available";
    const history = Array.isArray(source.history)
      ? source.history.filter((item) => item && typeof item === "object" && item.attemptId && Number.isFinite(Number(item.attemptDay))).slice(-12)
      : [];
    return {
      ...base,
      status,
      attemptCount: Math.max(0, Math.min(999, Math.floor(Number(source.attemptCount) || 0))),
      lastAttemptDay: Number.isFinite(Number(source.lastAttemptDay)) ? Math.max(1, Math.floor(Number(source.lastAttemptDay))) : null,
      nextAvailableDay: Number.isFinite(Number(source.nextAvailableDay)) ? Math.max(1, Math.floor(Number(source.nextAvailableDay))) : null,
      activeAttempt: source.activeAttempt && typeof source.activeAttempt === "object" ? source.activeAttempt : null,
      history
    };
  }

  function getSandboxFirstLiveContributionRate(value) {
    const score = Number(value);
    if (!Number.isFinite(score) || score < 400) return 0;
    if (score < 500) return 0.5;
    if (score < 600) return 0.8;
    return 1;
  }

  function calculateSandboxFirstLiveSuccessRate(stats = {}) {
    const rates = ["Vo", "Da", "Vi"].map((key) => getSandboxFirstLiveContributionRate(stats[key]));
    return Number((rates.reduce((sum, rate) => sum + rate, 0) / rates.length).toFixed(4));
  }

  function buildSandboxFirstLiveSettlement(stats = {}, roll = 0) {
    const snapshot = {
      Vo: Number(stats.Vo) || 0,
      Da: Number(stats.Da) || 0,
      Vi: Number(stats.Vi) || 0
    };
    const contributionRates = {
      Vo: getSandboxFirstLiveContributionRate(snapshot.Vo),
      Da: getSandboxFirstLiveContributionRate(snapshot.Da),
      Vi: getSandboxFirstLiveContributionRate(snapshot.Vi)
    };
    const successRate = calculateSandboxFirstLiveSuccessRate(snapshot);
    const frozenRoll = Number.isFinite(Number(roll)) ? Number(roll) : 0;
    return {
      snapshot,
      contributionRates,
      successRate,
      roll: frozenRoll,
      success: frozenRoll < successRate
    };
  }

  function canStartSandboxFirstLiveAt(clockMinutes = state.freeMode?.clockMinutes) {
    const clock = Number(clockMinutes);
    return Number.isFinite(clock) && clock <= FIRST_LIVE_START_DEADLINE_MINUTES;
  }

  function prepareSandboxFirstLiveAttempt(options = {}) {
    options = options && typeof options === "object" ? options : {};
    if (!options.confirmed) return { ok: false, reason: "confirmation_required" };
    if (!isSandboxLaunch() || !isFreeModeActive() || state.freeMode?.facilityKind !== "first_live") {
      return { ok: false, reason: "facility_inactive" };
    }
    if (!state.idol) return { ok: false, reason: "idol_missing" };
    if (isHarnessTurnBlocking(state.harness?.activeTurn, runtimeSessionEpoch)) {
      return { ok: false, reason: "turn_blocked" };
    }
    ensureFreeModeTimeDefaults();
    const currentDay = Number(state.freeMode.postLiveDay) || 1;
    const clockMinutes = Number(state.freeMode.clockMinutes) || 0;
    if (!canStartSandboxFirstLiveAt(clockMinutes)) return { ok: false, reason: "too_late" };
    const challenge = normalizeSandboxFirstLiveChallenge(state.sandbox?.firstLiveChallenge);
    if (challenge.status === "completed") return { ok: false, reason: "completed" };
    if (challenge.status === "cooldown" && currentDay < Number(challenge.nextAvailableDay || 0)) {
      return { ok: false, reason: "cooldown" };
    }
    if (!["available", "cooldown"].includes(challenge.status)) {
      return { ok: false, reason: "attempt_in_progress" };
    }

    const requestId = createRequestId();
    const turnId = createHarnessId("sandbox-first-live-turn");
    const acquired = tryAcquirePrimaryModelChannel({
      requestId,
      ownerKind: "sandbox_first_live",
      turnId,
      saveScope: activeHostSaveScope,
      sessionEpoch: runtimeSessionEpoch
    });
    if (!acquired.ok) {
      rejectPrimaryModelDispatch(acquired.blockingOwner, { requestId, ownerKind: "sandbox_first_live" });
      return { ok: false, reason: "channel_occupied", blockingOwner: acquired.blockingOwner };
    }

    const settlement = buildSandboxFirstLiveSettlement({
      Vo: state.Vo,
      Da: state.Da,
      Vi: state.Vi
    }, Math.random());
    const attemptId = createHarnessId("sandbox-first-live-attempt");
    const nextAvailableDay = settlement.success ? null : currentDay + 2;
    const activeAttempt = {
      schemaVersion: 1,
      attemptId,
      turnId,
      requestId,
      requestIds: [requestId],
      status: "settled",
      attemptDay: currentDay,
      settledAtClock: clockMinutes,
      nextAvailableDay,
      ...settlement
    };

    state.sandbox.firstLiveChallenge = {
      ...challenge,
      status: "generating",
      attemptCount: challenge.attemptCount + 1,
      lastAttemptDay: currentDay,
      nextAvailableDay,
      activeAttempt,
      history: [...challenge.history, {
        attemptId,
        attemptDay: currentDay,
        success: settlement.success,
        successRate: settlement.successRate,
        roll: settlement.roll
      }].slice(-12)
    };
    const timeResult = advanceFreeModeTime(FIRST_LIVE_ACTION_MINUTES);
    state.firstLive = {
      ...(state.firstLive || {}),
      completed: true,
      success: settlement.success,
      result: {
        type: "sandbox_first_live",
        ...settlement,
        attemptId,
        attemptDay: currentDay
      }
    };
    state.log.unshift({
      day: currentDay,
      round: "First Live",
      phase: "学园混合",
      action: "校内舞台 · First Live",
      result: `${settlement.success ? "挑战成功" : "挑战失败"} · 成功率 ${(settlement.successRate * 100).toFixed(1)}% · roll ${settlement.roll.toFixed(4)} · +${FIRST_LIVE_ACTION_MINUTES}分`,
      rawAction: "sandbox_first_live"
    });
    state.log = state.log.slice(0, 24);
    exitHybridFacility();
    processSandboxQuestAfterSettlement();
    saveState();
    render();
    showToast("First Live 判定完成", settlement.success ? "校内舞台挑战成功，正在准备演出叙事。" : `挑战失败，${nextAvailableDay} 日后可重新挑战。`, settlement.success ? "gold" : "warn");
    return { ok: true, owner: acquired.owner, attempt: activeAttempt, timeResult };
  }

  function confirmSandboxFirstLiveAttempt() {
    const confirmed = typeof window.confirm === "function"
      ? window.confirm("校内舞台 First Live 将消耗 3 小时，并只进行一次成功率判定。确认开始吗？")
      : true;
    if (!confirmed) return false;
    const result = prepareSandboxFirstLiveAttempt({ confirmed: true });
    if (!result.ok && result.reason !== "channel_occupied") {
      const messages = {
        too_late: "校内舞台 First Live 最晚需要在 19:00 开始。",
        cooldown: "本次挑战失败后仍在冷却中。",
        completed: "校内舞台 First Live 已完成。",
        attempt_in_progress: "上一场 First Live 仍在处理。"
      };
      showToast("无法开始 First Live", messages[result.reason] || "当前无法开始 First Live。", "warn");
    }
    if (result.ok) return startSandboxFirstLiveNarrative();
    return false;
  }

  function buildSandboxFirstLivePrompt(attempt) {
    const snapshot = attempt?.snapshot || {};
    const result = attempt || {};
    return `[初星沙盒 First Live：校内舞台叙事请求]

这是一次已经由前端完成确定性结算的 First Live。AI 只负责把冻结结果写成两段连续叙事，不得重新判定成功率、修改属性、时间、冷却或任务。
担当偶像：${state.idol}
学园第 ${attempt.attemptDay || state.freeMode?.postLiveDay || 1} 天
冻结属性：Vo ${snapshot.Vo} / Da ${snapshot.Da} / Vi ${snapshot.Vi}
各项贡献率：Vo ${result.contributionRates?.Vo ?? 0} / Da ${result.contributionRates?.Da ?? 0} / Vi ${result.contributionRates?.Vi ?? 0}
前端成功率：${((Number(result.successRate) || 0) * 100).toFixed(1)}%
前端 roll：${Number(result.roll).toFixed(4)}
前端判定：${result.success ? "成功" : "失败"}

输出契约（必须完整输出两个区块；不要输出 JSON、选项或系统说明）：
【live_pre开始】写登台前后台、候场、偶像与制作人的准备和觉悟，停在即将登台。
【live_pre结束】
【live_post开始】写演出结束后回到后台的反应、最高项/最低项带来的复盘，以及成功或失败后的情绪变化。
【live_post结束】
正文必须承认前端判定结果。不能描写未发生的数值变化，也不能替玩家创造决定。`;
  }

  function extractSandboxFirstLiveNarrative(source) {
    const text = String(source || "");
    const readBlock = (name) => {
      const pattern = new RegExp(`(?:【${name}开始】|<${name}>)\\s*([\\s\\S]*?)\\s*(?:【${name}结束】|</${name}>)`, "i");
      return String(text.match(pattern)?.[1] || "").trim();
    };
    const pre = readBlock("live_pre");
    const post = readBlock("live_post");
    if (!pre || !post || pre.replace(/\\s/g, "").length < 12 || post.replace(/\\s/g, "").length < 12) return null;
    return { pre, post };
  }

  function startSandboxFirstLiveNarrative() {
    const challenge = state.sandbox?.firstLiveChallenge;
    const attempt = challenge?.activeAttempt;
    const owner = getPrimaryModelChannelOwner();
    if (!attempt || !owner || owner.ownerKind !== "sandbox_first_live" || owner.requestId !== attempt.requestId) {
      showToast("First Live 无法生成", "当前挑战记录或模型通道已失效。", "warn");
      return false;
    }
    const promptCapture = captureHarnessGenerationPrompt(buildSandboxFirstLivePrompt(attempt));
    if (promptCapture.generationPromptStatus !== "captured") {
      state.sandbox.firstLiveChallenge.status = "recovery_required";
      attempt.status = "recovery_required";
      releasePrimaryModelChannel(attempt.requestId, owner.channelLeaseId, "prompt_capture_failed");
      saveState();
      render();
      return false;
    }
    const now = Date.now();
    state.harness.activeTurn = {
      turnId: attempt.turnId,
      kind: "sandbox_first_live",
      status: "generating",
      action: "sandbox_first_live",
      requestId: attempt.requestId,
      requestIds: [attempt.requestId],
      saveScope: String(activeHostSaveScope || activeStorageKey || ""),
      storageKey: String(activeStorageKey || ""),
      sessionEpoch: runtimeSessionEpoch,
      generationPrompt: promptCapture.generationPrompt,
      generationPromptLength: promptCapture.generationPromptLength,
      generationPromptStatus: promptCapture.generationPromptStatus,
      recoveryAttemptCount: 0,
      snapshot: attempt.snapshot,
      firstLiveAttemptId: attempt.attemptId,
      createdAt: now,
      updatedAt: now
    };
    attempt.generationPrompt = promptCapture.generationPrompt;
    attempt.generationPromptLength = promptCapture.generationPromptLength;
    attempt.generationPromptStatus = promptCapture.generationPromptStatus;
    attempt.status = "generating";
    pendingAiRequestId = attempt.requestId;
    state.pendingAiRequestId = attempt.requestId;
    state.activeStoryNode = { type: "sandboxFirstLive", ready: false };
    state.lastPrompt = promptCapture.generationPrompt;
    state.lastStory = "校内舞台演出前后叙事正在生成……";
    saveState();
    render();
    openEventOverlay("校内舞台 · First Live", "前端判定已完成，正在等待双阶段演出叙事。", buildAiWaitingStory("正在等待 live_pre 与 live_post 两个叙事区块。"));
    if (!requestHostPromptSend(promptCapture.generationPrompt, attempt.requestId, {
      channelLeaseId: owner.channelLeaseId,
      ownerKind: "sandbox_first_live",
      generationMode: "sandbox_first_live",
      turnId: attempt.turnId
    })) {
      pendingAiRequestId = "";
      state.pendingAiRequestId = "";
      state.harness.activeTurn.status = "recovery_required";
      state.harness.activeTurn.requestId = "";
      state.sandbox.firstLiveChallenge.status = "recovery_required";
      attempt.status = "recovery_required";
      releasePrimaryModelChannel(attempt.requestId, owner.channelLeaseId, "send_failed");
      saveState();
      render();
      openHarnessRecoveryOverlay(state.harness.activeTurn);
      return false;
    }
    return true;
  }

  function sample(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function rollInclusive(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function icon(name) {
    return `<svg aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  }

  function getPhase() {
    if (!state.idol) return "未选择担当";
    if (state.liveReady) return "First Live 待考核";
    if (state.day <= 6) return "First Live 前期";
    if (state.day <= 12) return "First Live 中期";
    if (state.day <= FINAL_LIVE_DAY - 1) return "First Live 后期";
    return "First Live 当日";
  }

  function isSandboxScoutPhase() {
    if (!isSandboxLaunch()) return false;
    const scoutId = globalThis.HatsuTasks?.getScoutQuestId?.(state);
    return Boolean(scoutId && state.tasks?.main?.[scoutId]?.status === "active");
  }

  function getHatsuWorldHelpers() {
    return {
      canonicalIdolName,
      idolNames: Object.keys(idols),
      formatClock: formatFreeModeClock,
      getPresenceSlotKey: getFreeModePresenceSlotKey,
      getDayKey: (s) => globalThis.HatsuWorld?.dailyTick?.getDayKey?.(s) || `live+${s?.freeMode?.postLiveDay || 1}`,
      isSandboxLaunch,
      isSandboxScoutPhase
    };
  }

  function getSandboxScoutLocation(idolName) {
    const resolver = globalThis.HatsuWorld?.campusBehavior?.getScoutTargetLocation;
    if (typeof resolver !== "function") return "";
    return resolver(idolName, getHatsuWorldHelpers()) || "";
  }

  function composeWorldSummaryBlock(scope = "produce", locationId = "") {
    const composer = globalThis.HatsuWorld?.injection?.composeWorldSummary;
    if (typeof composer !== "function") return "";
    const block = composer(state, { scope, locationId }, getHatsuWorldHelpers());
    return block ? `\n${block}\n` : "";
  }

  function composeWorldDirectorPromptAddendum(options = {}) {
    const api = globalThis.HatsuWorld?.directorInjection;
    const director = getWorldDirectorState();
    if (!api || !director) return "";
    const participantIds = new Set(["producer", "idol:" + canonicalIdolName(state.idol)]);
    (options.participants || []).forEach((name) => {
      const value = String(name || "").trim();
      if (!value) return;
      participantIds.add(value.startsWith("idol:") ? value : "idol:" + canonicalIdolName(value));
    });
    const locationId = String(options.locationId || state.freeMode?.activeLocationId || "");
    const context = {
      currentDayKey: getWorldFeedDayKey(),
      participants: [...participantIds].filter((id) => id !== "idol:"),
      locationId,
      scopeKey: getSecondaryChannelSaveScope(),
      maxChars: 1800
    };
    const block = api.composeDirectorNarrativeBlock(director, context);
    if (!block) return "";
    const contract = api.composeDirectorEvidenceContract();
    return "\n\n" + block + "\n\n" + contract;
  }
  function refreshWorldPresenceFromRules(force = false) {
    const slotKey = getFreeModePresenceSlotKey();
    const campusActive = globalThis.HatsuWorld?.campusBehavior?.shouldUseCampusBehavior?.(state, getHatsuWorldHelpers());
    if (!force && !campusActive && state.freeMode.presenceSlotKey === slotKey && Object.keys(state.freeMode.presence || {}).length) {
      return;
    }
    const refresher = globalThis.HatsuWorld?.dailyTick?.refreshWorldPresence;
    if (typeof refresher === "function") {
      refresher(state, getHatsuWorldHelpers());
      return;
    }
    rollFreeModePresenceLegacy(force);
  }

  function runFreeModeWorldDailyTick() {
    const helpers = getWorldFeedHelpers();
    if (shouldUseSecondaryWorldGen()) {
      globalThis.HatsuWorld?.dailyTick?.refreshWorldPresence?.(state, helpers);
      syncDailyWorldGeneration();
      return "secondary";
    }
    const ticker = globalThis.HatsuWorld?.dailyTick?.runFreeModeDailyTick;
    if (typeof ticker === "function") {
      ticker(state, helpers);
    } else {
      rollFreeModePresenceLegacy(true);
    }
    globalThis.HatsuWorld?.worldGen?.markDailyWorldGenReady?.(state, "static", getWorldFeedDayKey());
    return "static";
  }

  function daysLeft() {
    return Math.max(0, FINAL_LIVE_DAY + 1 - state.day);
  }

  function presetFor(idolName) {
    idolName = canonicalIdolName(idolName);
    const preset = idolPresets[idolName] || idolPresets["藤田琴音"];
    return {
      Vo: preset[0],
      Da: preset[1],
      Vi: preset[2],
      growth: { Vo: preset[3], Da: preset[4], Vi: preset[5] },
      threshold: { Vo: preset[6], Da: preset[7], Vi: preset[8] },
      cap: { Vo: preset[9], Da: preset[10], Vi: preset[11] },
      exact: exactPresetIdols.has(idolName)
    };
  }

  function applyIdolPreset(idolName, resetProgress = false) {
    idolName = canonicalIdolName(idolName);
    const preset = presetFor(idolName);
    state.idol = idolName;
    state.uiVersion = UI_VERSION;
    state.Vo = preset.Vo;
    state.Da = preset.Da;
    state.Vi = preset.Vi;
    state.growth = preset.growth;
    state.threshold = preset.threshold;
    state.cap = preset.cap;
    if (resetProgress) {
      state.day = 1;
      state.round = 1;
      state.stamina = 100;
      state.stress = 0;
      state.trust = 0;
      state.liveReady = false;
      state.affinity = { openingComplete: false, unlocked: [], pending: [], viewed: [] };
      state.firstLive = { completed: false, success: false, result: null };
      state.activeStoryNode = null;
      state.log = [];
      state.lastStory = `${idolName}的育成档案已经建立。`;
      state.lastDebug = "已建立新的育成档案。";
    }
    rollSpCandidates();
  }

  function rollSpCandidates() {
    state.sp = {
      Vo: Math.random() * 100 < spChance,
      Da: Math.random() * 100 < spChance,
      Vi: Math.random() * 100 < spChance
    };
  }

  function eventScenesFor(action, attribute) {
    const pool = [...(actionEventPools[action]?.[attribute] || actionEventPools[action]?.any || [])];
    if (action === "training" && (state.day >= 13 || state.sp?.[attribute])) {
      pool.push("小舞台试演");
    }
    return pool;
  }

  function rollActionEvent(action, attribute) {
    const tuning = getActionTuning(state.idol, action);
    if (!tuning.eventChance || Math.random() * 100 >= tuning.eventChance) return null;
    const scenePool = eventScenesFor(action, attribute);
    if (!scenePool.length) return null;
    const character = sample(interactionCharacters.filter((name) => name !== state.idol));
    const rewardAttribute = sample(["Vo", "Da", "Vi", "trust"]);
    const reward = rewardAttribute === "trust" ? { trust: rollInclusive(1, 5) } : { [rewardAttribute]: 10 };
    return { character, scene: sample(scenePool), mood: sample(eventMoods), reward, action, attribute };
  }

  function getActionTuning(idolName, action) {
    const isMisuzu = canonicalIdolName(idolName) === "秦谷美铃";
    if (action === "lesson") {
      return { lessonGain: isMisuzu ? 98 : 65, staminaDelta: isMisuzu ? -30 : -10, trainingMultiplier: 1, eventChance: lessonEventChance };
    }
    if (action === "training") {
      return { lessonGain: 0, staminaDelta: isMisuzu ? -33 : -12, trainingMultiplier: isMisuzu ? 1.5 : 1, eventChance: trainingEventChance };
    }
    if (action === "rest") {
      return { lessonGain: 0, staminaDelta: 30, trainingMultiplier: 1, eventChance: isMisuzu ? 50 : 0 };
    }
    return { lessonGain: 0, staminaDelta: 0, trainingMultiplier: 1, eventChance: 0 };
  }

  function calculateTrainingGain(baseGain, trainingMultiplier, spActive) {
    const tunedGain = Math.round(baseGain * trainingMultiplier);
    return spActive ? Math.round(tunedGain * 1.5) : tunedGain;
  }

  function getActionCostText(idolName, action) {
    const staminaDelta = getActionTuning(idolName, action).staminaDelta;
    return `体力${staminaDelta > 0 ? "+" : ""}${staminaDelta}`;
  }

  function getHybridFacilityCostText(idolName, action) {
    return `+60分 · ${getActionCostText(idolName, action)}`;
  }

  function formatDelta(delta) {
    return Object.entries(delta)
      .filter(([, value]) => value)
      .map(([key, value]) => `${statLabels[key] || key} ${value > 0 ? "+" : ""}${value}`)
      .join("，");
  }

  function formatRandomEvent(event) {
    return `随机互动：${event.scene}，${event.character}登场，${event.mood}，额外奖励 ${formatDelta(event.reward)}`;
  }

  function markAffinityUnlocked(threshold) {
    if (!state.affinity.unlocked.includes(threshold)) state.affinity.unlocked.push(threshold);
    if (!state.affinity.viewed.includes(threshold) && !state.affinity.pending.includes(threshold)) {
      state.affinity.pending.push(threshold);
      if (REQUIRED_BOND_THRESHOLDS.includes(Number(threshold))) {
        state.affinity.bondUnlockDay = state.affinity.bondUnlockDay || {};
        state.affinity.bondUnlockDay[threshold] = state.day;
      }
    }
    state.affinity.unlocked.sort((a, b) => a - b);
    state.affinity.pending.sort((a, b) => a - b);
  }

  function markAffinityViewed(threshold) {
    if (!state.affinity.viewed.includes(threshold)) state.affinity.viewed.push(threshold);
    state.affinity.pending = state.affinity.pending.filter((item) => item !== threshold);
    state.affinity.viewed.sort((a, b) => a - b);
  }

  function refreshAffinityUnlocks() {
    ensureStateShape();
    if (!state.idol) return;
    [20, 40, 60].forEach((threshold) => {
      if (state.trust >= threshold) markAffinityUnlocked(threshold);
    });
    if (state.trust >= 80) markAffinityUnlocked(80);
    if (state.trust >= 100 && state.firstLive.success) markAffinityUnlocked(100);
  }

  function pendingAffinityCount() {
    ensureStateShape();
    return state.affinity.pending.filter((threshold) => threshold !== 0 || !state.affinity.openingComplete).length;
  }

  function isPendingRequiredBond80() {
    ensureStateShape();
    return state.affinity.pending.includes(80) && !state.affinity.viewed.includes(80);
  }

  function pendingRequiredBondThreshold() {
    ensureStateShape();
    const pending = state.affinity.pending || [];
    return REQUIRED_BOND_THRESHOLDS.find((threshold) => {
      if (!pending.includes(threshold) || state.affinity.viewed.includes(threshold)) return false;
      if (threshold === 80) return state.day >= BOND_80_DAY;
      const unlockDay = Number(state.affinity.bondUnlockDay?.[threshold]);
      return !Number.isFinite(unlockDay) || state.day > unlockDay;
    }) || null;
  }

  function isBondEventDay() {
    return Boolean(state.idol && !state.liveReady && pendingRequiredBondThreshold());
  }

  function pendingFinalAffinityThreshold() {
    ensureStateShape();
    const threshold = 100;
    if (!state.idol || !state.firstLive.success) return null;
    if (!state.affinity.pending.includes(threshold) || state.affinity.viewed.includes(threshold)) return null;
    return threshold;
  }

  function pendingAffinityActionThreshold() {
    return pendingRequiredBondThreshold() || pendingFinalAffinityThreshold();
  }

  function completeBondEventDay(threshold) {
    const thresholdValue = Number(threshold);
    markAffinityViewed(thresholdValue);
    state.activeStoryNode = null;
    state.round = 1;
    if (thresholdValue === 80 && state.day >= BOND_80_DAY) {
      state.day = FINAL_LIVE_DAY;
      state.liveReady = true;
      return;
    }
    if (state.day >= BOND_80_DAY) {
      if (isPendingRequiredBond80()) {
        state.day = BOND_80_DAY;
        return;
      }
      state.day = FINAL_LIVE_DAY;
      state.liveReady = true;
      return;
    }
    state.day += 1;
  }

  function actionLabel(action, attribute) {
    const names = {
      lesson: "上课",
      training: "训练",
      rest: "休息",
      outing: "外出",
      companion: "交流",
      intimacy: "亲密",
      bond: "羁绊事件",
      map_location: "地图探索"
    };
    const sp = action === "training" && attribute && state.sp?.[attribute] ? "SP" : "";
    return attribute ? `${attribute}${sp}${names[action]}` : names[action];
  }

  function isChoicePromptAction(action) {
    return action === "outing" || action === "companion" || action === "intimacy" || action === "bond" || action === "map_location" || action === "apartment_companion";
  }

  function isChoicePromptMode() {
    return state.eventMode === "choice_prompt" && isChoicePromptAction(state.pendingActionContext?.action);
  }

  function isChoiceResolutionMode() {
    return state.eventMode === "choice_resolution";
  }

  function currentChoiceActionTitle() {
    if (isNsfwIntimacyActive()) return nsfwIntimacyActionTitle();
    if (state.pendingActionContext?.action === "map_location") {
      const actionContext = state.pendingActionContext.actionContext || {};
      const location = resolveMapExploreLocation(actionContext.locationId, actionContext);
      const locationName = location?.name || actionContext.locationName || "地图探索";
      return `${locationName} · 探索`;
    }
    if (state.pendingActionContext?.action === "apartment_companion") {
      const idol = state.pendingActionContext?.actionContext?.companionIdol || "偶像";
      return `公寓 · ${idol}`;
    }
    if (state.pendingActionContext?.action === "bond") {
      const threshold = state.pendingActionContext.threshold;
      return `好感度 ${threshold}：${affinityNodes[threshold]?.title || "羁绊事件"}`;
    }
    return state.pendingActionContext
      ? actionLabel(state.pendingActionContext.action, state.pendingActionContext.attribute)
      : "外出/交流/亲密";
  }

  function roundLabel() {
    if (state.round === SUMMARY_ROUND) return "每日总结轮次";
    if (state.round === 4) return "每日额外轮次";
    return `第 ${state.round || 1} / 3 轮行动`;
  }

  function isExtraRound() {
    return state.round === 4;
  }

  function isSummaryRound() {
    return state.round === SUMMARY_ROUND;
  }

  function advanceDay() {
    if (!isSummaryRound()) return false;
    state.round = 1;
    if (state.day >= BOND_80_DAY) {
      if (isPendingRequiredBond80() && state.day === BOND_80_DAY) {
        // Stay on First Live eve so the deferred bond-80 event can run.
      } else {
        state.day = FINAL_LIVE_DAY;
        state.liveReady = true;
      }
    } else {
      state.day += 1;
    }
    state.dailySummary = {
      day: state.day,
      intro: "",
      status: "",
      producer: "",
      raw: "",
      complete: false
    };
    return true;
  }

  function enterNextDay() {
    if (!state.idol) {
      showToast("需要担当偶像", "请先选择本次育成的担当。", "warn");
      return;
    }
    if (!isSummaryRound()) {
      showToast("尚未到总结轮次", "完成四轮行动后，才能进入下一天。", "warn");
      return;
    }
    if (state.liveReady) {
      showToast("日程已锁定", "当前已进入最终日程，无法继续推进天数。", "warn");
      return;
    }
    if (!advanceDay()) return;
    rollSpCandidates();
    saveState();
    render();
    if (state.liveReady) {
      showToast("最终日程", "First Live 已解锁，请开始最终演出。", "gold");
      return;
    }
    showToast("进入新一天", `第 ${state.day} 天开始了。`, "info");
    if (isBondEventDay()) {
      const threshold = pendingRequiredBondThreshold();
      showToast("羁绊事件日", threshold ? `今天需要先完成好感度 ${threshold} 的羁绊事件。` : "今天需要先完成羁绊事件。", "warn");
    }
  }

  function hasEnoughStaminaForAction(action) {
    const staminaDelta = getActionTuning(state.idol, action).staminaDelta;
    return staminaDelta >= 0 || Number(state.stamina || 0) >= Math.abs(staminaDelta);
  }

  function isIntimacyUnlocked() {
    return Number(state.trust || 0) >= INTIMACY_UNLOCK_TRUST;
  }

  function isIntimacyNsfwUnlocked() {
    return Number(state.trust || 0) >= INTIMACY_NSFW_UNLOCK_TRUST;
  }

  function getIntimacyMode() {
    if (state.pendingActionContext?.action !== "intimacy") return "";
    return state.intimacyRoute
      || state.pendingActionContext?.intimacyMode
      || state.pendingActionContext?.actionContext?.intimacyMode
      || "normal";
  }

  function isNsfwIntimacyActive() {
    return state.pendingActionContext?.action === "intimacy" && getIntimacyMode() === "nsfw";
  }

  function isApartmentNsfwInviteActive() {
    return isNsfwIntimacyActive() && Boolean(state.pendingActionContext?.actionContext?.apartmentInvite);
  }

  function getNsfwIntimacyTargetIdol() {
    const fromContext = canonicalIdolName(state.pendingActionContext?.actionContext?.inviteIdol);
    if (fromContext && idols[fromContext]) return fromContext;
    return state.idol;
  }

  function getApartmentNsfwEligibleIdols() {
    ensureFreeModeRelationships();
    const current = getCurrentAffinityIdolName();
    return Object.keys(idols)
      .map((name) => ({
        name,
        score: getFreeModeRelationshipScore(name),
        isAssigned: name === current
      }))
      .filter((row) => row.score >= INTIMACY_NSFW_UNLOCK_TRUST)
      .sort((a, b) => (Number(b.isAssigned) - Number(a.isAssigned)) || b.score - a.score || a.name.localeCompare(b.name, "zh-Hans-CN"));
  }

  function buildNsfwIntimacyAffinityLine(idolName = getNsfwIntimacyTargetIdol()) {
    const canonical = canonicalIdolName(idolName);
    if (!canonical) return "";
    if (isApartmentNsfwInviteActive() || isFreeModeActive()) {
      const score = getFreeModeRelationshipScore(canonical);
      return `${getAffinityStageLine(canonical, score)}（当前好感度：${score}/100）`;
    }
    return getAffinityStageLine(canonical, state.trust);
  }

  function buildNsfwIntimacyScheduleLine() {
    if (isApartmentNsfwInviteActive()) {
      return `当前时间：${formatFreeModeDayLabel()} · ${formatFreeModeClock()}，地点：制作人私人公寓（夜间私密空间）`;
    }
    return `当前日程：第 ${state.day} 天，${roundLabel()}`;
  }

  function buildApartmentNsfwSceneSection(targetIdol) {
    const assigned = getCurrentAffinityIdolName();
    const assignedNote = targetIdol === assigned
      ? "她是你的担当偶像，彼此信赖已满。"
      : `她是学园偶像 ${targetIdol}；当前正式担当为 ${assigned || "未登记"}，本次为私下邀约，请勿写成正式育成日程。`;
    return `场景前提：
- 地点：制作人的私人公寓（夜间）。可从玄关、客厅到卧室自然推进，氛围私密、安静。
- 制作人刚刚把 ${targetIdol} 约到家里，对方已知情并自愿进入。
- ${assignedNote}
- 公寓内只有制作人与 ${targetIdol}，不要引入无关第三者闯入。`;
  }

  function clearIntimacyRoute() {
    state.intimacyRoute = null;
  }

  function buildNsfwIntimacyChatContextLine() {
    return `上下文说明：
- 本次 NSFW 亲密的前文剧情与互动已在当前 SillyTavern 聊天记录中，请直接承接上文。
- 不要复述前文，只写本轮新增内容。`;
  }

  function nsfwIntimacyActionTitle() {
    if (isApartmentNsfwInviteActive()) {
      const target = getNsfwIntimacyTargetIdol();
      return target ? `公寓 · ${target}` : "公寓邀约";
    }
    return "NSFW 亲密";
  }

  function isActionAvailable(action) {
    if (isBondEventDay()) return action === "bond";
    const scheduleAvailable = isExtraRound()
      ? (action === "intimacy" ? isIntimacyUnlocked() : new Set(["outing", "companion"]).has(action))
      : new Set(["lesson", "training", "rest"]).has(action);
    return scheduleAvailable && hasEnoughStaminaForAction(action);
  }

  function advanceRound() {
    if (state.round < 3) {
      state.round += 1;
      return;
    }
    if (state.round === 3) {
      state.round = 4;
      return;
    }
    if (state.round === 4) {
      state.round = SUMMARY_ROUND;
    }
  }

  function isSkipLessonTrainingAiStoryEnabled() {
    return Boolean(state.produceOptions?.skipLessonTrainingAiStory);
  }

  function finalizeProduceActionWithoutAi(actionName, resultSummary, rawAction = "") {
    pendingAiRequestId = "";
    state.pendingAiRequestId = "";
    state.eventMode = "none";
    state.choiceStep = 0;
    state.lastStory = `${actionName}已完成（已跳过 AI 叙事）。\n\n${resultSummary}`;
    state.lastEventTitle = actionName;
    state.lastEventResult = resultSummary;
    state.lastEventStory = state.lastStory;
    state.lastDebug = `${actionName}：前端已结算并跳过 SillyTavern 叙事。`;
    if (isHybridFacilityActive()) {
      exitHybridFacility();
    }
    markHarnessProduceTurn("completed_without_narrative");
    saveState();
    render();
    const toastDetail = isHybridCampusMode()
      ? `${actionName}已结算 · +${HYBRID_FACILITY_ACTION_MINUTES}分 · ${formatFreeModeClock()}`
      : `${actionName}已结算，已跳过 AI 叙事并进入下一轮。`;
    showToast("行动完成", toastDetail, "info");
    notifySandboxRestQuestIfNeeded(rawAction);
    processSandboxQuestAfterSettlement();
  }

  function settleAction(action, attribute, actionContext = {}) {
    if (!state.idol) {
      showToast("需要担当偶像", "请先选择本次育成的担当。", "warn");
      return;
    }
    const hybridFacility = isHybridFacilityActive();
    if (hybridFacility) {
      const kind = state.freeMode.facilityKind;
      if (kind === "first_live") {
        showToast("First Live", "请使用专用 First Live 流程确认后开始。", "info");
        return;
      }
      if ((kind === "lesson" && action !== "lesson") || (kind === "training" && action !== "training") || (kind === "rest" && action !== "rest")) {
        showToast("当前设施", kind === "lesson" ? "此处只能上课。" : kind === "training" ? "此处只能训练。" : "此处只能休息。", "warn");
        return;
      }
      if (["lesson", "training"].includes(action) && isSandboxCampusExhausted()) {
        showSandboxCampusLimitToast();
        return;
      }
      if (kind === "rest" && Number(state.stamina || 0) >= 100) {
        showToast("体力已满", "当前不需要休息，时间不会推进。", "info");
        return;
      }
      if (!hasEnoughStaminaForAction(action)) {
        showToast("体力不足", "当前体力不足以进行该行动。", "warn");
        return;
      }
    } else if (!state.affinity.openingComplete) {
      recordDebugOpeningDispatch("行动拦截：openingComplete 为 false");
      triggerAffinityStory(0);
      return;
    } else if (state.liveReady) {
      startFirstLive();
      return;
    } else if (isBondEventDay()) {
      showToast("羁绊事件日", "今天需要先完成已解锁的羁绊事件。", "warn");
      triggerAffinityStory(pendingRequiredBondThreshold());
      return;
    } else if (!isActionAvailable(action)) {
      if (isSummaryRound()) {
        showToast("总结轮次", "请选择今日总结或进入下一天。", "warn");
      } else {
        showToast("当前轮次不可用", "前三轮只开放上课、训练和休息；额外轮次开放外出、交流和信赖60后的亲密。", "warn");
      }
      return;
    }

    if (action === "companion" && !String(actionContext.companionTopic || "").trim()) {
      openCompanionOverlay();
      return;
    }

    let ordinaryPrimaryDispatch = null;
    if (isHarnessOrdinaryAction(action)) {
      const willGenerateNarrative = !(["lesson", "training"].includes(action) && isSkipLessonTrainingAiStoryEnabled());
      const blockingOwner = getPrimaryModelChannelOwner();
      if (willGenerateNarrative && blockingOwner) {
        rejectPrimaryModelDispatch(blockingOwner, { requestId: "", ownerKind: "ordinary_action" });
        return;
      }
      const turnStart = beginHarnessProduceAction(action, attribute);
      if (!turnStart.ok) return;
      if (willGenerateNarrative) {
        const requestId = createRequestId();
        const acquired = tryAcquirePrimaryModelChannel({
          requestId,
          ownerKind: "ordinary_action",
          turnId: turnStart.turnId,
          saveScope: activeHostSaveScope,
          sessionEpoch: runtimeSessionEpoch
        });
        if (!acquired.ok) {
          if (state.harness?.activeTurn?.turnId === turnStart.turnId && state.harness.activeTurn.status === "prepared") {
            state.harness.activeTurn = null;
          }
          rejectPrimaryModelDispatch(acquired.blockingOwner, { requestId, ownerKind: "ordinary_action" });
          return;
        }
        ordinaryPrimaryDispatch = acquired.owner;
      }
    }

    state.pendingActionContext = {
      action,
      attribute,
      intimacyMode: action === "intimacy" ? (actionContext.intimacyMode === "nsfw" ? "nsfw" : "normal") : undefined,
      actionContext: {
        ...actionContext,
        intimacyMode: action === "intimacy" ? (actionContext.intimacyMode === "nsfw" ? "nsfw" : "normal") : actionContext.intimacyMode,
        isDailyFinalAction: isExtraRound() && ["outing", "companion", "intimacy"].includes(action)
      }
    };
    if (action === "intimacy") {
      state.intimacyRoute = state.pendingActionContext.intimacyMode;
    } else {
      clearIntimacyRoute();
    }

    if (action === "outing" || action === "companion" || action === "intimacy") {
      const choiceContext = state.pendingActionContext.actionContext;
      state.eventMode = "choice_prompt";
      state.choiceStep = 1;
      
      const baseRewards = action === "outing" ? [10, 8, 6, 4] : action === "companion" ? [20, 15, 10, 5] : [0, 0, 0, 0];
      // 随机分配
      const shuffled = [...baseRewards].sort(() => Math.random() - 0.5);
      state.pendingChoiceRewards = shuffled;
      state.pendingOptionTexts = [];
      state.selectedChoiceText = "";
      state.selectedChoiceRating = "";
      
      const actionName = isNsfwIntimacyActive() ? nsfwIntimacyActionTitle() : actionLabel(action, attribute);
      const requestId = createRequestId();
      pendingAiRequestId = requestId;
      
      const prompt = isNsfwIntimacyActive()
        ? buildNsfwIntimacyOpeningPrompt(choiceContext)
        : buildChoicePhase1Prompt(action, attribute, shuffled, choiceContext);
      
      const resultSummary = action === "outing" 
        ? `准备前往：${actionContext.destination || "散步"}` 
        : action === "companion"
          ? `交流主题：${actionContext.companionTopic || "日常闲聊"}`
          : isNsfwIntimacyActive()
            ? `与${state.idol}进行 NSFW 亲密互动`
            : `与${state.idol}进行普通亲密互动`;
      
      const story = action === "outing"
        ? `正在前往 ${actionContext.destination || "散步"}...`
        : action === "companion"
          ? `正在围绕「${actionContext.companionTopic || "日常闲聊"}」与${state.idol}展开交流...`
          : isNsfwIntimacyActive()
            ? `正在准备与${state.idol}的 NSFW 亲密场景...`
            : `正在准备与${state.idol}的普通亲密场景...`;
        
      state.lastStory = story;
      state.lastPrompt = prompt;
      state.lastDebug = action === "intimacy"
        ? isNsfwIntimacyActive()
          ? "NSFW 亲密开场：等待 AI 生成 VN 剧情与 4 个选项（含自定义/结束入口）。"
          : "普通亲密：等待 AI 设计 4 个选项。本行动固定结算体力 +38、压力 -10、信赖 +20。"
        : `第一阶段剧情生成：等待 AI 设计 4 个选项。加成映射：\n` + shuffled.map((r, i) => `选项 ${i + 1} 对应加成 +${r}`).join("\n");
      
      saveState();
      render();
      
      setElementHidden("eventChoices", true);
      const actionsEl = document.getElementById("eventActions");
      if (actionsEl) actionsEl.style.display = "none";
      
      openEventOverlay(actionName, buildAiWaitingResult(resultSummary), buildAiWaitingStory(story));
      
      if (!requestHostPromptSend(prompt, requestId)) {
        openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制提示词后手动发送。");
      }
      showToast("开始发起活动", isNsfwIntimacyActive()
        ? "正在等待 AI 生成 NSFW 亲密剧情与选项..."
        : `正在等待 AI 生成${actionName}剧情与互动选项...`, "info");
      return;
    }

    state.eventMode = "none";
    state.choiceStep = 0;
    state.pendingChoiceRewards = [];
    state.pendingOptionTexts = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";

    const delta = {};
    let randomEvent = null;
    const tuning = getActionTuning(state.idol, action);

    if (action === "lesson") {
      delta[attribute] = tuning.lessonGain;
      delta.stamina = tuning.staminaDelta;
      delta.stress = 1;
      randomEvent = rollActionEvent(action, attribute);
    } else if (action === "training") {
      const spActive = Boolean(state.sp?.[attribute]);
      ["Vo", "Da", "Vi"].forEach((item) => {
        const baseGain = item === attribute
          ? Math.round(28 + Number(state.growth?.[item] || 0) * 0.8)
          : Math.round(Number(state.growth?.[item] || 0) * 0.15);
        delta[item] = calculateTrainingGain(baseGain, tuning.trainingMultiplier, spActive);
      });
      delta.stamina = tuning.staminaDelta;
      delta.stress = spActive ? 3 : 2;
      randomEvent = rollActionEvent(action, attribute);
    } else if (action === "rest") {
      delta.stamina = tuning.staminaDelta;
      randomEvent = rollActionEvent(action, attribute);
    } else if (action === "outing") {
      delta.stamina = 38;
      delta.stress = -5;
      delta.trust = 5;
    } else if (action === "companion") {
      delta.stamina = 18;
      delta.stress = -2;
      delta.trust = 15;
    } else if (action === "intimacy") {
      delta.stamina = 38;
      delta.stress = -10;
      delta.trust = INTIMACY_NORMAL_TRUST_GAIN;
    }

    if (randomEvent) {
      Object.entries(randomEvent.reward).forEach(([key, value]) => {
        delta[key] = (delta[key] || 0) + value;
      });
    }

    Object.entries(delta).forEach(([key, value]) => {
      const max = ["Vo", "Da", "Vi"].includes(key) ? Number(state.cap?.[key] || 999) : 100;
      state[key] = clamp((state[key] || 0) + value, 0, max);
    });

    const actionName = actionLabel(action, attribute);
    const resultText = formatDelta(delta);
    const eventText = randomEvent ? formatRandomEvent(randomEvent) : "";
    const locationText = action === "outing" && actionContext.destination ? `外出地点：${actionContext.destination}` : "";
    const resultSummary = [locationText, resultText, eventText].filter(Boolean).join("，");
    const requestId = ordinaryPrimaryDispatch?.requestId || createRequestId();
    const willGenerateOrdinaryNarrative = isHarnessOrdinaryAction(action)
      && !(["lesson", "training"].includes(action) && isSkipLessonTrainingAiStoryEnabled());
    const storytellerAttachment = attachStorytellerCandidateToOrdinaryTurn(action, attribute, actionContext, {
      turnId: state.harness?.activeTurn?.turnId || "",
      willGenerateNarrative: willGenerateOrdinaryNarrative
    });
    const story = buildPendingStory(actionName, resultSummary, randomEvent, actionContext);
    const prompt = buildPrompt(action, attribute, resultText, randomEvent, storytellerAttachment.actionContext);
    const harnessPromptCapture = isHarnessOrdinaryAction(action)
      ? captureHarnessGenerationPrompt(prompt)
      : null;

    state.lastStory = story;
    state.lastPrompt = prompt;
    state.lastDebug = buildDebugText(actionName, delta, randomEvent, actionContext);
    refreshAffinityUnlocks();
    let hybridTimeResult = null;
    if (hybridFacility) {
      const hybridFacilityMinutes = getHybridFacilityActionMinutes(state.freeMode.facilityKind);
      hybridTimeResult = advanceFreeModeTime(hybridFacilityMinutes);
      if (["lesson", "training"].includes(action) && globalThis.HatsuTasks?.isSandboxTasksActive(state)) {
        globalThis.HatsuTasks.recordCampusAction(state, {
          kind: action,
          locationId: state.freeMode.facilityLocationId,
          minutes: HYBRID_FACILITY_ACTION_MINUTES,
          clock: formatFreeModeClock()
        });
        const location = getWorldMapLocation(state.freeMode.facilityLocationId);
        appendEveningJournalActivity(
          action === "lesson" ? "上课" : "训练",
          `${location?.name || "校园设施"} · +${HYBRID_FACILITY_ACTION_MINUTES} 分钟`
        );
      }
      state.log.unshift({
        day: state.freeMode.postLiveDay,
        round: formatFreeModeClock(),
        phase: "学园混合",
        action: actionName,
        result: `${resultSummary} · +${hybridFacilityMinutes}分 · ${formatFreeModeClock()}`,
        rawAction: action,
        rawAttribute: attribute
      });
    } else {
      state.log.unshift({ day: state.day, round: state.round, phase: getPhase(), action: actionName, result: resultSummary, rawAction: action, rawAttribute: attribute });
      advanceRound();
    }
    state.log = state.log.slice(0, 24);
    rollSpCandidates();
    if (isHarnessOrdinaryAction(action)) {
      if (harnessPromptCapture?.generationPromptStatus !== "captured") {
        recordHarnessTrace("turn.prompt_rejected", {
          promptLength: harnessPromptCapture?.generationPromptLength || 0,
          promptStatus: harnessPromptCapture?.generationPromptStatus || "missing"
        });
      }
      markHarnessProduceTurn("settled", {
        settledPersistenceRevision: state.harness.persistenceRevision + 1,
        storytellerCandidateRef: storytellerAttachment.reference,
        ...harnessPromptCapture
      });
    }
    saveState();
    render();
    if (["lesson", "training"].includes(action) && isSkipLessonTrainingAiStoryEnabled()) {
      finalizeProduceActionWithoutAi(actionName, resultSummary, action);
      if (hybridTimeResult?.hitDayEnd) {
        maybeTriggerEveningGoHomePrompt();
      }
      return;
    }
    pendingAiRequestId = requestId;
    if (isHarnessOrdinaryAction(action)) {
      markHarnessProduceTurn("generating", {
        requestId,
        requestIds: appendHarnessRequestId(state.harness?.activeTurn?.requestIds, requestId)
      });
    }
    openEventOverlay(actionName, buildAiWaitingResult(resultSummary), buildAiWaitingStory(story));
    if (!requestHostPromptSend(prompt, requestId, {
      channelLeaseId: ordinaryPrimaryDispatch?.channelLeaseId || "",
      ownerKind: "ordinary_action",
      turnId: state.harness?.activeTurn?.turnId || ""
    })) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制提示词后手动发送。");
    }
    if (hybridFacility && hybridTimeResult?.hitDayEnd) {
      maybeTriggerEveningGoHomePrompt();
    }
    showToast("行动结算完成", `${actionName}已经写入 P 手账。`, randomEvent ? "gold" : "info");
    notifySandboxRestQuestIfNeeded(action);
    processSandboxQuestAfterSettlement();
  }

  function createRequestId() {
    return `hatsu-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  const HARNESS_RECOVERY_PROMPT_MAX_LENGTH = 120000;

  const HARNESS_PERSISTED_TRACE_TYPES = new Set([
    "turn.prepared",
    "turn.settled",
    "turn.generating",
    "turn.completed",
    "turn.completed_without_narrative",
    "turn.failed",
    "turn.rejected_duplicate",
    "turn.recovery_required",
    "turn.recovery_started",
    "turn.recovery_send_failed",
    "turn.prompt_rejected",
    "turn.abandoned",
    "turn.rejected_recovery_pending",
    "reply.rejected_stale"
  ]);

  function createHarnessId(prefix) {
    const randomPart = globalThis.crypto?.randomUUID?.()
      || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${randomPart}`;
  }

  function getPrimaryModelChannelOwner() {
    return primaryModelChannelOwner;
  }

  function getPrimaryModelChannelDebugSnapshot(now = Date.now()) {
    const owner = getPrimaryModelChannelOwner();
    const requestId = String(owner?.requestId || "");
    return {
      ownerKind: String(owner?.ownerKind || "none"),
      ageMs: owner ? Math.max(0, Number(now) - Number(owner.acquiredAt || now)) : 0,
      scope: String(owner?.saveScope || activeHostSaveScope || ""),
      requestIdSuffix: requestId ? requestId.slice(-8) : "",
      lastReleaseReason: primaryModelChannelDebug.lastReleaseReason,
      lastRejectReason: primaryModelChannelDebug.lastRejectReason
    };
  }

  function normalizeHostGenerationDebugSnapshot(snapshot) {
    snapshot = snapshot && typeof snapshot === "object" ? snapshot : {};
    return {
      adapter: String(snapshot.adapter || ""),
      mode: String(snapshot.mode || ""),
      status: String(snapshot.status || ""),
      ageMs: Math.max(0, Number(snapshot.ageMs || 0)),
      scope: String(snapshot.scope || ""),
      ownerKind: String(snapshot.ownerKind || ""),
      requestIdSuffix: String(snapshot.requestIdSuffix || "").slice(-8),
      lastFailureReason: String(snapshot.lastFailureReason || ""),
      lastCompensationReason: String(snapshot.lastCompensationReason || "")
    };
  }

  function acquirePrimaryEntryDispatch(requestId, ownerKind, options) {
    options = options && typeof options === "object" ? options : {};
    if (!isSillyTavernHost()) {
      return { ok: true, owner: null, localFallback: true };
    }
    const acquired = tryAcquirePrimaryModelChannel({
      requestId,
      ownerKind,
      turnId: options.turnId || "",
      saveScope: activeHostSaveScope,
      sessionEpoch: runtimeSessionEpoch
    });
    if (!acquired.ok) {
      rejectPrimaryModelDispatch(acquired.blockingOwner, {
        requestId,
        ownerKind,
        reason: "channel_occupied",
        silent: Boolean(options.silent)
      });
      return { ok: false, owner: null, localFallback: false };
    }
    return { ok: true, owner: acquired.owner, localFallback: false };
  }

  function handlePrimaryModelChannelFailure(owner, reason = "generation_failed", expectedRequestId, expectedChannelLeaseId) {
    const requestId = String(expectedRequestId || owner?.requestId || "");
    const channelLeaseId = String(expectedChannelLeaseId || owner?.channelLeaseId || "");
    if (!owner || !isPrimaryModelLeaseCurrent(requestId, channelLeaseId)) return false;

    if (["ordinary_action", "ordinary_recovery", "map_explore", "map_recovery", "storyteller_event", "storyteller_event_recovery", "sandbox_first_live", "sandbox_first_live_recovery"].includes(owner.ownerKind)) {
      if (returnHarnessRecoveryAttemptToPending(requestId, reason)) {
        pendingAiRequestId = "";
        state.pendingAiRequestId = "";
        saveState("harness.recovery_primary_failure");
        render();
        openHarnessRecoveryOverlay(state.harness.activeTurn);
      }
    } else if (owner.ownerKind === "phone_chat") {
      if (pendingAiRequestId === requestId) pendingAiRequestId = "";
      resetPhoneChatPendingState();
      state.phoneChat.retryAvailable = true;
      saveState("phone.primary_generation_failed");
    } else if (owner.ownerKind === "broadcast") {
      const episode = getBroadcastEpisode();
      broadcastScriptLoading = false;
      if (episode) episode.scriptStatus = "failed";
      if (state.activeStoryNode?.type === "broadcast") state.activeStoryNode = null;
      resetBroadcastPendingState();
      if (pendingAiRequestId === requestId) pendingAiRequestId = "";
      saveState("broadcast.primary_generation_failed");
      renderBroadcastApp();
    } else if (pendingAiRequestId === requestId) {
      pendingAiRequestId = "";
      state.pendingAiRequestId = "";
    }

    const released = releasePrimaryModelChannel(owner.requestId, owner.channelLeaseId, reason);
    if (released) {
      showToast("模型请求已结束", reason === "timeout" ? "等待回复超时，可以重新发起。" : "本次生成失败，可以稍后重试。", "warn");
    }
    return released;
  }

  function schedulePrimaryModelChannelTimeout(owner) {
    if (primaryModelChannelTimeoutId) clearTimeout(primaryModelChannelTimeoutId);
    primaryModelChannelTimeoutId = window.setTimeout(() => {
      handlePrimaryModelChannelFailure(owner, "timeout");
    }, PRIMARY_MODEL_CHANNEL_TIMEOUT_MS);
  }

  function tryAcquirePrimaryModelChannel(intent) {
    intent = intent && typeof intent === "object" ? intent : {};
    if (primaryModelChannelOwner) {
      return { ok: false, blockingOwner: primaryModelChannelOwner };
    }
    const requestId = String(intent.requestId || "");
    if (!requestId) return { ok: false, blockingOwner: null, reason: "missing_request_id" };
    const owner = {
      requestId,
      channelLeaseId: String(intent.channelLeaseId || createHarnessId("primary-lease")),
      ownerKind: String(intent.ownerKind || "legacy_main"),
      turnId: String(intent.turnId || ""),
      saveScope: String(intent.saveScope ?? activeHostSaveScope ?? ""),
      sessionEpoch: String(intent.sessionEpoch || runtimeSessionEpoch || ""),
      acquiredAt: Date.now()
    };
    primaryModelChannelOwner = owner;
    schedulePrimaryModelChannelTimeout(owner);
    debugHarnessEvent("primary-channel.acquired", {
      requestId: owner.requestId,
      channelLeaseId: owner.channelLeaseId,
      ownerKind: owner.ownerKind,
      turnId: owner.turnId,
      saveScope: owner.saveScope
    });
    return { ok: true, owner };
  }

  function releasePrimaryModelChannel(requestId, channelLeaseId, reason = "completed") {
    const owner = primaryModelChannelOwner;
    if (
      !owner
      || owner.requestId !== String(requestId || "")
      || owner.channelLeaseId !== String(channelLeaseId || "")
    ) {
      return false;
    }
    if (primaryModelChannelTimeoutId) clearTimeout(primaryModelChannelTimeoutId);
    primaryModelChannelTimeoutId = 0;
    primaryModelChannelOwner = null;
    primaryModelChannelDebug.lastReleaseReason = String(reason || "completed");
    primaryModelChannelDebug.lastReleaseAt = Date.now();
    debugHarnessEvent("primary-channel.released", {
      requestId: owner.requestId,
      channelLeaseId: owner.channelLeaseId,
      ownerKind: owner.ownerKind,
      turnId: owner.turnId,
      reason: String(reason || "completed")
    });
    return true;
  }
  function describePrimaryModelOwner(owner) {
    const labels = {
      ordinary_action: "上一项育成行动仍在生成剧情",
      opening: "担当开场剧情正在生成",
      ordinary_recovery: "上一项行动正在恢复叙事",
      map_explore: "地图探索正在生成场景",
      map_recovery: "地图探索正在恢复叙事",
      storyteller_event: "初星世界事件正在生成",
      storyteller_event_recovery: "初星世界事件正在恢复叙事",
      sandbox_first_live: "校内舞台 First Live 正在生成",
      sandbox_first_live_recovery: "校内舞台 First Live 正在恢复叙事",
      phone_chat: "手机私聊正在等待回复",
      broadcast: "广播完整稿正在生成",
      free_chat: "担当闲聊正在等待回复",
      idol_interaction: "偶像互动剧情正在生成",
      manual_prompt: "编辑后的剧情请求正在生成",
      regeneration: "剧情正在重新生成",
      legacy_main: "另一项剧情正在生成"
    };
    return labels[String(owner?.ownerKind || "legacy_main")] || labels.legacy_main;
  }

  function rejectPrimaryModelDispatch(blockingOwner, options) {
    options = options && typeof options === "object" ? options : {};
    primaryModelChannelDebug.lastRejectReason = String(options.reason || "channel_occupied");
    primaryModelChannelDebug.lastRejectAt = Date.now();
    debugHarnessEvent("primary-channel.rejected", {
      requestId: String(options.requestId || ""),
      ownerKind: String(options.ownerKind || "legacy_main"),
      blockingRequestId: String(blockingOwner?.requestId || ""),
      blockingOwnerKind: String(blockingOwner?.ownerKind || "")
    });
    if (!options.silent) {
      showToast("模型请求处理中", describePrimaryModelOwner(blockingOwner), "warn");
    }
    refreshVnDebugView();
    return false;
  }

  function isPrimaryModelLeaseCurrent(requestId, channelLeaseId) {
    const owner = getPrimaryModelChannelOwner();
    return Boolean(
      owner
      && owner.requestId === String(requestId || "")
      && owner.channelLeaseId === String(channelLeaseId || "")
    );
  }
  function normalizeHarnessState(raw, sessionEpoch) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      schemaVersion: 1,
      persistenceRevision: Math.max(0, Number(source.persistenceRevision) || 0),
      hostSaveSequence: Math.max(0, Math.floor(Number(source.hostSaveSequence) || 0)),
      sessionEpoch: String(sessionEpoch || source.sessionEpoch || ""),
      activeTurn: source.activeTurn && typeof source.activeTurn === "object" && !Array.isArray(source.activeTurn)
        ? source.activeTurn
        : null,
      trace: Array.isArray(source.trace) ? source.trace.slice(0, 40) : []
    };
  }

  function captureHarnessGenerationPrompt(promptText) {
    const prompt = String(promptText || "");
    const generationPromptLength = prompt.length;
    if (!prompt.trim()) {
      return { generationPrompt: "", generationPromptLength, generationPromptStatus: "missing" };
    }
    if (generationPromptLength > HARNESS_RECOVERY_PROMPT_MAX_LENGTH) {
      return { generationPrompt: "", generationPromptLength, generationPromptStatus: "too_large" };
    }
    return { generationPrompt: prompt, generationPromptLength, generationPromptStatus: "captured" };
  }

  function appendHarnessRequestId(requestIds, requestId) {
    const existing = Array.isArray(requestIds)
      ? requestIds.map((value) => String(value || "")).filter(Boolean)
      : [];
    const nextRequestId = String(requestId || "");
    if (!nextRequestId) return existing.slice(-6);
    return [...existing.filter((value) => value !== nextRequestId), nextRequestId].slice(-6);
  }

  function sanitizeHarnessDetail(detail) {
    const source = detail && typeof detail === "object" && !Array.isArray(detail) ? detail : {};
    return Object.fromEntries(Object.entries(source).filter(([key, value]) => {
      const isAllowedPromptMetadata = /^(?:promptLength|promptStatus)$/i.test(key);
      if ((/prompt/i.test(key) && !isAllowedPromptMetadata) || /^(?:text|rawText|renderedText)$/i.test(key) || /api.?key/i.test(key)) return false;
      return value === null || ["string", "number", "boolean"].includes(typeof value);
    }));
  }

  function debugHarnessEvent(type, detail = {}) {
    console.debug("[Harness]", {
      at: Date.now(),
      type: String(type || ""),
      ...sanitizeHarnessDetail(detail)
    });
  }

  function recordHarnessTrace(type, detail = {}) {
    if (!HARNESS_PERSISTED_TRACE_TYPES.has(type)) return false;
    state.harness = normalizeHarnessState(state.harness, runtimeSessionEpoch);
    const activeTurn = state.harness.activeTurn;
    const safeDetail = sanitizeHarnessDetail(detail);
    state.harness.trace.unshift({
      at: Date.now(),
      type,
      turnId: String(safeDetail.turnId || activeTurn?.turnId || ""),
      requestId: String(safeDetail.requestId || activeTurn?.requestId || ""),
      persistenceRevision: state.harness.persistenceRevision,
      saveScope: String(activeHostSaveScope || activeTurn?.saveScope || ""),
      detail: safeDetail
    });
    state.harness.trace = state.harness.trace.slice(0, 40);
    return true;
  }

  function isHarnessTurnBlocking(turn, currentSessionEpoch) {
    return Boolean(
      turn
      && turn.sessionEpoch === currentSessionEpoch
      && ["prepared", "settled", "generating"].includes(turn.status)
    );
  }

  function isHarnessOrdinaryAction(action) {
    return ["lesson", "training", "rest"].includes(action);
  }

  function isSandboxFirstLiveHarnessTurn(turn) {
    return Boolean(turn && turn.kind === "sandbox_first_live" && turn.action === "sandbox_first_live");
  }

  function isHarnessTurnInActiveScope(turn, context = {}) {
    if (!turn || typeof turn !== "object" || Array.isArray(turn)) return false;
    if (context.isHost) {
      const turnScope = String(turn.saveScope || "");
      const activeScope = String(context.activeHostSaveScope || "");
      return Boolean(turnScope && activeScope && turnScope === activeScope);
    }
    const turnStorageKey = String(turn.storageKey || "");
    const activeKey = String(context.activeStorageKey || "");
    return Boolean(turnStorageKey && activeKey && turnStorageKey === activeKey);
  }

  function getHarnessRecoveryDisposition(turn, context) {
    context = context && typeof context === "object" ? context : {};
    const recoverable = Boolean(
      turn
      && (
        (turn.kind === "produce_action" && isHarnessOrdinaryAction(turn.action))
        || (turn.kind === "map_explore" && turn.action === "map_location")
        || turn.kind === "storyteller_event"
        || (turn.kind === "sandbox_first_live" && turn.action === "sandbox_first_live")
      )
    );
    if (!recoverable) return "none";
    if (!isHarnessTurnInActiveScope(turn, context)) return "none";
    if (turn.status === "recovery_required") return "pending";
    if (turn.sessionEpoch === context.runtimeSessionEpoch) return "none";
    const interruptedStatuses = ["storyteller_event", "sandbox_first_live"].includes(turn.kind)
      ? ["prepared", "generating"]
      : ["settled", "generating"];
    return interruptedStatuses.includes(turn.status) ? "transition" : "none";
  }

  function getHarnessRecoveryContext() {
    return {
      runtimeSessionEpoch,
      isHost: isSillyTavernHost(),
      activeHostSaveScope: String(activeHostSaveScope || ""),
      activeStorageKey: String(activeStorageKey || "")
    };
  }

  function markHarnessRecoveryRequired() {
    const turn = state.harness?.activeTurn;
    const context = getHarnessRecoveryContext();
    const disposition = getHarnessRecoveryDisposition(turn, context);
    if (disposition === "none") return null;
    if (disposition === "pending") return turn;
    const now = Date.now();
    state.harness.activeTurn = {
      ...turn,
      status: "recovery_required",
      interruptedStatus: turn.status,
      interruptedSessionEpoch: turn.sessionEpoch,
      recoveryRequiredAt: now,
      updatedAt: now
    };
    if (turn.kind === "sandbox_first_live" && turn.action === "sandbox_first_live" && state.sandbox?.firstLiveChallenge) {
      state.sandbox.firstLiveChallenge.status = "recovery_required";
      if (state.sandbox.firstLiveChallenge.activeAttempt) {
        state.sandbox.firstLiveChallenge.activeAttempt.status = "recovery_required";
      }
    }
    recordHarnessTrace("turn.recovery_required", {
      turnId: turn.turnId || "",
      requestId: turn.requestId || "",
      action: turn.action || "",
      interruptedStatus: turn.status || ""
    });
    saveState("harness.recovery_required");
    return state.harness.activeTurn;
  }

  function buildHarnessRecoveryPromptKey(turn, context) {
    const scopeKey = context.isHost
      ? `host:${String(context.activeHostSaveScope || "")}`
      : `local:${String(context.activeStorageKey || "")}`;
    return `${scopeKey}:${String(turn?.turnId || "")}`;
  }

  function openHarnessRecoveryOverlay(turn) {
    const actionNames = { lesson: "上课", training: "训练", rest: "休息", sandbox_first_live: "校内舞台 First Live" };
    const actionName = turn?.kind === "map_explore"
      ? String(turn.locationName || "地图探索")
        : turn?.kind === "storyteller_event"
          ? "初星世界事件"
          : turn?.kind === "sandbox_first_live"
            ? "校内舞台 First Live"
          : actionNames[turn?.action] || "普通行动";
    const title = document.getElementById("harnessRecoveryTitle");
    const summary = document.getElementById("harnessRecoverySummary");
    const promptNote = document.getElementById("harnessRecoveryPromptNote");
    const retryButton = document.getElementById("harnessRecoveryRetryBtn");
    const abandonButton = document.getElementById("harnessRecoveryAbandonBtn");
    if (title) title.textContent = `${actionName}叙事尚未确认`;
    if (summary) {
      summary.textContent = turn?.kind === "map_explore"
        ? "本次地图移动或探索的时间、地点和日志已经结算，不会回滚或再次结算。"
        : turn?.kind === "storyteller_event"
          ? "这项世界事件没有执行数值、时间、资源或任务结算；恢复只会补写事件叙事。"
          : turn?.kind === "sandbox_first_live"
            ? "First Live 的属性判定、随机结果、冷却和 3 小时时间已经结算；恢复只会补写 live_pre/live_post。"
          : "本次行动的数值、随机结果和时间已经结算，不会回滚或再次结算。";
    }
    if (promptNote) {
      promptNote.textContent = resolveHarnessRecoveryPrompt(turn)
        ? "已保留原始行动提示词。重新生成只会补写叙事，不会再次结算本次行动。"
        : "原始行动提示词缺失或无法确认归属，不能重新生成；你仍可暂时关闭提示。";
    }
    if (retryButton) retryButton.disabled = !resolveHarnessRecoveryPrompt(turn);
    if (abandonButton) abandonButton.disabled = false;
    setElementHidden("harnessRecoveryOverlay", false);
  }

  function closeHarnessRecoveryOverlay() {
    setElementHidden("harnessRecoveryOverlay", true);
  }

  function resolveHarnessRecoveryPrompt(turn) {
    if (!turn || turn.status !== "recovery_required") return "";
    if (turn.generationPromptStatus !== "captured") return "";
    const prompt = String(turn.generationPrompt || "");
    const recordedLength = Number(turn.generationPromptLength);
    if (!prompt.trim() || prompt.length > HARNESS_RECOVERY_PROMPT_MAX_LENGTH) return "";
    if (!Number.isFinite(recordedLength) || recordedLength !== prompt.length) return "";
    return prompt;
  }

  function hasConflictingHarnessRecoveryFlow() {
    return Boolean(getPrimaryModelChannelOwner() || String(pendingAiRequestId || "") || String(state.pendingAiRequestId || ""));
  }

  function returnHarnessRecoveryAttemptToPending(requestId, reason = "generation_failed") {
    const turn = state.harness?.activeTurn;
    if (
      !turn
      || !["produce_action", "map_explore", "storyteller_event", "sandbox_first_live"].includes(turn.kind)
      || turn.status !== "generating"
      || turn.sessionEpoch !== runtimeSessionEpoch
      || !requestId
      || turn.requestId !== requestId
    ) {
      return false;
    }
    const now = Date.now();
    state.harness.activeTurn = {
      ...turn,
      status: "recovery_required",
      requestId: "",
      recoveryFailureReason: String(reason || "generation_failed"),
      recoveryFailedAt: now,
      updatedAt: now
    };
    const recoveryAttempt = Number(turn.recoveryAttemptCount || 0) > 0;
    recordHarnessTrace(recoveryAttempt ? "turn.recovery_send_failed" : "turn.recovery_required", {
      turnId: turn.turnId || "",
      requestId,
      action: turn.action || "",
      attemptCount: Number(turn.recoveryAttemptCount || 0),
      reason: String(reason || "generation_failed")
    });
    return true;
  }

  function retryHarnessNarrativeRecovery() {
    const turn = state.harness?.activeTurn;
    const context = getHarnessRecoveryContext();
    if (
      !turn
      || !["produce_action", "map_explore", "storyteller_event", "sandbox_first_live"].includes(turn.kind)
      || turn.status !== "recovery_required"
      || !(
        (turn.kind === "produce_action" && isHarnessOrdinaryAction(turn.action))
        || (turn.kind === "map_explore" && turn.action === "map_location")
        || turn.kind === "storyteller_event"
        || (turn.kind === "sandbox_first_live" && turn.action === "sandbox_first_live")
      )
      || !isHarnessTurnInActiveScope(turn, context)
    ) {
      showToast("无法恢复叙事", "当前恢复记录不属于这个存档，未发送任何请求。", "warn");
      return false;
    }
    const prompt = resolveHarnessRecoveryPrompt(turn);
    if (!prompt) {
      showToast("无法恢复叙事", "原始行动提示词缺失或校验失败，未发送任何请求。", "warn");
      return false;
    }
    if (hasConflictingHarnessRecoveryFlow()) {
      showToast("模型请求处理中", "另一个主叙事请求仍在进行，请等待它结束后再恢复。", "warn");
      return false;
    }

    const previousRequestId = String(turn.requestId || "");
    const requestId = createRequestId();
    const recoveryOwnerKind = turn.kind === "map_explore"
      ? "map_recovery"
      : turn.kind === "storyteller_event"
        ? "storyteller_event_recovery"
        : turn.kind === "sandbox_first_live"
          ? "sandbox_first_live_recovery"
        : "ordinary_recovery";
    const acquired = tryAcquirePrimaryModelChannel({
      requestId,
      ownerKind: recoveryOwnerKind,
      turnId: turn.turnId,
      saveScope: turn.saveScope,
      sessionEpoch: runtimeSessionEpoch
    });
    if (!acquired.ok) {
      rejectPrimaryModelDispatch(acquired.blockingOwner, { requestId, ownerKind: recoveryOwnerKind });
      return false;
    }
    const now = Date.now();
    state.harness.activeTurn = {
      ...turn,
      status: "generating",
      sessionEpoch: runtimeSessionEpoch,
      requestId,
      requestIds: appendHarnessRequestId(turn.requestIds, requestId),
      recoveryAttemptCount: Number(turn.recoveryAttemptCount || 0) + 1,
      recoveryStartedAt: now,
      updatedAt: now
    };
    if (turn.kind === "sandbox_first_live" && turn.action === "sandbox_first_live" && state.sandbox?.firstLiveChallenge) {
      state.sandbox.firstLiveChallenge.status = "generating";
      if (state.sandbox.firstLiveChallenge.activeAttempt) {
        state.sandbox.firstLiveChallenge.activeAttempt.status = "generating";
      }
    }
    pendingAiRequestId = requestId;
    state.pendingAiRequestId = requestId;
    state.lastPrompt = prompt;
    aiReplyRetryCount = 0;
    recordHarnessTrace("turn.recovery_started", {
      turnId: turn.turnId || "",
      requestId,
      previousRequestId,
      action: turn.action || "",
      attemptCount: state.harness.activeTurn.recoveryAttemptCount
    });

    if (!requestHostPromptSend(prompt, requestId, {
      channelLeaseId: acquired.owner.channelLeaseId,
      ownerKind: recoveryOwnerKind,
      generationMode: "shujuku_same_layer",
      turnId: turn.turnId
    })) {
      pendingAiRequestId = "";
      state.pendingAiRequestId = "";
      returnHarnessRecoveryAttemptToPending(requestId, "send_failed");
      saveState("harness.recovery_send_failed");
      render();
      openHarnessRecoveryOverlay(state.harness.activeTurn);
      showToast("叙事请求未发送", "恢复记录已保留，可以稍后再次尝试。", "warn");
      return false;
    }

    closeHarnessRecoveryOverlay();
    const actionNames = { lesson: "上课", training: "训练", rest: "休息", sandbox_first_live: "校内舞台 First Live" };
    const actionName = turn.kind === "map_explore"
      ? String(turn.locationName || "地图探索")
      : turn.kind === "storyteller_event"
        ? "初星世界事件"
        : actionNames[turn.action] || "普通行动";
    openEventOverlay(
      actionName,
      "已重新发送原始行动提示词，等待 AI 回复",
      turn.kind === "storyteller_event"
        ? "本次只会重新生成事件叙事，不会执行数值、时间、资源、任务或日志结算。"
        : turn.kind === "sandbox_first_live"
          ? "本次只会重新生成 live_pre/live_post，不会再次判定、推进时间或写入任务。"
        : "本次仅恢复叙事，不会重复结算数值、随机事件、时间或日志。"
    );
    return true;
  }

  function abandonHarnessNarrativeRecovery() {
    const turn = state.harness?.activeTurn;
    const context = getHarnessRecoveryContext();
    if (
      !turn
      || !["produce_action", "map_explore", "storyteller_event", "sandbox_first_live"].includes(turn.kind)
      || turn.status !== "recovery_required"
      || !(
        (turn.kind === "produce_action" && isHarnessOrdinaryAction(turn.action))
        || (turn.kind === "map_explore" && turn.action === "map_location")
        || turn.kind === "storyteller_event"
        || (turn.kind === "sandbox_first_live" && turn.action === "sandbox_first_live")
      )
      || !isHarnessTurnInActiveScope(turn, context)
    ) {
      showToast("无法放弃恢复", "当前恢复记录不属于这个存档，未修改任何状态。", "warn");
      return false;
    }
    const confirmed = window.confirm(
      "放弃后不会补写本次叙事。已经结算的数值、随机结果、轮次和时间不会回滚。确认放弃吗？"
    );
    if (!confirmed) return false;

    if (turn.kind === "storyteller_event" && typeof abandonStorytellerEventCandidateForTurn === "function") {
      abandonStorytellerEventCandidateForTurn(turn, "narrative_abandoned");
    } else if (typeof expireStorytellerCandidateForTurn === "function") {
      expireStorytellerCandidateForTurn(turn, "narrative_abandoned");
    }
    if (turn.kind === "sandbox_first_live") {
      const attempt = state.sandbox?.firstLiveChallenge?.activeAttempt;
      if (attempt) {
        attempt.status = "abandoned";
        state.sandbox.firstLiveChallenge.status = attempt.success ? "completed" : "cooldown";
      }
    }
    const now = Date.now();
    state.harness.activeTurn = {
      ...turn,
      status: "abandoned",
      requestId: "",
      abandonedAt: now,
      updatedAt: now
    };
    recordHarnessTrace("turn.abandoned", {
      turnId: turn.turnId || "",
      requestId: turn.requestId || "",
      action: turn.action || ""
    });
    saveState("harness.recovery_abandoned");
    closeHarnessRecoveryOverlay();
    render();
    showToast("已放弃叙事恢复", turn.kind === "storyteller_event"
      ? "这项世界事件已放弃，不会补写叙事。"
      : turn.kind === "sandbox_first_live"
        ? "First Live 的前端判定保持不变，不会补写演出叙事。"
      : "本次行动的既有结算保持不变，可以继续普通行动。", "info");
    return true;
  }

  function maybeShowHarnessRecoveryPrompt(options = {}) {
    const turn = markHarnessRecoveryRequired();
    if (!turn) return false;
    const key = buildHarnessRecoveryPromptKey(turn, getHarnessRecoveryContext());
    if (!options.force && shownHarnessRecoveryKeys.has(key)) return false;
    shownHarnessRecoveryKeys.add(key);
    openHarnessRecoveryOverlay(turn);
    return true;
  }

  function buildHarnessActionKey(action, attribute) {
    const schedule = isHybridFacilityActive()
      ? `free:${state.freeMode.postLiveDay}:${state.freeMode.clockMinutes}`
      : `produce:${state.day}:${state.round}`;
    return `${schedule}:${action}:${attribute || "-"}`;
  }

  function buildHarnessPreTurnSnapshot() {
    const hybridFacility = isHybridFacilityActive();
    return {
      day: Number(state.day) || 1,
      round: Number(state.round) || 1,
      postLiveDay: hybridFacility ? Number(state.freeMode?.postLiveDay) || 1 : null,
      clockMinutes: hybridFacility ? Number(state.freeMode?.clockMinutes) || 0 : null,
      stamina: Number(state.stamina) || 0,
      stress: Number(state.stress) || 0,
      trust: Number(state.trust) || 0,
      Vo: Number(state.Vo) || 0,
      Da: Number(state.Da) || 0,
      Vi: Number(state.Vi) || 0,
      sp: {
        Vo: Boolean(state.sp?.Vo),
        Da: Boolean(state.sp?.Da),
        Vi: Boolean(state.sp?.Vi)
      }
    };
  }

  function beginHarnessProduceAction(action, attribute) {
    const recoveryTurn = state.harness?.activeTurn;
    if (
      recoveryTurn
      && recoveryTurn.status === "recovery_required"
      && (
        (recoveryTurn.kind === "produce_action" && isHarnessOrdinaryAction(recoveryTurn.action))
        || (recoveryTurn.kind === "map_explore" && recoveryTurn.action === "map_location")
        || recoveryTurn.kind === "storyteller_event"
      )
      && isHarnessTurnInActiveScope(recoveryTurn, getHarnessRecoveryContext())
    ) {
      recordHarnessTrace("turn.rejected_recovery_pending", {
        turnId: recoveryTurn.turnId || "",
        action,
        blockedByAction: recoveryTurn.action || ""
      });
      saveState("harness.recovery_pending_guard");
      showToast("叙事恢复待处理", "请先重新生成或明确放弃上一行动的叙事恢复。", "warn");
      maybeShowHarnessRecoveryPrompt({ force: true });
      return { ok: false };
    }
    const actionKey = buildHarnessActionKey(action, attribute);
    const blockingTurn = state.harness?.activeTurn;
    if (isHarnessTurnBlocking(blockingTurn, runtimeSessionEpoch)) {
      recordHarnessTrace("turn.rejected_duplicate", {
        turnId: blockingTurn.turnId || "",
        action,
        actionKey
      });
      showToast("行动处理中", "当前行动仍在结算或等待剧情回复，请勿重复提交。", "warn");
      return { ok: false };
    }
    const now = Date.now();
    const turnId = createHarnessId("turn");
    state.harness.activeTurn = {
      turnId,
      kind: "produce_action",
      status: "prepared",
      actionKey,
      action,
      attribute: ["Vo", "Da", "Vi"].includes(attribute) ? attribute : null,
      requestId: "",
      saveScope: String(activeHostSaveScope || ""),
      storageKey: String(activeStorageKey || ""),
      sessionEpoch: runtimeSessionEpoch,
      startPersistenceRevision: state.harness.persistenceRevision,
      settledPersistenceRevision: null,
      generationPrompt: "",
      generationPromptLength: 0,
      generationPromptStatus: "missing",
      requestIds: [],
      recoveryAttemptCount: 0,
      snapshot: buildHarnessPreTurnSnapshot(),
      createdAt: now,
      updatedAt: now
    };
    recordHarnessTrace("turn.prepared", { turnId, action, actionKey });
    debugHarnessEvent("turn.prepared", { turnId, action, actionKey });
    return { ok: true, turnId };
  }

  function beginHarnessMapExploreTurn(stepKind, details = {}) {
    details = details && typeof details === "object" ? details : {};
    if (!["arrival", "explore_choice", "custom_choice"].includes(stepKind)) {
      return { ok: false, reason: "invalid_map_step" };
    }
    const recoveryTurn = state.harness?.activeTurn;
    if (
      recoveryTurn
      && recoveryTurn.status === "recovery_required"
      && (
        (recoveryTurn.kind === "produce_action" && isHarnessOrdinaryAction(recoveryTurn.action))
        || (recoveryTurn.kind === "map_explore" && recoveryTurn.action === "map_location")
        || recoveryTurn.kind === "storyteller_event"
      )
      && isHarnessTurnInActiveScope(recoveryTurn, getHarnessRecoveryContext())
    ) {
      recordHarnessTrace("turn.rejected_recovery_pending", {
        turnId: recoveryTurn.turnId || "",
        action: "map_location",
        blockedByAction: recoveryTurn.action || ""
      });
      saveState("harness.recovery_pending_guard");
      showToast("叙事恢复待处理", "请先重新生成或明确放弃上一回合的叙事恢复。", "warn");
      maybeShowHarnessRecoveryPrompt({ force: true });
      return { ok: false, reason: "recovery_pending" };
    }
    const blockingTurn = state.harness?.activeTurn;
    if (isHarnessTurnBlocking(blockingTurn, runtimeSessionEpoch)) {
      recordHarnessTrace("turn.rejected_duplicate", {
        turnId: blockingTurn.turnId || "",
        action: "map_location",
        actionKey: `map:${String(details.locationId || "")}:${stepKind}`
      });
      showToast("行动处理中", "当前剧情请求仍在处理，请勿重复提交地图行动。", "warn");
      return { ok: false, reason: "turn_blocked" };
    }
    const now = Date.now();
    const turnId = createHarnessId("map-turn");
    state.harness.activeTurn = {
      turnId,
      kind: "map_explore",
      status: "prepared",
      stepKind,
      action: "map_location",
      locationId: String(details.locationId || "").slice(0, 120),
      locationName: String(details.locationName || "").slice(0, 120),
      selectedAction: String(details.selectedAction || "").replace(/\s+/g, " ").trim().slice(0, 160),
      settledMinutes: Math.max(0, Math.min(240, Number(details.settledMinutes) || 0)),
      requestId: "",
      requestIds: [],
      saveScope: String(activeHostSaveScope || ""),
      storageKey: String(activeStorageKey || ""),
      sessionEpoch: runtimeSessionEpoch,
      startPersistenceRevision: state.harness.persistenceRevision,
      settledPersistenceRevision: null,
      generationPrompt: "",
      generationPromptLength: 0,
      generationPromptStatus: "missing",
      storytellerCandidateRef: null,
      recoveryAttemptCount: 0,
      snapshot: {
        dayKey: String(getWorldFeedDayKey() || "").slice(0, 120),
        clockMinutes: Math.max(0, Number(state.freeMode?.clockMinutes) || 0),
        locationId: String(state.freeMode?.activeLocationId || "").slice(0, 120),
        pendingAction: String(state.pendingActionContext?.action || "").slice(0, 100)
      },
      createdAt: now,
      updatedAt: now
    };
    recordHarnessTrace("turn.prepared", { turnId, action: "map_location", stepKind });
    debugHarnessEvent("turn.prepared", { turnId, action: "map_location", stepKind });
    return { ok: true, turnId };
  }

  function beginHarnessStorytellerEventTurn(candidate, requestId, options) {
    candidate = globalThis.HatsuWorldStorytellerIncidents?.normalizeIncidentCandidate?.(candidate);
    requestId = String(requestId || "");
    options = options && typeof options === "object" ? options : {};
    const saveScope = String(activeHostSaveScope || activeStorageKey || "");
    if (
      !candidate
      || !requestId
      || candidate.channel !== "invite"
      || !["notified", "deferred"].includes(candidate.status)
      || candidate.saveScope !== saveScope
    ) return { ok: false, reason: "candidate_unavailable" };
    const now = Date.now();
    const turnId = String(options.turnId || createHarnessId("storyteller-turn"));
    state.harness.activeTurn = {
      turnId,
      kind: "storyteller_event",
      status: "prepared",
      action: "storyteller_event",
      incidentId: candidate.incidentId,
      requestId,
      requestIds: appendHarnessRequestId([], requestId),
      saveScope,
      storageKey: String(activeStorageKey || ""),
      sessionEpoch: runtimeSessionEpoch,
      startPersistenceRevision: state.harness.persistenceRevision,
      settledPersistenceRevision: null,
      generationPrompt: "",
      generationPromptLength: 0,
      generationPromptStatus: "missing",
      storytellerCandidateRef: {
        incidentId: candidate.incidentId,
        planId: candidate.planId,
        saveScope: candidate.saveScope,
        dayKey: candidate.dayKey,
        sourceTurnId: candidate.sourceTurnId
      },
      recoveryAttemptCount: 0,
      snapshot: {
        dayKey: String(candidate.dayKey || "").slice(0, 120),
        clockMinutes: Math.max(0, Number(state.freeMode?.clockMinutes) || 0),
        locationId: String(candidate.locationId || "").slice(0, 120)
      },
      createdAt: now,
      updatedAt: now
    };
    recordHarnessTrace("turn.prepared", { turnId, action: "storyteller_event", incidentId: candidate.incidentId });
    debugHarnessEvent("turn.prepared", { turnId, action: "storyteller_event" });
    return { ok: true, turnId };
  }

  function markHarnessMapExploreTurn(status, patch = {}, expectedRequestId = "") {
    const turn = state.harness?.activeTurn;
    if (!turn || turn.kind !== "map_explore" || turn.sessionEpoch !== runtimeSessionEpoch) return false;
    if (expectedRequestId && turn.requestId !== expectedRequestId) return false;
    state.harness.activeTurn = {
      ...turn,
      ...patch,
      status,
      updatedAt: Date.now()
    };
    recordHarnessTrace(`turn.${status}`, {
      turnId: turn.turnId || "",
      requestId: state.harness.activeTurn.requestId || "",
      action: "map_location",
      stepKind: turn.stepKind || ""
    });
    debugHarnessEvent(`turn.${status}`, {
      turnId: turn.turnId || "",
      requestId: state.harness.activeTurn.requestId || ""
    });
    return true;
  }

  function markHarnessProduceTurn(status, patch = {}, expectedRequestId = "") {
    const turn = state.harness?.activeTurn;
    if (!turn || turn.kind !== "produce_action" || turn.sessionEpoch !== runtimeSessionEpoch) return false;
    if (expectedRequestId && turn.requestId !== expectedRequestId) return false;
    state.harness.activeTurn = {
      ...turn,
      ...patch,
      status,
      updatedAt: Date.now()
    };
    recordHarnessTrace(`turn.${status}`, {
      turnId: turn.turnId || "",
      requestId: state.harness.activeTurn.requestId || "",
      action: turn.action || "",
      actionKey: turn.actionKey || ""
    });
    debugHarnessEvent(`turn.${status}`, {
      turnId: turn.turnId || "",
      requestId: state.harness.activeTurn.requestId || ""
    });
    return true;
  }

  function markHarnessSandboxFirstLiveTurn(status, patch = {}, expectedRequestId = "") {
    const turn = state.harness?.activeTurn;
    if (!isSandboxFirstLiveHarnessTurn(turn) || turn.sessionEpoch !== runtimeSessionEpoch) return false;
    if (expectedRequestId && turn.requestId !== expectedRequestId) return false;
    state.harness.activeTurn = { ...turn, ...patch, status, updatedAt: Date.now() };
    recordHarnessTrace(`turn.${status}`, {
      turnId: turn.turnId || "",
      requestId: state.harness.activeTurn.requestId || "",
      action: "sandbox_first_live"
    });
    debugHarnessEvent(`turn.${status}`, { turnId: turn.turnId || "", requestId: state.harness.activeTurn.requestId || "" });
    return true;
  }

  function buildAiWaitingResult(resultSummary) {
    return `${resultSummary}\n\n已向当前角色卡发送剧情生成请求，等待 AI 回复。`;
  }

  function buildAiWaitingStory(story) {
    return `${story}\n\n正在等待角色卡 AI 生成本次小剧情...`;
  }

  function buildDebugText(actionName, delta, randomEvent, actionContext = {}) {
    const spList = Object.entries(state.sp || {}).filter(([, active]) => active).map(([key]) => `${key}训练`).join("、") || "无";
    return [
      `行动：${actionName}`,
      actionContext.destination ? `外出地点：${actionContext.destination}` : null,
      `结算：${formatDelta(delta) || "无数值变化"}`,
      randomEvent ? `随机事件：${formatRandomEvent(randomEvent)}` : "随机事件：未触发",
      `下一轮 SP 候选：${spList}`,
      "规则：前端只负责结算与提示词构造，LLM 负责把已结算结果改写成角色叙事。"
    ].filter(Boolean).join("\n");
  }

  function buildPendingStory(actionName, resultSummary, randomEvent = null, actionContext = {}) {
    const eventLine = randomEvent
      ? `\n\n本次触发随机互动：${randomEvent.scene}，${randomEvent.character}${randomEvent.mood}。`
      : "";
    const locationLine = actionContext.destination ? `\n\n本次外出地点：${actionContext.destination}。` : "";
    return `${actionName}已经由前端完成结算。\n\n${resultSummary}\n\n剧情正文等待角色卡 AI 回复生成。点击“让 AI 生成后续”后，可以先编辑提示词，再发送给当前 SillyTavern 对话。${locationLine}${eventLine}`;
  }

  function galgameRenderContract(mode = "normal") {
    if (mode === "choice") {
      return `【初星学园 Galgame 渲染规则契约】
- 选项剧情必须输出完整四个 option。
- <story> 内只用 <dialogue char="角色名"> 与 <narration>；不要 Markdown、列表、数值结算或标签外说明。
- 【初星正文结束】之后必须额外输出 <sum>1-2句剧情小结</sum>。`;
    }

    return `【初星学园 Galgame 渲染规则契约】
- 正文写在【初星正文开始】…【初星正文结束】内，普通剧情中只使用：<dialogue char="角色名"> 与 <narration>。
- 不要输出 option、Markdown、列表或数值结算。
- 【初星正文结束】之后必须额外输出 <sum>1-2句剧情小结</sum>：从时间、空间、地点、人物、行为、对话、事件概括本次正文；<sum> 不进入 story。`;
  }

  function outputContract(maxText) {
    return `${galgameRenderContract("normal")}
- 不要改算前端已结算数值；正文前后不要输出系统说明。
- ${maxText}`;
  }

  function buildChoiceHardRules(options = {}) {
    const {
      phase1 = false,
      includeTime = false,
      includeRelationship = false,
      storyNote = ""
    } = options;
    const tagList = phase1
      ? "<story> + <option1>～<option4>"
      : includeTime
        ? `<story> + <option1>～<option4> + <time1>～<time4>${includeRelationship ? " + <relationship_update>" : ""}`
        : "<story> + <option1>～<option4>";
    const lines = [
      "【输出硬规则】",
      `1. 全部放在【初星正文开始】…【初星正文结束】内，只含 ${tagList}。`,
      phase1
        ? "2. <story> 停在待选择转折点；option 为制作人第一人称，不带“选项1：”等前缀。"
        : "2. option 为制作人第一人称，不带“选项1：”等前缀；标签外不要思考或说明。"
    ];
    if (includeTime) {
      lines.push(`3. time 为整数分钟，缺省 ${FREE_MODE_MAP_CHOICE_MINUTES}。`);
    }
    if (storyNote) lines.push(storyNote);
    return lines.join("\n");
  }

  function buildMapExploreChoiceExample(includeRelationship = true) {
    const relationshipLine = includeRelationship
      ? "\n<relationship_update>{}</relationship_update>"
      : "";
    return `输出示例：
【初星正文开始】
<story>...</story>
<option1>...</option1><time1>15</time1>
<option2>...</option2><time2>30</time2>
<option3>...</option3><time3>10</time3>
<option4>...</option4><time4>20</time4>${relationshipLine}
【初星正文结束】
<sum>1-2句概括本次探索的时间、地点、人物与事件。</sum>`;
  }

  function buildMapExplorePlayRules(options = {}) {
    const { outing = false, relationship = true } = options;
    const timing = `抵达 +${FREE_MODE_MAP_ARRIVAL_MINUTES} 分；每次选择按 time 推进（缺省 ${FREE_MODE_MAP_CHOICE_MINUTES} 分），多轮循环。`;
    const modeLine = outing
      ? `校外连续探索，不是育成一次性外出；不要当天收束或结算体力/压力/信赖。${timing}`
      : `连续选项探索，只写当前场景，不写选中后收尾。${timing}`;
    const valueLine = relationship
      ? "旧育成数值勿改；好感度仅通过 <relationship_update> 输出增量 JSON。"
      : "不要结算或修改数值。";
    return `- ${modeLine}
- ${valueLine}
- 四个 option 风味不同，制作人第一人称。`;
  }

  function buildChoiceOnlyExample() {
    return `输出示例：
【初星正文开始】
<story>...</story>
<option1>...</option1>
<option2>...</option2>
<option3>...</option3>
<option4>...</option4>
【初星正文结束】
<sum>1-2句概括本次选项剧情。</sum>`;
  }

  function buildMapExploreChoiceOutputBlock(options = {}) {
    const { includeRelationship = true } = options;
    return `${buildMapExploreChoiceExample(includeRelationship)}

${buildChoiceHardRules({ includeTime: true, includeRelationship })}`;
  }

  function buildProducerPromptSection() {
    if (!state.producer) return "";
    const lines = [];
    const name = String(state.producer.name || "").trim();
    if (name && name !== "{{user}}") lines.push(`称呼：${name}`);
    if (state.producer.gender) lines.push(`性别：${state.producer.gender}`);
    if (state.producer.personality) lines.push(`性格：${state.producer.personality}`);
    if (state.producer.style) lines.push(`说话风格：${state.producer.style}`);
    if (state.producer.settings) lines.push(`背景：${state.producer.settings}`);
    if (!lines.length) return "";
    return `
制作人（{{user}}）设定：
${lines.map((line) => `- ${line}`).join("\n")}
`;
  }

  function summarizeProduceActionContext() {
    const source = String(state.lastEventStory || state.lastStory || "").trim();
    if (!source || /^请选择行动$/.test(source)) return "（暂无上文摘要；若当前不是担当开场，请直接写本次行动现场。）";
    const cleaned = cleanReplyText(stripAiThinkingBlocks(source)
      .replace(/[【\[]\s*初星正文开始\s*[】\]]/g, "")
      .replace(/[【\[]\s*初星正文结束\s*[】\]][\s\S]*$/u, "")
      .replace(/<option[1-4]\b[^>]*>[\s\S]*?<\/option[1-4]>/gi, "")
      .replace(/<time[1-4]\b[^>]*>[\s\S]*?<\/time[1-4]>/gi, "")
      .replace(/<sum\b[^>]*>[\s\S]*?<\/sum>/gi, ""))
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return "（暂无上文摘要；若当前不是担当开场，请直接写本次行动现场。）";
    return cleaned.length > 420 ? `${cleaned.slice(0, 420)}...` : cleaned;
  }
  function buildPrompt(action, attribute, resultText, randomEvent = null, actionContext = {}) {
    const profile = idols[state.idol];
    const actionName = actionLabel(action, attribute);
    const actionStyle = profile.styles[action] || profile.styles.rest;
    const destinationPrompt = action === "outing" && actionContext.destination ? `
本次外出地点：${actionContext.destination}

外出场景要求：
- 制作人与担当偶像确实来到该地点活动，不要把地点只当作一句背景说明。
- 利用该地点可见的设施、商品、声音、气味或人群推动互动。
- 在本次回复内完成抵达、游玩/交流和当天收束，不要停在刚到目的地。
` : "";
    const continuityPrompt = `

上文摘要（仅供衔接，不要原文复述）：
${summarizeProduceActionContext()}

连续性要求：
- 本轮是当前日程的「${actionName}」，必须直接写本次行动现场和行动后的反应。
- 如果上文已经完成担当开场或确认担当关系，不要重写担当开场，不要再次写初遇、递名片、递契约书或重新签约。
- 不要把课程、训练、休息或外出写成重新建立育成关系；只写前端已经结算的本次行动。`;

    const eventPrompt = randomEvent ? `

本次行动触发随机互动事件：
- 互动角色：${randomEvent.character}
- 事件场景：${randomEvent.scene}
- 事件方向：${randomEvent.mood}
- 额外奖励：${formatDelta(randomEvent.reward)}

叙事要求：
- 在正常${actionName}叙事基础上，自然加入这名角色与当前担当的互动。
- 互动必须服务于本次行动结果，不要写成完全独立的支线。
- 先承认随机结果已经由前端结算，再用角色关系和性格解释为什么产生这个额外增益。
- 不要额外增加未列出的数值。` : "";

    const narrativeLength = ["outing", "companion", "intimacy"].includes(action)
      ? "请写一段 900 字以内的完整场景叙事。本次回复需要把本次行动的情景从开始、互动推进到当天收束完整写完，不要停在待续。"
      : "请写一段 400 字以内的短叙事。";
    const directorPrompt = composeWorldDirectorPromptAddendum({
      participants: [state.idol],
      locationId: actionContext.locationId
    });
    const storytellerIncidentPrompt = globalThis.HatsuWorldStorytellerInjection
      ?.composeStorytellerIncidentPromptAddendum?.(actionContext.storytellerCandidate, { action, attribute }) || "";
    const authorityContract = globalThis.HatsuWorldStorytellerInjection
      ?.composeNarrativeAuthorityContract?.({
        hasDirector: Boolean(directorPrompt),
        hasStoryteller: Boolean(storytellerIncidentPrompt)
      }) || "";

    return `[初星育成系统：行动已经由前端结算]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按担当偶像写"}
当前阶段：${getPhase()}
当前日程：第 ${state.day} 天，${roundLabel()}
行动：${actionName}
行动结果：${resultText}
当前状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 体力 ${state.stamina} / 压力 ${state.stress} / 信赖 ${state.trust}
成长率：Vo ${state.growth?.Vo} / Da ${state.growth?.Da} / Vi ${state.growth?.Vi}
本轮SP候选：${Object.entries(state.sp || {}).filter(([, active]) => active).map(([key]) => `${key}训练`).join("、") || "无"}

角色核心：
${profile.core}${continuityPrompt}
${buildProducerPromptSection()}
${composeWorldSummaryBlock("produce")}

本行动叙事规则：
${actionStyle}${destinationPrompt}${eventPrompt}

${directorPrompt ? `${directorPrompt}\n\n` : ""}${storytellerIncidentPrompt ? `${storytellerIncidentPrompt}\n\n` : ""}${authorityContract ? `${authorityContract}\n\n` : ""}${outputContract(narrativeLength)}`;
  }

  function buildChoicePhase1Prompt(action, attribute, shuffledRewards, actionContext = {}) {
    if (action === "intimacy" && getIntimacyMode() === "nsfw") {
      return buildNsfwIntimacyOpeningPrompt(actionContext);
    }

    const profile = idols[state.idol];
    const actionName = actionLabel(action, attribute);
    const actionStyle = action === "intimacy"
      ? `${profile.styles.companion || profile.styles.rest} 这是信赖值60后解锁的普通亲密互动，重点写安心、信任、被允许靠近与互相照顾。`
      : profile.styles[action] || profile.styles.rest;
    
    const destinationPrompt = action === "outing" && actionContext.destination ? `
本次外出地点：${actionContext.destination}

外出场景要求：
- 制作人与担当偶像确实来到该地点活动。
- 利用该地点可见的设施、商品、声音、气味或人群推动互动。
- 剧情前半部分在抵达并展开活动、进入需要制作人表态或做选择的时刻停下。
` : "";

    const companionTopicPrompt = action === "companion" && actionContext.companionTopic ? `
制作人指定的交流内容：
${actionContext.companionTopic}

交流场景要求：
- 前半段剧情必须围绕制作人指定的交流内容展开，不要擅自改成无关话题。
- 选项必须是制作人对当前交流情境的四种不同回应方式，且应与指定内容相关。
- 剧情前半部分在交流自然推进、进入需要制作人表态或做选择的时刻停下。
` : "";

    const tierDescriptions = {
      20: "【完美回复/完美互动】：最契合你的隐藏心思或真实性格，展现出极强的默契，能让你感到非常受触动或心跳加速。",
      15: "【极佳回复/极佳互动】：优秀的互动回复，你感到非常开心，反应积极热切。",
      10: action === "outing" 
        ? "【完美回复/完美互动】：最契合你的隐藏心思或真实性格，展现出极强的默契，能让你感到非常受触动或心跳加速。" 
        : "【普通回复】：中规中矩的互动，没有说错话但有些普通或老套。",
      8: "【极佳回复/极佳互动】：优秀的互动回复，你感到非常开心，反应积极热切。",
      6: "【普通回复】：中规中矩的互动，没有说错话但有些普通或老套。",
      5: "【笨拙回复】：有点不解风情、笨拙、让人感到无奈或者微微叹气娇嗔的选项。",
      4: "【笨拙回复】：有点不解风情、笨拙、让人感到无奈或者微微叹气娇嗔的选项。"
    };

    const optionsPrompt = action === "intimacy"
      ? [
          "- 选项 1：摸头、整理发丝、轻声夸奖之类的温柔安抚。",
          "- 选项 2：牵手、并肩坐下、靠肩休息之类的安心陪伴。",
          "- 选项 3：短暂拥抱、披外套、递热饮之类的照顾动作。",
          "- 选项 4：带一点笨拙或害羞，的亲近举动。"
        ].join("\n")
      : shuffledRewards.map((reward, index) => {
          return `- 选项 ${index + 1}（加成权重：+${reward} 信赖值）：${tierDescriptions[reward]}`;
        }).join("\n");

    return `[初星育成系统：互动分支设计]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按担当偶像写"}
当前阶段：${getPhase()}
当前日程：第 ${state.day} 天，${roundLabel()}
行动：${actionName}

当前担当偶像的性格基调（${actionName}行为指南）：
${actionStyle}

${buildProducerPromptSection()}

${destinationPrompt}${companionTopicPrompt}

请为本次${actionName}生成前半段剧情，并设计 4 个制作人第一人称选项，停在待选择转折点。
${action === "intimacy" ? "普通亲密：清水向，不要 NSFW。" : ""}

${galgameRenderContract("choice")}
${buildChoiceHardRules({ phase1: true })}

${action === "intimacy" ? "亲密选项方向：" : "选项质量映射（标签内不要写数值）："}
${optionsPrompt}

${buildChoiceOnlyExample()}`;
  }

  function buildMapLocationPresenceLine(locationId, options = {}) {
    if (locationId === FREE_MODE_OUTING_LOCATION_ID) return "";
    const actionContext = options.actionContext || state.pendingActionContext?.actionContext || {};
    const snapshot = options.mapStepKind === "arrival"
      ? (options.arrivalPresenceIds || actionContext.arrivalPresenceIds)
      : null;
    const residentNpcs = getResidentNpcsAtLocation(locationId);
    const npcLine = residentNpcs.length
      ? `常驻NPC：${residentNpcs.map((npc) => `${npc.name}（${npc.promptLine || npc.publicLabel || "在场"}）`).join("、")}。`
      : "";
    const campusLines = snapshot ? "" : globalThis.HatsuWorld?.campusBehavior?.buildMapPresencePromptLines?.(
      locationId,
      state,
      getHatsuWorldHelpers()
    );
    if (campusLines) return [campusLines, npcLine].filter(Boolean).join("\n");
    const idolsHere = Array.isArray(snapshot)
      ? [...new Set(snapshot.map((idolName) => canonicalIdolName(idolName)).filter((idolName) => idols[idolName]))].slice(0, 8)
      : getIdolsPresentAtLocation(locationId);
    if (!idolsHere.length && !residentNpcs.length) return "当前该地点没有已确认到场的其他偶像。";
    const idolLine = idolsHere.length
      ? `当前该地点可能在场的偶像：${idolsHere.join("、")}。请自然写入剧情，但不要替前端重新决定她们是否在场。`
      : "当前该地点没有已确认到场的其他偶像。";
    return [idolLine, npcLine].filter(Boolean).join("\n");
  }

  function getMapExploreRelationshipIdols(locationId, options = {}) {
    if (isSandboxScoutActive()) return [];
    const actionContext = options.actionContext || state.pendingActionContext?.actionContext || {};
    const visitMode = options.visitMode || actionContext.visitMode || getMapLocationVisitMode();
    const names = new Set();
    if (visitMode !== "alone" && state.idol) {
      names.add(canonicalIdolName(state.idol));
    }
    const snapshot = options.mapStepKind === "arrival"
      ? (options.arrivalPresenceIds || actionContext.arrivalPresenceIds)
      : null;
    const presentIdols = Array.isArray(snapshot) ? snapshot : getIdolsPresentAtLocation(locationId);
    presentIdols.forEach((idolName) => {
      const canonical = canonicalIdolName(idolName);
      if (canonical) names.add(canonical);
    });
    return [...names].filter((idolName) => idolName && idols[idolName]);
  }

  function buildFreeModeRelationshipPromptBlock(locationId, options = {}) {
    const relationshipIdols = getMapExploreRelationshipIdols(locationId, options);
    if (!relationshipIdols.length) {
      return "好感：<relationship_update>{}</relationship_update>";
    }
    const statusLines = relationshipIdols.map((idolName) => {
      const score = getFreeModeRelationshipScore(idolName);
      const stageTag = getAffinityStageTag(idolName, score);
      return `${idolName} ${score}/100${stageTag ? ` ${stageTag}` : ""}`;
    }).join("；");
    return `好感（${statusLines}）：按上一轮“▶ 制作人的选择”给增量 ±1～5，仅列上述偶像；无互动则 {}。格式 <relationship_update>{"${relationshipIdols[0]}":2}</relationship_update>`;
  }

  function summarizeMapExploreContext() {
    const text = String(state.lastStory || "").trim();
    if (!text) return "（暂无上文）";
    return text.length > 1200 ? text.slice(-1200) : text;
  }

  function buildMapLocationVisitModeLine(visitMode = "with_idol") {
    const idol = state.idol || "担当偶像";
    if (visitMode === "alone") {
      return `到场方式：制作人独自前往，担当偶像 ${idol} 不在身边同行。`;
    }
    return `到场方式：制作人与担当偶像 ${idol} 一起到场。`;
  }

  function getMapLocationVisitMode() {
    return state.pendingActionContext?.actionContext?.visitMode === "alone" ? "alone" : "with_idol";
  }

  function buildSandboxScoutExplorePrompt(locationId, options = {}) {
    const { continuation = false } = options;
    const location = getWorldMapLocation(locationId);
    if (!location) return "";
    const targetIdol = state.idol || "物色目标";
    const scoutQuestId = globalThis.HatsuTasks?.getScoutQuestId?.(state) || "scout_temari";
    const presenceLine = buildMapLocationPresenceLine(locationId, options);
    const targetHere = getSandboxScoutTargetAtLocation(locationId) === targetIdol;
    const targetLocationId = globalThis.HatsuWorld?.campusBehavior?.getScoutTargetLocation?.(targetIdol, getHatsuWorldHelpers()) || "";
    const targetLocation = targetLocationId ? getWorldMapLocation(targetLocationId) : null;
    const targetLocationName = targetLocation?.name || "\u76ee\u6807\u4eca\u5929\u6240\u5728\u5730\u70b9";
    const targetPresentSceneInstruction = continuation
      ? `请承接下文摘要，写制作人继续留在 ${location.name}、与 ${targetIdol} 物色搭话的下一轮场景，并设计 4 个新的下一步行动选项。
- 不要重复已经发生过的事件；从当前时间点自然续写。
- 若 ${targetIdol} 在本轮明确同意成为制作人担当，不要输出 option 与 time 标签；正文写到她答应签约的瞬间，并在【初星正文结束】之前输出【初星任务完成】${scoutQuestId}（或 <quest_complete id="${scoutQuestId}" />）。前端将自动请求收尾剧情，不再展示选项。
- 上文摘要（仅供衔接，不要原文复述）：
${summarizeMapExploreContext()}`
      : `请写制作人独自来到 ${location.name}，与 ${targetIdol} 初次接触、尝试邀请她成为担当的开场场景，并设计 4 个不同的下一步行动选项。
- 这是沙盒物色期，不是已签约育成；不要写两人已是正式担当关系。
- 重点写 ${targetIdol} 当前公开状态、对陌生人的距离感，以及制作人如何开口。`;
    const targetAbsentSceneInstruction = continuation
      ? `\u8bf7\u627f\u63a5\u4e0a\u6587\u6458\u8981\uff0c\u5199\u5236\u4f5c\u4eba\u7ee7\u7eed\u7559\u5728 ${location.name}\u5bfb\u627e ${targetIdol}\u7684\u7ebf\u7d22\uff0c\u4f46\u524d\u7aef\u5df2\u786e\u8ba4 ${targetIdol} \u4eca\u5929\u4e0d\u5728\u8fd9\u91cc\uff0c\u4e0d\u5f97\u5199\u5979\u8def\u8fc7\u6216\u88ab\u642d\u8bdd\u3002\n- \u5f53\u524d\u5730\u70b9\uff1a${location.name}\uff1b${targetIdol}\u4eca\u5929\u6240\u5728\u5730\u70b9\uff1a${targetLocationName}\u3002\n- \u672c\u8f6e\u5199\u627e\u4e0d\u5230\u76ee\u6807\u3001\u6838\u5bf9\u6821\u56ed\u52a8\u5411\u6216\u83b7\u5f97\u524d\u5f80 ${targetLocationName} \u7684\u7ebf\u7d22\uff0c\u8bbe\u8ba1 4 \u4e2a\u4e0b\u4e00\u6b65\u884c\u52a8\u9009\u9879\u3002\n- \u81f3\u5c11\u4e00\u4e2a option \u5fc5\u987b\u662f\u524d\u5f80 ${targetLocationName}\uff1b\u53ef\u4ee5\u6709\u7ee7\u7eed\u89c2\u5bdf\u73b0\u573a\u3001\u67e5\u770b\u516c\u544a/SNS\u3001\u6216\u5411\u5e38\u9a7bNPC\u8be2\u95ee\u7684\u9009\u9879\u3002\n- \u4e0a\u6587\u6458\u8981\uff08\u4ec5\u4f9b\u8854\u63a5\uff0c\u4e0d\u8981\u539f\u6587\u590d\u8ff0\uff09\uff1a\n${summarizeMapExploreContext()}`
      : `\u8bf7\u5199\u5236\u4f5c\u4eba\u72ec\u81ea\u6765\u5230 ${location.name}\uff0c\u4f46\u524d\u7aef\u5df2\u786e\u8ba4 ${targetIdol} \u4eca\u5929\u4e0d\u5728\u8fd9\u91cc\uff1b\u4e0d\u8981\u5199\u5236\u4f5c\u4eba\u4e0e ${targetIdol} \u521d\u6b21\u63a5\u89e6\uff0c\u4e0d\u8981\u8ba9\u5979\u6070\u597d\u8def\u8fc7\u6216\u51fa\u73b0\u3002\n- \u5f53\u524d\u5730\u70b9\uff1a${location.name}\uff1b${targetIdol}\u4eca\u5929\u6240\u5728\u5730\u70b9\uff1a${targetLocationName}\u3002\n- \u672c\u8f6e\u5e94\u5199\u201c\u627e\u4e0d\u5230\u76ee\u6807\u201d\u7684\u5730\u70b9\u63a2\u7d22\u573a\u666f\uff1a\u5236\u4f5c\u4eba\u786e\u8ba4\u73b0\u573a\u6c1b\u56f4\u3001\u770b\u5230\u80cc\u666f\u5076\u50cf\u4f46\u4e0d\u6df1\u804a\uff0c\u5e76\u6839\u636e\u6821\u56ed\u52a8\u5411\u5224\u65ad\u5e94\u8f6c\u5f80 ${targetLocationName}\u3002\n- \u8bbe\u8ba1 4 \u4e2a\u4e0b\u4e00\u6b65\u884c\u52a8\u9009\u9879\uff1b\u81f3\u5c11\u4e00\u4e2a option \u5fc5\u987b\u662f\u524d\u5f80 ${targetLocationName}\uff0c\u4e0d\u5f97\u63d0\u4f9b\u4e0e\u80cc\u666f\u5076\u50cf\u6df1\u804a\u7684\u9009\u9879\u3002`;
    const sceneInstruction = targetHere ? targetPresentSceneInstruction : targetAbsentSceneInstruction;
    const scoutCompletionRule = targetHere
      ? `- ${targetIdol} \u540c\u610f\u7b7e\u7ea6\u65f6\uff1a\u6b63\u6587\u672b\u5c3e\u8f93\u51fa\u3010\u521d\u661f\u4efb\u52a1\u5b8c\u6210\u3011${scoutQuestId}\uff08\u6216 <quest_complete id="${scoutQuestId}" />\uff09\uff0c\u540c\u8f6e\u4e0d\u8981 option/time\u3002`
      : `- ${targetIdol} \u4e0d\u5728\u5f53\u524d\u5730\u70b9\uff1a\u672c\u8f6e\u4e0d\u5f97\u5199\u5979\u540c\u610f\u7b7e\u7ea6\uff0c\u4e0d\u5f97\u8f93\u51fa\u3010\u521d\u661f\u4efb\u52a1\u5b8c\u6210\u3011${scoutQuestId}\u6216 quest_complete\u3002`;
    const scoutContactRule = targetHere
      ? `- \u4ec5\u4e0e ${targetIdol} \u63a5\u89e6\uff0c\u4e0d\u8981\u63d0\u4f9b\u4e0e\u5176\u4ed6\u5076\u50cf\u6df1\u804a\u7684\u9009\u9879\u3002`
      : `- \u4ec5\u53ef\u8fdc\u89c2\u80cc\u666f\u5076\u50cf\u6216\u5411\u5e38\u9a7bNPC\u8be2\u95ee\u7ebf\u7d22\uff1b\u4e0d\u8981\u628a\u80cc\u666f\u5076\u50cf\u5199\u6210\u53ef\u642d\u8bdd\u5bf9\u8c61\u3002`;
    return `[初星育成系统：沙盒模式 · 物色搭话]

物色目标：${targetIdol}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按物色目标写"}
当前时间：${formatCampusDayLabel()} ${formatFreeModeClock()}
地点：${location.name}
地点说明：${location.description}

到场方式：制作人独自前往物色，尚未与 ${targetIdol} 签约。
${presenceLine ? `\n${presenceLine}\n` : ""}${composeWorldSummaryBlock("map", locationId)}

${buildProducerPromptSection()}

${sceneInstruction}
${scoutCompletionRule}
${scoutContactRule}

${buildMapExplorePlayRules({ outing: false, relationship: false })}

${galgameRenderContract("choice")}
${buildMapExploreChoiceOutputBlock({ includeRelationship: false })}`;
  }

  function buildSandboxScoutWrapUpPrompt() {
    const targetIdol = state.idol || "物色目标";
    const scoutQuestId = globalThis.HatsuTasks?.getScoutQuestId?.(state) || "scout_temari";
    const locationId = state.pendingActionContext?.actionContext?.locationId;
    const location = getWorldMapLocation(locationId);
    return `[初星育成系统：沙盒模式 · 物色搭话 · 收尾]

物色目标：${targetIdol}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按物色目标写"}
当前时间：${formatCampusDayLabel()} ${formatFreeModeClock()}
地点：${location?.name || "校园"}

上文摘要（仅供衔接，不要原文复述）：
${summarizeMapExploreContext()}

【重要】前端已确认物色成功：上一段剧情中 AI 已输出【初星任务完成】${scoutQuestId}，${targetIdol} 已同意成为制作人担当。

请写签约后余韵与简短告别，500 字以内；不要 option/time/任务标记，不要改数值。

${outputContract("请写一段物色成功后的收尾正文。")}`;
  }

  function buildMapLocationExplorePrompt(locationId, options = {}) {
    if (isSandboxScoutActive()) {
      return buildSandboxScoutExplorePrompt(locationId, options);
    }
    const { continuation = false } = options;
    const actionContext = options.actionContext || state.pendingActionContext?.actionContext || {};
    const location = resolveMapExploreLocation(locationId, actionContext);
    if (!location) return "";
    const visitMode = options.visitMode || getMapLocationVisitMode();
    const idol = state.idol || "担当偶像";
    const sceneInstruction = continuation
      ? `请承接下文摘要，写制作人继续留在 ${location.name} 的下一轮场景，并设计 4 个新的下一步行动选项。
- 不要重复已经发生过的事件；从当前时间点自然续写。
- 上文摘要（仅供衔接，不要原文复述）：
${summarizeMapExploreContext()}`
      : visitMode === "alone"
        ? `请写制作人独自来到 ${location.name} 刚到达时的开场场景，并设计 4 个不同的下一步行动选项。担当偶像 ${idol} 不在身边同行。`
        : `请写制作人与担当偶像 ${idol} 一起来到 ${location.name} 刚到达时的开场场景，并设计 4 个不同的下一步行动选项。`;
    const presenceLine = buildMapLocationPresenceLine(locationId, {
      actionContext,
      mapStepKind: options.mapStepKind,
      arrivalPresenceIds: options.arrivalPresenceIds
    });

    const relationshipBlock = buildFreeModeRelationshipPromptBlock(locationId, {
      actionContext,
      visitMode,
      mapStepKind: options.mapStepKind,
      arrivalPresenceIds: options.arrivalPresenceIds
    });
    const sandboxMainBlock = isSandboxLaunch() && state.sandbox?.inviteComplete
      ? globalThis.HatsuTasks?.buildSandboxMainQuestPromptBlock?.(state, locationId) || ""
      : "";
    const exploreModeLine = isSandboxLaunch()
      ? "这是沙盒学园日常探索，不是育成日程轮次，也不是 First Live 之后的时间线。"
      : "这是 First Live 后的学园自由探索，不是育成日程行动。";
    const promptHeader = isSandboxLaunch()
      ? "[初星育成系统：沙盒模式 · 地点探索]"
      : "[初星育成系统：自由模式 · 地点探索]";
    const dayTimeLabel = isSandboxLaunch()
      ? `${formatCampusDayLabel()} ${formatFreeModeClock()}`
      : `${formatFreeModeDayLabel()} ${formatFreeModeClock()}`;
    const directorPrompt = composeWorldDirectorPromptAddendum({
      participants: visitMode === "alone" ? [] : [state.idol],
      locationId
    });
    const storytellerIncidentPrompt = globalThis.HatsuWorldStorytellerInjection
      ?.composeStorytellerIncidentPromptAddendum?.(options.storytellerCandidate, {
        action: "map_location",
        mapStepKind: options.mapStepKind
      }) || "";
    const authorityContract = globalThis.HatsuWorldStorytellerInjection
      ?.composeNarrativeAuthorityContract?.({
        hasDirector: Boolean(directorPrompt),
        hasStoryteller: Boolean(storytellerIncidentPrompt)
      }) || "";
    return `${promptHeader}

担当偶像：${state.idol}
${getFreeModeAffinityStageLine(state.idol)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按担当偶像写"}
当前时间：${dayTimeLabel}
地点：${location.name}
地点说明：${location.description}

${buildMapLocationVisitModeLine(visitMode)}
${presenceLine ? `\n${presenceLine}` : ""}
${relationshipBlock ? `\n${relationshipBlock}` : ""}
${composeWorldSummaryBlock("map", locationId)}
${sandboxMainBlock ? `\n${sandboxMainBlock}\n` : ""}

${buildProducerPromptSection()}

${sceneInstruction}
- ${exploreModeLine}
- 不要写选项被选中后的收尾，只写到等待玩家选择下一步。
- 每个 option 必须包含 <time1> 这种耗时标签。

${buildMapExplorePlayRules({ outing: false, relationship: true })}
${directorPrompt ? `\n${directorPrompt}\n` : ""}
${storytellerIncidentPrompt ? `\n${storytellerIncidentPrompt}\n` : ""}
${authorityContract ? `\n${authorityContract}\n` : ""}

${galgameRenderContract("choice")}
${buildMapExploreChoiceOutputBlock({ includeRelationship: true })}`;
  }

  function buildFreeModeOutingExplorePrompt(options = {}) {
    const { continuation = false } = options;
    const actionContext = options.actionContext || state.pendingActionContext?.actionContext || {};
    const location = resolveMapExploreLocation(FREE_MODE_OUTING_LOCATION_ID, actionContext);
    if (!location) return "";
    const sideQuest = actionContext.sideQuestSlotIndex !== undefined && actionContext.sideQuestSlotIndex !== null
      ? state.tasks?.side?.slots?.[Number(actionContext.sideQuestSlotIndex)]
      : null;
    if (sideQuest && !continuation) {
      return buildSideQuestScenePrompt(sideQuest, location);
    }
    const visitMode = options.visitMode || getMapLocationVisitMode();
    const idol = state.idol || "担当偶像";
    const dayTimeLabel = isSandboxLaunch()
      ? `${formatCampusDayLabel()} ${formatFreeModeClock()}`
      : `${formatFreeModeDayLabel()} ${formatFreeModeClock()}`;
    const activeFacility = getActiveFreeModeOutingFacility(actionContext);
    const outingSceneName = actionContext.outingSceneName || activeFacility?.sceneName || location.name;
    const outingFacilityName = actionContext.outingFacilityName || activeFacility?.name || location.name;
    const outingFacilityDesc = activeFacility?.description || location.description;
    const outingAction = actionContext.outingAction || "explore";
    const outingSelectedIdol = actionContext.outingSelectedIdol || idol;
    const outingActionLine = outingAction === "chat"
      ? `本次互动：点击 ${outingSelectedIdol} 的立绘后选择闲聊。`
      : outingAction === "ask"
        ? `本次互动：询问 ${outingSelectedIdol} 想去哪里或想做什么。`
        : `本次互动：在当前设施继续探索。`;
    const sceneInstruction = continuation
      ? `请承接下文摘要，写制作人继续在校外 ${location.name} 活动的下一轮场景，并设计 4 个新的下一步行动选项。
- 不要重复已经发生过的事件；从当前时间点自然续写。
- 上文摘要（仅供衔接，不要原文复述）：
${summarizeMapExploreContext()}`
      : visitMode === "alone"
        ? `请写制作人独自离开学园，来到 ${location.name} 刚到达时的开场场景，并设计 4 个不同的下一步行动选项。担当偶像 ${idol} 不在身边同行。`
        : `请写制作人与担当偶像 ${idol} 一起离开学园，来到 ${location.name} 刚到达时的开场场景，并设计 4 个不同的下一步行动选项。`;
    const outingHeader = isSandboxLaunch()
      ? "[初星育成系统：沙盒模式 · 校外外出探索]"
      : "[初星育成系统：自由模式 · 校外外出探索]";
    const relationshipBlock = buildFreeModeRelationshipPromptBlock(FREE_MODE_OUTING_LOCATION_ID, { actionContext, visitMode });
    return `${outingHeader}

担当偶像：${state.idol}
${getFreeModeAffinityStageLine(state.idol)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按担当偶像写"}
当前时间：${dayTimeLabel}
外出地点：${location.name}
外出说明：${location.description}
当前场景：${outingSceneName}
当前设施：${outingFacilityName}
设施说明：${outingFacilityDesc}
${outingActionLine}

${buildMapLocationVisitModeLine(visitMode)}
${relationshipBlock ? `\n${relationshipBlock}` : ""}

${buildProducerPromptSection()}

${sceneInstruction}
- 氛围贴合 ${location.name} 的 ${outingFacilityName}，可写路人、店员、设施物件与环境细节。
- 与育成日程外出完全不同，这是地图自由探索中的校外地点。
- 支持连续多轮选择 option，每轮只推进当前选项结果与新的下一步选项。

${buildMapExplorePlayRules({ outing: true, relationship: true })}

${galgameRenderContract("choice")}
${buildMapExploreChoiceOutputBlock({ includeRelationship: true })}`;
  }

  function buildFreeModeOutingSceneDialoguePrompt(action = "chat", customText = "") {
    const scene = state.freeMode?.outingScene || {};
    const venue = getFreeModeOutingVenue(scene.venueId);
    const facility = getFreeModeOutingFacility(scene.venueId, scene.facilityId);
    if (!venue || !facility) return "";
    const idolName = scene.selectedIdol || canonicalIdolName(state.idol) || state.idol || "担当偶像";
    const dayTimeLabel = isSandboxLaunch()
      ? formatCampusDayLabel() + " " + formatFreeModeClock()
      : formatFreeModeDayLabel() + " " + formatFreeModeClock();
    const normalizedCustomText = String(customText || "").trim();
    const actionLabel = normalizedCustomText
      ? "制作人主动提出自定义聊天内容，请围绕该内容回应。"
      : action === "ask"
        ? "制作人询问偶像接下来想去哪里或想做什么。"
        : action === "invite"
          ? "制作人确认与偶像继续同行。"
          : "制作人与偶像在当前设施内轻松闲聊。";
    return [
      "[初星育成系统：校外场景内对话]",
      "",
      "请为当前校外场景生成一小段即时互动，不要进入 VN，不要输出选项，不要写长篇剧情。",
      "前端会把偶像台词显示在立绘旁气泡，把旁白和制作人台词显示在底部对话栏。",
      "",
      "担当偶像：" + idolName,
      "当前时间：" + dayTimeLabel,
      "当前地点：" + (venue.name || "购物中心"),
      "当前设施：" + (facility.name || "设施"),
      "当前场景：" + (facility.sceneName || facility.name || venue.name),
      "设施说明：" + (facility.description || ""),
      "本次互动：" + actionLabel,
      normalizedCustomText ? "用户自定义聊天内容：" + normalizedCustomText : "",
      "",
      buildProducerPromptSection(),
      "",
      "输出格式必须严格如下：",
      "<scene_narration>一句旁白或动作描写，40字以内。</scene_narration>",
      "<producer>制作人的一句话，40字以内，可以为空但标签必须保留。</producer>",
      "<idol>" + idolName + "的一句回应，60字以内。</idol>",
      "",
      "要求：",
      "- 偶像台词要贴合角色，不要写成旁白。",
      "- 旁白和制作人不要混进 idol 标签。",
      "- 不要输出 option/time/选择项。",
      "- 不要使用 Markdown 列表。"
    ].join("\n");
  }

  function extractFreeModeOutingSceneDialogue(source) {
    const normalizeShell = (value) => stripAiThinkingBlocks(String(value || "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\u200b/g, ""))
      .replace(/<\/(?:thinking|think|details|summary|vars|analysis|planning|plan|konatan_planning|bginfo|bginfor|draft_notes)\s*>/gi, "")
      .replace(/^\s*#{1,6}\s*(?:正文|本文|输出|main\s*text)\s*$/gim, "")
      .trim();
    const raw = normalizeShell(source);
    const cleanSegment = (value) => cleanReplyText(normalizeShell(value)).trim();
    const readTag = (name) => {
      const match = raw.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + name + ">", "i"));
      return match ? cleanSegment(match[1]) : "";
    };
    const narration = readTag("scene_narration") || readTag("narration");
    const producer = readTag("producer");
    const idol = readTag("idol");
    if (narration || producer || idol) return { narration, producer, idol };
    const cleaned = cleanSegment(raw);
    if (cleaned.length <= 90) return { narration: "", producer: "", idol: cleaned };
    return { narration: cleaned, producer: "", idol: "" };
  }

  function buildSideQuestScenePrompt(slot, location) {
    const tagLabel = getSideQuestPoolApi()?.getTagLabel?.(slot.tag) || slot.tag || "商演";
    const dayTimeLabel = isSandboxLaunch()
      ? `${formatCampusDayLabel()} ${formatFreeModeClock()}`
      : `${formatFreeModeDayLabel()} ${formatFreeModeClock()}`;
    return `[初星育成系统：沙盒模式 · 委托现场]

担当偶像：${state.idol}
${getFreeModeAffinityStageLine(state.idol)}
当前时间：${dayTimeLabel}
委托地点：${location.name}
地点说明：${location.description}

委托标题：${slot.title}
委托类型：${tagLabel}
委托说明：${slot.desc}

${buildProducerPromptSection()}

请写制作人与担当偶像抵达 ${location.name}，正式开始执行该商业委托的现场开场，并设计 4 个制作人第一人称行动选项。
- 这是外部商业委托现场，不是训练、课表或校园日常。
- 需要出现主办方/工作人员/观众/品牌方等外部现场压力。
- 选项不要写“失败/勉强/完成/完美”等系统档位词，而要写成自然行动。
- 四个选项按顺序对应不同风险：1 保守补救、2 稳健执行、3 主动加码、4 冒险处理。
- 不要在本轮写委托结果或结算，只写到等待制作人选择现场处理方式。

${galgameRenderContract("choice")}
${buildMapExploreChoiceOutputBlock({ includeRelationship: false })}`;
  }

  function getSideQuestTierForChoice(index) {
    return ["pass_low", "pass", "perfect", "fail"][Number(index)] || "pass";
  }

  function buildSideQuestResultPrompt(slot, tier, choiceText) {
    const pool = getSideQuestPoolApi();
    const tierLabel = pool?.SIDE_TIER_META?.[tier]?.label || "完成";
    return `[初星育成系统：沙盒模式 · 委托收尾]

担当偶像：${state.idol}
当前时间：${formatCampusDayLabel()} ${formatFreeModeClock()}
委托标题：${slot.title}
委托地点：${slot.locationName || "委托地点"}
委托说明：${slot.desc}
制作人的现场选择：${choiceText}
前端结算档位：${tierLabel}

前端已经完成奖励结算，请只写 500 字以内的委托现场收尾与余韵。
- 不要写数值、金钱、知名度增加或系统结算。
- 不要再提供 option/time。
- 根据“${tierLabel}”自然表现现场效果，但不要把档位词当系统提示原样复述。

${outputContract("请写一段委托完成后的收尾正文。")}`;
  }

  function buildMapLocationReturnPrompt(locationId) {
    const actionContext = state.pendingActionContext?.actionContext || {};
    const location = resolveMapExploreLocation(locationId, actionContext);
    if (!location) return "";
    return `[初星育成系统：自由模式 · 离开地点返回地图]

担当偶像：${state.idol}
${getFreeModeAffinityStageLine(state.idol)}
当前时间：${formatFreeModeDayLabel()} ${formatFreeModeClock()}
地点：${location.name}
地点说明：${location.description}

${buildMapLocationPresenceLine(locationId)}

${buildMapLocationVisitModeLine(getMapLocationVisitMode())}

制作人决定离开 ${location.name}，写 300 字以内离开描写；不推进时间，不要 option，不要改数值。

${outputContract("离开正文写在【初星正文开始】…【初星正文结束】内。")}`;
  }

  function buildFreeModeOutingReturnPrompt() {
    const actionContext = state.pendingActionContext?.actionContext || {};
    const location = resolveMapExploreLocation(FREE_MODE_OUTING_LOCATION_ID, actionContext);
    if (!location) return "";
    const returnTarget = getMapExploreReturnTarget(actionContext);
    const activeFacility = getActiveFreeModeOutingFacility(actionContext);
    const returnHeader = returnTarget?.type === "outing_scene"
      ? "[初星育成系统：自由模式 · 校外外出设施返回场景]"
      : "[初星育成系统：自由模式 · 结束校外外出返回地图]";
    const returnLine = returnTarget?.type === "outing_scene"
      ? `制作人决定结束 ${activeFacility?.name || location.name} 的当前探索，回到 ${location.name} 的外出场景页面，写 300 字以内过渡描写；不推进时间，不要 option，不要改数值。`
      : `制作人决定离开 ${location.name}，写 300 字以内离开描写；不推进时间，不要 option，不要改数值。`;
    return `${returnHeader}

担当偶像：${state.idol}
${getFreeModeAffinityStageLine(state.idol)}
当前时间：${formatFreeModeDayLabel()} ${formatFreeModeClock()}
外出地点：${location.name}
外出说明：${location.description}
当前设施：${activeFacility?.name || location.name}

${buildMapLocationVisitModeLine(getMapLocationVisitMode())}

${returnLine}

${outputContract("离开正文写在【初星正文开始】…【初星正文结束】内。")}`;
  }

  function getMapExplorePrompt(locationId, options = {}) {
    if (locationId === FREE_MODE_OUTING_LOCATION_ID) {
      return buildFreeModeOutingExplorePrompt(options);
    }
    return buildMapLocationExplorePrompt(locationId, options);
  }

  function getMapExploreReturnPrompt(locationId) {
    if (locationId === FREE_MODE_OUTING_LOCATION_ID) {
      return buildFreeModeOutingReturnPrompt();
    }
    return buildMapLocationReturnPrompt(locationId);
  }

  function buildTodayActionRecapForSummary() {
    const entries = (state.log || []).filter((item) => Number(item.day) === Number(state.day));
    if (!entries.length) {
      return "今日尚无已记录行动。";
    }
    return entries
      .slice()
      .reverse()
      .map((item, index) => `${index + 1}. ${item.action}：${item.result}`)
      .join("\n");
  }

  function buildDailySummaryContract() {
    const profile = idols[state.idol] || {};
    return `
==================================================
【今日育成总结 · 必须在正文之后追加】

你是初星学园育成系统的记录员。第四轮额外行动已经由前端结算完毕，请在【初星正文结束】之后，另起一段输出今日总结。

【今日总结开始】
<summary_intro>角色介绍：以学园档案口吻介绍 ${state.idol} 的核心性格、矛盾与育成定位，结合今日四轮行动后的整体印象，80-120字。</summary_intro>
<summary_status>当前状态评估：结合下方“今日行动回顾”和当前数值，评估体力、压力、信赖、Vo/Da/Vi 与羁绊阶段，说明今日育成进展与风险，120-180字。</summary_status>
<summary_producer>制作人视角：以制作人第一人称（使用 {{user}} 或当前制作人设定称呼）写接下来要优先解决的问题、明日关注与推进方向，80-120字。</summary_producer>
【今日总结结束】

硬规则：
1. 三段必须分别写在对应标签内，不要列表，不要 Markdown，不要 emoji。
2. 当前状态评估必须承认前端已结算数值，不得修改或追加数值。
3. 制作人视角是制作人的判断与计划，不是偶像台词。
4. 角色介绍可参考担当核心：${profile.core || "按担当偶像设定发挥"}`;
  }

  function buildChoicePhase2Prompt(action, attribute, chosenOptionText, trustGain, actionContext = {}) {
    const actionName = actionLabel(action, attribute);
    const outcomeName = action === "intimacy"
      ? "【亲密】"
      : (action === "outing" && trustGain === 10) || (action === "companion" && trustGain === 20)
      ? "【完美互动】"
      : (action === "outing" && trustGain === 8) || (action === "companion" && trustGain === 15)
        ? "【极佳互动】"
        : (action === "outing" && trustGain === 6) || (action === "companion" && trustGain === 10)
          ? "【普通互动】"
          : "【笨拙互动】";
    const outcomeLine = action === "intimacy"
      ? `本次选择的判定结果为：${outcomeName}（前端已结算：体力 +38，压力 -10，信赖 +${INTIMACY_NORMAL_TRUST_GAIN}）`
      : `本次选择的判定结果为：${outcomeName}（给玩家增加了 +${trustGain} 信赖值）`;
    const closureTarget = action === "intimacy"
      ? "亲密互动的收尾/当天的安抚总结"
      : action === "companion"
        ? "交流的收尾/当天的总结"
        : "外出的收尾/当天的总结";
    const intimacyRule = action === "intimacy" && getIntimacyMode() !== "nsfw"
      ? "\n- 本次为普通亲密路线，只写温柔、安心、信任、撒娇、拥抱、牵手、摸头、靠肩等清水向内容。"
      : "";
    const companionTopicLine = action === "companion" && actionContext.companionTopic
      ? `\n- 本次交流由制作人指定主题为：「${actionContext.companionTopic}」。收尾应回扣这一主题，不要另起无关话题。`
      : "";
    const dailySummarySection = actionContext.isDailyFinalAction
      ? `

今日行动回顾（供总结使用，不要原样复述成列表）：
${buildTodayActionRecapForSummary()}

当前状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 体力 ${state.stamina} / 压力 ${state.stress} / 信赖 ${state.trust}
${getAffinityStageLine(state.idol, state.trust)}

${buildDailySummaryContract()}`
      : "";

    const renderContract = actionContext.isDailyFinalAction
      ? `${galgameRenderContract("normal")}
- 先写【初星正文开始】…【初星正文结束】收尾剧情，再写【今日总结开始】…【今日总结结束】，两段不可混写。
- 请写 600 字以内的反应与事件收尾正文。${dailySummarySection}`
      : `${outputContract("请写 600 字以内的反应与事件收尾正文。")}`;

    return `[初星育成系统：互动分支结算与收尾]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按担当偶像写"}
当前日程：第 ${state.day} 天，${roundLabel()}
行动：${actionName}

剧情进展：
制作人刚才做出了以下选择（或行动）：
“${chosenOptionText}”

${outcomeLine}

请承接前半段剧情，写出你（${state.idol}）在面对制作人这个选择时的【反应剧情】以及本次【${closureTarget}】。

叙事要求：
- 请以符合偶像性格的语调展开，根据选择的优劣档次表现出对应的反应。
- 在本段剧情中完成事件的收束，结束当天的活动。
- 限制在 600 字以内。
${intimacyRule}${companionTopicLine}

${renderContract}`;
  }

  function buildNsfwIntimacyOptionContract() {
    return `选项生成要求：
- 必须输出 4 个由 AI 设计的制作人行动选项，供玩家在 VN 界面点选。
- 每个选项必须是制作人第一人称口吻的一句行动或台词，风味不同但都应推进 NSFW 亲密。
- 这不是【普通亲密】【清水亲密】模式：不要写摸头、靠肩、递热饮、整理发丝等仅限清水互动的选项。
- 玩家界面还会额外提供“自定义输入”和“结束”按钮；你只需负责输出 4 个 option 标签。`;
  }

  function buildNsfwIntimacyOpeningPrompt(actionContext = {}) {
    const targetIdol = canonicalIdolName(actionContext.inviteIdol) || state.idol;
    const profile = idols[targetIdol] || {};
    const apartmentInvite = Boolean(actionContext.apartmentInvite);
    const actionStyle = `${profile.styles.companion || profile.styles.rest} 这是信赖值100后解锁的 NSFW 亲密互动，必须写成人向亲密、情欲张力、身体接触与彼此允许靠近的内容。`;
    const header = apartmentInvite
      ? "[初星育成系统：公寓邀约 · NSFW 亲密 · 开场]"
      : "[初星育成系统：NSFW 亲密 · 开场]";
    const sceneSection = apartmentInvite ? `\n${buildApartmentNsfwSceneSection(targetIdol)}\n` : "";
    return `${header}

互动对象：${targetIdol}
担当偶像：${state.idol || "未登记"}
${buildNsfwIntimacyAffinityLine(targetIdol)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按互动对象写"}
当前阶段：${getPhase()}
${buildNsfwIntimacyScheduleLine()}
行动：NSFW 亲密（不是普通亲密 / 清水亲密）
${sceneSection}
角色设定前提：
- 本次为私密、自愿、互相信赖的成人向亲密场景。
- 前端会在 VN 界面展示 4 个选项，并额外提供自定义输入与结束按钮；玩家可随时点“结束”进入收尾。
- 禁止把本次写成普通亲密、摸头安抚、递热饮、靠肩休息等清水向互动。

当前互动对象的性格基调（NSFW 亲密行为指南）：
${actionStyle}

${buildProducerPromptSection()}

请生成本次 NSFW 亲密的开场剧情，并设计 4 个制作人第一人称选项。
${buildNsfwIntimacyOptionContract()}

${galgameRenderContract("choice")}
${buildChoiceHardRules({ phase1: true })}

${buildChoiceOnlyExample()}`;
  }

  function buildNsfwIntimacyContinuePrompt(producerAction) {
    const targetIdol = getNsfwIntimacyTargetIdol();
    const profile = idols[targetIdol] || {};
    const apartmentInvite = isApartmentNsfwInviteActive();
    const header = apartmentInvite
      ? "[初星育成系统：公寓邀约 · NSFW 亲密 · 继续]"
      : "[初星育成系统：NSFW 亲密 · 继续]";
    const sceneSection = apartmentInvite ? `\n${buildApartmentNsfwSceneSection(targetIdol)}\n` : "";
    return `${header}

互动对象：${targetIdol}
担当偶像：${state.idol || "未登记"}
${buildNsfwIntimacyAffinityLine(targetIdol)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按互动对象写"}
当前阶段：${getPhase()}
${buildNsfwIntimacyScheduleLine()}
行动：NSFW 亲密（多轮进行中）
${sceneSection}
角色设定前提：
- 本次仍为私密、自愿、互相信赖的成人向亲密场景，不是普通亲密 / 清水亲密。
- 玩家仍可在 VN 界面选择 4 个选项、自定义输入，或随时点“结束”进入收尾。
- 不要写摸头、靠肩、递热饮等仅限清水互动的选项。

${buildNsfwIntimacyChatContextLine()}

制作人刚才的行动或台词：
${producerAction}

角色核心：
${profile.core || "按初星学园偶像设定自然发挥。"}

请承接上文，写出 ${targetIdol} 的反应与场景推进，并重新设计 4 个新的互动分支选项。
${buildNsfwIntimacyOptionContract()}

${galgameRenderContract("choice")}
${buildChoiceHardRules({ storyNote: "3. <story> 只写本轮新增内容，不要重复已发生剧情全文。" })}`;
  }

  function buildNsfwIntimacyClosingPrompt() {
    const targetIdol = getNsfwIntimacyTargetIdol();
    const profile = idols[targetIdol] || {};
    const apartmentInvite = isApartmentNsfwInviteActive();
    const header = apartmentInvite
      ? "[初星育成系统：公寓邀约 · NSFW 亲密 · 收尾]"
      : "[初星育成系统：NSFW 亲密 · 收尾]";
    const sceneSection = apartmentInvite ? `\n${buildApartmentNsfwSceneSection(targetIdol)}\n` : "";
    const dailySummarySection = state.pendingActionContext?.actionContext?.isDailyFinalAction
      ? `

今日行动回顾（供总结使用，不要原样复述成列表）：
${buildTodayActionRecapForSummary()}

当前状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 体力 ${state.stamina} / 压力 ${state.stress} / 信赖 ${state.trust}
${getAffinityStageLine(state.idol, state.trust)}

${buildDailySummaryContract()}`
      : "";
    const renderContract = state.pendingActionContext?.actionContext?.isDailyFinalAction
      ? `${galgameRenderContract("normal")}
- 先写【初星正文开始】…【初星正文结束】收尾剧情，再写【今日总结开始】…【今日总结结束】。
- 请写 600 字以内的 NSFW 亲密收尾正文。${dailySummarySection}`
      : `${outputContract("请写 600 字以内的 NSFW 亲密收尾正文。")}`;

    return `${header}

互动对象：${targetIdol}
担当偶像：${state.idol || "未登记"}
${buildNsfwIntimacyAffinityLine(targetIdol)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按互动对象写"}
${buildNsfwIntimacyScheduleLine()}
行动：NSFW 亲密（玩家选择结束）
${sceneSection}
角色设定前提：
- 制作人刚刚选择结束本次 NSFW 亲密互动。

${buildNsfwIntimacyChatContextLine()}

前端已结算：体力 +38，压力 -10，不增加信赖值。

请写出 ${targetIdol} 在亲密结束时的反应，以及本次 NSFW 互动的余韵收尾。
- 不要再提供新的选项。
- 让场景自然收束，可写亲密后的安抚、余韵与告别。
- 不要退回到普通亲密 / 清水互动的语气。
- 限制在 600 字以内。

${renderContract}`;
  }

  function buildOpeningPrompt() {
    const profile = idols[state.idol];
    const seed = affinityRouteSeeds[state.idol]?.[0] || affinityNodes[0].theme;
    return `[初星育成系统：好感度0担当开场]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按担当偶像写"}
当前阶段：${getPhase()}
初始状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 体力 ${state.stamina} / 压力 ${state.stress} / 信赖 ${state.trust}

角色核心：
${profile.core}
${buildProducerPromptSection()}

本节点主题：
${affinityNodes[0].theme}

剧情种子：
${seed}

叙事要求：担当开场剧情，写选择理由与对方反应，停在育成正式开始；不推进日程，不改数值。

${outputContract("请写 500 字以内的开场剧情。")}`;
  }

  function buildLivePrompt() {
    return `[初星育成系统：First Live 候场]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
最终状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 体力 ${state.stamina} / 压力 ${state.stress} / 信赖 ${state.trust}
成长率：Vo ${state.growth?.Vo} / Da ${state.growth?.Da} / Vi ${state.growth?.Vi}
${buildProducerPromptSection()}

请准备进入 First Live 最终演出，写 400 字以内候场剧情，停在正式开始演出之前。

${outputContract("候场剧情写在【初星正文开始】…【初星正文结束】内。")}`;
  }

  function formatBondOptions(options) {
    return options.map((option, index) => `<option${index + 1}>${option}</option${index + 1}>`).join("\n");
  }

  function specialBondRoutesFor(idolName = state.idol) {
    if (idolName === "筱泽广") return hiroBondRoutes;
    if (idolName === "十王星南") return seinaBondRoutes;
    if (idolName === "藤田琴音") return kotoneBondRoutes;
    if (idolName === "花海咲季") return sakiBondRoutes;
    if (idolName === "花海佑芽") return umeBondRoutes;
    if (idolName === "仓本千奈") return chinaBondRoutes;
    if (idolName === "葛城莉莉娅") return liljaBondRoutes;
    if (idolName === "紫云清夏") return sumikaBondRoutes;
    if (idolName === "有村麻央") return maoBondRoutes;
    if (idolName === "姬崎莉波") return rinamiBondRoutes;
    if (idolName === "月村手毬") return temariBondRoutes;
    if (idolName === "秦谷美铃") return misuzuBondRoutes;
    if (idolName === "雨夜燕") return amayaBondRoutes;
    return null;
  }

  function specialBondLabel(idolName = state.idol) {
    if (idolName === "筱泽广") return "广羁绊事件";
    if (idolName === "十王星南") return "星南羁绊事件";
    if (idolName === "藤田琴音") return "琴音羁绊事件";
    if (idolName === "花海咲季") return "咲季羁绊事件";
    if (idolName === "花海佑芽") return "佑芽羁绊事件";
    if (idolName === "仓本千奈") return "千奈羁绊事件";
    if (idolName === "葛城莉莉娅") return "莉莉娅羁绊事件";
    if (idolName === "紫云清夏") return "清夏羁绊事件";
    if (idolName === "有村麻央") return "麻央羁绊事件";
    if (idolName === "姬崎莉波") return "莉波羁绊事件";
    if (idolName === "月村手毬") return "手毬羁绊事件";
    if (idolName === "秦谷美铃") return "美铃羁绊事件";
    if (idolName === "雨夜燕") return "燕羁绊事件";
    return `${idolName || "偶像"}羁绊事件`;
  }

  function buildSpecialBondPhase1Prompt(threshold) {
    const profile = idols[state.idol];
    const route = specialBondRoutesFor()?.[threshold];
    return `[初星育成系统：${specialBondLabel()} - 第一轮选择]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按担当偶像写"}
剧情节点：好感度 ${threshold} / ${route.title}
当前阶段：${getPhase()}
当前日程：第 ${state.day} 天，羁绊事件日
当前状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 体力 ${state.stamina} / 压力 ${state.stress} / 信赖 ${state.trust}

角色核心：
${profile.core}
${buildProducerPromptSection()}

本节点目标：
${route.objective}

原作锚点：
${route.canonAnchor}

第一段要求：
${route.phase1Setup}

${route.phase1Title}：
${formatBondOptions(route.phase1Options)}

${galgameRenderContract("choice")}
${buildChoiceHardRules({ phase1: true })}

${route.phase1Title}（严格使用下列 option 文本）：
${formatBondOptions(route.phase1Options)}

输出示例：
【初星正文开始】
<story>开场剧情，停在第一次选择前。</story>
${formatBondOptions(route.phase1Options)}
【初星正文结束】`;
  }

  function buildSpecialBondPhase2Prompt(threshold, firstChoiceText) {
    const route = specialBondRoutesFor()?.[threshold];
    return `[初星育成系统：${specialBondLabel()} - 第二轮选择]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
剧情节点：好感度 ${threshold} / ${route.title}
当前日程：第 ${state.day} 天，羁绊事件日

第一轮制作人选择：
${firstChoiceText}

中段要求：
${route.phase2Setup}

${route.phase2Title}：
${formatBondOptions(route.phase2Options)}

叙事要求：承接第一轮选择，推进到更深层矛盾后停在第二次选择前；option 严格使用上方给定文本，不要改数值。

${galgameRenderContract("choice")}
${buildChoiceHardRules({ phase1: true })}

输出示例：
【初星正文开始】
<story>中段剧情，停在第二次选择前。</story>
${formatBondOptions(route.phase2Options)}
【初星正文结束】`;
  }

  function buildSpecialBondFinalPrompt(threshold, firstChoiceText, secondChoiceText) {
    const route = specialBondRoutesFor()?.[threshold];
    return `[初星育成系统：${specialBondLabel()} - 收束]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
剧情节点：好感度 ${threshold} / ${route.title}
当前日程：第 ${state.day} 天，羁绊事件日

第一轮制作人选择：
${firstChoiceText}

第二轮制作人选择：
${secondChoiceText}

最终收束目标：
${route.resolution}

叙事要求：
- 承接前两轮选择，写出本羁绊事件最后一段。
- 不要重新写开场，不要生成新的选项。
- 不要改变数值，不要推进日程。
- 结尾必须完成本节点的情绪收束，并为后续节点留下自然余韵。

${outputContract("请写一段 900 字以内的羁绊事件收束剧情。")}`;
  }

  function buildTemariBondPhase1Prompt(threshold) {
    return buildSpecialBondPhase1Prompt(threshold);
  }

  function buildTemariBondPhase2Prompt(threshold, firstChoiceText) {
    return buildSpecialBondPhase2Prompt(threshold, firstChoiceText);
  }

  function buildTemariBondFinalPrompt(threshold, firstChoiceText, secondChoiceText) {
    return buildSpecialBondFinalPrompt(threshold, firstChoiceText, secondChoiceText);
  }

  function buildAffinityPrompt(threshold) {
    const profile = idols[state.idol];
    const node = affinityNodes[threshold];
    const seed = affinityRouteSeeds[state.idol]?.[threshold] || node.theme;
    if (specialBondRoutesFor()?.[threshold]) {
      return buildSpecialBondPhase1Prompt(threshold);
    }
    return `[初星育成系统：好感度剧情触发]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按担当偶像写"}
剧情节点：好感度 ${threshold} / ${node.title}
当前阶段：${getPhase()}
当前日程：第 ${state.day} 天，${roundLabel()}
当前状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 体力 ${state.stamina} / 压力 ${state.stress} / 信赖 ${state.trust}
First Live 状态：${state.firstLive.completed ? (state.firstLive.success ? "已成功" : "已失败") : "尚未演出"}

角色核心：
${profile.core}
${buildProducerPromptSection()}

本节点主题：
${node.theme}

参考剧情种子：
${seed}

叙事要求：角色专属好感剧情；参考种子只提供矛盾结构，不要复述原句；80 为路线后半转折（不必固定 First Live 前夜），100 为 First Live 成功后收尾；不要改数值。

${outputContract("请写 1200 字以内的完整好感度剧情，一次写完，不要待续。")}`;
  }

  function buildFreeChatPrompt(topic) {
    const profile = idols[state.idol];
    return `[初星育成系统：自由闲聊]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按担当偶像写"}
当前阶段：${getPhase()}
当前日程：第 ${state.day} 天，${roundLabel()}
当前状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 体力 ${state.stamina} / 压力 ${state.stress} / 信赖 ${state.trust}

玩家想聊的话题：
${topic}

角色核心：
${profile.core}
${buildProducerPromptSection()}

闲聊规则：不消耗行动、不推进日程、不改数值；围绕话题自然回应，不要擅自推进重大矛盾。

${outputContract("请写 800 字以内的完整闲聊场景，自然收束，不要待续。")}${composeWorldDirectorPromptAddendum({ participants: [state.idol] })}`;
  }

  function buildPhoneChatScheduleLine() {
    if (isSummaryRound()) {
      return `当前日程：第 ${state.day} 天，${roundLabel()}（总结轮次，当日行动已结束）`;
    }
    return `当前日程：第 ${state.day} 天，${roundLabel()}`;
  }

  function buildPhoneChatScenarioRules() {
    return [
      "- 这是小手机 LINE 私聊，不是育成行动。",
      "- 不消耗行动次数，不推进轮次、日期或 First Live 日程。",
      "- 不增加或减少任何数值，不触发随机奖励。"
    ].join("\n");
  }

  function buildPhoneChatOutputContract(contactName, lineExamples = "") {
    const examples = lineExamples || [
      "第一行对应第一条消息气泡",
      "第二行对应第二条消息气泡",
      "如有更多回复继续逐行写"
    ].join("\n");
    return `【格式优先级】本条为「初星私聊」任务，优先于全局育成正文格式。
- 忽略【初星正文开始/结束】、dialogue/narration/option 等育成 XML 要求。
- 与全局输出要求一致：先输出 \`### 正文\`，再用 \`<content>\` 包裹私聊块。

输出格式（必须严格遵守）：
### 正文

<content>
<初星私聊 from="${contactName}">
${examples}
</初星私聊>
</content>

输出硬规则：
1. 只输出上述结构：标题 \`### 正文\`、一个 \`<content>\` 块、其中只含一个 \`<初星私聊>\`。
2. 不要在 \`<content>\` 外额外写说明、列表或 Markdown。
3. from 属性必须是 "${contactName}"。
4. 标签内每行一条消息，一行一个气泡，不要空行，不要把多条消息写在同一行。
5. 不要写制作人台词，不要写选项、数值或系统说明。`;
  }

  function buildPhoneChatPrompt(userMessage, threadId = "idol") {
    const contactName = getPhoneThreadContactName(threadId);
    const profile = idols[contactName] || {};
    const history = getPhoneThreadMessages(threadId)
      .slice(-14)
      .map((message) => {
        if (message.sender === "producer") return `制作人：${message.text}`;
        if (message.sender === "idol") return `${contactName}：${message.text}`;
        return null;
      })
      .filter(Boolean)
      .join("\n");

    const useFreeAffinity = isSandboxLaunch() || isFreeModeActive();
    const contactScore = useFreeAffinity ? getFreeModeRelationshipScore(contactName) : state.trust;
    const affinityLine = contactName === state.idol
      ? `${getContactAffinityStageLine(state.idol)}（当前好感度：${contactScore}/100）`
      : "关系：学院内其他偶像";
    const statusLine = useFreeAffinity
      ? `当前状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 体力 ${state.stamina} / 压力 ${state.stress} / 好感度 ${contactName === state.idol ? contactScore : getFreeModeRelationshipScore(state.idol)}`
      : `当前状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 体力 ${state.stamina} / 压力 ${state.stress} / 信赖 ${state.trust}`;

    return `[初星育成系统：小手机私聊]

当前聊天对象：${contactName}
担当偶像：${state.idol}
${affinityLine}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按当前聊天对象写"}
当前阶段：${getPhase()}
${buildPhoneChatScheduleLine()}
${statusLine}

最近聊天记录：
${history || "（尚无历史）"}

制作人刚才发来的消息：
${userMessage}

角色核心：
${profile.core || "按初星学园偶像设定自然发挥。"}
${buildProducerPromptSection()}

私聊规则：
${buildPhoneChatScenarioRules()}
- 用${contactName}的口吻回复制作人刚才的消息，可以分多条短消息发送。
- 每条消息保持口语化，像真实聊天，不要写成完整小说段落。

${buildPhoneChatOutputContract(contactName)}`;
  }

  function buildPhoneAddFriendGreetingPrompt(friendName) {
    const profile = idols[friendName] || {};
    const scenarioLine = isSummaryRound()
      ? `- 制作人在总结轮次的小手机里，刚刚把 ${friendName} 加为好友。`
      : `- 制作人在小手机里，刚刚把 ${friendName} 加为好友。`;
    return `[初星育成系统：小手机添加好友问候]

制作人：${getPhoneProducerLabel()}
担当偶像：${state.idol}
刚添加的好友：${friendName}
当前阶段：${getPhase()}
${buildPhoneChatScheduleLine()}

场景：
${scenarioLine}
- 请让 ${friendName} 主动发来添加好友后的第一条问候私聊。
- 问候应自然、简短，像 LINE 上刚加好友后的第一句话。
- 可以分 1 到 3 条短消息，不要写成长段落。

角色核心：
${profile.core || "按初星学园偶像设定自然发挥。"}

私聊规则：
- 不是育成行动，不改变任何数值，不推进日程。
- 只写 ${friendName} 的问候，不要替制作人发言。

${buildPhoneChatOutputContract(friendName, [
      "第一行对应第一条问候气泡",
      "第二行对应第二条问候气泡"
    ].join("\n"))}`;
  }

  function buildIdolInteractionPrompt(selectedCharacters, plot, aiDecides) {
    const profile = idols[state.idol];
    const candidates = interactionCharacters.filter((name) => name !== state.idol);
    const castSection = aiDecides
      ? `登场角色模式：由 AI 决定\n候选角色库：${candidates.join("、")}\n请从候选角色库中选择一至三名其他偶像参与本次互动。`
      : `登场角色模式：玩家指定\n指定互动角色：${selectedCharacters.join("、")}`;
    const plotSection = plot
      ? `玩家指定的情节方向：\n${plot}`
      : "玩家没有指定情节，情节也由 AI 自行设计。";
    return `[初星育成系统：偶像互动]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按担当偶像写"}
当前阶段：${getPhase()}
当前日程：第 ${state.day} 天，${roundLabel()}
当前状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 体力 ${state.stamina} / 压力 ${state.stress} / 信赖 ${state.trust}

${castSection}

${plotSection}

担当角色核心：
${profile.core}
${buildProducerPromptSection()}

互动规则：不消耗行动、不推进日程、不改数值；${aiDecides ? "从候选库选 1～3 人实际参与" : "指定角色必须全部参与"}；多人同场互动，不要轮流独白。

${outputContract("请写 1200 字以内的完整偶像互动，从建立到收束一次写完，不要待续。")}${composeWorldDirectorPromptAddendum({ participants: aiDecides ? [state.idol] : [state.idol, ...selectedCharacters] })}`;
  }

  function evaluateFirstLive() {
    const stats = ["Vo", "Da", "Vi"].map((key) => ({
      key,
      label: statLabels[key],
      value: state[key],
      target: state.threshold[key],
      margin: state[key] - state.threshold[key]
    }));
    const success = stats.every((item) => item.margin >= 0);
    const highest = [...stats].sort((a, b) => b.value - a.value)[0];
    const weakest = [...stats].sort((a, b) => a.margin - b.margin)[0];
    const surplus = stats.reduce((sum, item) => sum + Math.max(0, item.margin), 0);
    const tone = success
      ? surplus >= 600 ? "三项都明显超过审查基准，First Live 大获成功。" : `${highest.label} 表现最突出，整体达到审查基准。`
      : `${weakest.label} 未达到审查基准，演出留下明确课题。`;
    return { success, stats, highest, weakest, surplus, tone };
  }

  function formatLiveResult(result) {
    const lines = result.stats.map((item) => `${item.label} ${item.value} / ${item.target} ${item.margin >= 0 ? "达标" : "未达标"}`);
    return `${lines.join("\n")}\n\n结果：${result.success ? "First Live 成功" : "First Live 失败"}\n叙事侧重：${result.tone}`;
  }

  function buildFirstLivePrePrompt() {
    const profile = idols[state.idol];
    const preSeed = state.idol === "月村手毬"
      ? "手毬登台前想起与美铃的赌约，担心自己能否赢、能否让美铃放心；她确认制作人是否仍愿意支持自己，甚至担心制作人会不会厌烦 SyngUp 的麻烦。制作人需要把她拉回舞台，提醒她不要在彩排或候场里耗尽自己，这次要在正式舞台上发挥全部实力。"
      : "";
    return `[初星育成系统：First Live 最终演出 - 登台前夜候场]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按担当偶像写"}
当前状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 体力 ${state.stamina} / 压力 ${state.stress} / 信赖 ${state.trust}

角色核心：
${profile.core}
${buildProducerPromptSection()}
${preSeed ? `\n角色专属登台前种子：\n${preSeed}\n` : ""}

叙事时间范围：
- 正文必须限定在后台准备室/候场区，直到登台前的一刻。
- 重点描写偶像与制作人登台前的交流、心理活动、整理服饰、互相打气、做好觉悟的细节。
- 结尾停在偶像推开门走入登台通道，或者踏上台阶、强光照射过来、即将登台的瞬间。
- 绝对不要描写舞台上的具体表演过程。

叙事要求：
- 结合当前的体力、压力 and 信赖度，表现出担当偶像临近大考时的心理张力。
- 突出偶像对制作人至今为止陪伴与付出的内心回应。
- 语言细节符合《初星学园》角色卡设定。

${outputContract(`请写一段 600 字左右、以登台前后台沟通和觉悟为主体的剧情。`)}`;
  }

  function buildFirstLivePostPrompt(result) {
    const profile = idols[state.idol];
    return `[初星育成系统：First Live 最终演出 - 演后总结]

担当偶像：${state.idol}
${getAffinityStageLine(state.idol, state.trust)}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按担当偶像写"}
当前状态：Vo ${state.Vo} / Da ${state.Da} / Vi ${state.Vi} / 信赖 ${state.trust}

最终演出判定结果：
${formatLiveResult(result)}

最高项：${result.highest.label} ${result.highest.value}
最低项：${result.weakest.label} ${result.weakest.value}

角色核心：
${profile.core}
${buildProducerPromptSection()}

叙事时间范围：
- 正文必须发生在 First Live 演出刚刚结束、偶像走下舞台回到后台休息室的场景。
- 重点描写偶像走下台后的喘息、兴奋、疲惫，以及与制作人就刚才 Live 表现的面对面交流。
- 绝对不要详细描写舞台演出的进行过程。

叙事要求：
- 必须承认并扣紧 First Live 的前端判定结果（演出成功或失败）。
- 结合最高项和最低项属性，让偶像和制作人讨论刚才舞台上的亮点（最高项）和不足（最低项/未达标项）。
- 成功：偶像释放压力，体验到胜利和成长，流露出对制作人的感激与进一步的野心。
- 失败：偶像面对不甘与泪水，与制作人共同承担失误，并重新坚定继续努力的觉悟。
- 描写结束后的情感变化，为好感度 100 剧情做铺垫。

${outputContract(`请写一段 800 字左右、以演出后后台沟通与总结为主体的剧情。`)}`;
  }

  function startOpeningStory(source = "startOpeningStory") {
    const prompt = buildOpeningPrompt();
    const requestId = createRequestId();
    const dispatch = acquirePrimaryEntryDispatch(requestId, "opening");
    if (!dispatch.ok) return false;
    recordDebugOpeningDispatch(source);
    markAffinityUnlocked(0);
    state.activeStoryNode = { type: "affinity", threshold: 0, ready: false };
    state.lastPrompt = prompt;
    state.lastStory = `${state.idol}的担当开场正在生成。`;
    saveState();
    render();
    pendingAiRequestId = requestId;
    openEventOverlay("好感度 0：担当开场", "已向当前角色卡发送开场剧情请求。", buildAiWaitingStory("选择担当偶像后，开场剧情将由 AI 生成。"));
    if (!requestHostPromptSend(prompt, requestId, {
      channelLeaseId: dispatch.owner?.channelLeaseId || "",
      ownerKind: "opening",
      generationMode: "opening_quiet"
    })) {
      state.activeStoryNode.ready = true;
      saveState();
      openEventOverlay("好感度 0：担当开场", "当前页面未连接 SillyTavern。提示词已准备，可手动发送给 AI；本地测试时也可以确认进入育成。", "开场剧情等待手动生成。你可以在提示词窗口复制或编辑好感度0开场提示词。");
      openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制好感度0开场提示词后手动发送。");
    }
    return true;
  }

  function triggerAffinityStory(threshold) {
    let prompt = "";
    let requestId = "";
    let openingDispatch = null;
    if (threshold === 0) {
      prompt = buildOpeningPrompt();
      requestId = createRequestId();
      openingDispatch = acquirePrimaryEntryDispatch(requestId, "opening");
      if (!openingDispatch.ok) return false;
    }
    ensureStateShape();
    refreshAffinityUnlocks();
    if (!state.affinity.unlocked.includes(threshold)) {
      if (openingDispatch?.owner) {
        releasePrimaryModelChannel(requestId, openingDispatch.owner.channelLeaseId, "opening_not_unlocked");
      }
      showToast("剧情尚未解锁", affinityNodes[threshold]?.timing || "继续推进育成即可解锁。", "warn");
      return false;
    }
    if (threshold === 80 && state.day < BOND_80_DAY) {
      showToast("羁绊尚未到时", `好感度 80 羁绊将在第 ${BOND_80_DAY} 天（First Live 前夜）触发。`, "warn");
      return;
    }
    if (threshold === 0) {
      recordDebugOpeningDispatch("triggerAffinityStory(0)");
    }
    const node = affinityNodes[threshold];
    if (!prompt) prompt = buildAffinityPrompt(threshold);
    if (!requestId) requestId = createRequestId();
    state.activeStoryNode = { type: "affinity", threshold, ready: false };
    if (specialBondRoutesFor()?.[threshold]) {
      state.eventMode = "choice_prompt";
      state.choiceStep = 1;
      state.bondChoiceRound = 1;
      state.bondFirstChoiceText = "";
      state.pendingActionContext = { action: "bond", threshold };
      state.pendingChoiceRewards = [0, 0, 0, 0];
      state.pendingOptionTexts = [];
      state.selectedChoiceText = "";
      state.selectedChoiceRating = "";
    } else {
      state.eventMode = "none";
      state.choiceStep = 0;
      state.bondChoiceRound = 0;
      state.bondFirstChoiceText = "";
      state.pendingOptionTexts = [];
      state.selectedChoiceText = "";
      state.selectedChoiceRating = "";
    }
    state.lastPrompt = prompt;
    state.lastStory = `好感度 ${threshold}：${node.title} 正在生成。`;
    saveState();
    closeModal();
    render();
    pendingAiRequestId = requestId;
    openEventOverlay(`好感度 ${threshold}：${node.title}`, `已向当前角色卡发送${node.title}剧情请求。`, buildAiWaitingStory(`${node.title}剧情正文等待 AI 回复。`));
    const dispatchOptions = threshold === 0 ? {
      channelLeaseId: openingDispatch?.owner?.channelLeaseId || "",
      ownerKind: "opening",
      generationMode: "opening_quiet"
    } : undefined;
    if (!requestHostPromptSend(prompt, requestId, dispatchOptions)) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制好感度剧情提示词后手动发送。");
    }
    return true;
  }

  // First Live 演出视频：仅使用远程 CDN，本地不 bundled 视频资源
  const VIDEO_CDN = "https://pub-cfdeb8f85de84d8193695eca002e7880.r2.dev";
  const idolVideoFiles = {
    "藤田琴音": "fujita-kotone-live.mp4",
    "月村手毬": "tsukimura-temari-live.mp4",
    "花海咲季": "hanami-saki-live.mp4",
    "花海佑芽": "hanami-yume-live.mp4",
    "筱泽广": "shinosawa-hiro-live.mp4",
    "十王星南": "juo-sena-live.mp4",
    "秦谷美铃": "hataya-misuzu-live.mp4",
    "仓本千奈": "kuramoto-china-live.mp4",
    "葛城莉莉娅": "katsuragi-lilja-live.mp4",
    "紫云清夏": "shiun-sumika-live.mp4",
    "有村麻央": "arimura-mao-live.mp4",
    "姬崎莉波": "himesaki-rinami-live.mp4",
    "雨夜燕": "amaya-tsubame-live.mp4"
  };
  const idolLiveVideos = Object.fromEntries(
    Object.entries(idolVideoFiles).map(([name, file]) => [
      name,
      `${VIDEO_CDN}/${file}`
    ])
  );

  function isLiveTheaterActive() {
    const overlay = document.getElementById("liveTheater");
    return Boolean(overlay && !overlay.hidden);
  }

  function flushDeferredLivePostReply() {
    if (!deferredLivePostReply) return false;
    const payload = deferredLivePostReply;
    deferredLivePostReply = null;
    openEventOverlay(payload.title, payload.result, payload.story);
    return true;
  }

  function playLiveVideo(videoUrl, onComplete) {
    const overlay = document.getElementById("liveTheater");
    const video = document.getElementById("liveVideo");
    const skipBtn = document.getElementById("liveSkipBtn");
    const volBtn = document.getElementById("liveVolumeBtn");
    const playPrompt = document.getElementById("livePlayPrompt");

    if (!overlay || !video) {
      onComplete();
      return;
    }

    pausePhoneMusic();
    setElementHidden("liveTheater", false);
    requestAnimationFrame(() => {
      overlay.style.opacity = "1";
    });

    video.src = videoUrl;
    video.load();

    // Start unmuted by default
    video.muted = false;
    let isMuted = false;

    function updateVolumeIcon() {
      if (isMuted) {
        volBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
        volBtn.classList.add("muted");
      } else {
        volBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`;
        volBtn.classList.remove("muted");
      }
    }

    updateVolumeIcon();

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        playPrompt.hidden = true;
      }).catch(error => {
        playPrompt.hidden = false;
        console.log("Autoplay blocked, showing click prompt.", error);
      });
    }

    volBtn.onclick = (e) => {
      e.stopPropagation();
      isMuted = !isMuted;
      video.muted = isMuted;
      updateVolumeIcon();
    };

    overlay.onclick = () => {
      if (video.paused) {
        video.play().then(() => {
          playPrompt.hidden = true;
        });
      } else {
        isMuted = !isMuted;
        video.muted = isMuted;
        updateVolumeIcon();
      }
    };

    playPrompt.onclick = (e) => {
      e.stopPropagation();
      video.play().then(() => {
        playPrompt.hidden = true;
        isMuted = false;
        video.muted = false;
        updateVolumeIcon();
      });
    };

    let finished = false;
    function cleanupAndFinish() {
      if (finished) return;
      finished = true;
      video.pause();

      volBtn.onclick = null;
      overlay.onclick = null;
      playPrompt.onclick = null;
      skipBtn.onclick = null;
      video.onended = null;
      video.onerror = null;

      overlay.style.opacity = "0";
      setTimeout(() => {
        setElementHidden("liveTheater", true);
        video.src = "";
        if (!flushDeferredLivePostReply()) {
          onComplete();
        }
      }, 500);
    }

    skipBtn.onclick = (e) => {
      e.stopPropagation();
      cleanupAndFinish();
    };

    video.onended = () => {
      cleanupAndFinish();
    };

    video.onerror = (e) => {
      console.warn("Video load error, skipping theater mode.", e);
      cleanupAndFinish();
    };
  }

  function startFirstLivePostStage() {
    const result = state.firstLive.result;
    deferredLivePostReply = null;
    state.activeStoryNode = { type: "firstLivePost", ready: false };
    const postRequestId = createRequestId();
    pendingAiRequestId = postRequestId;
    state.lastPrompt = buildFirstLivePostPrompt(result);
    state.lastStory = "演出后后台沟通与总结中...";
    saveState();
    render();

    const sentSuccess = requestHostPromptSend(state.lastPrompt, postRequestId);

    const showPostLiveOverlay = () => {
      if (state.activeStoryNode?.ready) {
        openEventOverlay(
          "First Live 演后记",
          "已收到 SillyTavern 角色回复",
          state.lastStory
        );
      } else {
        openEventOverlay(
          "First Live 演后记", 
          buildAiWaitingResult(formatLiveResult(result)), 
          buildAiWaitingStory("演出后后台剧情等待角色卡 AI 回复生成。")
        );
      }
      if (!sentSuccess) {
        openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制 First Live 演后记提示词后手动发送。");
      }
    };

    const videoUrl = idolLiveVideos[state.idol];
    if (videoUrl) {
      triggerWipeTransition(() => {
        playLiveVideo(videoUrl, showPostLiveOverlay);
      });
    } else {
      showPostLiveOverlay();
    }
  }

  function startFirstLive() {
    if (!state.idol || !state.liveReady) return;
    if (state.firstLive.completed) {
      showToast("First Live 已完成", state.firstLive.success ? "成功后可在羁绊事件中触发好感度100。" : "本轮演出已经结束。", "info");
      return;
    }
    const result = evaluateFirstLive();
    state.firstLive = { completed: true, success: result.success, result };
    state.activeStoryNode = { type: "firstLivePre", ready: false };
    state.lastPrompt = buildFirstLivePrePrompt();
    state.lastStory = "登台前候场准备中...";
    refreshAffinityUnlocks();
    state.lastDebug = formatLiveResult(result);
    state.log.unshift({ day: state.day, round: "Live", phase: "First Live", action: "最终演出", result: result.success ? "演出成功" : "演出失败" });
    state.log = state.log.slice(0, 24);
    saveState();
    render();
    const requestId = createRequestId();
    pendingAiRequestId = requestId;
    openEventOverlay("First Live 登台前准备", "正在后台进行登台前的最后准备和交流...", buildAiWaitingStory("正在等待角色卡 AI 回复生成登台前的准备剧情..."));
    if (!requestHostPromptSend(state.lastPrompt, requestId)) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制 First Live 提示词后手动发送。");
    }
  }

  function render() {
    normalizeBootFlowState();
    syncProducerApartmentState();
    renderLaunchStage();
    if (shouldShowSelectionStage()) {
      renderIdols();
      restorePendingSandboxApiSetup();
    }
    renderShellMode();
    ensureIdolListRendered();
    if (!state.idol) return;
    renderHud();
    renderStatMeters();
    renderActionButtons();
    renderNotebook();
  }

  function isFreeModeUnlocked() {
    return Boolean(state.freeMode?.unlocked && state.firstLive?.completed);
  }

  function isPhoneWorldFeedUnlocked() {
    if (shouldShowLaunchStage() || shouldShowSelectionStage()) return false;
    return Boolean(state.idol);
  }

  function getWorldFeedDayKey(sourceState = state) {
    if (isSandboxLaunch() || isHybridCampusMode()) {
      return `campus+${sourceState?.freeMode?.postLiveDay || 1}`;
    }
    if (isFreeModeUnlocked()) {
      return globalThis.HatsuWorld?.dailyTick?.getDayKey?.(sourceState)
        || `live+${sourceState?.freeMode?.postLiveDay || 1}`;
    }
    if (Number.isFinite(Number(sourceState?.day)) && Number(sourceState.day) > 0) {
      return `produce+${sourceState.day}`;
    }
    return `campus+${sourceState?.freeMode?.postLiveDay || 1}`;
  }

  function getWorldFeedPresenceSlotKey(sourceState = state) {
    if (isFreeModeActive()) {
      ensureFreeModeTimeDefaults();
      return `${sourceState.freeMode.postLiveDay}@${sourceState.freeMode.clockMinutes}`;
    }
    const day = Number.isFinite(Number(sourceState?.day)) && Number(sourceState.day) > 0
      ? Number(sourceState.day)
      : (sourceState?.freeMode?.postLiveDay || 1);
    const minutes = Number.isFinite(Number(sourceState?.freeMode?.clockMinutes))
      ? Number(sourceState.freeMode.clockMinutes)
      : FREE_MODE_DAY_START_MINUTES;
    return `${day}@${minutes}`;
  }

  function formatWorldFeedDayLabel() {
    if (isSandboxLaunch()) return formatCampusDayLabel();
    if (isFreeModeUnlocked()) return formatFreeModeDayLabel();
    if (Number.isFinite(Number(state.day)) && Number(state.day) > 0) {
      return `育成第 ${state.day} 天`;
    }
    if (isSandboxLaunch()) return formatCampusDayLabel();
    return `学园第 ${state.freeMode?.postLiveDay || 1} 天`;
  }

  function ensurePhoneWorldFeedReady() {
    if (!isPhoneWorldFeedUnlocked()) return;
    ensureStateShape();
    const helpers = getWorldFeedHelpers();
    const tick = globalThis.HatsuWorld?.dailyTick;
    if (!tick) return;
    if (!state.freeMode?.world?.campus?.slots) {
      tick.refreshWorldPresence?.(state, helpers);
    }
    if (shouldUseSecondaryWorldGen()) {
      syncDailyWorldGeneration();
    } else {
      if (!state.freeMode?.world?.broadcast?.today) {
        tick.rollDailyBroadcast?.(state, helpers);
      }
      tick.rollDailyBuzz?.(state, helpers);
      globalThis.HatsuWorld?.worldGen?.markDailyWorldGenReady?.(state, "static", getWorldFeedDayKey());
    }
    saveState();
  }

  function isHybridCampusMode() {
    return state.gameMode === "hybrid";
  }

  function isSandboxLaunch() {
    return state.launchMode === "sandbox";
  }

  function isSandboxScoutActive() {
    return isSandboxScoutPhase();
  }

  function getSandboxScoutTargetAtLocation(locationId) {
    const entries = globalThis.HatsuWorld?.campusBehavior?.getInteractableIdolsAtLocation?.(locationId, state) || [];
    return entries[0]?.idolName || "";
  }

  function isSandboxScoutTalkAvailable(locationId) {
    if (!isSandboxLaunch() || !isSandboxScoutActive()) return false;
    const scoutId = globalThis.HatsuTasks?.getScoutQuestId?.(state);
    if (!scoutId || state.tasks?.main?.[scoutId]?.status !== "active") return false;
    return Boolean(getSandboxScoutTargetAtLocation(locationId));
  }

  function isSandboxScoutWrapUpPending() {
    return Boolean(state.pendingActionContext?.actionContext?.scoutWrapUpPending);
  }

  function scoutCompletionPendingInReply(source) {
    if (!isSandboxScoutActive()) return false;
    const scoutId = globalThis.HatsuTasks?.getScoutQuestId?.(state);
    if (!scoutId || state.tasks?.main?.[scoutId]?.status !== "active") return false;
    const ids = globalThis.HatsuTasks?.parseQuestCompletionsFromText?.(source) || [];
    return ids.includes(scoutId);
  }

  function scoutTemariCompletionPendingInReply(source) {
    return scoutCompletionPendingInReply(source);
  }

  function getSandboxScoutSignStory() {
    return String(state.pendingActionContext?.actionContext?.scoutSignStory || state.lastStory || "").trim();
  }

  function buildSandboxScoutWrapUpDisplayStory(epilogue = "") {
    return [getSandboxScoutSignStory(), epilogue].filter(Boolean).join("\n\n");
  }

  function beginSandboxScoutWrapUp() {
    const actionContext = state.pendingActionContext?.actionContext || {};
    state.pendingActionContext.actionContext = { ...actionContext, scoutWrapUpPending: true };
    state.pendingOptionTexts = [];
    state.pendingOptionMinutes = [];
    state.eventMode = "choice_resolution";
    state.choiceStep = 2;
    const requestId = createRequestId();
    pendingAiRequestId = requestId;
    state.lastPrompt = buildSandboxScoutWrapUpPrompt();
    state.lastDebug = "沙盒物色搭话：担当已同意签约，等待收尾剧情。";
    saveState();
    setElementHidden("eventChoices", true);
    closeVnChoicesOverlay();
    const locationId = actionContext.locationId;
    const location = resolveMapExploreLocation(locationId, actionContext);
    const exploreLabel = location?.name || actionContext.locationName || "物色搭话";
    const signStory = getSandboxScoutSignStory();
    const previewStory = signStory
      ? `${signStory}\n\n<narration>物色成功，正在生成签约收尾...</narration>`
      : buildAiWaitingStory("担当已同意成为制作人担当，正在生成签约收尾...");
    openEventOverlay(
      `${exploreLabel} · 物色成功`,
      "物色成功，正在生成收尾剧情...",
      previewStory
    );
    if (!requestHostPromptSend(state.lastPrompt, requestId)) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请复制物色收尾提示词后手动发送。");
    }
  }

  function completeScoutFromReplyAndBeginWrapUp(source, segmentStory, requestId) {
    if (!scoutCompletionPendingInReply(source)) return false;
    const scoutId = globalThis.HatsuTasks?.getScoutQuestId?.(state);
    const completed = globalThis.HatsuTasks?.applyQuestCompletionsFromReply?.(state, source) || [];
    if (!scoutId || !completed.includes(scoutId)) return false;
    if (segmentStory) {
      const signStory = String(segmentStory || "").trim();
      state.pendingActionContext.actionContext = {
        ...(state.pendingActionContext?.actionContext || {}),
        scoutSignStory: signStory
      };
      // 签约瞬间只保留本轮正文，避免把前几轮物色剧情一并堆进收尾过渡界面。
      state.lastStory = signStory;
    }
    notifyQuestCompletions(completed);
    refreshWorldPresenceFromRules(true);
    sendAiReplyAck(requestId, true, false);
    beginSandboxScoutWrapUp();
    return true;
  }

  function isProduceLaunch() {
    return state.launchMode === "produce";
  }

  function shouldShowLaunchStage() {
    if (state.launchMenuPaused) return true;
    return !state.idol && !state.launchMode;
  }

  function hasResumableGameplay() {
    if (!state.idol) return false;
    if (state.launchMode === "sandbox" || state.gameMode === "hybrid") {
      return Boolean(state.sandbox?.openingComplete && state.sandbox?.inviteComplete);
    }
    return Boolean(state.affinity?.openingComplete);
  }

  function getResumeGameplaySummary() {
    if (!state.idol) return "";
    if (state.launchMode === "sandbox" || state.gameMode === "hybrid") {
      ensureFreeModeTimeDefaults();
      return `${state.idol} · 沙盒 · ${formatCampusDayLabel()} ${formatFreeModeClock()}`;
    }
    return `${state.idol} · 育成 · 第 ${state.day} 天`;
  }

  function shouldShowSelectionStage() {
    if (state.launchMenuPaused) return false;
    if (state.idol) return false;
    if (state.launchMode === "produce") return true;
    return state.launchMode === "sandbox" && Boolean(state.sandbox?.openingComplete);
  }

  function normalizeBootFlowState() {
    if (state.idol) return;
    if (state.launchMode === "sandbox" && !state.sandbox?.openingComplete) return;
    if (!state.launchMode) return;
    if (!shouldShowLaunchStage() && !shouldShowSelectionStage()) {
      state.launchMode = null;
      state.sandbox = { openingComplete: false, inviteComplete: false };
    }
  }

  function ensureIdolListRendered() {
    if (!shouldShowSelectionStage()) return;
    const list = getIdolListElement();
    if (!list) return;
    if (list.childElementCount === 0) renderIdols();
  }

  function getLaunchSelectionCopy() {
    if (isSandboxLaunch()) {
      return {
        kicker: "Sandbox",
        title: "物色担当偶像",
        desc: "亚纱里老师已介绍学园概况。先选一位今天要去接触的偶像，再到地图找她聊聊。",
        rules: [
          "沙盒开局开放月村手毬、藤田琴音、花海咲季、秦谷美铃、筱泽广",
          "选择后设定制作人档案",
          "再到地图与担当接触"
        ],
        confirmLabel: "前往学园",
        producerStartLabel: "确认档案，前往学园"
      };
    }
    return {
      kicker: "Hatsuboshi Produce",
      title: "选择担当偶像",
      desc: "22 天 First Live 育成。羁绊事件独立成剧情日，LLM 负责把前端结果写成角色叙事。",
      rules: null,
      confirmLabel: "开始育成",
      producerStartLabel: "签署合约，开启星途"
    };
  }

  function getProducerSetupCopy(idolName) {
    const name = String(idolName || selectedIdol || state.idol || "担当偶像");
    if (isSandboxLaunch()) {
      return {
        kicker: "Producer Setup",
        title: `${name} · 制作人档案`,
        desc: `设定你在沙盒学园中的制作人形象，确认后将前往地图与 ${name} 接触。`
      };
    }
    return {
      kicker: "Producer Setup",
      title: `${name} · 制作人合约`,
      desc: `签署与 ${name} 的专属育成合约。请在右侧设定您在游戏中的性格、说话风格及额外人设。`
    };
  }

  function populateProducerSetupForm() {
    document.getElementById("prodNameInput").value = state.producer?.name || "{{user}}";
    document.getElementById("prodGenderInput").value = state.producer?.gender || "";
    document.getElementById("prodPersonalityInput").value = state.producer?.personality || "";
    document.getElementById("prodStyleInput").value = state.producer?.style || "";
    document.getElementById("prodSettingsInput").value = state.producer?.settings || "";
  }

  function updateSandboxApiTestStatus(message) {
    const status = document.getElementById("sandboxApiStatus");
    if (status) status.textContent = String(message || "可测试连接，也可暂不填写。");
  }

  function populateSandboxApiSetupForm() {
    const config = getSecondaryApiConfig();
    const enabled = document.getElementById("sandboxApiEnabled");
    const baseUrl = document.getElementById("sandboxApiBaseUrl");
    const model = document.getElementById("sandboxApiModel");
    const key = document.getElementById("sandboxApiKey");
    if (enabled) enabled.checked = config.enabled;
    if (baseUrl) baseUrl.value = config.baseUrl;
    if (model) model.value = config.model;
    if (key) key.value = config.apiKey;
    updateSandboxApiTestStatus(config.enabled
      ? `次 API 已启用${config.apiKey ? " · Key 已保存" : " · 未保存 Key"}`
      : "可测试连接，也可暂不填写。");
  }

  function openSandboxApiSetupPanel(idolName) {
    const canonical = canonicalIdolName(idolName);
    if (!canonical) return false;
    selectedIdol = canonical;
    state.sandbox = { ...(state.sandbox || {}), apiSetupPending: true, pendingIdol: canonical };
    document.getElementById("selectPanel")?.classList.add("is-hidden");
    document.getElementById("producerPanel")?.classList.add("is-hidden");
    document.getElementById("sandboxApiPanel")?.classList.remove("is-hidden");
    const kicker = document.getElementById("selectKicker");
    const title = document.getElementById("selectTitle");
    const desc = document.getElementById("selectDesc");
    const confirmContainer = document.getElementById("selectConfirmContainer");
    if (kicker) kicker.textContent = "Sandbox World Setup";
    if (title) title.textContent = "配置次 API";
    if (desc) desc.textContent = `为 ${canonical} 的沙盒世界设置生成接口，也可以暂不填写。`;
    if (confirmContainer) {
      confirmContainer.style.display = "none";
      confirmContainer.classList.remove("is-visible");
    }
    populateSandboxApiSetupForm();
    return true;
  }

  function restorePendingSandboxApiSetup() {
    if (!isSandboxLaunch() || !state.sandbox?.apiSetupPending) return false;
    return openSandboxApiSetupPanel(state.sandbox?.pendingIdol);
  }

  function readSandboxApiSetupForm() {
    return {
      enabled: Boolean(document.getElementById("sandboxApiEnabled")?.checked),
      baseUrl: String(document.getElementById("sandboxApiBaseUrl")?.value || "").trim(),
      model: String(document.getElementById("sandboxApiModel")?.value || "").trim(),
      apiKey: String(document.getElementById("sandboxApiKey")?.value || "").trim()
    };
  }

  function saveSandboxApiSetupForm(enabledOverride) {
    const form = readSandboxApiSetupForm();
    saveSecondaryApiSettings({
      ...form,
      enabled: enabledOverride === undefined ? form.enabled : Boolean(enabledOverride)
    });
    return form;
  }

  function finishSandboxApiSetup() {
    const idol = canonicalIdolName(state.sandbox?.pendingIdol);
    if (!idol) {
      showToast("无法继续", "担当偶像信息已丢失，请返回重新选择。", "warn");
      return false;
    }
    state.sandbox = { ...(state.sandbox || {}), apiSetupPending: false, pendingIdol: "" };
    saveState("sandbox.api_setup_complete");
    startSandboxInviteStory(idol);
    return true;
  }

  function continueSandboxApiSetup() {
    saveSandboxApiSetupForm();
    return finishSandboxApiSetup();
  }

  function skipSandboxApiSetup() {
    saveSandboxApiSetupForm(false);
    return finishSandboxApiSetup();
  }

  function testSandboxApiConnection() {
    saveSandboxApiSetupForm();
    updateSandboxApiTestStatus("测试请求发送中…");
    const sent = runSecondaryApiTest();
    if (!sent) updateSandboxApiTestStatus("测试未发出，请检查接口地址、模型或当前请求状态。");
    return sent;
  }

  function openProducerSetupPanel() {
    const selectPanel = document.getElementById("selectPanel");
    const producerPanel = document.getElementById("producerPanel");
    const sandboxApiPanel = document.getElementById("sandboxApiPanel");
    if (selectPanel) selectPanel.classList.add("is-hidden");
    if (producerPanel) producerPanel.classList.remove("is-hidden");
    if (sandboxApiPanel) sandboxApiPanel.classList.add("is-hidden");

    const copy = getProducerSetupCopy(selectedIdol);
    const kicker = document.getElementById("selectKicker");
    const title = document.getElementById("selectTitle");
    const desc = document.getElementById("selectDesc");
    const confirmContainer = document.getElementById("selectConfirmContainer");
    if (kicker) kicker.textContent = copy.kicker;
    if (title) title.textContent = copy.title;
    if (desc) desc.textContent = copy.desc;
    if (confirmContainer) {
      confirmContainer.style.display = "none";
      confirmContainer.classList.remove("is-visible");
    }
    populateProducerSetupForm();
  }

  function restoreIdolSelectionPanel() {
    const selectPanel = document.getElementById("selectPanel");
    const producerPanel = document.getElementById("producerPanel");
    const sandboxApiPanel = document.getElementById("sandboxApiPanel");
    if (selectPanel) selectPanel.classList.remove("is-hidden");
    if (producerPanel) producerPanel.classList.add("is-hidden");
    if (sandboxApiPanel) sandboxApiPanel.classList.add("is-hidden");

    const kicker = document.getElementById("selectKicker");
    const title = document.getElementById("selectTitle");
    const desc = document.getElementById("selectDesc");
    const confirmContainer = document.getElementById("selectConfirmContainer");
    const profile = idols[selectedIdol];

    if (profile) {
      if (kicker) kicker.textContent = profile.tag || getLaunchSelectionCopy().kicker;
      if (title) title.textContent = selectedIdol;
      if (desc) desc.textContent = profile.bio || "";
    }
    if (confirmContainer) {
      confirmContainer.style.display = "flex";
      confirmContainer.classList.add("is-visible");
    }
  }

  function renderLaunchStage() {
    const stage = document.getElementById("launchStage");
    if (!stage) return;
    stage.classList.toggle("is-hidden", !shouldShowLaunchStage());
    const resumeBtn = document.getElementById("launchResumeBtn");
    const restoreBtn = document.getElementById("launchRestoreBackupBtn");
    const resumeNote = document.getElementById("launchResumeNote");
    const canResume = state.launchMenuPaused && hasResumableGameplay();
    if (resumeBtn) {
      resumeBtn.hidden = !canResume;
      const summary = getResumeGameplaySummary();
      resumeBtn.innerHTML = summary
        ? `<span class="launch-mode-kicker">Resume</span><strong>继续游戏</strong><span class="launch-mode-desc">${summary}</span>`
        : `<span class="launch-mode-kicker">Resume</span><strong>继续游戏</strong><span class="launch-mode-desc">回到离开前的进度。</span>`;
    }
    if (resumeNote) {
      resumeNote.hidden = !canResume;
      resumeNote.textContent = "返回主菜单不会删除当前存档，可随时从此处继续。";
    }
    if (restoreBtn) {
      restoreBtn.hidden = !hasBackupSave();
    }
  }

  function beginFreshLaunchMode(mode) {
    if (mode === "sandbox") {
      startSandboxAsariOpening();
      return;
    }
    if (mode !== "produce") return;
    state.launchMode = "produce";
    saveState();
    render();
    showToast("育成模式", "请选择担当偶像，开始经典育成流程。", "info");
  }

  function chooseLaunchMode(mode) {
    if (state.launchMenuPaused && hasResumableGameplay()) {
      if (backupCurrentSave()) {
        showToast("已备份上一局", "开始新游戏前已自动备份，可在主菜单恢复备份。", "info");
      }
      state = clone(baseState);
      ensureStateShape();
      selectedIdol = null;
      document.body.classList.remove("is-free-mode-active", "is-hybrid-facility-active");
    }
    beginFreshLaunchMode(mode);
  }

  function resumeFromLaunchMenu() {
    if (!hasResumableGameplay()) {
      showToast("没有可继续的存档", "请先选择模式并开始游戏。", "warn");
      return;
    }
    state.launchMenuPaused = false;
    saveState();
    render();
    if ((state.launchMode === "sandbox" || state.gameMode === "hybrid") && state.sandbox?.inviteComplete) {
      if (!state.freeMode?.active) {
        enterSandboxCampusAfterOpening();
      }
    }
    showToast("继续游戏", `欢迎回来，${state.idol}。`, "info");
  }

  function startSandboxAsariOpening(options = {}) {
    const { resume = false } = options;
    state.launchMode = "sandbox";
    state.gameMode = "hybrid";
    state.idol = null;
    state.sandbox = { ...(state.sandbox || {}), openingComplete: false };
    state.activeStoryNode = { type: "sandboxOpening", ready: true };
    state.lastEventTitle = "沙盒模式 · 开学指引";
    state.lastEventResult = "亚纱里老师向你说明沙盒学园的行动方式。";
    state.lastEventStory = SANDBOX_ASARI_OPENING_STORY;
    state.lastStory = state.lastEventStory;
    state.lastDebug = "沙盒模式：亚纱里老师开学指引。";
    saveState();
    render();
    if (resume) return;
    openEventOverlay(state.lastEventTitle, state.lastEventResult, state.lastEventStory);
  }

  function finishSandboxOpeningToSelection() {
    state.activeStoryNode = null;
    state.sandbox = { ...(state.sandbox || {}), openingComplete: true, inviteComplete: false };
    selectedIdol = null;
    saveState();
    render();
    showToast("物色担当", "请选择今天要接触的偶像，然后前往学园大地图。", "info");
  }

  function startSandboxInviteStory(idolName, options = {}) {
    const { resume = false } = options;
    const canonical = canonicalIdolName(idolName);
    applyIdolPreset(canonical, true);
    globalThis.HatsuTasks?.activateScoutQuestForIdol?.(state, canonical);
    state.sandbox = { ...(state.sandbox || {}), inviteComplete: false, scoutTargetIdol: canonical };
    state.activeStoryNode = { type: "sandboxInvite", ready: true, idol: canonical };
    const spawnLocationId = getSandboxScoutLocation(canonical);
    const spawnLocationName = spawnLocationId ? getWorldMapLocation(spawnLocationId)?.name : "指定地点";
    state.lastEventTitle = "沙盒模式 · 出发邀请";
    state.lastEventResult = `前往 ${spawnLocationName}，尝试与 ${canonical} 接触。`;
    state.lastEventStory = SANDBOX_INVITE_STORY;
    state.lastStory = state.lastEventStory;
    state.lastDebug = `沙盒模式：确认情报后前往邀请 ${canonical}。`;
    saveState();
    render();
    if (resume) return;
    openEventOverlay(state.lastEventTitle, state.lastEventResult, state.lastEventStory);
  }

  function enterSandboxCampusAfterOpening() {
    ensureFreeModeTimeDefaults();
    if (!state.freeMode.world) state.freeMode.world = {};
    state.freeMode.world.macro_phase = "scout";
    globalThis.HatsuTasks?.syncSandboxMacroPhase?.(state);
    state.gameMode = "hybrid";
    state.freeMode = {
      ...(state.freeMode || {}),
      active: true,
      postLiveDay: 1,
      clockMinutes: FREE_MODE_DAY_START_MINUTES,
      facilityKind: null,
      facilityLocationId: null
    };
    const worldTickMode = runFreeModeWorldDailyTick();
    if (worldTickMode !== "secondary" && typeof ensureStorytellerPlanForCheckpoint === "function") {
      ensureStorytellerPlanForCheckpoint("day_change");
    }
    if (globalThis.HatsuTasks?.isSandboxTasksActive(state)) {
      globalThis.HatsuTasks.syncSideQuestDay(state);
    }
    document.body.classList.add("is-free-mode-active");
    saveState();
    render();
    const helpers = getHatsuWorldHelpers();
    const slot = globalThis.HatsuWorld?.campusBehavior?.getIdolCampusSlot?.(state, state.idol, helpers);
    const spawnLocationName = slot?.locationId ? getWorldMapLocation(slot.locationId)?.name : "";
    const labelSuffix = slot?.publicLabel ? `（${slot.publicLabel}）` : "";
    const presenceHint = state.idol && spawnLocationName ? `${state.idol} 今天在 ${spawnLocationName}${labelSuffix}。` : "";
    showToast("沙盒模式", `${presenceHint}当前 ${formatCampusDayLabel()} ${formatFreeModeClock()}。`, "gold");
  }

  function resumeSandboxIfNeeded() {
    if (!isSandboxLaunch()) return;
    if (state.sandbox?.openingComplete && !state.idol) return;
    if (state.sandbox?.openingComplete && state.idol && state.freeMode?.active) return;
    if (state.sandbox?.openingComplete && state.idol && !state.sandbox?.inviteComplete) {
      const overlay = document.getElementById("eventOverlay");
      if (!overlay || overlay.hidden) {
        startSandboxInviteStory(state.idol, { resume: false });
      }
      return;
    }
    if (state.sandbox?.openingComplete && state.idol && !state.freeMode?.active) {
      enterSandboxCampusAfterOpening();
      return;
    }
    const overlay = document.getElementById("eventOverlay");
    if (!overlay || overlay.hidden) {
      startSandboxAsariOpening({ resume: false });
    }
  }

  function returnToLaunchMenu() {
    worldMapLayoutState.editorActive = false;
    worldMapLayoutState.drag = null;
    closeMapLocationOverlay();
    setElementHidden("eventOverlay", true);
    state.launchMenuPaused = true;
    state.freeMode = {
      ...(state.freeMode || {}),
      active: false,
      activeLocationId: null,
      facilityKind: null,
      facilityLocationId: null
    };
    state.pendingActionContext = null;
    document.body.classList.remove("is-free-mode-active", "is-hybrid-facility-active");
    saveState();
    render();
    showToast("已返回主菜单", "存档已保留，可点击「继续游戏」回到进度。", "info");
  }

  function clearLaunchModeSelection() {
    if (state.launchMode === "sandbox") {
      state.sandbox = { openingComplete: false, inviteComplete: false };
    }
    state.launchMode = null;
    selectedIdol = null;
    saveState();
    render();
  }

  function isHybridFacilityActive() {
    return isHybridCampusMode() && Boolean(state.freeMode?.facilityKind);
  }

  function getHybridFacilityKind(locationId) {
    if (HYBRID_FACILITY_LESSON_LOCATIONS.includes(locationId)) return "lesson";
    if (HYBRID_FACILITY_TRAINING_LOCATIONS.includes(locationId)) return "training";
    if (locationId === "student_dormitory") return "rest";
    if (locationId === "campus_stage") return "first_live";
    return null;
  }

  function getHybridFacilityActionMinutes(facilityKind) {
    return facilityKind === "rest" ? STUDENT_DORMITORY_REST_MINUTES : HYBRID_FACILITY_ACTION_MINUTES;
  }

  function getSandboxFirstLiveChallengeStatusText() {
    const challenge = normalizeSandboxFirstLiveChallenge(state.sandbox?.firstLiveChallenge);
    const day = Number(state.freeMode?.postLiveDay) || 1;
    if (challenge.status === "completed") return "已完成";
    if (challenge.status === "generating") return "叙事生成中";
    if (challenge.status === "recovery_required") return "叙事待恢复";
    if (challenge.status === "cooldown" && day < Number(challenge.nextAvailableDay || 0)) {
      return `冷却至第 ${challenge.nextAvailableDay} 天`;
    }
    if (!canStartSandboxFirstLiveAt()) return "今日挑战时间已结束";
    return "可挑战";
  }

  function formatCampusDayLabel() {
    ensureFreeModeTimeDefaults();
    if (isSandboxLaunch() || isHybridCampusMode()) {
      return `学园第 ${state.freeMode.postLiveDay} 天`;
    }
    return formatFreeModeDayLabel();
  }

  function isFreeModeActive() {
    if (!state.freeMode?.active) return false;
    if (state.freeMode.layoutEditBypass) return true;
    if (isHybridCampusMode()) return true;
    return isFreeModeUnlocked();
  }

  function roundMapCoord(value) {
    return Math.round(Number(value) * 10) / 10;
  }

  function getEffectiveWorldMapLocations() {
    return WORLD_MAP_LOCATIONS.map((location) => {
      const override = worldMapLayoutState.overrides[location.id];
      if (!override) return { ...location };
      return {
        ...location,
        x: roundMapCoord(override.x ?? location.x),
        y: roundMapCoord(override.y ?? location.y)
      };
    });
  }

  function getWorldMapLocation(locationId) {
    return getEffectiveWorldMapLocations().find((location) => location.id === locationId) || null;
  }

  function resolveMapExploreLocation(locationId, actionContext = {}) {
    if (locationId === FREE_MODE_OUTING_LOCATION_ID) {
      const destination = String(
        actionContext.outingDestination
        || actionContext.locationName
        || state.freeMode?.activeOutingDestination
        || ""
      ).trim();
      if (!destination) return null;
      return {
        id: FREE_MODE_OUTING_LOCATION_ID,
        name: destination,
        shortLabel: "外出",
        description: `离开学园，前往${destination}。`,
        x: 0,
        y: 0,
        image: ""
      };
    }
    return getWorldMapLocation(locationId);
  }

  function getMapLocationSceneBackground(actionContext = {}) {
    const locationId = actionContext.locationId;
    if (!locationId) return DEFAULT_OUTING_SCENE;
    if (isFreeModeOffCampusExplore(actionContext)) {
      if (actionContext.outingSceneImage) return actionContext.outingSceneImage;
      const hasExplicitOutingFacility = Boolean(actionContext.outingVenueId || actionContext.outingFacilityId);
      if (hasExplicitOutingFacility) {
        const facility = getActiveFreeModeOutingFacility(actionContext);
        if (facility?.image) return facility.image;
      }
      const destination = String(
        actionContext.outingDestination
        || actionContext.locationName
        || state.freeMode?.activeOutingDestination
        || ""
      ).trim();
      if (OUTING_DESTINATION_SCENES[destination]) return OUTING_DESTINATION_SCENES[destination];
    }
    return WORLD_MAP_LOCATION_SCENES[locationId] || DEFAULT_OUTING_SCENE;
  }

  function isFreeModeOffCampusExplore(actionContext = state.pendingActionContext?.actionContext) {
    return actionContext?.locationId === FREE_MODE_OUTING_LOCATION_ID || Boolean(actionContext?.isOffCampus);
  }

  function ensureFreeModeTimeDefaults() {
    if (!state.freeMode) state.freeMode = {};
    if (!Number.isFinite(Number(state.freeMode.postLiveDay)) || state.freeMode.postLiveDay < 1) {
      state.freeMode.postLiveDay = 1;
    }
    if (!Number.isFinite(Number(state.freeMode.clockMinutes))) {
      state.freeMode.clockMinutes = FREE_MODE_DAY_START_MINUTES;
    }
    if (!state.freeMode.presence || typeof state.freeMode.presence !== "object") {
      state.freeMode.presence = {};
    }
  }

  function formatFreeModeClock(minutes = state.freeMode?.clockMinutes) {
    const total = Number(minutes);
    const safe = Number.isFinite(total) ? total : FREE_MODE_DAY_START_MINUTES;
    const hours = Math.floor(safe / 60);
    const mins = String(safe % 60).padStart(2, "0");
    return `${hours}:${mins}`;
  }

  function getWorldMapTimePhase(minutes = state.freeMode?.clockMinutes) {
    const safe = Number.isFinite(Number(minutes)) ? Number(minutes) : FREE_MODE_DAY_START_MINUTES;
    if (safe >= FREE_MODE_MAP_NIGHT_START_MINUTES) return "night";
    if (safe >= FREE_MODE_MAP_DUSK_START_MINUTES) return "dusk";
    return "day";
  }

  function getWorldMapImageForClock(minutes = state.freeMode?.clockMinutes) {
    const phase = getWorldMapTimePhase(minutes);
    if (phase === "night") return WORLD_MAP_IMAGE_NIGHT;
    if (phase === "dusk") return WORLD_MAP_IMAGE_DUSK;
    return WORLD_MAP_IMAGE_DAY;
  }

  function updateWorldMapImage() {
    const mapImage = document.getElementById("worldMapImage");
    if (!mapImage) return;
    const nextSrc = getWorldMapImageForClock();
    if (mapImage.getAttribute("src") === nextSrc) return;
    mapImage.src = nextSrc;
  }

  function formatFreeModeDayLabel() {
    ensureFreeModeTimeDefaults();
    if (isSandboxLaunch()) {
      return `学园第 ${state.freeMode.postLiveDay} 天`;
    }
    return `Live后${state.freeMode.postLiveDay}天`;
  }

  function getFreeModePresenceSlotKey() {
    ensureFreeModeTimeDefaults();
    return `${state.freeMode.postLiveDay}@${state.freeMode.clockMinutes}`;
  }

  function isMapLocationExploreActive() {
    return state.pendingActionContext?.action === "map_location";
  }

  function isProducerApartmentNightVisual() {
    if (!isFreeModeActive() || !state.freeMode?.atApartment) return false;
    if (isHybridFacilityActive() || worldMapLayoutState.editorActive) return false;
    ensureFreeModeTimeDefaults();
    return state.freeMode.clockMinutes >= FREE_MODE_MAP_NIGHT_START_MINUTES;
  }

  function isProducerApartmentLateNight() {
    if (!isFreeModeActive() || !state.freeMode?.atApartment) return false;
    if (isHybridFacilityActive() || worldMapLayoutState.editorActive) return false;
    ensureFreeModeTimeDefaults();
    return state.freeMode.clockMinutes >= FREE_MODE_DAY_END_MINUTES;
  }

  function isProducerApartmentEvening() {
    return isProducerApartmentLateNight();
  }

  function isProducerApartmentMorning() {
    if (!isProducerApartmentActive()) return false;
    ensureFreeModeTimeDefaults();
    return state.freeMode.clockMinutes < FREE_MODE_DAY_END_MINUTES;
  }

  function isApartmentCompanionSessionActive() {
    return state.pendingActionContext?.action === "apartment_companion";
  }

  function getApartmentCompanionIdol() {
    const raw = String(state.freeMode?.apartmentCompanionIdol || "").trim();
    const canonical = canonicalIdolName(raw);
    return canonical && idols[canonical] ? canonical : "";
  }

  function setApartmentCompanionIdol(idolName) {
    if (!state.freeMode) return;
    const canonical = canonicalIdolName(idolName);
    state.freeMode.apartmentCompanionIdol = canonical && idols[canonical] ? canonical : "";
  }

  function resolveIdolStandeeSrc(idolName) {
    const canonical = canonicalIdolName(idolName);
    if (!canonical) return "";
    if (vnStandees[canonical]) return vnStandees[canonical];
    const profile = idols[canonical];
    if (profile?.background) {
      const baseName = profile.background.split("/").pop();
      return `./assets/novel-standees/${baseName}`;
    }
    return profile?.avatar || "";
  }

  function getBuiltinPortraitMap() {
    const builtins = { producer: "./assets/novel-standees/producer.png" };
    Object.keys(idols).forEach((name) => {
      const url = resolveIdolStandeeSrc(name);
      if (url) builtins[`idol:${name}`] = url;
    });
    return builtins;
  }

  function resolvePortraitForSpeaker(speaker) {
    const appearance = globalThis.HatsuPortraits.normalizeAppearanceState(state.appearance);
    const characterKey = globalThis.HatsuPortraits.characterKeyForSpeaker(
      speaker,
      state.producer?.name,
      canonicalIdolName,
      (name) => Boolean(idols[name]),
      appearance.bindings.producer.aliases
    );
    if (!characterKey) {
      return {
        speaker: String(speaker || ""),
        characterKey: "",
        url: "",
        fallbackUrl: "",
        source: "builtin",
        transform: { ...globalThis.HatsuPortraits.DEFAULT_TRANSFORM }
      };
    }
    return {
      ...globalThis.HatsuPortraits.resolvePortrait(
        characterKey,
        appearance,
        getBuiltinPortraitMap(),
        portraitWardrobeState.invalidUrls
      ),
      speaker: String(speaker || "")
    };
  }

  function applyResolvedPortraitToImage(img, resolved) {
    if (!img || !resolved) return false;
    const transform = globalThis.HatsuPortraits.normalizeTransform(resolved.transform);
    img.src = String(resolved.url || "");
    img.style.setProperty("--portrait-scale", String(transform.scale));
    img.style.setProperty("--portrait-x", `${transform.offsetX}px`);
    img.style.setProperty("--portrait-y", `${transform.offsetY}px`);
    img.dataset.portraitSpeaker = String(resolved.speaker || "");
    img.dataset.portraitCharacterKey = String(resolved.characterKey || "");
    img.dataset.portraitUserUrl = resolved.source === "user" ? String(resolved.url || "") : "";
    img.dataset.portraitFallbackUrl = String(resolved.fallbackUrl || resolved.url || "");
    img.dataset.portraitFallbackApplied = "0";
    img.onerror = () => handlePortraitImageError(img, resolved.speaker || resolved.characterKey);
    return Boolean(resolved.url);
  }

  function handlePortraitImageError(img, speaker) {
    if (!img || img.dataset.portraitFallbackApplied === "1") return false;
    const failedUrl = String(img.dataset.portraitUserUrl || "");
    const fallbackUrl = String(img.dataset.portraitFallbackUrl || "");
    if (!failedUrl || !fallbackUrl || failedUrl === fallbackUrl) return false;
    portraitWardrobeState.invalidUrls.add(failedUrl);
    img.dataset.portraitFallbackApplied = "1";
    img.onerror = null;
    img.src = fallbackUrl;
    img.style.setProperty("--portrait-scale", "1");
    img.style.setProperty("--portrait-x", "0px");
    img.style.setProperty("--portrait-y", "0px");
    return true;
  }

  function getProducerApartmentSceneBackground() {
    ensureFreeModeTimeDefaults();
    return state.freeMode.clockMinutes >= FREE_MODE_MAP_NIGHT_START_MINUTES
      ? PRODUCER_APARTMENT_SCENE
      : PRODUCER_APARTMENT_DAY_SCENE;
  }

  function isProducerApartmentActive() {
    return Boolean(state.freeMode?.atApartment);
  }

  function getFreeModeTravelEndMinutes() {
    ensureFreeModeTimeDefaults();
    return state.freeMode.eveningStayExtended ? FREE_MODE_LATE_END_MINUTES : FREE_MODE_DAY_END_MINUTES;
  }

  function isEveningGoHomeActive() {
    return state.pendingActionContext?.action === "evening_go_home";
  }

  function canBringAssignedIdolHome() {
    const idol = getCurrentAffinityIdolName();
    if (!idol) return false;
    return getFreeModeRelationshipScore(idol) >= INTIMACY_NSFW_UNLOCK_TRUST;
  }

  function getEveningGoHomeOptions(phase = 1) {
    return phase === 2
      ? ["回家", "带担当回家"]
      : ["再晚一点", "回家", "带担当回家"];
  }

  function buildEveningGoHomeStory(phase = 1) {
    const idol = getCurrentAffinityIdolName() || state.idol || "";
    if (phase === 2) {
      return `【初星正文开始】
<story>
<narration>时间已经过了 ${formatFreeModeClock()}。</narration>
<narration>初星学园的灯光一盏盏暗下去，校园里只剩下零星还在忙碌的人影。</narration>
<narration>今天真的不能再拖了——制作人该做最后的决定。</narration>
</story>
【初星正文结束】`;
    }
    const idolLine = idol
      ? `<narration>你想起今天与 ${idol} 有关的安排，也到了该考虑今晚如何度过的时候。</narration>`
      : "";
    return `【初星正文开始】
<story>
<narration>初星学园的钟楼指向 ${formatFreeModeClock()}。</narration>
<narration>夜色慢慢压下来，走廊里的脚步声也渐渐稀疏。</narration>
<dialogue char="制作人">……时候不早了，该回去了。</dialogue>
${idolLine}
</story>
【初星正文结束】`;
  }

  function openEveningGoHomePrompt(phase = 1) {
    if (!isFreeModeActive() || state.freeMode?.atApartment) return;
    const normalizedPhase = phase === 2 ? 2 : 1;
    const options = getEveningGoHomeOptions(normalizedPhase);
    closeMapLocationOverlay();
    closeGiftShopOverlay();
    closeFreeModeTimeOverlay();
    pendingAiRequestId = "";
    state.pendingActionContext = {
      action: "evening_go_home",
      actionContext: { phase: normalizedPhase }
    };
    state.eventMode = "choice_prompt";
    state.choiceStep = 1;
    state.pendingOptionTexts = [...options];
    state.pendingChoiceRewards = [];
    state.pendingOptionMinutes = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    state.activeStoryNode = null;
    const story = buildEveningGoHomeStory(normalizedPhase);
    state.lastStory = story;
    state.lastEventStory = story;
    saveState();
    render();
    const title = normalizedPhase === 2 ? "夜深了" : "时候不早了";
    openEventOverlay(title, "学园一日接近尾声，请选择接下来的安排。", story);
  }

  function maybeTriggerEveningGoHomePrompt() {
    if (!isFreeModeActive()) return false;
    if (isHybridFacilityActive() || worldMapLayoutState.editorActive) return false;
    if (state.freeMode?.atApartment || isEveningGoHomeActive()) return false;
    ensureFreeModeTimeDefaults();
    const endMinutes = getFreeModeTravelEndMinutes();
    if (state.freeMode.clockMinutes < endMinutes) return false;
    if (pendingAiRequestId || isMapLocationExploreActive() || isApartmentCompanionSessionActive()) {
      state.freeMode.eveningGoHomeDeferred = true;
      return false;
    }
    state.freeMode.eveningGoHomeDeferred = false;
    const phase = state.freeMode.eveningStayExtended ? 2 : 1;
    openEveningGoHomePrompt(phase);
    return true;
  }

  function flushEveningGoHomeDeferred() {
    if (!state.freeMode?.eveningGoHomeDeferred) return false;
    return maybeTriggerEveningGoHomePrompt();
  }

  function handleEveningGoHomeChoice(index) {
    if (!isEveningGoHomeActive()) return;
    const phase = state.pendingActionContext?.actionContext?.phase || 1;
    const options = getEveningGoHomeOptions(phase);
    const choice = options[index];
    if (!choice) return;
    if (choice === "再晚一点") {
      state.freeMode.eveningStayExtended = true;
      state.pendingActionContext = null;
      state.eventMode = "none";
      state.choiceStep = 0;
      state.pendingOptionTexts = [];
      closeVnChoicesOverlay();
      setElementHidden("eventOverlay", true);
      saveState();
      render();
      showToast("再待一会儿", "可继续活动至 23:00，之后需要回家。", "info");
      return;
    }
    if (choice === "回家") {
      state.pendingActionContext = null;
      state.eventMode = "none";
      state.choiceStep = 0;
      state.pendingOptionTexts = [];
      closeVnChoicesOverlay();
      setElementHidden("eventOverlay", true);
      triggerWipeTransition(() => {
        enterProducerApartment({ companionIdol: "", toast: true });
      });
      return;
    }
    if (choice === "带担当回家") {
      if (!canBringAssignedIdolHome()) {
        showToast("好感不足", `与担当的好感度需达到 ${INTIMACY_NSFW_UNLOCK_TRUST} 才能邀请回家。`, "warn");
        return;
      }
      const targetIdol = getCurrentAffinityIdolName();
      if (!targetIdol) {
        showToast("需要担当偶像", "请先确认担当偶像。", "warn");
        return;
      }
      state.pendingActionContext = null;
      state.eventMode = "none";
      state.choiceStep = 0;
      state.pendingOptionTexts = [];
      closeVnChoicesOverlay();
      setElementHidden("eventOverlay", true);
      triggerWipeTransition(() => {
        enterProducerApartment({ companionIdol: targetIdol, toast: true });
      });
      return;
    }
  }

  function cloneEveningRelationshipSnapshot() {
    ensureFreeModeRelationships();
    if (typeof ensureFreeModeNpcRelationships === "function") ensureFreeModeNpcRelationships();
    const idolsSnapshot = {};
    Object.entries(state.freeMode.relationships || {}).forEach(([name, entry]) => {
      idolsSnapshot[name] = Number(entry?.好感度) || 0;
    });
    const npcSnapshot = {};
    Object.entries(state.freeMode.npcRelationships || {}).forEach(([name, entry]) => {
      npcSnapshot[name] = Number(entry?.好感度) || 0;
    });
    return { idols: idolsSnapshot, npcs: npcSnapshot };
  }

  function ensureEveningJournal(forceReset = false) {
    if (!isFreeModeActive()) return null;
    ensureFreeModeTimeDefaults();
    const day = Number(state.freeMode.postLiveDay) || 1;
    const journal = state.freeMode.eveningJournal;
    if (!forceReset && journal && Number(journal.day) === day) return journal;
    const relationships = cloneEveningRelationshipSnapshot();
    state.freeMode.eveningJournal = {
      day,
      snapshot: {
        trust: Number(state.trust) || 0,
        stamina: Number(state.stamina) || 0,
        stress: Number(state.stress) || 0,
        Vo: Number(state.Vo) || 0,
        Da: Number(state.Da) || 0,
        Vi: Number(state.Vi) || 0,
        relationships: relationships.idols,
        npcRelationships: relationships.npcs
      },
      activities: [],
      relationshipChanges: [],
      tasks: [],
      statNotes: []
    };
    return state.freeMode.eveningJournal;
  }

  function appendEveningJournalActivity(label, detail = "") {
    const journal = ensureEveningJournal();
    if (!journal) return;
    journal.activities.push({
      time: formatFreeModeClock(),
      label: String(label || "").trim(),
      detail: String(detail || "").trim()
    });
  }

  function appendEveningJournalTask(label, detail = "") {
    const journal = ensureEveningJournal();
    if (!journal) return;
    journal.tasks.push({
      time: formatFreeModeClock(),
      label: String(label || "").trim(),
      detail: String(detail || "").trim()
    });
  }

  function recordEveningJournalRelationships(applied = {}) {
    const journal = ensureEveningJournal();
    if (!journal) return;
    const pushChange = (name, kind, info) => {
      if (!name || !info?.delta) return;
      journal.relationshipChanges.push({
        name,
        kind,
        delta: info.delta,
        after: info.好感度
      });
    };
    Object.entries(applied.idols || {}).forEach(([name, info]) => pushChange(name, "idol", info));
    Object.entries(applied.npcs || {}).forEach(([name, info]) => pushChange(name, "npc", info));
    Object.entries(applied).forEach(([name, info]) => {
      if (name === "idols" || name === "npcs") return;
      if (!info?.delta) return;
      pushChange(name, idols[canonicalIdolName(name)] ? "idol" : "npc", info);
    });
  }

  function buildFreeModeEveningSummaryLines() {
    const journal = ensureEveningJournal();
    if (!journal) return ["今日尚无记录。"];
    const lines = [];
    const snap = journal.snapshot || {};
    const statParts = [];
    const appendStat = (label, key) => {
      const delta = (Number(state[key]) || 0) - (Number(snap[key]) || 0);
      if (!delta) return;
      statParts.push(`${label}${delta > 0 ? "+" : ""}${delta}`);
    };
    appendStat("信赖", "trust");
    appendStat("体力", "stamina");
    appendStat("压力", "stress");
    appendStat("Vo", "Vo");
    appendStat("Da", "Da");
    appendStat("Vi", "Vi");
    if (statParts.length) {
      lines.push({ text: "数值变化", section: true });
      lines.push({ text: statParts.join(" · "), muted: true });
    }

    if (journal.relationshipChanges?.length) {
      const aggregated = new Map();
      journal.relationshipChanges.forEach((entry) => {
        const existing = aggregated.get(entry.name);
        if (existing) {
          existing.delta += entry.delta;
          if (entry.after !== undefined && entry.after !== null) existing.after = entry.after;
        } else {
          aggregated.set(entry.name, {
            name: entry.name,
            kind: entry.kind,
            delta: entry.delta,
            after: entry.after
          });
        }
      });
      const rows = Array.from(aggregated.values()).filter((entry) => entry.delta);
      if (rows.length) {
        lines.push({ text: "关系变化", section: true });
        rows.forEach((entry) => {
          const kindLabel = entry.kind === "npc" ? "NPC" : "偶像";
          const afterText = entry.after !== undefined && entry.after !== null ? ` → ${entry.after}` : "";
          lines.push({
            text: `${entry.name}（${kindLabel}）${entry.delta > 0 ? "+" : ""}${entry.delta}${afterText}`,
            muted: true
          });
        });
      }
    }

    if (journal.tasks?.length) {
      lines.push({ text: "完成任务", section: true });
      journal.tasks.forEach((entry) => {
        lines.push({
          text: entry.detail ? `${entry.label}：${entry.detail}` : entry.label,
          muted: true
        });
      });
    }

    if (journal.activities?.length) {
      lines.push({ text: "今日行程", section: true });
      journal.activities.forEach((entry) => {
        lines.push({
          text: entry.detail ? `${entry.time} · ${entry.label}：${entry.detail}` : `${entry.time} · ${entry.label}`,
          muted: true
        });
      });
    }

    if (!lines.length) {
      lines.push({ text: "今天还没有留下记录。明天记得多出去走走。", muted: true });
    }
    return lines;
  }

  function renderFreeModeEveningSummaryView() {
    const overlay = document.getElementById("daySummaryOverlay");
    overlay?.classList.add("is-evening-mode");
    const profile = idols[state.idol] || {};
    const avatar = document.getElementById("daySummaryAvatar");
    const schedule = document.getElementById("daySummarySchedule");
    const name = document.getElementById("daySummaryName");
    const dayValue = document.getElementById("daySummaryDayValue");
    if (avatar) {
      avatar.src = profile.avatar || "";
      avatar.alt = state.idol ? `${state.idol}头像` : "担当头像";
    }
    if (schedule) schedule.textContent = formatFreeModeClock();
    if (name) name.textContent = formatIdolDisplayName(state.idol || "制作人");
    if (dayValue) dayValue.textContent = String(state.freeMode?.postLiveDay || 1);
    const notes = document.getElementById("daySummaryNotes");
    if (notes) {
      notes.innerHTML = buildFreeModeEveningSummaryLines().map((line) => {
        const className = line.section
          ? "day-summary-line is-section-title"
          : line.muted
            ? "day-summary-line is-muted"
            : "day-summary-line";
        return `<p class="${className}">${escapePhoneText(line.text)}</p>`;
      }).join("");
    }
    const closeBtn = document.getElementById("daySummaryCloseBtn");
    if (closeBtn) closeBtn.textContent = "返回公寓";
  }

  function openFreeModeEveningSummary() {
    renderFreeModeEveningSummaryView();
    setElementHidden("daySummaryOverlay", false);
  }

  function enterProducerApartment(options = {}) {
    if (!isFreeModeActive()) return false;
    if (state.freeMode?.atApartment) return true;
    if (pendingAiRequestId && !options.force) {
      showToast("请稍候", "等待当前剧情生成完成后再移动。", "warn");
      return false;
    }
    if (isMapLocationExploreActive()) {
      returnToFreeModeMap({ cancelled: true });
    }
    closeMapLocationOverlay();
    closeGiftShopOverlay();
    closeFreeModeTimeOverlay();
    closeVnChoicesOverlay();
    hideVnCustomChoicePanel();
    setElementHidden("eventOverlay", true);
    if (state.freeMode) {
      state.freeMode.activeLocationId = null;
      state.freeMode.activeOutingDestination = null;
      state.freeMode.facilityKind = null;
      state.freeMode.facilityLocationId = null;
      state.freeMode.atApartment = true;
      setApartmentCompanionIdol(options.companionIdol || "");
    }
    state.pendingActionContext = null;
    state.eventMode = "none";
    if (isProducerApartmentLateNight()) {
      ensureEveningJournal();
    }
    saveState();
    render();
    if (options.toast !== false) {
      const companion = getApartmentCompanionIdol();
      const message = companion
        ? `你和 ${companion} 一起回到了制作人公寓。`
        : isProducerApartmentLateNight()
          ? "今日学园活动已结束，制作人回到了自己的公寓。"
          : "制作人回到了自己的公寓。";
      showToast("公寓", message, "info");
    }
    return true;
  }

  function enterProducerApartmentIfNeeded(options = {}) {
    return enterProducerApartment(options);
  }

  function openApartmentGoHomeOverlay() {
    if (!isFreeModeActive() || isHybridFacilityActive() || isProducerApartmentActive()) return;
    if (pendingAiRequestId) {
      showToast("请稍候", "等待当前剧情生成完成后再回公寓。", "warn");
      return;
    }
    const badge = document.getElementById("apartmentGoHomePhaseBadge");
    if (badge) badge.textContent = `${formatFreeModeDayLabel()} · ${formatFreeModeClock()}`;
    setElementHidden("apartmentGoHomeOverlay", false);
  }

  function closeApartmentGoHomeOverlay() {
    setElementHidden("apartmentGoHomeOverlay", true);
  }

  function openApartmentCompanionPickOverlay() {
    const badge = document.getElementById("apartmentCompanionPickPhaseBadge");
    if (badge) badge.textContent = `${formatFreeModeDayLabel()} · ${formatFreeModeClock()}`;
    renderApartmentCompanionPickList();
    setElementHidden("apartmentCompanionPickOverlay", false);
  }

  function closeApartmentCompanionPickOverlay() {
    setElementHidden("apartmentCompanionPickOverlay", true);
  }

  function renderApartmentCompanionPickList() {
    const list = document.getElementById("apartmentCompanionPickList");
    const note = document.getElementById("apartmentCompanionPickNote");
    if (!list) return;
    const eligible = getApartmentNsfwEligibleIdols();
    list.innerHTML = "";
    if (note) {
      note.textContent = eligible.length
        ? `以下偶像对你的好感度已达 ${INTIMACY_NSFW_UNLOCK_TRUST}，可与你一起回家。`
        : `尚无好感度达到 ${INTIMACY_NSFW_UNLOCK_TRUST} 的偶像。`;
    }
    if (!eligible.length) {
      const empty = document.createElement("p");
      empty.className = "ai-prompt-note";
      empty.textContent = "暂无可同行对象。";
      list.appendChild(empty);
      return;
    }
    eligible.forEach((row) => {
      const profile = idols[row.name] || {};
      const button = document.createElement("button");
      button.type = "button";
      button.className = "apartment-invite-item";
      const roleLabel = row.isAssigned ? "担当偶像" : (idolSchoolClasses[row.name] || "偶像科");
      const avatarHtml = profile.avatar
        ? `<img src="${profile.avatar}" alt="" loading="lazy" decoding="async">`
        : `<span>${escapePhoneText(row.name.slice(0, 1))}</span>`;
      button.innerHTML = `<div class="apartment-invite-avatar" style="background:${profile.theme || "#c45cc4"}">${avatarHtml}</div><div class="apartment-invite-main"><strong>${escapePhoneText(row.name)}</strong><span>${roleLabel} · 好感满额</span></div><div class="apartment-invite-score"><b>${row.score}</b><span>/100</span></div>`;
      button.addEventListener("click", () => confirmApartmentGoHomeWithIdol(row.name));
      list.appendChild(button);
    });
  }

  function confirmApartmentGoHomeWithIdol(idolName) {
    const targetIdol = canonicalIdolName(idolName);
    if (!targetIdol || getFreeModeRelationshipScore(targetIdol) < INTIMACY_NSFW_UNLOCK_TRUST) {
      showToast("好感不足", `需要与偶像的好感度达到 ${INTIMACY_NSFW_UNLOCK_TRUST}。`, "warn");
      return;
    }
    closeApartmentCompanionPickOverlay();
    closeApartmentGoHomeOverlay();
    triggerWipeTransition(() => {
      enterProducerApartment({ companionIdol: targetIdol, toast: true });
    });
  }

  function handleApartmentGoHomeAlone() {
    closeApartmentGoHomeOverlay();
    triggerWipeTransition(() => {
      enterProducerApartment({ companionIdol: "", toast: true });
    });
  }

  function handleApartmentGoHomeWithIdol() {
    const eligible = getApartmentNsfwEligibleIdols();
    if (!eligible.length) {
      showToast("暂无同行对象", `需要与偶像的好感度达到 ${INTIMACY_NSFW_UNLOCK_TRUST}。`, "warn");
      return;
    }
    closeApartmentGoHomeOverlay();
    if (eligible.length === 1) {
      confirmApartmentGoHomeWithIdol(eligible[0].name);
      return;
    }
    openApartmentCompanionPickOverlay();
  }

  function goToProducerApartmentFromMap() {
    if (!isFreeModeActive() || isHybridFacilityActive()) return;
    if (isProducerApartmentActive()) return;
    openApartmentGoHomeOverlay();
  }

  function canReturnToCampusFromApartment() {
    if (!isProducerApartmentActive()) return false;
    ensureFreeModeTimeDefaults();
    return state.freeMode.clockMinutes < FREE_MODE_DAY_END_MINUTES;
  }

  function syncProducerApartmentState() {
    if (!isFreeModeActive()) return;
    if (isProducerApartmentMorning()) return;
  }

  function renderProducerApartmentStage() {
    const stage = document.getElementById("producerApartmentStage");
    if (!stage) return;
    const active = isProducerApartmentActive();
    const dayVisual = active && !isProducerApartmentNightVisual();
    const nightVisual = active && isProducerApartmentNightVisual();
    const lateNight = active && isProducerApartmentLateNight();
    stage.classList.toggle("is-hidden", !active);
    stage.classList.toggle("is-morning", dayVisual);
    stage.classList.toggle("is-evening", nightVisual);
    if (!active) return;
    const bg = document.getElementById("producerApartmentBg");
    if (bg) {
      bg.style.backgroundImage = "";
    }
    const clock = document.getElementById("producerApartmentClock");
    if (clock) clock.textContent = `${formatFreeModeDayLabel()} · ${formatFreeModeClock()}`;
    const companion = getApartmentCompanionIdol();
    const standeeBtn = document.getElementById("apartmentCompanionStandeeBtn");
    const standeeImg = document.getElementById("apartmentCompanionStandeeImg");
    const standeeLabel = document.getElementById("apartmentCompanionStandeeLabel");
    if (standeeBtn && standeeImg && standeeLabel) {
      const resolvedPortrait = companion ? resolvePortraitForSpeaker(companion) : null;
      if (companion && resolvedPortrait?.url) {
        standeeBtn.hidden = false;
        applyResolvedPortraitToImage(standeeImg, resolvedPortrait);
        standeeImg.alt = `${companion}立绘`;
        standeeLabel.textContent = companion;
      } else {
        standeeBtn.hidden = true;
        standeeImg.removeAttribute("src");
        standeeLabel.textContent = "";
      }
    }
    const hint = document.getElementById("producerApartmentHint");
    const eligible = getApartmentNsfwEligibleIdols();
    if (hint) {
      if (companion) {
        hint.textContent = `${companion} 与你一起回到了公寓。点击立绘可选择聊天或亲密。`;
      } else if (canReturnToCampusFromApartment()) {
        hint.textContent = "22:00 前还可以出门返回学园地图。整理一下后再出发吧。";
      } else if (lateNight) {
        hint.textContent = eligible.length
          ? `今天学园日程告一段落。可邀约 ${eligible.length} 名好感满额的偶像回家，或整理今日总结后休息。`
          : state.idol
            ? `今天和 ${state.idol} 的学园日程告一段落。可以看看今日总结，或上床睡觉。`
            : "今日学园活动已结束，可以整理今天的事，准备休息。";
      } else {
        hint.textContent = "公寓里很安静。可以整理一下，或等待夜色降临。";
      }
    }
    const campusBtn = document.getElementById("producerApartmentCampusBtn");
    if (campusBtn) {
      campusBtn.hidden = !canReturnToCampusFromApartment();
    }
    const sleepBtn = document.getElementById("apartmentSleepBtn");
    if (sleepBtn) sleepBtn.hidden = !lateNight;
    const inviteBtn = document.getElementById("apartmentInviteBtn");
    if (inviteBtn) {
      inviteBtn.hidden = !lateNight;
      if (lateNight) {
        inviteBtn.disabled = eligible.length === 0;
        inviteBtn.title = eligible.length
          ? "邀约好感度达到 100 的偶像来公寓"
          : `尚无好感度达到 ${INTIMACY_NSFW_UNLOCK_TRUST} 的偶像`;
      }
    }
  }

  function renderApartmentInviteList() {
    const list = document.getElementById("apartmentInviteList");
    const note = document.getElementById("apartmentInviteNote");
    if (!list) return;
    const eligible = getApartmentNsfwEligibleIdols();
    list.innerHTML = "";
    if (note) {
      note.textContent = eligible.length
        ? `以下偶像对你的好感度已达 ${INTIMACY_NSFW_UNLOCK_TRUST}。选中后将进入公寓 NSFW 多轮剧情。`
        : `尚无好感度达到 ${INTIMACY_NSFW_UNLOCK_TRUST} 的偶像。继续提升关系后再来邀约。`;
    }
    if (!eligible.length) {
      const empty = document.createElement("p");
      empty.className = "ai-prompt-note";
      empty.textContent = "暂无可邀约对象。";
      list.appendChild(empty);
      return;
    }
    eligible.forEach((row) => {
      const profile = idols[row.name] || {};
      const button = document.createElement("button");
      button.type = "button";
      button.className = "apartment-invite-item";
      const roleLabel = row.isAssigned ? "担当偶像" : (idolSchoolClasses[row.name] || "偶像科");
      const avatarHtml = profile.avatar
        ? `<img src="${profile.avatar}" alt="" loading="lazy" decoding="async">`
        : `<span>${escapePhoneText(row.name.slice(0, 1))}</span>`;
      button.innerHTML = `<div class="apartment-invite-avatar" style="background:${profile.theme || "#c45cc4"}">${avatarHtml}</div><div class="apartment-invite-main"><strong>${escapePhoneText(row.name)}</strong><span>${roleLabel} · 好感满额</span></div><div class="apartment-invite-score"><b>${row.score}</b><span>/100</span></div>`;
      button.addEventListener("click", () => startApartmentNsfwInvite(row.name));
      list.appendChild(button);
    });
  }

  function openApartmentInviteOverlay() {
    if (!isProducerApartmentActive()) {
      showToast("尚未回公寓", "22:00 后回到制作人公寓才能邀约回家。", "warn");
      return;
    }
    const eligible = getApartmentNsfwEligibleIdols();
    if (!eligible.length) {
      showToast("暂无可邀约对象", `需要与偶像的好感度达到 ${INTIMACY_NSFW_UNLOCK_TRUST}。`, "warn");
      return;
    }
    const badge = document.getElementById("apartmentInvitePhaseBadge");
    if (badge) badge.textContent = `${formatFreeModeDayLabel()} · ${formatFreeModeClock()}`;
    renderApartmentInviteList();
    setElementHidden("apartmentInviteOverlay", false);
  }

  function closeApartmentInviteOverlay() {
    setElementHidden("apartmentInviteOverlay", true);
  }

  function startApartmentNsfwInvite(idolName) {
    const targetIdol = canonicalIdolName(idolName);
    if (!targetIdol || !idols[targetIdol]) {
      showToast("无效偶像", "请选择可邀约的偶像。", "warn");
      return;
    }
    if (!isProducerApartmentActive()) {
      showToast("尚未回公寓", "22:00 后回到制作人公寓才能邀约回家。", "warn");
      return;
    }
    if (getFreeModeRelationshipScore(targetIdol) < INTIMACY_NSFW_UNLOCK_TRUST) {
      showToast("好感不足", `与 ${targetIdol} 的好感度需达到 ${INTIMACY_NSFW_UNLOCK_TRUST}。`, "warn");
      return;
    }
    closeApartmentInviteOverlay();
    const actionContext = {
      apartmentInvite: true,
      inviteIdol: targetIdol,
      intimacyMode: "nsfw"
    };
    state.pendingActionContext = {
      action: "intimacy",
      attribute: null,
      intimacyMode: "nsfw",
      actionContext
    };
    state.intimacyRoute = "nsfw";
    state.eventMode = "choice_prompt";
    state.choiceStep = 1;
    state.pendingChoiceRewards = [0, 0, 0, 0];
    state.pendingOptionTexts = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    const actionName = nsfwIntimacyActionTitle();
    const requestId = createRequestId();
    pendingAiRequestId = requestId;
    const prompt = buildNsfwIntimacyOpeningPrompt(actionContext);
    const resultSummary = `邀请 ${targetIdol} 来制作人公寓 · NSFW 亲密`;
    const story = `正在等待 ${targetIdol} 来到制作人公寓...`;
    state.lastStory = story;
    state.lastPrompt = prompt;
    state.lastDebug = "公寓邀约 NSFW：等待 AI 生成开场剧情与 4 个选项（含自定义/结束入口）。";
    appendEveningJournalActivity("公寓邀约", `邀请 ${targetIdol} 回家`);
    saveState();
    render();
    setElementHidden("eventChoices", true);
    const actionsEl = document.getElementById("eventActions");
    if (actionsEl) actionsEl.style.display = "none";
    openEventOverlay(actionName, buildAiWaitingResult(resultSummary), buildAiWaitingStory(story));
    if (!requestHostPromptSend(prompt, requestId)) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制提示词后手动发送。");
    }
    showToast("已发出邀约", `正在等待 ${targetIdol} 来到公寓...`, "info");
  }

  function sleepFromProducerApartment() {
    if (!isProducerApartmentEvening()) return;
    triggerWipeTransition(() => {
      advanceFreeModeToNextDay({ stayAtApartment: true });
      render();
      showToast("晚安", `${formatFreeModeDayLabel()} ${formatFreeModeClock()}，该起床了。`, "info");
    });
  }

  function leaveProducerApartmentForCampus() {
    if (!canReturnToCampusFromApartment()) {
      showToast("夜深了", "22:00 后无法返回学园，请休息或整理今日总结。", "warn");
      return;
    }
    triggerWipeTransition(() => {
      state.freeMode.atApartment = false;
      setApartmentCompanionIdol("");
      saveState();
      render();
      showToast("出门", "返回初星学园大地图。", "info");
    });
  }

  function openApartmentCompanionActionOverlay() {
    const companion = getApartmentCompanionIdol();
    if (!companion) {
      showToast("没有同行偶像", "当前没有与你一起回家的偶像。", "warn");
      return;
    }
    const title = document.getElementById("apartmentCompanionActionTitle");
    if (title) title.textContent = `与 ${companion} 互动`;
    setElementHidden("apartmentCompanionActionOverlay", false);
  }

  function closeApartmentCompanionActionOverlay() {
    setElementHidden("apartmentCompanionActionOverlay", true);
  }

  function startApartmentCompanionChatFlow() {
    const companion = getApartmentCompanionIdol();
    if (!companion) return;
    closeApartmentCompanionActionOverlay();
    state.freeMode.apartmentPendingChatIdol = companion;
    const badge = document.getElementById("companionPhaseBadge");
    if (badge) badge.textContent = `${formatFreeModeDayLabel()} · ${formatFreeModeClock()}`;
    const textarea = document.getElementById("companionTopicTextarea");
    if (textarea) {
      textarea.value = "";
      textarea.placeholder = `例如：聊聊今天和 ${companion} 在学园发生的事`;
    }
    setElementHidden("companionOverlay", false);
  }

  function startApartmentCompanionIntimacyFlow() {
    const companion = getApartmentCompanionIdol();
    if (!companion) return;
    if (getFreeModeRelationshipScore(companion) < INTIMACY_NSFW_UNLOCK_TRUST) {
      showToast("好感不足", `与 ${companion} 的好感度需达到 ${INTIMACY_NSFW_UNLOCK_TRUST}。`, "warn");
      return;
    }
    closeApartmentCompanionActionOverlay();
    startApartmentNsfwInvite(companion);
  }

  function buildApartmentCompanionChatPrompt(idolName, topic, options = {}) {
    const { continuation = false } = options;
    const producerAction = String(options.producerAction || "").trim().slice(0, 200);
    const targetIdol = canonicalIdolName(idolName);
    const profile = idols[targetIdol] || {};
    const dayTimeLabel = `${formatFreeModeDayLabel()} · ${formatFreeModeClock()}`;
    const sceneLine = state.freeMode.clockMinutes >= FREE_MODE_MAP_NIGHT_START_MINUTES
      ? "夜间公寓，室内灯光柔和，氛围比校园更私密。"
      : "白天公寓，室内明亮安静。";
    const sceneInstruction = continuation
      ? `请承接下文摘要，写制作人与 ${targetIdol} 在公寓内继续聊天的下一轮场景，并设计 4 个新的制作人回应选项。
- 不要重复已经发生过的事件；从当前时间点自然续写。
- 上文摘要（仅供衔接，不要原文复述）：
${summarizeMapExploreContext()}${producerAction ? `
- 制作人本轮自定义输入：${producerAction}
- 必须优先回应这次输入，再自然推进对话并给出下一组选项。` : ""}`
      : `请写制作人与 ${targetIdol} 一起回到公寓后，围绕指定话题聊天的开场，并设计 4 个不同的制作人回应选项。`;
    return `[初星育成系统：制作人公寓 · 同行聊天]

同行偶像：${targetIdol}
${getAffinityStageLine(targetIdol, getFreeModeRelationshipScore(targetIdol))}（当前好感度：${getFreeModeRelationshipScore(targetIdol)}/100）
担当偶像：${state.idol || "未登记"}
绑定角色卡：${state.boundCharacter?.name || "未绑定，按角色写"}
当前时间：${dayTimeLabel}
地点：制作人私人公寓
${sceneLine}

制作人想聊的话题：
${topic}

${buildProducerPromptSection()}

${sceneInstruction}
- 这是 First Live 后的学园自由模式，不是育成日程轮次。
- 两人已经一起回到家，氛围私密但仍以日常聊天为主。
- 角色基调：${profile.styles?.companion || profile.styles?.rest || ""}
- 不要写选项被选中后的收尾，只写到等待制作人选择。

${galgameRenderContract("choice")}
${buildChoiceHardRules({ phase1: true })}`;
  }

  function beginApartmentCompanionChat(idolName, topic) {
    const targetIdol = canonicalIdolName(idolName);
    if (!targetIdol || !idols[targetIdol]) return;
    const prompt = buildApartmentCompanionChatPrompt(targetIdol, topic);
    state.pendingActionContext = {
      action: "apartment_companion",
      actionContext: {
        mode: "chat",
        companionIdol: targetIdol,
        companionTopic: topic
      }
    };
    state.eventMode = "choice_prompt";
    state.choiceStep = 1;
    state.pendingChoiceRewards = [0, 0, 0, 0];
    state.pendingOptionTexts = [];
    state.pendingOptionMinutes = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    const requestId = createRequestId();
    pendingAiRequestId = requestId;
    state.lastPrompt = prompt;
    state.lastStory = `正在公寓与 ${targetIdol} 聊天...`;
    state.lastDebug = `公寓聊天：${targetIdol} · ${topic}`;
    appendEveningJournalActivity("公寓聊天", `与 ${targetIdol} 聊天 · ${topic}`);
    saveState();
    render();
    setElementHidden("eventChoices", true);
    const actionsEl = document.getElementById("eventActions");
    if (actionsEl) actionsEl.style.display = "none";
    openEventOverlay(`公寓 · ${targetIdol}`, buildAiWaitingResult(`公寓聊天：${topic}`), buildAiWaitingStory(`正在等待与 ${targetIdol} 的公寓聊天剧情...`));
    if (!requestHostPromptSend(prompt, requestId)) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制公寓聊天提示词后手动发送。");
    }
  }

  function closeApartmentCompanionSession() {
    pendingAiRequestId = "";
    state.pendingActionContext = null;
    state.eventMode = "none";
    state.choiceStep = 0;
    state.pendingOptionTexts = [];
    state.pendingOptionMinutes = [];
    state.pendingChoiceRewards = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    closeVnChoicesOverlay();
    hideVnCustomChoicePanel();
    setElementHidden("eventChoices", true);
    setElementHidden("eventOverlay", true);
    stopVnAuto();
    saveState();
    render();
  }

  function requestNextApartmentCompanionOptions(producerAction = "") {
    const actionContext = state.pendingActionContext?.actionContext || {};
    const targetIdol = actionContext.companionIdol;
    const topic = actionContext.companionTopic || "日常闲聊";
    const prompt = buildApartmentCompanionChatPrompt(targetIdol, topic, { continuation: true, producerAction });
    const requestId = createRequestId();
    pendingAiRequestId = requestId;
    state.lastPrompt = prompt;
    state.lastDebug = `公寓聊天：${targetIdol}，等待下一轮选项。`;
    saveState();
    render();
    setEventActionsEnabled(false, true);
    setElementHidden("eventChoices", true);
    openEventOverlay(
      `公寓 · ${targetIdol}`,
      "正在等待 AI 生成本轮聊天选项",
      buildAiWaitingStory(`正在等待与 ${targetIdol} 的下一轮公寓聊天选项...`)
    );
    if (!requestHostPromptSend(prompt, requestId)) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制公寓聊天提示词后手动发送。");
    }
  }

  function handleApartmentCompanionChoiceSelection(index) {
    const actionContext = state.pendingActionContext?.actionContext || {};
    const targetIdol = actionContext.companionIdol;
    const chosenOptionText = state.pendingOptionTexts[index] || "选择该选项";
    const chosenMinutes = 10;
    advanceFreeModeTime(chosenMinutes);
    const chosenLine = `<narration>▶ 制作人的选择：${chosenOptionText}</narration>`;
    state.lastStory = state.lastStory ? `${state.lastStory}\n\n${chosenLine}` : chosenLine;
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    state.pendingOptionTexts = [];
    state.pendingOptionMinutes = [];
    state.eventMode = "choice_prompt";
    state.choiceStep = 1;
    state.lastDebug = `公寓聊天：与 ${targetIdol} 已选择行动，时间 +${chosenMinutes} 分钟。`;
    appendEveningJournalActivity("公寓聊天", `与 ${targetIdol} · ${chosenOptionText}`);
    saveState();
    scanStorytellerNotificationAtCheckpoint("time_advance", { locationId: "producer_apartment" });
    render();
    renderProducerApartmentStage();
    closeVnChoicesOverlay();
    requestNextApartmentCompanionOptions();
  }

  function handleApartmentCompanionCustomChoice(rawText) {
    const producerAction = String(rawText || "").trim();
    if (!producerAction) {
      showToast("还没有内容", "请输入想说的话或想做的动作。", "warn");
      return;
    }
    const actionContext = state.pendingActionContext?.actionContext || {};
    const targetIdol = actionContext.companionIdol;
    const chosenMinutes = 10;
    advanceFreeModeTime(chosenMinutes);
    const chosenLine = `<narration>▶ 制作人的自定义输入：${producerAction}</narration>`;
    state.lastStory = state.lastStory ? `${state.lastStory}\n\n${chosenLine}` : chosenLine;
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    state.pendingOptionTexts = [];
    state.pendingOptionMinutes = [];
    state.eventMode = "choice_prompt";
    state.choiceStep = 1;
    state.lastDebug = `公寓聊天：向 ${targetIdol} 发送自定义输入，时间 +${chosenMinutes} 分钟。`;
    appendEveningJournalActivity("公寓聊天", `与 ${targetIdol} · 自定义：${producerAction}`);
    saveState();
    scanStorytellerNotificationAtCheckpoint("time_advance", { locationId: "producer_apartment" });
    render();
    renderProducerApartmentStage();
    closeVnChoicesOverlay();
    requestNextApartmentCompanionOptions(producerAction);
  }

  function appendApartmentCompanionControlButtons(container) {
    const backBtn = document.createElement("button");
    backBtn.className = "vn-choice-btn vn-choice-btn-map-back";
    backBtn.type = "button";
    backBtn.textContent = "返回公寓";
    backBtn.onclick = () => closeApartmentCompanionSession();
    container.appendChild(backBtn);
  }

  function isFreeModeTravelAllowed() {
    if (worldMapLayoutState.editorActive) return true;
    if (isEveningGoHomeActive()) return false;
    ensureFreeModeTimeDefaults();
    return state.freeMode.clockMinutes < getFreeModeTravelEndMinutes();
  }

  function rollFreeModePresenceLegacy(force = false) {
    ensureFreeModeTimeDefaults();
    const slotKey = getFreeModePresenceSlotKey();
    if (!force && state.freeMode.presenceSlotKey === slotKey) return;
    state.freeMode.presenceSlotKey = slotKey;
    state.freeMode.presence = {};
    Object.keys(idols).forEach((idolName) => {
      if (Math.random() >= FREE_MODE_PRESENCE_CHANCE) return;
      const location = WORLD_MAP_LOCATIONS[Math.floor(Math.random() * WORLD_MAP_LOCATIONS.length)];
      if (!location) return;
      state.freeMode.presence[idolName] = location.id;
    });
  }

  function rollFreeModePresence(force = false) {
    refreshWorldPresenceFromRules(force);
  }

  function getIdolsPresentAtLocation(locationId) {
    ensureFreeModeTimeDefaults();
    return Object.entries(state.freeMode.presence || {})
      .filter(([, locId]) => locId === locationId)
      .map(([idolName]) => idolName);
  }

  function getResidentNpcsAtLocation(locationId) {
    return Object.entries(residentNpcProfiles)
      .filter(([, profile]) => profile.locationId === locationId)
      .map(([name, profile]) => ({ name, ...profile }));
  }

  function advanceFreeModeToNextDay(options = {}) {
    ensureFreeModeTimeDefaults();
    state.freeMode.postLiveDay += 1;
    activateStorytellerStyleMixForDay(getWorldFeedDayKey());
    state.freeMode.clockMinutes = FREE_MODE_DAY_START_MINUTES;
    state.freeMode.eveningJournal = null;
    state.freeMode.atApartment = Boolean(options.stayAtApartment);
    if (!options.stayAtApartment) {
      state.freeMode.apartmentCompanionIdol = "";
    }
    state.freeMode.eveningStayExtended = false;
    state.freeMode.eveningGoHomeDeferred = false;
    if (globalThis.HatsuTasks?.isSandboxTasksActive(state)) {
      globalThis.HatsuTasks.syncCampusDay(state);
      globalThis.HatsuTasks.syncSideQuestDay(state);
      maybeRequestSideQuestGeneration();
    }
    const worldTickMode = runFreeModeWorldDailyTick();
    if (worldTickMode !== "secondary" && typeof ensureStorytellerPlanForCheckpoint === "function") {
      ensureStorytellerPlanForCheckpoint("day_change");
    }
    prepareWorldDirectorJob("day_change", { persist: false });
    closeFreeModeTimeOverlay();
    saveState();
    render();
    showToast("新的一天", `${formatFreeModeDayLabel()} ${formatFreeModeClock()} 开始。`, "info");
    maybeRequestWorldDirector({ reason: "day_change" });
  }

  function parseFreeModeManualAdvanceMinutes(raw) {
    const cleaned = String(raw ?? "").trim().replace(/分钟|min|小时|hour|h/gi, "");
    const num = Number.parseInt(cleaned, 10);
    if (!Number.isFinite(num) || num <= 0) return null;
    const daySpan = getFreeModeTravelEndMinutes() - FREE_MODE_DAY_START_MINUTES;
    return clamp(num, 1, daySpan);
  }

  function updateFreeModeTimeOverlayUI() {
    const current = document.getElementById("freeModeTimeCurrent");
    if (!current) return;
    ensureFreeModeTimeDefaults();
    const travelAllowed = isFreeModeTravelAllowed();
    const hint = document.getElementById("freeModeTimeHint");
    const dayBtn = document.getElementById("freeModeAdvanceDayBtn");
    const advanceBtn = document.getElementById("freeModeTimeAdvanceBtn");
    const input = document.getElementById("freeModeTimeAdvanceInput");
    current.textContent = `${formatFreeModeDayLabel()} · ${formatFreeModeClock()}`;
    if (hint) {
      const endLabel = state.freeMode.eveningStayExtended ? "23:00" : "22:00";
      hint.textContent = travelAllowed
        ? `输入分钟数可将时间推进至 ${endLabel}。`
        : isEveningGoHomeActive()
          ? "请先完成今晚安排的选择。"
          : "今日活动已结束，可点击下方进入下一天。";
    }
    if (dayBtn) dayBtn.hidden = travelAllowed;
    if (advanceBtn) advanceBtn.disabled = !travelAllowed;
    if (input) input.disabled = !travelAllowed;
    document.querySelectorAll(".free-mode-time-quick-btn").forEach((button) => {
      button.disabled = !travelAllowed;
    });
  }

  function openFreeModeTimeOverlay() {
    if (!isFreeModeActive()) return;
    setElementHidden("freeModeTimeOverlay", false);
    updateFreeModeTimeOverlayUI();
    const input = document.getElementById("freeModeTimeAdvanceInput");
    if (input) {
      input.value = "";
      input.focus();
    }
  }

  function closeFreeModeTimeOverlay() {
    setElementHidden("freeModeTimeOverlay", true);
  }

  function applyFreeModeManualTimeAdvance(minutes) {
    if (!isFreeModeActive()) return;
    if (!isFreeModeTravelAllowed()) {
      showToast("今日已结束", "请进入下一天。", "warn");
      updateFreeModeTimeOverlayUI();
      return;
    }
    if (isMapLocationExploreActive()) {
      showToast("请先返回地图", "地点探索中无法手动推进时间。", "warn");
      return;
    }
    const parsed = parseFreeModeManualAdvanceMinutes(minutes);
    if (!parsed) {
      showToast("请输入时间", "请填写有效的分钟数。", "warn");
      return;
    }
    ensureFreeModeTimeDefaults();
    const remaining = getFreeModeTravelEndMinutes() - state.freeMode.clockMinutes;
    if (remaining <= 0) {
      showToast("今日已结束", "请进入下一天。", "warn");
      updateFreeModeTimeOverlayUI();
      return;
    }
    const toAdvance = Math.min(parsed, remaining);
    const result = advanceFreeModeTime(toAdvance);
    saveState();
    scanStorytellerNotificationAtCheckpoint("time_advance", { locationId: state.freeMode?.activeLocationId });
    renderFreeModeStage();
    renderProducerApartmentStage();
    updateFreeModeTimeOverlayUI();
    showToast("时间推进", `已推进 ${toAdvance} 分钟，当前 ${formatFreeModeClock()}。`, "info");
    if (result.hitDayEnd) {
      maybeTriggerEveningGoHomePrompt();
    }
  }

  function submitFreeModeManualTimeAdvance() {
    const input = document.getElementById("freeModeTimeAdvanceInput");
    applyFreeModeManualTimeAdvance(input?.value);
  }

  function handleFreeModeAdvanceDay() {
    if (!isFreeModeActive()) return;
    if (isMapLocationExploreActive()) {
      showToast("请先返回地图", "地点探索中无法进入下一天。", "warn");
      return;
    }
    advanceFreeModeToNextDay();
  }

  function advanceFreeModeTime(minutes = FREE_MODE_MAP_CHOICE_MINUTES) {
    ensureFreeModeTimeDefaults();
    const endCap = getFreeModeTravelEndMinutes();
    const next = state.freeMode.clockMinutes + minutes;
    if (next >= endCap) {
      state.freeMode.clockMinutes = endCap;
      rollFreeModePresence(true);
      maybeTriggerEveningGoHomePrompt();
      return { hitDayEnd: true };
    }
    state.freeMode.clockMinutes = next;
    rollFreeModePresence(true);
    return { hitDayEnd: false };
  }

  function parseMapOptionMinutes(raw) {
    const cleaned = String(raw || "").trim().replace(/分钟|min/gi, "");
    const num = Number.parseInt(cleaned, 10);
    if (!Number.isFinite(num) || num <= 0) return null;
    return clamp(num, 1, FREE_MODE_MAP_MINUTES_MAX);
  }

  function resolveMapOptionMinutes(rawMinutes) {
    return parseMapOptionMinutes(rawMinutes) ?? FREE_MODE_MAP_CHOICE_MINUTES;
  }

  function syncMapOptionMinutesFromPayload(payload) {
    if (state.pendingActionContext?.action !== "map_location") {
      state.pendingOptionMinutes = [];
      return;
    }
    const minutes = Array.isArray(payload?.optionMinutes) ? payload.optionMinutes.slice(0, 4) : [];
    while (minutes.length < 4) minutes.push(null);
    state.pendingOptionMinutes = minutes;
  }

  function returnToFreeModeMap(options = {}) {
    const { cancelled = false } = options;
    pendingAiRequestId = "";
    state.eventMode = "none";
    state.choiceStep = 0;
    state.pendingActionContext = null;
    state.pendingOptionTexts = [];
    state.pendingOptionMinutes = [];
    state.pendingChoiceRewards = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    if (state.freeMode) {
      state.freeMode.activeLocationId = null;
      state.freeMode.activeOutingDestination = null;
      state.freeMode.facilityKind = null;
      state.freeMode.facilityLocationId = null;
    }
    closeVnChoicesOverlay();
    hideVnCustomChoicePanel();
    setElementHidden("eventChoices", true);
    setElementHidden("eventOverlay", true);
    stopVnAuto();
    if (!cancelled) {
      saveState();
    }
    render();
    if (isFreeModeActive()) {
      renderFreeModeStage();
    }
    flushEveningGoHomeDeferred();
  }

  function getMapExploreReturnTarget(actionContext = state.pendingActionContext?.actionContext || {}) {
    return actionContext?.returnTarget || null;
  }

  function getMapExploreReturnLabel(actionContext = state.pendingActionContext?.actionContext || {}) {
    const target = getMapExploreReturnTarget(actionContext);
    if (target?.type === "outing_scene") {
      const venue = getFreeModeOutingVenue(target.venueId || actionContext.outingVenueId);
      return venue ? `返回${venue.name}` : "返回场景";
    }
    return "返回地图";
  }

  function returnToFreeModeOutingScene(returnTarget = {}, options = {}) {
    const target = returnTarget || {};
    const venue = getFreeModeOutingVenue(target.venueId);
    if (!venue) {
      returnToFreeModeMap(options);
      return;
    }
    const facility = getFreeModeOutingFacility(venue.id, target.facilityId);
    const visitMode = target.visitMode === "alone" ? "alone" : "with_idol";
    const selectedIdol = target.selectedIdol || canonicalIdolName(state.idol) || state.idol || "";
    pendingAiRequestId = "";
    state.eventMode = "none";
    state.choiceStep = 0;
    state.pendingActionContext = null;
    state.pendingOptionTexts = [];
    state.pendingOptionMinutes = [];
    state.pendingChoiceRewards = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    if (!state.freeMode) state.freeMode = {};
    state.freeMode.activeLocationId = FREE_MODE_OUTING_LOCATION_ID;
    state.freeMode.activeOutingDestination = venue.name;
    state.freeMode.facilityKind = null;
    state.freeMode.facilityLocationId = null;
    state.freeMode.outingScene = {
      venueId: venue.id,
      facilityId: facility?.id || venue.entranceFacilityId,
      visitMode,
      selectedIdol
    };
    closeVnChoicesOverlay();
    hideVnCustomChoicePanel();
    setElementHidden("eventChoices", true);
    setElementHidden("eventOverlay", true);
    stopVnAuto();
    if (!options.cancelled) {
      saveState();
    }
    render();
    if (isFreeModeActive()) {
      renderFreeModeStage();
    }
    openFreeModeOutingScene(venue.id, visitMode, {
      facilityId: facility?.id || venue.entranceFacilityId,
      selectedIdol
    });
  }

  function returnToFreeModeExploreOrigin(options = {}) {
    const target = options.returnTarget || getMapExploreReturnTarget();
    if (target?.type === "outing_scene") {
      returnToFreeModeOutingScene(target, options);
      return;
    }
    returnToFreeModeMap(options);
  }

  function handleMapLocationReturn() {
    if (!isMapLocationExploreActive()) {
      returnToFreeModeMap({ cancelled: true });
      return;
    }
    if (state.eventMode === "choice_resolution" && pendingAiRequestId) return;
    const actionContext = state.pendingActionContext?.actionContext || {};
    const locationId = actionContext.locationId;
    const location = resolveMapExploreLocation(locationId, actionContext);
    if (!locationId || !location) {
      returnToFreeModeMap({ cancelled: true });
      return;
    }
    closeVnChoicesOverlay();
    const returnTarget = getMapExploreReturnTarget(actionContext);
    const returnLabel = getMapExploreReturnLabel(actionContext);
    const leaveLine = `<narration>▶ 制作人决定离开 ${location.name}，${returnLabel}。</narration>`;
    state.pendingActionContext.actionContext = { ...actionContext, isReturn: true, returnTarget };
    state.selectedChoiceText = returnLabel;
    state.selectedChoiceRating = returnTarget?.type === "outing_scene" ? "【返回外出场景】" : "【离开地点】";
    state.eventMode = "choice_resolution";
    state.choiceStep = 2;
    state.pendingOptionTexts = [];
    const requestId = createRequestId();
    pendingAiRequestId = requestId;
    state.lastPrompt = getMapExploreReturnPrompt(locationId);
    state.lastDebug = `自由模式：${location.name} ${returnLabel}，等待离开描写。`;
    state.lastStory = state.lastStory ? `${state.lastStory}\n\n${leaveLine}` : leaveLine;
    saveState();
    render();
    setEventActionsEnabled(false, true);
    setElementHidden("eventChoices", true);
    openEventOverlay(`${location.name} · 离开`, `正在生成${returnLabel}的简短描写...`, buildChoicePendingDisplayStory("", leaveLine));
    if (!requestHostPromptSend(state.lastPrompt, requestId)) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请复制离开地点提示词后手动发送。");
    }
  }

  function startMapLocationExplore(locationId, visitMode = "with_idol") {
    if (!isFreeModeActive()) return;
    if (worldMapLayoutState.editorActive) return;
    if (!isFreeModeTravelAllowed()) {
      showToast("今日已不能外出", "22:00 后地图地点不可进入，点击右上角时间开始新的一天。", "warn");
      return;
    }
    const location = getWorldMapLocation(locationId);
    if (!location) return;
    beginMapLocationExploreSession({
      locationId,
      locationName: location.name,
      visitMode,
      isOffCampus: false
    });
  }

  function startFreeModeOuting(destination, visitMode = "with_idol") {
    if (!isFreeModeActive()) return;
    if (worldMapLayoutState.editorActive) return;
    if (!isFreeModeTravelAllowed()) {
      showToast("今日已不能外出", "22:00 后无法离开学园，点击右上角时间开始新的一天。", "warn");
      return;
    }
    const locationName = String(destination || "").trim();
    if (!locationName) {
      showToast("还没有地点", "请选择预设地点，或输入自定义外出地点。", "warn");
      return;
    }
    beginMapLocationExploreSession({
      locationId: FREE_MODE_OUTING_LOCATION_ID,
      locationName,
      outingDestination: locationName,
      visitMode,
      isOffCampus: true
    });
  }

  function shouldUseStorytellerMapHarness(session = {}) {
    session = session && typeof session === "object" ? session : {};
    if (!isSillyTavernHost() || isSandboxScoutActive()) return false;
    if (!session.locationId || session.locationId === FREE_MODE_OUTING_LOCATION_ID || session.isOffCampus) return false;
    if (session.isReturn || session.sideQuestResolving) return false;
    if (session.sideQuestSlotIndex !== undefined && session.sideQuestSlotIndex !== null) return false;
    return true;
  }

  function prepareMapExploreDispatch(stepKind, details = {}) {
    details = details && typeof details === "object" ? details : {};
    const blockingOwner = getPrimaryModelChannelOwner();
    if (blockingOwner) {
      rejectPrimaryModelDispatch(blockingOwner, {
        requestId: "",
        ownerKind: "map_explore",
        reason: "channel_occupied"
      });
      return { ok: false, reason: "channel_occupied", blockingOwner };
    }
    const requestId = createRequestId();
    const previousTurn = state.harness?.activeTurn || null;
    const prepared = beginHarnessMapExploreTurn(stepKind, details);
    if (!prepared.ok) return prepared;
    const acquired = tryAcquirePrimaryModelChannel({
      requestId,
      ownerKind: "map_explore",
      turnId: prepared.turnId,
      saveScope: activeHostSaveScope,
      sessionEpoch: runtimeSessionEpoch
    });
    if (!acquired.ok) {
      if (state.harness?.activeTurn?.turnId === prepared.turnId) {
        state.harness.activeTurn = previousTurn;
      }
      rejectPrimaryModelDispatch(acquired.blockingOwner, {
        requestId,
        ownerKind: "map_explore",
        reason: acquired.reason || "channel_occupied"
      });
      return { ok: false, reason: acquired.reason || "channel_occupied", blockingOwner: acquired.blockingOwner };
    }
    return { ok: true, requestId, turnId: prepared.turnId, owner: acquired.owner };
  }

  function beginMapLocationExploreSession(session = {}) {
    const {
      locationId,
      locationName,
      outingDestination = "",
      visitMode = "with_idol",
      isOffCampus = false,
      returnTarget = null,
      ...extraActionContext
    } = session;
    const location = resolveMapExploreLocation(locationId, {
      locationName,
      outingDestination,
      visitMode,
      isOffCampus
    });
    if (!location) return;
    const normalizedVisitMode = visitMode === "alone" ? "alone" : "with_idol";
    const arrivedSideQuest = !isSandboxScoutActive() && isOffCampus ? getArrivedSideQuest(location.name) : null;
    const arrivalPresenceIds = isOffCampus
      ? []
      : [...new Set(getIdolsPresentAtLocation(locationId).map((idolName) => canonicalIdolName(idolName)).filter((idolName) => idols[idolName]))].slice(0, 8);
    const mapSession = {
      locationId,
      locationName: location.name,
      outingDestination,
      visitMode: normalizedVisitMode,
      isOffCampus,
      returnTarget,
      arrivalPresenceIds,
      ...extraActionContext,
      ...(arrivedSideQuest ? { sideQuestSlotIndex: arrivedSideQuest.slotIndex } : {})
    };
    const useStorytellerHarness = shouldUseStorytellerMapHarness(mapSession);
    const mapDispatch = useStorytellerHarness
      ? prepareMapExploreDispatch("arrival", {
          locationId,
          locationName: location.name,
          settledMinutes: FREE_MODE_MAP_ARRIVAL_MINUTES
        })
      : null;
    if (useStorytellerHarness && !mapDispatch?.ok) return;
    ensureFreeModeTimeDefaults();
    const arrivalResult = advanceFreeModeTime(FREE_MODE_MAP_ARRIVAL_MINUTES);
    if (arrivalResult.hitDayEnd) {
      if (mapDispatch?.ok) {
        markHarnessMapExploreTurn("completed_without_narrative", {
          settledPersistenceRevision: state.harness.persistenceRevision + 1
        });
        releasePrimaryModelChannel(mapDispatch.requestId, mapDispatch.owner.channelLeaseId, "completed_without_narrative");
      }
      ensureEveningJournal();
      saveState();
      renderFreeModeStage();
      maybeTriggerEveningGoHomePrompt();
      return;
    }
    ensureEveningJournal();
    state.freeMode.activeLocationId = locationId;
    state.freeMode.activeOutingDestination = isOffCampus ? locationName : null;
    state.pendingActionContext = {
      action: "map_location",
      attribute: null,
      actionContext: {
        locationId,
        locationName: location.name,
        outingDestination: isOffCampus ? locationName : "",
        visitMode: normalizedVisitMode,
        isOffCampus,
        arrivalPresenceIds,
        ...extraActionContext,
        returnTarget
      }
    };
    if (arrivedSideQuest) {
      state.pendingActionContext.actionContext = {
        ...state.pendingActionContext.actionContext,
        sideQuestSlotIndex: arrivedSideQuest.slotIndex,
        sideQuestTitle: arrivedSideQuest.title,
        sideQuestLocationName: arrivedSideQuest.locationName
      };
    }
    state.eventMode = "choice_prompt";
    state.choiceStep = 1;
    state.pendingChoiceRewards = [0, 0, 0, 0];
    state.pendingOptionTexts = [];
    state.pendingOptionMinutes = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    const requestId = mapDispatch?.requestId || createRequestId();
    pendingAiRequestId = requestId;
    const storytellerAttachment = mapDispatch?.ok
      ? attachStorytellerCandidateToMapTurn({ turnId: mapDispatch.turnId })
      : { candidate: null, reference: null };
    const prompt = getMapExplorePrompt(locationId, {
      visitMode: normalizedVisitMode,
      mapStepKind: "arrival",
      arrivalPresenceIds,
      storytellerCandidate: storytellerAttachment.candidate
    });
    const harnessPromptCapture = mapDispatch?.ok ? captureHarnessGenerationPrompt(prompt) : null;
    if (mapDispatch?.ok) {
      markHarnessMapExploreTurn("settled", {
        settledPersistenceRevision: state.harness.persistenceRevision + 1,
        storytellerCandidateRef: storytellerAttachment.reference,
        ...harnessPromptCapture
      });
      markHarnessMapExploreTurn("generating", {
        requestId,
        requestIds: appendHarnessRequestId(state.harness?.activeTurn?.requestIds, requestId)
      });
    }
    state.lastPrompt = prompt;
    const scoutActive = isSandboxScoutActive();
    const scoutTalkHere = isSandboxScoutTalkAvailable(locationId);
    const visitLabel = scoutActive
      ? "独自物色"
      : normalizedVisitMode === "alone"
        ? "独自前往"
        : "与担当同来";
    const exploreLabel = isOffCampus ? `外出 · ${location.name}` : location.name;
    appendEveningJournalActivity(
      scoutActive ? "物色搭话" : isOffCampus ? "校外外出" : "地点探索",
      `${exploreLabel} · ${visitLabel}`
    );
    state.lastStory = scoutActive
      ? `正在前往 ${location.name}，准备与 ${state.idol} 搭话...`
      : isOffCampus
        ? `正在与担当一起前往 ${location.name}（${visitLabel}）...`
        : `正在前往 ${location.name}（${visitLabel}）...`;
    state.lastDebug = scoutActive
      ? `沙盒物色搭话：${exploreLabel} · 目标 ${state.idol}，抵达 +${FREE_MODE_MAP_ARRIVAL_MINUTES} 分钟，当前 ${formatFreeModeClock()}，等待 AI 生成本次选项。`
      : `自由模式${isOffCampus ? "外出" : "地点"}探索：${exploreLabel} · ${visitLabel}，抵达 +${FREE_MODE_MAP_ARRIVAL_MINUTES} 分钟，当前 ${formatFreeModeClock()}，等待 AI 生成本次选项。`;
    saveState();
    render();
    renderFreeModeStage();
    const overlayTitle = arrivedSideQuest
      ? `${location.name} · 委托现场`
      : scoutTalkHere ? `${exploreLabel} · 物色搭话` : scoutActive ? `${exploreLabel} · 物色搭话` : `${exploreLabel} · 探索`;
    const waitingText = arrivedSideQuest
      ? `正在等待「${arrivedSideQuest.title}」的委托现场生成...`
      : `正在等待 ${exploreLabel} 的场景与选项生成...`;
    openEventOverlay(overlayTitle, "正在等待 AI 生成本次行动选项", buildAiWaitingStory(waitingText));
    const sent = mapDispatch?.ok
      ? requestHostPromptSend(prompt, requestId, {
          channelLeaseId: mapDispatch.owner.channelLeaseId,
          ownerKind: "map_explore",
          turnId: mapDispatch.turnId
        })
      : requestHostPromptSend(prompt, requestId);
    if (!sent) {
      if (mapDispatch?.ok) {
        returnHarnessRecoveryAttemptToPending(requestId, "send_failed");
        saveState("harness.map_send_failed");
        render();
        openHarnessRecoveryOverlay(state.harness.activeTurn);
      } else {
        openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制地点探索提示词后手动发送。");
      }
    }
  }

  function requestNextMapLocationOptions(mapDispatch = null, stepDetails = {}) {
    if (!isMapLocationExploreActive()) return;
    if (isSandboxScoutWrapUpPending()) return;
    if (!isFreeModeTravelAllowed()) {
      if (maybeTriggerEveningGoHomePrompt()) return;
      showToast("今日已不能外出", "时间已到，请先决定今晚的安排。", "warn");
      return;
    }
    const locationId = state.pendingActionContext?.actionContext?.locationId || state.freeMode?.activeLocationId;
    const actionContext = state.pendingActionContext?.actionContext || {};
    const location = resolveMapExploreLocation(locationId, actionContext);
    if (!locationId || !location) return;
    const visitMode = getMapLocationVisitMode();
    closeVnChoicesOverlay();
    state.freeMode.activeLocationId = locationId;
    if (isFreeModeOffCampusExplore(actionContext)) {
      state.freeMode.activeOutingDestination = actionContext.outingDestination || location.name;
    }
    state.pendingActionContext.actionContext = {
      ...actionContext,
      locationId,
      locationName: location.name,
      isReturn: false,
      visitMode
    };
    state.eventMode = "choice_prompt";
    state.choiceStep = 1;
    state.pendingChoiceRewards = [0, 0, 0, 0];
    state.pendingOptionTexts = [];
    state.pendingOptionMinutes = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    const requestId = mapDispatch?.requestId || createRequestId();
    pendingAiRequestId = requestId;
    const storytellerAttachment = mapDispatch?.ok
      ? attachStorytellerCandidateToMapTurn({ turnId: mapDispatch.turnId })
      : { candidate: null, reference: null };
    const prompt = getMapExplorePrompt(locationId, {
      continuation: true,
      visitMode,
      mapStepKind: stepDetails.stepKind,
      storytellerCandidate: storytellerAttachment.candidate
    });
    const harnessPromptCapture = mapDispatch?.ok ? captureHarnessGenerationPrompt(prompt) : null;
    if (mapDispatch?.ok) {
      markHarnessMapExploreTurn("settled", {
        settledPersistenceRevision: state.harness.persistenceRevision + 1,
        storytellerCandidateRef: storytellerAttachment.reference,
        ...harnessPromptCapture
      });
      markHarnessMapExploreTurn("generating", {
        requestId,
        requestIds: appendHarnessRequestId(state.harness?.activeTurn?.requestIds, requestId)
      });
    }
    const exploreLabel = locationId === FREE_MODE_OUTING_LOCATION_ID ? `外出 · ${location.name}` : location.name;
    state.lastPrompt = prompt;
    state.lastDebug = `自由模式${locationId === FREE_MODE_OUTING_LOCATION_ID ? "外出" : "地点"}探索：${location.name}，等待下一轮行动选项。`;
    saveState();
    render();
    setEventActionsEnabled(false, true);
    setElementHidden("eventChoices", true);
    openEventOverlay(
      `${exploreLabel} · 探索`,
      "正在等待 AI 生成本次行动选项",
      buildAiWaitingStory(`正在等待 ${exploreLabel} 的下一轮行动选项...`)
    );
    const sent = mapDispatch?.ok
      ? requestHostPromptSend(prompt, requestId, {
          channelLeaseId: mapDispatch.owner.channelLeaseId,
          ownerKind: "map_explore",
          turnId: mapDispatch.turnId
        })
      : requestHostPromptSend(prompt, requestId);
    if (!sent) {
      if (mapDispatch?.ok) {
        returnHarnessRecoveryAttemptToPending(requestId, "send_failed");
        saveState("harness.map_send_failed");
        render();
        openHarnessRecoveryOverlay(state.harness.activeTurn);
      } else {
        openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制地点探索提示词后手动发送。");
      }
    }
  }

  function handleMapLocationChoiceSelection(index) {
    const actionContext = state.pendingActionContext?.actionContext || {};
    const locationId = actionContext.locationId;
    const location = resolveMapExploreLocation(locationId, actionContext);
    const chosenOptionText = state.pendingOptionTexts[index] || "选择该选项";
    if (actionContext.sideQuestSlotIndex !== undefined && actionContext.sideQuestSlotIndex !== null) {
      handleSideQuestSceneChoice(index, chosenOptionText);
      return;
    }
    const chosenMinutes = resolveMapOptionMinutes(state.pendingOptionMinutes?.[index]);
    const useStorytellerHarness = shouldUseStorytellerMapHarness(actionContext);
    const mapDispatch = useStorytellerHarness
      ? prepareMapExploreDispatch("explore_choice", {
          locationId,
          locationName: location?.name || "",
          selectedAction: chosenOptionText,
          settledMinutes: chosenMinutes
        })
      : null;
    if (useStorytellerHarness && !mapDispatch?.ok) return;
    processSandboxMainQuestMapChoice(locationId, chosenOptionText);
    const timeResult = advanceFreeModeTime(chosenMinutes);
    const chosenLine = `<narration>▶ 制作人的选择：${chosenOptionText}</narration>`;
    state.lastStory = state.lastStory ? `${state.lastStory}\n\n${chosenLine}` : chosenLine;
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    state.pendingOptionTexts = [];
    state.pendingOptionMinutes = [];
    state.eventMode = "choice_prompt";
    state.choiceStep = 1;
    state.lastDebug = `自由模式：${location?.name || "地点探索"} 已选择行动，时间 +${chosenMinutes} 分钟，准备下一组选项。`;
    state.log.unshift({
      day: state.freeMode?.postLiveDay || 1,
      round: formatFreeModeClock(),
      phase: "自由模式",
      action: `${location?.name || "地图探索"}`,
      result: `${chosenOptionText} · +${chosenMinutes}分 · ${formatFreeModeClock()}`
    });
    state.log = state.log.slice(0, 24);
    saveState();
    render();
    renderFreeModeStage();
    closeVnChoicesOverlay();
    if (timeResult.hitDayEnd) {
      if (mapDispatch?.ok) {
        markHarnessMapExploreTurn("completed_without_narrative", {
          settledPersistenceRevision: state.harness.persistenceRevision
        });
        releasePrimaryModelChannel(mapDispatch.requestId, mapDispatch.owner.channelLeaseId, "completed_without_narrative");
      }
      returnToFreeModeMap();
      return;
    }
    if (!isFreeModeTravelAllowed()) {
      if (mapDispatch?.ok) {
        markHarnessMapExploreTurn("completed_without_narrative", {
          settledPersistenceRevision: state.harness.persistenceRevision
        });
        releasePrimaryModelChannel(mapDispatch.requestId, mapDispatch.owner.channelLeaseId, "completed_without_narrative");
      }
      if (maybeTriggerEveningGoHomePrompt()) return;
      returnToFreeModeMap();
      return;
    }
    requestNextMapLocationOptions(mapDispatch, {
      stepKind: "explore_choice",
      selectedAction: chosenOptionText,
      settledMinutes: chosenMinutes
    });
  }

  function handleSideQuestSceneChoice(index, chosenOptionText) {
    const actionContext = state.pendingActionContext?.actionContext || {};
    const slotIndex = Number(actionContext.sideQuestSlotIndex);
    const slot = state.tasks?.side?.slots?.[slotIndex];
    if (!slot || slot.status === "done") {
      showToast("委托不可用", "该委托已完成或已刷新。", "warn");
      return;
    }
    const tier = getSideQuestTierForChoice(index);
    const result = globalThis.HatsuTasks?.applySideQuestTier(state, slotIndex, tier);
    if (!result?.ok) {
      showToast("委托结算失败", result?.reason || "无法完成该委托。", "warn");
      return;
    }
    const pool = getSideQuestPoolApi();
    const tierLabel = pool?.SIDE_TIER_META?.[tier]?.label || tier;
    appendEveningJournalTask("商业委托", slot.title ? `${slot.title} · ${tierLabel}` : tierLabel);
    const chosenLine = `<narration>▶ 制作人的现场行动：${chosenOptionText}</narration>`;
    const requestId = createRequestId();
    pendingAiRequestId = requestId;
    state.selectedChoiceText = chosenOptionText;
    state.selectedChoiceRating = "委托现场";
    state.pendingOptionTexts = [];
    state.pendingOptionMinutes = [];
    state.eventMode = "choice_resolution";
    state.choiceStep = 2;
    state.pendingActionContext.actionContext = {
      ...actionContext,
      sideQuestResolving: true,
      sideQuestResultTier: tier
    };
    state.lastPrompt = buildSideQuestResultPrompt(result.slot || slot, tier, chosenOptionText);
    state.lastDebug = `委托现场：${slot.title} 已选择行动，等待 AI 生成收尾。`;
    state.lastStory = state.lastStory ? `${state.lastStory}\n\n${chosenLine}` : chosenLine;
    saveState();
    processSandboxQuestAfterSettlement();
    render();
    renderFreeModeStage();
    closeVnChoicesOverlay();
    setEventActionsEnabled(false, true);
    setElementHidden("eventChoices", true);
    openEventOverlay(`${slot.locationName || "委托地点"} · 委托收尾`, "正在生成委托收尾剧情...", buildChoicePendingDisplayStory("", chosenLine));
    if (!requestHostPromptSend(state.lastPrompt, requestId)) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请复制委托收尾提示词后手动发送。");
    }
  }

  function handleMapLocationCustomChoice(rawText) {
    const producerAction = String(rawText || "").trim();
    if (!producerAction) {
      showToast("还没有内容", "请输入本次自定义行动。", "warn");
      return;
    }
    const actionContext = state.pendingActionContext?.actionContext || {};
    const locationId = actionContext.locationId;
    const location = resolveMapExploreLocation(locationId, actionContext);
    const chosenMinutes = FREE_MODE_MAP_CHOICE_MINUTES;
    const useStorytellerHarness = shouldUseStorytellerMapHarness(actionContext);
    const mapDispatch = useStorytellerHarness
      ? prepareMapExploreDispatch("custom_choice", {
          locationId,
          locationName: location?.name || "",
          selectedAction: producerAction,
          settledMinutes: chosenMinutes
        })
      : null;
    if (useStorytellerHarness && !mapDispatch?.ok) return;
    processSandboxMainQuestMapChoice(locationId, producerAction);
    const timeResult = advanceFreeModeTime(chosenMinutes);
    const chosenLine = `<narration>▶ 制作人的选择：${producerAction}</narration>`;
    state.lastStory = state.lastStory ? `${state.lastStory}\n\n${chosenLine}` : chosenLine;
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    state.pendingOptionTexts = [];
    state.pendingOptionMinutes = [];
    state.eventMode = "choice_prompt";
    state.choiceStep = 1;
    state.lastDebug = `自由模式：${location?.name || "地点探索"} 已发送自定义行动“${producerAction}”，时间 +${chosenMinutes} 分钟，准备下一组选项。`;
    state.log.unshift({
      day: state.freeMode?.postLiveDay || 1,
      round: formatFreeModeClock(),
      phase: "自由模式",
      action: `${location?.name || "地图探索"}`,
      result: `自定义：${producerAction} · +${chosenMinutes}分 · ${formatFreeModeClock()}`
    });
    state.log = state.log.slice(0, 24);
    saveState();
    render();
    renderFreeModeStage();
    closeVnChoicesOverlay();
    if (timeResult.hitDayEnd) {
      if (mapDispatch?.ok) {
        markHarnessMapExploreTurn("completed_without_narrative", {
          settledPersistenceRevision: state.harness.persistenceRevision
        });
        releasePrimaryModelChannel(mapDispatch.requestId, mapDispatch.owner.channelLeaseId, "completed_without_narrative");
      }
      returnToFreeModeMap();
      return;
    }
    if (!isFreeModeTravelAllowed()) {
      if (mapDispatch?.ok) {
        markHarnessMapExploreTurn("completed_without_narrative", {
          settledPersistenceRevision: state.harness.persistenceRevision
        });
        releasePrimaryModelChannel(mapDispatch.requestId, mapDispatch.owner.channelLeaseId, "completed_without_narrative");
      }
      if (maybeTriggerEveningGoHomePrompt()) return;
      returnToFreeModeMap();
      return;
    }
    requestNextMapLocationOptions(mapDispatch, {
      stepKind: "custom_choice",
      selectedAction: producerAction,
      settledMinutes: chosenMinutes
    });
  }

  function mergeWorldMapLayoutEnvelope(data) {
    if (!data || typeof data !== "object") return;
    if (data.mapFit === "cover" || data.mapFit === "contain") {
      worldMapLayoutState.mapFit = data.mapFit;
    }
    const locations = data.locations && typeof data.locations === "object" ? data.locations : null;
    if (!locations) return;
    Object.entries(locations).forEach(([id, point]) => {
      if (!point || !WORLD_MAP_LOCATIONS.some((location) => location.id === id)) return;
      if (!Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) return;
      worldMapLayoutState.overrides[id] = {
        x: roundMapCoord(point.x),
        y: roundMapCoord(point.y)
      };
    });
  }

  function buildWorldMapLayoutEnvelope() {
    return {
      version: WORLD_MAP_LAYOUT_VERSION,
      updatedAt: new Date().toISOString(),
      mapFit: worldMapLayoutState.mapFit,
      locations: Object.fromEntries(
        getEffectiveWorldMapLocations().map((location) => [location.id, { x: location.x, y: location.y }])
      )
    };
  }

  function applyWorldMapLayoutFit() {
    const mapImage = document.getElementById("worldMapImage");
    const canvas = document.querySelector(".world-map-canvas");
    if (mapImage) {
      mapImage.style.objectFit = worldMapLayoutState.mapFit;
    }
    if (canvas) {
      canvas.dataset.mapFit = worldMapLayoutState.mapFit;
    }
    const fitButton = document.getElementById("worldMapLayoutFitBtn");
    if (fitButton) {
      fitButton.textContent = `地图：${worldMapLayoutState.mapFit}`;
    }
  }

  function persistWorldMapLayoutToBrowser(showToastOnSave = true) {
    const envelope = buildWorldMapLayoutEnvelope();
    localStorage.setItem(WORLD_MAP_LAYOUT_STORAGE_KEY, JSON.stringify(envelope));
    if (showToastOnSave) {
      showToast("布局已保存", "坐标已写入浏览器本地存储。", "success");
    }
    return envelope;
  }

  async function hydrateWorldMapLayout() {
    worldMapLayoutState.overrides = {};
    worldMapLayoutState.mapFit = "cover";
    try {
      const response = await fetch(WORLD_MAP_LAYOUT_FILE, { cache: "no-store" });
      if (response.ok) {
        mergeWorldMapLayoutEnvelope(await response.json());
      }
    } catch {
      // 本地未放置 world-map-layout.json 时忽略
    }
    try {
      const saved = localStorage.getItem(WORLD_MAP_LAYOUT_STORAGE_KEY);
      if (saved) mergeWorldMapLayoutEnvelope(JSON.parse(saved));
    } catch {
      localStorage.removeItem(WORLD_MAP_LAYOUT_STORAGE_KEY);
    }
    applyWorldMapLayoutFit();
  }

  function updateWorldMapLayoutEditorUI(activeLocationId = "", x = null, y = null) {
    const editor = document.getElementById("worldMapLayoutEditor");
    const editToggle = document.getElementById("worldMapLayoutEditBtn");
    const coord = document.getElementById("worldMapLayoutEditorCoord");
    const status = document.getElementById("worldMapLayoutEditorStatus");
    const stage = document.getElementById("freeModeStage");
    const badge = document.getElementById("freeModeLocationBadge");
    if (editor) editor.classList.toggle("is-hidden", !worldMapLayoutState.editorActive);
    if (editToggle) editToggle.classList.toggle("is-hidden", worldMapLayoutState.editorActive);
    if (stage) stage.classList.toggle("is-layout-editing", worldMapLayoutState.editorActive);
    if (status) {
      status.textContent = worldMapLayoutState.editorActive ? "拖动热点后保存或导出 JSON" : "拖动热点调整位置";
    }
    if (badge && worldMapLayoutState.editorActive) {
      badge.textContent = "布局编辑中：拖动粉色热点，完成后导出 JSON";
    }
    if (coord) {
      if (activeLocationId && Number.isFinite(x) && Number.isFinite(y)) {
        const location = getWorldMapLocation(activeLocationId);
        coord.textContent = `当前：${location?.name || activeLocationId} · x ${roundMapCoord(x)}% · y ${roundMapCoord(y)}%`;
      } else {
        coord.textContent = "当前：--";
      }
    }
    applyWorldMapLayoutFit();
  }

  function setWorldMapHotspotPosition(locationId, x, y, button) {
    worldMapLayoutState.overrides[locationId] = {
      x: roundMapCoord(x),
      y: roundMapCoord(y)
    };
    if (button) {
      button.style.left = `${worldMapLayoutState.overrides[locationId].x}%`;
      button.style.top = `${worldMapLayoutState.overrides[locationId].y}%`;
    }
    updateWorldMapLayoutEditorUI(locationId, worldMapLayoutState.overrides[locationId].x, worldMapLayoutState.overrides[locationId].y);
  }

  function bindWorldMapHotspotInteractions(button, location) {
    button.addEventListener("pointerdown", (event) => {
      if (!worldMapLayoutState.editorActive) return;
      event.preventDefault();
      event.stopPropagation();
      button.setPointerCapture(event.pointerId);
      worldMapLayoutState.drag = { id: location.id, pointerId: event.pointerId, moved: false };
      updateWorldMapLayoutEditorUI(location.id, location.x, location.y);
    });

    button.addEventListener("pointermove", (event) => {
      const drag = worldMapLayoutState.drag;
      if (!drag || drag.id !== location.id || drag.pointerId !== event.pointerId) return;
      const canvas = document.querySelector(".world-map-canvas");
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      drag.moved = true;
      const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
      const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);
      setWorldMapHotspotPosition(location.id, x, y, button);
    });

    const finishDrag = (event) => {
      const drag = worldMapLayoutState.drag;
      if (!drag || drag.id !== location.id) return;
      if (event.pointerId !== drag.pointerId) return;
      if (button.hasPointerCapture(event.pointerId)) {
        button.releasePointerCapture(event.pointerId);
      }
      if (drag.moved) {
        persistWorldMapLayoutToBrowser(false);
      }
      worldMapLayoutState.drag = null;
    };

    button.addEventListener("pointerup", finishDrag);
    button.addEventListener("pointercancel", finishDrag);

    button.addEventListener("click", (event) => {
      if (!worldMapLayoutState.editorActive) {
        if (!isFreeModeTravelAllowed()) {
          showToast("今日已不能外出", "22:00 后地图地点不可进入，点击右上角时间开始新的一天。", "warn");
          return;
        }
        handleWorldMapHotspotClick(location.id);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const current = getWorldMapLocation(location.id);
      if (current) updateWorldMapLayoutEditorUI(current.id, current.x, current.y);
    });
  }

  function openWorldMapLayoutEditor() {
    if (!state.idol) {
      showToast("需要担当偶像", "请先选择担当后再编辑地图布局。", "warn");
      return;
    }
    state.freeMode = {
      ...(state.freeMode || {}),
      layoutEditBypass: true,
      unlocked: true,
      active: true,
      entryPromptSeen: true
    };
    document.body.classList.add("is-free-mode-active");
    worldMapLayoutState.editorActive = true;
    closeMapLocationOverlay();
    saveState();
    render();
    updateWorldMapLayoutEditorUI();
    showToast("布局编辑", "拖动热点调整位置。完成后导出 JSON 到 assets/MAP/world-map-layout.json。", "info");
  }

  function closeWorldMapLayoutEditor() {
    worldMapLayoutState.editorActive = false;
    worldMapLayoutState.drag = null;
    updateWorldMapLayoutEditorUI();
    renderFreeModeStage();
  }

  async function exportWorldMapLayout() {
    const envelope = persistWorldMapLayoutToBrowser(false);
    const json = `${JSON.stringify(envelope, null, 2)}\n`;
    try {
      await navigator.clipboard.writeText(json);
    } catch {
      // 剪贴板不可用时仍允许下载
    }
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "world-map-layout.json";
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("已导出布局", "JSON 已下载并尝试复制。请保存到 assets/MAP/world-map-layout.json。", "gold");
  }

  function resetWorldMapLayout() {
    worldMapLayoutState.overrides = {};
    localStorage.removeItem(WORLD_MAP_LAYOUT_STORAGE_KEY);
    persistWorldMapLayoutToBrowser(false);
    renderWorldMapHotspots();
    updateWorldMapLayoutEditorUI();
    showToast("已恢复默认", "地图热点坐标已恢复为代码内置默认值。", "info");
  }

  function toggleWorldMapLayoutFit() {
    worldMapLayoutState.mapFit = worldMapLayoutState.mapFit === "cover" ? "contain" : "cover";
    persistWorldMapLayoutToBrowser(false);
    applyWorldMapLayoutFit();
    renderWorldMapHotspots();
    showToast("地图显示", `已切换为 object-fit: ${worldMapLayoutState.mapFit}`, "info");
  }

  function syncFreeModeUnlockFromProgress() {
    if (!state.firstLive?.completed) return false;
    if (state.freeMode?.unlocked) return false;
    state.freeMode = { ...(state.freeMode || {}), unlocked: true };
    return true;
  }

  function openFreeModeEntryOverlay() {
    if (!isFreeModeUnlocked()) return;
    const note = document.getElementById("freeModeEntryNote");
    if (note) {
      note.textContent = state.firstLive.success
        ? "First Live 已成功结束。你可以继续留在育成界面整理后续，或进入学园自由探索。"
        : "First Live 已结束。你可以继续留在育成界面，或进入学园自由探索。";
    }
    setElementHidden("freeModeEntryOverlay", false);
  }

  function closeFreeModeEntryOverlay(markSeen = true) {
    if (markSeen && state.freeMode) {
      state.freeMode.entryPromptSeen = true;
      saveState();
    }
    setElementHidden("freeModeEntryOverlay", true);
  }

  function renderWorldMapHotspots() {
    const container = document.getElementById("worldMapHotspots");
    if (!container) return;
    container.innerHTML = "";
    const travelAllowed = isFreeModeTravelAllowed();
    getEffectiveWorldMapLocations().forEach((location) => {
      const isOffCampusExit = isSandboxOffCampusExitAtEntrance(location.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `world-map-hotspot${worldMapLayoutState.editorActive ? " is-editing" : ""}${travelAllowed ? "" : " is-locked"}${isOffCampusExit ? " is-off-campus-exit" : ""}`;
      button.style.left = `${location.x}%`;
      button.style.top = `${location.y}%`;
      button.dataset.locationId = location.id;
      button.setAttribute("aria-label", isOffCampusExit ? `${location.name} · 校外外出` : location.name);
      button.disabled = !travelAllowed && !worldMapLayoutState.editorActive;
      if (!travelAllowed && !worldMapLayoutState.editorActive) {
        button.title = "22:00 后不可外出";
      } else if (isOffCampusExit) {
        button.title = "点击前往校外线路图";
      }
      const markerLabel = isOffCampusExit ? "校外" : location.shortLabel;
      const nameLabel = isOffCampusExit ? `${location.name} · 外出` : location.name;
      button.innerHTML = `<span class="world-map-hotspot-marker">${markerLabel}</span><span class="world-map-hotspot-label">${nameLabel}</span>`;
      bindWorldMapHotspotInteractions(button, location);
      container.appendChild(button);
    });
    renderWorldMapIdolMarkers();
    updateWorldMapLayoutEditorUI();
  }

  function renderWorldMapIdolMarkers() {
    const container = document.getElementById("worldMapIdolMarkers");
    if (!container) return;
    container.innerHTML = "";
    if (worldMapLayoutState.editorActive) return;
    ensureFreeModeTimeDefaults();
    const groups = {};
    Object.entries(state.freeMode.presence || {}).forEach(([idolName, locationId]) => {
      if (!groups[locationId]) groups[locationId] = [];
      groups[locationId].push(idolName);
    });
    Object.entries(groups).forEach(([locationId, idolNames]) => {
      const location = getWorldMapLocation(locationId);
      if (!location) return;
      idolNames.forEach((idolName, index) => {
        const profile = idols[idolName];
        if (!profile) return;
        const marker = document.createElement("div");
        marker.className = "world-map-idol-marker idol-avatar";
        marker.style.setProperty("--avatar-color", profile.theme || "#8c73ff");
        marker.style.left = `calc(${location.x}% + ${index * 20}px)`;
        marker.style.top = `calc(${location.y}% - 28px)`;
        marker.title = `${idolName} 在 ${location.name}`;
        marker.innerHTML = `<b aria-hidden="true">${idolName.slice(0, 1)}</b><img src="${profile.avatar}" alt="" loading="lazy" decoding="async">`;
        marker.querySelector("img")?.addEventListener("error", (event) => {
          event.currentTarget.classList.add("is-missing");
        });
        container.appendChild(marker);
      });
    });
  }

  function updateFreeModeHeader() {
    ensureFreeModeTimeDefaults();
    const travelAllowed = isFreeModeTravelAllowed();
    const label = travelAllowed
      ? `${formatCampusDayLabel()} · ${formatFreeModeClock()}`
      : `${formatCampusDayLabel()} · ${formatFreeModeClock()} · 今日已结束`;
    ["freeModeStatusBadge", "vnFreeModeClock"].forEach((id) => {
      const badge = document.getElementById(id);
      if (!badge) return;
      badge.textContent = label;
      badge.classList.toggle("is-day-ended", !travelAllowed);
    });
    const vnClock = document.getElementById("vnFreeModeClock");
    if (vnClock) vnClock.hidden = !isFreeModeActive();
  }

  function renderFreeModeStage() {
    updateFreeModeHeader();
    updateFreeModeTimeOverlayUI();
    updateWorldMapImage();
    applyWorldMapLayoutFit();
    renderWorldMapHotspots();
    if (worldMapLayoutState.editorActive) return;
    const locationBadge = document.getElementById("freeModeLocationBadge");
    if (locationBadge) {
      if (isHybridCampusMode()) {
        locationBadge.textContent = isFreeModeTravelAllowed()
          ? (isSandboxLaunch()
            ? `今日校园课还剩 ${getSandboxCampusRemaining() ?? 3}/3 次 · 正门前往校外 · 教学楼上课 · 体育馆/部室/特教训练`
            : "教学楼可上课 · 体育馆/部室栋可训练")
          : "22:00 后不可安排，点击右上角时间管理进入下一天";
      } else {
        locationBadge.textContent = isFreeModeTravelAllowed()
          ? "点击地图上的地点开始探索"
          : "22:00 后不可外出，点击右上角时间管理进入下一天";
      }
    }
    const hybridExitBtn = document.getElementById("hybridCampusExitBtn");
    if (hybridExitBtn) {
      hybridExitBtn.hidden = !isHybridCampusMode() || isHybridFacilityActive();
      hybridExitBtn.textContent = isSandboxLaunch() ? "返回主菜单" : "返回经典育成";
    }
    const headKicker = document.querySelector("#freeModeStage .free-mode-head-copy .ui-kicker");
    if (headKicker) {
      headKicker.textContent = isSandboxLaunch() ? "Sandbox" : isHybridCampusMode() ? "Hybrid Campus" : "Free Explore";
    }
    const sideQuestBtn = document.getElementById("freeModeSideQuestBtn");
    const sideQuestBadge = document.getElementById("freeModeSideQuestBadge");
    if (sideQuestBtn) {
      const showSideQuest = canOpenSideQuestOverlay();
      sideQuestBtn.hidden = !showSideQuest;
      if (showSideQuest && sideQuestBadge) {
        const remaining = getSideQuestRemainingCount();
        sideQuestBadge.textContent = remaining === null ? "" : `剩 ${remaining}`;
      }
    }
    const taskPanelBtn = document.getElementById("freeModeTaskPanelBtn");
    if (taskPanelBtn) {
      taskPanelBtn.hidden = !canOpenTaskPanelOverlay();
    }
    const affinityBtn = document.getElementById("freeModeAffinityBtn");
    if (affinityBtn) {
      affinityBtn.hidden = !canOpenAffinityOverlay();
    }
    updateFreeModeBagButton();
    const apartmentBtn = document.getElementById("freeModeApartmentBtn");
    if (apartmentBtn) {
      apartmentBtn.hidden = !isFreeModeActive() || isHybridFacilityActive() || worldMapLayoutState.editorActive;
    }
    const giftShopOverlay = document.getElementById("giftShopOverlay");
    if (giftShopOverlay && !giftShopOverlay.hidden) {
      renderGiftShopOverlay();
    }
    const taskPanelOverlay = document.getElementById("taskPanelOverlay");
    if (taskPanelOverlay && !taskPanelOverlay.hidden) {
      renderTaskPanelOverlay();
    }
    const affinityOverlay = document.getElementById("affinityOverlay");
    if (affinityOverlay && !affinityOverlay.hidden) {
      renderAffinityOverlay();
    }
    const chronicleLoadBtn = document.getElementById("vnChronicleLoadBtn");
    if (chronicleLoadBtn) {
      chronicleLoadBtn.hidden = !isSillyTavernHost();
    }
  }

  function enterHybridCampus() {
    if (!state.idol) {
      showToast("需要担当偶像", "请先选择担当偶像。", "warn");
      return;
    }
    if (!state.affinity.openingComplete && !isSandboxLaunch()) {
      showToast("尚未签约", "请先完成开场剧情。", "warn");
      return;
    }
    if (isSandboxLaunch() && !state.sandbox?.openingComplete) {
      showToast("尚未完成指引", "请先听完亚纱里老师的开学说明。", "warn");
      return;
    }
    if (isSandboxLaunch() && !state.idol) {
      showToast("需要担当偶像", "请先物色并选择一位偶像。", "warn");
      return;
    }
    ensureFreeModeTimeDefaults();
    runFreeModeWorldDailyTick();
    state.gameMode = "hybrid";
    state.freeMode = {
      ...(state.freeMode || {}),
      active: true,
      facilityKind: null,
      facilityLocationId: null
    };
    document.body.classList.add("is-free-mode-active");
    saveState();
    render();
    showToast(isSandboxLaunch() ? "沙盒模式" : "混合模式", `已进入学园地图。当前 ${formatCampusDayLabel()} ${formatFreeModeClock()}。`, "info");
  }

  function startSandboxSession() {
    enterSandboxCampusAfterOpening();
  }

  function exitHybridCampus() {
    if (isSandboxLaunch()) {
      returnToLaunchMenu();
      return;
    }
    state.gameMode = "classic";
    exitFreeMode();
  }

  function openHybridFacility(facilityKind, locationId) {
    if (!isHybridCampusMode() || !isFreeModeActive()) return;
    if (!isFreeModeTravelAllowed()) {
      showToast("今日已不能安排", "22:00 后无法进入校园设施，请进入下一天。", "warn");
      return;
    }
    if (["lesson", "training"].includes(facilityKind) && isSandboxCampusExhausted()) {
      showSandboxCampusLimitToast();
      return;
    }
    if (facilityKind === "rest") {
      if (Number(state.stamina || 0) >= 100) {
        showToast("体力已满", "当前不需要休息，时间不会推进。", "info");
        return;
      }
    }
    const location = getWorldMapLocation(locationId);
    if (!location) return;
    state.freeMode.facilityKind = facilityKind;
    state.freeMode.facilityLocationId = locationId;
    saveState();
    render();
    const facilityLabels = { lesson: "上课", training: "训练", rest: "休息", first_live: "First Live" };
    const facilityLabel = facilityLabels[facilityKind] || "设施";
    showToast(facilityLabel, `已进入 ${location.name}。${facilityLabel}将推进 ${getHybridFacilityActionMinutes(facilityKind)} 分钟。`, "info");
  }

  function exitHybridFacility() {
    if (!state.freeMode) return;
    state.freeMode.facilityKind = null;
    state.freeMode.facilityLocationId = null;
  }

  function enterFreeMode() {
    if (!isFreeModeUnlocked()) {
      showToast("尚未解锁", "完成 First Live 演后记后解锁学园自由模式。", "warn");
      return;
    }
    closeFreeModeEntryOverlay(true);
    ensureFreeModeTimeDefaults();
    runFreeModeWorldDailyTick();
    state.gameMode = "classic";
    state.freeMode = {
      ...(state.freeMode || {}),
      active: true,
      facilityKind: null,
      facilityLocationId: null
    };
    document.body.classList.add("is-free-mode-active");
    saveState();
    render();
    showToast("自由模式", `已进入学园大地图。当前 ${formatFreeModeDayLabel()} ${formatFreeModeClock()}。`, "info");
  }

  function exitFreeMode() {
    if (!state.freeMode) return;
    worldMapLayoutState.editorActive = false;
    worldMapLayoutState.drag = null;
    state.freeMode.active = false;
    state.freeMode.layoutEditBypass = false;
    state.freeMode.activeLocationId = null;
    state.freeMode.facilityKind = null;
    state.freeMode.facilityLocationId = null;
    document.body.classList.remove("is-free-mode-active");
    closeMapLocationOverlay();
    returnToFreeModeMap({ cancelled: true });
    saveState();
    render();
  }

  function applyMapLocationPresenceCollapse(totalCount) {
    const presenceList = document.getElementById("mapLocationPresenceList");
    const toggleBtn = document.getElementById("mapLocationPresenceToggle");
    if (!presenceList || !toggleBtn) return;

    const shouldCollapse = totalCount >= MAP_LOCATION_PRESENCE_COLLAPSE_AT;
    toggleBtn.hidden = !shouldCollapse;

    if (!shouldCollapse) {
      presenceList.hidden = totalCount === 0;
      presenceList.classList.remove("is-scrollable");
      return;
    }

    toggleBtn.textContent = mapLocationPresenceExpanded
      ? "收起在场详情"
      : `查看在场详情（${totalCount}人）`;
    presenceList.hidden = !mapLocationPresenceExpanded;
    presenceList.classList.toggle("is-scrollable", mapLocationPresenceExpanded);
  }

  function renderMapLocationPresence(locationId, idolsHere) {
    const helpers = getHatsuWorldHelpers();
    const residentNpcs = getResidentNpcsAtLocation(locationId);
    const hasPresence = idolsHere.length > 0 || residentNpcs.length > 0;
    const totalCount = idolsHere.length + residentNpcs.length;
    const presenceBlock = document.getElementById("mapLocationPresence");
    const presenceAvatars = document.getElementById("mapLocationPresenceAvatars");
    const presenceList = document.getElementById("mapLocationPresenceList");
    const presenceLabel = presenceBlock?.querySelector(".map-location-presence-label");

    if (presenceLabel) {
      presenceLabel.textContent = isSandboxScoutActive() ? "当前在场" : "当前可能在场";
    }
    if (presenceList) {
      presenceList.innerHTML = "";
    }
    if (presenceBlock) {
      presenceBlock.hidden = !hasPresence;
    }
    if (!presenceAvatars) return;

    presenceAvatars.innerHTML = "";
    idolsHere.forEach((idolName) => {
      const profile = idols[idolName];
      if (!profile) return;
      const campusSlot = globalThis.HatsuWorld?.campusBehavior?.getIdolCampusSlot?.(state, idolName, helpers);
      const avatar = document.createElement("span");
      avatar.className = "map-location-presence-avatar idol-avatar";
      if (campusSlot?.interactable) avatar.classList.add("is-interactable");
      else if (campusSlot) avatar.classList.add("is-background");
      avatar.style.setProperty("--avatar-color", profile.theme || "#8c73ff");
      avatar.title = campusSlot?.publicLabel ? `${idolName}：${campusSlot.publicLabel}` : idolName;
      avatar.innerHTML = `<b aria-hidden="true">${idolName.slice(0, 1)}</b><img src="${profile.avatar}" alt="" loading="lazy" decoding="async">`;
      avatar.querySelector("img")?.addEventListener("error", (event) => {
        event.currentTarget.classList.add("is-missing");
      });
      presenceAvatars.appendChild(avatar);

      if (presenceList) {
        const item = document.createElement("div");
        item.className = "map-location-presence-item";
        if (campusSlot?.interactable) item.classList.add("is-interactable");
        else item.classList.add("is-background");
        const statusText = campusSlot?.interactable ? "可搭话" : "仅远处可见";
        item.innerHTML = `
          <span class="map-location-presence-name">${idolName}</span>
          <span class="map-location-presence-copy">${campusSlot?.publicLabel || "在场"}</span>
          <span class="map-location-presence-status">${statusText}</span>
        `;
        presenceList.appendChild(item);
      }
    });
    residentNpcs.forEach((npc) => {
      const avatar = document.createElement("span");
      avatar.className = "map-location-presence-avatar idol-avatar is-interactable is-npc";
      avatar.style.setProperty("--avatar-color", npc.theme || "#6f9cff");
      avatar.title = `${npc.name}：${npc.publicLabel || "常驻"}`;
      avatar.innerHTML = `<b aria-hidden="true">${npc.name.slice(0, 1)}</b><img src="${npc.avatar || ""}" alt="" loading="lazy" decoding="async">`;
      avatar.querySelector("img")?.addEventListener("error", (event) => {
        event.currentTarget.classList.add("is-missing");
      });
      presenceAvatars.appendChild(avatar);

      if (presenceList) {
        const item = document.createElement("div");
        item.className = "map-location-presence-item is-interactable is-npc";
        item.innerHTML = `
          <span class="map-location-presence-name">${npc.name}</span>
          <span class="map-location-presence-copy">${npc.publicLabel || "常驻NPC"}</span>
          <span class="map-location-presence-status">${npc.statusLabel || "常驻"}</span>
        `;
        presenceList.appendChild(item);
      }
    });
    applyMapLocationPresenceCollapse(totalCount);
  }

  function updateMapLocationEntryActions(locationId) {
    const facilityKind = canOpenHybridFacilityAt(locationId) ? getHybridFacilityKind(locationId) : null;
    const scoutTalkHere = isSandboxScoutTalkAvailable(locationId);
    const scoutActive = isSandboxScoutActive() && scoutTalkHere;
    const scoutTargetHere = scoutActive ? getSandboxScoutTargetAtLocation(locationId) : "";
    const campusExhausted = isSandboxCampusExhausted();
    const facilityBtn = document.getElementById("mapLocationEnterFacilityBtn");
    const enterWithIdolBtn = document.getElementById("mapLocationEnterWithIdolBtn");
    const enterAloneBtn = document.getElementById("mapLocationEnterAloneBtn");
    const enterOptions = document.querySelector(".map-location-enter-options");

    if (facilityBtn) {
      if (facilityKind && !scoutActive) {
        facilityBtn.hidden = false;
        if (["lesson", "training"].includes(facilityKind) && campusExhausted) {
          facilityBtn.disabled = true;
          facilityBtn.textContent = "今日校园次数已用完";
        } else {
          facilityBtn.disabled = false;
          const facilityLabels = {
            lesson: "进入上课",
            training: "进入训练",
            rest: "进入宿舍休息",
            first_live: "举办 First Live"
          };
          facilityBtn.textContent = facilityLabels[facilityKind] || "进入设施";
          if (facilityKind === "first_live") {
            const challenge = normalizeSandboxFirstLiveChallenge(state.sandbox?.firstLiveChallenge);
            const day = Number(state.freeMode?.postLiveDay) || 1;
            const locked = challenge.status === "completed"
              || challenge.status === "generating"
              || challenge.status === "recovery_required"
              || (challenge.status === "cooldown" && day < Number(challenge.nextAvailableDay || 0))
              || !canStartSandboxFirstLiveAt();
            facilityBtn.disabled = locked;
            facilityBtn.textContent = locked ? `First Live：${getSandboxFirstLiveChallengeStatusText()}` : "举办 First Live";
          }
        }
      } else {
        facilityBtn.hidden = true;
      }
    }
    if (enterWithIdolBtn) {
      if (scoutActive) {
        enterWithIdolBtn.textContent = scoutTargetHere ? `与 ${scoutTargetHere} 搭话` : "物色目标不在这里";
        enterWithIdolBtn.disabled = !scoutTargetHere;
      } else {
        enterWithIdolBtn.disabled = false;
        enterWithIdolBtn.textContent = "和担当一起来";
      }
    }
    if (enterAloneBtn) {
      if (scoutActive) {
        enterAloneBtn.hidden = true;
      } else {
        enterAloneBtn.hidden = false;
        enterAloneBtn.disabled = false;
        enterAloneBtn.textContent = "自己来";
      }
    }
    if (enterOptions) {
      enterOptions.classList.toggle("is-scout-mode", scoutActive);
      enterOptions.classList.toggle("has-facility-option", Boolean(facilityKind) && !scoutActive);
    }
  }

  function isSandboxOffCampusExitAtEntrance(locationId) {
    return locationId === "school_entrance"
      && isSandboxLaunch()
      && isFreeModeActive()
      && !isSandboxScoutActive()
      && isFreeModeTravelAllowed();
  }

  function handleWorldMapHotspotClick(locationId) {
    if (isSandboxOffCampusExitAtEntrance(locationId)) {
      openFreeModeOutingOverlay();
      return;
    }
    openMapLocationOverlay(locationId);
  }

  function openMapLocationOverlay(locationId) {
    const location = getWorldMapLocation(locationId);
    if (!location) return;
    mapLocationPresenceExpanded = false;
    const title = document.getElementById("mapLocationTitle");
    const desc = document.getElementById("mapLocationDesc");
    const visual = document.getElementById("mapLocationVisual");
    const image = document.getElementById("mapLocationImage");
    const idolsHere = getIdolsPresentAtLocation(locationId);
    if (title) title.textContent = location.name;
    if (desc) desc.textContent = location.description;
    renderMapLocationPresence(locationId, idolsHere);
    const imagePath = String(location.image || "").trim();
    if (visual) visual.hidden = !imagePath;
    if (image) {
      if (imagePath) {
        image.src = imagePath;
        image.alt = location.name;
        image.hidden = false;
      } else {
        image.removeAttribute("src");
        image.alt = "";
        image.hidden = true;
      }
    }
    document.getElementById("mapLocationOverlay")?.setAttribute("data-location-id", location.id);
    const outingBtn = document.getElementById("mapLocationOutingBtn");
    if (outingBtn) {
      outingBtn.hidden = location.id !== "school_entrance"
        || isSandboxScoutActive()
        || isSandboxOffCampusExitAtEntrance(location.id);
    }
    updateMapLocationEntryActions(location.id);
    updateMapLocationShopButton(location.id);
    setElementHidden("mapLocationOverlay", false);
  }

  function closeMapLocationOverlay() {
    setElementHidden("mapLocationOverlay", true);
    document.getElementById("mapLocationOverlay")?.removeAttribute("data-location-id");
  }

  function offCampusStationByDestination(destinationName) {
    const name = String(destinationName || "").trim();
    return OFF_CAMPUS_TRANSIT_STATIONS.find((station) => station.name === name) || null;
  }

  function renderOffCampusTransitMap(activeDestination = "") {
    const map = document.getElementById("offCampusTransitMap");
    if (!map) return;
    const selected = offCampusStationByDestination(activeDestination);
    const stationById = Object.fromEntries(OFF_CAMPUS_TRANSIT_STATIONS.map((station) => [station.id, station]));
    const linePath = (ids) => ids
      .map((id) => stationById[id])
      .filter(Boolean)
      .map((station) => `${station.x},${station.y}`)
      .join(" ");
    const selectedId = selected?.id || "";

    map.innerHTML = `
      <div class="off-campus-map-card">
        <div class="off-campus-map-head">
          <div>
            <span class="off-campus-map-kicker">初星电铁</span>
            <strong>校外一日乘车图</strong>
          </div>
          <span class="off-campus-map-chip">08:00-22:00</span>
        </div>
        <div class="off-campus-map-canvas" role="img" aria-label="初星学园前到商店街、购物中心、游乐园、水族馆，以及体育中心、商演委托地点与住宅支线">
          <svg class="off-campus-lines" viewBox="0 0 100 100" aria-hidden="true">
            <polyline class="off-campus-line off-campus-line-glow off-campus-line-main" points="${linePath(["hatsuboshi_gate", "shopping_street", "shopping_mall", "amusement_park", "aquarium"])}" />
            <polyline class="off-campus-line off-campus-line-glow off-campus-line-sports" points="${linePath(["hatsuboshi_gate", "sports_center"])}" />
            <polyline class="off-campus-line off-campus-line-glow off-campus-line-media" points="${linePath(["shopping_street", "local_radio", "event_hall", "brand_store"])}" />
            <polyline class="off-campus-line off-campus-line-media" points="${linePath(["local_radio", "tv_station", "photo_studio", "music_festival"])}" />
            <polyline class="off-campus-line off-campus-line-home" points="${linePath(["shopping_mall", "saki_home", "china_home"])}" />
          </svg>
          ${OFF_CAMPUS_TRANSIT_STATIONS.map((station) => `
            <button
              type="button"
              class="off-campus-station off-campus-station-${escapePhoneText(station.line)}${station.status === "locked" ? " is-locked" : ""}${station.status === "hub" ? " is-hub" : ""}${station.id === selectedId ? " is-selected" : ""}"
              style="left:${station.x}%; top:${station.y}%"
              data-off-campus-station="${escapePhoneText(station.id)}"
              aria-label="${escapePhoneText(station.name)}${station.status === "locked" ? "，未解锁" : ""}"
            >
              <span class="off-campus-station-dot">${escapePhoneText(station.shortLabel)}</span>
              <span class="off-campus-station-name">${escapePhoneText(station.name)}</span>
            </button>
          `).join("")}
        </div>
        <div class="off-campus-legend" aria-hidden="true">
          <span><b class="legend-main"></b>星环线</span>
          <span><b class="legend-sports"></b>运动支线</span>
          <span><b class="legend-media"></b>商演支线</span>
          <span><b class="legend-home"></b>住宅支线</span>
        </div>
      </div>`;

    map.querySelectorAll("[data-off-campus-station]").forEach((button) => {
      button.addEventListener("click", () => {
        const station = stationById[button.dataset.offCampusStation];
        if (!station) return;
        if (station.status === "locked") {
          showToast("尚未解锁", `${station.name} 会作为后续角色事件地点开放。`, "info");
          return;
        }
        if (station.status === "hub") {
          showToast("校外入口", "请选择校外目的地后出发。", "info");
          return;
        }
        confirmFreeModeOutingDestination(station.name);
      });
    });
  }


  function getFreeModeOutingVenue(venueId) {
    return FREE_MODE_OUTING_VENUES[String(venueId || "").trim()] || null;
  }

  function getFreeModeOutingVenueByDestination(destination) {
    const station = offCampusStationByDestination(destination);
    if (!station) return null;
    return Object.values(FREE_MODE_OUTING_VENUES).find((venue) => venue.stationId === station.id) || null;
  }

  function getFreeModeOutingFacility(venueId, facilityId) {
    const venue = getFreeModeOutingVenue(venueId);
    if (!venue) return null;
    const id = String(facilityId || venue.entranceFacilityId || "").trim();
    return venue.facilities.find((facility) => facility.id === id) || venue.facilities[0] || null;
  }

  function getActiveFreeModeOutingFacility(actionContext = state.pendingActionContext?.actionContext || {}) {
    const scene = state.freeMode?.outingScene || {};
    const venueId = actionContext.outingVenueId || scene.venueId;
    const facilityId = actionContext.outingFacilityId || scene.facilityId;
    return getFreeModeOutingFacility(venueId, facilityId);
  }

  function openFreeModeOutingScene(venueId, visitMode = "with_idol", options = {}) {
    if (!isFreeModeActive()) return;
    const venue = getFreeModeOutingVenue(venueId);
    if (!venue) return;
    if (!state.freeMode) state.freeMode = {};
    const normalizedVisitMode = visitMode === "alone" ? "alone" : "with_idol";
    const facility = getFreeModeOutingFacility(venue.id, options.facilityId || venue.entranceFacilityId);
    state.freeMode.outingScene = {
      venueId: venue.id,
      facilityId: facility?.id || venue.entranceFacilityId,
      visitMode: normalizedVisitMode,
      selectedIdol: options.selectedIdol || canonicalIdolName(state.idol) || state.idol || ""
    };
    state.freeMode.activeOutingDestination = venue.name;
    triggerWipeTransition(() => {
      closeFreeModeOutingOverlay();
      closeMapLocationOverlay();
      renderFreeModeOutingScene();
      setElementHidden("freeModeOutingSceneOverlay", false);
    });
  }

  function closeFreeModeOutingScene() {
    setElementHidden("freeModeOutingSceneOverlay", true);
    closeFreeModeOutingFacilityGuide();
    closeFreeModeOutingIdolActionMenu();
    closeFreeModeOutingSceneDialogue();
  }

  function renderFreeModeOutingScene() {
    const scene = state.freeMode?.outingScene || {};
    const venue = getFreeModeOutingVenue(scene.venueId);
    const facility = getFreeModeOutingFacility(scene.venueId, scene.facilityId);
    if (!venue || !facility) return;
    const title = document.getElementById("freeModeOutingSceneTitle");
    const desc = document.getElementById("freeModeOutingSceneDesc");
    const image = document.getElementById("freeModeOutingSceneImage");
    if (title) title.textContent = facility.sceneName || facility.name;
    if (desc) desc.textContent = facility.description || venue.name;
    if (image) {
      image.src = facility.image || DEFAULT_OUTING_SCENE;
      image.alt = facility.sceneName || facility.name;
    }
    renderFreeModeOutingSceneIdols();
    renderFreeModeOutingFacilityGuide();
  }

  function getFreeModeOutingSceneIdols() {
    const names = [];
    const assigned = canonicalIdolName(state.idol) || state.idol || "";
    if (assigned && idols[assigned]) names.push(assigned);
    return names;
  }

  function renderFreeModeOutingSceneIdols() {
    const list = document.getElementById("freeModeOutingSceneIdols");
    if (!list) return;
    const selected = state.freeMode?.outingScene?.selectedIdol || canonicalIdolName(state.idol) || state.idol || "";
    list.innerHTML = "";
    getFreeModeOutingSceneIdols().forEach((idolName) => {
      const profile = idols[idolName] || {};
      const button = document.createElement("button");
      button.type = "button";
      button.className = `outing-scene-idol${idolName === selected ? " is-selected" : ""}`;
      button.dataset.outingIdol = idolName;
      button.style.setProperty("--idol-color", profile.theme || "#ec407a");
      const standee = resolveIdolStandeeSrc(idolName);
      button.innerHTML = `
        <img src="${escapePhoneText(standee || profile.avatar || "")}" alt="${escapePhoneText(idolName)}立绘" loading="lazy" decoding="async">
        <span>${escapePhoneText(idolName)}</span>
      `;
      button.querySelector("img")?.addEventListener("error", (event) => {
        event.currentTarget.classList.add("is-missing");
      });
      button.addEventListener("click", () => openFreeModeOutingIdolActionMenu(idolName));
      list.appendChild(button);
    });
  }

  function openFreeModeOutingIdolActionMenu(idolName) {
    if (!state.freeMode?.outingScene) return;
    const canonical = canonicalIdolName(idolName) || idolName || state.idol || "";
    state.freeMode.outingScene.selectedIdol = canonical;
    const name = document.getElementById("freeModeOutingIdolActionName");
    if (name) name.textContent = canonical || "担当偶像";
    renderFreeModeOutingSceneIdols();
    setElementHidden("freeModeOutingIdolActionMenu", false);
  }

  function closeFreeModeOutingIdolActionMenu() {
    setElementHidden("freeModeOutingIdolActionMenu", true);
  }

  function closeFreeModeOutingSceneDialogue() {
    setElementHidden("freeModeOutingSpeechBubble", true);
    setElementHidden("freeModeOutingDialogueBar", true);
  }

  function buildFreeModeOutingPrototypeDialogue(action, idolName, facility, customText = "") {
    const safeIdol = idolName || state.idol || "担当偶像";
    const facilityName = facility?.shortName || facility?.name || "这里";
    const normalizedCustomText = String(customText || "").trim();
    if (normalizedCustomText) {
      return {
        narration: "你们停在" + facilityName + "旁边，周围的声音暂时退到背景里。",
        producer: "制作人：「" + normalizedCustomText + "」",
        idol: "嗯。我明白了，让我想想该怎么回答老师。"
      };
    }
    if (action === "ask") {
      return {
        narration: "你们停在" + facilityName + "附近，人流和店内的声音从四周慢慢聚拢过来。",
        producer: "制作人：「接下来想去哪里？还是想先在这里休息一下？」",
        idol: "嗯……我想再看一会儿。老师决定也可以。"
      };
    }
    if (action === "invite") {
      return {
        narration: "你向" + safeIdol + "确认接下来的同行路线，对方轻轻点头，站到更靠近你的一侧。",
        producer: "制作人：「那就一起走吧。人多的时候不要离太远。」",
        idol: "知道了。我会跟着老师。"
      };
    }
    return {
      narration: "你们在" + facilityName + "稍微放慢脚步，商场里的灯光映在玻璃扶手上。",
      producer: "制作人：「难得出来一趟，感觉怎么样？」",
      idol: "和平时的学园不太一样……不过这样也不错。"
    };
  }

  function renderFreeModeOutingSceneDialogue(dialogue, idolName) {
    const speechName = document.getElementById("freeModeOutingSpeechName");
    const speechText = document.getElementById("freeModeOutingSpeechText");
    const narration = document.getElementById("freeModeOutingNarrationText");
    const producer = document.getElementById("freeModeOutingProducerText");
    if (speechName) speechName.textContent = idolName || state.idol || "担当偶像";
    if (speechText) speechText.textContent = dialogue?.idol || "";
    if (narration) narration.textContent = dialogue?.narration || "";
    if (producer) producer.textContent = dialogue?.producer || "";
    closeFreeModeOutingIdolActionMenu();
    setElementHidden("freeModeOutingSpeechBubble", !dialogue?.idol);
    setElementHidden("freeModeOutingDialogueBar", !(dialogue?.narration || dialogue?.producer));
  }

  function showFreeModeOutingSceneDialogue(action = "chat", customText = "") {
    const scene = state.freeMode?.outingScene;
    const facility = getFreeModeOutingFacility(scene?.venueId, scene?.facilityId);
    if (!scene || !facility) return;
    const idolName = scene.selectedIdol || canonicalIdolName(state.idol) || state.idol || "担当偶像";
    renderFreeModeOutingSceneDialogue(buildFreeModeOutingPrototypeDialogue(action, idolName, facility, customText), idolName);
  }

  function requestFreeModeOutingSceneDialogue(action = "chat", customText = "") {
    const scene = state.freeMode?.outingScene;
    const venue = getFreeModeOutingVenue(scene?.venueId);
    const facility = getFreeModeOutingFacility(scene?.venueId, scene?.facilityId);
    if (!scene || !venue || !facility) return;
    const idolName = scene.selectedIdol || canonicalIdolName(state.idol) || state.idol || "担当偶像";
    const normalizedCustomText = String(customText || "").trim();
    const prompt = buildFreeModeOutingSceneDialoguePrompt(action, normalizedCustomText);
    if (!prompt.trim()) return;
    const requestId = createRequestId();
    pendingAiRequestId = requestId;
    state.pendingActionContext = {
      action: "outing_scene_dialogue",
      attribute: null,
      actionContext: {
        outingAction: action,
        outingCustomText: normalizedCustomText,
        outingVenueId: venue.id,
        outingFacilityId: facility.id,
        outingFacilityName: facility.name,
        outingSceneName: facility.sceneName,
        outingSelectedIdol: idolName
      }
    };
    state.lastPrompt = prompt;
    state.lastDebug = "校外场景内对话：等待 AI 生成气泡与底部栏文本。";
    renderFreeModeOutingSceneDialogue({
      narration: "正在等待当前场景的回应……",
      producer: normalizedCustomText ? "制作人：「" + normalizedCustomText + "」" : "制作人：「……」",
      idol: "……"
    }, idolName);
    saveState();
    if (!requestHostPromptSend(prompt, requestId)) {
      showFreeModeOutingSceneDialogue(action, normalizedCustomText);
      openAiPromptOverlay("当前页面未连接 SillyTavern。请复制校外场景内对话提示词后手动发送。");
    }
  }

  function submitFreeModeOutingSceneCustomDialogue() {
    const input = document.getElementById("freeModeOutingDialogueCustomInput");
    const customText = String(input?.value || "").trim();
    if (!customText) {
      showToast("请输入聊天内容", "可以输入想说的话、想问的问题，或想做的小行动。", "warn");
      input?.focus();
      return;
    }
    if (input) input.value = "";
    requestFreeModeOutingSceneDialogue("custom", customText);
  }
  function renderFreeModeOutingFacilityGuide() {
    const map = document.getElementById("freeModeOutingFacilityGuideMap");
    if (!map) return;
    const scene = state.freeMode?.outingScene || {};
    const venue = getFreeModeOutingVenue(scene.venueId);
    if (!venue) return;
    const currentFacilityId = scene.facilityId || venue.entranceFacilityId;
    map.innerHTML = venue.facilities.map((facility) => `
      <button
        type="button"
        class="outing-facility-card outing-facility-${escapePhoneText(facility.id)}${facility.id === currentFacilityId ? " is-current" : ""}"
        data-outing-facility-id="${escapePhoneText(facility.id)}"
      >
        <span>${escapePhoneText(facility.floor || "")}</span>
        <strong>${escapePhoneText(facility.shortName || facility.name)}</strong>
        <em>${escapePhoneText((facility.image || "").split("/").pop()?.replace(/\.png$/i, "") || facility.name)}</em>
      </button>
    `).join("");
    map.querySelectorAll("[data-outing-facility-id]").forEach((button) => {
      button.addEventListener("click", () => selectFreeModeOutingFacility(button.dataset.outingFacilityId));
    });
  }

  function openFreeModeOutingFacilityGuide() {
    renderFreeModeOutingFacilityGuide();
    closeFreeModeOutingIdolActionMenu();
    setElementHidden("freeModeOutingFacilityGuide", false);
  }

  function closeFreeModeOutingFacilityGuide() {
    setElementHidden("freeModeOutingFacilityGuide", true);
  }

  function selectFreeModeOutingFacility(facilityId) {
    const scene = state.freeMode?.outingScene;
    if (!scene) return;
    const facility = getFreeModeOutingFacility(scene.venueId, facilityId);
    if (!facility) return;
    triggerWipeTransition(() => {
      scene.facilityId = facility.id;
      closeFreeModeOutingFacilityGuide();
      closeFreeModeOutingIdolActionMenu();
      closeFreeModeOutingSceneDialogue();
      renderFreeModeOutingScene();
      showToast("设施移动", `已前往 ${facility.name}。`, "info");
    });
  }

  function startFreeModeOutingFacilityExplore(action = "explore") {
    const scene = state.freeMode?.outingScene;
    const venue = getFreeModeOutingVenue(scene?.venueId);
    const facility = getFreeModeOutingFacility(scene?.venueId, scene?.facilityId);
    if (!venue || !facility) return;
    const selectedIdol = scene.selectedIdol || canonicalIdolName(state.idol) || state.idol || "";
    closeFreeModeOutingScene();
    beginMapLocationExploreSession({
      locationId: FREE_MODE_OUTING_LOCATION_ID,
      locationName: venue.name,
      outingDestination: venue.name,
      visitMode: scene.visitMode || "with_idol",
      isOffCampus: true,
      outingVenueId: venue.id,
      outingFacilityId: facility.id,
      outingFacilityName: facility.name,
      outingSceneName: facility.sceneName,
      outingSceneImage: facility.image,
      outingAction: action,
      outingSelectedIdol: selectedIdol,
      returnTarget: {
        type: "outing_scene",
        venueId: venue.id,
        facilityId: facility.id,
        visitMode: scene.visitMode || "with_idol",
        selectedIdol
      }
    });
  }

  function handleFreeModeOutingIdolAction(action) {
    if (action === "status") {
      const idolName = state.freeMode?.outingScene?.selectedIdol || state.idol || "担当偶像";
      const relation = getFreeModeRelationship(idolName);
      showToast("同行状态", `${idolName} 好感度 ${relation.score}/100。`, "info");
      return;
    }
    if (["chat", "ask", "invite"].includes(action)) {
      requestFreeModeOutingSceneDialogue(action);
      return;
    }
    startFreeModeOutingFacilityExplore(action || "chat");
  }

  function openFreeModeOutingOverlay() {
    if (!isFreeModeActive()) return;
    document.getElementById("freeModeOutingCustomInput").value = "";
    renderOffCampusTransitMap();
    const list = document.getElementById("freeModeOutingDestinationList");
    if (list) {
      list.innerHTML = "";
      FREE_MODE_OUTING_DESTINATIONS.forEach((destination, index) => {
        const station = offCampusStationByDestination(destination.name);
        const button = document.createElement("button");
        button.type = "button";
        button.id = `free-mode-outing-destination-${index + 1}`;
        button.className = "outing-destination-button";
        button.innerHTML = `
          <strong>${escapePhoneText(destination.name)}</strong>
          <span>${escapePhoneText(destination.description)}</span>
          ${station?.pois?.length ? `<em>${station.pois.map(escapePhoneText).join(" / ")}</em>` : ""}
        `;
        button.addEventListener("mouseenter", () => renderOffCampusTransitMap(destination.name));
        button.addEventListener("focus", () => renderOffCampusTransitMap(destination.name));
        button.addEventListener("click", () => confirmFreeModeOutingDestination(destination.name));
        list.appendChild(button);
      });
    }
    setElementHidden("freeModeOutingOverlay", false);
  }

  function closeFreeModeOutingOverlay() {
    setElementHidden("freeModeOutingOverlay", true);
  }

  function confirmFreeModeOutingDestination(destination) {
    const location = String(destination || "").trim();
    if (!location) {
      showToast("还没有地点", "请选择预设地点，或输入自定义外出地点。", "warn");
      return;
    }
    const venue = getFreeModeOutingVenueByDestination(location);
    if (venue) {
      openFreeModeOutingScene(venue.id, "with_idol");
      return;
    }
    closeFreeModeOutingOverlay();
    closeMapLocationOverlay();
    startFreeModeOuting(location, "with_idol");
  }

  function submitCustomFreeModeOutingDestination() {
    runAfterImeCommit("freeModeOutingCustomInput", () => {
      confirmFreeModeOutingDestination(readTextInputValue("freeModeOutingCustomInput"));
    });
  }

  function confirmFacilityEntry() {
    const locationId = document.getElementById("mapLocationOverlay")?.getAttribute("data-location-id");
    if (!locationId) return;
    const facilityKind = getHybridFacilityKind(locationId);
    if (!facilityKind || !canOpenHybridFacilityAt(locationId)) return;
    closeMapLocationOverlay();
    openHybridFacility(facilityKind, locationId);
  }

  function confirmMapLocationEntry(visitMode = "with_idol") {
    const locationId = document.getElementById("mapLocationOverlay")?.getAttribute("data-location-id");
    if (!locationId) return;
    const scoutTalkHere = isSandboxScoutTalkAvailable(locationId);
    if (scoutTalkHere) {
      const targetHere = getSandboxScoutTargetAtLocation(locationId);
      if (!targetHere) {
        showToast("目标不在这里", `${state.idol || "物色目标"} 今天不在这处地点，请到地图其他位置寻找。`, "warn");
        return;
      }
      closeMapLocationOverlay();
      startMapLocationExplore(locationId, "alone");
      return;
    }
    closeMapLocationOverlay();
    startMapLocationExplore(locationId, visitMode);
  }

  function completeFirstLivePostFlow() {
    state.activeStoryNode = null;
    refreshAffinityUnlocks();
    const justUnlocked = syncFreeModeUnlockFromProgress();
    saveState();
    render();
    if (justUnlocked && !state.freeMode?.entryPromptSeen) {
      openFreeModeEntryOverlay();
    }
  }

  function renderShellMode() {
    const hasIdol = Boolean(state.idol);
    const sandboxActive = isSandboxLaunch();
    const canShowGame = hasIdol && !state.launchMenuPaused && (
      (isProduceLaunch() && state.affinity.openingComplete)
      || (sandboxActive && state.sandbox?.openingComplete && state.sandbox?.inviteComplete)
    );
    const inHybridFacility = isHybridFacilityActive();
    const inApartment = isProducerApartmentActive();
    const inCampusMap = isFreeModeActive() && !inHybridFacility && !inApartment;
    document.body.classList.toggle("is-free-mode-active", isFreeModeActive());
    document.body.classList.toggle("is-hybrid-facility-active", inHybridFacility);
    document.getElementById("launchStage")?.classList.toggle("is-hidden", !shouldShowLaunchStage());
    document.getElementById("selectionStage")?.classList.toggle("is-hidden", !shouldShowSelectionStage());
    document.getElementById("gameStage").classList.toggle("is-hidden", !canShowGame || (isFreeModeActive() && !inHybridFacility));
    const freeModeStage = document.getElementById("freeModeStage");
    if (freeModeStage) {
      freeModeStage.classList.toggle("is-hidden", !canShowGame || !inCampusMap);
      if (inCampusMap) renderFreeModeStage();
    }
    renderProducerApartmentStage();
  }

  function applySelectStageBackground(idolName) {
    try {
      const selectVisual = document.querySelector(".select-visual");
      if (!selectVisual) return;

      // Find the currently active background element by ID
      let currentBg = document.getElementById("selectVisualBg");

      if (!idolName) {
        if (currentBg) {
          currentBg.classList.remove("has-image");
          selectVisual.classList.remove("has-hover-bg");
          // Keep it in DOM but clear it after fade out to allow reuse
          setTimeout(() => {
            if (!currentBg.classList.contains("has-image") && currentBg.parentNode) {
              currentBg.style.backgroundImage = "";
            }
          }, 400);
        }
        return;
      }

      const idolCode = selectBackgroundCodes[idolName] || affinityIdolCodes[idolName]?.toLowerCase();
      if (!idolCode) return;

      const extensions = [".png", ".jpg", ".jpeg"];
      const tryLoadImage = (extIndex) => {
        if (extIndex >= extensions.length) {
          const latestBg = document.getElementById("selectVisualBg");
          if (latestBg) {
            latestBg.classList.remove("has-image");
            selectVisual.classList.remove("has-hover-bg");
            setTimeout(() => {
              if (!latestBg.classList.contains("has-image") && latestBg.parentNode) {
                latestBg.style.backgroundImage = "";
              }
            }, 400);
          }
          return;
        }

        const ext = extensions[extIndex];
        const imgPath = `./assets/select-bg/${idolCode}${ext}`;
        const img = new Image();
        img.onload = () => {
          try {
            const activeHoverIdol = document.querySelector(".idol-card:hover");
            const hoveredName = activeHoverIdol ? activeHoverIdol.id.replace("idol-", "") : null;
            const currentExpected = hoveredName || selectedIdol;
            if (currentExpected === idolName) {
              const newBgUrl = `url("${imgPath}")`;

              // Query the LATEST active background node by ID right now
              const latestBg = document.getElementById("selectVisualBg");

              // Helper to normalize background URLs for comparison (ignoring relative/absolute differences)
              const normalizeBgUrl = (urlStr) => {
                if (!urlStr) return "";
                const match = urlStr.match(/\/assets\/select-bg\/[^\/)]+/i);
                return match ? match[0].toLowerCase() : urlStr;
              };

              const isSameImage = latestBg && normalizeBgUrl(latestBg.style.backgroundImage) === normalizeBgUrl(newBgUrl);

              if (!latestBg) {
                // If somehow no background element exists, create one
                const newBgEl = document.createElement("div");
                newBgEl.className = "select-visual-bg has-image";
                newBgEl.id = "selectVisualBg";
                newBgEl.style.backgroundImage = newBgUrl;
                selectVisual.insertBefore(newBgEl, selectVisual.firstChild);
                selectVisual.classList.add("has-hover-bg");
              } else if (!isSameImage) {
                // Create a new background element for cross-fade
                const newBgEl = document.createElement("div");
                newBgEl.className = "select-visual-bg";
                newBgEl.style.backgroundImage = newBgUrl;
                
                // Insert it immediately after the latest active one so it overlays on top
                selectVisual.insertBefore(newBgEl, latestBg.nextSibling);
                
                // Force reflow
                newBgEl.offsetHeight;
                
                // Fade in new image
                newBgEl.classList.add("has-image");
                selectVisual.classList.add("has-hover-bg");
                
                // Fade out old image
                latestBg.classList.remove("has-image");
                latestBg.id = ""; // Remove ID from old active
                newBgEl.id = "selectVisualBg"; // Set ID on new active
                
                // Remove old element after transition
                setTimeout(() => {
                  if (latestBg && latestBg.parentNode) {
                    latestBg.remove();
                  }
                }, 400);
              } else {
                latestBg.classList.add("has-image");
                selectVisual.classList.add("has-hover-bg");
              }
            }
          } catch (err) {
            console.error("Error in applySelectStageBackground onload:", err);
            showToast("背景加载处理错误", err.message, "error");
          }
        };
        img.onerror = () => {
          tryLoadImage(extIndex + 1);
        };
        img.src = imgPath;
      };
      tryLoadImage(0);
    } catch (err) {
      console.error("Error in applySelectStageBackground:", err);
      showToast("背景切换逻辑错误", err.message, "error");
    }
  }

  function updateSelectVisual(name) {
    const kicker = document.getElementById("selectKicker");
    const title = document.getElementById("selectTitle");
    const desc = document.getElementById("selectDesc");
    const rules = document.getElementById("selectRules");
    const confirmContainer = document.getElementById("selectConfirmContainer");
    const confirmBtn = document.getElementById("confirmIdolBtn");
    const bootActions = document.getElementById("selectBootActions");

    if (!name) {
      const copy = getLaunchSelectionCopy();
      if (kicker) kicker.textContent = copy.kicker;
      if (title) title.textContent = copy.title;
      if (desc) desc.textContent = copy.desc;
      if (rules) {
        if (copy.rules) {
          rules.style.display = "";
          rules.innerHTML = copy.rules.map((item) => `<span>${item}</span>`).join("");
        } else {
          rules.style.display = "";
          rules.innerHTML = `
          <span>3 次普通行动</span>
          <span>1 次额外行动</span>
          <span>1 次总结轮次</span>
          <span>随机互动事件</span>`;
        }
      }
      if (bootActions) bootActions.hidden = !shouldShowSelectionStage();
      if (confirmContainer) {
        confirmContainer.style.display = "none";
        confirmContainer.classList.remove("is-visible");
      }
      applySelectStageBackground(null);

      const selectPanel = document.getElementById("selectPanel");
      const producerPanel = document.getElementById("producerPanel");
      if (selectPanel) selectPanel.classList.remove("is-hidden");
      if (producerPanel) producerPanel.classList.add("is-hidden");
      return;
    }

    if (bootActions) bootActions.hidden = true;

    const profile = idols[name];
    if (!profile) return;

    if (kicker) kicker.textContent = profile.tag || "Hatsuboshi Produce";
    if (title) title.textContent = name;
    if (desc) desc.textContent = profile.bio || "（暂无简介，请在 app.js 中配置该偶像的 bio 字段）";
    if (rules) rules.style.display = "none";

    if (confirmContainer) {
      confirmContainer.style.display = "flex";
      confirmContainer.offsetHeight; // Force reflow
      confirmContainer.classList.add("is-visible");
    }

    if (confirmBtn) {
      confirmBtn.style.backgroundColor = profile.theme;
      confirmBtn.style.boxShadow = `0 8px 24px ${profile.theme}66`;
      const confirmLabel = confirmBtn.querySelector("span");
      if (confirmLabel) confirmLabel.textContent = getLaunchSelectionCopy().confirmLabel;
    }

    const prodStartBtn = document.getElementById("producerStartBtn");
    if (prodStartBtn) {
      prodStartBtn.style.backgroundColor = profile.theme;
      prodStartBtn.style.boxShadow = `0 8px 24px ${profile.theme}66`;
      const producerStartLabel = prodStartBtn.querySelector("span");
      if (producerStartLabel) producerStartLabel.textContent = getLaunchSelectionCopy().producerStartLabel;
    }

    applySelectStageBackground(name);
  }

  function getProduceDomRoot() {
    const overlayPage = document.getElementById("hatsu-st-page");
    if (overlayPage) {
      return overlayPage.querySelector(".produce-app") || overlayPage;
    }
    return document.querySelector(".produce-app") || document;
  }

  function queryProduce(selector) {
    return getProduceDomRoot().querySelector(selector);
  }

  function getIdolListElement() {
    return queryProduce("#selectionStage #idolList") || queryProduce("#idolList");
  }

  function renderIdols() {
    const list = getIdolListElement();
    if (!list) {
      console.warn("[Hatsu] idolList 未找到，无法渲染担当列表");
      return;
    }
    list.innerHTML = "";

    selectedIdol = null;
    updateSelectVisual(null);

    Object.entries(idols).forEach(([name, profile]) => {
      if (isSandboxLaunch() && !SANDBOX_SELECTABLE_IDOLS.includes(name)) return;
      const button = document.createElement("button");
      button.type = "button";
      button.id = `idol-${name}`;
      button.className = "idol-card";
      button.innerHTML = `
        <span class="idol-avatar" style="--avatar-color:${profile.theme}">
          <b aria-hidden="true">${name.slice(0, 1)}</b>
          <img src="${profile.avatar}" alt="" loading="lazy" decoding="async">
        </span>
        <span class="idol-card-copy"><strong>${name}</strong><span>${profile.tag}</span></span>
      `;
      const avatarImg = button.querySelector(".idol-avatar img");
      if (avatarImg) {
        avatarImg.addEventListener("error", (event) => {
          event.currentTarget.classList.add("is-missing");
        });
      }
      
      button.addEventListener("click", () => {
        if (selectedIdol === name) return;
        selectedIdol = name;

        document.querySelectorAll(".idol-card").forEach((card) => {
          card.classList.remove("is-selected");
          card.style.borderColor = "";
          card.style.boxShadow = "";
        });
        button.classList.add("is-selected");
        button.style.borderColor = profile.theme;
        button.style.boxShadow = `0 12px 28px ${profile.theme}40`;

        updateSelectVisual(name);
      });

      button.addEventListener("mouseenter", () => {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
          hoverTimeout = null;
        }
        updateSelectVisual(name);
      });
      button.addEventListener("mouseleave", () => {
        if (hoverTimeout) {
          clearTimeout(hoverTimeout);
        }
        hoverTimeout = setTimeout(() => {
          updateSelectVisual(selectedIdol);
          hoverTimeout = null;
        }, 50);
      });

      list.appendChild(button);
    });

    if (isSillyTavernHost()) {
      console.log("[Hatsu] renderIdols 完成，条目数：", list.childElementCount, "容器：", list.closest("#selectPanel")?.id || list.id);
    }
  }

  function applyIdolBackground(profile, gameStage) {
    const background = profile.background;
    const showDefaultScene = () => {
      gameStage.classList.remove("has-idol-background");
      gameStage.style.removeProperty("--idol-scene-image");
    };
    const showBackground = () => {
      gameStage.style.setProperty("--idol-scene-image", `url("${background}")`);
      gameStage.classList.add("has-idol-background");
    };

    showDefaultScene();
    if (!background) return;
    const status = idolBackgroundStatus.get(background);
    if (status === "ready") {
      showBackground();
      return;
    }
    if (status === "loading" || status === "missing") return;

    idolBackgroundStatus.set(background, "loading");
    const image = new Image();
    image.onload = () => {
      idolBackgroundStatus.set(background, "ready");
      if (idols[state.idol]?.background === background) showBackground();
    };
    image.onerror = () => {
      idolBackgroundStatus.set(background, "missing");
      if (idols[state.idol]?.background === background) showDefaultScene();
    };
    image.src = background;
  }

  function renderHud() {
    const profile = idols[state.idol];
    const gameStage = document.getElementById("gameStage");
    document.documentElement.style.setProperty("--idol-theme", profile.theme);
    applyIdolBackground(profile, gameStage);
    document.getElementById("daysLeftValue").textContent = daysLeft();
    document.getElementById("staminaValue").textContent = state.stamina;
    document.getElementById("staminaFill").style.width = `${clamp(state.stamina, 0, 100)}%`;
    document.getElementById("trustValue").textContent = state.trust;
    document.getElementById("stressValue").textContent = state.stress;
    const targetVo = document.getElementById("targetVo");
    const targetDa = document.getElementById("targetDa");
    const targetVi = document.getElementById("targetVi");
    if (targetVo) targetVo.textContent = state.threshold.Vo;
    if (targetDa) targetDa.textContent = state.threshold.Da;
    if (targetVi) targetVi.textContent = state.threshold.Vi;
    document.getElementById("currentIdolLabel").textContent = "当前担当";
    document.getElementById("idolName").textContent = state.idol;
    const phaseBadge = document.getElementById("phaseBadge");
    if (phaseBadge) {
      if (isHybridFacilityActive()) {
        const location = getWorldMapLocation(state.freeMode.facilityLocationId);
        const facilityLabel = state.freeMode.facilityKind === "lesson" ? "上课" : "训练";
        phaseBadge.textContent = `${location?.name || "设施"} · ${facilityLabel} · ${formatCampusDayLabel()} ${formatFreeModeClock()}`;
      } else {
        phaseBadge.textContent = getPhase();
      }
    }
    const badge = document.getElementById("affinityPendingBadge");
    if (badge) badge.textContent = String(pendingAffinityCount());
  }

  function renderStatMeters() {
    const container = document.getElementById("statMeters");
    container.innerHTML = "";
    ["Vo", "Da", "Vi"].forEach((key) => {
      const pct = clamp((state[key] / (state.cap[key] || 1)) * 100, 0, 100);
      const card = document.createElement("article");
      card.className = "meter-card";
      card.id = `meter-${key}`;
      card.style.setProperty("--meter-color", statColors[key]);
      card.style.setProperty("--meter-pct", String(pct));
      card.innerHTML = `
        <div class="meter-arc" data-rank="${rankFor(pct)}"></div>
        <div class="meter-value">${icon(statIcons[key])}<b>${state[key]}</b><small>/${state.cap[key]}</small></div>
        <div class="meter-growth">${state.growth[key]}%</div>
      `;
      container.appendChild(card);
    });
  }

  function rankFor(pct) {
    if (pct >= 78) return "SS";
    if (pct >= 62) return "S+";
    if (pct >= 46) return "S";
    if (pct >= 30) return "A";
    return "B";
  }

  function createActionButton(label, action, attribute, color, costText) {
    const button = document.createElement("button");
    button.className = "action-button";
    button.id = `action-${action}${attribute ? `-${attribute}` : ""}`;
    button.dataset.action = action;
    if (attribute) button.dataset.attribute = attribute;
    button.type = "button";
    button.style.setProperty("--action-color", color);
    const spBadge = action === "training" && state.sp?.[attribute] ? `<i class="sp-badge">SP</i>` : "";
    const costBadge = costText ? `<i class="cost-badge">${costText}</i>` : "";
    button.innerHTML = `${spBadge}${costBadge}${icon(actionIcons[action] || "book")}<span>${label}</span>`;
    return button;
  }

  function renderActionButtons() {
    const container = document.getElementById("actionButtons");
    container.innerHTML = "";
    const pendingAffinityThreshold = pendingAffinityActionThreshold();
    if (pendingAffinityThreshold) {
      const threshold = pendingAffinityThreshold;
      const node = affinityNodes[threshold];
      const costText = REQUIRED_BOND_THRESHOLDS.includes(Number(threshold)) ? "剧情日" : "剧情";
      container.appendChild(createActionButton(`好感度${threshold}羁绊`, "bond", null, "#ff4f9a", costText));
      container.appendChild(createActionButton("闲聊", "freechat", null, "#8c73ff", "行动0"));
      container.appendChild(createActionButton("互动", "interaction", null, "#ff783f", "行动0"));
      document.getElementById("actionModeLabel").textContent = REQUIRED_BOND_THRESHOLDS.includes(Number(threshold))
        ? `羁绊事件日：${node?.title || "羁绊事件"}`
        : `羁绊事件：${node?.title || "羁绊事件"}`;
      renderActionHighlights();
      return;
    }
    if (isHybridFacilityActive()) {
      const kind = state.freeMode.facilityKind;
      const location = getWorldMapLocation(state.freeMode.facilityLocationId);
      const facilityName = location?.name || "设施";
      const campusRemaining = getSandboxCampusRemaining();
      const campusExhausted = isSandboxCampusExhausted();
      if (kind === "lesson") {
        [
          ["Vo公开课", "Vo"],
          ["Da公开课", "Da"],
          ["Vi公开课", "Vi"]
        ].forEach(([label, attribute]) => {
          const button = createActionButton(label, "lesson", attribute, statColors[attribute], getHybridFacilityCostText(state.idol, "lesson"));
          if (campusExhausted) button.disabled = true;
          container.appendChild(button);
        });
      } else if (kind === "training") {
        [
          ["Vo训练", "Vo"],
          ["Da训练", "Da"],
          ["Vi训练", "Vi"]
        ].forEach(([label, attribute]) => {
          const button = createActionButton(label, "training", attribute, statColors[attribute], getHybridFacilityCostText(state.idol, "training"));
          if (campusExhausted) button.disabled = true;
          container.appendChild(button);
        });
      } else if (kind === "rest") {
        const button = createActionButton("休息恢复体力", "rest", null, "#20dfad", `+30体力 · ${STUDENT_DORMITORY_REST_MINUTES}分`);
        if (Number(state.stamina || 0) >= 100) button.disabled = true;
        container.appendChild(button);
      } else if (kind === "first_live") {
        container.appendChild(createActionButton("准备 First Live", "sandbox_first_live", null, "#ff4f9a", "专用流程"));
      }
      container.appendChild(createActionButton("返回地图", "campus_map_return", null, "#8c73ff", ""));
      const campusHint = campusRemaining !== null ? ` · 今日校园剩余 ${campusRemaining}/3` : "";
      const facilityLabels = { lesson: "上课", training: "训练", rest: "休息", first_live: "First Live" };
      const facilityLabel = facilityLabels[kind] || "设施";
      document.getElementById("actionModeLabel").textContent = `${facilityName} · ${facilityLabel}${kind === "rest" ? `（+30体力，${STUDENT_DORMITORY_REST_MINUTES} 分）` : kind === "first_live" ? `（${getSandboxFirstLiveChallengeStatusText()}）` : `（每次 +${HYBRID_FACILITY_ACTION_MINUTES} 分${campusHint}）`}`;
      renderActionHighlights();
      return;
    }
    if (state.liveReady) {
      container.appendChild(createActionButton(state.firstLive.completed ? "First Live已完成" : "开始First Live", "live", null, "#ff4f9a", state.firstLive.completed ? "已结算" : "最终考核"));
      if (isFreeModeUnlocked()) {
        container.appendChild(createActionButton("学园地图", "world_map", null, "#26a9f4", "自由探索"));
      }
      container.appendChild(createActionButton("闲聊", "freechat", null, "#8c73ff", "行动0"));
      container.appendChild(createActionButton("互动", "interaction", null, "#ff783f", "行动0"));
      document.getElementById("actionModeLabel").textContent = state.firstLive.completed
        ? (isFreeModeUnlocked()
          ? (state.firstLive.success ? "First Live 成功，可进入学园自由探索" : "First Live 已结束，可进入学园自由探索")
          : (state.firstLive.success ? "First Live成功，最终剧情已解锁" : "First Live结束，等待下一阶段"))
        : "最终日程：First Live";
      renderActionHighlights();
      return;
    }
    if (isSummaryRound()) {
      container.appendChild(createActionButton("今日总结", "day_summary", null, "#8c73ff", "占位"));
      container.appendChild(createActionButton("进入下一天", "next_day", null, "#ff4f9a", "推进日程"));
      document.getElementById("actionModeLabel").textContent = `第 ${state.day} 天总结轮次：整理今日进度，或进入下一天`;
      renderActionHighlights();
      return;
    }
    const actions = isExtraRound()
      ? [
          ["外出", "outing", null, "#20dfad", "体力+38"],
          ["交流", "companion", null, "#ff4f9a", "信赖+15"],
          ["亲密", "intimacy", null, "#f58ab5", isIntimacyUnlocked() ? "信赖+20" : "信赖60解锁"],
          ["闲聊", "freechat", null, "#8c73ff", "行动0"],
          ["互动", "interaction", null, "#ff783f", "行动0"]
        ]
      : [
          ["Vo公开课", "lesson", "Vo", statColors.Vo, getActionCostText(state.idol, "lesson")],
          ["Da公开课", "lesson", "Da", statColors.Da, getActionCostText(state.idol, "lesson")],
          ["Vi公开课", "lesson", "Vi", statColors.Vi, getActionCostText(state.idol, "lesson")],
          ["Vo训练", "training", "Vo", statColors.Vo, getActionCostText(state.idol, "training")],
          ["Da训练", "training", "Da", statColors.Da, getActionCostText(state.idol, "training")],
          ["Vi训练", "training", "Vi", statColors.Vi, getActionCostText(state.idol, "training")],
          ["休息", "rest", null, "#20dfad", getActionCostText(state.idol, "rest")],
          ["闲聊", "freechat", null, "#8c73ff", "行动0"],
          ["互动", "interaction", null, "#ff783f", "行动0"]
        ];
    actions.forEach(([label, action, attribute, color, cost]) => {
      const button = createActionButton(label, action, attribute, color, cost);
      if (action === "intimacy" && !isIntimacyUnlocked()) {
        button.title = `信赖值达到 ${INTIMACY_UNLOCK_TRUST} 后解锁亲密行动`;
        button.setAttribute("aria-label", `亲密，信赖值${INTIMACY_UNLOCK_TRUST}解锁`);
      }
      container.appendChild(button);
    });
    document.getElementById("actionModeLabel").textContent = isExtraRound()
      ? "请选择额外行动"
      : "请选择行动";
    const actionZone = document.getElementById("actionZone");
    if (actionZone) actionZone.classList.remove("is-summary-round");
    renderActionHighlights();
  }

  function renderActionHighlights() {
    const actionZone = document.getElementById("actionZone");
    if (actionZone) actionZone.classList.toggle("is-summary-round", isSummaryRound());
    document.querySelectorAll(".action-button").forEach((button) => {
      if (["day_summary", "next_day"].includes(button.dataset.action)) {
        button.disabled = !isSummaryRound();
      } else if (["freechat", "interaction"].includes(button.dataset.action)) {
        button.disabled = false;
      } else if (button.dataset.action === "bond") {
        button.disabled = !pendingAffinityActionThreshold();
      } else if (button.dataset.action === "live") {
        button.disabled = Boolean(state.firstLive.completed);
      } else if (button.dataset.action === "world_map") {
        button.disabled = !isFreeModeUnlocked();
      } else if (button.dataset.action === "campus_map_return") {
        button.disabled = false;
      } else if (button.dataset.action === "sandbox_first_live") {
        button.disabled = false;
      } else if (isHybridFacilityActive()) {
        const kind = state.freeMode.facilityKind;
        if (button.dataset.action === "lesson") {
          button.disabled = kind !== "lesson" || !hasEnoughStaminaForAction("lesson");
        } else if (button.dataset.action === "training") {
          button.disabled = kind !== "training" || !hasEnoughStaminaForAction("training");
        } else if (button.dataset.action === "rest") {
          button.disabled = kind !== "rest" || Number(state.stamina || 0) >= 100;
        }
      } else {
        button.disabled = Boolean(state.liveReady) || !isActionAvailable(button.dataset.action);
      }
    });
  }

  function shortAdvisor(text) {
    const compact = String(text).replace(/\s+/g, " ").trim();
    return compact.length > 56 ? `${compact.slice(0, 56)}...` : compact;
  }

  function renderNotebook() {
    document.getElementById("promptText").value = state.lastPrompt || "";
    document.getElementById("debugPanel").textContent = state.lastDebug || "尚未结算行动。";
    const list = document.getElementById("logList");
    list.innerHTML = "";
    if (!state.log.length) {
      const empty = document.createElement("div");
      empty.className = "log-item";
      empty.innerHTML = "<strong>暂无育成日志</strong><p>行动后会保存最近 24 条结算、叙事和随机事件摘要。</p>";
      list.appendChild(empty);
    } else {
      state.log.forEach((item, index) => {
        const node = document.createElement("div");
        node.className = "log-item";
        node.id = `log-entry-${index + 1}`;
        node.innerHTML = `<strong>Day ${item.day}-${item.round} / ${item.phase} / ${item.action}</strong><p>${item.result}</p>`;
        list.appendChild(node);
      });
    }
    switchPromptTab(activePromptTab);
  }

  function switchPromptTab(tab) {
    activePromptTab = promptPanels[tab] ? tab : "prompt";
    document.getElementById("drawerTitle").textContent = activePromptTab === "prompt" ? "提示词工作台" : activePromptTab === "log" ? "育成日志" : "结算明细";
    document.querySelectorAll(".tab-button").forEach((button) => {
      const active = button.dataset.tab === activePromptTab;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", String(active));
    });
    Object.entries(promptPanels).forEach(([key, id]) => {
      document.getElementById(id).classList.toggle("active", key === activePromptTab);
    });
  }

  function openNotebook(tab = "prompt") {
    switchPromptTab(tab);
    document.getElementById("notebookDrawer").hidden = false;
  }

  function isSillyTavernHost() {
    if (typeof window.SillyTavern !== 'undefined' || document.getElementById('hatsu-fullscreen-overlay') || window.isHatsuLoaderST) {
      return true;
    }
    try {
      if (window.parent && window.parent !== window && (window.parent.SillyTavern || window.parent.isHatsuLoaderST)) {
        return true;
      }
    } catch (e) {}
    return window.parent && window.parent !== window && new URLSearchParams(window.location.search).get("host") === "sillytavern";
  }

  function isSillyTavernHost() {
    if (typeof window.SillyTavern !== 'undefined' || document.getElementById('hatsu-fullscreen-overlay') || window.isHatsuLoaderST) {
      return true;
    }
    try {
      if (window.parent && window.parent !== window && (window.parent.SillyTavern || window.parent.isHatsuLoaderST)) {
        return true;
      }
    } catch (e) {}
    return window.parent && window.parent !== window && new URLSearchParams(window.location.search).get("host") === "sillytavern";
  }

  let chronicleCheckpointResolver = null;

  function getChronicleApi() {
    return globalThis.HatsuChronicle || null;
  }

  function extractSumFromReplySource(...sources) {
    const api = getChronicleApi();
    if (!api) return "";
    for (const source of sources) {
      const sum = api.extractSumText(source);
      if (sum) return sum;
    }
    return "";
  }

  function shouldPrepareDirectorDigestCandidate(acceptedRequest) {
    return Boolean(acceptedRequest);
  }

  function decideDirectorDigestAck(accepted, retry, isFinal) {
    if (!isFinal) return "retain";
    if (retry) return "discard";
    return accepted ? "commit" : "discard";
  }

  function getDirectorDigestParticipants() {
    const participants = new Set(["producer"]);
    const addIdol = (name) => {
      const normalized = canonicalIdolName(String(name || "").trim());
      if (normalized) participants.add(`idol:${normalized}`);
    };
    addIdol(state.idol);
    if (state.activeStoryNode?.type === "interaction") {
      (state.activeStoryNode.selectedCharacters || []).forEach(addIdol);
    }
    return [...participants];
  }

  function extractDirectorEvidenceFromReply(...sources) {
    const api = getChronicleApi();
    if (!api?.extractDirectorEvent) {
      return { evidenceQuality: "summary_only", signals: { facts: [], playerChoices: [], observations: [], hooksCreated: [], hooksResolved: [] } };
    }
    let fallback = null;
    for (const source of sources) {
      const parsed = api.extractDirectorEvent(source);
      if (parsed?.evidenceQuality === "structured") return parsed;
      if (!fallback) fallback = parsed;
    }
    return fallback || api.extractDirectorEvent("");
  }

  function preparePendingDirectorDigestCandidate(acceptedRequest, requestId, rawText, renderedText, text, messageId) {
    if (!shouldPrepareDirectorDigestCandidate(acceptedRequest) || !requestId) return false;
    const summary = extractSumFromReplySource(rawText, renderedText, text);
    if (!summary) return false;
    const evidence = extractDirectorEvidenceFromReply(rawText, renderedText, text);
    const messageNumber = Number(messageId);
    const activeTurn = state.harness?.activeTurn;
    const candidate = {
      id: `digest:${requestId}:${Number.isInteger(messageNumber) ? messageNumber : "request"}`,
      dayKey: getWorldFeedDayKey(),
      timeKey: isFreeModeActive() ? formatFreeModeClock() : `day-${state.day}-round-${state.round}`,
      locationId: String(state.pendingActionContext?.actionContext?.locationId || state.freeMode?.activeLocationId || ""),
      participants: getDirectorDigestParticipants(),
      summary,
      actionType: String(state.pendingActionContext?.action || state.activeStoryNode?.type || "narrative"),
      evidenceQuality: evidence.evidenceQuality,
      signals: evidence.signals,
      sourceTurnId: activeTurn?.requestId === requestId ? String(activeTurn.turnId || "") : "",
      sourceRequestId: String(requestId),
      sourceMessageId: Number.isInteger(messageNumber) && messageNumber >= 0 ? messageNumber : null,
      committedAt: Date.now()
    };
    pendingDirectorDigestCandidates.set(String(requestId), candidate);
    return true;
  }

  function discardPendingDirectorDigestCandidate(requestId) {
    return pendingDirectorDigestCandidates.delete(String(requestId || ""));
  }

  function commitPendingDirectorDigestCandidate(requestId) {
    const key = String(requestId || "");
    const candidate = pendingDirectorDigestCandidates.get(key);
    if (!candidate) return false;
    pendingDirectorDigestCandidates.delete(key);
    const api = globalThis.HatsuWorld?.directorState;
    if (!api || !state.freeMode?.world) return false;
    const director = api.ensureDirectorShape(state.freeMode.world.director, { recoverInterrupted: false });
    state.freeMode.world.director = director;
    const result = api.commitChronicleDigest(director, candidate);
    if (!result.committed) return false;
    saveState("director.digest_committed");
    return true;
  }

  function settlePendingDirectorDigestCandidate(requestId, accepted, retry, isFinal) {
    const action = decideDirectorDigestAck(accepted, retry, isFinal);
    if (action === "retain") return false;
    if (action === "discard") return discardPendingDirectorDigestCandidate(requestId);
    return commitPendingDirectorDigestCandidate(requestId);
  }
  function requestChronicleUpdate(rawText, renderedText, text, messageId) {
    if (!isSillyTavernHost()) return;
    const sum = extractSumFromReplySource(rawText, renderedText, text);
    if (!sum) return;
    const messageIdNum = Number(messageId);
    if (!Number.isInteger(messageIdNum) || messageIdNum < 0) return;
    debugHarnessEvent("chronicle.request", {
      messageId: messageIdNum,
      sumLength: sum.length,
      turnId: state.harness?.activeTurn?.turnId || ""
    });
    window.parent.postMessage({
      source: "hatsuboshi-produce",
      type: "updateChronicle",
      messageId: messageIdNum,
      sum
    }, "*");
  }

  function appendChronicleEmptyMessage(list, message) {
    const empty = document.createElement("p");
    empty.className = "chronicle-load-empty";
    empty.textContent = message;
    list.appendChild(empty);
  }

  function formatChronicleFloorLabel(messageId) {
    const floor = Number(messageId);
    return Number.isInteger(floor) ? `楼层 ${floor + 1}` : "楼层 ?";
  }

  function renderChronicleCheckpointList(checkpoints, error = "") {
    const list = document.getElementById("chronicleCheckpointList");
    if (!list) return;
    list.textContent = "";
    if (error) {
      appendChronicleEmptyMessage(list, error);
      return;
    }
    if (!Array.isArray(checkpoints) || checkpoints.length === 0) {
      appendChronicleEmptyMessage(list, "还没有可读的剧情摘要。继续游玩并等待 AI 输出 <sum> 后，这里会出现读档节点。");
      return;
    }
    checkpoints.forEach((item) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "chronicle-checkpoint-btn";
      const label = item.label || `节点 ${item.entryNo || "?"}`;
      const summary = String(item.summary || "");
      const title = document.createElement("strong");
      const body = document.createElement("span");
      const meta = document.createElement("em");
      title.textContent = label;
      body.textContent = summary;
      meta.textContent = formatChronicleFloorLabel(item.messageId);
      row.append(title, body, meta);
      row.addEventListener("click", () => renderChronicleBranchConfirm(item));
      list.appendChild(row);
    });
  }

  function renderChronicleBranchConfirm(item) {
    const list = document.getElementById("chronicleCheckpointList");
    if (!list) return;
    const messageId = Number(item?.messageId);
    if (!Number.isInteger(messageId) || messageId < 0) return;
    const floorLabel = formatChronicleFloorLabel(messageId);
    list.textContent = "";
    const panel = document.createElement("div");
    panel.className = "chronicle-confirm-panel";
    const title = document.createElement("strong");
    const note = document.createElement("p");
    const actions = document.createElement("div");
    const cancelBtn = document.createElement("button");
    const confirmBtn = document.createElement("button");
    title.textContent = `创建分支并回到 ${floorLabel}？`;
    note.textContent = "当前楼层之后的编年史摘要也会同步清理。";
    actions.className = "chronicle-confirm-actions";
    cancelBtn.type = "button";
    cancelBtn.className = "chronicle-confirm-btn";
    cancelBtn.textContent = "取消";
    cancelBtn.addEventListener("click", openChronicleLoadOverlay);
    confirmBtn.type = "button";
    confirmBtn.className = "chronicle-confirm-btn primary";
    confirmBtn.textContent = "确认读档";
    confirmBtn.addEventListener("click", () => requestChronicleBranch(messageId));
    actions.append(cancelBtn, confirmBtn);
    panel.append(title, note, actions);
    list.appendChild(panel);
  }
  function openChronicleLoadOverlay() {
    if (!isSillyTavernHost()) {
      showToast("仅酒馆可用", "读档需要 SillyTavern 酒馆助手与分支功能。", "warn");
      return;
    }
    setElementHidden("chronicleLoadOverlay", false);
    const list = document.getElementById("chronicleCheckpointList");
    if (list) {
      list.textContent = "";
      appendChronicleEmptyMessage(list, "正在扫描剧情摘要……");
    }
    const requestId = createRequestId();
    chronicleCheckpointResolver = { requestId };
    window.parent.postMessage({
      source: "hatsuboshi-produce",
      type: "listChronicleCheckpoints",
      requestId
    }, "*");
    window.setTimeout(() => {
      if (chronicleCheckpointResolver?.requestId !== requestId) return;
      chronicleCheckpointResolver = null;
      renderChronicleCheckpointList([], "扫描超时，请确认已安装酒馆助手。");
    }, 12000);
  }

  function closeChronicleLoadOverlay() {
    setElementHidden("chronicleLoadOverlay", true);
  }

  function requestChronicleBranch(messageId) {
    if (!isSillyTavernHost()) return;
    const id = Number(messageId);
    if (!Number.isInteger(id) || id < 0) return;
    const floorLabel = formatChronicleFloorLabel(id);
    closeChronicleLoadOverlay();
    showToast("正在读档", `正在创建分支并回到 ${floorLabel}……`, "gold");
    window.parent.postMessage({
      source: "hatsuboshi-produce",
      type: "branchToChronicleCheckpoint",
      messageId: id
    }, "*");
  }
  function requestHostCharacter() {
    if (!isSillyTavernHost()) return;
    window.parent.postMessage({
      source: "hatsuboshi-produce",
      type: "getCharacter"
    }, "*");
  }

  function requestHostStateSave(hostSaveSequence) {
    if (!isSillyTavernHost() || !hostStateReady || !activeHostSaveScope) return false;
    debugHarnessEvent("host-save.request", {
      scope: activeHostSaveScope,
      persistenceRevision: state.harness?.persistenceRevision || 0,
      hostSaveSequence: Number(hostSaveSequence) || 0
    });
    window.parent.postMessage({
      source: "hatsuboshi-produce",
      type: "saveState",
      saveScope: activeHostSaveScope,
      hostSaveSequence: Number(hostSaveSequence) || 0,
      state: clone(state)
    }, "*");
    return true;
  }

  let hostPromptSendSource = "general";
  let hostPromptSendSilent = false;

  function resetPhoneChatPendingState() {
    const phoneRequestId = String(state.phoneChat.pendingRequestId || "");
    state.phoneChat.isAwaitingReply = false;
    state.phoneChat.pendingRequestId = "";
    state.phoneChat.retryAvailable = false;
    if (pendingAiRequestId && pendingAiRequestId === phoneRequestId) {
      pendingAiRequestId = "";
    }
    aiReplyRetryCount = 0;
    setPhoneChatTyping(false);
    setPhoneChatComposerEnabled(true);
    updatePhoneChatRetryUi();
  }

  // 检测并修复“孤立”的私聊等待状态：例如 API 报错、手动调试跳过或页面重载后，
  // state.phoneChat.isAwaitingReply 被持久化为 true，但实际已没有在途请求
  // （模块级 pendingAiRequestId 丢失且没有逐条投递计时器）。此时小手机会永远停在
  // “正在输入中”且输入框被锁死，导致后续即使收到完整回复也无法继续。
  function reconcilePhoneChatPendingState() {
    if (!state.phoneChat?.isAwaitingReply) return false;
    const pending = String(state.phoneChat.pendingRequestId || "");
    const liveMatch = pending && pendingAiRequestId === pending;
    const deliveryActive = Boolean(phoneChatDeliveryTimer);
    if (liveMatch || deliveryActive) return false;

    state.phoneChat.isAwaitingReply = false;
    state.phoneChat.pendingRequestId = "";
    state.phoneChat.retryAvailable = Boolean(pending);
    phoneChatTypingVisible = false;
    aiReplyRetryCount = 0;
    if (state.activeStoryNode?.type === "phonechat") {
      state.activeStoryNode.ready = true;
      state.activeStoryNode = null;
    }
    return true;
  }

  function sendPhoneChatPromptToHost(promptText, requestId = pendingAiRequestId || createRequestId(), options) {
    const prevSource = hostPromptSendSource;
    hostPromptSendSource = "phonechat";
    const sent = requestHostPromptSend(promptText, requestId, options);
    hostPromptSendSource = prevSource;
    return sent;
  }

  function sendBroadcastPromptToHost(promptText, requestId = pendingAiRequestId || createRequestId(), options = {}) {
    const prevSource = hostPromptSendSource;
    const prevSilent = hostPromptSendSilent;
    hostPromptSendSource = "broadcast";
    hostPromptSendSilent = Boolean(options.silent);
    const sent = requestHostPromptSend(promptText, requestId, options);
    hostPromptSendSilent = prevSilent;
    hostPromptSendSource = prevSource;
    return sent;
  }

  function resetBroadcastPendingState() {
    if (state.freeMode?.world?.broadcast) {
      state.freeMode.world.broadcast.pendingRequestId = "";
    }
  }

  function requestHostPromptSend(promptText, requestId = pendingAiRequestId || createRequestId(), options) {
    options = options && typeof options === "object" ? options : {};
    const requestedLeaseId = String(options.channelLeaseId || "");
    const releasePreparedLease = (reason) => {
      if (requestedLeaseId) releasePrimaryModelChannel(requestId, requestedLeaseId, reason);
    };
    if (!isSillyTavernHost()) {
      releasePreparedLease("host_unavailable");
      return false;
    }
    const prompt = promptText || state.lastPrompt || document.getElementById("promptText").value || "";
    if (!prompt.trim()) {
      releasePreparedLease("empty_prompt");
      return false;
    }
    const source = hostPromptSendSource === "phonechat"
      ? "phonechat"
      : hostPromptSendSource === "broadcast"
        ? "broadcast"
        : "general";
    let owner = getPrimaryModelChannelOwner();
    if (requestedLeaseId) {
      if (!isPrimaryModelLeaseCurrent(requestId, requestedLeaseId)) {
        return rejectPrimaryModelDispatch(owner, {
          requestId,
          ownerKind: options.ownerKind || "legacy_main",
          silent: hostPromptSendSilent
        });
      }
    } else {
      const acquired = tryAcquirePrimaryModelChannel({
        requestId,
        ownerKind: options.ownerKind || (source === "phonechat" ? "phone_chat" : source === "broadcast" ? "broadcast" : "legacy_main"),
        turnId: options.turnId || "",
        saveScope: activeHostSaveScope,
        sessionEpoch: runtimeSessionEpoch
      });
      if (!acquired.ok) {
        pendingAiRequestId = String(acquired.blockingOwner?.requestId || pendingAiRequestId || "");
        return rejectPrimaryModelDispatch(acquired.blockingOwner, {
          requestId,
          ownerKind: options.ownerKind || "legacy_main",
          silent: hostPromptSendSilent
        });
      }
      owner = acquired.owner;
    }
    if (source !== "phonechat" && state.activeStoryNode?.type === "phonechat") {
      state.activeStoryNode = null;
      resetPhoneChatPendingState();
    }
    if (source !== "broadcast" && state.activeStoryNode?.type === "broadcast") {
      state.activeStoryNode = null;
      resetBroadcastPendingState();
    }
    const promptKey = [
      String(requestId || ""),
      String(prompt.length),
      prompt.slice(0, 320),
      prompt.slice(-320)
    ].join("::");
    const now = Date.now();
    for (let index = recentHostPromptDispatches.length - 1; index >= 0; index -= 1) {
      const entry = recentHostPromptDispatches[index];
      if (!entry || now - entry.time > 120000) recentHostPromptDispatches.splice(index, 1);
    }
    if (recentHostPromptDispatches.some((entry) => entry.key === promptKey)) {
      releasePrimaryModelChannel(owner.requestId, owner.channelLeaseId, "duplicate_dispatch");
      aiBridgeDebug.lastMessage = "重复发送已拦截：同一 requestId 的同一提示词刚刚发送过";
      refreshVnDebugView();
      if (!hostPromptSendSilent) {
        showToast("重复发送已拦截", "同一提示词刚刚已交给酒馆，请等待回复或重新生成。", "warn");
      }
      return false;
    }
    recentHostPromptDispatches.push({ key: promptKey, time: now });
    if (recentHostPromptDispatches.length > 24) recentHostPromptDispatches.shift();
    pendingAiRequestId = requestId;
    aiReplyRetryCount = 0;
    recordDebugPromptDispatch(prompt, requestId);
    aiBridgeDebug.lastMessage = "已向 SillyTavern 发送提示词";
    refreshVnDebugView();
    saveState();
    debugHarnessEvent("prompt.send", {
      requestId,
      turnId: state.harness?.activeTurn?.turnId || "",
      promptLength: prompt.length
    });
    const generationMode = String(options.generationMode || "shujuku_same_layer");
    const ownerKind = String(options.ownerKind || owner.ownerKind || "legacy_main");
    const turnId = String(options.turnId || owner.turnId || "");
    const saveScope = String(owner.saveScope || activeHostSaveScope || "");
    window.parent.postMessage({
      source: "hatsuboshi-produce",
      type: "sendPrompt",
      requestId,
      channelLeaseId: owner.channelLeaseId,
      saveScope,
      ownerKind,
      generationMode,
      turnId,
      prompt
    }, "*");
    if (!hostPromptSendSilent) {
      showToast("已交给酒馆", "提示词已发送到 SillyTavern 当前对话。", "gold");
    }
    return true;
  }
  function requestHostRegeneration(requestId, options) {
    options = options && typeof options === "object" ? options : {};
    if (!isSillyTavernHost() || !requestId) return false;
    let owner = getPrimaryModelChannelOwner();
    const requestedLeaseId = String(options.channelLeaseId || "");
    if (requestedLeaseId) {
      if (!isPrimaryModelLeaseCurrent(requestId, requestedLeaseId)) {
        return rejectPrimaryModelDispatch(owner, { requestId, ownerKind: options.ownerKind || "legacy_main" });
      }
    } else {
      const acquired = tryAcquirePrimaryModelChannel({
        requestId,
        ownerKind: options.ownerKind || "legacy_main",
        turnId: options.turnId || "",
        saveScope: activeHostSaveScope,
        sessionEpoch: runtimeSessionEpoch
      });
      if (!acquired.ok) {
        pendingAiRequestId = String(acquired.blockingOwner?.requestId || pendingAiRequestId || "");
        return rejectPrimaryModelDispatch(acquired.blockingOwner, { requestId, ownerKind: options.ownerKind || "legacy_main" });
      }
      owner = acquired.owner;
    }
    pendingAiRequestId = requestId;
    window.parent.postMessage({
      source: "hatsuboshi-produce",
      type: "regenerate",
      requestId,
      channelLeaseId: owner.channelLeaseId
    }, "*");
    return true;
  }
  function applyHostCharacter(character, saveScope = "", savedState = null, hasSavedState = false) {
    if (!character?.name) return;
    const incomingScope = String(saveScope || "");
    const isSameActiveScope = Boolean(incomingScope)
      && (incomingScope === activeHostSaveScope
        || activeStorageKey === storageKeyForScope(incomingScope));
    if (isSameActiveScope) {
      activeHostSaveScope = incomingScope;
      hostStateReady = true;
      state.boundCharacter = {
        name: String(character.name),
        avatar: character.avatar ? String(character.avatar) : ""
      };
      return;
    }
    const previousOwner = getPrimaryModelChannelOwner();
    if (previousOwner && previousOwner.saveScope !== incomingScope) {
      if (pendingAiRequestId === previousOwner.requestId) pendingAiRequestId = "";
      releasePrimaryModelChannel(previousOwner.requestId, previousOwner.channelLeaseId, "save_scope_changed");
    }
    const previousSecondaryOwner = getSecondaryModelChannelOwner();
    if (previousSecondaryOwner && previousSecondaryOwner.saveScope !== incomingScope) {
      releaseSecondaryModelChannel(previousSecondaryOwner.jobId, previousSecondaryOwner.requestId, previousSecondaryOwner.saveScope, "save_scope_changed");
    }
    hostStateReady = false;
    activeHostSaveScope = "";
    const switched = switchStorageScope(incomingScope);
    const localState = state;
    const resolution = resolveHostState(hasSavedState ? savedState : null, localState);
    if (resolution.source === "remote") {
      state = { ...clone(baseState), ...clone(resolution.state) };
      ensureStateShape({ recoverDirectorAttempt: true });
      if (state.uiVersion !== UI_VERSION || (state.idol && !idols[state.idol])) {
        state = clone(baseState);
        ensureStateShape();
      }
    }
    activeHostSaveScope = incomingScope;
    hostStateReady = Boolean(activeHostSaveScope);
    state.boundCharacter = {
      name: String(character.name),
      avatar: character.avatar ? String(character.avatar) : ""
    };
    const characterIdol = canonicalIdolName(character.name);
    if (!state.idol && idols[characterIdol]) {
      applyIdolPreset(characterIdol, true);
      startOpeningStory("ST角色卡自动绑定");
      return;
    }
    if (resolution.source === "empty") {
      localStorage.setItem(activeStorageKey, JSON.stringify(state));
    } else {
      saveState();
    }
    render();
    requestAnimationFrame(() => maybeShowHarnessRecoveryPrompt());
    resumeOpeningIfNeeded();
    const syncTitle = resolution.source === "remote"
      ? "已载入共享存档"
      : resolution.shouldMigrate
        ? "已迁移本地存档"
        : switched ? "已切换对话存档" : "已绑定角色卡";
    showToast(syncTitle, `当前角色卡：${state.boundCharacter.name}`, "info");
  }

  function closeNotebook() {
    setElementHidden("notebookDrawer", true);
  }

  function openAiPromptOverlay(note) {
    document.getElementById("aiPromptPhaseBadge").textContent = getPhase();
    const noteNode = document.querySelector(".ai-prompt-note");
    if (noteNode && note) noteNode.textContent = note;
    document.getElementById("aiPromptTextarea").value = state.lastPrompt || "";
    setElementHidden("aiPromptOverlay", false);
    document.getElementById("aiPromptTextarea").focus();
  }

  function resumeOpeningIfNeeded() {
    if (!state.idol || state.affinity.openingComplete) return;
    markAffinityUnlocked(0);
    if (!state.activeStoryNode) state.activeStoryNode = { type: "affinity", threshold: 0, ready: false };
    if (!state.lastPrompt) state.lastPrompt = buildOpeningPrompt();
    saveState();
    openEventOverlay("好感度 0：担当开场", "开场剧情尚未确认。", state.lastStory || "请生成并阅读担当开场后开始育成。");
  }

  function closeAiPromptOverlay() {
    setElementHidden("aiPromptOverlay", true);
  }

  function openFreeChatOverlay() {
    document.getElementById("freeChatPhaseBadge").textContent = getPhase();
    document.getElementById("freeChatTextarea").value = "";
    setElementHidden("freeChatOverlay", false);
    document.getElementById("freeChatTextarea").focus();
  }

  function closeFreeChatOverlay() {
    setElementHidden("freeChatOverlay", true);
  }

  function closeFreeChatOverlay() {
    setElementHidden("freeChatOverlay", true);
  }

  const daySummaryRadarAxes = [
    { key: "Vo", label: "歌唱技巧" },
    { key: "Vi", label: "表现技巧" },
    { key: "trust", label: "自信" },
    { key: "stamina", label: "体力" },
    { key: "Da", label: "舞蹈技巧" }
  ];

  function formatIdolDisplayName(name) {
    const text = String(name || "").trim();
    if (text.length <= 2) return text;
    return `${text.slice(0, 2)} ${text.slice(2)}`;
  }

  function getIdolSchoolClass(idolName) {
    const canonical = canonicalIdolName(idolName);
    return idolSchoolClasses[canonical] || "—";
  }

  function statToRadarPercent(key) {
    if (key === "stamina" || key === "trust") {
      return clamp(Number(state[key] || 0), 0, 100);
    }
    const cap = Number(state.cap?.[key] || 1);
    return clamp((Number(state[key] || 0) / cap) * 100, 0, 100);
  }

  function radarVertex(cx, cy, radius, index, total = 5) {
    const angle = ((Math.PI * 2 * index) / total) - (Math.PI / 2);
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    };
  }

  function radarPolygonPoints(values, cx, cy, maxRadius) {
    return values.map((value, index) => {
      const point = radarVertex(cx, cy, maxRadius * (clamp(value, 0, 100) / 100), index, values.length);
      return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    }).join(" ");
  }

  const daySummaryViewIds = {
    overlay: {
      avatar: "daySummaryAvatar",
      schedule: "daySummarySchedule",
      name: "daySummaryName",
      dayValue: "daySummaryDayValue",
      radarGrid: "daySummaryRadarGrid",
      radarLabels: "daySummaryRadarLabels",
      radarShape: "daySummaryRadarShape",
      notes: "daySummaryNotes",
      radarFill: "daySummaryRadarFill"
    }
  };

  function renderDaySummaryRadar(viewKey = "overlay") {
    const ids = daySummaryViewIds[viewKey] || daySummaryViewIds.overlay;
    const grid = document.getElementById(ids.radarGrid);
    const labels = document.getElementById(ids.radarLabels);
    const shape = document.getElementById(ids.radarShape);
    if (!grid || !labels || !shape) return;

    const cx = 160;
    const cy = 150;
    const maxRadius = 88;
    const values = daySummaryRadarAxes.map((axis) => statToRadarPercent(axis.key));

    grid.innerHTML = [0.25, 0.5, 0.75, 1].map((level) => {
      const points = radarPolygonPoints(daySummaryRadarAxes.map(() => level * 100), cx, cy, maxRadius);
      return `<polygon class="day-summary-radar-grid" points="${points}"></polygon>`;
    }).join("");

    shape.setAttribute("points", radarPolygonPoints(values, cx, cy, maxRadius));
    shape.setAttribute("fill", `url(#${ids.radarFill})`);

    labels.innerHTML = daySummaryRadarAxes.map((axis, index) => {
      const anchor = radarVertex(cx, cy, maxRadius + 22, index, daySummaryRadarAxes.length);
      const align = index === 0 ? "middle" : index === 1 || index === 2 ? "start" : index === 4 ? "end" : "middle";
      const dx = index === 1 ? 6 : index === 2 ? 8 : index === 4 ? -8 : index === 3 ? -8 : 0;
      const dy = index === 0 ? -6 : index === 3 || index === 4 ? 10 : 4;
      return `<text x="${(anchor.x + dx).toFixed(1)}" y="${(anchor.y + dy).toFixed(1)}" text-anchor="${align}">${axis.label}</text>`;
    }).join("");
  }

  function getDaySummaryDisplayLines() {
    const summary = state.dailySummary || {};
    const sameDay = Number(summary.day) === Number(state.day);
    const lines = [summary.intro, summary.status, summary.producer].filter(Boolean);
    if (sameDay && summary.complete) {
      return lines;
    }
    if (sameDay && lines.length) {
      return [
        ...lines,
        "今日总结尚未完整，缺少必要段落。可在第四轮额外行动的事件面板重新生成该次回复。"
      ];
    }
    return [
      "今日总结尚未生成。",
      "请先完成第四轮额外行动，并等待 AI 在行动收尾回复中写入【今日总结开始】…【今日总结结束】。",
      "总结应包含：角色介绍、当前状态评估、制作人视角的下一步问题。"
    ];
  }

  function renderDaySummaryNotes(lines, viewKey = "overlay") {
    const ids = daySummaryViewIds[viewKey] || daySummaryViewIds.overlay;
    const container = document.getElementById(ids.notes);
    if (!container) return;
    const displayLines = Array.isArray(lines) ? lines : getDaySummaryDisplayLines();
    container.innerHTML = displayLines.map((line) => `<p class="day-summary-line">${line}</p>`).join("");
  }

  function renderDaySummaryView(viewKey = "overlay") {
    const ids = daySummaryViewIds[viewKey] || daySummaryViewIds.overlay;
    const profile = idols[state.idol] || {};
    const avatar = document.getElementById(ids.avatar);
    const schedule = document.getElementById(ids.schedule);
    const name = document.getElementById(ids.name);
    const dayValue = document.getElementById(ids.dayValue);

    if (avatar) {
      avatar.src = profile.avatar || "";
      avatar.alt = state.idol ? `${state.idol}头像` : "担当头像";
    }
    if (schedule) {
      schedule.textContent = getIdolSchoolClass(state.idol);
    }
    if (dayValue) {
      dayValue.textContent = String(state.day || 1);
    }
    if (name) {
      name.textContent = formatIdolDisplayName(state.idol || "未选择");
    }

    renderDaySummaryRadar(viewKey);
    renderDaySummaryNotes(undefined, viewKey);
  }

  function renderDaySummary() {
    renderDaySummaryView("overlay");
  }

  function openDaySummaryOverlay() {
    if (isProducerApartmentActive()) {
      openFreeModeEveningSummary();
      return;
    }
    renderDaySummary();
    setElementHidden("daySummaryOverlay", false);
  }

  function closeDaySummaryOverlay() {
    document.getElementById("daySummaryOverlay")?.classList.remove("is-evening-mode");
    const closeBtn = document.getElementById("daySummaryCloseBtn");
    if (closeBtn) closeBtn.textContent = "返回总结轮次";
    setElementHidden("daySummaryOverlay", true);
  }

  function escapePhoneText(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatPhoneClock(date = new Date()) {
    if (isFreeModeActive() && Number.isFinite(Number(state.freeMode?.clockMinutes))) {
      return formatFreeModeClock(state.freeMode.clockMinutes);
    }
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function phoneChatMessageId() {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function getPhoneProducerLabel() {
    const name = String(state.producer?.name || "").trim();
    if (!name || name === "{{user}}") return "制作人";
    return name;
  }

  function formatPhoneHomeDate(date = new Date()) {
    const weekdays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    return `${date.getMonth() + 1}月${date.getDate()}日 ${weekdays[date.getDay()]}`;
  }

  function setPhoneStatusBarMode(mode) {
    const bar = document.getElementById("phoneStatusBar");
    if (!bar) return;
    bar.classList.toggle("is-home", mode === "home");
    bar.classList.toggle("is-line", mode === "line");
    bar.classList.toggle("is-music", mode === "music");
    bar.classList.toggle("is-broadcast", mode === "broadcast");
    bar.classList.toggle("is-sns", mode === "sns");
    bar.classList.toggle("is-world-engine", mode === "world-engine");
  }

  function setPhoneNavBarVisible(visible) {
    const bar = document.getElementById("phoneNavBar");
    if (bar) bar.hidden = !visible;
  }

  // 底部功能栏“返回”：按当前所在的 app / 子视图逐级回退，最后回到主屏幕。
  function phoneNavBack() {
    const worldEngineApp = document.getElementById("phoneWorldEngineApp");
    if (worldEngineApp && !worldEngineApp.hidden) {
      const settingsView = document.getElementById("worldEngineSettingsView");
      if (settingsView && !settingsView.hidden) {
        closeWorldEngineAdvancedSettings();
        return;
      }
      showPhoneHomeView();
      return;
    }
    const snsApp = document.getElementById("phoneSnsApp");
    if (snsApp && !snsApp.hidden) {
      showPhoneHomeView();
      return;
    }
    const broadcastApp = document.getElementById("phoneBroadcastApp");
    if (broadcastApp && !broadcastApp.hidden) {
      showPhoneHomeView();
      return;
    }
    const musicApp = document.getElementById("phoneMusicApp");
    if (musicApp && !musicApp.hidden) {
      const now = document.getElementById("phoneMusicNow");
      if (now && now.classList.contains("open")) { closeMusicNow(); return; }
      showPhoneHomeView();
      return;
    }
    const lineApp = document.getElementById("phoneLineApp");
    if (lineApp && !lineApp.hidden) {
      const chat = document.getElementById("phoneLineChatView");
      const addFriend = document.getElementById("phoneLineAddFriendView");
      if ((chat && !chat.hidden) || (addFriend && !addFriend.hidden)) {
        showPhoneListView();
        return;
      }
      showPhoneHomeView();
      return;
    }
    showPhoneHomeView();
  }

  function renderPhoneHomeAppIcon(app) {
    const gradient = String(app.theme || "").includes("gradient");
    const badgeStyle = gradient
      ? `style="background: ${app.theme}"`
      : `style="--app-color: ${app.theme}"`;
    return `
      <button type="button" class="phone-app-icon" data-phone-app="${app.id}" role="listitem">
        <span class="phone-app-icon-badge" ${badgeStyle}>${escapePhoneText(app.iconText)}</span>
        ${getStorytellerPhoneBadgeState(app.id) ? '<span class="phone-app-notification-dot" aria-label="有待处理事件"></span>' : ""}
        <span class="phone-app-icon-label">${escapePhoneText(app.name)}</span>
      </button>
    `;
  }

  function getStorytellerPhoneBadgeState(appId) {
    if (!["sns", "world-engine"].includes(appId)) return false;
    const api = globalThis.HatsuWorldStorytellerNotifications;
    const candidate = state.freeMode?.world?.storyteller?.pendingCandidate;
    if (!api?.getNotificationBadgeState || !candidate) return false;
    const worldMinute = api.buildStorytellerWorldMinute({ dayOrdinal: Number(state.freeMode?.postLiveDay || state.day || 0), clockMinutes: Number(state.freeMode?.clockMinutes || 0) });
    return Boolean(api.getNotificationBadgeState(candidate, worldMinute).visible);
  }

  function renderPhoneHome() {
    const grid = document.getElementById("phoneAppGrid");
    const dock = document.getElementById("phoneDockApps");
    const date = document.getElementById("phoneHomeDate");
    if (date) date.textContent = formatPhoneHomeDate();
    renderPhoneStatusBar();

    const installedApps = phoneAppRegistry.filter((app) => app.installed);
    const appIcons = installedApps.map(renderPhoneHomeAppIcon).join("");
    const emptySlot = `
      <div class="phone-app-slot phone-app-slot-empty" aria-hidden="true">
        <span class="phone-app-slot-badge">+</span>
        <span class="phone-app-icon-label">添加应用</span>
      </div>
    `;
    if (grid) grid.innerHTML = `${appIcons}${emptySlot}`;
    if (dock) dock.innerHTML = installedApps.slice(0, 4).map(renderPhoneHomeAppIcon).join("");
  }

  function showPhoneLineAppShell() {
    setElementHidden("phoneHomeView", true);
    setElementHidden("phoneMusicApp", true);
    setElementHidden("phoneBroadcastApp", true);
    setElementHidden("phoneSnsApp", true);
    setElementHidden("phoneWorldEngineApp", true);
    setElementHidden("phoneLineApp", false);
    setPhoneStatusBarMode("line");
    setPhoneNavBarVisible(true);
  }

  function showPhoneHomeView() {
    ensureStateShape();
    state.phoneChat.activeView = "home";
    state.phoneChat.activeThreadId = "";
    setElementHidden("phoneLineApp", true);
    setElementHidden("phoneMusicApp", true);
    setElementHidden("phoneBroadcastApp", true);
    setElementHidden("phoneSnsApp", true);
    setElementHidden("phoneWorldEngineApp", true);
    setElementHidden("phoneHomeView", false);
    setPhoneStatusBarMode("home");
    setPhoneNavBarVisible(false);
    renderPhoneHome();
  }

  function openPhoneLineApp() {
    showPhoneLineAppShell();
    showPhoneListView();
  }

  function launchPhoneApp(appId) {
    const app = phoneAppRegistry.find((entry) => entry.id === appId && entry.installed);
    if (!app) return;
    if (appId === "line") {
      openPhoneLineApp();
    } else if (appId === "music") {
      openPhoneMusicApp();
    } else if (appId === "broadcast") {
      openPhoneBroadcastApp();
    } else if (appId === "sns") {
      openPhoneSnsApp();
    } else if (appId === "world-engine") {
      openPhoneWorldEngineApp();
    }
  }

  // ===== 小手机 · 音乐播放器 =====
  const PHONE_MUSIC_LIKED_KEY = "hatsu_phone_music_liked_v1";
  const PHONE_MUSIC_PALETTE = [
    ["#7b4dff", "#3a1d6e"], ["#ff7ab8", "#7a2f5e"], ["#2fd4c9", "#155e66"],
    ["#ff5a3c", "#7a1f2e"], ["#5aa9ff", "#1f3a7a"], ["#ffc24d", "#7a4f15"],
    ["#ff4f9a", "#3a1d6e"], ["#9d7bff", "#2a1f5e"], ["#4ade80", "#155e3a"]
  ];
  const musicTracks = phoneMusicTracks.map((t, i) => ({ ...t, _pal: PHONE_MUSIC_PALETTE[i % PHONE_MUSIC_PALETTE.length] }));
  let musicLikedSet = loadMusicLiked();
  let musicCur = -1;
  let musicPlaying = false;
  let musicShuffle = false;
  let musicRepeat = false;
  let musicFilter = "all";
  let musicQueue = [];
  let musicQueuePos = -1;
  let musicInited = false;
  let musicAudioEl = null;

  function loadMusicLiked() {
    try { return new Set(JSON.parse(localStorage.getItem(PHONE_MUSIC_LIKED_KEY) || "[]")); }
    catch (error) { return new Set(); }
  }
  function saveMusicLiked() {
    try { localStorage.setItem(PHONE_MUSIC_LIKED_KEY, JSON.stringify([...musicLikedSet])); }
    catch (error) { /* 忽略存储失败 */ }
  }
  function musicTrackKey(t) { return t.file; }
  function isMusicLiked(i) { return musicLikedSet.has(musicTrackKey(musicTracks[i])); }
  function musicCoverCss(t) { return `background:linear-gradient(150deg, ${t._pal[0]}, ${t._pal[1]});`; }
  function musicInitial(t) { return String(t.title || "?").trim().charAt(0).toUpperCase(); }
  function musicCoverInner(t) {
    const span = `<span>${escapePhoneText(musicInitial(t))}</span>`;
    if (!t.cover) return span;
    return `<img src="${musicUrl(t.cover)}" alt="" loading="lazy" onerror="this.remove()">${span}`;
  }
  function musicFmt(s) {
    if (!Number.isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
  }
  function musicLikedIndices() { return musicTracks.map((_, i) => i).filter((i) => isMusicLiked(i)); }
  function musicViewIndices() { return musicFilter === "liked" ? musicLikedIndices() : musicTracks.map((_, i) => i); }

  function ensureMusicAudio() {
    if (!musicAudioEl) musicAudioEl = document.getElementById("phoneMusicAudio");
    return musicAudioEl;
  }

  function openPhoneMusicApp() {
    setElementHidden("phoneHomeView", true);
    setElementHidden("phoneLineApp", true);
    setElementHidden("phoneBroadcastApp", true);
    setElementHidden("phoneSnsApp", true);
    setElementHidden("phoneWorldEngineApp", true);
    setElementHidden("phoneMusicApp", false);
    setPhoneStatusBarMode("music");
    setPhoneNavBarVisible(true);
    if (!musicInited) {
      musicInited = true;
      bindPhoneMusicEvents();
    }
    closeMusicNow();
    renderMusicLibrary();
  }

  // ===== 小手机 · 初星广播部 =====
  const BROADCAST_HOST_NAME = "真城优";
  const BROADCAST_HOST_ROMAN = "Mashiro Yu";
  const BROADCAST_HOST_AVATAR = "./assets/avatars/mashiro-yu.png";
  let broadcastScriptLoading = false;
  let broadcastActiveTab = "outline";
  let broadcastInited = false;

  function broadcastAvatarInner(name, avatarPath, fallbackChar) {
    if (avatarPath) {
      return `<img class="broadcast-avatar-img" src="${escapePhoneText(avatarPath)}" alt="" loading="lazy" />`;
    }
    return `<span class="broadcast-avatar-fallback" aria-hidden="true">${escapePhoneText(fallbackChar || (name || "?").slice(0, 1))}</span>`;
  }

  function broadcastIdolAvatarPath(idolName) {
    const canonical = canonicalIdolName(idolName);
    const profile = idols[canonical] || idols[idolName] || {};
    return profile.avatar || "";
  }

  function renderBroadcastHostAvatar() {
    const slot = document.getElementById("phoneBroadcastHostAvatar");
    const nameEl = document.getElementById("phoneBroadcastHostName");
    const romanEl = document.getElementById("phoneBroadcastHostRoman");
    if (nameEl) nameEl.textContent = BROADCAST_HOST_NAME;
    if (romanEl) romanEl.textContent = BROADCAST_HOST_ROMAN;
    if (!slot) return;
    slot.innerHTML = broadcastAvatarInner(BROADCAST_HOST_NAME, BROADCAST_HOST_AVATAR, "优");
    slot.classList.add("is-host");
  }

  function renderBroadcastGuestAvatars(guests) {
    const avatarsEl = document.getElementById("phoneBroadcastGuestAvatars");
    const namesEl = document.getElementById("phoneBroadcastGuestNames");
    const guestList = Array.isArray(guests) ? guests.filter(Boolean) : [];

    if (namesEl) {
      namesEl.textContent = guestList.length ? guestList.join("、") : "本期暂无来访嘉宾";
    }
    if (!avatarsEl) return;

    if (!guestList.length) {
      avatarsEl.innerHTML = `
        <div class="broadcast-avatar-frame is-empty" title="暂无嘉宾">
          ${broadcastAvatarInner("", "", "—")}
        </div>`;
      return;
    }

    avatarsEl.innerHTML = guestList.slice(0, 3).map((guest) => {
      const path = broadcastIdolAvatarPath(guest);
      return `
        <div class="broadcast-avatar-frame is-guest" title="${escapePhoneText(guest)}">
          ${broadcastAvatarInner(guest, path, guest.slice(0, 1))}
        </div>`;
    }).join("");
  }

  function setBroadcastActiveTab(tabId) {
    broadcastActiveTab = tabId === "script" || tabId === "history" ? tabId : "outline";
    document.querySelectorAll("#phoneBroadcastTabs .broadcast-tab").forEach((btn) => {
      const active = btn.dataset.broadcastTab === broadcastActiveTab;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll("#phoneBroadcastApp .broadcast-panel").forEach((panel) => {
      const active = panel.dataset.broadcastPanel === broadcastActiveTab;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  function bindPhoneBroadcastEvents() {
    document.getElementById("phoneBroadcastTabs")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-broadcast-tab]");
      if (!btn) return;
      setBroadcastActiveTab(btn.dataset.broadcastTab);
    });
  }

  function isBroadcastAutoFullScriptEnabled() {
    return state.freeMode?.world?.broadcast?.autoFullScript !== false;
  }

  function syncBroadcastLoadingState() {
    const pendingId = String(state.freeMode?.world?.broadcast?.pendingRequestId || "");
    const episode = state.freeMode?.world?.broadcast?.today;
    broadcastScriptLoading = Boolean(pendingId) && episode?.scriptStatus === "generating";
  }

  function maybeAutoRequestBroadcastFullScript(reason = "auto") {
    if (!isPhoneWorldFeedUnlocked() || !isBroadcastAutoFullScriptEnabled()) return false;
    if (isSandboxLaunch() && isSandboxScoutPhase()) return false;
    syncBroadcastLoadingState();
    const episode = state.freeMode?.world?.broadcast?.today;
    if (!episode || episode.fullScript || broadcastScriptLoading || episode.scriptStatus === "generating") {
      return false;
    }
    if (!isSillyTavernHost()) {
      episode.scriptStatus = "skipped";
      saveState();
      return false;
    }
    return requestBroadcastFullScript({ silent: true, auto: true, reason });
  }

  function getBroadcastEpisode() {
    ensureStateShape();
    const world = state.freeMode?.world;
    if (!world?.broadcast?.today && isPhoneWorldFeedUnlocked()) {
      ensurePhoneWorldFeedReady();
    }
    return world?.broadcast?.today || null;
  }

  function openPhoneBroadcastApp() {
    if (!isPhoneWorldFeedUnlocked()) {
      showToast("尚未解锁", "请先选择游玩模式并开始游戏。", "warn");
      return;
    }
    ensurePhoneWorldFeedReady();
    maybeAutoRequestBroadcastFullScript("open_app");
    setElementHidden("phoneHomeView", true);
    setElementHidden("phoneLineApp", true);
    setElementHidden("phoneMusicApp", true);
    setElementHidden("phoneSnsApp", true);
    setElementHidden("phoneWorldEngineApp", true);
    setElementHidden("phoneBroadcastApp", false);
    setPhoneStatusBarMode("broadcast");
    setPhoneNavBarVisible(true);
    if (!broadcastInited) {
      broadcastInited = true;
      bindPhoneBroadcastEvents();
    }
    renderBroadcastApp();
  }

  function renderBroadcastApp() {
    syncBroadcastLoadingState();
    const episode = getBroadcastEpisode();
    const titleEl = document.getElementById("phoneBroadcastTitle");
    const metaEl = document.getElementById("phoneBroadcastMeta");
    const categoryEl = document.getElementById("phoneBroadcastCategory");
    const outlineEl = document.getElementById("phoneBroadcastOutline");
    const scriptEl = document.getElementById("phoneBroadcastScript");
    const historyEl = document.getElementById("phoneBroadcastHistory");
    const genBtn = document.getElementById("phoneBroadcastGenerateBtn");
    const statusEl = document.getElementById("phoneBroadcastStatus");

    renderBroadcastHostAvatar();
    renderBroadcastGuestAvatars(episode?.guests || []);

    if (categoryEl) {
      categoryEl.textContent = episode?.categoryLabel || (isDailyWorldGenLoading() ? "生成中" : "学园广播");
    }
    if (titleEl) {
      titleEl.textContent = episode?.title || (isDailyWorldGenLoading() ? "生成中…" : "今日暂无节目");
    }
    if (metaEl) {
      metaEl.textContent = episode
        ? formatWorldFeedDayLabel()
        : (isDailyWorldGenLoading() ? "次 API 正在生成本日广播主题…" : "打开后将自动生成今日学园广播");
    }
    if (outlineEl) {
      outlineEl.textContent = episode?.outline || (isDailyWorldGenLoading() ? "广播提纲生成中…" : "今日广播提纲尚未生成。");
    }
    if (scriptEl) {
      const script = String(episode?.fullScript || "").trim();
      const waitingAuto = isBroadcastAutoFullScriptEnabled() && episode?.scriptStatus === "generating";
      scriptEl.textContent = script
        || (waitingAuto
          ? "完整稿正在后台生成，稍后可刷新查看。"
          : episode?.scriptStatus === "skipped"
            ? "本地未连接 SillyTavern，完整稿未自动生成。可点击下方按钮手动请求。"
            : "完整稿尚未生成。日初会自动请求，也可点击下方按钮手动生成。");
      scriptEl.classList.toggle("is-empty", !script);
    }
    if (historyEl) {
      const history = state.freeMode?.world?.broadcast?.history || [];
      historyEl.innerHTML = history.length
        ? history.map((item) => `
          <button type="button" class="broadcast-history-item" data-broadcast-id="${escapePhoneText(item.id)}">
            <span class="broadcast-history-title">${escapePhoneText(item.title || "广播")}</span>
            <span class="broadcast-history-meta">${escapePhoneText((item.guests || []).join("、"))}</span>
          </button>`).join("")
        : `<p class="broadcast-empty">还没有历史节目。</p>`;
    }
    if (genBtn) {
      const canRetry = episode?.scriptStatus === "failed" || episode?.scriptStatus === "skipped";
      genBtn.disabled = broadcastScriptLoading || !episode || (Boolean(episode.fullScript) && !canRetry);
      genBtn.textContent = broadcastScriptLoading
        ? "生成中…"
        : episode?.fullScript && !canRetry
          ? "完整稿已生成"
          : canRetry
            ? "重新生成完整稿"
            : "手动生成完整稿";
    }
    if (statusEl) {
      const worldGen = globalThis.HatsuWorld?.worldGen?.ensureDailyGenShape?.(state);
      statusEl.textContent = broadcastScriptLoading
        ? "日初广播：完整稿生成中…"
        : isDailyWorldGenLoading()
          ? "次 API 正在生成本日广播主题与提纲…"
          : episode?.fullScript
            ? "可朗读完整稿已就绪。"
            : worldGen?.source === "secondary"
              ? "广播主题与初星圈由次 API 生成；完整稿于每日开始时自动请求。"
              : isBroadcastAutoFullScriptEnabled()
                ? "提纲前端生成；完整稿于每日开始时自动请求（广播 channel）。"
                : "提纲由前端自动生成；完整稿需手动请求。";
    }
    setBroadcastActiveTab(broadcastActiveTab);
  }

  function requestBroadcastFullScript(options = {}) {
    const { silent = false, auto = false, reason = "manual" } = options;
    const episode = getBroadcastEpisode();
    if (!episode || broadcastScriptLoading) return false;
    if (episode.fullScript && episode.scriptStatus !== "failed" && episode.scriptStatus !== "skipped") {
      return false;
    }

    const builder = globalThis.HatsuWorld?.broadcastPrompts?.buildBroadcastScriptPrompt;
    const prompt = typeof builder === "function"
      ? builder(episode, state, getHatsuWorldHelpers())
      : `[初星广播部]\n${episode.outline || ""}`;
    const requestId = createRequestId();
    const acquired = tryAcquirePrimaryModelChannel({
      requestId,
      ownerKind: "broadcast",
      saveScope: activeHostSaveScope,
      sessionEpoch: runtimeSessionEpoch
    });
    if (!acquired.ok) {
      rejectPrimaryModelDispatch(acquired.blockingOwner, { requestId, ownerKind: "broadcast", silent: silent || auto });
      return false;
    }

    state.activeStoryNode = { type: "broadcast", episodeId: episode.id, mode: "fullScript", ready: false };
    state.lastPrompt = prompt;
    state.freeMode.world.broadcast.pendingRequestId = requestId;
    episode.scriptStatus = "generating";
    episode.scriptRequestedAt = Date.now();
    episode.scriptRequestReason = reason;
    broadcastScriptLoading = true;
    renderBroadcastApp();
    saveState();

    pendingAiRequestId = requestId;
    if (!sendBroadcastPromptToHost(prompt, requestId, {
      silent: silent || auto,
      channelLeaseId: acquired.owner.channelLeaseId,
      ownerKind: "broadcast"
    })) {
      broadcastScriptLoading = false;
      episode.scriptStatus = auto ? "skipped" : "failed";
      state.activeStoryNode = null;
      resetBroadcastPendingState();
      pendingAiRequestId = "";
      renderBroadcastApp();
      saveState();
      if (!auto && !silent) {
        openAiPromptOverlay("当前页面未连接 SillyTavern。请复制广播提示词后手动发送。");
      }
      return false;
    }
    if (auto && reason === "daily_tick") {
      showToast("今日广播", "完整稿已在后台开始生成。", "info");
    }
    return true;
  }

  function extractBroadcastReply(source) {
    const text = String(source || "").trim();
    if (!text) return { complete: false, script: "" };
    const startMatches = [...text.matchAll(/[【\[]\s*初星正文开始\s*[】\]]/g)];
    let body = text;
    if (startMatches.length) {
      const last = startMatches[startMatches.length - 1];
      body = text.slice(last.index + last[0].length);
      body = body.replace(/[【\[]\s*初星正文结束\s*[】\]][\s\S]*$/u, "");
    }
    body = cleanReplyText(body).trim();
    return { complete: Boolean(body), script: body };
  }

  function handleBroadcastAiReply(source, requestId, isFinal) {
    const pendingId = String(state.freeMode?.world?.broadcast?.pendingRequestId || "");
    if (!isFinal) {
      sendAiReplyAck(requestId, true, false, false);
      return;
    }

    const parsed = extractBroadcastReply(source);
    if (!parsed.complete) {
      if (aiReplyRetryCount < 2) {
        aiReplyRetryCount += 1;
        sendAiReplyAck(requestId, false, true);
        return;
      }
      aiReplyRetryCount = 0;
      broadcastScriptLoading = false;
      pendingAiRequestId = "";
      resetBroadcastPendingState();
      const episode = getBroadcastEpisode();
      if (episode) episode.scriptStatus = "failed";
      if (state.activeStoryNode?.type === "broadcast") state.activeStoryNode.ready = true;
      renderBroadcastApp();
      saveState();
      showToast("广播稿异常", "未找到有效正文，请重试。", "warn");
      sendAiReplyAck(requestId, false, false);
      return;
    }

    aiReplyRetryCount = 0;
    broadcastScriptLoading = false;
    pendingAiRequestId = "";
    resetBroadcastPendingState();
    const episode = getBroadcastEpisode();
    if (episode) {
      episode.fullScript = parsed.script;
      episode.heard = true;
      episode.scriptStatus = "ready";
    }
    if (state.activeStoryNode?.type === "broadcast") state.activeStoryNode.ready = true;
    renderBroadcastApp();
    saveState();
    showToast("广播稿就绪", "完整节目稿已写入今日广播。", "info");
    sendAiReplyAck(requestId, true, false, true);
  }

  // ===== 小手机 · 初星圈 SNS =====
  let snsActiveTab = "timeline";
  let snsInited = false;
  let snsRefreshing = false;

  function getBuzzState() {
    ensureStateShape();
    return state.freeMode?.world?.buzz || { items: [], buzzDayKey: "", hotTopic: "" };
  }

  function ensureDailyBuzz() {
    if (!isPhoneWorldFeedUnlocked()) return [];
    ensurePhoneWorldFeedReady();
    return getBuzzState().items || [];
  }

  function getBuzzItemsForTab(tab = snsActiveTab) {
    const items = getBuzzState().items || [];
    const sorted = [...items].sort((a, b) => {
      const dayCmp = String(b.dayKey || "").localeCompare(String(a.dayKey || ""));
      if (dayCmp !== 0) return dayCmp;
      return String(b.id || "").localeCompare(String(a.id || ""));
    });
    if (tab === "hot") {
      return sorted.filter((item) => item.heat === "high" || (item.flags || []).includes("misread_risk"));
    }
    return sorted;
  }

  function snsOfficialAvatarChar(item) {
    const key = item?.officialKey || "";
    if (key === "student_council") return "学";
    if (key === "cafeteria") return "食";
    if (key === "broadcast_club") return "播";
    return (item?.author || "官").slice(0, 1);
  }

  function snsAuthorAvatar(item) {
    if (item?.official) {
      return { type: "official", char: snsOfficialAvatarChar(item) };
    }
    if (item?.anonymous || !item?.author) {
      return { type: "anon", char: "匿" };
    }
    const profile = idols[item.author] || idols[canonicalIdolName(item.author)] || {};
    if (profile.avatar) {
      return { type: "img", src: profile.avatar, alt: item.author };
    }
    return { type: "anon", char: (item.author || "?").slice(0, 1) };
  }

  function snsScopeLabel(scope) {
    if (scope === "net") return "全网";
    if (scope === "fanclub") return "粉丝站";
    return "";
  }

  function snsAuthorHandle(item) {
    if (item?.official) {
      const map = {
        student_council: "初星学生会",
        cafeteria: "初星食堂",
        broadcast_club: "初星广播部"
      };
      const name = map[item.officialKey] || item.author || "官方";
      return `@${name}`;
    }
    if (item?.anonymous || !item?.author) return "@匿名同学";
    return `@${item.author}`;
  }

  function snsEngagementStats(item) {
    const comments = Number(item.comments) || 0;
    const reposts = Number(item.reposts) || 0;
    const heat = item.heat || "normal";
    const likes = heat === "high"
      ? comments * 2 + reposts + 12
      : heat === "low"
        ? Math.max(0, Math.floor(comments * 0.4))
        : comments + reposts;
    const views = (comments + reposts + likes) * 6 + 48;
    return { comments, reposts, likes, views };
  }

  function snsActionHtml(kind, count, hot = false) {
    const icons = {
      reply: "icon-chat",
      repost: "icon-repost",
      like: "icon-heart",
      view: "icon-visual"
    };
    const labels = {
      reply: "回复",
      repost: "转帖",
      like: "喜欢",
      view: "浏览"
    };
    const countText = count > 0 ? String(count) : "";
    return `
      <span class="sns-action sns-action-${kind}${hot ? " is-hot" : ""}" aria-label="${labels[kind]} ${countText}">
        <svg aria-hidden="true"><use href="#${icons[kind]}"></use></svg>
        ${countText ? `<span class="sns-action-count">${countText}</span>` : ""}
      </span>`;
  }

  function buildSnsPostHtml(item) {
    const avatar = snsAuthorAvatar(item);
    const authorName = item.anonymous || !item.author ? "匿名同学" : item.author;
    const handle = snsAuthorHandle(item);
    const heat = item.heat || "normal";
    const stats = snsEngagementStats(item);
    const scopeLabel = snsScopeLabel(item.scope);
    const classes = [
      "sns-post",
      item.deleted ? "is-deleted" : "",
      item.official ? "is-official" : "",
      item.anonymous || !item.author ? "is-anonymous" : "",
      heat === "high" ? "is-hot" : ""
    ].filter(Boolean).join(" ");

    let avatarHtml = "";
    if (avatar.type === "img") {
      avatarHtml = `<img class="sns-post-avatar" src="${escapePhoneText(avatar.src)}" alt="" />`;
    } else {
      avatarHtml = `<span class="sns-post-avatar sns-post-avatar-fallback" aria-hidden="true">${escapePhoneText(avatar.char)}</span>`;
    }

    const contextParts = [];
    if (item.broadcastHint) {
      contextParts.push(`<span class="sns-post-context-line">· 今日广播：${escapePhoneText(item.broadcastHint)}</span>`);
    }
    if (scopeLabel) {
      contextParts.push(`<span class="sns-post-context-line sns-post-scope sns-post-scope-${escapePhoneText(item.scope || "campus")}">${escapePhoneText(scopeLabel)}</span>`);
    }
    if (item.deleted) {
      contextParts.push(`<span class="sns-post-context-line sns-post-deleted-badge">已删除（缓存）</span>`);
    }
    if (item.official) {
      contextParts.push(`<span class="sns-post-context-line sns-post-badge">官号</span>`);
    }
    const contextHtml = contextParts.length
      ? `<div class="sns-post-context">${contextParts.join("")}</div>`
      : "";

    return `
      <article class="${classes}" data-heat="${escapePhoneText(heat)}" aria-label="${escapePhoneText(authorName)} 的帖子">
        <div class="sns-post-layout">
          <div class="sns-post-avatar-col">${avatarHtml}</div>
          <div class="sns-post-main">
            <div class="sns-post-header">
              <div class="sns-post-names">
                <span class="sns-post-author">${escapePhoneText(authorName)}</span>
                <span class="sns-post-handle">${escapePhoneText(handle)}</span>
                <span class="sns-post-dot" aria-hidden="true">·</span>
                <span class="sns-post-time">${escapePhoneText(item.timeLabel || "刚刚")}</span>
              </div>
              <span class="sns-post-more" aria-hidden="true"><svg><use href="#icon-dots"></use></svg></span>
            </div>
            ${contextHtml}
            <p class="sns-post-body">${escapePhoneText(item.text || "")}</p>
            <div class="sns-post-actions" aria-label="互动数据">
              ${snsActionHtml("reply", stats.comments)}
              ${snsActionHtml("repost", stats.reposts, heat === "high")}
              ${snsActionHtml("like", stats.likes, heat === "high")}
              ${snsActionHtml("view", stats.views)}
            </div>
          </div>
        </div>
      </article>`;
  }

  function renderSnsApp() {
    const feedEl = document.getElementById("phoneSnsFeed");
    const hotTopicEl = document.getElementById("phoneSnsHotTopic");
    const emptyEl = document.getElementById("phoneSnsEmpty");
    const lockedEl = document.getElementById("phoneSnsLocked");
    const tabsEl = document.getElementById("phoneSnsTabs");
    const refreshBtn = document.getElementById("phoneSnsRefreshBtn");

    if (!feedEl) return;

    if (!isPhoneWorldFeedUnlocked()) {
      if (lockedEl) lockedEl.hidden = false;
      if (emptyEl) emptyEl.hidden = true;
      feedEl.innerHTML = "";
      if (hotTopicEl) {
        hotTopicEl.hidden = true;
        hotTopicEl.innerHTML = "";
      }
      return;
    }

    if (lockedEl) lockedEl.hidden = true;
    ensureDailyBuzz();

    const buzz = getBuzzState();
    const items = getBuzzItemsForTab(snsActiveTab);
    if (hotTopicEl) {
      if (buzz.hotTopic) {
        hotTopicEl.hidden = false;
        hotTopicEl.innerHTML = `
          <span class="sns-trending-label">学园热议 · 正在发生</span>
          <p class="sns-trending-topic">${escapePhoneText(buzz.hotTopic)}</p>`;
      } else {
        hotTopicEl.hidden = true;
        hotTopicEl.innerHTML = "";
      }
    }

    if (tabsEl) {
      tabsEl.querySelectorAll("[data-sns-tab]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.snsTab === snsActiveTab);
        btn.setAttribute("aria-selected", String(btn.dataset.snsTab === snsActiveTab));
      });
    }

    if (refreshBtn) {
      refreshBtn.classList.toggle("is-spinning", snsRefreshing);
      refreshBtn.disabled = snsRefreshing;
    }

    if (!items.length) {
      feedEl.innerHTML = "";
      if (emptyEl) {
        emptyEl.hidden = false;
        emptyEl.innerHTML = isDailyWorldGenLoading()
          ? "<p>学园舆论生成中…</p>"
          : "<p>今天还没有新动态。<br>学园也许正在酝酿八卦。</p>";
      }
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    feedEl.innerHTML = items.map(buildSnsPostHtml).join("");
  }

  function refreshSnsFeed() {
    if (snsRefreshing) return;
    snsRefreshing = true;
    renderSnsApp();
    window.setTimeout(() => {
      snsRefreshing = false;
      renderSnsApp();
    }, 360);
  }

  function openPhoneSnsApp() {
    if (!isPhoneWorldFeedUnlocked()) {
      showToast("尚未解锁", "请先选择游玩模式并开始游戏。", "warn");
      return;
    }
    ensureStateShape();
    scanStorytellerNotificationAtCheckpoint("open_sns");
    setElementHidden("phoneHomeView", true);
    setElementHidden("phoneLineApp", true);
    setElementHidden("phoneMusicApp", true);
    setElementHidden("phoneBroadcastApp", true);
    setElementHidden("phoneWorldEngineApp", true);
    setElementHidden("phoneSnsApp", false);
    setPhoneStatusBarMode("sns");
    setPhoneNavBarVisible(true);
    if (!snsInited) {
      snsInited = true;
      bindPhoneSnsEvents();
    }
    renderSnsApp();
  }

  function bindPhoneSnsEvents() {
    document.getElementById("phoneSnsTabs")?.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-sns-tab]");
      if (!btn) return;
      snsActiveTab = btn.dataset.snsTab === "hot" ? "hot" : "timeline";
      renderSnsApp();
    });
    document.getElementById("phoneSnsRefreshBtn")?.addEventListener("click", () => {
      saveState();
      refreshSnsFeed();
    });
  }

  // ===== 小手机 · 初星世界引擎 =====
  let phoneWorldEngineInited = false;
  let phoneWorldEngineActiveTab = "today";
  let storytellerMajorConfirmationMode = "";

  function openPhoneWorldEngineApp() {
    setElementHidden("phoneHomeView", true);
    setElementHidden("phoneLineApp", true);
    setElementHidden("phoneMusicApp", true);
    setElementHidden("phoneBroadcastApp", true);
    setElementHidden("phoneSnsApp", true);
    setElementHidden("phoneWorldEngineApp", false);
    setPhoneStatusBarMode("world-engine");
    setPhoneNavBarVisible(true);
    if (!phoneWorldEngineInited) {
      phoneWorldEngineInited = true;
      bindPhoneWorldEngineEvents();
    }
    closeWorldEngineAdvancedSettings();
    reconcileWorldDirectorAttempt();
    scanStorytellerNotificationAtCheckpoint("open_world_engine");
    renderWorldEnginePhoneApp();
  }

  function openWorldEngineAdvancedSettings() {
    setElementHidden("worldEngineMainView", true);
    setElementHidden("worldEngineSettingsView", false);
    updateWorldEngineApiSettingsUI();
  }

  function closeWorldEngineAdvancedSettings() {
    setElementHidden("worldEngineSettingsView", true);
    setElementHidden("worldEngineMainView", false);
  }

  function bindPhoneWorldEngineEvents() {
    document.getElementById("worldEngineTabs")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-world-engine-tab]");
      if (!button) return;
      setWorldEnginePhoneTab(button.dataset.worldEngineTab);
    });
    document.getElementById("worldEngineRefreshBtn")?.addEventListener("click", () => {
      reconcileWorldDirectorAttempt();
      renderWorldEnginePhoneApp();
    });
    document.getElementById("worldEngineSettingsBtn")?.addEventListener("click", openWorldEngineAdvancedSettings);
    document.getElementById("worldEngineSettingsBackBtn")?.addEventListener("click", closeWorldEngineAdvancedSettings);
    document.getElementById("worldEngineApiSaveBtn")?.addEventListener("click", saveWorldEngineApiSettings);
    document.getElementById("worldEngineStyleSaveBtn")?.addEventListener("click", saveWorldEngineStyleMix);
    document.getElementById("worldEngineDensityModes")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-world-engine-density]");
      if (button) setWorldEngineDensityMode(button.dataset.worldEngineDensity);
    });
    document.getElementById("worldEngineDensitySaveBtn")?.addEventListener("click", saveWorldEngineDensitySettings);
    document.getElementById("worldEngineHeroicWeight")?.addEventListener("input", () => syncWorldEngineStyleInputs("heroic"));
    document.getElementById("worldEngineRomanceWeight")?.addEventListener("input", () => syncWorldEngineStyleInputs("romance"));
    document.getElementById("worldEngineApiTestBtn")?.addEventListener("click", runSecondaryApiTest);
    document.getElementById("worldEngineCommissionRegenBtn")?.addEventListener("click", forceSecondaryRegeneration);
    document.getElementById("worldEngineStaleRecoveryBtn")?.addEventListener("click", recoverStaleWorldDirectorAttempt);
    document.getElementById("worldEngineManualRunBtn")?.addEventListener("click", () => {
      requestManualWorldDirectorRecalculation();
      renderWorldEnginePhoneApp();
    });
    document.getElementById("worldEngineContent")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-storyteller-event-action]");
      if (!button) return;
      const action = button.dataset.storytellerEventAction;
      if (action === "accept") acceptStorytellerNotification();
      else if (action === "defer") deferStorytellerNotification();
      else if (action === "ignore") ignoreStorytellerNotification();
    });
  }

  function setWorldEnginePhoneTab(tab) {
    phoneWorldEngineActiveTab = ["today", "pressures", "runtime", "events"].includes(tab) ? tab : "today";
    document.querySelectorAll("[data-world-engine-tab]").forEach((button) => {
      const active = button.dataset.worldEngineTab === phoneWorldEngineActiveTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    renderWorldEnginePhoneApp();
  }

  function resolveWorldEngineActorLabel(actorId) {
    const value = String(actorId || "");
    if (value === "producer") return getPhoneProducerLabel();
    if (!value.startsWith("idol:")) return "未知对象";
    const name = canonicalIdolName(value.slice(5));
    return idols[name] ? name : "未知对象";
  }

  function getWorldEnginePhoneViewModel() {
    const director = state.freeMode?.world?.director || null;
    const directorModel = globalThis.HatsuWorld?.directorPhoneView?.buildViewModel?.(director, {
      currentDayKey: getWorldFeedDayKey(),
      resolveActorLabel: resolveWorldEngineActorLabel
    }) || {
      availability: "unavailable",
      direction: null,
      pressures: [],
      runtime: {
        enabled: false,
        dirty: false,
        jobStatus: "idle",
        jobStartedAt: null,
        directorRevision: 0,
        chronicleRevision: 0,
        lastError: "",
        receipts: []
      }
    };
    const storytellerModel = globalThis.HatsuWorldStorytellerPhoneView?.buildViewModel?.(
      state.freeMode?.world?.storyteller,
      {
        currentDayKey: getWorldFeedDayKey(),
        currentSaveScope: getSecondaryChannelSaveScope(),
        activeTurn: state.harness?.activeTurn || null,
        worldMinute: globalThis.HatsuWorldStorytellerNotifications?.buildStorytellerWorldMinute?.({ dayOrdinal: Number(state.freeMode?.postLiveDay || state.day || 0), clockMinutes: Number(state.freeMode?.clockMinutes || 0) }) || 0
      }
    ) || {
      status: "empty",
      dayKey: "",
      pacingLabel: "尚未计划",
      categories: [],
      severityBudget: { minor: 0, moderate: 0, major: 0 },
      noveltySummary: "暂无多样性计划",
      cooldownSummary: "暂无冷却计划",
      lastError: "",
      candidate: null,
      selection: null,
      lastObservation: null,
      inbox: { available: false },
      badges: { worldEngine: false, sns: false }
    };
    return { ...directorModel, storyteller: storytellerModel };
  }

  function formatWorldEngineJobStatus(status) {
    const labels = {
      idle: "空闲",
      prepared: "等待生成",
      generating: "生成中",
      validating: "验证中",
      committed: "已提交",
      retryable_failed: "可重试失败"
    };
    return labels[status] || "状态未明";
  }

  function formatWorldEngineRuntimeTime(value) {
    const timestamp = Number(value);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return "未记录";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "未记录";
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function renderWorldEngineStorytellerPlan(plan) {
    if (!plan || plan.status !== "committed") {
      const error = plan?.lastError
        ? `<p class="world-engine-plan-error">${escapePhoneText(plan.lastError)}</p>`
        : "";
      return `<section class="world-engine-storyteller-plan is-empty"><div class="world-engine-section-head"><span>Storyteller Plan</span><strong>未就绪</strong></div>${error}</section>`;
    }
    const candidate = plan.candidate;
    const candidateSection = candidate
      ? `<div class="world-engine-storyteller-candidate">
          <div class="world-engine-section-head"><span>当前事件候选</span><strong>${escapePhoneText(candidate.statusLabel)}</strong></div>
          <div class="world-engine-day-key">来源 ${escapePhoneText(candidate.sourceLabel)}</div>
          <p><strong>${escapePhoneText(candidate.categoryLabel)} · ${escapePhoneText(candidate.severityLabel)}</strong></p>
          <p>${escapePhoneText(candidate.archetypeLabel)} · ${escapePhoneText(candidate.locationLabel)}</p>
          <div class="world-engine-day-key">事件 ${escapePhoneText(candidate.incidentSuffix)} · 回合 ${escapePhoneText(candidate.turnSuffix)}</div>
          <p>近期冷却记录 ${candidate.cooldownCount}${candidate.lastReason ? ` · ${escapePhoneText(candidate.lastReason)}` : ""}</p>
        </div>`
      : "";
    const selection = plan.selection;
    const selectionSection = selection
      ? `<div class="world-engine-storyteller-candidate">
          <div class="world-engine-section-head"><span>选择依据</span><strong>${selection.selectedScore} 分</strong></div>
          <p>类别 ${selection.categoryWeight} · 行动 ${selection.actionFit} · 新颖 ${selection.noveltyBonus} · 压力 ${selection.pressureBonus}</p>
          <div class="world-engine-day-key">相关压力 ${selection.relevantPressureCount} · 候选 ${selection.eligibleCount}/${selection.evaluatedCount}</div>
          ${selection.rejectionSummary.length ? `<p>${selection.rejectionSummary.map((item) => escapePhoneText(item)).join(" · ")}</p>` : ""}
        </div>`
      : "";
    const style = plan.style;
    const styleSection = style
      ? `<div class="world-engine-storyteller-style">
          <div class="world-engine-section-head"><span>叙事风格诊断</span><strong>v${style.styleMixRevision}</strong></div>
          <p>今日 ${style.activeMix.heroic}% 王道 · ${style.activeMix.romance}% 恋爱</p>
          <p>次日 ${style.pendingMix.heroic}% 王道 · ${style.pendingMix.romance}% 恋爱${style.pendingActivationDayKey ? `（${escapePhoneText(style.pendingActivationDayKey)}）` : ""}</p>
          <p>合法候选 ${style.legalCandidateCounts.heroic} / ${style.legalCandidateCounts.romance} · 归一化 ${style.normalizedWeights.heroic}% / ${style.normalizedWeights.romance}%</p>
          ${style.selectedStyleLabel ? `<p>本次选择：${escapePhoneText(style.selectedStyleLabel)}${style.selectedOperators.length ? ` · ${style.selectedOperators.map((item) => escapePhoneText(item)).join("、")}` : ""}</p>` : ""}
          <p>最近成功分布：王道 ${style.recentDistribution.heroic} · 恋爱 ${style.recentDistribution.romance} · 当前连续 ${style.streak.committedCount}</p>
        </div>`
      : "";
    const lastObservation = plan.lastObservation;
    const observationSection = lastObservation
      ? `<div class="world-engine-storyteller-candidate">
          <div class="world-engine-section-head"><span>最近反馈</span><strong>${escapePhoneText(lastObservation.sourceLabel)}</strong></div>
          <p>${escapePhoneText(lastObservation.categoryLabel)} · ${escapePhoneText(lastObservation.severityLabel)}</p>
        </div>`
      : "";
    return `<section class="world-engine-storyteller-plan">
      <div class="world-engine-section-head"><span>Storyteller Plan</span><strong>${escapePhoneText(plan.pacingLabel)}</strong></div>
      <div class="world-engine-plan-budget">
        <span>轻微 ${plan.severityBudget.minor}</span><span>中等 ${plan.severityBudget.moderate}</span><span>重大 ${plan.severityBudget.major}</span>
      </div>
      <div class="world-engine-plan-categories">${plan.categories.map((item) => `<span>${escapePhoneText(item.label)} ${item.weight}</span>`).join("")}</div>
      <p>${escapePhoneText(plan.noveltySummary)}</p>
      <p>${escapePhoneText(plan.cooldownSummary)}</p>
      <div class="world-engine-day-key">${escapePhoneText(plan.dayKey)}</div>
      ${plan.lastError ? `<p class="world-engine-plan-error">${escapePhoneText(plan.lastError)}</p>` : ""}
      ${candidateSection}
      ${selectionSection}
      ${styleSection}
      ${observationSection}
    </section>`;
  }

  function renderWorldEngineToday(model) {
    const planSection = renderWorldEngineStorytellerPlan(model.storyteller);
    const disabled = model.availability === "disabled";
    const unavailable = model.availability === "unavailable";
    if (unavailable) {
      return `${planSection}<section class="world-engine-empty"><span class="world-engine-empty-mark">星</span><h2>世界引擎尚未启用</h2><p>当前存档还没有可读取的 Director 结果。</p></section>`;
    }
    const stateBanner = disabled
      ? `<div class="world-engine-notice is-muted">世界引擎已停用，以下为最近一次可读结果。</div>`
      : model.runtime.dirty
        ? `<div class="world-engine-notice">发现新动向，等待日切或手动重算</div>`
        : "";
    if (!model.direction) {
      return `${planSection}${stateBanner}<section class="world-engine-empty"><span class="world-engine-empty-mark">星</span><h2>今日方向尚未生成</h2><p>Director 完成日切计算后会在这里留下今日基调。</p></section>`;
    }
    const freshness = model.direction.isCurrentDay ? "今日有效" : "尚未更新";
    return `${planSection}${stateBanner}
      <section class="world-engine-direction">
        <div class="world-engine-kicker-row">
          <span>今日叙事方向</span>
          <span class="world-engine-status-dot${model.direction.isCurrentDay ? " is-ready" : " is-stale"}">${freshness}</span>
        </div>
        <h2>${escapePhoneText(model.direction.tone)}</h2>
        <p>${escapePhoneText(model.direction.summary)}</p>
        <div class="world-engine-day-key">${escapePhoneText(model.direction.dayKey)}</div>
      </section>`;
  }

  function renderWorldEnginePressures(model) {
    if (model.availability === "unavailable") {
      return `<section class="world-engine-empty"><span class="world-engine-empty-mark">线</span><h2>压力线尚未建立</h2><p>当前存档没有可读取的 Director 状态。</p></section>`;
    }
    if (!model.pressures.length) {
      return `<section class="world-engine-empty"><span class="world-engine-empty-mark">静</span><h2>今日局势平稳</h2><p>目前没有仍需观察的叙事压力。</p></section>`;
    }
    return `<section class="world-engine-pressure-section">
      <div class="world-engine-section-head"><span>当前压力线</span><strong>${model.pressures.length} 条</strong></div>
      <div class="world-engine-pressure-list">
        ${model.pressures.map((pressure) => `
          <article class="world-engine-pressure">
            <div class="world-engine-pressure-head">
              <div><strong>${escapePhoneText(pressure.actorLabel)}</strong><span>${escapePhoneText(pressure.themeLabel)}</span></div>
              <span class="world-engine-pressure-stage">${escapePhoneText(pressure.stageLabel)}</span>
            </div>
            <p>${escapePhoneText(pressure.summary || "该动向仍在观察中。")}</p>
            <div class="world-engine-pressure-meter" role="img" aria-label="压力强度 ${pressure.intensity}">
              <span style="width:${pressure.intensity}%"></span>
            </div>
          </article>`).join("")}
      </div>
    </section>`;
  }

  function renderWorldEngineRuntime(model) {
    const runtime = model.runtime;
    const availabilityLabel = model.availability === "unavailable"
      ? "尚未建立"
      : runtime.enabled ? "运行中" : "已停用";
    const receipts = runtime.receipts.length
      ? `<div class="world-engine-receipts">${runtime.receipts.map((receipt) => `
          <div class="world-engine-receipt">
            <time>${escapePhoneText(formatWorldEngineRuntimeTime(receipt.createdAt))}</time>
            <span>${escapePhoneText(receipt.triggerLabel)}</span>
            <strong>${escapePhoneText(receipt.resultLabel)}</strong>
          </div>`).join("")}</div>`
      : `<div class="world-engine-runtime-empty">暂无运行记录</div>`;
    const failure = runtime.lastError
      ? `<div class="world-engine-failure"><strong>最近一次生成未完成</strong><p>${escapePhoneText(runtime.lastError)}</p><span>可通过现有 DEBUG 入口手动重算。</span></div>`
      : "";
    return `<section class="world-engine-runtime">
      <div class="world-engine-runtime-lead">
        <span>Director 状态</span>
        <strong>${availabilityLabel}</strong>
      </div>
      <dl class="world-engine-runtime-grid">
        <div><dt>当前任务</dt><dd>${escapePhoneText(formatWorldEngineJobStatus(runtime.jobStatus))}</dd></div>
        <div><dt>待处理证据</dt><dd>${runtime.dirty ? "有" : "无"}</dd></div>
        <div><dt>Director revision</dt><dd>${runtime.directorRevision}</dd></div>
        <div><dt>Chronicle revision</dt><dd>${runtime.chronicleRevision}</dd></div>
      </dl>
      ${runtime.jobStartedAt ? `<p class="world-engine-runtime-time">本次任务开始于 ${escapePhoneText(formatWorldEngineRuntimeTime(runtime.jobStartedAt))}</p>` : ""}
      ${failure}
      <div class="world-engine-section-head"><span>最近结果</span><strong>${runtime.receipts.length}</strong></div>
      ${receipts}
    </section>`;
  }

  function renderWorldEngineEventBudget(audit) {
    const item = (label, value) => `<div><span>${label}</span><strong>${Number(value?.used) || 0}/${Number(value?.total) || 0}</strong></div>`;
    return `<section class="world-engine-event-budget">
      <div class="world-engine-section-head"><span>今日事件预算</span><strong>Attach ${Number(audit?.channels?.attach) || 0} · Invite ${Number(audit?.channels?.invite) || 0}</strong></div>
      <div class="world-engine-event-budget-grid">
        ${item("轻微", audit?.budget?.minor)}
        ${item("中等", audit?.budget?.moderate)}
        ${item("重大", audit?.budget?.major)}
      </div>
    </section>`;
  }

  function renderWorldEngineEventInbox(inbox) {
    if (!inbox?.available) {
      return `<section class="world-engine-event-inbox is-empty"><div class="world-engine-section-head"><span>事件收件箱</span><strong>无待处理 Invite</strong></div></section>`;
    }
    return `<section class="world-engine-event-inbox">
      <div class="world-engine-section-head"><span>事件收件箱</span><strong>${escapePhoneText(inbox.statusLabel)}</strong></div>
      <h2>${escapePhoneText(inbox.archetypeLabel)}</h2>
      <p>${escapePhoneText(inbox.categoryLabel)} · ${escapePhoneText(inbox.severityLabel)} · ${escapePhoneText(inbox.locationLabel)}</p>
      <p>${inbox.actorLabels.map((item) => escapePhoneText(item)).join(" / ")}</p>
      ${inbox.modifierLabels?.length ? `<p class="world-engine-event-modifiers">${inbox.modifierLabels.map((item) => escapePhoneText(item)).join(" · ")}</p>` : ""}
      ${inbox.confirmationCopy ? `<p class="world-engine-event-confirmation">${escapePhoneText(inbox.confirmationCopy)}</p>` : ""}
      <div class="world-engine-event-actions">
        <button type="button" data-storyteller-event-action="accept">接受</button>
        <button type="button" data-storyteller-event-action="defer">稍后</button>
        <button type="button" data-storyteller-event-action="ignore">忽略</button>
      </div>
    </section>`;
  }

  function renderWorldEngineAttachAudit(audit) {
    const events = Array.isArray(audit?.attachEvents) ? audit.attachEvents : [];
    if (!events.length) {
      return `<section class="world-engine-attach-empty">
        <div class="world-engine-section-head"><span>今日 Attach 事件</span><strong>0</strong></div>
        <p>${escapePhoneText(audit?.emptyReason || "今天尚未生成 Attach 事件。")}</p>
      </section>`;
    }
    return `<section class="world-engine-attach-audit">
      <div class="world-engine-section-head"><span>今日 Attach 事件</span><strong>${events.length}</strong></div>
      <div class="world-engine-attach-list">${events.map((row) => `
        <article class="world-engine-attach-row">
          <div class="world-engine-attach-meta"><time>${escapePhoneText(row.timeLabel)}</time><strong>${escapePhoneText(row.statusLabel)}</strong></div>
          <h2>${escapePhoneText(row.skeletonLabel)}</h2>
          <p>${escapePhoneText(row.sourceLabel)} · ${escapePhoneText(row.locationLabel)} · ${escapePhoneText(row.categoryLabel)} · ${escapePhoneText(row.severityLabel)}</p>
          <p>${(row.actorLabels || []).map((item) => escapePhoneText(item)).join(" / ") || "无指定角色"} · ${escapePhoneText(row.styleLabel)}</p>
        </article>`).join("")}</div>
    </section>`;
  }

  function renderWorldEngineEvents(model) {
    const audit = model.storyteller?.eventAudit || {
      budget: { minor: {}, moderate: {}, major: {} },
      channels: { attach: 0, invite: 0 },
      attachEvents: [],
      emptyReason: "当前计划尚未建立。"
    };
    return renderWorldEngineEventBudget(audit)
      + renderWorldEngineEventInbox(model.storyteller?.inbox)
      + renderWorldEngineAttachAudit(audit);
  }

  function transitionStorytellerInboxAction(action, options) {
    options = options && typeof options === "object" ? options : {};
    const storyteller = state.freeMode?.world?.storyteller;
    const candidate = storyteller?.pendingCandidate;
    const api = globalThis.HatsuWorldStorytellerNotifications;
    if (!candidate || !api?.transitionNotification) return false;
    const worldMinute = api.buildStorytellerWorldMinute({ dayOrdinal: Number(state.freeMode?.postLiveDay || state.day || 0), clockMinutes: Number(state.freeMode?.clockMinutes || 0) });
    const result = api.transitionNotification(candidate, action, { saveScope: candidate.saveScope, dayKey: candidate.dayKey, planId: candidate.planId, sourceTurnId: candidate.sourceTurnId, worldMinute });
    if (!result.ok) return false;
    storyteller.pendingCandidate = result.candidate;
    const majorDecline = action === "ignore" && candidate.severity === "major" && candidate.requiresConfirmation;
    const receiptInput = {
      event: action === "defer" ? "deferred" : majorDecline ? "declined" : "ignored",
      reason: String(options.reason || (majorDecline ? "player_confirmed_major_decline" : "player_action")),
      dayKey: candidate.dayKey,
      saveScope: candidate.saveScope,
      createdAt: Date.now()
    };
    const receipt = api.buildNotificationReceipt?.(receiptInput) || receiptInput;
    storyteller.receipts = [...(storyteller.receipts || []), receipt].slice(-40);
    saveState(`storyteller.notification_${action}`);
    renderPhoneHome();
    renderWorldEnginePhoneApp();
    return true;
  }

  function deferStorytellerNotification() { return transitionStorytellerInboxAction("defer"); }
  function ignoreStorytellerNotification() {
    const candidate = globalThis.HatsuWorldStorytellerIncidents
      ?.normalizeIncidentCandidate?.(state.freeMode?.world?.storyteller?.pendingCandidate);
    if (candidate?.severity === "major" && candidate.requiresConfirmation) {
      return openStorytellerMajorConfirmation("decline");
    }
    return transitionStorytellerInboxAction("ignore");
  }

  function buildStorytellerIndependentEventPrompt(candidate) {
    const location = getWorldMapLocation(candidate?.locationId);
    const worldFacts = `[初星世界事件]
当前日期：${getWorldFeedDayKey()}
当前时间：${formatFreeModeClock()}
当前地点：${location?.name || "学园"}
当前担当：${state.idol || "未指定"}
${composeWorldSummaryBlock("produce", candidate?.locationId)}`;
    const directorPrompt = composeWorldDirectorPromptAddendum({
      participants: [...(candidate?.actorIds || []), ...(candidate?.targetIds || [])],
      locationId: candidate?.locationId
    });
    const actorLabels = [...new Set([...(candidate?.actorIds || []), ...(candidate?.targetIds || [])]
      .map(resolveWorldEngineActorLabel)
      .filter(Boolean))].slice(0, 4);
    const eventPrompt = globalThis.HatsuWorldStorytellerInjection
      ?.composeStorytellerIndependentEventPromptAddendum?.(candidate, { actorLabels }) || "";
    const authorityContract = globalThis.HatsuWorldStorytellerInjection
      ?.composeNarrativeAuthorityContract?.({
        hasDirector: Boolean(directorPrompt),
        hasStoryteller: Boolean(eventPrompt)
      }) || "";
    return `${worldFacts}

${directorPrompt ? `${directorPrompt}\n\n` : ""}${eventPrompt ? `${eventPrompt}\n\n` : ""}${authorityContract ? `${authorityContract}\n\n` : ""}${outputContract("请写 700 字以内的完整独立事件正文，自然收束，不要输出选项，不要待续。")}`;
  }

  function dispatchAcceptedStorytellerCandidate(rawCandidate) {
    const storyteller = state.freeMode?.world?.storyteller;
    const incidentApi = globalThis.HatsuWorldStorytellerIncidents;
    const notificationApi = globalThis.HatsuWorldStorytellerNotifications;
    const candidate = incidentApi?.normalizeIncidentCandidate?.(rawCandidate);
    const saveScope = String(getSecondaryChannelSaveScope() || activeHostSaveScope || activeStorageKey || "");
    const dayKey = String(getWorldFeedDayKey() || "");
    if (
      !storyteller
      || !candidate
      || !notificationApi?.transitionNotification
      || candidate.channel !== "invite"
      || !["notified", "deferred"].includes(candidate.status)
      || !saveScope
      || candidate.saveScope !== saveScope
      || candidate.dayKey !== dayKey
      || candidate.planId !== String(storyteller.plan?.planId || "")
    ) {
      showToast("事件不可用", "这项事件已过期或不属于当前聊天。", "warn");
      return false;
    }
    const requestId = createRequestId();
    const turnId = createHarnessId("storyteller-turn");
    if (!isSillyTavernHost()) {
      state.lastPrompt = buildStorytellerIndependentEventPrompt(candidate);
      openAiPromptOverlay("当前页面未连接 SillyTavern；候选事件仍保持未接受状态。可手动复制提示词。 ");
      return false;
    }
    const acquired = tryAcquirePrimaryModelChannel({
      requestId,
      ownerKind: "storyteller_event",
      turnId,
      saveScope,
      sessionEpoch: runtimeSessionEpoch
    });
    if (!acquired.ok) {
      rejectPrimaryModelDispatch(acquired.blockingOwner, { requestId, ownerKind: "storyteller_event" });
      return false;
    }
    const begun = beginHarnessStorytellerEventTurn(candidate, requestId, { turnId });
    if (!begun.ok) {
      releasePrimaryModelChannel(requestId, acquired.owner.channelLeaseId, begun.reason || "event_prepare_failed");
      return false;
    }
    const transition = notificationApi.transitionNotification(candidate, "invite", {
      saveScope: candidate.saveScope,
      dayKey: candidate.dayKey,
      planId: candidate.planId,
      sourceTurnId: candidate.sourceTurnId
    });
    if (!transition.ok) {
      state.harness.activeTurn = null;
      releasePrimaryModelChannel(requestId, acquired.owner.channelLeaseId, transition.reason || "event_transition_failed");
      return false;
    }
    storyteller.pendingCandidate = transition.candidate;
    const prompt = buildStorytellerIndependentEventPrompt(transition.candidate);
    const captured = captureHarnessGenerationPrompt(prompt);
    if (captured.generationPromptStatus !== "captured") {
      state.harness.activeTurn = null;
      storyteller.pendingCandidate = candidate;
      releasePrimaryModelChannel(requestId, acquired.owner.channelLeaseId, "event_prompt_rejected");
      return false;
    }
    state.harness.activeTurn = {
      ...state.harness.activeTurn,
      ...captured,
      status: "generating",
      updatedAt: Date.now()
    };
    pendingAiRequestId = requestId;
    state.pendingAiRequestId = requestId;
    state.lastPrompt = prompt;
    state.lastStory = "正在生成已接受的世界事件…";
    recordHarnessTrace("turn.generating", { turnId, requestId, action: "storyteller_event" });
    saveState("storyteller.event_generating");
    renderPhoneHome();
    renderWorldEnginePhoneApp();
    openEventOverlay("初星世界事件", "事件已接受，正在生成叙事", buildAiWaitingStory(state.lastStory));
    const sent = requestHostPromptSend(prompt, requestId, {
      channelLeaseId: acquired.owner.channelLeaseId,
      ownerKind: "storyteller_event",
      turnId,
      generationMode: "shujuku_same_layer"
    });
    if (!sent) return false;
    return true;
  }

  function openStorytellerMajorConfirmation(mode) {
    if (!['accept', 'decline'].includes(mode)) return false;
    storytellerMajorConfirmationMode = mode;
    const decline = mode === 'decline';
    const title = document.getElementById('storytellerMajorConfirmationTitle');
    const copy = document.getElementById('storytellerMajorConfirmationCopy');
    const confirm = document.getElementById('storytellerMajorConfirmationConfirmBtn');
    if (title) title.textContent = decline ? '确认忽略重大事件' : '确认接受重大事件';
    if (copy) copy.textContent = decline
      ? '忽略后，本次重大事件候选会过期且不会生成叙事。此操作不会推进时间或修改其他业务状态。'
      : '接受后会生成一段独立事件叙事，但不会自动推进时间或修改数值、资源和任务。';
    if (confirm) confirm.textContent = decline ? '确认忽略' : '确认接受';
    setElementHidden('storytellerMajorConfirmationOverlay', false);
    return true;
  }

  function closeStorytellerMajorConfirmation() {
    storytellerMajorConfirmationMode = '';
    setElementHidden('storytellerMajorConfirmationOverlay', true);
    return true;
  }

  function revalidateCurrentStorytellerMajorCandidate(candidate) {
    const incidentApi = globalThis.HatsuWorldStorytellerIncidents;
    if (!incidentApi?.revalidateIncidentCandidate) {
      return { valid: false, reason: 'storyteller_revalidation_unavailable' };
    }
    const context = buildStorytellerIncidentContext('notification', '', {
      turnId: candidate.sourceTurnId,
      saveScope: candidate.saveScope,
      dayKey: candidate.dayKey,
      locationId: candidate.locationId
    });
    return incidentApi.revalidateIncidentCandidate(candidate, context, {
      requiredChannel: 'invite',
      allowMajorConfirmation: true
    });
  }

  function confirmStorytellerMajorAction() {
    const mode = storytellerMajorConfirmationMode;
    if (!['accept', 'decline'].includes(mode)) return false;
    const storyteller = state.freeMode?.world?.storyteller;
    const incidentApi = globalThis.HatsuWorldStorytellerIncidents;
    const candidate = incidentApi?.normalizeIncidentCandidate?.(storyteller?.pendingCandidate);
    if (
      !candidate
      || candidate.severity !== 'major'
      || !candidate.requiresConfirmation
      || candidate.channel !== 'invite'
      || !['notified', 'deferred'].includes(candidate.status)
    ) {
      showToast('事件不可用', '重大事件已经变化，请关闭确认后刷新收件箱。', 'warn');
      return false;
    }
    const revalidated = revalidateCurrentStorytellerMajorCandidate(candidate);
    if (!revalidated?.valid) {
      showToast('事件已变化', '当前条件不再满足这项重大事件，请关闭确认后刷新收件箱。', 'warn');
      return false;
    }
    const completed = mode === 'decline'
      ? transitionStorytellerInboxAction('ignore', { reason: 'player_confirmed_major_decline' })
      : dispatchAcceptedStorytellerCandidate(candidate);
    if (completed) closeStorytellerMajorConfirmation();
    return completed;
  }

  function acceptStorytellerNotification() {
    const storyteller = state.freeMode?.world?.storyteller;
    const incidentApi = globalThis.HatsuWorldStorytellerIncidents;
    const candidate = incidentApi?.normalizeIncidentCandidate?.(storyteller?.pendingCandidate);
    const saveScope = String(getSecondaryChannelSaveScope() || activeHostSaveScope || activeStorageKey || '');
    const dayKey = String(getWorldFeedDayKey() || '');
    if (
      !candidate
      || candidate.channel !== 'invite'
      || !['notified', 'deferred'].includes(candidate.status)
      || !saveScope
      || candidate.saveScope !== saveScope
      || candidate.dayKey !== dayKey
      || candidate.planId !== String(storyteller?.plan?.planId || '')
    ) {
      showToast('事件不可用', '这项事件已过期或不属于当前聊天。', 'warn');
      return false;
    }
    if (candidate.severity === 'major' && candidate.requiresConfirmation) {
      return openStorytellerMajorConfirmation('accept');
    }
    return dispatchAcceptedStorytellerCandidate(candidate);
  }

  function updateWorldEngineManualRunButton(model) {
    const button = document.getElementById("worldEngineManualRunBtn");
    if (!button) return;
    const jobBusy = ["generating", "validating"].includes(model?.runtime?.jobStatus);
    const channelBusy = Boolean(getPrimaryModelChannelOwner() || getSecondaryModelChannelOwner());
    const busy = jobBusy || channelBusy;
    button.disabled = busy;
    button.textContent = busy ? "正在推演…" : "手动推演本日走向";
  }

  function renderWorldEnginePhoneApp() {
    const content = document.getElementById("worldEngineContent");
    if (!content) return;
    document.querySelectorAll("[data-world-engine-tab]").forEach((button) => {
      const active = button.dataset.worldEngineTab === phoneWorldEngineActiveTab;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    const model = getWorldEnginePhoneViewModel();
    const renderers = {
      today: renderWorldEngineToday,
      pressures: renderWorldEnginePressures,
      runtime: renderWorldEngineRuntime,
      events: renderWorldEngineEvents
    };
    content.innerHTML = (renderers[phoneWorldEngineActiveTab] || renderers.today)(model);
    updateWorldEngineManualRunButton(model);
  }

  function renderMusicLibrary() {
    const grid = document.getElementById("phoneMusicQuickGrid");
    const list = document.getElementById("phoneMusicTrackList");
    const countEl = document.getElementById("phoneMusicLikedCount");
    if (!grid || !list) return;
    if (countEl) countEl.textContent = String(musicLikedSet.size);

    if (!musicTracks.length) {
      grid.innerHTML = "";
      list.innerHTML = `<div class="music-empty">未找到歌曲。<br>请把音频放入 assets/PlayList 后运行 generate-playlist.cjs。</div>`;
      return;
    }

    const likedTile = `
      <div class="music-quick-card liked-tile" data-pm-tile="liked">
        <div class="music-cover music-qc-cover"><svg aria-hidden="true"><use href="#icon-heart"></use></svg></div>
        <div class="music-qc-name">已点赞的歌曲</div>
      </div>`;
    const songTiles = musicTracks.slice(0, 3).map((t, i) => `
      <div class="music-quick-card" data-pm-index="${i}">
        <div class="music-cover music-qc-cover" style="${musicCoverCss(t)}">${musicCoverInner(t)}</div>
        <div class="music-qc-name">${escapePhoneText(t.title)}</div>
      </div>`).join("");
    grid.innerHTML = likedTile + songTiles;

    document.querySelectorAll(".music-tab").forEach((b) => {
      b.classList.toggle("music-tab-active", b.dataset.pmFilter === musicFilter);
    });

    const idxs = musicViewIndices();
    if (!idxs.length) {
      list.innerHTML = `<div class="music-empty">还没有点赞的歌曲。<br>点击歌曲右侧的红心即可收藏。</div>`;
      return;
    }

    const actionsBar = musicFilter === "liked" ? `
      <div class="music-liked-actions">
        <button type="button" class="music-liked-play" data-pm-action="play"><svg aria-hidden="true"><use href="#icon-play"></use></svg>播放</button>
        <button type="button" class="music-liked-shuffle" data-pm-action="shuffle"><svg aria-hidden="true"><use href="#icon-shuffle"></use></svg>随机播放</button>
      </div>` : "";

    list.innerHTML = actionsBar + idxs.map((i) => {
      const t = musicTracks[i];
      return `
        <div class="music-track-row${i === musicCur ? " is-playing" : ""}" data-pm-index="${i}">
          <div class="music-cover music-tr-cover" style="${musicCoverCss(t)}">${musicCoverInner(t)}</div>
          <div class="music-tr-meta">
            <div class="music-tr-title">${escapePhoneText(t.title)}</div>
            <div class="music-tr-artist">${escapePhoneText(t.artist)}</div>
          </div>
          <div class="music-tr-eq"><span></span><span></span><span></span></div>
          <button type="button" class="music-tr-like${isMusicLiked(i) ? " liked" : ""}" data-pm-like="${i}" aria-label="点赞"><svg aria-hidden="true"><use href="#icon-heart"></use></svg></button>
        </div>`;
    }).join("");
  }

  function setMusicFilter(f) {
    musicFilter = f === "liked" ? "liked" : "all";
    const scroller = document.querySelector("#phoneMusicApp .music-scroll");
    const top = scroller ? scroller.scrollTop : 0;
    renderMusicLibrary();
    if (scroller) scroller.scrollTop = top;
  }

  function toggleMusicLike(i) {
    if (!musicTracks[i]) return;
    const key = musicTrackKey(musicTracks[i]);
    if (musicLikedSet.has(key)) musicLikedSet.delete(key); else musicLikedSet.add(key);
    saveMusicLiked();
    const scroller = document.querySelector("#phoneMusicApp .music-scroll");
    const top = scroller ? scroller.scrollTop : 0;
    renderMusicLibrary();
    if (scroller) scroller.scrollTop = top;
    if (musicCur === i) updateMusicNowLike();
  }

  function updateMusicNowLike() {
    const btn = document.getElementById("phoneMusicNowLikeBtn");
    if (btn) btn.classList.toggle("liked", musicCur >= 0 && isMusicLiked(musicCur));
  }

  function musicSelectTrack(i, context) {
    const audio = ensureMusicAudio();
    if (!audio || !musicTracks[i]) return;
    musicCur = i;
    musicQueue = (context && context.length) ? context.slice() : musicViewIndices();
    if (!musicQueue.includes(i)) musicQueue = musicTracks.map((_, k) => k);
    musicQueuePos = musicQueue.indexOf(i);
    notifyMusicPlaybackStart();
    audio.src = musicUrl(musicTracks[i].file);
    audio.play().catch(() => {});
    syncMusicTrackUi();
  }

  function syncMusicTrackUi() {
    const t = musicTracks[musicCur];
    if (!t) return;
    const mini = document.getElementById("phoneMusicMini");
    if (mini) mini.hidden = false;
    setMusicCover("phoneMusicMiniCover", t);
    setText("phoneMusicMiniTitle", t.title);
    setText("phoneMusicMiniArtist", t.artist);
    setMusicCover("phoneMusicNowCover", t);
    setText("phoneMusicNowSong", t.title);
    setText("phoneMusicNowSinger", t.artist);
    const now = document.getElementById("phoneMusicNow");
    if (now) now.style.setProperty("--np-accent", t._pal[1]);
    document.querySelectorAll("#phoneMusicTrackList .music-track-row").forEach((r) => {
      r.classList.toggle("is-playing", Number(r.dataset.pmIndex) === musicCur);
    });
    updateMusicNowLike();
    syncMusicPlayButtons();
    updateMusicProgress();
  }

  function setMusicCover(id, t) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.cssText = musicCoverCss(t);
    el.innerHTML = musicCoverInner(t);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function syncMusicPlayButtons() {
    const icon = musicPlaying ? "#icon-pause" : "#icon-play";
    ["phoneMusicPlayBtn", "phoneMusicMiniPlayBtn"].forEach((id) => {
      const use = document.querySelector(`#${id} use`);
      if (use) use.setAttribute("href", icon);
    });
  }

  function updateMusicProgress() {
    const audio = ensureMusicAudio();
    if (!audio) return;
    const dur = audio.duration || 0;
    const pos = audio.currentTime || 0;
    const pct = dur ? Math.min(100, (pos / dur) * 100) : 0;
    const fill = document.getElementById("phoneMusicFill");
    const knob = document.getElementById("phoneMusicKnob");
    const miniProg = document.getElementById("phoneMusicMiniProg");
    if (fill) fill.style.width = pct + "%";
    if (knob) knob.style.left = pct + "%";
    if (miniProg) miniProg.style.width = pct + "%";
    setText("phoneMusicCur", musicFmt(pos));
    setText("phoneMusicDur", musicFmt(dur));
  }

  function toggleMusicPlay() {
    const audio = ensureMusicAudio();
    if (!audio) return;
    if (musicCur < 0) { musicSelectTrack(0); return; }
    if (audio.paused) audio.play().catch(() => {}); else audio.pause();
  }

  function ensureMusicQueue() {
    if (!musicQueue.length) {
      musicQueue = musicViewIndices();
      if (!musicQueue.length) musicQueue = musicTracks.map((_, k) => k);
    }
    if (musicQueuePos < 0) musicQueuePos = Math.max(0, musicQueue.indexOf(musicCur));
  }

  function musicNext() {
    if (!musicTracks.length) return;
    ensureMusicQueue();
    let pos;
    if (musicShuffle) {
      if (musicQueue.length <= 1) pos = musicQueuePos;
      else { do { pos = Math.floor(Math.random() * musicQueue.length); } while (pos === musicQueuePos); }
    } else {
      pos = (musicQueuePos + 1) % musicQueue.length;
    }
    musicQueuePos = pos;
    musicSelectTrack(musicQueue[pos], musicQueue);
  }

  function musicPrev() {
    const audio = ensureMusicAudio();
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    ensureMusicQueue();
    const pos = (musicQueuePos - 1 + musicQueue.length) % musicQueue.length;
    musicQueuePos = pos;
    musicSelectTrack(musicQueue[pos], musicQueue);
  }

  function playMusicLiked(shuffleMode) {
    const idxs = musicLikedIndices();
    if (!idxs.length) return;
    musicShuffle = shuffleMode;
    const sb = document.getElementById("phoneMusicShuffleBtn");
    if (sb) sb.classList.toggle("active", musicShuffle);
    musicQueue = idxs.slice();
    musicQueuePos = shuffleMode ? Math.floor(Math.random() * musicQueue.length) : 0;
    musicSelectTrack(musicQueue[musicQueuePos], musicQueue);
    openMusicNow();
  }

  function openMusicNow() {
    const now = document.getElementById("phoneMusicNow");
    if (now) now.classList.add("open");
  }
  function closeMusicNow() {
    const now = document.getElementById("phoneMusicNow");
    if (now) now.classList.remove("open");
  }

  // 与直播视频/其它音源互斥：开始播歌时暂停直播视频。
  function notifyMusicPlaybackStart() {
    try {
      const live = document.getElementById("liveVideo");
      if (live && !live.paused) live.pause();
    } catch (error) { /* 忽略 */ }
  }

  // 直播等场景开始时调用，暂停音乐。
  function pausePhoneMusic() {
    const audio = ensureMusicAudio();
    if (audio && !audio.paused) audio.pause();
  }

  function bindPhoneMusicEvents() {
    const audio = ensureMusicAudio();
    const grid = document.getElementById("phoneMusicQuickGrid");
    const list = document.getElementById("phoneMusicTrackList");

    if (grid) grid.addEventListener("click", (event) => {
      const tile = event.target.closest("[data-pm-tile]");
      if (tile) { setMusicFilter("liked"); return; }
      const card = event.target.closest("[data-pm-index]");
      if (card) { musicSelectTrack(Number(card.dataset.pmIndex)); openMusicNow(); }
    });

    if (list) list.addEventListener("click", (event) => {
      const likeBtn = event.target.closest("[data-pm-like]");
      if (likeBtn) { event.stopPropagation(); toggleMusicLike(Number(likeBtn.dataset.pmLike)); return; }
      const action = event.target.closest("[data-pm-action]");
      if (action) { playMusicLiked(action.dataset.pmAction === "shuffle"); return; }
      const row = event.target.closest("[data-pm-index]");
      if (row) { musicSelectTrack(Number(row.dataset.pmIndex)); openMusicNow(); }
    });

    document.querySelectorAll(".music-tab").forEach((b) => {
      b.addEventListener("click", () => setMusicFilter(b.dataset.pmFilter));
    });

    const bind = (id, handler, evt = "click") => {
      const el = document.getElementById(id);
      if (el) el.addEventListener(evt, handler);
    };
    bind("phoneMusicMini", openMusicNow);
    bind("phoneMusicMiniPlayBtn", (e) => { e.stopPropagation(); toggleMusicPlay(); });
    bind("phoneMusicPlayBtn", toggleMusicPlay);
    bind("phoneMusicNextBtn", musicNext);
    bind("phoneMusicPrevBtn", musicPrev);
    bind("phoneMusicNowCloseBtn", closeMusicNow);
    bind("phoneMusicNowLikeBtn", () => { if (musicCur >= 0) toggleMusicLike(musicCur); });
    bind("phoneMusicShuffleBtn", () => {
      musicShuffle = !musicShuffle;
      document.getElementById("phoneMusicShuffleBtn")?.classList.toggle("active", musicShuffle);
    });
    bind("phoneMusicRepeatBtn", () => {
      musicRepeat = !musicRepeat;
      document.getElementById("phoneMusicRepeatBtn")?.classList.toggle("active", musicRepeat);
    });
    bind("phoneMusicTrack", (event) => {
      if (!audio) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const dur = audio.duration || 0;
      if (dur) audio.currentTime = ((event.clientX - rect.left) / rect.width) * dur;
    });

    if (audio) {
      audio.addEventListener("play", () => {
        musicPlaying = true;
        syncMusicPlayButtons();
        bgmManager.stop();
      });
      audio.addEventListener("pause", () => {
        musicPlaying = false;
        syncMusicPlayButtons();
        // 切歌瞬间也会触发 pause；延迟校验，仅在确实停下时才恢复 BGM。
        setTimeout(() => { if (audio.paused) updateBgm(); }, 200);
      });
      audio.addEventListener("timeupdate", updateMusicProgress);
      audio.addEventListener("loadedmetadata", updateMusicProgress);
      audio.addEventListener("ended", () => {
        if (musicRepeat) { audio.currentTime = 0; audio.play().catch(() => {}); }
        else musicNext();
      });
    }
  }

  function phoneFriendThreadId(friendName) {
    return `friend:${canonicalIdolName(friendName)}`;
  }

  function isPhoneFriendThreadId(threadId) {
    return String(threadId || "").startsWith("friend:");
  }

  function getPhoneFriendNameFromThreadId(threadId) {
    return canonicalIdolName(String(threadId || "").replace(/^friend:/, ""));
  }

  function getPhoneThreadContactName(threadId) {
    if (threadId === "idol") return state.idol || "";
    if (isPhoneFriendThreadId(threadId)) return getPhoneFriendNameFromThreadId(threadId);
    return "";
  }

  function resolvePhoneFriendName(rawInput) {
    const trimmed = String(rawInput || "").trim();
    if (!trimmed) return "";
    const canonical = canonicalIdolName(trimmed);
    if (idols[canonical]) return canonical;
    const exact = Object.keys(idols).find((name) => name === trimmed);
    if (exact) return exact;
    const partial = Object.keys(idols).find((name) => name.includes(trimmed) || trimmed.includes(name));
    return partial || "";
  }

  function getPhoneAddFriendCandidates() {
    ensureStateShape();
    const taken = new Set([state.idol, ...(state.phoneChat.friends || [])]);
    return interactionCharacters.filter((name) => !taken.has(name) && idols[name]);
  }

  function buildPhoneThreadDefinitions() {
    const idolName = state.idol;
    const profile = idols[idolName] || {};
    const friendThreads = (state.phoneChat?.friends || []).map((friendName) => {
      const friendProfile = idols[friendName] || {};
      return {
        id: phoneFriendThreadId(friendName),
        name: friendName,
        contactName: friendName,
        avatar: friendProfile.avatar || "",
        type: "direct",
        pinned: false,
        writable: true,
        subtitle: "好友"
      };
    });
    return [
      {
        id: "idol",
        name: idolName || "担当偶像",
        contactName: idolName || "",
        avatar: profile.avatar || "",
        type: "direct",
        pinned: true,
        writable: true,
        subtitle: "在线"
      },
      ...friendThreads
    ];
  }

  function getPhoneThreadDefinition(threadId) {
    return buildPhoneThreadDefinitions().find((thread) => thread.id === threadId) || null;
  }

  function getPhoneThreadMessages(threadId) {
    ensureStateShape();
    return Array.isArray(state.phoneChat.messages[threadId]) ? state.phoneChat.messages[threadId] : [];
  }

  function getPhoneThreadPreview(threadId) {
    const messages = getPhoneThreadMessages(threadId);
    const last = messages[messages.length - 1];
    return last ? String(last.text || "") : "暂无消息";
  }

  function getPhoneThreadTime(threadId) {
    const messages = getPhoneThreadMessages(threadId);
    const last = messages[messages.length - 1];
    return last ? String(last.time || "") : "";
  }

  function getPhoneUnreadCount(threadId) {
    const thread = getPhoneThreadDefinition(threadId);
    if (!thread || thread.type !== "direct") return 0;
    return getPhoneThreadMessages(threadId).filter((message) => message.sender === "idol" && !message.read).length;
  }

  function renderPhoneStatusBar() {
    const clock = document.getElementById("phoneStatusTime");
    if (clock) clock.textContent = formatPhoneClock();
  }

  function renderPhoneChatList() {
    const list = document.getElementById("phoneChatList");
    if (!list) return;

    const threads = buildPhoneThreadDefinitions();
    const pinned = threads.filter((thread) => thread.pinned);
    const regular = threads.filter((thread) => !thread.pinned);
    const ordered = [...pinned, ...regular];

    list.innerHTML = ordered.map((thread) => {
      const unread = getPhoneUnreadCount(thread.id);
      const preview = getPhoneThreadPreview(thread.id);
      const time = getPhoneThreadTime(thread.id);
      const avatarMarkup = thread.avatar
        ? `<img class="line-thread-avatar" src="${thread.avatar}" alt="${thread.name}头像" draggable="false">`
        : `<div class="line-thread-avatar ${thread.type === "official" ? "is-official" : "is-group"}" aria-hidden="true">${thread.type === "official" ? "校" : "群"}</div>`;
      return `
        <button class="line-thread" type="button" data-thread-id="${thread.id}" role="listitem">
          ${avatarMarkup}
          <span class="line-thread-body">
            <span class="line-thread-head">
              <span class="line-thread-name">${escapePhoneText(thread.name)}</span>
              <span class="line-thread-time">${escapePhoneText(time)}</span>
            </span>
            <span class="line-thread-preview">
              <span class="line-thread-text">${escapePhoneText(preview)}</span>
              ${unread ? `<span class="line-thread-badge">${unread}</span>` : ""}
            </span>
          </span>
        </button>
      `;
    }).join("");
  }

  function renderPhoneChatMessages(threadId, options = {}) {
    const container = document.getElementById("phoneChatMessages");
    if (!container) return;

    const thread = getPhoneThreadDefinition(threadId);
    const messages = getPhoneThreadMessages(threadId);
    const contactName = getPhoneThreadContactName(threadId);
    const contactAvatar = idols[contactName]?.avatar || "";
    const showTyping = options.showTyping ?? isPhoneChatTyping();
    const showTypingRetry = showTyping && state.activeStoryNode?.type === "phonechat";

    container.innerHTML = `
      <div class="line-date-chip">今天</div>
      ${messages.map((message) => {
        if (message.sender === "producer") {
          return `
            <div class="line-msg line-msg-out">
              <span class="line-msg-read">${message.read ? "已读" : ""}</span>
              <div class="line-msg-bubble">${escapePhoneText(message.text)}</div>
              <span class="line-msg-time">${escapePhoneText(message.time)}</span>
            </div>
          `;
        }
        const isSystem = message.sender === "system";
        return `
          <div class="line-msg line-msg-in">
            ${isSystem
              ? `<div class="line-thread-avatar is-official" aria-hidden="true">通</div>`
              : `<img class="line-msg-avatar" src="${contactAvatar}" alt="${escapePhoneText(contactName || "偶像")}头像" draggable="false">`}
            <div class="line-msg-bubble">${escapePhoneText(message.text)}</div>
            <span class="line-msg-time">${escapePhoneText(message.time)}</span>
          </div>
        `;
      }).join("")}
      ${showTyping ? `
        <div class="line-msg line-msg-in line-msg-typing" aria-live="polite">
          <img class="line-msg-avatar" src="${contactAvatar}" alt="" draggable="false">
          <div class="line-msg-bubble line-typing-bubble">
            <span class="line-typing-label">正在输入中</span>
            <span class="line-typing-dots" aria-hidden="true"><span></span><span></span><span></span></span>
            ${showTypingRetry ? `<button type="button" class="line-typing-retry" data-phone-retry>未收到？重试</button>` : ""}
          </div>
        </div>
      ` : ""}
    `;

    container.scrollTop = container.scrollHeight;
    if (thread?.writable && !showTyping) {
      let changed = false;
      messages.forEach((message) => {
        if (message.sender === "idol" && !message.read) {
          message.read = true;
          changed = true;
        }
      });
      if (changed) saveState();
    }
    updatePhoneChatRetryUi();
  }

  function isPhoneChatTyping() {
    return phoneChatTypingVisible || Boolean(state.phoneChat?.isAwaitingReply);
  }

  function isPhoneChatBusy() {
    return isPhoneChatTyping() || Boolean(phoneChatDeliveryTimer);
  }

  function shouldShowPhoneChatRetryHint() {
    if (state.phoneChat?.activeView !== "chat") return false;
    const thread = getPhoneThreadDefinition(state.phoneChat?.activeThreadId);
    if (!thread?.writable) return false;
    return Boolean(state.phoneChat?.retryAvailable && !isPhoneChatTyping());
  }

  function canRetryPhoneChatNow() {
    if (state.activeStoryNode?.type !== "phonechat") return false;
    const thread = getPhoneThreadDefinition(state.phoneChat?.activeThreadId);
    if (!thread?.writable) return false;
    return Boolean(state.phoneChat?.isAwaitingReply || state.phoneChat?.retryAvailable || phoneChatDeliveryTimer);
  }

  function updatePhoneChatRetryUi() {
    const hint = document.getElementById("phoneChatRetryHint");
    if (hint) hint.hidden = !shouldShowPhoneChatRetryHint();
  }

  function triggerPhoneChatRegeneration() {
    if (!canRetryPhoneChatNow()) {
      showToast("暂无法重试", "当前没有等待中的私聊回复。", "warn");
      return;
    }
    const prompt = String(state.lastPrompt || "");
    if (!prompt.trim()) {
      showToast("无法重试", "私聊提示词缺失，未发送请求。", "warn");
      return;
    }
    const requestId = createRequestId();
    const acquired = tryAcquirePrimaryModelChannel({
      requestId,
      ownerKind: "phone_chat",
      saveScope: activeHostSaveScope,
      sessionEpoch: runtimeSessionEpoch
    });
    if (!acquired.ok) {
      rejectPrimaryModelDispatch(acquired.blockingOwner, { requestId, ownerKind: "phone_chat" });
      return;
    }

    clearPhoneChatDelivery();
    aiReplyRetryCount = 0;
    pendingAiRequestId = requestId;
    state.lastRequestId = requestId;
    state.phoneChat.pendingRequestId = requestId;
    state.phoneChat.isAwaitingReply = true;
    state.phoneChat.retryAvailable = false;
    setPhoneChatTyping(true);
    setPhoneChatComposerEnabled(false);
    updatePhoneChatRetryUi();
    saveState();

    if (sendPhoneChatPromptToHost(prompt, requestId, {
      channelLeaseId: acquired.owner.channelLeaseId,
      ownerKind: "phone_chat"
    })) {
      showToast("正在重新生成", "已重新发送私聊提示词。", "info");
      return;
    }
    state.phoneChat.isAwaitingReply = false;
    state.phoneChat.retryAvailable = true;
    pendingAiRequestId = "";
    setPhoneChatTyping(false);
    setPhoneChatComposerEnabled(true);
    updatePhoneChatRetryUi();
    saveState();
    openAiPromptOverlay("当前页面未连接 SillyTavern。请复制私聊提示词后手动发送。");
  }
  function setPhoneChatTyping(visible) {
    phoneChatTypingVisible = visible;
    const threadId = state.phoneChat?.activeThreadId;
    if (threadId && state.phoneChat?.activeView === "chat") {
      renderPhoneChatMessages(threadId, { showTyping: visible });
    }
    updatePhoneChatRetryUi();
  }

  function setPhoneChatComposerEnabled(enabled) {
    const thread = getPhoneThreadDefinition(state.phoneChat?.activeThreadId);
    if (!thread?.writable) return;
    const input = document.getElementById("phoneChatInput");
    const sendBtn = document.querySelector("#phoneChatForm .line-send-btn");
    if (input) input.disabled = !enabled;
    if (sendBtn) sendBtn.disabled = !enabled;
  }

  function clearPhoneChatDelivery() {
    if (phoneChatDeliveryTimer) {
      clearTimeout(phoneChatDeliveryTimer);
      phoneChatDeliveryTimer = null;
    }
  }

  function startPhoneChatLineDelivery(threadId, lines) {
    clearPhoneChatDelivery();
    const queue = lines.map((line) => String(line || "").trim()).filter(Boolean);
    if (!queue.length) {
      setPhoneChatTyping(false);
      setPhoneChatComposerEnabled(true);
      return;
    }

    const deliverNext = () => {
      setPhoneChatTyping(true);
      phoneChatDeliveryTimer = window.setTimeout(() => {
        const line = queue.shift();
        appendPhoneChatMessage(threadId, "idol", line);
        saveState();
        if (state.phoneChat?.activeView === "chat" && state.phoneChat.activeThreadId === threadId) {
          renderPhoneChatMessages(threadId, { showTyping: queue.length > 0 });
        }
        renderPhoneChatList();

        if (queue.length) {
          deliverNext();
          return;
        }

        phoneChatDeliveryTimer = null;
        setPhoneChatTyping(false);
        setPhoneChatComposerEnabled(true);
      }, PHONE_CHAT_LINE_DELAY_MS);
    };

    deliverNext();
  }

  function sendPhoneChatToHost(userMessage, threadId = "idol", dispatch) {
    dispatch = dispatch && typeof dispatch === "object" ? dispatch : {};
    const prompt = buildPhoneChatPrompt(userMessage, threadId);
    const requestId = String(dispatch.requestId || createRequestId());
    let channelLeaseId = String(dispatch.channelLeaseId || "");
    if (!channelLeaseId) {
      const acquired = tryAcquirePrimaryModelChannel({
        requestId,
        ownerKind: "phone_chat",
        saveScope: activeHostSaveScope,
        sessionEpoch: runtimeSessionEpoch
      });
      if (!acquired.ok) {
        rejectPrimaryModelDispatch(acquired.blockingOwner, { requestId, ownerKind: "phone_chat" });
        return false;
      }
      channelLeaseId = acquired.owner.channelLeaseId;
    }
    state.activeStoryNode = { type: "phonechat", threadId, mode: "chat", ready: false };
    state.lastPrompt = prompt;
    state.phoneChat.isAwaitingReply = true;
    state.phoneChat.pendingRequestId = requestId;
    state.phoneChat.retryAvailable = false;
    setPhoneChatTyping(true);
    setPhoneChatComposerEnabled(false);
    saveState();

    pendingAiRequestId = requestId;
    if (!sendPhoneChatPromptToHost(prompt, requestId, { channelLeaseId, ownerKind: "phone_chat" })) {
      state.phoneChat.isAwaitingReply = false;
      state.phoneChat.pendingRequestId = "";
      state.phoneChat.retryAvailable = true;
      pendingAiRequestId = "";
      setPhoneChatTyping(false);
      setPhoneChatComposerEnabled(true);
      updatePhoneChatRetryUi();
      openAiPromptOverlay("当前页面未连接 SillyTavern。请复制私聊提示词后手动发送。");
      return false;
    }
    return true;
  }

  function sendPhoneAddFriendGreeting(friendName, threadId) {
    const prompt = buildPhoneAddFriendGreetingPrompt(friendName);
    const requestId = createRequestId();
    const acquired = tryAcquirePrimaryModelChannel({
      requestId,
      ownerKind: "phone_chat",
      saveScope: activeHostSaveScope,
      sessionEpoch: runtimeSessionEpoch
    });
    if (!acquired.ok) {
      rejectPrimaryModelDispatch(acquired.blockingOwner, { requestId, ownerKind: "phone_chat" });
      return false;
    }
    state.activeStoryNode = { type: "phonechat", threadId, mode: "greeting", contactName: friendName, ready: false };
    state.lastPrompt = prompt;
    state.phoneChat.isAwaitingReply = true;
    state.phoneChat.pendingRequestId = requestId;
    state.phoneChat.retryAvailable = false;
    setPhoneChatTyping(true);
    setPhoneChatComposerEnabled(false);
    saveState();

    pendingAiRequestId = requestId;
    if (!sendPhoneChatPromptToHost(prompt, requestId, {
      channelLeaseId: acquired.owner.channelLeaseId,
      ownerKind: "phone_chat"
    })) {
      state.phoneChat.isAwaitingReply = false;
      state.phoneChat.pendingRequestId = "";
      state.phoneChat.retryAvailable = true;
      pendingAiRequestId = "";
      setPhoneChatTyping(false);
      setPhoneChatComposerEnabled(true);
      updatePhoneChatRetryUi();
      openAiPromptOverlay("当前页面未连接 SillyTavern。请复制添加好友问候提示词后手动发送。");
      return false;
    }
    return true;
  }
  function handlePhoneChatAiReply(source, requestId, isFinal) {
    if (!isFinal) {
      state.phoneChat.isAwaitingReply = true;
      setPhoneChatTyping(true);
      setPhoneChatComposerEnabled(false);
      sendAiReplyAck(requestId, true, false, false);
      return;
    }

    const parsed = extractPhoneChatReply(source);
    if (!parsed.complete) {
      if (aiReplyRetryCount < 2) {
        aiReplyRetryCount += 1;
        state.phoneChat.isAwaitingReply = true;
        setPhoneChatTyping(true);
        sendAiReplyAck(requestId, false, true);
        return;
      }
      aiReplyRetryCount = 0;
      pendingAiRequestId = "";
      state.phoneChat.isAwaitingReply = false;
      state.phoneChat.pendingRequestId = "";
      state.phoneChat.retryAvailable = true;
      if (state.activeStoryNode?.type === "phonechat") state.activeStoryNode.ready = true;
      setPhoneChatTyping(false);
      setPhoneChatComposerEnabled(true);
      updatePhoneChatRetryUi();
      saveState();
      showToast("私聊回复异常", "未找到有效的 <初星私聊> 回复，可点重试重新生成。", "warn");
      sendAiReplyAck(requestId, false, false);
      return;
    }

    aiReplyRetryCount = 0;
    pendingAiRequestId = "";
    state.phoneChat.isAwaitingReply = false;
    state.phoneChat.pendingRequestId = "";
    state.phoneChat.retryAvailable = false;
    if (state.activeStoryNode?.type === "phonechat") state.activeStoryNode.ready = true;
    const threadId = state.activeStoryNode?.threadId || "idol";
    startPhoneChatLineDelivery(threadId, parsed.lines);
    sendAiReplyAck(requestId, true, false);
    saveState();
    updatePhoneChatRetryUi();
  }

  function showPhoneListView() {
    ensureStateShape();
    showPhoneLineAppShell();
    state.phoneChat.activeView = "list";
    state.phoneChat.activeThreadId = "";
    setElementHidden("phoneLineChatView", true);
    setElementHidden("phoneLineAddFriendView", true);
    setElementHidden("phoneLineListView", false);
    renderPhoneChatList();
  }

  function renderPhoneAddFriendSuggestions() {
    const container = document.getElementById("phoneAddFriendSuggestions");
    if (!container) return;
    const candidates = getPhoneAddFriendCandidates();
    if (!candidates.length) {
      container.innerHTML = `<p class="line-add-friend-note">暂无可添加的学院偶像。</p>`;
      return;
    }
    container.innerHTML = candidates.map((name) => (
      `<button type="button" class="line-add-friend-chip" data-friend-name="${escapePhoneText(name)}">${escapePhoneText(name)}</button>`
    )).join("");
  }

  function openPhoneAddFriendView() {
    if (isPhoneChatBusy()) {
      showToast("请稍候", "请等待当前私聊回复完成。", "warn");
      return;
    }
    ensureStateShape();
    state.phoneChat.activeView = "add_friend";
    showPhoneLineAppShell();
    const input = document.getElementById("phoneAddFriendInput");
    const submitBtn = document.getElementById("phoneAddFriendSubmitBtn");
    if (input) input.value = "";
    if (submitBtn) submitBtn.disabled = false;
    renderPhoneAddFriendSuggestions();
    setElementHidden("phoneLineChatView", true);
    setElementHidden("phoneLineListView", true);
    setElementHidden("phoneLineAddFriendView", false);
    input?.focus();
  }

  function closePhoneAddFriendView() {
    setElementHidden("phoneLineAddFriendView", true);
    showPhoneListView();
  }

  function confirmPhoneAddFriend(rawName) {
    if (isPhoneChatBusy()) {
      showToast("请稍候", "请等待当前私聊回复完成。", "warn");
      return;
    }
    const friendName = resolvePhoneFriendName(rawName);
    if (!friendName) {
      showToast("未找到偶像", "请输入初星学园偶像的姓名。", "warn");
      return;
    }
    if (friendName === state.idol) {
      showToast("已是担当", "担当偶像已在聊天列表中。", "warn");
      return;
    }

    ensureStateShape();
    const threadId = phoneFriendThreadId(friendName);
    if ((state.phoneChat.friends || []).includes(friendName)) {
      closePhoneAddFriendView();
      openPhoneThread(threadId);
      showToast("已是好友", "已打开与该偶像的聊天。", "info");
      return;
    }

    state.phoneChat.friends.push(friendName);
    state.phoneChat.messages[threadId] = [];
    saveState();
    closePhoneAddFriendView();
    openPhoneThread(threadId);
    sendPhoneAddFriendGreeting(friendName, threadId);
  }

  function submitPhoneAddFriend(event) {
    event.preventDefault();
    const input = document.getElementById("phoneAddFriendInput");
    confirmPhoneAddFriend(input?.value || "");
  }

  function openPhoneThread(threadId) {
    const thread = getPhoneThreadDefinition(threadId);
    if (!thread) return;

    ensureStateShape();
    reconcilePhoneChatPendingState();
    state.phoneChat.activeView = "chat";
    state.phoneChat.activeThreadId = threadId;
    showPhoneLineAppShell();

    const title = document.getElementById("phoneChatTitle");
    const subtitle = document.getElementById("phoneChatSubtitle");
    const form = document.getElementById("phoneChatForm");
    const readonlyNote = document.getElementById("phoneChatReadonlyNote");
    const input = document.getElementById("phoneChatInput");

    if (title) title.textContent = thread.name;
    if (subtitle) subtitle.textContent = thread.subtitle || "";
    if (form) form.hidden = !thread.writable;
    if (readonlyNote) readonlyNote.hidden = Boolean(thread.writable);
    if (input) {
      input.value = "";
      input.disabled = !thread.writable || isPhoneChatBusy();
    }

    setElementHidden("phoneLineListView", true);
    setElementHidden("phoneLineAddFriendView", true);
    setElementHidden("phoneLineChatView", false);
    renderPhoneChatMessages(threadId);
    renderPhoneChatList();
    setPhoneChatComposerEnabled(thread.writable && !isPhoneChatBusy());
    const phoneLiveMatch = state.phoneChat.pendingRequestId
      && pendingAiRequestId === String(state.phoneChat.pendingRequestId || "");
    if (state.activeStoryNode?.type === "phonechat" && phoneLiveMatch) {
      state.phoneChat.isAwaitingReply = true;
      setPhoneChatTyping(true);
      setPhoneChatComposerEnabled(false);
    }
    if (thread.writable && !isPhoneChatBusy()) input?.focus();
  }

  function appendPhoneChatMessage(threadId, sender, text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return false;

    ensureStateShape();
    if (!Array.isArray(state.phoneChat.messages[threadId])) {
      state.phoneChat.messages[threadId] = [];
    }

    state.phoneChat.messages[threadId].push({
      id: phoneChatMessageId(),
      sender,
      text: trimmed,
      time: formatPhoneClock(),
      read: sender === "producer"
    });
    return true;
  }

  function submitPhoneChatMessage(event) {
    event.preventDefault();
    const threadId = state.phoneChat?.activeThreadId;
    const thread = getPhoneThreadDefinition(threadId);
    if (!thread?.writable) return;

    if (isPhoneChatBusy()) {
      showToast("请稍候", "上一条消息还在回复中。", "warn");
      return;
    }

    const input = document.getElementById("phoneChatInput");
    const text = input?.value || "";
    if (!String(text).trim()) return;
    const requestId = createRequestId();
    const acquired = tryAcquirePrimaryModelChannel({
      requestId,
      ownerKind: "phone_chat",
      saveScope: activeHostSaveScope,
      sessionEpoch: runtimeSessionEpoch
    });
    if (!acquired.ok) {
      rejectPrimaryModelDispatch(acquired.blockingOwner, { requestId, ownerKind: "phone_chat" });
      return;
    }
    if (!appendPhoneChatMessage(threadId, "producer", text)) {
      releasePrimaryModelChannel(requestId, acquired.owner.channelLeaseId, "empty_phone_message");
      return;
    }

    if (input) input.value = "";
    renderPhoneChatMessages(threadId);
    renderPhoneChatList();
    saveState();
    sendPhoneChatToHost(text, threadId, {
      requestId,
      channelLeaseId: acquired.owner.channelLeaseId
    });
  }
  function renderPhoneApp() {
    renderPhoneStatusBar();
    if (state.phoneChat.activeView === "home") {
      showPhoneHomeView();
      return;
    }
    showPhoneLineAppShell();
    if (state.phoneChat.activeView === "add_friend") {
      openPhoneAddFriendView();
      return;
    }
    if (state.phoneChat.activeView === "chat" && state.phoneChat.activeThreadId) {
      openPhoneThread(state.phoneChat.activeThreadId);
      return;
    }
    showPhoneListView();
  }

  function openPhoneOverlay() {
    if (!state.idol) {
      showToast("尚未选择担当", "请先选择担当偶像后再打开手机。", "warn");
      return;
    }
    ensureStateShape();
    if (reconcilePhoneChatPendingState()) saveState();
    renderPhoneApp();
    setElementHidden("phoneOverlay", false);
  }

  function closePhoneOverlay() {
    showPhoneHomeView();
    setElementHidden("phoneOverlay", true);
  }

  function setInteractionMode(mode) {
    interactionMode = mode === "ai" ? "ai" : "specified";
    const aiDecides = interactionMode === "ai";
    const specifiedButton = document.getElementById("interactionModeSpecified");
    const aiButton = document.getElementById("interactionModeAi");
    specifiedButton.classList.toggle("active", !aiDecides);
    aiButton.classList.toggle("active", aiDecides);
    specifiedButton.setAttribute("aria-pressed", String(!aiDecides));
    aiButton.setAttribute("aria-pressed", String(aiDecides));
    document.getElementById("interactionCharacterList").classList.toggle("is-disabled", aiDecides);
    renderInteractionCharacters();
  }

  function renderInteractionCharacters() {
    const list = document.getElementById("interactionCharacterList");
    const aiDecides = interactionMode === "ai";
    list.innerHTML = "";
    interactionCharacters.filter((name) => name !== state.idol).forEach((name, index) => {
      const button = document.createElement("button");
      const selected = selectedInteractionCharacters.has(name);
      button.id = `interaction-character-${index + 1}`;
      button.type = "button";
      button.className = `interaction-character-button${selected ? " selected" : ""}`;
      button.textContent = name;
      button.disabled = aiDecides;
      button.setAttribute("aria-pressed", String(selected));
      button.addEventListener("click", () => {
        if (selectedInteractionCharacters.has(name)) selectedInteractionCharacters.delete(name);
        else selectedInteractionCharacters.add(name);
        renderInteractionCharacters();
      });
      list.appendChild(button);
    });
    const validation = document.getElementById("interactionValidation");
    validation.textContent = aiDecides
      ? "AI 将从角色库中选择一至三名其他偶像。"
      : selectedInteractionCharacters.size
        ? `已选择 ${selectedInteractionCharacters.size} 名偶像。`
        : "请选择至少一名其他偶像。";
    validation.classList.toggle("is-warning", !aiDecides && selectedInteractionCharacters.size === 0);
  }

  function openInteractionOverlay() {
    selectedInteractionCharacters = new Set();
    document.getElementById("interactionPhaseBadge").textContent = getPhase();
    document.getElementById("interactionPlotTextarea").value = "";
    setElementHidden("interactionOverlay", false);
    setInteractionMode("specified");
  }

  function closeInteractionOverlay() {
    setElementHidden("interactionOverlay", true);
  }

  function openOutingOverlay() {
    document.getElementById("outingPhaseBadge").textContent = getPhase();
    document.getElementById("outingCustomInput").value = "";
    const list = document.getElementById("outingDestinationList");
    list.innerHTML = "";
    outingDestinations.forEach((destination, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.id = `outing-destination-${index + 1}`;
      button.className = "outing-destination-button";
      button.innerHTML = `<strong>${destination.name}</strong><span>${destination.description}</span>`;
      button.addEventListener("click", () => confirmOutingDestination(destination.name));
      list.appendChild(button);
    });
    setElementHidden("outingOverlay", false);
  }

  function closeOutingOverlay() {
    setElementHidden("outingOverlay", true);
  }

  function openCompanionOverlay() {
    document.getElementById("companionPhaseBadge").textContent = getPhase();
    document.getElementById("companionTopicTextarea").value = "";
    setElementHidden("companionOverlay", false);
    document.getElementById("companionTopicTextarea").focus();
  }

  function closeCompanionOverlay() {
    setElementHidden("companionOverlay", true);
  }

  function confirmCompanionTopic(topic) {
    const companionTopic = String(topic || "").trim();
    if (!companionTopic) {
      showToast("还没有内容", "输入这次想与担当交流的话题或互动后再开始。", "warn");
      return;
    }
    const apartmentIdol = String(state.freeMode?.apartmentPendingChatIdol || "").trim();
    if (apartmentIdol) {
      state.freeMode.apartmentPendingChatIdol = "";
      closeCompanionOverlay();
      beginApartmentCompanionChat(apartmentIdol, companionTopic);
      return;
    }
    closeCompanionOverlay();
    settleAction("companion", null, { companionTopic });
  }

  function submitCompanionTopic() {
    confirmCompanionTopic(document.getElementById("companionTopicTextarea").value);
  }

  const imeComposingInputs = {};

  function bindImeSafeTextInput(inputId, onSubmit) {
    const input = document.getElementById(inputId);
    if (!input || input.dataset.imeBound === "true") return;
    input.dataset.imeBound = "true";
    input.addEventListener("compositionstart", () => {
      imeComposingInputs[inputId] = true;
    });
    input.addEventListener("compositionend", () => {
      imeComposingInputs[inputId] = false;
    });
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      runAfterImeCommit(inputId, onSubmit);
    });
  }

  function runAfterImeCommit(inputId, callback) {
    const input = document.getElementById(inputId);
    if (!input) {
      callback();
      return;
    }
    const run = () => callback();
    if (imeComposingInputs[inputId]) {
      input.addEventListener("compositionend", run, { once: true });
      return;
    }
    run();
  }

  function readTextInputValue(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return "";
    return String(input.value || "").trim();
  }

  function openIntimacyOverlay() {
    if (!isIntimacyUnlocked()) {
      showToast("尚未解锁", `信赖值达到 ${INTIMACY_UNLOCK_TRUST} 后解锁亲密行动。`, "warn");
      return;
    }
    document.getElementById("intimacyPhaseBadge").textContent = getPhase();
    const note = document.getElementById("intimacyModeNote");
    if (note) {
      note.textContent = `当前信赖 ${state.trust}。普通亲密已解锁；NSFW 亲密需信赖 ${INTIMACY_NSFW_UNLOCK_TRUST}。`;
    }
    const nsfwButton = document.getElementById("intimacyNsfwBtn");
    const nsfwBadge = document.getElementById("intimacyNsfwBadge");
    const nsfwReady = isIntimacyNsfwUnlocked();
    if (nsfwButton) {
      nsfwButton.disabled = !nsfwReady;
      nsfwButton.title = nsfwReady ? "NSFW 亲密占位入口" : `信赖值达到 ${INTIMACY_NSFW_UNLOCK_TRUST} 后解锁`;
    }
    if (nsfwBadge) {
      nsfwBadge.textContent = nsfwReady ? "VN多轮" : "信赖100解锁";
      nsfwBadge.classList.toggle("is-ready", nsfwReady);
      nsfwBadge.classList.toggle("is-locked", !nsfwReady);
    }
    setElementHidden("intimacyOverlay", false);
  }

  function closeIntimacyOverlay() {
    setElementHidden("intimacyOverlay", true);
  }

  function confirmIntimacyMode(mode) {
    if (mode === "nsfw") {
      if (!isIntimacyNsfwUnlocked()) {
        showToast("尚未解锁", `信赖值达到 ${INTIMACY_NSFW_UNLOCK_TRUST} 后解锁 NSFW 亲密。`, "warn");
        return;
      }
      closeIntimacyOverlay();
      settleAction("intimacy", null, { intimacyMode: "nsfw" });
      return;
    }
    closeIntimacyOverlay();
    settleAction("intimacy", null, { intimacyMode: "normal" });
  }

  function confirmOutingDestination(destination) {
    const location = String(destination || "").trim();
    if (!location) {
      showToast("还没有地点", "请选择预设地点，或输入自定义外出地点。", "warn");
      return;
    }
    closeOutingOverlay();
    settleAction("outing", null, { destination: location });
  }

  function submitCustomOutingDestination() {
    runAfterImeCommit("outingCustomInput", () => {
      confirmOutingDestination(readTextInputValue("outingCustomInput"));
    });
  }

  function submitFreeChat() {
    const topic = document.getElementById("freeChatTextarea").value.trim();
    if (!topic) {
      showToast("还没有话题", "输入这次想和担当聊的内容后再发送。", "warn");
      return;
    }
    const prompt = buildFreeChatPrompt(topic);
    const requestId = createRequestId();
    const dispatch = acquirePrimaryEntryDispatch(requestId, "free_chat");
    if (!dispatch.ok) return;
    state.activeStoryNode = { type: "freechat", topic, ready: false };
    state.lastPrompt = prompt;
    state.lastStory = `正在和${state.idol}聊：${topic}`;
    saveState();
    renderNotebook();
    closeFreeChatOverlay();
    pendingAiRequestId = requestId;
    openEventOverlay("担当闲聊", "闲聊不消耗行动次数，也不会推进日程或改变数值。", buildAiWaitingStory(`正在等待${state.idol}回应这个话题。`));
    const sent = dispatch.owner
      ? requestHostPromptSend(prompt, requestId, { channelLeaseId: dispatch.owner.channelLeaseId, ownerKind: "free_chat" })
      : requestHostPromptSend(prompt, requestId);
    if (!sent) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制闲聊提示词后手动发送。出于本地测试需要，本次闲聊不会推进日程。 ");
    }
  }

  function submitIdolInteraction() {
    const aiDecides = interactionMode === "ai";
    const selectedCharacters = [...selectedInteractionCharacters];
    if (!aiDecides && selectedCharacters.length === 0) {
      document.getElementById("interactionValidation").textContent = "请先选择至少一名其他偶像，或切换为 AI 决定。";
      document.getElementById("interactionValidation").classList.add("is-warning");
      showToast("还没有互动角色", "选择一名或多名其他偶像，或交给 AI 决定。", "warn");
      return;
    }
    const plot = document.getElementById("interactionPlotTextarea").value.trim();
    const prompt = buildIdolInteractionPrompt(selectedCharacters, plot, aiDecides);
    const requestId = createRequestId();
    const dispatch = acquirePrimaryEntryDispatch(requestId, "idol_interaction");
    if (!dispatch.ok) return;
    state.activeStoryNode = { type: "interaction", selectedCharacters, aiDecides, plot, ready: false };
    state.lastPrompt = prompt;
    state.lastStory = aiDecides
      ? `正在等待 AI 为${state.idol}安排互动角色与情节。`
      : `正在等待${state.idol}与${selectedCharacters.join("、")}的互动剧情。`;
    saveState();
    renderNotebook();
    closeInteractionOverlay();
    pendingAiRequestId = requestId;
    openEventOverlay("偶像互动", "互动不消耗行动次数，也不会推进日程或改变数值。", buildAiWaitingStory("正在等待角色卡生成完整互动剧情。"));
    const sent = dispatch.owner
      ? requestHostPromptSend(prompt, requestId, { channelLeaseId: dispatch.owner.channelLeaseId, ownerKind: "idol_interaction" })
      : requestHostPromptSend(prompt, requestId);
    if (!sent) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制互动提示词后手动发送。互动不会推进日程。 ");
    }
  }

  function submitAiPrompt() {
    const prompt = document.getElementById("aiPromptTextarea").value.trim();
    if (!prompt) {
      showToast("提示词为空", "请先输入要发送给 AI 的后续剧情提示词。", "warn");
      return;
    }
    const requestId = createRequestId();
    const phoneEdit = state.activeStoryNode?.type === "phonechat";
    const ownerKind = phoneEdit ? "phone_chat" : "manual_prompt";
    const dispatch = acquirePrimaryEntryDispatch(requestId, ownerKind);
    if (!dispatch.ok) return;
    state.lastPrompt = prompt;
    saveState();
    renderNotebook();
    closeAiPromptOverlay();
    pendingAiRequestId = requestId;
    if (phoneEdit) {
      state.phoneChat.isAwaitingReply = true;
      state.phoneChat.pendingRequestId = requestId;
      setPhoneChatTyping(true);
      setPhoneChatComposerEnabled(false);
      saveState();
      const sent = dispatch.owner
        ? sendPhoneChatPromptToHost(prompt, requestId, { channelLeaseId: dispatch.owner.channelLeaseId, ownerKind: "phone_chat" })
        : sendPhoneChatPromptToHost(prompt, requestId);
      if (sent) return;
      state.phoneChat.isAwaitingReply = false;
      state.phoneChat.pendingRequestId = "";
      pendingAiRequestId = "";
      setPhoneChatTyping(false);
      setPhoneChatComposerEnabled(true);
      openAiPromptOverlay("当前页面未连接 SillyTavern。请复制私聊提示词后手动发送。");
      return;
    }
    openEventOverlay("AI 生成请求", "已重新发送提示词，等待角色卡回复。", "正在等待角色卡 AI 生成本次小剧情...");
    const sent = dispatch.owner
      ? requestHostPromptSend(prompt, requestId, { channelLeaseId: dispatch.owner.channelLeaseId, ownerKind: "manual_prompt" })
      : requestHostPromptSend(prompt, requestId);
    if (sent) return;
    openNotebook("prompt");
    showToast("提示词已准备", "当前不在 SillyTavern iframe 中，请从 P 手账复制。", "warn");
  }

  function setEventActionsEnabled(enabled, isGenerating = false) {
    const confirm = document.getElementById("eventConfirmBtn");
    if (confirm) {
      confirm.disabled = !enabled;
      if (isGenerating) {
        confirm.textContent = "正在生成中...";
      } else {
        const node = state.activeStoryNode;
        confirm.textContent = 
          node?.type === "affinity" && node.threshold === 0 
            ? "确认开始育成" 
            : node?.type === "firstLivePre" 
              ? "Live 开始" 
              : "确定";
      }
    }
    const regenBtn = document.getElementById("eventRegenBtn");
    if (regenBtn) regenBtn.disabled = !enabled;
    const aiBtn = document.getElementById("eventAiBtn");
    if (aiBtn) aiBtn.disabled = !enabled;
    setVnControlsEnabled(enabled);
  }

  function setVnControlsEnabled(enabled) {
    ["vnBtnRegen", "vnBtnEdit", "vnBtnAuto", "vnBtnSkip"].forEach((id) => {
      const button = document.getElementById(id);
      if (button) button.disabled = !enabled;
    });
    const debugBtn = document.getElementById("vnBtnDebug");
    if (debugBtn) debugBtn.disabled = false;
  }

  function buildChoiceContinuationDisplayStory(intro, chosenLine, reply) {
    return [chosenLine, reply].filter(Boolean).join("\n\n");
  }

  function buildChoicePendingDisplayStory(intro, chosenLine) {
    return [
      chosenLine,
      "<narration>正在等待 SillyTavern 生成偶像的回应，请稍候...</narration>"
    ].filter(Boolean).join("\n\n");
  }

  function triggerRegeneration() {
    const choicePrompt = isChoicePromptMode();
    const choiceResolution = isChoiceResolutionMode();
    const requestId = isChoicePromptMode() ? createRequestId() : (state.lastRequestId || createRequestId());
    let dispatch = null;
    if (!choicePrompt && !choiceResolution) {
      dispatch = acquirePrimaryEntryDispatch(requestId, "regeneration");
      if (!dispatch.ok) return;
    }
    pendingAiRequestId = requestId;
    state.lastRequestId = requestId;
    saveState();
    
    setEventActionsEnabled(false, true);
    
    const choicesEl = document.getElementById("eventChoices");
    if (choicesEl) {
      choicesEl.innerHTML = "";
      setElementHidden("eventChoices", true);
    }
    
    const loadText = isChoiceResolutionMode()
      ? "正在重新生成偶像的反应..."
      : "正在重新生成剧情...";

    const storyEl = document.getElementById("eventStory");
    if (storyEl) {
      if (isChoiceResolutionMode()) {
        const intro = state.lastStory || "";
        const chosenLine = `▶ 制作人的选择：${state.selectedChoiceText || ""} (${state.selectedChoiceRating || ""})`;
        storyEl.innerHTML = `${formatStoryText(intro + "\n\n" + chosenLine)}<br><br><span id="eventReactionLoading" style="opacity:0.6;">(正在重新生成偶像的反应...)</span>`;
      } else {
        storyEl.textContent = loadText;
      }
    }
    
    // 同步 VN 播放器显示为重新生成中的加载状态
    openEventOverlay(state.lastEventTitle, "正在重新生成...", loadText);

    if (isChoicePromptMode()) {
      if (requestHostPromptSend(state.lastPrompt, requestId)) {
        showToast("正在重新生成选项", "已重新发送完整选项提示词，等待 SillyTavern 回复。", "info");
        return;
      }
      openAiPromptOverlay("当前页面未连接 SillyTavern。请复制或编辑完整选项提示词后手动发送。");
      showToast("提示词已准备", "重新生成选项需要发送完整提示词。", "warn");
      return;
    }
    
    const regenerationOptions = dispatch?.owner
      ? { channelLeaseId: dispatch.owner.channelLeaseId, ownerKind: "regeneration" }
      : { ownerKind: "legacy_main" };
    if (isSillyTavernHost() && requestHostRegeneration(requestId, regenerationOptions)) {
      console.log('[Hatsu Produce] 正在发送 regenerate 消息到宿主端...', requestId);
      showToast("正在重新生成", "已向 SillyTavern 发送重新生成请求。", "info");
    } else {
      console.warn('[Hatsu Produce] 检测到未连接宿主，无法重新生成。');
      showToast("未连接酒馆", "当前页面未连接 SillyTavern，无法触发重新生成。", "warn");
    }
  }

  function openEventOverlay(title, result, story) {
    if (typeof closeVnLogView === "function") closeVnLogView();
    if (typeof closeVnDebugView === "function") closeVnDebugView();
    state.lastEventTitle = title || "行动事件";
    state.lastEventResult = result || "本次行动已经完成结算。";
    state.lastEventStory = story || state.lastStory || "本次行动已经完成。";
    saveState();
    
    // 1. 填充古典面板（用于 LOG 切换查看）
    const titleEl = document.getElementById("eventTitle");
    if (titleEl) titleEl.textContent = title || "行动事件";
    const phaseEl = document.getElementById("eventPhaseBadge");
    if (phaseEl) phaseEl.textContent = getPhase();
    const resultEl = document.getElementById("eventResult");
    if (resultEl) resultEl.textContent = result || "本次行动已经完成结算。";
    const storyEl = document.getElementById("eventStory");
    if (storyEl) storyEl.innerHTML = formatStoryText(story || state.lastStory || "本次行动已经完成。");

    const choicesEl = document.getElementById("eventChoices");
    if (choicesEl) {
      choicesEl.innerHTML = "";
      setElementHidden("eventChoices", true);
    }
    const vnChoicesOverlay = document.getElementById("vnChoicesOverlay");
    if (vnChoicesOverlay) vnChoicesOverlay.style.display = "none";
    const vnChoicesContainer = document.getElementById("vnChoicesContainer");
    if (vnChoicesContainer) vnChoicesContainer.innerHTML = "";
    
    if (pendingAiRequestId) {
      setEventActionsEnabled(false, true);
    } else {
      setEventActionsEnabled(true, false);
    }

    // 同步 VN 控制按钮的可点击状态
    setVnControlsEnabled(!pendingAiRequestId);

    const eventOverlay = document.getElementById("eventOverlay");
    const isAlreadyOpen = eventOverlay && !eventOverlay.hidden;

    const initContent = () => {
      setElementHidden("eventOverlay", false);
      if (isFreeModeActive()) updateFreeModeHeader();
      
      // 2. 判断当前是否为加载状态
      const isLoading = pendingAiRequestId || story.includes("等待角色卡") || story.includes("等待 AI") || story.includes("等待 SillyTavern") || story.includes("正在重新生成");
      aiBridgeDebug.lastOverlay = {
        at: Date.now(),
        title: title || "行动事件",
        result: result || "",
        storyLength: String(story || "").length,
        isLoading: Boolean(isLoading),
        pendingAiRequestId,
        eventMode: state.eventMode,
        choiceStep: state.choiceStep
      };
      refreshVnDebugView();
      
      if (isLoading) {
        // 如果正在加载，直接显示一行静态文本，并禁用 VN 对话框点击动作
        const slides = [{ type: "narration", speaker: "", text: story }];
        initVisualNovelPlayer(slides);
        completeVnSlideText();
        const dialogueBox = document.getElementById("vnDialogueBox");
        if (dialogueBox) dialogueBox.onclick = null;
      } else {
        // 解析流式生成/已完成的剧本并启动 VN 对话播放
        const slides = buildVnSlidesFromStory(story);
        const isResume = (isChoiceResolutionMode() || !!state.selectedChoiceText);
        initVisualNovelPlayer(slides, isResume);
      }
    };

    if (isAlreadyOpen) {
      initContent();
    } else {
      triggerWipeTransition(initContent);
    }
  }

  function skipPendingOpening() {
    markAffinityViewed(0);
    state.affinity.openingComplete = true;
    state.activeStoryNode = null;
    pendingAiRequestId = "";
  }

  // ==========================================
  // Galgame Visual Novel Player State & Logic
  // ==========================================
  let vnSlides = [];
  let vnCurrentIndex = 0;
  let vnTypewriterTimer = 0;
  let vnIsTyping = false;
  let vnIsAuto = false;
  let vnAutoTimer = 0;
  let vnSpeed = 25; // Typewriter speed (ms/char)
  let vnAutoDelay = 1800; // Auto play delay after text finished
  let vnCurrentText = "";

  function parseNovelSlides(text) {
    if (!text) return [];
    
    // 清除初星开始/结束标记
    let cleanText = text
      .replace(/[【\[]\s*初星正文开始\s*[】\]]/g, "")
      .replace(/[【\[]\s*初星正文结束\s*[】\]][\s\S]*$/g, "")
      .trim();

    const slides = [];
    const xmlRegex = /<(dialogue|narration)(?:\s+char="([^"]+)")?>([\s\S]*?)<\/\1>/gi;
    let match;
    let lastIndex = 0;
    let hasXmlTags = false;
    
    // Helper to parse plain text segments using the same paragraph-splitting logic
    const parseFallbackParagraphs = (str) => {
      const paragraphs = str
        .split(/\n+/)
        .map(p => p.trim())
        .filter(Boolean);

      for (const p of paragraphs) {
        if (p.startsWith("▶") || p.startsWith("?")) {
          slides.push({ type: "narration", speaker: "", text: p });
          continue;
        }
        
        const speakerMatch = p.match(/^([^：:「“"'\s]{1,10})\s*[：:]\s*([\s\S]+)$/);
        if (speakerMatch) {
          const speaker = speakerMatch[1].trim();
          const content = speakerMatch[2].trim();
          slides.push({ type: "dialogue", speaker, text: content });
        } else if (p.startsWith("“") || p.startsWith("「") || p.startsWith('"') || p.startsWith("'")) {
          slides.push({ type: "dialogue", speaker: state.idol || "偶像", text: p });
        } else {
          slides.push({ type: "narration", speaker: "", text: p });
        }
      }
    };

    while ((match = xmlRegex.exec(cleanText)) !== null) {
      hasXmlTags = true;
      // Parse any raw text that appears before this XML tag
      const rawTextBefore = cleanText.slice(lastIndex, match.index).trim();
      if (rawTextBefore) {
        parseFallbackParagraphs(rawTextBefore);
      }
      
      const type = match[1].toLowerCase();
      const speaker = match[2] || "";
      const content = match[3].trim();
      if (content) {
        slides.push({ type, speaker, text: content });
      }
      lastIndex = xmlRegex.lastIndex;
    }

    if (hasXmlTags) {
      // Parse any remaining raw text that appears after the last XML tag
      const rawTextAfter = cleanText.slice(lastIndex).trim();
      if (rawTextAfter) {
        parseFallbackParagraphs(rawTextAfter);
      }
      return slides;
    }

    // Fallback: entire text is treated as plain text paragraphs
    parseFallbackParagraphs(cleanText);
    return slides;
  }

  function buildVnSlidesFromStory(story) {
    const parsed = parseNovelSlides(story);
    if (parsed.length) return parsed;
    const clean = cleanReplyText(String(story || "").trim());
    if (!clean) return [];
    return [{ type: "narration", speaker: "", text: clean }];
  }

  function getSceneBackground() {
    // 正在进行地图地点探索时，优先使用该地区的场景，避免残留剧情节点把每个地区的背景覆盖成默认
    if (state.pendingActionContext?.action === "map_location") {
      const mapActionContext = state.pendingActionContext.actionContext || {};
      return getMapLocationSceneBackground(mapActionContext);
    }

    const node = state.activeStoryNode;
    if (node) {
      if (node.type === "sandboxOpening" || node.type === "sandboxInvite") {
        return "./assets/scenes/Producer_Class.png";
      }
      if (node.type === "firstLivePre" || node.type === "firstLivePost") {
        return "./assets/scenes/campus.png";
      }
      if (node.type === "affinity") {
        return "./assets/scenes/campus.png";
      }
    }

    const context = state.pendingActionContext || (state.log && state.log[0]);
    if (context) {
      const action = context.rawAction || context.action;
      const attr = context.rawAttribute || context.attribute;
      
      if (action === "lesson") {
        return "./assets/scenes/Class.png";
      }
      if (action === "training") {
        if (attr === "Vo") return "./assets/scenes/vo_class.png";
        if (attr === "Da") return "./assets/scenes/da_class.png";
        if (attr === "Vi") return "./assets/scenes/vi_class.png";
      }
      if (action === "rest") {
        return "./assets/scenes/rest.png";
      }
      if (action === "outing") {
        const destination = String(context.actionContext?.destination || "").trim();
        if (OUTING_DESTINATION_SCENES[destination]) return OUTING_DESTINATION_SCENES[destination];
        return "./assets/scenes/campus.png";
      }
      if (action === "companion" || action === "intimacy") {
        if (context.actionContext?.apartmentInvite) {
          return PRODUCER_APARTMENT_SCENE;
        }
        return "./assets/scenes/rest.png";
      }
      if (action === "map_location") {
        const actionContext = context.actionContext || state.pendingActionContext?.actionContext || {};
        return getMapLocationSceneBackground(actionContext);
      }
      if (action === "apartment_companion") {
        return getProducerApartmentSceneBackground();
      }
    }
    return "./assets/scenes/campus.png";
  }

  function initVisualNovelPlayer(slides, isResume = false) {
    vnSlides = slides || [];
    vnCurrentIndex = 0;
    vnIsTyping = false;
    stopVnAuto();

    if (isResume) {
      const choiceIdx = vnSlides.findIndex(slide => slide.text && (slide.text.includes("制作人的选择") || slide.text.includes("▶ 制作人的选择")));
      if (choiceIdx !== -1) {
        vnCurrentIndex = choiceIdx;
      }
    }
    
    // 切换背景
    const bgUrl = getSceneBackground();
    const backdropEl = document.getElementById("vnBackdrop");
    if (backdropEl) {
      backdropEl.style.backgroundImage = `linear-gradient(180deg, rgba(18, 18, 24, 0.08) 0%, transparent 42%, rgba(18, 18, 24, 0.22) 100%), url('${bgUrl}')`;
    }
    
    // 初始化显示层
    document.getElementById("vnContainer").style.display = "flex";
    document.getElementById("vnClassicPanel").style.display = "none";
    document.getElementById("vnChoicesOverlay").style.display = "none";
    
    const dialogueBox = document.getElementById("vnDialogueBox");
    if (dialogueBox) {
      dialogueBox.onclick = null;
      dialogueBox.onclick = (e) => {
        if (e.target.closest(".vn-controls") || e.target.closest(".vn-btn")) {
          return;
        }
        handleVnBoxClick();
      };
    }
    
    renderVnSlide(vnCurrentIndex);
  }

  function handleVnBoxClick() {
    if (vnIsTyping) {
      completeVnSlideText();
    } else {
      advanceVnSlide();
    }
  }

  function renderVnSlide(index) {
    if (vnTypewriterTimer) {
      clearInterval(vnTypewriterTimer);
      vnTypewriterTimer = 0;
    }
    if (vnAutoTimer) {
      clearTimeout(vnAutoTimer);
      vnAutoTimer = 0;
    }

    vnCurrentIndex = index;
    
    if (index >= vnSlides.length) {
      handleVnSlidesEnd();
      return;
    }
    
    const slide = vnSlides[index];
    const nameplateEl = document.getElementById("vnNameplate");
    const textEl = document.getElementById("vnText");
    const standeeEl = document.getElementById("vnStandee");
    
    // 1. 设置名字框和立绘显示
    if (slide.type === "narration" || !slide.speaker) {
      nameplateEl.style.display = "none";
      if (standeeEl) {
        standeeEl.classList.remove("active");
        standeeEl.classList.add("fade-out");
        setTimeout(() => {
          if (standeeEl.classList.contains("fade-out")) {
            standeeEl.style.display = "none";
          }
        }, 350);
      }
    } else {
      nameplateEl.style.display = "block";
      nameplateEl.textContent = slide.speaker;
      
      // 决定主题色
      let themeColor = "#7e57c2";
      const resolvedPortrait = resolvePortraitForSpeaker(slide.speaker);
      const isProducer = resolvedPortrait.characterKey === "producer";
      const speakerCanonical = canonicalIdolName(slide.speaker);
      
      if (isProducer) {
        themeColor = "#5c6bc0"; // 制作人专属蓝色
      } else if (idols[speakerCanonical]) {
        themeColor = idols[speakerCanonical].theme;
      }
      nameplateEl.style.setProperty("--speaker-theme-color", themeColor);
      
      // 2. 加载发言者立绘并置于中央
      if (standeeEl) {
        if (resolvedPortrait.url) {
          applyResolvedPortraitToImage(standeeEl, resolvedPortrait);
          standeeEl.style.display = "block";
          setTimeout(() => {
            standeeEl.classList.remove("fade-out");
            standeeEl.classList.add("active");
          }, 20);
        } else {
          standeeEl.classList.remove("active");
          standeeEl.classList.add("fade-out");
          setTimeout(() => {
            if (standeeEl.classList.contains("fade-out")) {
              standeeEl.style.display = "none";
            }
          }, 350);
        }
      }
    }

    // 3. 启动打字机动画
    vnCurrentText = formatStoryText(slide.text);
    textEl.innerHTML = "";
    vnIsTyping = true;
    
    let totalLength = vnCurrentText.length;
    let step = 0;
    
    vnTypewriterTimer = setInterval(() => {
      step += 2;
      if (step >= totalLength) {
        clearInterval(vnTypewriterTimer);
        vnTypewriterTimer = 0;
        textEl.innerHTML = vnCurrentText;
        vnIsTyping = false;
        if (vnIsAuto) {
          scheduleVnAutoAdvance();
        }
      } else {
        let sliceStr = vnCurrentText.slice(0, step);
        const openTags = (sliceStr.match(/<[a-zA-Z1-6]+/g) || []).length;
        const closeTags = (sliceStr.match(/<\/[a-zA-Z1-6]+/g) || []).length;
        
        if (openTags > closeTags) {
          const nextClose = vnCurrentText.indexOf(">", step);
          if (nextClose !== -1) {
            step = nextClose + 1;
            sliceStr = vnCurrentText.slice(0, step);
          }
        }
        textEl.innerHTML = sliceStr;
      }
    }, vnSpeed);
  }

  function completeVnSlideText() {
    if (vnTypewriterTimer) {
      clearInterval(vnTypewriterTimer);
      vnTypewriterTimer = 0;
    }
    const textEl = document.getElementById("vnText");
    if (textEl) {
      textEl.innerHTML = vnCurrentText;
    }
    vnIsTyping = false;
    if (vnIsAuto) {
      scheduleVnAutoAdvance();
    }
  }

  function advanceVnSlide() {
    if (vnCurrentIndex < vnSlides.length - 1) {
      renderVnSlide(vnCurrentIndex + 1);
    } else {
      handleVnSlidesEnd();
    }
  }

  function handleVnSlidesEnd() {
    stopVnAuto();
    
    const hasOptionChoices = (isChoicePromptMode() && state.pendingOptionTexts?.length === 4)
      || (isEveningGoHomeActive() && state.pendingOptionTexts?.length >= 2);
    const showMapReturnOnly = isMapLocationExploreActive()
      && state.eventMode === "none"
      && !isFreeModeTravelAllowed()
      && !pendingAiRequestId;
    const hasMapLocationControls = isMapLocationExploreActive() && (
      hasOptionChoices
      || showMapReturnOnly
      || (isChoicePromptMode() && !pendingAiRequestId && state.pendingOptionTexts.length === 0)
    );
    
    if (hasOptionChoices || hasMapLocationControls) {
      showVnChoicesOverlay();
    } else {
      const choiceOverlay = document.getElementById("vnChoicesOverlay");
      if (choiceOverlay) choiceOverlay.style.display = "none";
      const choiceContainer = document.getElementById("vnChoicesContainer");
      if (choiceContainer) choiceContainer.innerHTML = "";

      const textEl = document.getElementById("vnText");
      if (textEl) {
        textEl.innerHTML = "<strong>[ 本次事件已播放完毕，点击对话框以继续 ]</strong>";
      }
      
      const nameplateEl = document.getElementById("vnNameplate");
      if (nameplateEl) nameplateEl.style.display = "none";
      
      const dialogueBox = document.getElementById("vnDialogueBox");
      if (dialogueBox) {
        dialogueBox.onclick = null;
        dialogueBox.onclick = (event) => {
          if (event.target.closest(".vn-controls") || event.target.closest(".vn-btn")) {
            return;
          }
          const confirmBtn = document.getElementById("eventConfirmBtn");
          if (confirmBtn && !confirmBtn.disabled) {
            confirmBtn.click();
          } else {
            closeEventOverlay();
          }
        };
      }
    }
  }

  function closeVnChoicesOverlay() {
    const overlay = document.getElementById("vnChoicesOverlay");
    if (overlay) overlay.style.display = "none";
    hideVnCustomChoicePanel();
  }

  function hideVnCustomChoicePanel() {
    const panel = document.getElementById("vnCustomChoicePanel");
    const container = document.getElementById("vnChoicesContainer");
    const title = document.getElementById("vnChoicesTitle");
    const input = document.getElementById("vnCustomChoiceInput");
    if (panel) panel.hidden = true;
    if (container) container.hidden = false;
    if (title) title.hidden = false;
    if (input) input.value = "";
  }

  function showVnCustomChoicePanel() {
    const panel = document.getElementById("vnCustomChoicePanel");
    const container = document.getElementById("vnChoicesContainer");
    const title = document.getElementById("vnChoicesTitle");
    const input = document.getElementById("vnCustomChoiceInput");
    if (panel) panel.hidden = false;
    if (container) container.hidden = true;
    if (title) title.hidden = true;
    if (input) {
      input.value = "";
      input.focus();
    }
  }

  function settleNsfwIntimacyStats() {
    const delta = { stamina: 38, stress: -10 };
    Object.entries(delta).forEach(([key, value]) => {
      const max = 100;
      state[key] = clamp((state[key] || 0) + value, 0, max);
    });
    const actionName = nsfwIntimacyActionTitle();
    const resultSummary = `${formatDelta(delta)}，【NSFW亲密·结束】`;
    if (isApartmentNsfwInviteActive()) {
      appendEveningJournalActivity("公寓邀约", `与 ${getNsfwIntimacyTargetIdol()} 的私密互动结束 · ${resultSummary}`);
    } else {
      refreshAffinityUnlocks();
      advanceRound();
      rollSpCandidates();
      state.log.unshift({
        day: state.day,
        round: state.round,
        phase: getPhase(),
        action: actionName,
        result: resultSummary
      });
      state.log = state.log.slice(0, 24);
    }
    return delta;
  }

  function requestNsfwIntimacyAiRound(producerAction, prompt, debugLine) {
    if (!state.pendingActionContext) return;
    const chosenLine = `<narration>▶ 制作人：${producerAction}</narration>`;
    state.pendingOptionTexts = [];
    state.eventMode = "choice_prompt";
    state.choiceStep = 1;
    const requestId = createRequestId();
    pendingAiRequestId = requestId;
    state.lastPrompt = prompt;
    state.lastDebug = debugLine;
    state.lastStory = state.lastStory ? `${state.lastStory}\n\n${chosenLine}` : chosenLine;
    saveState();
    render();
    closeVnChoicesOverlay();
    setElementHidden("eventChoices", true);
    const actionsEl = document.getElementById("eventActions");
    if (actionsEl) actionsEl.style.display = "grid";
    const confirm = document.getElementById("eventConfirmBtn");
    if (confirm) {
      confirm.disabled = true;
      confirm.textContent = "正在生成中...";
    }
    const pendingStory = buildChoicePendingDisplayStory(state.lastStory, chosenLine);
    openEventOverlay(nsfwIntimacyActionTitle(), "正在等待 SillyTavern 角色回复", pendingStory);
    if (!requestHostPromptSend(prompt, requestId)) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请复制提示词发送获取后续。");
    }
  }

  function handleNsfwIntimacyPresetChoice(index) {
    const chosenOptionText = state.pendingOptionTexts[index] || "选择该选项";
    requestNsfwIntimacyAiRound(
      chosenOptionText,
      buildNsfwIntimacyContinuePrompt(chosenOptionText),
      `NSFW 亲密继续：已选择“${chosenOptionText}”，等待 AI 生成下一段剧情与 4 个选项。`
    );
  }

  function handleNsfwIntimacyCustomChoice(rawText) {
    const producerAction = String(rawText || "").trim();
    if (!producerAction) {
      showToast("还没有内容", "请输入自定义行动或台词。", "warn");
      return;
    }
    requestNsfwIntimacyAiRound(
      producerAction,
      buildNsfwIntimacyContinuePrompt(producerAction),
      `NSFW 亲密继续：已发送自定义行动“${producerAction}”，等待 AI 生成下一段剧情与 4 个选项。`
    );
  }

  function handleVnCustomChoiceSubmit() {
    const customText = document.getElementById("vnCustomChoiceInput")?.value || "";
    if (isNsfwIntimacyActive()) {
      handleNsfwIntimacyCustomChoice(customText);
      return;
    }
    if (isMapLocationExploreActive() && isChoicePromptMode()) {
      handleMapLocationCustomChoice(customText);
      return;
    }
    if (isApartmentCompanionSessionActive() && isChoicePromptMode()) {
      handleApartmentCompanionCustomChoice(customText);
      return;
    }
    showToast("当前不可用", "此处暂不支持自定义输入。", "warn");
  }

  function handleNsfwIntimacyEndChoice() {
    if (!state.pendingActionContext) return;
    closeVnChoicesOverlay();
    settleNsfwIntimacyStats();
    const producerAction = "（结束本次亲密互动）";
    const chosenLine = `<narration>▶ 制作人选择结束本次 NSFW 亲密互动</narration>`;
    state.selectedChoiceText = "结束亲密";
    state.selectedChoiceRating = "【NSFW亲密·结束】";
    state.eventMode = "choice_resolution";
    state.choiceStep = 2;
    state.pendingOptionTexts = [];
    const requestId = createRequestId();
    pendingAiRequestId = requestId;
    const prompt = buildNsfwIntimacyClosingPrompt();
    state.lastPrompt = prompt;
    state.lastDebug = "NSFW 亲密收尾：玩家已选择结束，等待 AI 生成收尾剧情。";
    state.lastStory = state.lastStory ? `${state.lastStory}\n\n${chosenLine}` : chosenLine;
    saveState();
    render();
    setElementHidden("eventChoices", true);
    const actionsEl = document.getElementById("eventActions");
    if (actionsEl) actionsEl.style.display = "grid";
    const confirm = document.getElementById("eventConfirmBtn");
    if (confirm) {
      confirm.disabled = true;
      confirm.textContent = "正在生成收尾...";
    }
    const pendingStory = buildChoicePendingDisplayStory(state.lastStory, chosenLine);
    openEventOverlay(nsfwIntimacyActionTitle(), "正在生成收尾剧情...", pendingStory);
    if (!requestHostPromptSend(prompt, requestId)) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请复制提示词发送获取收尾。");
    }
  }

  function appendMapLocationControlButtons(container) {
    const backBtn = document.createElement("button");
    backBtn.className = "vn-choice-btn vn-choice-btn-map-back";
    backBtn.type = "button";
    backBtn.textContent = getMapExploreReturnLabel();
    backBtn.onclick = () => handleMapLocationReturn();
    container.appendChild(backBtn);

    const directBackBtn = document.createElement("button");
    directBackBtn.className = "vn-choice-btn vn-choice-btn-map-back vn-choice-btn-map-back-direct";
    directBackBtn.type = "button";
    directBackBtn.textContent = "直接返回";
    directBackBtn.onclick = () => returnToFreeModeExploreOrigin({ cancelled: true });
    container.appendChild(directBackBtn);
  }

  function showVnChoicesOverlay() {
    const overlay = document.getElementById("vnChoicesOverlay");
    const container = document.getElementById("vnChoicesContainer");
    if (!overlay || !container) return;

    hideVnCustomChoicePanel();
    container.innerHTML = "";
    const nsfwMode = isNsfwIntimacyActive();
    const eveningGoHome = isEveningGoHomeActive();
    const hasOptionChoices = (isChoicePromptMode() && state.pendingOptionTexts?.length === 4) || (eveningGoHome && state.pendingOptionTexts?.length >= 2);
    const showMapReturnOnly = isMapLocationExploreActive()
      && state.eventMode === "none"
      && !isFreeModeTravelAllowed()
      && !pendingAiRequestId;
    const titleEl = document.getElementById("vnChoicesTitle");
    if (titleEl) {
      titleEl.textContent = eveningGoHome
        ? "请选择今晚的安排"
        : nsfwMode
          ? "选择下一步（可自定义或结束）"
          : "请做出你的选择";
      titleEl.hidden = false;
    }

    state.pendingOptionTexts.forEach((optText, index) => {
      const btn = document.createElement("button");
      btn.className = "vn-choice-btn";
      btn.type = "button";
      const bringHomeLocked = eveningGoHome && optText === "带担当回家" && !canBringAssignedIdolHome();
      if (bringHomeLocked) {
        btn.disabled = true;
        btn.classList.add("is-disabled");
        btn.title = `需要与担当的好感度达到 ${INTIMACY_NSFW_UNLOCK_TRUST}`;
      }
      const optionMinutes = isMapLocationExploreActive() && hasOptionChoices && !eveningGoHome
        ? resolveMapOptionMinutes(state.pendingOptionMinutes?.[index])
        : null;
      btn.textContent = bringHomeLocked
        ? `${optText}（需要好感 ${INTIMACY_NSFW_UNLOCK_TRUST}）`
        : optionMinutes
          ? `${optText}（约${optionMinutes}分）`
          : optText;
      btn.onclick = () => {
        if (btn.disabled) return;
        if (eveningGoHome) {
          closeVnChoicesOverlay();
          handleEveningGoHomeChoice(index);
          return;
        }
        if (nsfwMode) {
          handleNsfwIntimacyPresetChoice(index);
          return;
        }
        closeVnChoicesOverlay();
        handleChoiceSelection(index);
      };
      container.appendChild(btn);
    });

    if (isApartmentCompanionSessionActive() && (hasOptionChoices || state.eventMode === "choice_prompt")) {
      appendApartmentCompanionControlButtons(container);
    }

    if (isMapLocationExploreActive() && (hasOptionChoices || showMapReturnOnly || (isChoicePromptMode() && !pendingAiRequestId))) {
      appendMapLocationControlButtons(container);
    }

    if (nsfwMode || (isMapLocationExploreActive() && hasOptionChoices) || (isApartmentCompanionSessionActive() && hasOptionChoices)) {
      const customBtn = document.createElement("button");
      customBtn.className = "vn-choice-btn vn-choice-btn-custom";
      customBtn.type = "button";
      customBtn.textContent = "自定义输入";
      customBtn.onclick = () => showVnCustomChoicePanel();
      container.appendChild(customBtn);
    }

    if (nsfwMode) {
      const endBtn = document.createElement("button");
      endBtn.className = "vn-choice-btn vn-choice-btn-end";
      endBtn.type = "button";
      endBtn.textContent = "结束";
      endBtn.onclick = () => handleNsfwIntimacyEndChoice();
      container.appendChild(endBtn);
    }

    overlay.style.display = "flex";
  }

  function scheduleVnAutoAdvance() {
    if (vnAutoTimer) clearTimeout(vnAutoTimer);
    vnAutoTimer = setTimeout(() => {
      advanceVnSlide();
    }, vnAutoDelay);
  }

  function toggleVnAuto() {
    vnIsAuto = !vnIsAuto;
    const btn = document.getElementById("vnBtnAuto");
    if (btn) {
      if (vnIsAuto) {
        btn.classList.add("active");
        btn.textContent = "自动中 (AUTO)";
        if (!vnIsTyping) {
          scheduleVnAutoAdvance();
        }
      } else {
        btn.classList.remove("active");
        btn.textContent = "自动 (AUTO)";
      }
    }
  }

  function stopVnAuto() {
    vnIsAuto = false;
    const btn = document.getElementById("vnBtnAuto");
    if (btn) {
      btn.classList.remove("active");
      btn.textContent = "自动 (AUTO)";
    }
    if (vnAutoTimer) {
      clearTimeout(vnAutoTimer);
      vnAutoTimer = 0;
    }
  }

  function skipAllVnDialogue() {
    stopVnAuto();
    if (vnSlides.length > 0) {
      renderVnSlide(vnSlides.length - 1);
      completeVnSlideText();
      handleVnSlidesEnd();
    }
  }

  function escapeDebugHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDebugTime(value) {
    if (!value) return "--";
    try {
      return new Date(value).toLocaleTimeString("zh-CN", { hour12: false });
    } catch {
      return "--";
    }
  }

  function summarizeDebugText(value, maxLength = 360) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  }

  function detectSelectedReplySource(text, rawText, renderedText, source) {
    const decode = (value) => String(value || "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\u200b/g, "")
      .trim();
    const selected = String(source || "").trim();
    if (selected && selected === decode(rawText)) return "rawText";
    if (selected && selected === decode(text)) return "text";
    if (selected && selected === decode(renderedText)) return "renderedText";
    return selected ? "mixed/unknown" : "none";
  }

  function recordAiReplyDebug({ text = "", rawText = "", renderedText = "", requestId = "", isFinal = true, source = "", accepted = true } = {}) {
    const payload = source ? extractChoicePayload(source) : { story: "", options: [], optionMinutes: [] };
    aiBridgeDebug.lastReply = {
      at: Date.now(),
      requestId,
      pendingAiRequestId,
      accepted,
      isFinal: Boolean(isFinal),
      eventMode: state.eventMode,
      choiceStep: state.choiceStep,
      action: state.pendingActionContext?.action || "",
      textLength: String(text || "").length,
      rawTextLength: String(rawText || "").length,
      renderedTextLength: String(renderedText || "").length,
      selectedSource: detectSelectedReplySource(text, rawText, renderedText, source),
      selectedLength: String(source || "").length,
      hasStartMarker: /[【\[]\s*初星正文开始\s*[】\]]/.test(source),
      hasEndMarker: /[【\[]\s*初星正文结束\s*[】\]]/.test(source),
      hasStoryTag: /<story[\s>]/i.test(source),
      storyLength: payload.story.length,
      optionCount: payload.options.length,
      options: payload.options.slice(0, 4),
      optionMinutes: payload.optionMinutes,
      sample: summarizeDebugText(source)
    };
    aiBridgeDebug.lastMessage = accepted ? "已收到匹配当前 requestId 的 AI 回复" : "收到 AI 回复，但 requestId 不匹配，已拒收";
    refreshVnDebugView();
  }

  function recordAiAckDebug(requestId, accepted, retry, isFinal = true) {
    aiBridgeDebug.lastAck = {
      at: Date.now(),
      requestId,
      accepted: Boolean(accepted),
      retry: Boolean(retry),
      isFinal: Boolean(isFinal),
      pendingAiRequestId,
      eventMode: state.eventMode,
      choiceStep: state.choiceStep
    };
    aiBridgeDebug.lastMessage = `ACK ${accepted ? "accepted" : "rejected"}${retry ? " / retry" : ""}${isFinal ? " / final" : " / partial"}`;
    refreshVnDebugView();
  }

  function classifyPromptKind(promptText = "") {
    const text = String(promptText || "");
    if (!text.trim()) return "empty";
    if (text.includes("小手机私聊")) return "phone_chat";
    if (text.includes("小手机添加好友问候")) return "phone_greeting";
    if (text.includes("NSFW 亲密") || text.includes("公寓邀约")) {
      if (text.includes("收尾")) return "nsfw_intimacy_close";
      if (text.includes("继续") || text.includes("承接上文")) return "nsfw_intimacy_continue";
      return "nsfw_intimacy_open";
    }
    if (text.includes("互动分支结算与收尾")) return "choice_phase2";
    if (text.includes("互动分支设计")) return "choice_phase1";
    if (text.includes("羁绊") && text.includes("最终收束")) return "bond_final";
    if (text.includes("羁绊") && text.includes("第二轮选择")) return "bond_phase2";
    if (text.includes("羁绊") && text.includes("第一轮选择")) return "bond_phase1";
    if (text.includes("好感度0担当开场")) return "opening";
    if (text.includes("First Live")) return "first_live";
    if (text.includes("行动已经由前端结算")) return "produce_action";
    if (text.includes("自由闲聊")) return "free_chat";
    if (text.includes("偶像互动")) return "idol_interaction";
    if (text.includes("初星育成系统")) return "produce_other";
    return "unknown";
  }

  function extractPromptHeader(promptText = "") {
    const text = String(promptText || "");
    const bracketMatch = text.match(/^\[(初星育成系统[^\]]+)\]/);
    if (bracketMatch) return bracketMatch[1];
    return summarizeDebugText(text, 56);
  }

  function expectedPromptKindForState() {
    if (state.phoneChat?.isAwaitingReply) {
      return state.activeStoryNode?.mode === "greeting" ? "phone_greeting" : "phone_chat";
    }
    if (state.activeStoryNode?.type === "phonechat") {
      return state.activeStoryNode?.mode === "greeting" ? "phone_greeting" : "phone_chat";
    }
    if (state.activeStoryNode?.type === "affinity" && Number(state.activeStoryNode?.threshold) === 0) {
      return "opening";
    }
    if (state.eventMode === "choice_resolution") {
      if (state.pendingActionContext?.action === "bond") {
        return state.bondChoiceRound === 2 ? "bond_final" : "bond_phase2";
      }
      if (isNsfwIntimacyActive()) return "nsfw_intimacy_close";
      return "choice_phase2";
    }
    if (isChoicePromptMode()) {
      if (state.pendingActionContext?.action === "bond") {
        return state.bondChoiceRound === 2 ? "bond_phase2" : "bond_phase1";
      }
      if (isNsfwIntimacyActive()) return "nsfw_intimacy_continue";
      return "choice_phase1";
    }
    if (state.pendingActionContext?.action) {
      const action = state.pendingActionContext.action;
      if (["outing", "companion", "intimacy"].includes(action)) return "choice_phase1";
      if (action === "map_location") return "produce_other";
      return "produce_action";
    }
    if (state.activeStoryNode?.type === "affinity") return "produce_other";
    return "";
  }

  function recordDebugOpeningDispatch(source = "unknown") {
    aiBridgeDebug.openingDispatches.unshift({
      at: Date.now(),
      source: String(source || "unknown"),
      openingComplete: Boolean(state.affinity.openingComplete),
      idol: state.idol || "",
      requestId: pendingAiRequestId || state.pendingAiRequestId || ""
    });
    if (aiBridgeDebug.openingDispatches.length > 6) {
      aiBridgeDebug.openingDispatches.length = 6;
    }
    refreshVnDebugView();
  }

  function recordDebugPromptDispatch(promptText, requestId) {
    const entry = {
      at: Date.now(),
      requestId: String(requestId || ""),
      promptKind: classifyPromptKind(promptText),
      promptHeader: extractPromptHeader(promptText),
      promptLength: String(promptText || "").length,
      eventMode: state.eventMode,
      choiceStep: state.choiceStep,
      action: state.pendingActionContext?.action || "",
      activeNode: state.activeStoryNode?.type || "",
      activeNodeMode: state.activeStoryNode?.mode || "",
      openingComplete: Boolean(state.affinity.openingComplete),
      hostSource: hostPromptSendSource,
      day: state.day,
      round: state.round,
      selectedChoice: state.selectedChoiceText || ""
    };
    aiBridgeDebug.lastPromptRequest = entry;
    aiBridgeDebug.promptHistory.unshift(entry);
    if (aiBridgeDebug.promptHistory.length > 8) {
      aiBridgeDebug.promptHistory.length = 8;
    }
    refreshVnDebugView();
  }

  function buildDebugDiagnoses() {
    const issues = [];
    const prompt = aiBridgeDebug.lastPromptRequest || {};
    const reply = aiBridgeDebug.lastReply || {};
    const sentKind = prompt.promptKind || classifyPromptKind(state.lastPrompt);
    const expectedKind = expectedPromptKindForState();

    if (aiBridgeDebug.openingDispatches.length >= 2) {
      const sources = aiBridgeDebug.openingDispatches.map((item) => item.source).join("；");
      issues.push({
        level: "error",
        message: `本页已触发 ${aiBridgeDebug.openingDispatches.length} 次担当开场（${sources}）。若包含“ST角色卡自动绑定”和“签署合约”，就会出现开场播两次。`
      });
    }

    if (state.idol && !state.affinity.openingComplete) {
      issues.push({
        level: "warn",
        message: "openingComplete 仍为 false。此时任何训练/上课/休息都会被拦截并再次触发 threshold 0 开场剧情。"
      });
    }

    if (isSillyTavernHost() && !hostStateReady) {
      issues.push({
        level: "warn",
        message: "已嵌入 SillyTavern，但聊天存档 scope 尚未就绪。切换聊天后状态可能回滚，导致 openingComplete 或轮次异常。"
      });
    }

    if (pendingAiRequestId && state.pendingAiRequestId && pendingAiRequestId !== state.pendingAiRequestId) {
      issues.push({
        level: "warn",
        message: `pending 请求 ID 不一致（内存 ${pendingAiRequestId} / 存档 ${state.pendingAiRequestId}）。可能导致回复路由失败。`
      });
    }

    if (reply.accepted === false) {
      issues.push({
        level: "error",
        message: `最近一次 AI 回复 requestId 不匹配（收到 ${reply.requestId || "--"}，当前 pending ${pendingAiRequestId || "--"}），回复已被丢弃。`
      });
    }

    if (expectedKind && sentKind && expectedKind !== sentKind) {
      issues.push({
        level: "error",
        message: `提示词类型与当前状态不一致：期望 ${expectedKind}，最近发送 ${sentKind}。常见于选项选完后 Phase2 未发出，或 ST 仍按上一轮上下文生成。`
      });
    }

    if (state.eventMode === "choice_resolution" && state.choiceStep === 2 && sentKind === "choice_phase1") {
      issues.push({
        level: "error",
        message: "当前处于选项结算阶段 (choiceStep=2)，但最近发送仍是 Phase1“互动分支设计”提示词。这会导致 AI 继续出选项而不是写反应。"
      });
    }

    if (state.eventMode === "choice_prompt" && pendingAiRequestId && reply.optionCount === 4 && reply.requestId === prompt.requestId) {
      issues.push({
        level: "info",
        message: "Phase1 选项已收到，等待玩家选择。选完后应发送 choice_phase2。"
      });
    }

    if (state.phoneChat?.isAwaitingReply && !["phone_chat", "phone_greeting"].includes(sentKind)) {
      issues.push({
        level: "error",
        message: `私聊正在等待回复，但最近发送的提示词类型是 ${sentKind || "unknown"}，不是 phone_chat / phone_greeting。`
      });
    }

    if (state.phoneChat?.retryAvailable && state.lastPrompt) {
      issues.push({
        level: "warn",
        message: "私聊处于可重试状态。重试会复用 state.lastPrompt，不会按最新聊天记录重建；若对话已前进，可能造成重复回复。"
      });
    }

    if (reply.optionCount === 4 && state.eventMode === "choice_resolution") {
      issues.push({
        level: "warn",
        message: "当前应进入选项结算，但最近回复仍像 Phase1（含 4 个 option）。可能是 Phase1 回复迟到，或模型没有按 Phase2 提示词写作。"
      });
    }

    if (!issues.length) {
      issues.push({
        level: "ok",
        message: "未发现已知异常模式。若仍有问题，请对照下方“提示词历史”和 SillyTavern 聊天楼层核对 requestId。"
      });
    }

    return issues;
  }

  const DEBUG_SKIP_PLACEHOLDER = "（本地调试跳过 AI 等待）此处为占位叙事。数值已由前端结算，可点击确定继续流程。";
  const DEBUG_SKIP_OPTIONS = ["继续看看周围", "和担当说句话", "稍作休息调整", "换一件事做"];

  function isAiWaitActive() {
    if (pendingAiRequestId) return true;
    if (state.phoneChat?.isAwaitingReply) return true;
    if (broadcastScriptLoading) return true;
    if (state.freeMode?.world?.broadcast?.pendingRequestId) return true;
    const overlay = document.getElementById("eventOverlay");
    if (!overlay || overlay.hidden) return false;
    const confirm = document.getElementById("eventConfirmBtn");
    if (confirm?.disabled && /生成|等待/.test(String(confirm.textContent || ""))) return true;
    const story = String(state.lastEventStory || state.lastStory || "");
    return /等待角色卡|等待 AI|等待 SillyTavern|正在等待|正在生成|正在后台|正在重新生成/.test(story);
  }

  function forceSkipPhoneChatWait() {
    if (!state.phoneChat?.isAwaitingReply && !state.phoneChat?.pendingRequestId) return false;
    const threadId = state.phoneChat.activeThreadId || "idol";
    resetPhoneChatPendingState();
    setPhoneChatTyping(false);
    setPhoneChatComposerEnabled(true);
    appendPhoneChatMessage(threadId, "idol", "（调试跳过：未收到真实回复。）");
    if (state.activeStoryNode?.type === "phonechat") {
      state.activeStoryNode.ready = true;
      state.activeStoryNode = null;
    }
    updatePhoneChatRetryUi();
    if (state.phoneChat.activeView === "chat") {
      renderPhoneChatMessages(threadId);
    }
    return true;
  }

  function forceSkipBroadcastWait() {
    if (!broadcastScriptLoading && !state.freeMode?.world?.broadcast?.pendingRequestId) return false;
    broadcastScriptLoading = false;
    resetBroadcastPendingState();
    const episode = getBroadcastEpisode();
    if (episode && !episode.fullScript) {
      episode.fullScript = "（调试跳过）占位广播稿。";
      episode.scriptStatus = "ready";
    }
    if (state.activeStoryNode?.type === "broadcast") {
      state.activeStoryNode.ready = true;
      state.activeStoryNode = null;
    }
    renderBroadcastApp();
    return true;
  }

  function forceSkipEventOverlayWait() {
    const node = state.activeStoryNode;
    pendingAiRequestId = "";
    state.pendingAiRequestId = "";
    aiReplyRetryCount = 0;

    if (node?.type === "affinity" && Number(node.threshold) === 0 && !state.affinity.openingComplete) {
      skipPendingOpening();
      setElementHidden("eventOverlay", true);
      return "opening";
    }

    if (isChoiceResolutionMode()) {
      const chosenLine = `<narration>▶ 制作人的选择：${state.selectedChoiceText || "（调试跳过）"}</narration>`;
      const displayStory = buildChoiceContinuationDisplayStory(state.lastStory, chosenLine, DEBUG_SKIP_PLACEHOLDER);
      state.lastStory = displayStory;
      if (state.log[0]) state.log[0].aiReply = DEBUG_SKIP_PLACEHOLDER;
      if (node?.type === "affinity") node.ready = true;
      clearIntimacyRoute();
      state.eventMode = "none";
      state.choiceStep = 0;
      state.pendingOptionTexts = [];
      const title = currentChoiceActionTitle();
      openEventOverlay(title, "（调试跳过）已注入占位反应", displayStory);
      return "choice_resolution";
    }

    if (isChoicePromptMode() || (state.eventMode === "choice_prompt" && state.pendingOptionTexts.length < 4)) {
      state.pendingOptionTexts = DEBUG_SKIP_OPTIONS.slice();
      if (state.pendingActionContext?.action === "map_location") {
        state.pendingOptionMinutes = [15, 15, 15, 15];
      }
      state.eventMode = "choice_prompt";
      state.choiceStep = 1;
      state.lastStory = DEBUG_SKIP_PLACEHOLDER;
      openEventOverlay(currentChoiceActionTitle(), "（调试跳过）已注入占位选项", DEBUG_SKIP_PLACEHOLDER);
      return "choice_prompt";
    }

    if (node?.type === "affinity") node.ready = true;
    if (node?.type === "firstLivePre" || node?.type === "firstLivePost") node.ready = true;
    if (node?.type === "freechat" || node?.type === "interaction" || node?.type === "gift") node.ready = true;

    state.eventMode = "none";
    state.choiceStep = 0;
    state.pendingOptionTexts = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    state.lastStory = DEBUG_SKIP_PLACEHOLDER;
    if (state.log[0]) state.log[0].aiReply = DEBUG_SKIP_PLACEHOLDER;

    const title = node?.type === "affinity"
      ? `好感度 ${node.threshold}：${affinityNodes[node.threshold]?.title || "羁绊事件"}`
      : node?.type === "firstLivePre"
        ? "First Live 登台前准备"
        : node?.type === "firstLivePost"
          ? "First Live 演后记"
          : node?.type === "freechat"
            ? "担当闲聊"
            : node?.type === "interaction"
              ? "偶像互动"
              : node?.type === "gift"
                ? `赠送礼物 · ${node.recipientName || "对象"}`
                : (state.lastEventTitle || state.log[0]?.action || "行动事件");
    openEventOverlay(title, "（调试跳过）已注入占位叙事", DEBUG_SKIP_PLACEHOLDER);
    return "event";
  }

  function finishDebugSkippedPrimaryAttempt(owner) {
    if (!owner?.requestId || !owner?.channelLeaseId) return false;
    const turn = state.harness?.activeTurn;
    if (
      ["ordinary_action", "ordinary_recovery"].includes(owner.ownerKind)
      && turn?.turnId === owner.turnId
      && turn?.requestId === owner.requestId
      && turn?.status === "generating"
    ) {
      markHarnessProduceTurn("completed_without_narrative", { completionReason: "debug_skip" }, owner.requestId);
    }
    if (
      ["storyteller_event", "storyteller_event_recovery"].includes(owner.ownerKind)
      && turn?.kind === "storyteller_event"
      && turn?.turnId === owner.turnId
      && turn?.requestId === owner.requestId
      && turn?.status === "generating"
    ) {
      returnHarnessRecoveryAttemptToPending(owner.requestId, "debug_skip");
    }
    if (isSillyTavernHost()) {
      window.parent.postMessage({
        source: "hatsuboshi-produce",
        type: "cancelPrimaryAttempt",
        requestId: owner.requestId,
        channelLeaseId: owner.channelLeaseId,
        reason: "debug_skip"
      }, "*");
    }
    return releasePrimaryModelChannel(owner.requestId, owner.channelLeaseId, "debug_skip");
  }
  function forceSkipAiWait() {
    const primaryOwner = getPrimaryModelChannelOwner();
    const phoneSkipped = forceSkipPhoneChatWait();
    const broadcastSkipped = forceSkipBroadcastWait();
    let eventSkipped = false;
    let eventKind = "";

    if (isAiWaitActive() || (document.getElementById("eventOverlay") && !document.getElementById("eventOverlay").hidden)) {
      eventKind = forceSkipEventOverlayWait();
      eventSkipped = Boolean(eventKind);
    }

    if (!phoneSkipped && !broadcastSkipped && !eventSkipped) {
      showToast("无需跳过", "当前没有检测到 AI 等待状态。", "info");
      refreshVnDebugView();
      return;
    }

    finishDebugSkippedPrimaryAttempt(primaryOwner);
    saveState("debug.skip_ai_wait");
    render();
    refreshVnDebugView();

    const detail = [
      phoneSkipped ? "私聊" : "",
      broadcastSkipped ? "广播" : "",
      eventSkipped ? (eventKind === "opening" ? "开场" : eventKind === "choice_prompt" ? "选项" : "事件") : ""
    ].filter(Boolean).join(" / ");
    showToast("调试跳过", `已强制结束等待（${detail || "流程"}），可继续操作。`, "warn");
  }

  function buildDebugDiagnosisHtml() {
    const issues = buildDebugDiagnoses();
    const canForceSkip = isAiWaitActive();
    return `
      <section class="vn-debug-card vn-debug-card-full vn-debug-diagnosis">
        <h3>自动诊断</h3>
        <ul class="vn-debug-alert-list">
          ${issues.map((issue) => `
            <li class="vn-debug-alert vn-debug-alert-${issue.level}">
              ${escapeDebugHtml(issue.message)}
            </li>
          `).join("")}
        </ul>
        <div class="vn-debug-actions">
          <p class="vn-debug-actions-hint">本地无 SillyTavern / 无 AI 回复时，可注入占位叙事并解除等待。</p>
          <button id="vnDebugForceSkipBtn" type="button" class="vn-debug-force-skip-btn" ${canForceSkip ? "" : "disabled"}>
            强制跳过 AI 等待
          </button>
        </div>
      </section>
    `;
  }

  function buildDebugHistoryHtml() {
    const history = aiBridgeDebug.promptHistory || [];
    if (!history.length) {
      return `<section class="vn-debug-card vn-debug-card-full"><h3>提示词历史</h3><p class="vn-debug-empty">尚无发送记录。</p></section>`;
    }
    return `
      <section class="vn-debug-card vn-debug-card-full">
        <h3>提示词历史（最近 ${history.length} 次）</h3>
        <div class="vn-debug-history">
          ${history.map((entry, index) => `
            <article class="vn-debug-history-item">
              <div class="vn-debug-history-head">
                <strong>${index === 0 ? "最近" : `#${index + 1}`} · ${escapeDebugHtml(entry.promptKind || "unknown")}</strong>
                <span>${escapeDebugHtml(formatDebugTime(entry.at))}</span>
              </div>
              <dl>${buildDebugRows([
                ["header", entry.promptHeader || "--"],
                ["requestId", entry.requestId || "--"],
                ["mode/step", `${entry.eventMode || "none"} / ${entry.choiceStep ?? 0}`],
                ["day/round", `第 ${entry.day ?? "?"} 天 · 第 ${entry.round ?? "?"} 轮`],
                ["openingComplete", entry.openingComplete ? "true" : "false"],
                ["来源", entry.hostSource || "general"],
                ["选中项", entry.selectedChoice || "无"]
              ])}</dl>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function buildDebugOpeningHtml() {
    const dispatches = aiBridgeDebug.openingDispatches || [];
    if (!dispatches.length) {
      return "";
    }
    return `
      <section class="vn-debug-card vn-debug-card-full">
        <h3>担当开场触发记录</h3>
        <div class="vn-debug-history">
          ${dispatches.map((entry, index) => `
            <article class="vn-debug-history-item">
              <div class="vn-debug-history-head">
                <strong>${index === 0 ? "最近" : `#${index + 1}`} · ${escapeDebugHtml(entry.source || "unknown")}</strong>
                <span>${escapeDebugHtml(formatDebugTime(entry.at))}</span>
              </div>
              <dl>${buildDebugRows([
                ["idol", entry.idol || "--"],
                ["openingComplete", entry.openingComplete ? "true" : "false"],
                ["requestId", entry.requestId || "--"]
              ])}</dl>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  function buildDebugRows(rows) {
    return rows.map(([key, value]) => `<dt>${escapeDebugHtml(key)}</dt><dd>${escapeDebugHtml(value)}</dd>`).join("");
  }

  function buildVnDebugHtml() {
    const prompt = aiBridgeDebug.lastPromptRequest || {};
    const reply = aiBridgeDebug.lastReply || {};
    const ack = aiBridgeDebug.lastAck || {};
    const overlay = aiBridgeDebug.lastOverlay || {};
    const sentKind = prompt.promptKind || classifyPromptKind(state.lastPrompt);
    const expectedKind = expectedPromptKindForState();
    const canShowGame = Boolean(state.idol) && Boolean(state.affinity.openingComplete);
    const liveStory = String(state.lastEventStory || "");
    const liveLoading = Boolean(pendingAiRequestId)
      || liveStory.includes("等待角色卡")
      || liveStory.includes("等待 AI")
      || liveStory.includes("等待 SillyTavern")
      || liveStory.includes("正在重新生成");
    const phoneThread = getPhoneThreadDefinition(state.phoneChat?.activeThreadId);
    const primaryOwnerDebug = getPrimaryModelChannelDebugSnapshot();
    const hostGenerationDebug = aiBridgeDebug.hostGeneration || {};
    return `
      ${buildDebugDiagnosisHtml()}
      <div class="vn-debug-grid">
        <section class="vn-debug-card">
          <h3>育成门禁</h3>
          <dl>${buildDebugRows([
            ["担当", state.idol || "未选择"],
            ["openingComplete", state.affinity.openingComplete ? "true" : "false"],
            ["主界面可见", canShowGame ? "是" : "否"],
            ["activeNode", state.activeStoryNode?.type || "无"],
            ["threshold", state.activeStoryNode?.threshold ?? "无"],
            ["node.ready", state.activeStoryNode?.ready === undefined ? "无" : state.activeStoryNode.ready ? "true" : "false"],
            ["day / round", `第 ${state.day} 天 · ${roundLabel()}`]
          ])}</dl>
        </section>
        <section class="vn-debug-card">
          <h3>桥接环境</h3>
          <dl>${buildDebugRows([
            ["运行环境", isSillyTavernHost() ? "SillyTavern iframe" : "独立页面"],
            ["hostStateReady", hostStateReady ? "true" : "false"],
            ["saveScope", activeHostSaveScope || "无"],
            ["primary owner", primaryOwnerDebug.ownerKind],
            ["owner age", `${primaryOwnerDebug.ageMs} ms`],
            ["owner scope", primaryOwnerDebug.scope || "无"],
            ["requestId 后缀", primaryOwnerDebug.requestIdSuffix || "无"],
            ["last release", primaryOwnerDebug.lastReleaseReason || "无"],
            ["last reject", primaryOwnerDebug.lastRejectReason || "无"],
            ["host adapter", hostGenerationDebug.adapter || "无"],
            ["host mode", hostGenerationDebug.mode || "无"],
            ["host status", hostGenerationDebug.status || "无"],
            ["host age", `${hostGenerationDebug.ageMs || 0} ms`],
            ["host scope", hostGenerationDebug.scope || "无"],
            ["host owner", hostGenerationDebug.ownerKind || "无"],
            ["host request 后缀", hostGenerationDebug.requestIdSuffix || "无"],
            ["host failure", hostGenerationDebug.lastFailureReason || "无"],
            ["host compensation", hostGenerationDebug.lastCompensationReason || "无"],
            ["绑定角色卡", state.boundCharacter?.name || "未绑定"],
            ["最后消息", aiBridgeDebug.lastMessage]
          ])}</dl>
        </section>
        <section class="vn-debug-card">
          <h3>当前状态</h3>
          <dl>${buildDebugRows([
            ["pending", pendingAiRequestId || "无"],
            ["state.pending", state.pendingAiRequestId || "无"],
            ["eventMode", state.eventMode || "none"],
            ["choiceStep", state.choiceStep ?? ""],
            ["action", state.pendingActionContext?.action || "无"],
            ["期望 prompt", expectedKind || "无"],
            ["最近 prompt", sentKind || "无"],
            ["VN loading", liveLoading ? "是" : "否"]
          ])}</dl>
        </section>
        <section class="vn-debug-card">
          <h3>私聊状态</h3>
          <dl>${buildDebugRows([
            ["view", state.phoneChat?.activeView || "home"],
            ["thread", phoneThread?.name || state.phoneChat?.activeThreadId || "无"],
            ["awaiting", state.phoneChat?.isAwaitingReply ? "是" : "否"],
            ["retryAvailable", state.phoneChat?.retryAvailable ? "是" : "否"],
            ["pendingRequestId", state.phoneChat?.pendingRequestId || "无"],
            ["thread消息数", String(getPhoneThreadMessages(state.phoneChat?.activeThreadId || "idol").length)]
          ])}</dl>
        </section>
        <section class="vn-debug-card">
          <h3>最近发送</h3>
          <dl>${buildDebugRows([
            ["时间", formatDebugTime(prompt.at)],
            ["requestId", prompt.requestId || "--"],
            ["类型", sentKind || "--"],
            ["header", prompt.promptHeader || "--"],
            ["prompt长度", prompt.promptLength ?? "--"],
            ["发送时 mode/step", `${prompt.eventMode || "--"} / ${prompt.choiceStep ?? "--"}`],
            ["发送时 opening", prompt.openingComplete === undefined ? "--" : prompt.openingComplete ? "true" : "false"],
            ["发送时行动", prompt.action || "--"]
          ])}</dl>
        </section>
        <section class="vn-debug-card">
          <h3>最近回复</h3>
          <dl>${buildDebugRows([
            ["时间", formatDebugTime(reply.at)],
            ["requestId", reply.requestId || "--"],
            ["是否接收", reply.accepted === undefined ? "--" : reply.accepted ? "是" : "否"],
            ["isFinal", reply.isFinal === undefined ? "--" : reply.isFinal ? "是" : "否"],
            ["选择来源", reply.selectedSource || "--"],
            ["text/raw/rendered", `${reply.textLength ?? "--"}/${reply.rawTextLength ?? "--"}/${reply.renderedTextLength ?? "--"}`],
            ["正文标记", reply.hasStartMarker ? "有开始" : "无开始"],
            ["结束标记", reply.hasEndMarker ? "有结束" : "无结束"],
            ["story标签", reply.hasStoryTag ? "有" : "无"],
            ["story长度", reply.storyLength ?? "--"],
            ["option数量", reply.optionCount ?? "--"],
            ["time标签", Array.isArray(reply.optionMinutes) ? reply.optionMinutes.map(v => v ?? "-").join(" / ") : "--"]
          ])}</dl>
          <pre class="vn-debug-pre">${escapeDebugHtml((reply.options || []).map((option, index) => `${index + 1}. ${option}`).join("\n") || "暂无 option")}</pre>
        </section>
        <section class="vn-debug-card">
          <h3>ACK / VN</h3>
          <dl>${buildDebugRows([
            ["ACK时间", formatDebugTime(ack.at)],
            ["ACK requestId", ack.requestId || "--"],
            ["accepted", ack.accepted === undefined ? "--" : ack.accepted ? "是" : "否"],
            ["retry", ack.retry === undefined ? "--" : ack.retry ? "是" : "否"],
            ["final", ack.isFinal === undefined ? "--" : ack.isFinal ? "是" : "否"],
            ["Overlay时间", formatDebugTime(overlay.at)],
            ["标题", overlay.title || state.lastEventTitle || "--"],
            ["结果", overlay.result || state.lastEventResult || "--"],
            ["Overlay loading", overlay.isLoading === undefined ? "--" : overlay.isLoading ? "是" : "否"],
            ["story长度", overlay.storyLength ?? liveStory.length]
          ])}</dl>
          <pre class="vn-debug-pre">${escapeDebugHtml(reply.sample || "暂无已选回复样本")}</pre>
        </section>
      </div>
      ${buildDebugOpeningHtml()}
      ${buildDebugHistoryHtml()}
    `;
  }

  function refreshVnDebugView() {
    const overlay = document.getElementById("vnDebugOverlay");
    const content = document.getElementById("vnDebugContent");
    if (!overlay || overlay.hidden || !content) return;
    content.innerHTML = buildVnDebugHtml();
  }

  function openVnDebugView() {
    const overlay = document.getElementById("vnDebugOverlay");
    const content = document.getElementById("vnDebugContent");
    if (!overlay || !content) return;
    content.innerHTML = buildVnDebugHtml();
    overlay.hidden = false;
  }

  function closeVnDebugView() {
    const overlay = document.getElementById("vnDebugOverlay");
    if (overlay) overlay.hidden = true;
  }
  function buildVnLogHtml() {
    const entries = [];
    if (vnSlides.length) {
      entries.push(...vnSlides.map((slide, index) => ({
        title: slide.speaker ? `${index + 1}. ${slide.speaker}` : `${index + 1}. 旁白`,
        text: slide.text || ""
      })));
    }
    (state.log || []).forEach((item) => {
      if (!item.aiReply) return;
      entries.push({
        title: `过往记录：第 ${item.day} 天 ${item.action || "事件"}`,
        text: item.aiReply
      });
    });
    if (!entries.length) {
      return `<div class="vn-log-empty">暂无对话记录。剧情显示后可以在这里回看文本。</div>`;
    }
    return entries.map((entry) => `
      <article class="vn-log-entry">
        <strong>${formatStoryText(entry.title)}</strong>
        <div class="vn-log-text">${formatStoryText(entry.text)}</div>
      </article>
    `).join("");
  }

  function openVnLogView() {
    const overlay = document.getElementById("vnLogOverlay");
    const content = document.getElementById("vnLogContent");
    if (!overlay || !content) return;
    content.innerHTML = buildVnLogHtml();
    overlay.hidden = false;
  }

  function closeVnLogView() {
    const overlay = document.getElementById("vnLogOverlay");
    if (overlay) overlay.hidden = true;
  }

  function triggerVnEditPrompt() {
    stopVnAuto();
    setElementHidden("eventOverlay", true);
    openAiPromptOverlay();
  }

  function closeEventOverlay() {
    stopVnAuto();
    if (isEveningGoHomeActive()) {
      showToast("请先选择", "请选择今晚要回家，还是再待一会儿。", "warn");
      return;
    }
    if (vnTypewriterTimer) {
      clearInterval(vnTypewriterTimer);
      vnTypewriterTimer = 0;
    }
    if (isHybridFacilityActive()) {
      exitHybridFacility();
      saveState();
      render();
      setElementHidden("eventOverlay", true);
      return;
    }
    if (state.activeStoryNode?.type === "sandboxOpening") {
      triggerWipeTransition(() => {
        setElementHidden("eventOverlay", true);
        finishSandboxOpeningToSelection();
      });
      return;
    }
    if (state.activeStoryNode?.type === "sandboxInvite") {
      state.activeStoryNode = null;
      state.sandbox = { ...(state.sandbox || {}), inviteComplete: true };
      const scoutQuestCompleted = globalThis.HatsuTasks?.onScoutInviteComplete(state) || [];
      if (scoutQuestCompleted.length) saveState();
      if (globalThis.HatsuTasks?.queueSideQuestRefresh(state) === "api") {
        maybeRequestSideQuestGeneration();
      }
      triggerWipeTransition(() => {
        enterSandboxCampusAfterOpening();
        setElementHidden("eventOverlay", true);
        notifyQuestCompletions(scoutQuestCompleted);
      });
      return;
    }
    if (isFreeModeActive() && (isMapLocationExploreActive() || state.freeMode?.activeLocationId)) {
      if (isApartmentCompanionSessionActive()) {
        closeApartmentCompanionSession();
        return;
      }
      returnToFreeModeExploreOrigin({ cancelled: !isChoiceResolutionMode() });
      return;
    }
    triggerWipeTransition(() => {
      if (state.pendingActionContext?.actionContext?.apartmentInvite) {
        state.pendingActionContext = null;
        state.eventMode = "none";
        state.choiceStep = 0;
        state.pendingOptionTexts = [];
        state.selectedChoiceText = "";
        state.selectedChoiceRating = "";
        clearIntimacyRoute();
        if (state.freeMode) state.freeMode.atApartment = true;
        saveState();
        render();
        setElementHidden("eventOverlay", true);
        return;
      }
      const node = state.activeStoryNode;
      if (node?.type === "affinity") {
        if (!node.ready) {
          if (Number(node.threshold) === 0) {
            skipPendingOpening();
            saveState();
            render();
            setElementHidden("eventOverlay", true);
            return;
          }
          setElementHidden("eventOverlay", true);
          return;
        }
        const thresholdValue = Number(node.threshold);
        if (thresholdValue === 0) {
          markAffinityViewed(thresholdValue);
          state.affinity.openingComplete = true;
        } else if (REQUIRED_BOND_THRESHOLDS.includes(thresholdValue)) {
          completeBondEventDay(thresholdValue);
        } else {
          markAffinityViewed(thresholdValue);
        }
        if (state.activeStoryNode?.type === "affinity") state.activeStoryNode = null;
        saveState();
        render();
      } else if (node?.type === "firstLivePre") {
        if (!node.ready) {
          setElementHidden("eventOverlay", true);
          return;
        }
        startFirstLivePostStage();
      } else if (node?.type === "firstLivePost") {
        if (!node.ready) {
          setElementHidden("eventOverlay", true);
          return;
        }
        completeFirstLivePostFlow();
      } else if (["freechat", "interaction", "gift"].includes(node?.type)) {
        if (!node.ready) {
          setElementHidden("eventOverlay", true);
          return;
        }
        state.activeStoryNode = null;
        saveState();
        render();
      }
      setElementHidden("eventOverlay", true);
    });
  }

  function reopenLastEvent() {
    if (!state.lastEventStory) {
      showToast("暂无事件", "完成一次行动后，这里会保存最近事件。", "warn");
      return;
    }
    openEventOverlay(state.lastEventTitle, state.lastEventResult, state.lastEventStory);
  }

  function openAffinityModal() {
    if (!state.idol) {
      showToast("需要担当偶像", "请先选择本次育成的担当。", "warn");
      return;
    }
    refreshAffinityUnlocks();
    activeModal = "affinity";
    activeModalTab = null;
    document.getElementById("modalKicker").textContent = "Bond Stories";
    document.getElementById("modalTitle").textContent = "羁绊事件";
    const tabs = document.getElementById("modalTabs");
    tabs.innerHTML = "";
    const body = document.getElementById("modalBody");
    body.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "modal-grid affinity-grid";
    [0, ...affinityThresholds].forEach((threshold) => {
      const node = affinityNodes[threshold];
      const unlocked = state.affinity.unlocked.includes(threshold);
      const viewed = state.affinity.viewed.includes(threshold);
      const pending = state.affinity.pending.includes(threshold);
      const card = document.createElement("article");
      card.className = `modal-card affinity-card${unlocked ? " unlocked" : " locked"}${pending ? " pending" : ""}`;
      card.id = `affinity-card-${threshold}`;
      const status = viewed ? "已观看" : pending ? "可观看" : unlocked ? "可重看" : "未解锁";
      const actionText = viewed ? "重新生成" : unlocked ? "生成剧情" : "继续育成";
      card.innerHTML = `
        <strong>好感度 ${threshold}：${node.title}</strong>
        <p>${node.theme}</p>
        <small>${node.timing}</small>
        <button id="affinity-trigger-${threshold}" class="affinity-trigger" type="button" ${unlocked ? "" : "disabled"}>${status} / ${actionText}</button>
      `;
      const button = card.querySelector("button");
      button.addEventListener("click", () => triggerAffinityStory(threshold));
      grid.appendChild(card);
    });
    body.appendChild(grid);
    setElementHidden("appModal", false);
    document.getElementById("closeModal").focus();
  }

  function isWeakRawFallbackText(text) {
    const compact = String(text || "").replace(/\s+/g, "");
    return !compact || compact.length < 12 || isJunkReply(text) || /^生成中/.test(compact);
  }

  function isTagStripMetaFallback(text) {
    const value = String(text || "").trim();
    if (!value || isWeakRawFallbackText(value)) return false;
    if (isNarrativeFallbackText(value)) return false;
    return /初星正文(?:开始|结束)/.test(value)
      || /(?:分析|检查表|样例|提示词|thinking|planning)/i.test(value);
  }

  function isNarrativeFallbackText(text) {
    const value = String(text || "").trim();
    if (!value) return false;
    if (/<(?:dialogue|narration|story)\b/i.test(value)) return true;
    if (/[「“]/.test(value)) return true;
    const compact = value.replace(/\s+/g, "");
    if (compact.length < 12) return false;
    if (/(?:初星正文(?:开始|结束)|(?:规则|检查表|样例|提示词)(?:复述|检查)?)/.test(value)) return false;
    return /[\u4e00-\u9fff]/.test(value);
  }

  function extractReplyText(candidates) {
    const slots = Array.isArray(candidates) ? candidates : [];
    const rawCandidate = String(slots[0] || "");
    const textCandidate = String(slots[1] || "");
    const renderedCandidate = String(slots[2] || "");
    if (!rawCandidate.trim() && !textCandidate.trim() && !renderedCandidate.trim()) return "";
    if (!rawCandidate.trim()) return "";

    const indexed = [
      { index: 0, candidate: rawCandidate },
      { index: 1, candidate: textCandidate },
      { index: 2, candidate: renderedCandidate }
    ].filter((entry) => entry.candidate.trim());

    const results = indexed
      .map(({ index, candidate }) => ({
        index,
        candidate,
        ...extractReplyCandidate(candidate)
      }))
      .filter((result) => result.text);

    const rawResult = results.find((result) => result.index === 0);
    const secondaryDelimited = results.find(
      (result) => result.index > 0 && (result.method === "hatsu" || result.method === "maintext")
    );

    if (rawResult?.method === "hatsu" || rawResult?.method === "maintext") {
      return rawResult.text;
    }

    if (rawResult && isNarrativeFallbackText(rawResult.text) && !isWeakRawFallbackText(rawResult.text)) {
      return rawResult.text;
    }

    if (rawResult?.text && isTagStripMetaFallback(rawResult.text) && secondaryDelimited) {
      return secondaryDelimited.text;
    }

    if (rawResult?.text && !isWeakRawFallbackText(rawResult.text)) {
      return rawResult.text;
    }

    return "";
  }

  function stripAiThinkingBlocks(value) {
    const thinkTags = "thinking|think|details|summary|vars|analysis|planning|plan|konatan_planning|bginfo|bginfor|draft_notes|bginfor";
    const unclosedThinkTags = "thinking|think|details|summary|vars|analysis|planning|plan|konatan_planning|bginfo|bginfor|draft_notes|bginfor";
    const closedRegex = new RegExp("<(" + thinkTags + ")\\b[^>]*>[\\s\\S]*?<\\/\\1>", "gi");
    const malformedClosedRegex = new RegExp("<(" + thinkTags + ")\\b[^>]*>[\\s\\S]*?<\\/\\1[^>]*>", "gi");
    const unclosedRegex = new RegExp("<(" + unclosedThinkTags + ")\\b[^>]*>[\\s\\S]*$", "gi");
    const redactedPrefix = "redacted" + "_";
    const redactedMismatchedRegex = new RegExp(
      "<" + redactedPrefix + "thinking(?:\\s[^>]*)?>[\\s\\S]*?</" + redactedPrefix + "reasoning>",
      "gi"
    );
    const redactedClosedRegex = new RegExp(
      "<" + redactedPrefix + "(?:thinking|reasoning)(?:\\s[^>]*)?>[\\s\\S]*?</" + redactedPrefix + "(?:thinking|reasoning)>",
      "gi"
    );
    const redactedUnclosedRegex = new RegExp(
      "<" + redactedPrefix + "(?:thinking|reasoning)(?:\\s[^>]*)?>[\\s\\S]*$",
      "gi"
    );

    return String(value || "")
      .replace(/^[\s\S]*?<!--\s*end_of_Subtext_think\s*-->/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(redactedMismatchedRegex, "")
      .replace(redactedClosedRegex, "")
      .replace(redactedUnclosedRegex, "")
      .replace(closedRegex, "")
      .replace(malformedClosedRegex, "")
      .replace(unclosedRegex, "");
  }

  function extractReplyCandidate(value) {
    const raw = String(value || "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\u200b/g, "");

    const withoutThinking = stripAiThinkingBlocks(raw);

    // 使用【倒数匹配】查找最末尾的“初星正文开始”作为故事正文起点，彻底避开前置的样例与检查表干扰
    const startMatches = [...withoutThinking.matchAll(/[【\[]\s*初星正文开始\s*[】\]]/g)];
    if (startMatches.length > 0) {
      const lastStartMatch = startMatches[startMatches.length - 1];
      const startIndex = lastStartMatch.index + lastStartMatch[0].length;
      let content = withoutThinking.slice(startIndex);

      // 剥离结束符及其后面的所有内容 (包括 HatsuStatus 等状态块)
      content = content.replace(/[【\[]\s*初星正文结束\s*[】\]][\s\S]*$/u, "");
      const storyMatches = [...content.matchAll(/<story\b[^>]*>([\s\S]*?)<\/story>/gi)];
      if (storyMatches.length > 0) {
        content = storyMatches[storyMatches.length - 1][1];
      }
      return { method: "hatsu", text: cleanReplyText(content) };
    }

    const mainMatches = [...withoutThinking.matchAll(/<maintext\b[^>]*>([\s\S]*)/gi)];
    if (mainMatches.length > 0) {
      const lastMainMatch = mainMatches[mainMatches.length - 1];
      const content = lastMainMatch[1].replace(/<\/maintext>[\s\S]*$/gi, "");
      return { method: "maintext", text: cleanReplyText(content) };
    }

    return { method: "fallback", text: cleanReplyText(withoutThinking) };
  }

  function cleanReplyText(value) {
    const thinkTags = "thinking|think|details|summary|vars|analysis|planning|plan|konatan_planning|bginfo|bginfor|draft_notes|bginfor";
    const unclosedThinkTags = "thinking|think|details|summary|vars|analysis|planning|plan|konatan_planning|bginfo|bginfor|draft_notes|bginfor";
    const closedRegex = new RegExp("<(" + thinkTags + ")\\b[^>]*>[\\s\\S]*?<\\/\\1>", "gi");
    const malformedClosedRegex = new RegExp("<(" + thinkTags + ")\\b[^>]*>[\\s\\S]*?<\\/\\1[^>]*>", "gi");
    const unclosedRegex = new RegExp("<(" + unclosedThinkTags + ")\\b[^>]*>[\\s\\S]*$", "gi");
    const redactedPrefix = "redacted" + "_";
    const redactedMismatchedRegex = new RegExp(
      "<" + redactedPrefix + "thinking(?:\\s[^>]*)?>[\\s\\S]*?</" + redactedPrefix + "reasoning>",
      "gi"
    );
    const redactedClosedRegex = new RegExp(
      "<" + redactedPrefix + "(?:thinking|reasoning)(?:\\s[^>]*)?>[\\s\\S]*?</" + redactedPrefix + "(?:thinking|reasoning)>",
      "gi"
    );
    const redactedUnclosedRegex = new RegExp(
      "<" + redactedPrefix + "(?:thinking|reasoning)(?:\\s[^>]*)?>[\\s\\S]*$",
      "gi"
    );

    return String(value || "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(redactedMismatchedRegex, "")
      .replace(redactedClosedRegex, "")
      .replace(redactedUnclosedRegex, "")
      .replace(closedRegex, "")
      .replace(malformedClosedRegex, "")
      .replace(unclosedRegex, "")
      .replace(/<(?!dialogue|narration|\/dialogue|\/narration)\/?[a-zA-Z_][\w:-]*\b[^>]*>/gi, "")
      .replace(/\[\s*\{[\s\S]*?\}\s*\]\s*$/g, "")
      .replace(/^\s*\*{1,2}\s*/gm, "")
      .replace(/\s*\*{1,2}\s*$/gm, "")
      .replace(/【初星任务完成】\s*[a-z0-9_]+/gi, "")
      .replace(/<quest_complete\b[^>]*\/?>/gi, "")
      .replace(/【初星任务标记】\s*[a-z0-9_]+/gi, "")
      .replace(/<quest_flag\b[^>]*\/?>/gi, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function extractTaggedSummarySection(source, tagName) {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i");
    const match = String(source || "").match(regex);
    return match ? cleanReplyText(match[1]) : "";
  }

  function extractDailySummary(source) {
    const raw = String(source || "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\u200b/g, "");
    const blockMatch = raw.match(/[【\[]\s*今日总结开始\s*[】\]]([\s\S]*?)[【\[]\s*今日总结结束\s*[】\]]/u);
    const block = blockMatch ? blockMatch[1] : raw;
    const intro = extractTaggedSummarySection(block, "summary_intro");
    const status = extractTaggedSummarySection(block, "summary_status");
    const producer = extractTaggedSummarySection(block, "summary_producer");
    const complete = Boolean(intro && status && producer);
    return {
      intro,
      status,
      producer,
      raw: block.trim(),
      complete
    };
  }

  function extractPhoneChatReply(source) {
    const raw = stripAiThinkingBlocks(String(source || "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\u200b/g, ""));

    const strictMatches = [...raw.matchAll(/<初星私聊\s+from=["']([^"']+)["']\s*>([\s\S]*?)<\/初星私聊>/gi)];
    const looseMatches = [...raw.matchAll(/<初星私聊\s*>([\s\S]*?)<\/初星私聊>/gi)];

    let from = state.idol || "";
    let body = "";
    if (strictMatches.length) {
      const last = strictMatches[strictMatches.length - 1];
      from = canonicalIdolName(last[1].trim());
      body = last[2];
    } else if (looseMatches.length) {
      body = looseMatches[looseMatches.length - 1][1];
    } else {
      return { from, lines: [], complete: false };
    }

    const lines = String(body || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    return {
      from,
      lines,
      complete: lines.length > 0
    };
  }

  function extractChoicePayload(value) {
    let content = stripAiThinkingBlocks(String(value || "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\u200b/g, ""));

    const startMatches = [...content.matchAll(/[【\[]\s*初星正文开始\s*[】\]]/g)];
    if (startMatches.length > 0) {
      const lastStartMatch = startMatches[startMatches.length - 1];
      content = content.slice(lastStartMatch.index + lastStartMatch[0].length);
      content = content.replace(/[【\[]\s*初星正文结束\s*[】\]][\s\S]*$/u, "");
    } else {
      const mainMatches = [...content.matchAll(/<maintext\b[^>]*>([\s\S]*)/gi)];
      if (mainMatches.length > 0) {
        content = mainMatches[mainMatches.length - 1][1].replace(/<\/maintext>[\s\S]*$/gi, "");
      }
    }

    const storyMatches = [...content.matchAll(/<story\b[^>]*>[\s\S]*?<\/story>/gi)];
    if (storyMatches.length > 0) {
      const lastStoryMatch = storyMatches[storyMatches.length - 1];
      content = content.slice(lastStoryMatch.index || 0);
    }

    const extractTaggedOption = (num) => {
      const regexes = [
        new RegExp(`<option_?${num}>([\\s\\S]*?)<\\/option_?${num}>`, "i"),
        new RegExp(`<option\\s+${num}>([\\s\\S]*?)<\\/option\\s+${num}>`, "i")
      ];
      for (const regex of regexes) {
        const match = content.match(regex);
        if (match?.[1]?.trim()) return match[1].trim();
      }
      return "";
    };

    const extractTaggedTime = (num) => {
      const regexes = [
        new RegExp(`<time_?${num}>([\\s\\S]*?)<\\/time_?${num}>`, "i"),
        new RegExp(`<time\\s+${num}>([\\s\\S]*?)<\\/time\\s+${num}>`, "i")
      ];
      for (const regex of regexes) {
        const match = content.match(regex);
        if (match?.[1]?.trim()) return match[1].trim();
      }
      return "";
    };

    let options = [1, 2, 3, 4].map(extractTaggedOption);
    const optionMinutes = [1, 2, 3, 4].map((num) => {
      const raw = extractTaggedTime(num);
      return raw ? parseMapOptionMinutes(raw) : null;
    });
    let story = content.match(/<story\b[^>]*>([\s\S]*?)<\/story>/i)?.[1]?.trim() || "";

    if (options.every(Boolean) && !story) {
      const firstOptIndex = content.search(/<option/i);
      if (firstOptIndex !== -1) story = cleanReplyText(content.slice(0, firstOptIndex));
    }

    if (!options.every(Boolean)) {
      const quoteRegex = new RegExp("“[^”]{2,160}”|「[^」]{2,160}」|\"[^\"]{2,160}\"", "g");
      const quoteMatches = [...content.matchAll(quoteRegex)];
      if (quoteMatches.length >= 4) {
        const last4 = quoteMatches.slice(-4);
        options = last4.map((match) => match[0].trim());
        const firstChoiceIndex = last4[0].index ?? -1;
        if (!story && firstChoiceIndex >= 0) {
          story = cleanReplyText(content.slice(0, firstChoiceIndex));
        }
      }
    }

    return {
      story: cleanReplyText(story),
      options: options.map((option) => cleanReplyText(option)).filter(Boolean),
      optionMinutes
    };
  }

  function extractFreeModeRelationshipUpdate(value) {
    const content = stripAiThinkingBlocks(String(value || "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\u200b/g, ""));
    const match = content.match(/[【\[]\s*好感度更新开始\s*[】\]]([\s\S]*?)[【\[]\s*好感度更新结束\s*[】\]]/u)
      || content.match(/<relationship_update\b[^>]*>([\s\S]*?)<\/relationship_update>/i);
    if (!match?.[1]) return {};
    const body = match[1].trim();
    const jsonStart = body.indexOf("{");
    const jsonEnd = body.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) return {};
    try {
      const parsed = JSON.parse(body.slice(jsonStart, jsonEnd + 1));
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      return parsed;
    } catch (error) {
      console.warn("[free-mode] 好感度更新解析失败:", error);
      return {};
    }
  }

  function parseFreeModeRelationshipDelta(rawValue) {
    const value = rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
      ? rawValue.好感度
      : rawValue;
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round(clamp(number, -10, 10));
  }

  function applyFreeModeRelationshipUpdate(rawUpdate = {}) {
    if (!rawUpdate || typeof rawUpdate !== "object" || Array.isArray(rawUpdate)) return {};
    const applied = { idols: {}, npcs: {} };
    ensureFreeModeRelationships();
    if (typeof ensureFreeModeNpcRelationships === "function") ensureFreeModeNpcRelationships();

    const applyIdolDelta = (rawName, rawValue) => {
      const idolName = canonicalIdolName(rawName);
      if (!idolName || !idols[idolName]) return;
      const delta = parseFreeModeRelationshipDelta(rawValue);
      if (!delta) return;
      const entry = getFreeModeRelationship(idolName);
      if (!entry) return;
      entry.好感度 = clampFreeModeRelationshipScore((entry.好感度 || 0) + delta);
      entry.更新日 = Number(state.freeMode?.postLiveDay || state.day || 1);
      const result = { 好感度: entry.好感度, delta };
      applied.idols[idolName] = result;
      applied[idolName] = result;
    };

    const applyNpcDelta = (rawName, rawValue) => {
      if (typeof canonicalNpcName !== "function" || typeof getFreeModeNpcRelationship !== "function") return;
      const npcName = canonicalNpcName(rawName);
      if (!npcName) return;
      const delta = parseFreeModeRelationshipDelta(rawValue);
      if (!delta) return;
      const entry = getFreeModeNpcRelationship(npcName);
      if (!entry) return;
      entry.好感度 = clampFreeModeRelationshipScore((entry.好感度 || 0) + delta);
      entry.更新日 = Number(state.freeMode?.postLiveDay || state.day || 1);
      applied.npcs[npcName] = { 好感度: entry.好感度, delta };
    };

    if (rawUpdate.idols && typeof rawUpdate.idols === "object" && !Array.isArray(rawUpdate.idols)) {
      Object.entries(rawUpdate.idols).forEach(([rawName, rawValue]) => applyIdolDelta(rawName, rawValue));
    }
    if (rawUpdate.npcs && typeof rawUpdate.npcs === "object" && !Array.isArray(rawUpdate.npcs)) {
      Object.entries(rawUpdate.npcs).forEach(([rawName, rawValue]) => applyNpcDelta(rawName, rawValue));
    }
    Object.entries(rawUpdate).forEach(([rawName, rawValue]) => {
      if (rawName === "idols" || rawName === "npcs") return;
      if (canonicalIdolName(rawName) && idols[canonicalIdolName(rawName)]) {
        applyIdolDelta(rawName, rawValue);
        return;
      }
      if (typeof canonicalNpcName === "function" && canonicalNpcName(rawName)) applyNpcDelta(rawName, rawValue);
    });
    try {
      recordEveningJournalRelationships(applied);
    } catch (_) {
      // no-op when relationship helpers are not in scope (isolated tests)
    }
    return applied;
  }

  function decodeAiReplySource(value) {
    return String(value || "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/\u200b/g, "")
      .trim();
  }

  function collectAiReplyCandidates(text = "", rawText = "", renderedText = "") {
    return [
      decodeAiReplySource(rawText),
      decodeAiReplySource(text),
      decodeAiReplySource(renderedText)
    ];
  }

  function selectAiReplySource(text, rawText = "", renderedText = "") {
    const candidates = collectAiReplyCandidates(text, rawText, renderedText);
    const pendingAction = state.pendingActionContext?.action;
    const expectsChoicePayload = isChoicePromptMode()
      || (state.eventMode === "choice_prompt" && ["outing", "companion", "intimacy", "bond", "map_location", "apartment_companion"].includes(pendingAction));

    if (expectsChoicePayload) {
      const completeChoiceSource = candidates.find((candidate) => {
        const payload = extractChoicePayload(candidate);
        return payload.story && payload.options.length === 4;
      });
      if (completeChoiceSource) return completeChoiceSource;
    }

    return candidates[0] || "";
  }
  function formatStoryText(text) {
    if (!text) return "";
    
    // Escape HTML first to prevent XSS
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
      
    // Format escaped XML tags
    html = html.replace(/&lt;dialogue\s+char="([^"]+)"&gt;([\s\S]*?)&lt;\/dialogue&gt;/gi, (match, speaker, content) => {
      let cleanContent = content.trim();
      if ((cleanContent.startsWith("“") && cleanContent.endsWith("”")) || (cleanContent.startsWith('"') && cleanContent.endsWith('"')) || (cleanContent.startsWith('「') && cleanContent.endsWith('」'))) {
        return `<strong>${speaker}</strong>：${cleanContent}`;
      }
      return `<strong>${speaker}</strong>：“${cleanContent}”`;
    });
    
    html = html.replace(/&lt;narration&gt;([\s\S]*?)&lt;\/narration&gt;/gi, (match, content) => {
      return content.trim();
    });

    // 1. Headers: ###, ##, #
    html = html.replace(/^###\s+(.*)$/gm, '<span class="story-h4">$1</span>');
    html = html.replace(/^##\s+(.*)$/gm, '<span class="story-h3">$1</span>');
    html = html.replace(/^#\s+(.*)$/gm, '<span class="story-h2">$1</span>');

    // 2. Bold: **text**
    html = html.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');

    // 3. Italics (Action/Monologue): *text*
    html = html.replace(/\*([^\*]+)\*/g, '<span class="story-action">$1</span>');

    // 4. Quotes (Dialogue): Wrap "..." or “...” or 「...」
    html = html.replace(/(“[^”]*”|「[^」]*」|"[^"]*")/g, '<span class="story-dialogue">$1</span>');

    // 5. Choice highlight: ▶ 制作人的选择：...
    html = html.replace(/(▶\s*制作人的选择：.*)/g, '<strong style="color:var(--violet)">$1</strong>');
    
    return html;
  }

  function isCurrentSandboxFirstLiveReply(requestId) {
    const turn = state.harness?.activeTurn;
    return Boolean(
      (turn.kind === "sandbox_first_live" && turn.action === "sandbox_first_live")
      && turn.status === "generating"
      && turn.requestId === requestId
      && pendingAiRequestId === requestId
      && isPrimaryModelLeaseCurrent(requestId, activeInboundPrimaryChannelLeaseId)
    );
  }

  function handleSandboxFirstLiveReply(source, requestId, rawText, renderedText, text, isFinal, messageId) {
    const narrative = extractSandboxFirstLiveNarrative(source);
    if (!isFinal) {
      state.lastStory = String(source || "");
      const storyEl = document.getElementById("eventStory");
      if (storyEl) storyEl.innerHTML = formatStoryText(state.lastStory);
      setEventActionsEnabled(false, true);
      sendAiReplyAck(requestId, true, false, false);
      return true;
    }
    if (!narrative) {
      pendingAiRequestId = "";
      state.pendingAiRequestId = "";
      state.sandbox.firstLiveChallenge.status = "recovery_required";
      if (state.sandbox.firstLiveChallenge.activeAttempt) {
        state.sandbox.firstLiveChallenge.activeAttempt.status = "recovery_required";
      }
      markHarnessSandboxFirstLiveTurn("recovery_required", {
        requestId: "",
        recoveryFailureReason: "invalid_reply"
      }, requestId);
      saveState("harness.sandbox_first_live_invalid_reply");
      render();
      openHarnessRecoveryOverlay(state.harness.activeTurn);
      sendAiReplyAck(requestId, false, false);
      return true;
    }
    const challenge = state.sandbox.firstLiveChallenge;
    const attempt = challenge.activeAttempt;
    state.lastStory = `${narrative.pre}\n\n${narrative.post}`;
    state.lastPrompt = state.harness.activeTurn?.generationPrompt || state.lastPrompt;
    if (state.log[0]) state.log[0].aiReply = state.lastStory;
    state.activeStoryNode = null;
    pendingAiRequestId = "";
    state.pendingAiRequestId = "";
    if (attempt) attempt.status = "completed";
    challenge.status = attempt?.success ? "completed" : "cooldown";
    markHarnessSandboxFirstLiveTurn("completed", {}, requestId);
    requestChronicleUpdate(rawText, renderedText, text, messageId);
    saveState("harness.sandbox_first_live_completed");
    render();
    openEventOverlay("校内舞台 · First Live", "演出叙事已完成", state.lastStory);
    sendAiReplyAck(requestId, true, false);
    return true;
  }

  function isJunkReply(value) {
    const compact = String(value || "").replace(/\s+/g, "");
    return !compact || compact.length < 2 || /^[.…。·\-—_]+$/.test(compact) || /^正文$/.test(compact) || /^…正文…$/.test(compact);
  }

  function chooseLongestReply(...values) {
    return values
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .sort((a, b) => b.replace(/\s+/g, "").length - a.replace(/\s+/g, "").length)[0] || "";
  }

  function fallbackChoiceSettlement(reply) {
    pendingAiRequestId = "";
    state.eventMode = "none";
    state.choiceStep = 0;
    if (!state.pendingActionContext) {
      saveState();
      setEventActionsEnabled(true, false);
      return;
    }
    const { action, attribute, actionContext } = state.pendingActionContext;

    if (action === "map_location") {
      if (actionContext?.isReturn) {
        state.lastStory = reply;
        pendingAiRequestId = "";
        state.eventMode = "none";
        state.choiceStep = 0;
        state.pendingOptionTexts = [];
        state.selectedChoiceText = "";
        state.selectedChoiceRating = "";
        saveState();
        const locationName = actionContext.locationName
          || getWorldMapLocation(actionContext.locationId)?.name
          || "地图";
        const returnLabel = getMapExploreReturnLabel(actionContext);
        openEventOverlay(`${locationName} · 离开`, `离开完成，点击${returnLabel}`, reply);
        const confirm = document.getElementById("eventConfirmBtn");
        if (confirm) {
          confirm.disabled = false;
          confirm.textContent = returnLabel;
        }
        return;
      }
      return;
    }
    
    const delta = {};
    if (action === "outing") {
      delta.stamina = 38;
      delta.stress = -5;
      delta.trust = 5; // 降级时的默认外出信赖值
    } else if (action === "companion") {
      delta.stamina = 18;
      delta.stress = -2;
      delta.trust = 15; // 降级时的默认交流信赖值
    } else if (action === "intimacy") {
      delta.stamina = 38;
      delta.stress = -10;
      if (!isNsfwIntimacyActive()) {
        delta.trust = INTIMACY_NORMAL_TRUST_GAIN;
      }
    }
    
    Object.entries(delta).forEach(([key, value]) => {
      const max = ["Vo", "Da", "Vi"].includes(key) ? Number(state.cap?.[key] || 999) : 100;
      state[key] = clamp((state[key] || 0) + value, 0, max);
    });
    
    refreshAffinityUnlocks();
    advanceRound();
    rollSpCandidates();
    
    const actionName = actionLabel(action, attribute);
    const resultText = formatDelta(delta);
    const locationText = action === "outing" && actionContext.destination ? `外出地点：${actionContext.destination}` : "";
    const companionText = action === "companion" && actionContext.companionTopic ? `交流主题：${actionContext.companionTopic}` : "";
    const resultSummary = [locationText, companionText, resultText].filter(Boolean).join("，");
    
    state.log.unshift({ day: state.day, round: state.round, phase: getPhase(), action: actionName, result: resultSummary });
    state.log = state.log.slice(0, 24);
    
    state.lastStory = reply;
    state.pendingOptionTexts = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    clearIntimacyRoute();
    if (state.pendingActionContext?.actionContext?.isDailyFinalAction) {
      const parsedSummary = extractDailySummary(reply);
      state.dailySummary = {
        day: state.day,
        intro: parsedSummary.intro,
        status: parsedSummary.status,
        producer: parsedSummary.producer,
        raw: parsedSummary.raw,
        complete: parsedSummary.complete
      };
    }
    if (state.log[0]) {
      state.log[0].aiReply = reply;
    }
    saveState();
    render();
    
    setElementHidden("eventChoices", true);
    const actionsEl = document.getElementById("eventActions");
    if (actionsEl) actionsEl.style.display = "grid";
    
    const confirm = document.getElementById("eventConfirmBtn");
    if (confirm) {
      confirm.disabled = false;
      confirm.textContent = "确定";
    }
    
    openEventOverlay(actionName, "已收到 SillyTavern 角色回复（已自动结算）", reply);
  }

  function handleChoiceSelection(index) {
    if (!state.pendingActionContext) return;
    if (state.pendingActionContext.action === "evening_go_home") {
      handleEveningGoHomeChoice(index);
      return;
    }
    if (isNsfwIntimacyActive()) {
      handleNsfwIntimacyPresetChoice(index);
      return;
    }

    const buttons = document.querySelectorAll("#eventChoices .choice-button");
    buttons.forEach(btn => btn.disabled = true);
    
    const { action, attribute, actionContext } = state.pendingActionContext;
    if (action === "bond") {
      const threshold = state.pendingActionContext.threshold;
      const chosenOptionText = state.pendingOptionTexts[index] || "选择该选项";
      const chosenLine = `<narration>▶ 制作人的选择：${chosenOptionText}</narration>`;
      const requestId = createRequestId();
      pendingAiRequestId = requestId;
      state.selectedChoiceText = chosenOptionText;
      state.selectedChoiceRating = "羁绊选择";

      if (state.bondChoiceRound === 1) {
        state.bondFirstChoiceText = chosenOptionText;
        state.bondChoiceRound = 2;
        state.eventMode = "choice_prompt";
        state.choiceStep = 1;
        state.pendingOptionTexts = [];
        state.lastPrompt = buildSpecialBondPhase2Prompt(threshold, chosenOptionText);
        state.lastStory = `${state.lastStory}\n\n${chosenLine}`;
        state.lastDebug = `${specialBondLabel()}：第一轮已选择“${chosenOptionText}”，等待第二轮选项。`;
      } else {
        state.eventMode = "choice_resolution";
        state.choiceStep = 2;
        state.lastPrompt = buildSpecialBondFinalPrompt(threshold, state.bondFirstChoiceText, chosenOptionText);
        state.lastDebug = `${specialBondLabel()}：第二轮已选择“${chosenOptionText}”，等待最终收束。`;
      }

      saveState();
      render();
      const pendingStory = buildChoicePendingDisplayStory(state.lastStory, chosenLine);
      openEventOverlay(`好感度 ${threshold}：${affinityNodes[threshold]?.title || "羁绊事件"}`, "已发送羁绊事件后续请求，等待 AI 回复", pendingStory);
      if (!requestHostPromptSend(state.lastPrompt, requestId)) {
        openAiPromptOverlay("当前页面未连接 SillyTavern。请编辑或复制羁绊事件提示词后手动发送。");
      }
      return;
    }

    if (action === "map_location") {
      handleMapLocationChoiceSelection(index);
      return;
    }
    if (action === "apartment_companion") {
      handleApartmentCompanionChoiceSelection(index);
      return;
    }

    const trustGain = action === "intimacy"
      ? INTIMACY_NORMAL_TRUST_GAIN
      : (state.pendingChoiceRewards[index] ?? 5);
    const chosenOptionText = state.pendingOptionTexts[index] || "选择该选项";
    const ratingName = action === "intimacy"
      ? "【普通亲密】"
      : (action === "outing" && trustGain === 10) || (action === "companion" && trustGain === 20)
      ? "【完美】"
      : (action === "outing" && trustGain === 8) || (action === "companion" && trustGain === 15)
        ? "【极佳】"
        : (action === "outing" && trustGain === 6) || (action === "companion" && trustGain === 10)
          ? "【普通】"
          : "【笨拙】";
    
    // 1. 正常结算属性增益
    const delta = {};
    if (action === "outing") {
      delta.stamina = 38;
      delta.stress = -5;
      delta.trust = trustGain;
    } else if (action === "companion") {
      delta.stamina = 18;
      delta.stress = -2;
      delta.trust = trustGain;
    } else if (action === "intimacy") {
      delta.stamina = 38;
      delta.stress = -10;
      delta.trust = INTIMACY_NORMAL_TRUST_GAIN;
    }
    
    Object.entries(delta).forEach(([key, value]) => {
      const max = ["Vo", "Da", "Vi"].includes(key) ? Number(state.cap?.[key] || 999) : 100;
      state[key] = clamp((state[key] || 0) + value, 0, max);
    });
    
    // 2. 推进回合与日常刷新
    refreshAffinityUnlocks();
    advanceRound();
    rollSpCandidates();
    
    // 3. 记录日志
    const actionName = actionLabel(action, attribute);
    const resultText = formatDelta(delta);
    const locationText = action === "outing" && actionContext.destination ? `外出地点：${actionContext.destination}` : "";
    const companionText = action === "companion" && actionContext.companionTopic ? `交流主题：${actionContext.companionTopic}` : "";
    const resultSummary = [locationText, companionText, resultText, ratingName].filter(Boolean).join("，");
    state.log.unshift({ day: state.day, round: state.round, phase: getPhase(), action: actionName, result: resultSummary });
    state.log = state.log.slice(0, 24);
    
    // 4. 更新选择记录状态并发起第二阶段反应生成
    state.selectedChoiceText = chosenOptionText;
    state.selectedChoiceRating = ratingName;
    state.eventMode = "choice_resolution";
    state.choiceStep = 2;
    const requestId = createRequestId();
    pendingAiRequestId = requestId;
    
    const prompt = buildChoicePhase2Prompt(action, attribute, chosenOptionText, trustGain, actionContext);
    state.lastPrompt = prompt;
    state.lastDebug = action === "intimacy"
      ? `第二阶段剧情生成：已选择“${chosenOptionText}”，普通亲密固定结算体力 +38、压力 -10、信赖 +${INTIMACY_NORMAL_TRUST_GAIN}（${ratingName}）。等待 AI 生成偶像反应。`
      : `第二阶段剧情生成：已选择“${chosenOptionText}”，获得信赖度 +${trustGain}（${ratingName}）。等待 AI 生成偶像反应。`;
    
    saveState();
    render();
    
    // 5. 更新 UI 状态
    setElementHidden("eventChoices", true);
    
    const actionsEl = document.getElementById("eventActions");
    if (actionsEl) actionsEl.style.display = "grid";
    
    const confirm = document.getElementById("eventConfirmBtn");
    if (confirm) {
      confirm.disabled = true;
      confirm.textContent = "正在生成中...";
    }
    
    const chosenLine = `<narration>▶ 制作人的选择：${chosenOptionText} (${ratingName})</narration>`;
    const pendingStory = buildChoicePendingDisplayStory(state.lastStory, chosenLine);
    const storyEl = document.getElementById("eventStory");
    if (storyEl) {
      storyEl.innerHTML = formatStoryText(pendingStory);
    }
    openEventOverlay(actionName, "正在等待 SillyTavern 角色回复", pendingStory);
    
    if (!requestHostPromptSend(prompt, requestId)) {
      openAiPromptOverlay("当前页面未连接 SillyTavern。请复制提示词发送获取后续。");
    }
  }

  function applyAiReply(text, requestId = "", rawText = "", renderedText = "", isFinal = true, variableCommands = [], messageId = null) {
    debugHarnessEvent("reply.received", {
      requestId,
      isFinal: Boolean(isFinal),
      textLength: String(text || "").length
    });
    aiBridgeDebug.lastVariableCommands = Array.isArray(variableCommands) ? variableCommands : [];
    // 私聊回复容错：即使模块级 pendingAiRequestId 因报错/跳过/重载而丢失，只要回复的
    // requestId 与当前等待中的私聊请求一致，仍应接收并重新接管 pendingAiRequestId。
    const phonePendingForGate = String(state.phoneChat?.pendingRequestId || "");
    const phoneChatStillAwaiting = state.activeStoryNode?.type === "phonechat"
      && state.phoneChat?.isAwaitingReply
      && Boolean(requestId)
      && requestId === phonePendingForGate;
    if (phoneChatStillAwaiting && pendingAiRequestId !== requestId) {
      pendingAiRequestId = requestId;
    }
    const acceptedRequest = shouldAcceptAiReply(requestId, pendingAiRequestId);
    debugHarnessEvent("reply.accepted", {
      requestId,
      isFinal: Boolean(isFinal),
      accepted: acceptedRequest
    });
    if (!acceptedRequest) {
      recordHarnessTrace("reply.rejected_stale", {
        requestId,
        expectedRequestId: pendingAiRequestId || "",
        isFinal: Boolean(isFinal)
      });
      recordAiReplyDebug({ text, rawText, renderedText, requestId, isFinal, source: "", accepted: false });
      sendAiReplyAck(requestId, false, false);
      return;
    }
    if (isCurrentStorytellerEventReply(requestId)) {
      const replyCandidates = collectAiReplyCandidates(text, rawText, renderedText);
      const source = selectAiReplySource(text, rawText, renderedText);
      const reply = extractReplyText(replyCandidates);
      recordAiReplyDebug({ text, rawText, renderedText, requestId, isFinal, source, accepted: true });
      if (!isFinal) {
        const storyEl = document.getElementById("eventStory");
        if (storyEl && reply) storyEl.innerHTML = formatStoryText(reply);
        setEventActionsEnabled(false, true);
        sendAiReplyAck(requestId, true, false, false);
        return;
      }
      if (!reply || reply.replace(/\s+/g, "").length < 12 || isJunkReply(reply)) {
        if (returnHarnessRecoveryAttemptToPending(requestId, "invalid_reply")) {
          pendingAiRequestId = "";
          state.pendingAiRequestId = "";
          saveState("harness.storyteller_event_invalid_reply");
          render();
          openHarnessRecoveryOverlay(state.harness.activeTurn);
        }
        sendAiReplyAck(requestId, false, false);
        return;
      }
      commitStorytellerEventReply(requestId, reply, rawText, renderedText, text, messageId);
      return;
    }
    if (isCurrentSandboxFirstLiveReply(requestId)) {
      const source = selectAiReplySource(text, rawText, renderedText);
      recordAiReplyDebug({ text, rawText, renderedText, requestId, isFinal, source, accepted: true });
      handleSandboxFirstLiveReply(source, requestId, rawText, renderedText, text, isFinal, messageId);
      return;
    }
    preparePendingDirectorDigestCandidate(acceptedRequest, requestId, rawText, renderedText, text, messageId);
    if (shouldRequestChronicleUpdate(acceptedRequest, isFinal)) {
      requestChronicleUpdate(rawText, renderedText, text, messageId);
    }
    const replyCandidates = collectAiReplyCandidates(text, rawText, renderedText);
    // 选项/任务等仍优先选能解析出完整 payload 的候选；正文提取会对全部候选做合并解析。
    const source = selectAiReplySource(text, rawText, renderedText);
    recordAiReplyDebug({ text, rawText, renderedText, requestId, isFinal, source, accepted: true });

    const phonePendingRequestId = String(state.phoneChat?.pendingRequestId || "");
    const shouldRouteToPhoneChat = state.activeStoryNode?.type === "phonechat"
      && state.phoneChat?.isAwaitingReply
      && Boolean(phonePendingRequestId)
      && requestId === phonePendingRequestId;
    if (shouldRouteToPhoneChat) {
      handlePhoneChatAiReply(source, requestId, isFinal);
      return;
    }

    const broadcastPendingRequestId = String(state.freeMode?.world?.broadcast?.pendingRequestId || "");
    const shouldRouteToBroadcast = state.activeStoryNode?.type === "broadcast"
      && Boolean(broadcastPendingRequestId)
      && requestId === broadcastPendingRequestId;
    if (shouldRouteToBroadcast) {
      handleBroadcastAiReply(source, requestId, isFinal);
      return;
    }    if (state.pendingActionContext?.action === "outing_scene_dialogue") {
      const context = state.pendingActionContext.actionContext || {};
      const idolName = context.outingSelectedIdol || state.freeMode?.outingScene?.selectedIdol || state.idol || "担当偶像";
      const dialogue = extractFreeModeOutingSceneDialogue(source);
      renderFreeModeOutingSceneDialogue(dialogue, idolName);
      if (!isFinal) {
        sendAiReplyAck(requestId, true, false, false);
        return;
      }
      pendingAiRequestId = "";
      state.lastStory = [dialogue.narration, dialogue.producer, dialogue.idol].filter(Boolean).join("\n");
      state.lastDebug = "商场场景内对话：AI 回复已渲染到当前场景。";
      state.pendingActionContext = null;
      saveState();
      sendAiReplyAck(requestId, true, false);
      return;
    }



    const choiceFallbackPayload = (() => {
      if (state.eventMode !== "choice_prompt" || isChoicePromptMode()) return null;
      const pendingAction = state.pendingActionContext?.action;
      if (!["outing", "companion", "intimacy", "bond", "map_location", "apartment_companion"].includes(pendingAction)) return null;
      for (const candidate of replyCandidates) {
        const payload = extractChoicePayload(candidate);
        if (payload.story && payload.options.length === 4) return payload;
      }
      return null;
    })();

    // ==========================================
    // 交互式选项第一阶段：提取剧情和选项标签
    // ==========================================
    if (isChoicePromptMode() || choiceFallbackPayload) {
      let choiceContent = source;
      let choicePayload = choiceFallbackPayload || extractChoicePayload(source);
      let [opt1, opt2, opt3, opt4] = choicePayload.options;
      let story = choicePayload.story;

      if ((!story || !opt1 || !opt2 || !opt3 || !opt4) && (state.pendingActionContext?.action === "map_location" || state.pendingActionContext?.action === "apartment_companion")) {
        const stripped = choiceContent
          .replace(/<option[\s\S]*$/i, "")
          .replace(/<time[\d_\s>][\s\S]*$/gi, "");
        if (!story) story = cleanReplyText(stripped);
      }

      if (scoutTemariCompletionPendingInReply(source)) {
        const scoutStory = story || cleanReplyText(stripAiThinkingBlocks(choiceContent));
        if (!isFinal) {
          const storyEl = document.getElementById("eventStory");
          if (storyEl && scoutStory) {
            storyEl.innerHTML = formatStoryText(scoutStory);
          }
          setEventActionsEnabled(false, true);
          sendAiReplyAck(requestId, true, false, false);
          return;
        }
        if (completeScoutFromReplyAndBeginWrapUp(source, scoutStory, requestId)) {
          return;
        }
      }

      // 进一步降级：如果仍然无法解析，尝试智能按行提取段尾双引号选项/编号选项
      if (!story || !opt1 || !opt2 || !opt3 || !opt4) {
        const startMatches = [...choiceContent.matchAll(/[【\[]\s*初星正文开始\s*[】\]]/g)];
        if (startMatches.length > 0) {
          const lastStartMatch = startMatches[startMatches.length - 1];
          choiceContent = choiceContent.slice(lastStartMatch.index + lastStartMatch[0].length);
          choiceContent = choiceContent.replace(/[【\[]\s*初星正文结束\s*[】\]][\s\S]*$/u, "");
        }
        const lines = choiceContent.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length >= 5) {
          const last4 = lines.slice(-4);
          const isNumberedChoices = last4.every(line => {
            const hasNumberPrefix = /^[1-4\u2460-\u2463\uff11-\uff14\u4e00-\u56dbA-Da-d][\.\u3002\u3001、\-\s:]/.test(line) ||
                                    /^(选项|Option|分支)[\s1-4\u4e00-\u56dbA-Da-d]/.test(line);
            return hasNumberPrefix;
          });

          if (isNumberedChoices) {
            const cleanOption = (text) => {
              let cleaned = text.trim();
              cleaned = cleaned.replace(/^(选项|Option|分支|)[1-4\u4e00-\u56dbA-Da-d][\.\u3002\u3001、\-\s：:]*/i, '');
              cleaned = cleaned.replace(/^[1-4\u2460-\u2463\uff11-\uff14][\.\u3002\u3001、\-\s：:]*/i, '');
              cleaned = cleaned.replace(/^[\s“"「\(\[（【'‘]+/g, '').replace(/[\s”"」\)\]）】'’]+$/g, '').trim();
              return cleaned;
            };

            opt1 = cleanOption(last4[0]);
            opt2 = cleanOption(last4[1]);
            opt3 = cleanOption(last4[2]);
            opt4 = cleanOption(last4[3]);
            story = lines.slice(0, -4).join("\n");
          }
        }
      }

      if (story && opt1 && opt2 && opt3 && opt4) {
        state.pendingOptionTexts = [opt1, opt2, opt3, opt4];
        syncMapOptionMinutesFromPayload(extractChoicePayload(source));
        const nsfwMode = isNsfwIntimacyActive();
        const segmentStory = story;
        
        if (!isFinal) {
          const storyEl = document.getElementById("eventStory");
          if (storyEl) {
            storyEl.innerHTML = formatStoryText(segmentStory);
          }
          setEventActionsEnabled(false, true);
          sendAiReplyAck(requestId, true, false, false);
          return;
        }

        pendingAiRequestId = "";
        state.eventMode = "choice_prompt";
        state.choiceStep = 1;
        if (nsfwMode) {
          state.lastStory = state.lastStory
            ? `${state.lastStory}\n\n${segmentStory}`
            : segmentStory;
        } else if (state.pendingActionContext?.action === "bond" && state.bondChoiceRound === 2) {
          state.lastStory = `${state.lastStory}\n\n${segmentStory}`;
        } else {
          state.lastStory = segmentStory;
        }
        if (state.pendingActionContext?.action === "map_location") {
          const relationshipApplied = applyFreeModeRelationshipUpdate(extractFreeModeRelationshipUpdate(source));
          const relationshipSummary = Object.entries(relationshipApplied)
            .map(([idolName, info]) => `${idolName}${info.delta > 0 ? "+" : ""}${info.delta}（${info.好感度}）`)
            .join("、");
          if (relationshipSummary) {
            state.lastDebug = `自由探索好感度已更新：${relationshipSummary}`;
          }
        }
        if (state.pendingActionContext?.action === "apartment_companion") {
          const relationshipApplied = applyFreeModeRelationshipUpdate(extractFreeModeRelationshipUpdate(source));
          const relationshipSummary = Object.entries(relationshipApplied)
            .map(([idolName, info]) => `${idolName}${info.delta > 0 ? "+" : ""}${info.delta}（${info.好感度}）`)
            .join("、");
          if (relationshipSummary) {
            state.lastDebug = `公寓聊天好感度已更新：${relationshipSummary}`;
          }
        }
        if (state.pendingActionContext?.action === "map_location") {
          markHarnessMapExploreTurn("completed", {}, requestId);
        }
        saveState();

        const actionName = currentChoiceActionTitle();
        openEventOverlay(actionName, "请做出你的选择", segmentStory);

        if (!nsfwMode && !["map_location", "apartment_companion"].includes(state.pendingActionContext?.action)) {
          const choicesEl = document.getElementById("eventChoices");
          if (choicesEl) {
            choicesEl.innerHTML = "";
            [opt1, opt2, opt3, opt4].forEach((optText, index) => {
              const btn = document.createElement("button");
              btn.className = "choice-button";
              btn.textContent = optText;
              btn.onclick = () => handleChoiceSelection(index);
              choicesEl.appendChild(btn);
            });
            setElementHidden("eventChoices", false);
          }
        } else {
          setElementHidden("eventChoices", true);
        }

        const confirmBtn = document.getElementById("eventConfirmBtn");
        if (confirmBtn) {
          confirmBtn.disabled = true;
          confirmBtn.textContent = "请选择选项";
        }
        const regenBtn = document.getElementById("eventRegenBtn");
        if (regenBtn) regenBtn.disabled = false;
        const aiBtn = document.getElementById("eventAiBtn");
        if (aiBtn) aiBtn.disabled = false;
        const actionsEl = document.getElementById("eventActions");
        if (actionsEl) actionsEl.style.display = "grid";
        
        processSandboxQuestFromReply(source, true);
        sendAiReplyAck(requestId, true, false);
        return;
      }

      if (!isFinal) {
        // 如果是流式传输，在标签完备前先显示部分纯文本
        const storyEl = document.getElementById("eventStory");
        if (storyEl) {
          storyEl.innerHTML = formatStoryText(cleanReplyText(stripAiThinkingBlocks(choiceContent)));
        }
        setEventActionsEnabled(false, true);
        sendAiReplyAck(requestId, true, false, false);
        return;
      }

      // 完结了但选项格式缺失，保留事件等待玩家重新生成
      console.warn("[Hatsu Choices] Choice prompt incomplete. Waiting for regeneration.");
      const reply = cleanReplyText(stripAiThinkingBlocks(choiceContent));
      pendingAiRequestId = "";
      state.eventMode = "choice_prompt";
      state.choiceStep = 1;
      state.pendingOptionTexts = [];
      state.lastStory = reply || "选项生成不完整，请点击重新生成。";
      if (state.pendingActionContext?.action === "map_location"
        && returnHarnessRecoveryAttemptToPending(requestId, "incomplete_choice")) {
        saveState("harness.map_incomplete_choice");
        render();
        openHarnessRecoveryOverlay(state.harness.activeTurn);
        sendAiReplyAck(requestId, false, false);
        return;
      }
      saveState();
      render();
      openEventOverlay(currentChoiceActionTitle(), "选项生成不完整，请点击重新生成", state.lastStory);
      sendAiReplyAck(requestId, true, false);
      return;
    }

    // ==========================================
    // 交互式选项第二阶段：AI 反应与收尾剧情
    // ==========================================
    if (isChoiceResolutionMode()) {
      const reply = extractReplyText(replyCandidates);
      
      const storyEl = document.getElementById("eventStory");
      const isMapReturn = state.pendingActionContext?.action === "map_location"
        && Boolean(state.pendingActionContext?.actionContext?.isReturn);
      const locationName = state.pendingActionContext?.actionContext?.locationName
        || getWorldMapLocation(state.pendingActionContext?.actionContext?.locationId)?.name
        || "地图";
      const chosenLine = isMapReturn
        ? `<narration>▶ 制作人决定离开 ${locationName}，返回大地图。</narration>`
        : `<narration>▶ 制作人的选择：${state.selectedChoiceText || ""} (${state.selectedChoiceRating || ""})</narration>`;
      const displayStory = isSandboxScoutWrapUpPending()
        ? buildSandboxScoutWrapUpDisplayStory(reply)
        : buildChoiceContinuationDisplayStory(state.lastStory, chosenLine, reply);
      if (storyEl && reply) {
        storyEl.innerHTML = formatStoryText(displayStory);
      }

      if (!isFinal) {
        setEventActionsEnabled(false, true);
        sendAiReplyAck(requestId, true, false, false);
        return;
      }

      const isDailyFinalAction = Boolean(state.pendingActionContext?.actionContext?.isDailyFinalAction);
      if (isDailyFinalAction) {
        const parsedSummary = extractDailySummary(source);
        state.dailySummary = {
          day: state.day,
          intro: parsedSummary.intro,
          status: parsedSummary.status,
          producer: parsedSummary.producer,
          raw: parsedSummary.raw,
          complete: parsedSummary.complete
        };
      }

      pendingAiRequestId = "";
      state.lastStory = `${state.lastStory}\n\n${chosenLine}\n\n${reply}`;
      if (state.pendingActionContext?.action === "bond" && state.activeStoryNode?.type === "affinity") {
        state.activeStoryNode.ready = true;
        state.bondChoiceRound = 0;
        state.bondFirstChoiceText = "";
      }
      clearIntimacyRoute();
      if (state.log[0]) {
        state.log[0].aiReply = reply;
      }
      if (state.pendingActionContext?.action === "map_location") {
        if (isSandboxScoutWrapUpPending()) {
          const locationId = state.pendingActionContext?.actionContext?.locationId;
          const locationName = state.pendingActionContext?.actionContext?.locationName
            || getWorldMapLocation(locationId)?.name
            || "地图";
          const displayStory = buildSandboxScoutWrapUpDisplayStory(reply);
          pendingAiRequestId = "";
          state.pendingActionContext.actionContext = {
            ...state.pendingActionContext.actionContext,
            scoutWrapUpPending: false,
            scoutSignStory: ""
          };
          state.eventMode = "none";
          state.choiceStep = 0;
          state.pendingOptionTexts = [];
          state.selectedChoiceText = "";
          state.selectedChoiceRating = "";
          state.lastStory = displayStory;
          saveState();
          openEventOverlay(`${locationName} · 物色收尾`, "物色成功，点击返回地图", displayStory);
          const confirm = document.getElementById("eventConfirmBtn");
          if (confirm) {
            confirm.disabled = false;
            confirm.textContent = "返回地图";
          }
          processSandboxQuestFromReply(source, true);
          sendAiReplyAck(requestId, true, false);
          return;
        }
        if (state.pendingActionContext?.actionContext?.sideQuestResolving) {
          const sideQuestTitle = state.pendingActionContext.actionContext.sideQuestTitle || "委托";
          state.pendingActionContext.actionContext = {
            ...state.pendingActionContext.actionContext,
            sideQuestResolving: false
          };
          state.eventMode = "none";
          state.choiceStep = 0;
          state.pendingOptionTexts = [];
          state.selectedChoiceText = "";
          state.selectedChoiceRating = "";
          state.lastStory = displayStory;
          saveState();
          openEventOverlay(`${locationName} · ${sideQuestTitle}`, "委托完成，点击返回地图", displayStory);
          const confirm = document.getElementById("eventConfirmBtn");
          if (confirm) {
            confirm.disabled = false;
            confirm.textContent = "返回地图";
          }
          processSandboxQuestFromReply(source, true);
          sendAiReplyAck(requestId, true, false);
          return;
        }
        if (!isMapReturn) {
          const locationId = state.pendingActionContext?.actionContext?.locationId;
          if (locationId === "outstage" && globalThis.HatsuTasks?.markOutstageFullSong(state)) {
            saveState();
            notifyQuestCompletions(["temari_main_01"]);
          }
          processSandboxMainQuestMapChoice(locationId, state.selectedChoiceText || "");
          processSandboxQuestFromReply(source, true);
          sendAiReplyAck(requestId, true, false);
          return;
        }
        pendingAiRequestId = "";
        state.eventMode = "none";
        state.choiceStep = 0;
        state.pendingOptionTexts = [];
        state.selectedChoiceText = "";
        state.selectedChoiceRating = "";
        state.lastStory = `${state.lastStory}\n\n${chosenLine}\n\n${reply}`;
        saveState();
        const returnLabel = getMapExploreReturnLabel(state.pendingActionContext?.actionContext || {});
        openEventOverlay(`${locationName} · 离开`, `离开完成，点击${returnLabel}`, displayStory);
        const confirm = document.getElementById("eventConfirmBtn");
        if (confirm) {
          confirm.disabled = false;
          confirm.textContent = returnLabel;
        }
        sendAiReplyAck(requestId, true, false);
        return;
      }
      state.eventMode = "none";
      state.choiceStep = 0;
      state.pendingOptionTexts = [];
      state.selectedChoiceText = "";
      state.selectedChoiceRating = "";
      saveState();
      render();

      const actionName = currentChoiceActionTitle();
      openEventOverlay(actionName, "已收到 SillyTavern 角色回复", displayStory);
      processSandboxQuestFromReply(source, true);
      sendAiReplyAck(requestId, true, false);
      return;
    }

    // ==========================================
    // 普通非选项行动（上课、训练、休息、羁绊剧情）
    // ==========================================
    const reply = extractReplyText(replyCandidates);

    if (reply) {
      const storyEl = document.getElementById("eventStory");
      if (storyEl) {
        const isAtBottom = storyEl.scrollHeight - storyEl.clientHeight - storyEl.scrollTop < 40;
        storyEl.innerHTML = formatStoryText(reply);
        if (isAtBottom) {
          storyEl.scrollTop = storyEl.scrollHeight;
        }
      }
    }

    if (!isFinal) {
      setEventActionsEnabled(false, true);
      sendAiReplyAck(requestId, true, false, false);
      return;
    }

    if (!reply || reply.replace(/\s+/g, "").length < 12 || isJunkReply(reply)) {
      if (returnHarnessRecoveryAttemptToPending(requestId, "invalid_reply")) {
        aiReplyRetryCount = 0;
        pendingAiRequestId = "";
        state.pendingAiRequestId = "";
        saveState("harness.recovery_invalid_reply");
        render();
        openHarnessRecoveryOverlay(state.harness.activeTurn);
        showToast("叙事生成未完成", "没有收到有效正文，恢复记录已保留，可以再次尝试。", "warn");
        sendAiReplyAck(requestId, false, false);
        return;
      }
      if (aiReplyRetryCount < 2) {
        aiReplyRetryCount++;
        sendAiReplyAck(requestId, false, true);
        return;
      }
      aiReplyRetryCount = 0;
      pendingAiRequestId = "";
      state.eventMode = "none";
      state.choiceStep = 0;
      state.pendingOptionTexts = [];
      state.selectedChoiceText = "";
      state.selectedChoiceRating = "";
      const errorText = "生成剧情失败，未获取到酒馆角色的有效回复。请点击右侧“编辑提示词重发”重试。";
      state.lastStory = errorText;
      if (state.activeStoryNode) state.activeStoryNode.ready = true;
      markHarnessProduceTurn("failed", {}, requestId);
      saveState();
      render();
      const node = state.activeStoryNode;
      const title = node?.type === "affinity"
        ? `好感度 ${node.threshold}：${affinityNodes[node.threshold]?.title || "羁绊事件"}`
        : node?.type === "firstLivePre"
          ? "First Live 登台前准备"
          : node?.type === "firstLivePost"
            ? "First Live 演后记"
            : node?.type === "freechat"
              ? "担当闲聊"
              : node?.type === "interaction"
                ? "偶像互动"
                : node?.type === "gift"
                  ? `赠送礼物 · ${node.recipientName || "对象"}`
                  : (state.log[0]?.action || "AI 后续剧情");
      openEventOverlay(title, "生成失败，未收到有效回复", errorText);
      sendAiReplyAck(requestId, false, false);
      return;
    }
    aiReplyRetryCount = 0;
    pendingAiRequestId = "";
    state.eventMode = "none";
    state.choiceStep = 0;
    state.pendingOptionTexts = [];
    state.selectedChoiceText = "";
    state.selectedChoiceRating = "";
    state.lastStory = reply;
    if (state.activeStoryNode) state.activeStoryNode.ready = true;
    if (state.log[0]) {
      state.log[0].aiReply = reply;
    }
    markHarnessProduceTurn("completed", {}, requestId);
    saveState();
    render();
    const node = state.activeStoryNode;
    const title = node?.type === "affinity"
      ? `好感度 ${node.threshold}：${affinityNodes[node.threshold]?.title || "羁绊事件"}`
      : node?.type === "firstLivePre"
        ? "First Live 登台前准备"
        : node?.type === "firstLivePost"
          ? "First Live 演后记"
          : node?.type === "freechat"
            ? "担当闲聊"
            : node?.type === "interaction"
              ? "偶像互动"
              : node?.type === "gift"
                ? `赠送礼物 · ${node.recipientName || "对象"}`
                : (state.log[0]?.action || "AI 后续剧情");
    if (node?.type === "firstLivePost" && isLiveTheaterActive()) {
      deferredLivePostReply = { title, result: "已收到 SillyTavern 角色回复", story: reply };
      processSandboxQuestFromReply(source, true);
      sendAiReplyAck(requestId, true, false);
      return;
    }
    openEventOverlay(title, "已收到 SillyTavern 角色回复", reply);
    processSandboxQuestFromReply(source, true);
    sendAiReplyAck(requestId, true, false);
  }

  function isCurrentStorytellerEventReply(requestId) {
    const turn = state.harness?.activeTurn;
    return Boolean(
      turn
      && turn.kind === "storyteller_event"
      && turn.status === "generating"
      && turn.requestId === requestId
      && turn.sessionEpoch === runtimeSessionEpoch
      && isHarnessTurnInActiveScope(turn, getHarnessRecoveryContext())
      && isPrimaryModelLeaseCurrent(requestId, activeInboundPrimaryChannelLeaseId)
    );
  }

  function commitStorytellerEventReply(requestId, reply, rawText, renderedText, text, messageId) {
    const candidateSettlement = settleStorytellerEventForReply(requestId, true, false, true);
    if (!candidateSettlement.resolved) {
      sendAiReplyAck(requestId, false, false);
      return false;
    }
    const observationResult = recordAcceptedFinalStorytellerObservation(requestId, candidateSettlement);
    preparePendingDirectorDigestCandidate(true, requestId, rawText, renderedText, text, messageId);
    requestChronicleUpdate(rawText, renderedText, text, messageId);
    pendingAiRequestId = "";
    state.pendingAiRequestId = "";
    state.lastStory = reply;
    saveState(observationResult.recorded ? "storyteller.event_resolved_observed" : "storyteller.event_resolved");
    render();
    renderPhoneHome();
    renderWorldEnginePhoneApp();
    openEventOverlay("初星世界事件", "事件叙事已完成", reply);
    sendAiReplyAck(requestId, true, false, true, { preSettled: true });
    return true;
  }

  function sendAiReplyAck(requestId, accepted, retry, isFinal = true, options) {
    options = options && typeof options === "object" ? options : {};
    settlePendingDirectorDigestCandidate(requestId, accepted, retry, isFinal);
    const candidateSettlement = options.preSettled
      ? { resolved: false, reason: "pre_settled" }
      : settleStorytellerCandidateForReply(requestId, accepted, retry, isFinal);
    if (isFinal && !retry) {
      releasePrimaryModelChannel(requestId, activeInboundPrimaryChannelLeaseId, accepted ? "accepted_final" : "rejected_final");
    }
    recordAiAckDebug(requestId, accepted, retry, isFinal);
    let observationRecorded = false;
    if (accepted && isFinal && !retry && !options.preSettled) {
      const observationResult = recordAcceptedFinalStorytellerObservation(requestId, candidateSettlement);
      observationRecorded = Boolean(observationResult.recorded);
    }
    if (candidateSettlement.resolved) {
      saveState("storyteller.candidate_resolved");
    } else if (observationRecorded) {
      saveState("storyteller.observation");
    }
    const completedTurn = state.harness?.activeTurn;
    if (
      accepted
      && isFinal
      && !retry
      && completedTurn?.kind === "map_explore"
      && completedTurn.status === "completed"
    ) {
      scanStorytellerNotificationAtCheckpoint("map_complete", { locationId: completedTurn.locationId });
    }
    if (!isSillyTavernHost() || !requestId) return;
    window.parent.postMessage({
      source: "hatsuboshi-produce",
      type: "aiReplyAck",
      requestId,
      accepted,
      retry,
      isFinal
    }, "*");
  }

  function shouldAcceptAiReply(requestId, currentRequestId) {
    if (!requestId) return false;
    const activeRequestId = currentRequestId || state.pendingAiRequestId;
    if (!activeRequestId) return false;
    return requestId === activeRequestId;
  }

  function shouldRequestChronicleUpdate(acceptedRequest, isFinal) {
    return Boolean(acceptedRequest && isFinal);
  }

  function showToast(title, message, tone = "info") {
    const stack = document.getElementById("toastStack");
    const toast = document.createElement("article");
    toast.className = `toast toast-${tone}`;
    toast.innerHTML = `<strong>${title}</strong><p>${message}</p>`;
    stack.appendChild(toast);
    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-8px) scale(0.98)";
      window.setTimeout(() => toast.remove(), 220);
    }, 3200);
  }

  const modalRegistry = {
    world: {
      kicker: "Worldbook",
      title: "世界书结构",
      tabs: {
        "当前模块": [
          ["育成结算", "保存日程、轮次、基础数值、SP 候选与随机互动结果。LLM 不重新计算，只解释这些结果。"],
          ["角色主线", "每名偶像拥有核心矛盾与行动叙事规则，让同一个按钮在不同担当身上产生不同味道。"],
          ["互动事件池", "上课与训练有概率触发角色库互动，先抽角色、场景、方向和奖励，再生成叙事。"]
        ],
        "角色库": interactionCharacters.map((name) => [name, name === state.idol ? "当前担当，随机事件会避开自身。" : "可作为训练或上课时的互动对象。"]),
        "提示结构": [
          ["前端结算头", "明确行动已经由前端结算，防止模型擅自改数值。"],
          ["角色核心", "把偶像主线矛盾注入每次短叙事。"],
          ["随机事件段", "仅在触发时追加，要求互动服务于本次行动结果。"]
        ]
      }
    },
    system: {
      kicker: "Produce Engine",
      title: "系统控制台",
      tabs: {
        "模型路由": [
          ["主叙事模型", "负责短叙事、好感度阶段剧情、First Live 候场与考核文本。"],
          ["前端裁定", "负责行动合法性、数值变化、随机事件与存档，不把裁定权交给模型。"],
          ["复制出口", "P 手账中的提示词可直接送入酒馆或其他 LLM 对话。"]
        ],
        "存档": [
          ["本地存储", `存档键：${activeStorageKey}`],
          ["版本", `UI Version ${UI_VERSION}，结构变化时会重建档案。`],
          ["当前担当", state.idol || "未选择"]
        ],
        "规则": [
          ["日程", "22 天育成，每天 3 次普通行动、1 次额外行动与 1 次总结轮次；20/40/60/80 羁绊事件会占用专属剧情日。"],
          ["普通行动", "上课、训练、休息。休息回复 30 体力。"],
          ["额外行动", "外出回复较多体力并增加信赖，交流增加更多信赖并回复少量体力；信赖 60 后可选择普通亲密，信赖 100 后解锁 NSFW 亲密。"],
          ["总结轮次", "完成四轮行动后进入。可查看今日总结，或通过左下角手机入口打开小手机，或进入下一天。"]
        ],
        "育成选项": [],
        "制作人设定": [],
        "音频设置": [],
        "开发测试": []
      }
    },
    schedule: {
      kicker: "Calendar",
      title: "日程详情",
      tabs: {
        "日程": [
          ["第 1-6 天", "First Live 前期，建立基础数值与担当关系。"],
          ["第 7-12 天", "First Live 中期，随机互动与信赖剧情开始成为主要变量。"],
          ["第 13-21 天", "First Live 后期，数值门槛与角色矛盾共同推向考核。"],
          ["第 22 天", "最终日程固定为 First Live，不再进行普通行动。"]
        ],
        "轮次": [
          ["普通轮次", "每天第 1、2、3 轮，只显示上课、训练和休息。"],
          ["额外轮次", "每天第 4 轮，显示外出、交流与亲密；亲密需信赖 60，进入后可选择普通或 NSFW 模式。"],
          ["总结轮次", "每天第 5 轮，提供今日总结与进入下一天；小手机从左下角入口随时打开。"],
          ["防误操作", "体力危险时仍可选择休息，避免路线被单次失误锁死。"]
        ],
        "考核": [
          ["First Live", "第 22 天点击开始最终演出，由前端判定三项数值是否达标。"],
          ["好感度80", "好感度达到 80 后，于第 21 天（First Live 前夜）进入该偶像的路线后半羁绊事件。"],
          ["好感度100", "First Live 成功且好感度达到 100 后解锁最终剧情。"],
          ["数值门槛", "Vo、Da、Vi 的门槛与上限来自角色成长率预设。"]
        ]
      }
    },
    narrative: {
      kicker: "Narrative Control",
      title: "叙事控制",
      tabs: {
        "叙事规则": [
          ["结算优先", "短叙事必须承认前端结果，不允许重算数值或追加未列出奖励。"],
          ["角色差异", "同样的上课或训练，要根据担当偶像的核心矛盾改变表达方式。"],
          ["制作人位置", "制作人提供观察、判断和支持，不替角色解决所有矛盾。"]
        ],
        "输出标签": [
          ["短叙事", "默认 400 字以内，适合直接插入酒馆对话。"],
          ["好感剧情", "0 为强制开场，20/40/60/80/100 由羁绊事件按钮主动触发。"],
          ["考核剧情", "第 22 天由最终状态进入 First Live 数值判定。"]
        ],
        "边界": [
          ["禁止改数值", "模型不得改变当前状态、行动结果或随机奖励。"],
          ["禁止跑题", "互动角色必须服务于本次行动，不写成独立支线。"],
          ["禁止模板化", "每次叙事要结合担当性格、阶段和行动结果。"]
        ]
      }
    },
    event: {
      kicker: "Random Event Pool",
      title: "随机事件池",
      tabs: {
        "触发率": [
          ["上课", `${lessonEventChance}% 概率触发随机互动。`],
          ["训练", `${trainingEventChance}% 概率触发随机互动。`],
          ["SP训练", "训练按钮仍会按本轮 SP 候选获得倍率加成，随机互动独立抽取。"]
        ],
        "奖励": [
          ["属性奖励", "随机追加 Vo、Da、Vi 之一 +10。"],
          ["信赖奖励", "随机追加信赖 +1 到 +5。"],
          ["叙事解释", "奖励先由前端确定，再要求 LLM 用角色关系解释结果。"]
        ],
        "场景池": [
          ...Object.entries(actionEventPools).flatMap(([action, attributes]) =>
            Object.entries(attributes).map(([attribute, scenes]) => [
              `${action === "lesson" ? "上课" : "训练"} · ${attribute}`,
              scenes.join("、")
            ])
          ),
          ["小舞台试演", "仅在第13天后训练或本轮SP训练时加入候选池。"]
        ]
      }
    }
  };

  function openModal(type) {
    activeModal = modalRegistry[type] ? type : "system";
    activeModalTab = Object.keys(modalRegistry[activeModal].tabs)[0];
    renderModal();
    setElementHidden("appModal", false);
    document.getElementById("closeModal").focus();
  }

  function closeModal() {
    setElementHidden("appModal", true);
    activeModal = null;
    activeModalTab = null;
  }

  function renderModal() {
    const modal = modalRegistry[activeModal];
    document.getElementById("modalKicker").textContent = modal.kicker;
    document.getElementById("modalTitle").textContent = modal.title;
    const tabs = document.getElementById("modalTabs");
    tabs.innerHTML = "";
    Object.keys(modal.tabs).forEach((tab, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.id = `modal-tab-${activeModal}-${index + 1}`;
      button.className = `modal-tab${tab === activeModalTab ? " active" : ""}`;
      button.textContent = tab;
      button.addEventListener("click", () => {
        activeModalTab = tab;
        renderModal();
      });
      tabs.appendChild(button);
    });
    const body = document.getElementById("modalBody");
    body.innerHTML = "";

    if (activeModal === "system" && activeModalTab === "育成选项") {
      const optionsPanel = document.createElement("div");
      optionsPanel.className = "dev-panel-content";
      optionsPanel.style.display = "flex";
      optionsPanel.style.flexDirection = "column";
      optionsPanel.style.gap = "14px";
      optionsPanel.style.padding = "10px";
      optionsPanel.style.width = "100%";
      const skipLessonTrainingEnabled = isSkipLessonTrainingAiStoryEnabled();
      optionsPanel.innerHTML = `
        <style>
          .produce-option-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 10px 0; border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
          .produce-option-row:last-child { border-bottom: none; }
          .produce-option-label { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; }
          .produce-option-title { font-weight: bold; font-size: 15px; color: var(--ink); }
          .produce-option-desc { font-size: 12px; color: var(--soft-ink); line-height: 1.5; }
          .produce-option-toggle { padding: 8px 16px; font-size: 13px; font-weight: bold; border-radius: 8px; border: 2px solid rgba(0,0,0,0.1); background: #fff; color: var(--ink); cursor: pointer; transition: all 0.2s; white-space: nowrap; }
          .produce-option-toggle.active { background: var(--pink); color: #fff; border-color: var(--pink); }
        </style>
        <div class="produce-option-row">
          <div class="produce-option-label">
            <span class="produce-option-title">上课与训练跳过 AI 叙事</span>
            <span class="produce-option-desc">开启后，上课与训练仍会正常结算数值并推进轮次，但不再打开事件界面，也不会向 SillyTavern 发送叙事提示词。</span>
          </div>
          <button id="skipLessonTrainingAiToggleBtn" type="button" class="produce-option-toggle ${skipLessonTrainingEnabled ? "active" : ""}">${skipLessonTrainingEnabled ? "已开启" : "已关闭"}</button>
        </div>
      `;
      body.appendChild(optionsPanel);
      document.getElementById("skipLessonTrainingAiToggleBtn")?.addEventListener("click", () => {
        state.produceOptions.skipLessonTrainingAiStory = !isSkipLessonTrainingAiStoryEnabled();
        saveState();
        showToast(
          state.produceOptions.skipLessonTrainingAiStory ? "已开启" : "已关闭",
          state.produceOptions.skipLessonTrainingAiStory
            ? "上课与训练将直接结算并进入下一轮，不再等待 AI 叙事。"
            : "上课与训练恢复为正常 AI 叙事流程。",
          "info"
        );
        renderModal();
      });
      return;
    }

    if (activeModal === "system" && activeModalTab === "制作人设定") {
      const prodPanel = document.createElement("div");
      prodPanel.className = "dev-panel-content";
      prodPanel.style.display = "flex";
      prodPanel.style.flexDirection = "column";
      prodPanel.style.gap = "14px";
      prodPanel.style.padding = "10px";
      prodPanel.style.width = "100%";
      prodPanel.innerHTML = `
        <style>
          .prod-setting-row { display: grid; gap: 6px; margin-bottom: 8px; }
          .prod-setting-row label { font-weight: bold; font-size: 14px; color: var(--ink); }
          .prod-setting-row input, .prod-setting-row textarea {
            width: 100%; border: 2px solid rgba(111, 102, 128, 0.14); border-radius: 10px;
            padding: 8px 12px; color: var(--ink); background: rgba(255, 255, 255, 0.85); font: 700 13px var(--font-ui); outline: none; transition: all 0.2s ease;
          }
          .prod-setting-row input:focus, .prod-setting-row textarea:focus { border-color: var(--idol-theme); background: #fff; }
          .prod-save-btn { margin-top: 8px; width: 100%; padding: 10px; font-weight: bold; border-radius: 10px; border: none; background: var(--idol-theme); color: #fff; cursor: pointer; }
        </style>
        <div class="prod-setting-row">
          <label for="modalProdName">制作人称呼</label>
          <input type="text" id="modalProdName" value="${state.producer?.name || '{{user}}'}">
        </div>
        <div class="prod-setting-row">
          <label for="modalProdGender">制作人性别</label>
          <input type="text" id="modalProdGender" value="${state.producer?.gender || ''}">
        </div>
        <div class="prod-setting-row">
          <label for="modalProdPersonality">性格特征</label>
          <textarea id="modalProdPersonality" rows="2">${state.producer?.personality || ''}</textarea>
        </div>
        <div class="prod-setting-row">
          <label for="modalProdStyle">说话风格</label>
          <input type="text" id="modalProdStyle" value="${state.producer?.style || ''}">
        </div>
        <div class="prod-setting-row">
          <label for="modalProdSettings">额外设定</label>
          <textarea id="modalProdSettings" rows="2">${state.producer?.settings || ''}</textarea>
        </div>
        <button id="modalProdSaveBtn" class="prod-save-btn">保存修改</button>
      `;
      body.appendChild(prodPanel);

      document.getElementById("modalProdSaveBtn").addEventListener("click", () => {
        state.producer = {
          name: document.getElementById("modalProdName").value.trim() || "{{user}}",
          gender: document.getElementById("modalProdGender").value.trim(),
          personality: document.getElementById("modalProdPersonality").value.trim(),
          style: document.getElementById("modalProdStyle").value.trim(),
          settings: document.getElementById("modalProdSettings").value.trim()
        };
        saveState();
        showToast("设置已保存", "制作人信息修改成功，将在下一次行动起生效。", "info");
      });
      return;
    }

    if (activeModal === "system" && activeModalTab === "音频设置") {
      const audioPanel = document.createElement("div");
      audioPanel.className = "dev-panel-content";
      audioPanel.style.display = "flex";
      audioPanel.style.flexDirection = "column";
      audioPanel.style.gap = "14px";
      audioPanel.style.padding = "10px";
      audioPanel.style.width = "100%";
      audioPanel.innerHTML = `
        <style>
          .audio-setting-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 10px 0; border-bottom: 1px solid rgba(0, 0, 0, 0.05); }
          .audio-setting-row:last-child { border-bottom: none; }
          .audio-label { display: flex; flex-direction: column; gap: 4px; }
          .audio-title { font-weight: bold; font-size: 15px; color: var(--ink); }
          .audio-desc { font-size: 12px; color: var(--soft-ink); }
          .audio-control { display: flex; align-items: center; gap: 12px; }
          .audio-slider { width: 120px; cursor: pointer; accent-color: var(--pink); }
          .audio-toggle-btn { padding: 8px 16px; font-size: 13px; font-weight: bold; border-radius: 8px; border: 2px solid rgba(0,0,0,0.1); background: #fff; color: var(--ink); cursor: pointer; transition: all 0.2s; }
          .audio-toggle-btn.active { background: var(--pink); color: #fff; border-color: var(--pink); }
        </style>
        <div class="audio-setting-row">
          <div class="audio-label"><span class="audio-title">背景音乐 (BGM)</span><span class="audio-desc">开启或关闭育成的背景音乐</span></div>
          <div class="audio-control"><button id="bgmMuteBtn" class="audio-toggle-btn ${bgmManager.muted ? "" : "active"}">${bgmManager.muted ? "已静音" : "播放中"}</button></div>
        </div>
        <div class="audio-setting-row">
          <div class="audio-label"><span class="audio-title">BGM 音量</span><span class="audio-desc">调整背景音乐的播放音量</span></div>
          <div class="audio-control">
            <input id="bgmVolumeSlider" type="range" class="audio-slider" min="0" max="1" step="0.05" value="${bgmManager.volume}">
            <span id="bgmVolumeLabel" style="font-weight:bold; font-size:14px; width:30px; text-align:right;">${Math.round(bgmManager.volume * 100)}%</span>
          </div>
        </div>
      `;
      body.appendChild(audioPanel);
      const muteBtn = document.getElementById("bgmMuteBtn");
      if (muteBtn) {
        muteBtn.addEventListener("click", () => {
          const newMuted = !bgmManager.muted;
          bgmManager.setMuted(newMuted);
          muteBtn.textContent = newMuted ? "已静音" : "播放中";
          muteBtn.classList.toggle("active", !newMuted);
        });
      }
      const slider = document.getElementById("bgmVolumeSlider");
      const volLabel = document.getElementById("bgmVolumeLabel");
      if (slider) {
        slider.addEventListener("input", (e) => {
          const vol = parseFloat(e.target.value);
          bgmManager.setVolume(vol);
          if (volLabel) volLabel.textContent = `${Math.round(vol * 100)}%`;
        });
      }
      return;
    }

    if (activeModal === "system" && activeModalTab === "开发测试") {
      const devPanel = document.createElement("div");
      devPanel.className = "dev-panel-content";
      devPanel.style.display = "flex";
      devPanel.style.flexDirection = "column";
      devPanel.style.gap = "14px";
      devPanel.style.padding = "10px";
      devPanel.style.width = "100%";
      const directorDebug = getWorldDirectorState();
      const directorJob = directorDebug?.activeJob;
      const directorReceipt = directorDebug?.receipts?.at?.(-1) || null;
      const directorBusy = Boolean(getPrimaryModelChannelOwner() || getSecondaryModelChannelOwner());
      
      devPanel.innerHTML = `
        <style>
          .dev-form-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          }
          .dev-form-row label {
            font-weight: bold;
            font-size: 13px;
            color: var(--ink);
            width: 70px;
          }
          .dev-form-row input[type="number"] {
            flex: 1;
            padding: 6px 10px;
            border: 2px solid rgba(0,0,0,0.1);
            border-radius: 8px;
            font-family: inherit;
            background: #fff;
            color: var(--ink);
            text-align: center;
            font-weight: bold;
          }
          .dev-btn-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 10px;
          }
          .dev-action-btn {
            background: linear-gradient(135deg, var(--pink), var(--violet));
            color: white;
            border: none;
            border-radius: 8px;
            padding: 10px;
            font-weight: bold;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          .dev-action-btn:hover {
            opacity: 0.9;
          }
          .dev-action-btn.secondary {
            background: #6c757d;
          }
        </style>
        <div class="dev-form-row">
          <label>育成天数</label>
          <input type="number" id="devInputDay" min="1" max="${FINAL_LIVE_DAY}" value="${state.day}">
          <label>日程轮次</label>
          <input type="number" id="devInputRound" min="1" max="${SUMMARY_ROUND}" value="${state.round}">
        </div>
        <div class="dev-form-row">
          <label>Vocal</label>
          <input type="number" id="devInputVo" min="0" max="3000" value="${state.Vo}">
          <label>Dance</label>
          <input type="number" id="devInputDa" min="0" max="3000" value="${state.Da}">
        </div>
        <div class="dev-form-row">
          <label>Visual</label>
          <input type="number" id="devInputVi" min="0" max="3000" value="${state.Vi}">
          <label>信赖度</label>
          <input type="number" id="devInputTrust" min="0" max="1000" value="${state.trust}">
        </div>
        <div class="dev-form-row">
          <label>当前体力</label>
          <input type="number" id="devInputStamina" min="0" max="100" value="${state.stamina}">
          <label>当前压力</label>
          <input type="number" id="devInputStress" min="0" max="100" value="${state.stress}">
        </div>
        <div class="dev-btn-group">
          <button type="button" id="devApplyBtn" class="dev-action-btn">保存并应用数值</button>
          <button type="button" id="devLiveReadyBtn" class="dev-action-btn secondary">${state.liveReady ? "取消 Live 准备就绪" : "直接准备好 First Live"}</button>
        </div>
        <div class="dev-btn-group" style="margin-top: 0;">
          <button type="button" id="devResetLiveStateBtn" class="dev-action-btn secondary">重置 First Live 状态</button>
          <button type="button" id="devInstantLiveBtn" class="dev-action-btn">直接启动最终演出</button>
        </div>
        <div style="padding: 10px; border: 1px solid rgba(0,0,0,0.12); border-radius: 8px; font-size: 12px; line-height: 1.7;">
          <strong>世界导演</strong><br>
          启用：${directorDebug?.enabled ? "是" : "否"} · dirty：${directorDebug?.dirty ? "是" : "否"} · 状态：${directorJob?.status || "idle"}<br>
          Director revision：${directorDebug?.directorRevision || 0} · Chronicle revision：${directorDebug?.chronicleRevision || 0}<br>
          Pressure：${directorDebug?.pressures?.length || 0} · 最近结果：${directorReceipt?.reason || directorReceipt?.status || "无"}
        </div>
        <div class="dev-btn-group" style="margin-top: 0;">
          <button type="button" id="devWorldDirectorRecalculateBtn" class="dev-action-btn" ${directorBusy ? "disabled" : ""}>手工重算今日叙事方向</button>
          <button type="button" id="devOpenMapLayoutEditorBtn" class="dev-action-btn secondary">打开学园地图布局编辑</button>
        </div>
      `;
      
      body.appendChild(devPanel);
      
      document.getElementById("devApplyBtn").addEventListener("click", () => {
        state.day = clamp(parseInt(document.getElementById("devInputDay").value) || 1, 1, FINAL_LIVE_DAY);
        state.round = clamp(parseInt(document.getElementById("devInputRound").value) || 1, 1, SUMMARY_ROUND);
        state.Vo = Math.max(0, parseInt(document.getElementById("devInputVo").value) || 0);
        state.Da = Math.max(0, parseInt(document.getElementById("devInputDa").value) || 0);
        state.Vi = Math.max(0, parseInt(document.getElementById("devInputVi").value) || 0);
        state.trust = Math.max(0, parseInt(document.getElementById("devInputTrust").value) || 0);
        state.stamina = clamp(parseInt(document.getElementById("devInputStamina").value) || 100, 0, 100);
        state.stress = clamp(parseInt(document.getElementById("devInputStress").value) || 0, 0, 100);
        
        saveState();
        render();
        showToast("数值已应用", "开发数值已成功更新至本地状态。", "success");
        closeModal();
      });

      document.getElementById("devLiveReadyBtn").addEventListener("click", () => {
        state.liveReady = !state.liveReady;
        saveState();
        render();
        showToast("Live 状态已更改", `liveReady = ${state.liveReady}`, "info");
        closeModal();
      });

      document.getElementById("devResetLiveStateBtn").addEventListener("click", () => {
        state.firstLive = { completed: false, success: false, result: null };
        saveState();
        render();
        showToast("已重置 First Live", "First Live 状态已重置为未完成。", "info");
        closeModal();
      });

      document.getElementById("devInstantLiveBtn").addEventListener("click", () => {
        closeModal();
        state.liveReady = true;
        saveState();
        render();
        startFirstLive();
      });

      document.getElementById("devWorldDirectorRecalculateBtn").addEventListener("click", () => {
        requestManualWorldDirectorRecalculation();
        renderModalContent();
      });

      document.getElementById("devOpenMapLayoutEditorBtn").addEventListener("click", () => {
        closeModal();
        openWorldMapLayoutEditor();
      });
      return;
    }

    const grid = document.createElement("div");
    grid.className = "modal-grid";
    modal.tabs[activeModalTab].forEach(([title, text], index) => {
      const card = document.createElement("article");
      card.className = "modal-card";
      card.id = `modal-card-${activeModal}-${index + 1}`;
      card.innerHTML = `<strong>${title}</strong><p>${text}</p>`;
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  document.getElementById("actionButtons").addEventListener("click", (event) => {
    const button = event.target.closest(".action-button");
    if (!button || button.disabled) return;
    if (button.dataset.action === "freechat") {
      openFreeChatOverlay();
      return;
    }
    if (button.dataset.action === "interaction") {
      openInteractionOverlay();
      return;
    }
    if (button.dataset.action === "day_summary") {
      openDaySummaryOverlay();
      return;
    }
    if (button.dataset.action === "next_day") {
      enterNextDay();
      return;
    }
    if (button.dataset.action === "outing") {
      openOutingOverlay();
      return;
    }
    if (button.dataset.action === "companion") {
      openCompanionOverlay();
      return;
    }
    if (button.dataset.action === "intimacy") {
      openIntimacyOverlay();
      return;
    }
    if (button.dataset.action === "world_map") {
      enterFreeMode();
      return;
    }
    if (button.dataset.action === "campus_map_return") {
      exitHybridFacility();
      saveState();
      render();
      return;
    }
    if (button.dataset.action === "sandbox_first_live") {
      confirmSandboxFirstLiveAttempt();
      return;
    }
    if (button.dataset.action === "bond") {
      const threshold = pendingAffinityActionThreshold();
      if (threshold) triggerAffinityStory(threshold);
      return;
    }
    settleAction(button.dataset.action, button.dataset.attribute);
  });

  // Handle click on "开始育成" (Confirm Idol Selection)
  document.getElementById("confirmIdolBtn").addEventListener("click", () => {
    if (!selectedIdol) return;
    triggerWipeTransition(() => {
      openProducerSetupPanel();
    });
  });

  // Handle click on "返回选择" inside producer form
  document.getElementById("producerBackBtn").addEventListener("click", () => {
    if (!selectedIdol) return;
    triggerWipeTransition(() => {
      restoreIdolSelectionPanel();
    });
  });

  // Helper for quick tag clicks inside producer form
  const registerQuickTagBehavior = (containerId, inputId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.addEventListener("click", (e) => {
      const btn = e.target.closest(".quick-tag-btn");
      if (!btn) return;
      const val = btn.dataset.val;
      const input = document.getElementById(inputId);
      if (input) {
        const current = input.value.trim();
        if (current) {
          if (!current.includes(val)) {
            input.value = `${current}、${val}`;
          }
        } else {
          input.value = val;
        }
      }
    });
  };
  registerQuickTagBehavior("prodPersonalityTags", "prodPersonalityInput");
  registerQuickTagBehavior("prodStyleTags", "prodStyleInput");

  // Handle click on "签署合约，开启星途"
  document.getElementById("producerStartBtn").addEventListener("click", () => {
    if (!selectedIdol) return;

    const name = document.getElementById("prodNameInput").value.trim() || "{{user}}";
    const gender = document.getElementById("prodGenderInput").value.trim();
    const personality = document.getElementById("prodPersonalityInput").value.trim();
    const style = document.getElementById("prodStyleInput").value.trim();
    const settings = document.getElementById("prodSettingsInput").value.trim();
    state.producer = { name, gender, personality, style, settings };

    triggerWipeTransition(() => {
      const selectPanel = document.getElementById("selectPanel");
      const producerPanel = document.getElementById("producerPanel");
      if (selectPanel) selectPanel.classList.remove("is-hidden");
      if (producerPanel) producerPanel.classList.add("is-hidden");

          if (isSandboxLaunch()) {
            state.sandbox = { ...(state.sandbox || {}), apiSetupPending: true, pendingIdol: selectedIdol };
            saveState("sandbox.api_setup_pending");
            openSandboxApiSetupPanel(selectedIdol);
            showToast("档案已保存", "请设置沙盒世界使用的次 API，或暂不填写。", "gold");
            return;
          }

      state.launchMode = "produce";
      applyIdolPreset(selectedIdol, true);
      startOpeningStory("签署合约");
      saveState();
      showToast("合约签署完成", `制作人与 ${selectedIdol} 的专属育成正式开启！`, "gold");
      });
    });

  document.getElementById("sandboxApiTestBtn")?.addEventListener("click", testSandboxApiConnection);
  document.getElementById("sandboxApiSkipBtn")?.addEventListener("click", skipSandboxApiSetup);
  document.getElementById("sandboxApiContinueBtn")?.addEventListener("click", continueSandboxApiSetup);

  document.querySelectorAll("[data-modal]").forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.modal));
  });

  document.querySelectorAll("[data-panel]").forEach((button) => {
    button.addEventListener("click", () => openNotebook(button.dataset.panel || "prompt"));
  });

  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => switchPromptTab(button.dataset.tab));
  });

  document.getElementById("closeModal").addEventListener("click", closeModal);
  document.getElementById("appModal").addEventListener("click", (event) => {
    if (event.target.id === "appModal") closeModal();
  });
  document.getElementById("closeNotebook").addEventListener("click", closeNotebook);
  document.getElementById("notebookDrawer").addEventListener("click", (event) => {
    if (event.target.id === "notebookDrawer") closeNotebook();
  });
  document.getElementById("eventConfirmBtn").addEventListener("click", closeEventOverlay);
  document.getElementById("eventRegenBtn").addEventListener("click", triggerRegeneration);
  document.getElementById("eventAiBtn").addEventListener("click", () => {
    setElementHidden("eventOverlay", true);
    openAiPromptOverlay();
  });
  document.getElementById("eventOverlay").addEventListener("click", (event) => {
    if (event.target.id === "eventOverlay") closeEventOverlay();
  });
  document.getElementById("harnessRecoveryCloseBtn")?.addEventListener("click", closeHarnessRecoveryOverlay);
  document.getElementById("harnessRecoveryDismissBtn")?.addEventListener("click", closeHarnessRecoveryOverlay);
  document.getElementById("harnessRecoveryRetryBtn")?.addEventListener("click", retryHarnessNarrativeRecovery);
  document.getElementById("harnessRecoveryAbandonBtn")?.addEventListener("click", abandonHarnessNarrativeRecovery);
  document.getElementById("harnessRecoveryOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "harnessRecoveryOverlay") closeHarnessRecoveryOverlay();
  });
  document.getElementById("storytellerMajorConfirmationCloseBtn")?.addEventListener("click", closeStorytellerMajorConfirmation);
  document.getElementById("storytellerMajorConfirmationCancelBtn")?.addEventListener("click", closeStorytellerMajorConfirmation);
  document.getElementById("storytellerMajorConfirmationConfirmBtn")?.addEventListener("click", confirmStorytellerMajorAction);
  document.getElementById("storytellerMajorConfirmationOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "storytellerMajorConfirmationOverlay") closeStorytellerMajorConfirmation();
  });

  // Galgame 播放器控制按钮事件绑定
  document.getElementById("vnBtnSkip").addEventListener("click", skipAllVnDialogue);
  document.getElementById("vnBtnLog").addEventListener("click", openVnLogView);
  document.getElementById("vnChronicleLoadBtn")?.addEventListener("click", openChronicleLoadOverlay);
  document.getElementById("chronicleLoadCloseBtn")?.addEventListener("click", closeChronicleLoadOverlay);
  document.getElementById("chronicleLoadOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "chronicleLoadOverlay") closeChronicleLoadOverlay();
  });
  document.getElementById("vnBtnDebug").addEventListener("click", openVnDebugView);
  document.getElementById("vnBtnAuto").addEventListener("click", toggleVnAuto);
  document.getElementById("vnBtnRegen").addEventListener("click", () => {
    stopVnAuto();
    triggerRegeneration();
  });
  document.getElementById("vnBtnEdit").addEventListener("click", triggerVnEditPrompt);
  document.getElementById("closeClassicPanelBtn").addEventListener("click", closeVnLogView);
  document.getElementById("vnLogCloseBtn").addEventListener("click", closeVnLogView);
  document.getElementById("vnDebugCloseBtn").addEventListener("click", closeVnDebugView);
  document.getElementById("vnDebugContent")?.addEventListener("click", (event) => {
    const button = event.target.closest("#vnDebugForceSkipBtn");
    if (!button || button.disabled) return;
    forceSkipAiWait();
  });
  document.getElementById("vnDebugOverlay").addEventListener("click", (event) => {
    if (event.target.id === "vnDebugOverlay") closeVnDebugView();
  });
  document.getElementById("vnLogOverlay").addEventListener("click", (event) => {
    if (event.target.id === "vnLogOverlay") closeVnLogView();
  });
  document.getElementById("sideItemLastEvent").addEventListener("click", reopenLastEvent);
  document.getElementById("sideItemStory").addEventListener("click", openAffinityModal);
  document.getElementById("aiPromptCancelBtn").addEventListener("click", closeAiPromptOverlay);
  document.getElementById("aiPromptSendBtn").addEventListener("click", submitAiPrompt);
  document.getElementById("aiPromptOverlay").addEventListener("click", (event) => {
    if (event.target.id === "aiPromptOverlay") closeAiPromptOverlay();
  });
  document.getElementById("freeChatCancelBtn").addEventListener("click", closeFreeChatOverlay);
  document.getElementById("freeChatSendBtn").addEventListener("click", submitFreeChat);
  document.getElementById("freeChatOverlay").addEventListener("click", (event) => {
    if (event.target.id === "freeChatOverlay") closeFreeChatOverlay();
  });
  document.getElementById("daySummaryCloseBtn").addEventListener("click", closeDaySummaryOverlay);
  document.querySelector(".day-summary-tablet")?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  document.getElementById("daySummaryOverlay").addEventListener("click", (event) => {
    if (event.target.id === "daySummaryOverlay") closeDaySummaryOverlay();
  });
  document.getElementById("phoneLaunchBtn").addEventListener("click", openPhoneOverlay);
  document.getElementById("phoneCloseBtn").addEventListener("click", closePhoneOverlay);
  document.querySelector(".mini-phone-bezel")?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  document.getElementById("phoneOverlay").addEventListener("click", (event) => {
    if (event.target.id === "phoneOverlay") closePhoneOverlay();
  });
  document.getElementById("phoneChatBackBtn").addEventListener("click", showPhoneListView);
  document.getElementById("phoneLineTabHomeBtn").addEventListener("click", showPhoneHomeView);
  document.getElementById("phoneChatMenuBtn")?.addEventListener("click", openVnDebugView);
  document.getElementById("phoneNavBackBtn").addEventListener("click", phoneNavBack);
  document.getElementById("phoneNavHomeBtn").addEventListener("click", showPhoneHomeView);
  document.getElementById("phoneNavCloseBtn").addEventListener("click", closePhoneOverlay);
  document.getElementById("phoneHomeView").addEventListener("click", (event) => {
    const button = event.target.closest("[data-phone-app]");
    if (!button) return;
    launchPhoneApp(button.dataset.phoneApp);
  });
  document.getElementById("phoneDockApps").addEventListener("click", (event) => {
    const button = event.target.closest("[data-phone-app]");
    if (!button) return;
    launchPhoneApp(button.dataset.phoneApp);
  });
  document.getElementById("phoneAddFriendOpenBtn").addEventListener("click", openPhoneAddFriendView);
  document.getElementById("phoneAddFriendBackBtn").addEventListener("click", closePhoneAddFriendView);
  document.getElementById("phoneAddFriendForm").addEventListener("submit", submitPhoneAddFriend);
  document.getElementById("phoneAddFriendSuggestions").addEventListener("click", (event) => {
    const button = event.target.closest("[data-friend-name]");
    if (!button) return;
    const input = document.getElementById("phoneAddFriendInput");
    if (input) input.value = button.dataset.friendName || "";
    confirmPhoneAddFriend(button.dataset.friendName || "");
  });
  document.getElementById("phoneChatRetryBtn").addEventListener("click", triggerPhoneChatRegeneration);
  document.getElementById("phoneChatMessages").addEventListener("click", (event) => {
    if (event.target.closest("[data-phone-retry]")) {
      event.preventDefault();
      triggerPhoneChatRegeneration();
    }
  });
  document.getElementById("phoneChatList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-thread-id]");
    if (!button) return;
    openPhoneThread(button.dataset.threadId);
  });
  document.getElementById("phoneChatForm").addEventListener("submit", submitPhoneChatMessage);
  document.getElementById("phoneBroadcastGenerateBtn")?.addEventListener("click", () => {
    requestBroadcastFullScript({ silent: false, auto: false, reason: "manual" });
  });
  document.getElementById("phoneBroadcastHistory")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-broadcast-id]");
    if (!button) return;
    const id = button.dataset.broadcastId;
    const history = state.freeMode?.world?.broadcast?.history || [];
    const item = history.find((entry) => entry.id === id);
    if (!item) return;
    showToast(item.title || "历史节目", (item.guests || []).join("、") || "无嘉宾记录", "info");
  });
  document.getElementById("interactionModeSpecified").addEventListener("click", () => setInteractionMode("specified"));
  document.getElementById("interactionModeAi").addEventListener("click", () => setInteractionMode("ai"));
  document.getElementById("interactionCancelBtn").addEventListener("click", closeInteractionOverlay);
  document.getElementById("interactionSendBtn").addEventListener("click", submitIdolInteraction);
  document.getElementById("interactionOverlay").addEventListener("click", (event) => {
    if (event.target.id === "interactionOverlay") closeInteractionOverlay();
  });
  document.getElementById("outingCancelBtn").addEventListener("click", closeOutingOverlay);
  bindImeSafeTextInput("outingCustomInput", submitCustomOutingDestination);
  document.getElementById("outingCustomConfirmBtn").addEventListener("click", submitCustomOutingDestination);
  document.getElementById("outingOverlay").addEventListener("click", (event) => {
    if (event.target.id === "outingOverlay") closeOutingOverlay();
  });
  document.getElementById("companionCancelBtn").addEventListener("click", closeCompanionOverlay);
  document.getElementById("companionConfirmBtn").addEventListener("click", submitCompanionTopic);
  document.getElementById("companionTopicTextarea").addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitCompanionTopic();
    }
  });
  document.getElementById("companionOverlay").addEventListener("click", (event) => {
    if (event.target.id === "companionOverlay") closeCompanionOverlay();
  });
  document.getElementById("intimacyCancelBtn").addEventListener("click", closeIntimacyOverlay);
  document.getElementById("intimacyNormalBtn").addEventListener("click", () => confirmIntimacyMode("normal"));
  document.getElementById("intimacyNsfwBtn").addEventListener("click", () => confirmIntimacyMode("nsfw"));
  document.getElementById("intimacyOverlay").addEventListener("click", (event) => {
    if (event.target.id === "intimacyOverlay") closeIntimacyOverlay();
  });
  document.getElementById("launchResumeBtn")?.addEventListener("click", resumeFromLaunchMenu);
  document.getElementById("launchRestoreBackupBtn")?.addEventListener("click", () => {
    if (!restoreBackupSave()) {
      showToast("没有备份", "当前没有可恢复的备份存档。", "warn");
      return;
    }
    showToast("已恢复备份", state.idol ? `已恢复到 ${state.idol} 的进度。` : "已恢复到备份时的进度。", "info");
  });
  document.getElementById("launchProduceBtn")?.addEventListener("click", () => chooseLaunchMode("produce"));
  document.getElementById("launchSandboxBtn")?.addEventListener("click", () => chooseLaunchMode("sandbox"));
  document.getElementById("selectLaunchBackBtn")?.addEventListener("click", clearLaunchModeSelection);
  document.getElementById("apartmentDaySummaryBtn")?.addEventListener("click", openFreeModeEveningSummary);
  document.getElementById("apartmentPhoneBtn")?.addEventListener("click", openPhoneOverlay);
  document.getElementById("apartmentInviteBtn")?.addEventListener("click", openApartmentInviteOverlay);
  document.getElementById("apartmentInviteCancelBtn")?.addEventListener("click", closeApartmentInviteOverlay);
  document.getElementById("apartmentInviteOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "apartmentInviteOverlay") closeApartmentInviteOverlay();
  });
  document.getElementById("apartmentSleepBtn")?.addEventListener("click", sleepFromProducerApartment);
  document.getElementById("producerApartmentCampusBtn")?.addEventListener("click", leaveProducerApartmentForCampus);
  document.getElementById("producerApartmentClock")?.addEventListener("click", openFreeModeTimeOverlay);
  document.getElementById("apartmentWardrobeBtn")?.addEventListener("click", openPortraitWardrobe);
  document.getElementById("portraitWardrobeCloseBtn")?.addEventListener("click", requestClosePortraitWardrobe);
  document.getElementById("portraitWardrobeOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "portraitWardrobeOverlay") requestClosePortraitWardrobe();
  });
  document.getElementById("portraitWardrobeFileInput")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const result = await selectPortraitPreviewFile(file);
    if (!result.ok) showToast("\u56fe\u7247\u4e0d\u53ef\u7528", result.error || "\u8bf7\u9009\u62e9\u6709\u6548\u7684 PNG\u3001WebP \u6216 JPEG \u56fe\u7247\u3002", "warn");
    renderPortraitWardrobe();
  });
  document.getElementById("portraitWardrobeNameInput")?.addEventListener("input", (event) => {
    portraitWardrobeState.draftName = String(event.target.value || "").slice(0, 120);
    const label = document.getElementById("portraitWardrobeLookName");
    if (label) label.textContent = portraitWardrobeState.draftName || "自定义立绘";
  });
  document.getElementById("portraitWardrobeAliasInput")?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    submitProducerPortraitAliasInput();
  });
  document.getElementById("portraitWardrobeAliasAddBtn")?.addEventListener("click", () => {
    submitProducerPortraitAliasInput();
  });
  document.getElementById("portraitWardrobeAliasSaveBtn")?.addEventListener("click", () => {
    if (saveProducerPortraitAliases()) showToast("名称已保存", "制作人立绘触发名称已更新。", "info");
  });
  document.getElementById("portraitWardrobeScale")?.addEventListener("input", (event) => {
    portraitWardrobeState.draftTransform.scale = Number(event.target.value) / 100;
    renderPortraitWardrobe();
  });
  document.getElementById("portraitWardrobeOffsetX")?.addEventListener("input", (event) => {
    portraitWardrobeState.draftTransform.offsetX = Number(event.target.value);
    renderPortraitWardrobe();
  });
  document.getElementById("portraitWardrobeOffsetY")?.addEventListener("input", (event) => {
    portraitWardrobeState.draftTransform.offsetY = Number(event.target.value);
    renderPortraitWardrobe();
  });
  document.getElementById("portraitWardrobeResetBtn")?.addEventListener("click", resetPortraitWardrobeTransform);
  document.getElementById("portraitWardrobeRestoreBtn")?.addEventListener("click", restoreBuiltinPortrait);
  document.getElementById("portraitWardrobeArchiveBtn")?.addEventListener("click", () => {
    if (!portraitWardrobeState.selectedAssetId) return;
    if (!window.confirm("\u53ea\u4f1a\u5c06\u8be5\u7acb\u7ed8\u4ece\u8863\u67dc\u5217\u8868\u5f52\u6863\uff0c\u4e0d\u4f1a\u5220\u9664\u8fdc\u7a0b\u56fe\u7247\u3002\u7ee7\u7eed\uff1f")) return;
    archiveSelectedPortrait();
  });
  document.getElementById("portraitWardrobeApplyBtn")?.addEventListener("click", () => {
    const applied = applyPortraitWardrobeSelection();
    if (!applied && portraitWardrobeState.status !== "working") {
      showToast("\u5c1a\u672a\u9009\u62e9\u7acb\u7ed8", "\u8bf7\u5148\u9009\u62e9\u56fe\u7247\u6216\u8863\u67dc\u4e2d\u7684\u7acb\u7ed8\u3002", "warn");
    }
  });
  document.getElementById("freeModeApartmentBtn")?.addEventListener("click", goToProducerApartmentFromMap);
  document.getElementById("apartmentGoHomeAloneBtn")?.addEventListener("click", handleApartmentGoHomeAlone);
  document.getElementById("apartmentGoHomeWithIdolBtn")?.addEventListener("click", handleApartmentGoHomeWithIdol);
  document.getElementById("apartmentGoHomeCancelBtn")?.addEventListener("click", closeApartmentGoHomeOverlay);
  document.getElementById("apartmentGoHomeOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "apartmentGoHomeOverlay") closeApartmentGoHomeOverlay();
  });
  document.getElementById("apartmentCompanionPickCancelBtn")?.addEventListener("click", () => {
    closeApartmentCompanionPickOverlay();
    openApartmentGoHomeOverlay();
  });
  document.getElementById("apartmentCompanionPickOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "apartmentCompanionPickOverlay") {
      closeApartmentCompanionPickOverlay();
      openApartmentGoHomeOverlay();
    }
  });
  document.getElementById("apartmentCompanionStandeeBtn")?.addEventListener("click", openApartmentCompanionActionOverlay);
  document.getElementById("apartmentCompanionChatBtn")?.addEventListener("click", startApartmentCompanionChatFlow);
  document.getElementById("apartmentCompanionIntimacyBtn")?.addEventListener("click", startApartmentCompanionIntimacyFlow);
  document.getElementById("apartmentCompanionActionCancelBtn")?.addEventListener("click", closeApartmentCompanionActionOverlay);
  document.getElementById("apartmentCompanionActionOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "apartmentCompanionActionOverlay") closeApartmentCompanionActionOverlay();
  });
  document.getElementById("freeModeStayBtn")?.addEventListener("click", () => closeFreeModeEntryOverlay(true));
  document.getElementById("freeModeEnterBtn")?.addEventListener("click", enterFreeMode);
  document.getElementById("hybridCampusExitBtn")?.addEventListener("click", exitHybridCampus);
  document.getElementById("freeModeEntryOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "freeModeEntryOverlay") closeFreeModeEntryOverlay(true);
  });
  document.getElementById("freeModePhoneBtn")?.addEventListener("click", openPhoneOverlay);
  document.getElementById("freeModeAffinityBtn")?.addEventListener("click", openAffinityOverlay);
  document.getElementById("affinityTabCurrent")?.addEventListener("click", () => setAffinityTab("current"));
  document.getElementById("affinityTabSecondary")?.addEventListener("click", () => setAffinityTab("secondary"));
  document.getElementById("affinityTabNetwork")?.addEventListener("click", () => setAffinityTab("network"));
  document.getElementById("affinityCloseBtn")?.addEventListener("click", closeAffinityOverlay);
  document.getElementById("affinityOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "affinityOverlay") closeAffinityOverlay();
  });
  document.getElementById("freeModeTaskPanelBtn")?.addEventListener("click", openTaskPanelOverlay);
  document.getElementById("taskPanelCloseBtn")?.addEventListener("click", closeTaskPanelOverlay);
  document.getElementById("taskPanelOpenSideQuestBtn")?.addEventListener("click", openSideQuestFromTaskPanel);
  document.getElementById("taskPanelOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "taskPanelOverlay") closeTaskPanelOverlay();
  });
  document.getElementById("freeModeSideQuestBtn")?.addEventListener("click", openSideQuestOverlay);
  document.getElementById("sideQuestCloseBtn")?.addEventListener("click", closeSideQuestOverlay);
  document.getElementById("sideQuestTierBackBtn")?.addEventListener("click", () => {
    sideQuestOverlaySlotIndex = null;
    renderSideQuestOverlay();
  });
  document.getElementById("sideQuestOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "sideQuestOverlay") closeSideQuestOverlay();
  });
  document.getElementById("freeModeStatusBadge")?.addEventListener("click", openFreeModeTimeOverlay);
  document.getElementById("vnFreeModeClock")?.addEventListener("click", openFreeModeTimeOverlay);
  document.getElementById("freeModeTimeCloseBtn")?.addEventListener("click", closeFreeModeTimeOverlay);
  document.getElementById("freeModeTimeAdvanceBtn")?.addEventListener("click", submitFreeModeManualTimeAdvance);
  document.getElementById("freeModeAdvanceDayBtn")?.addEventListener("click", handleFreeModeAdvanceDay);
  document.getElementById("freeModeTimeOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "freeModeTimeOverlay") closeFreeModeTimeOverlay();
  });
  document.querySelectorAll(".free-mode-time-quick-btn").forEach((button) => {
    button.addEventListener("click", () => applyFreeModeManualTimeAdvance(button.dataset.minutes));
  });
  document.getElementById("freeModeTimeAdvanceInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submitFreeModeManualTimeAdvance();
  });
  document.getElementById("worldMapLayoutEditBtn")?.addEventListener("click", () => {
    if (isFreeModeActive()) {
      worldMapLayoutState.editorActive = true;
      closeMapLocationOverlay();
      render();
      updateWorldMapLayoutEditorUI();
      showToast("布局编辑", "拖动热点调整位置。", "info");
      return;
    }
    openWorldMapLayoutEditor();
  });
  document.getElementById("worldMapLayoutSaveBtn")?.addEventListener("click", () => persistWorldMapLayoutToBrowser(true));
  document.getElementById("worldMapLayoutExportBtn")?.addEventListener("click", () => { exportWorldMapLayout(); });
  document.getElementById("worldMapLayoutFitBtn")?.addEventListener("click", toggleWorldMapLayoutFit);
  document.getElementById("worldMapLayoutResetBtn")?.addEventListener("click", resetWorldMapLayout);
  document.getElementById("worldMapLayoutCloseEditorBtn")?.addEventListener("click", closeWorldMapLayoutEditor);
  document.getElementById("mapLocationPresenceToggle")?.addEventListener("click", () => {
    mapLocationPresenceExpanded = !mapLocationPresenceExpanded;
    const locationId = document.getElementById("mapLocationOverlay")?.getAttribute("data-location-id");
    if (!locationId) return;
    const idolsHere = getIdolsPresentAtLocation(locationId);
    const residentNpcs = getResidentNpcsAtLocation(locationId);
    applyMapLocationPresenceCollapse(idolsHere.length + residentNpcs.length);
  });
  document.getElementById("mapLocationBackBtn")?.addEventListener("click", closeMapLocationOverlay);
  document.getElementById("mapLocationEnterFacilityBtn")?.addEventListener("click", confirmFacilityEntry);
  document.getElementById("mapLocationEnterWithIdolBtn")?.addEventListener("click", () => confirmMapLocationEntry("with_idol"));
  document.getElementById("mapLocationEnterAloneBtn")?.addEventListener("click", () => confirmMapLocationEntry("alone"));
  document.getElementById("mapLocationOutingBtn")?.addEventListener("click", openFreeModeOutingOverlay);
  document.getElementById("mapLocationShopBtn")?.addEventListener("click", openGiftShopFromMapLocation);
  document.getElementById("freeModeBagBtn")?.addEventListener("click", openGiftBagFromFreeMode);
  document.getElementById("giftShopCloseBtn")?.addEventListener("click", closeGiftShopOverlay);
  document.getElementById("giftShopTabBuy")?.addEventListener("click", () => setGiftShopTab("shop"));
  document.getElementById("giftShopTabBag")?.addEventListener("click", () => setGiftShopTab("bag"));
  document.getElementById("giftShopGiveBackBtn")?.addEventListener("click", () => {
    giftShopUi.pendingItemId = "";
    renderGiftShopOverlay();
  });
  document.getElementById("giftShopOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "giftShopOverlay") closeGiftShopOverlay();
  });
  document.getElementById("freeModeOutingCancelBtn")?.addEventListener("click", closeFreeModeOutingOverlay);
  bindImeSafeTextInput("freeModeOutingCustomInput", submitCustomFreeModeOutingDestination);
  document.getElementById("freeModeOutingCustomConfirmBtn")?.addEventListener("click", submitCustomFreeModeOutingDestination);
  document.getElementById("freeModeOutingOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "freeModeOutingOverlay") closeFreeModeOutingOverlay();
  });
  document.getElementById("freeModeOutingSceneBackBtn")?.addEventListener("click", () => {
    closeFreeModeOutingScene();
    openFreeModeOutingOverlay();
  });
  document.getElementById("freeModeOutingSceneExploreBtn")?.addEventListener("click", () => startFreeModeOutingFacilityExplore("explore"));
  document.getElementById("freeModeOutingFacilityGuideBtn")?.addEventListener("click", openFreeModeOutingFacilityGuide);
  document.getElementById("freeModeOutingFacilityGuideCloseBtn")?.addEventListener("click", closeFreeModeOutingFacilityGuide);
  document.getElementById("freeModeOutingFacilityGuide")?.addEventListener("click", (event) => {
    if (event.target.id === "freeModeOutingFacilityGuide") closeFreeModeOutingFacilityGuide();
  });
  document.getElementById("freeModeOutingIdolActionCloseBtn")?.addEventListener("click", closeFreeModeOutingIdolActionMenu);
  document.getElementById("freeModeOutingDialogueCloseBtn")?.addEventListener("click", closeFreeModeOutingSceneDialogue);
  document.getElementById("freeModeOutingDialogueCustomSendBtn")?.addEventListener("click", submitFreeModeOutingSceneCustomDialogue);
  bindImeSafeTextInput("freeModeOutingDialogueCustomInput", submitFreeModeOutingSceneCustomDialogue);
  document.querySelectorAll("[data-outing-idol-action]").forEach((button) => {
    button.addEventListener("click", () => handleFreeModeOutingIdolAction(button.dataset.outingIdolAction));
  });
  document.querySelectorAll("[data-outing-dialogue-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.outingDialogueAction || "chat";
      if (action === "explore") {
        startFreeModeOutingFacilityExplore("explore");
        return;
      }
      requestFreeModeOutingSceneDialogue(action);
    });
  });
  document.getElementById("mapLocationOverlay")?.addEventListener("click", (event) => {
    if (event.target.id === "mapLocationOverlay") closeMapLocationOverlay();
  });
  document.getElementById("vnCustomChoiceCancelBtn").addEventListener("click", hideVnCustomChoicePanel);
  document.getElementById("vnCustomChoiceConfirmBtn").addEventListener("click", handleVnCustomChoiceSubmit);
  const committedReplyDedupKeys = [];
  function shouldSkipCommittedReply(payload) {
    if (!payload || payload.type !== "aiReplyCommitted") return false;
    const key = [
      String(payload.requestId || ""),
      payload.isFinal === false ? "0" : "1",
      String(payload.rawText || payload.text || "").slice(0, 320)
    ].join("::");
    if (committedReplyDedupKeys.includes(key)) return true;
    committedReplyDedupKeys.push(key);
    if (committedReplyDedupKeys.length > 48) {
      committedReplyDedupKeys.splice(0, committedReplyDedupKeys.length - 48);
    }
    return false;
  }

  function isCurrentPrimaryHostPayload(payload) {
    return Boolean(
      payload?.requestId
      && payload?.channelLeaseId
      && isPrimaryModelLeaseCurrent(payload.requestId, payload.channelLeaseId)
    );
  }

  function routeHostAiPayload(payload) {
    if (!payload || payload.source !== "hatsuboshi-produce-host") return;
    if (payload.type === "hostGenerationDebug") {
      aiBridgeDebug.hostGeneration = normalizeHostGenerationDebugSnapshot(payload.snapshot);
      refreshVnDebugView();
      return;
    }
    if (payload.type === "character") {
      console.log("[app.js] Applying character payload. Name:", payload.character?.name, "SaveScope:", payload.saveScope);
      applyHostCharacter(payload.character, payload.saveScope, payload.savedState, payload.hasSavedState);
      return;
    }
    if (payload.type === "portraitFileOperationResult") {
      handlePortraitHostResult(payload);
      return;
    }
    if (payload.type === "chronicleCheckpoints") {
      if (chronicleCheckpointResolver?.requestId === payload.requestId) {
        chronicleCheckpointResolver = null;
        renderChronicleCheckpointList(payload.checkpoints || [], payload.error || "");
      }
      return;
    }
    if (payload.type === "secondaryAiReply") {
      handleSecondaryAiReply(payload);
      return;
    }
    if (payload.type === "primaryAiError") {
      const owner = getPrimaryModelChannelOwner();
      handlePrimaryModelChannelFailure(owner, String(payload.error || "host_error"), payload.requestId, payload.channelLeaseId);
      return;
    }
    if (payload.type === "chronicleBranchFailed") {
      showToast("读档失败", payload.error || "创建分支失败，请确认酒馆助手可用。", "warn");
      openChronicleLoadOverlay();
      return;
    }
    if (shouldSkipCommittedReply(payload)) return;
    if (payload.type === "aiReply" || payload.type === "aiReplyCommitted") {
      if (!isCurrentPrimaryHostPayload(payload)) {
        debugHarnessEvent("reply.rejected_stale", {
          requestId: String(payload.requestId || ""),
          channelLeaseId: String(payload.channelLeaseId || ""),
          reason: "primary_lease_mismatch"
        });
        return;
      }
      activeInboundPrimaryChannelLeaseId = String(payload.channelLeaseId || "");
      try {
        applyAiReply(
          payload.text,
          payload.requestId,
          payload.rawText,
          payload.renderedText,
          payload.isFinal,
          payload.variableCommands,
          payload.messageId
        );
      } finally {
        activeInboundPrimaryChannelLeaseId = "";
      }
    }
  }

  window.addEventListener("message", (event) => {
    const data = event.data || {};
    
    // 安全校验：允许来自父窗口（跨域 iframe）、同窗口（同域载入）或同源消息
    const isFromParent = event.source === window.parent;
    const isFromSelf = event.source === window || event.source === null;
    const isSameOrigin = event.origin === window.location.origin;
    
    if (data.source === "hatsuboshi-produce-host") {
      console.log("[app.js] Received message from host:", data.type, "origin:", event.origin, "isFromParent:", isFromParent, "isFromSelf:", isFromSelf, "isSameOrigin:", isSameOrigin);
    }
    
    if (!isFromParent && !isFromSelf && !isSameOrigin) {
      if (data.source === "hatsuboshi-produce-host") {
        console.warn("[app.js] Origin/source validation failed. origin:", event.origin, "local:", window.location.origin);
      }
      return;
    }
    
    routeHostAiPayload(data);
  });
  window.addEventListener("hatsuAssistantCommitted", (event) => {
    const detail = event?.detail || {};
    routeHostAiPayload(detail);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const recoveryOverlay = document.getElementById("harnessRecoveryOverlay");
      if (recoveryOverlay && !recoveryOverlay.hidden) {
        closeHarnessRecoveryOverlay();
        return;
      }
      closeVnDebugView();
      closeHarnessRecoveryOverlay();
      closeEventOverlay();
      closeAiPromptOverlay();
      closeFreeChatOverlay();
      closeInteractionOverlay();
      closeOutingOverlay();
      closeCompanionOverlay();
      if (activeModal) closeModal();
      closeNotebook();
    }
  });

  document.getElementById("dockResetRun").addEventListener("click", () => {
    if (!state.idol) return;
    const idolName = state.idol;
    triggerWipeTransition(() => {
      if (isSandboxLaunch()) {
        state.launchMode = "sandbox";
        state.gameMode = "hybrid";
        state.sandbox = { openingComplete: true, inviteComplete: true };
        applyIdolPreset(idolName, true);
        ensureFreeModeTimeDefaults();
        if (!state.freeMode.world) state.freeMode.world = {};
        state.freeMode.world.macro_phase = "scout";
        refreshWorldPresenceFromRules(true);
        state.freeMode = {
          ...(state.freeMode || {}),
          active: true,
          postLiveDay: 1,
          clockMinutes: FREE_MODE_DAY_START_MINUTES,
          facilityKind: null,
          facilityLocationId: null
        };
        document.body.classList.add("is-free-mode-active");
        saveState();
        render();
        showToast("沙盒已重置", `保留 ${idolName}，学园时间回到第 1 天 08:00。`, "warn");
        return;
      }
      state = clone(baseState);
      state.launchMode = "produce";
      applyIdolPreset(idolName, true);
      startOpeningStory("重置育成");
      showToast("育成已重置", "保留当前担当并重建第 1 天档案。", "warn");
    });
  });

  document.getElementById("dockChangeIdol").addEventListener("click", () => {
    triggerWipeTransition(() => {
      if (hasResumableGameplay() || state.idol) {
        backupCurrentSave();
      }
      state = clone(baseState);
      localStorage.removeItem(activeStorageKey);
      render();
      showToast("已返回担当选择", hasBackupSave()
        ? "请选择新的担当偶像。上一局已自动备份，可在主菜单恢复。"
        : "请选择新的担当偶像。", "info");
    });
  });

  document.getElementById("dockCopyPrompt").addEventListener("click", copyPrompt);

  async function copyPrompt() {
    const text = state.lastPrompt || document.getElementById("promptText").value;
    if (!text) {
      showToast("暂无提示词", "先选择担当或完成一次行动。", "warn");
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const field = document.getElementById("promptText");
        field.value = text;
        field.focus();
        field.select();
        document.execCommand("copy");
      }
      showToast("提示词已复制", "可以直接粘贴到 LLM 对话中。", "gold");
    } catch {
      openNotebook("prompt");
      showToast("请手动复制", "浏览器限制剪贴板时，可在 P 手账中手动复制。", "warn");
    }
  }

  if (!state.round) state.round = 1;
  if (state.round > SUMMARY_ROUND) state.round = SUMMARY_ROUND;
  if ("fatigue" in state) delete state.fatigue;
  if (typeof state.liveReady !== "boolean") state.liveReady = false;
  if (state.idol && (!state.growth || !state.cap || !state.sp)) applyIdolPreset(state.idol);
  // Expose developer commands globally
  window.produceDev = {
    setDay: (d) => { state.day = clamp(d, 1, FINAL_LIVE_DAY); saveState(); render(); return `Day set to ${state.day}`; },
    setRound: (r) => { state.round = clamp(r, 1, SUMMARY_ROUND); saveState(); render(); return `Round set to ${state.round}`; },
    setStamina: (s) => { state.stamina = clamp(s, 0, 100); saveState(); render(); return `Stamina set to ${state.stamina}`; },
    setStress: (s) => { state.stress = clamp(s, 0, 100); saveState(); render(); return `Stress set to ${state.stress}`; },
    setTrust: (t) => { state.trust = Math.max(0, t); saveState(); render(); return `Trust set to ${state.trust}`; },
    setStats: (vo, da, vi) => { state.Vo = Math.max(0, vo); state.Da = Math.max(0, da); state.Vi = Math.max(0, vi); saveState(); render(); return `Stats set to Vo: ${state.Vo}, Da: ${state.Da}, Vi: ${state.Vi}`; },
    setLiveReady: (b) => { state.liveReady = Boolean(b); saveState(); render(); return `LiveReady set to ${state.liveReady}`; },
    resetLiveState: () => { state.firstLive = { completed: false, success: false, result: null }; saveState(); render(); return "First Live state reset."; },
    triggerLive: () => { state.liveReady = true; saveState(); render(); startFirstLive(); return "First Live started."; },
    openMapLayoutEditor: () => { openWorldMapLayoutEditor(); return "World map layout editor opened."; },
    exportMapLayout: () => { exportWorldMapLayout(); return buildWorldMapLayoutEnvelope(); },
    getMapLayout: () => buildWorldMapLayoutEnvelope(),
    getTaskSnapshot: () => getTaskPanelSnapshot(),
    resetBoot: () => {
      state = clone(baseState);
      selectedIdol = null;
      ensureStateShape();
      saveState();
      render();
      return "已重置到开局模式选择";
    },
    markDietPlan: () => {
      if (!globalThis.HatsuTasks?.markDietPlanActive(state)) return "饮食方案未激活（需沙盒且主线③进行中）";
      saveState();
      processSandboxQuestAfterSettlement();
      return "已标记饮食方案制定";
    },
    recordHealthyMeal: (count = 1) => {
      if (!globalThis.HatsuTasks?.recordHealthyMeal(state, count)) return "健康餐未记录（需沙盒且主线③进行中）";
      saveState();
      processSandboxQuestAfterSettlement();
      return `已记录健康餐 +${count}`;
    },
    setCampusUsed: (count = 0) => {
      if (!globalThis.HatsuTasks?.isSandboxTasksActive(state)) return "仅沙盒模式可用";
      globalThis.HatsuTasks.syncCampusDay(state);
      state.tasks.campus.usedCount = Math.max(0, Math.min(3, Number(count) || 0));
      saveState();
      render();
      return `校园次数已设为 ${state.tasks.campus.usedCount}/3`;
    },
    completeQuestTag: (id) => {
      const completed = globalThis.HatsuTasks?.applyQuestCompletionsFromReply(state, `【初星任务完成】${id}`) || [];
      if (!completed.length) return `任务 ${id} 未激活或已完成`;
      saveState();
      notifyQuestCompletions(completed);
      return `任务 ${id} 已标记完成`;
    },
    refreshSideQuests: () => {
      if (!globalThis.HatsuTasks?.isSandboxTasksActive(state)) return "仅沙盒模式可用";
      const mode = globalThis.HatsuTasks.queueSideQuestRefresh(state);
      saveState();
      if (mode === "api") maybeRequestSideQuestGeneration();
      render();
      return getTaskPanelSnapshot()?.side;
    },
    getSecondaryApi: () => {
      const cfg = getSecondaryApiConfig();
      return { ...cfg, apiKey: cfg.apiKey ? "[已保存]" : "" };
    },
    setSecondaryApi: (patch = {}) => {
      saveSecondaryApiSettings(patch);
      return getSecondaryApiConfig();
    },
    forceSideQuestApi: () => {
      if (!globalThis.HatsuTasks?.isSandboxTasksActive(state)) return "仅沙盒模式可用";
      if (shouldUseSecondaryWorldGen()) {
        globalThis.HatsuWorld?.worldGen?.queueDailyWorldGeneration?.(state, getWorldFeedDayKey(), { force: true });
        globalThis.HatsuTasks.queueSideQuestRefresh(state);
        saveState();
        maybeRequestDailyWorldGeneration();
        return { mode: "world-api", side: getTaskPanelSnapshot()?.side, dailyGen: state.freeMode?.world?.dailyGen };
      }
      const mode = globalThis.HatsuTasks.queueSideQuestRefresh(state);
      saveState();
      maybeRequestSideQuestGeneration();
      return { mode, side: getTaskPanelSnapshot()?.side };
    },
    forceWorldGen: () => {
      if (!isSecondaryApiConfigured()) return "次 API 未配置";
      if (!isPhoneWorldFeedUnlocked()) return "初星圈/广播尚未解锁";
      globalThis.HatsuWorld?.worldGen?.queueDailyWorldGeneration?.(state, getWorldFeedDayKey(), { force: true });
      if (globalThis.HatsuTasks?.isSandboxTasksActive(state)) {
        globalThis.HatsuTasks.queueSideQuestRefresh(state);
      }
      saveState();
      maybeRequestDailyWorldGeneration();
      render();
      return {
        dailyGen: state.freeMode?.world?.dailyGen,
        broadcast: state.freeMode?.world?.broadcast?.today?.title || "",
        buzzCount: state.freeMode?.world?.buzz?.items?.length || 0,
        side: getTaskPanelSnapshot()?.side
      };
    },
    applySideTier: (slotIndex, tier) => {
      const result = globalThis.HatsuTasks?.applySideQuestTier(state, Number(slotIndex), tier);
      if (!result?.ok) return `结算失败：${result?.reason || "未知"}`;
      saveState();
      processSandboxQuestAfterSettlement();
      render();
      return result;
    }
  };

  ensureStateShape();
  if (globalThis.HatsuTasks) {
    notifyQuestCompletions(globalThis.HatsuTasks.syncSandboxQuestProgress(state));
    if (
      isSandboxLaunch()
      && globalThis.HatsuTasks?.getScoutQuestId?.(state)
      && state.tasks?.main?.[globalThis.HatsuTasks.getScoutQuestId(state)]?.status === "completed"
      && state.freeMode?.world?.campus?.phase === "scout"
    ) {
      refreshWorldPresenceFromRules(true);
    }
  }
  refreshAffinityUnlocks();
  hydrateWorldMapLayout().finally(() => {
    saveState();
    render();
    if (!isSillyTavernHost()) requestAnimationFrame(() => maybeShowHarnessRecoveryPrompt());
    requestAnimationFrame(() => {
      ensureIdolListRendered();
    });
    bgmManager.init();
    updateBgm();
    if (!isSillyTavernHost()) resumeOpeningIfNeeded();
    resumeSandboxIfNeeded();
    requestHostCharacter();
  });

  // Splash Screen 自动退出
  const splashEl = document.getElementById("splashScreen");
  if (splashEl) {
    const dismissSplash = () => {
      if (splashEl.classList.contains("is-dismissed")) return;
      splashEl.classList.add("is-dismissed");
    };
    splashEl.style.pointerEvents = "auto";
    splashEl.addEventListener("click", dismissSplash, { once: true });
    splashEl.addEventListener("animationend", (e) => {
      if (e.target === splashEl) {
        splashEl.remove();
      }
    });
  }

  // Global error handler to catch and display unhandled runtime exceptions in toasts
  window.addEventListener("error", (event) => {
    try {
      const errMsg = event.error ? event.error.stack || event.error.message : event.message;
      showToast("系统脚本错误", errMsg, "error");
    } catch (e) {
      console.error("Error logging failed:", e);
    }
  });
})();

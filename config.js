/* ========== config.js - 游戏配置与状态 ========== */

const gameState = {
    apiKey: '',
    aiProvider: 'gemini',      // gemini / deepseek / qwen / zhipu / moonshot
    currentRelativeIndex: 0,
    character: { name: '你', gender: 'male', age: 26, job: 'tech', salary: 'high', relationship: 'single', children: 'no', house: 'rent', car: 'no' },
    knownInfo: { gender: true, age: true },
    lies: {},
    sharedInfo: {},            // 亲戚间传播的信息 { topic: { value, source, isLie } }
    globalHistory: [],         // 跨亲戚对话摘要 [{relative, topic, playerSaid, reaction}]
    player: { face: 50, mental: 50, money: 0, guilt: 0, anger: 0 },
    relativeState: { satisfaction: 50, patience: 100, suspicion: 0, anger: 0 },
    dialogueHistory: [],
    currentTopic: null,
    currentTopicValue: null,
    currentFollowUpIndex: 0,
    isLoading: false,
    conversationPhase: 'greeting',
    questionCount: 0,
    consecutivePositive: 0,
    consecutiveNegative: 0,
    moodMode: 'normal',
    escapeUses: { toilet: 2, phone: 1, mom: 1 },
    argumentMode: false,
    argumentTopic: null,
    isTyping: false,
    skipTyping: false,
};

const characterLabels = {
    gender: { male: '男生', female: '女生' },
    job: { none: '待业', private: '私企', tech: '互联网', state: '体制内', freelance: '自由职业' },
    salary: { low: '5k以下', medium: '5k-15k', high: '15k-30k', rich: '30k+' },
    relationship: { single: '单身', dating: '恋爱中', married: '已婚', divorced: '离异' },
    house: { rent: '租房', mortgage: '房贷中', owned: '有房' },
    car: { no: '无车', yes: '有车' }
};

const topicNames = {
    job: '工作', salary: '收入', relationship: '对象', house: '房子', car: '车',
    health: '健康', food: '饮食', marriage: '婚事', children: '孩子',
    investment: '投资', business: '生意', plan: '规划', life: '生活',
    travel: '旅游', fashion: '时尚', game: '游戏', study: '学习', secret: '秘密'
};

// ==================== 角色配置 ====================
const relativeQueue = ['nainai', 'biaojie', 'dagu', 'sanshu', 'erjiu', 'xiaobiaodi'];

const relatives = {
    nainai: {
        name: '奶奶', avatar: '👵', personality: '慈爱唠叨但传统',
        meanLevel: 1, basePatience: 150, conservativeLevel: 4,
        sprite: 'nainai_sprites',
        preferredTopics: ['health', 'food', 'relationship', 'marriage', 'children'],
        greetings: ['哎呀，我的乖孙回来啦！快让奶奶看看瘦了没有？', '回来啦回来啦！想死奶奶了！来坐这儿暖和！'],
        fillers: ['嗯嗯好好好…', '奶奶就喜欢听你说话…', '是吗？那挺好的…'],
        uniqueMechanic: 'guilt',
        description: '无论说什么都不会生气，但会"伤心"制造愧疚感',
        redPacketThreshold: 65, redPacketAmount: 500
    },
    biaojie: {
        name: '表姐', avatar: '👱‍♀️', personality: '凡尔赛攀比狂',
        meanLevel: 2, basePatience: 110, conservativeLevel: 3,
        sprite: 'biaojie_sprites',
        preferredTopics: ['salary', 'house', 'car', 'travel', 'fashion', 'relationship'],
        greetings: ['哎呀小弟/小妹来啦！好久不见想死姐了～', '来啦来啦！让姐看看，还是那么精神！姐最近可累死了～'],
        fillers: ['是吗～', '哦～这样啊～', '哎呀～'],
        uniqueMechanic: 'brag',
        description: '每句话都在炫耀，玩家需要接话不上头',
        redPacketThreshold: 70, redPacketAmount: 100
    },
    dagu: {
        name: '大姑', avatar: '👩', personality: '热情八卦爱套话',
        meanLevel: 3, basePatience: 100, conservativeLevel: 4,
        sprite: 'dagu_sprites',
        preferredTopics: ['relationship', 'secret', 'salary', 'life', 'marriage'],
        greetings: ['哟回来啦！让姑姑好好看看！听说你…', '来了来了！快坐下姑姑有好多话想问你！'],
        fillers: ['然后呢然后呢？', '是嘛…真的假的？', '诶细说细说！'],
        uniqueMechanic: 'intel',
        description: '套话高手，获取的情报会传给其他亲戚',
        redPacketThreshold: 75, redPacketAmount: 200
    },
    sanshu: {
        name: '三叔', avatar: '🧔', personality: '酒桌文化大男子',
        meanLevel: 3, basePatience: 90, conservativeLevel: 5,
        sprite: 'sanshu_sprites',
        preferredTopics: ['business', 'investment', 'salary', 'job', 'plan'],
        greetings: ['来了来了！坐下叔给你倒酒！不喝可不行！', '好小子！又长高了！来先干一杯！'],
        fillers: ['嗯！', '来来来喝一个！', '说说看叔听着呢！'],
        uniqueMechanic: 'drink',
        description: '敬酒循环，拒酒/陪酒/反敬策略选择',
        redPacketThreshold: 75, redPacketAmount: 200
    },
    erjiu: {
        name: '二舅', avatar: '👨', personality: '大男子主义说教狂',
        meanLevel: 4, basePatience: 80, conservativeLevel: 5,
        sprite: 'erjiu_sprites',
        preferredTopics: ['plan', 'job', 'house', 'marriage', 'study'],
        greetings: ['回来了啊！工作怎么样？来来来坐下二舅问你几个事儿！', '外甥回来了！好久不见来先喝一杯再说！'],
        fillers: ['嗯…', '然后呢？', '这样啊…二舅觉得吧…'],
        uniqueMechanic: 'lecture',
        description: '人生导师模式，怒气阈值低但给红包大方',
        redPacketThreshold: 80, redPacketAmount: 300
    },
    xiaobiaodi: {
        name: '小表弟', avatar: '👦', personality: '天真无忌嘴无遮拦',
        meanLevel: 0, basePatience: 200, conservativeLevel: 1,
        sprite: 'xiaobiaodi_sprites',
        preferredTopics: ['game', 'secret', 'life', 'relationship'],
        greetings: ['哥哥/姐姐！你终于回来啦！我好想你！让我看看你手机！', '哥哥姐姐过年好！你给我带礼物了吗？对了我跟你说个秘密！'],
        fillers: ['哦～', '为什么呀？', '真的吗真的吗？', '那然后呢？'],
        uniqueMechanic: 'chaos',
        description: '随机翻手机/念聊天记录/爆秘密，不可控Boss战',
        redPacketThreshold: 999, redPacketAmount: 0
    }
};

// ==================== 喘息事件 ====================
const breathingEvents = [
    { icon: '🍽️', title: '来吃口菜', text: '奶奶端来一盘菜："来来来先吃口菜再说！"', effect: { mental: 5 }, pauseTurns: 1 },
    { icon: '📺', title: '电视插播', text: '电视里突然放起了相亲节目…', effect: {}, topicShift: true },
    { icon: '📱', title: '手机震动', text: '你的手机突然震动了…', choices: ['偷偷看一眼', '无视继续聊'] },
    { icon: '👶', title: '小孩救场', text: '一群小孩跑过来抢遥控器，场面一度混乱…', effect: { mental: 8 }, skipTurn: true },
    { icon: '🍊', title: '剥橘子', text: '妈妈递来一个橘子："剥个橘子吃。"', effect: { mental: 3 }, pauseTurns: 1 },
];

// ==================== 揭穿事件 ====================
const exposureEvents = [
    { icon: '📱', title: '手机暴露', text: '小表弟在玩你的手机突然大声念出来："妈妈问我工作找到没…"' },
    { icon: '📞', title: '电话露馅', text: '这时你妈妈打来电话亲戚凑过来听到了一些内容…' },
    { icon: '👀', title: '朋友圈穿帮', text: '亲戚刷朋友圈看到了你之前发的动态跟你说的好像不太一样…' },
    { icon: '🗣️', title: '亲戚交流', text: '隔壁桌的亲戚走过来聊着聊着说漏了嘴…' },
    { icon: '👶', title: '童言无忌', text: '小侄子突然说："妈妈之前说你还没找到工作呢！"' },
];

// ==================== 话题数据（fallback用） ====================
const fallbackTopics = {
    job: {
        questions: ['现在在哪工作啊？', '做什么工作呢？'],
        options: {
            truth: { text: '如实回答', risk: 'safe' },
            lie: { text: '编一个好听的', risk: 'risky' },
            vague: { text: '含糊带过', risk: 'safe' },
            refuse: { text: '不想说', risk: 'danger' },
            counter: { text: '反问回去', risk: 'danger' }
        }
    },
    salary: {
        questions: ['月薪多少啊？', '一个月能挣多少？'],
        options: {
            truth: { text: '如实回答', risk: 'safe' },
            lie: { text: '往高了说', risk: 'risky' },
            vague: { text: '够花就行', risk: 'safe' },
            refuse: { text: '这是隐私', risk: 'danger' },
            counter: { text: '您月薪多少？', risk: 'danger' }
        }
    },
    relationship: {
        questions: ['有对象了没？', '谈朋友了吗？'],
        options: {
            truth: { text: '如实回答', risk: 'safe' },
            lie: { text: '编一个', risk: 'risky' },
            vague: { text: '在看呢', risk: 'safe' },
            refuse: { text: '别问了', risk: 'danger' },
            counter: { text: '您家孩子呢？', risk: 'danger' }
        }
    },
    house: {
        questions: ['买房了没？', '在哪住？'],
        options: {
            truth: { text: '如实回答', risk: 'safe' },
            lie: { text: '说买了', risk: 'risky' },
            vague: { text: '在看呢', risk: 'safe' },
            refuse: { text: '不想说', risk: 'danger' },
            counter: { text: '您还有房出租吗？', risk: 'danger' }
        }
    },
    car: {
        questions: ['买车了没？', '开什么车回来的？'],
        options: {
            truth: { text: '如实回答', risk: 'safe' },
            lie: { text: '说有车', risk: 'risky' },
            vague: { text: '在考虑', risk: 'safe' },
            refuse: { text: '不聊这个', risk: 'danger' },
            counter: { text: '您换车了吗？', risk: 'danger' }
        }
    }
};

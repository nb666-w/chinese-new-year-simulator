/* 过年回家模拟器 v4.0 - Part 1: 状态和配置 */

const gameState = {
    apiKey: '',
    currentRelativeIndex: 0,
    character: { name: '你', gender: 'male', age: 26, looks: 'medium', job: 'tech', salary: 'high', relationship: 'single', children: 'no', orientation: 'straight', house: 'rent', car: 'no' },
    knownInfo: { gender: true, age: true, looks: true },
    lies: {},
    player: { face: 50, mental: 50, money: 0, guilt: 0, anger: 0 },
    relativeState: { satisfaction: 50, patience: 100, suspicion: 0, anger: 0 },
    dialogueHistory: [],
    currentTopic: null,
    currentTopicValue: null, // 当前话题玩家的回答值
    currentFollowUpIndex: 0, // 当前话题的追问轮次
    isLoading: false,
    conversationPhase: 'greeting' // greeting, chatting, followup, ending
};

const characterLabels = {
    gender: { male: '男生', female: '女生' },
    job: { none: '待业', private: '私企', tech: '互联网', state: '体制内', freelance: '自由职业' },
    salary: { low: '5k以下', medium: '5k-15k', high: '15k-30k', rich: '30k+' },
    relationship: { single: '单身', dating: '恋爱中', married: '已婚', divorced: '离异' },
    house: { rent: '租房', mortgage: '房贷中', owned: '有房' },
    car: { no: '无车', yes: '有车' }
};

const relativeQueue = ['nainai', 'dagu', 'erjiu', 'biaojie', 'sanshu', 'ershen'];

const relatives = {
    nainai: {
        name: '奶奶', avatar: '👵', personality: '慈爱唠叨但传统', meanLevel: 1, basePatience: 150, conservativeLevel: 4,
        greetings: ['哎呀，我的乖孙回来啦！快让奶奶看看，瘦了没有？', '回来啦回来啦！想死奶奶了！来，坐这儿，暖和！'],
        fillers: ['嗯嗯，好好好...', '奶奶就喜欢听你说话...', '是吗？那挺好的...', '奶奶年纪大了，就盼着你们好...'],
        reactions: { happy: '哎呀，真乖！奶奶放心了！', unhappy: '唉，奶奶担心你啊...', angry: '你这孩子怎么这样...' },
        toxicPhrases: ['奶奶就盼着能抱重孙呐...', '也不知道还能见你几次了...', '你妈天天跟我念叨你...'],
        conservativeReactions: { gay: '你...你说什么？！奶奶听不懂！别胡说！', single: '都这个岁数了怎么还不找对象？！', divorce: '离婚？那可不行！丢死人了！', noJob: '没工作怎么行？你让你爸妈怎么办？' },
        redPacketThreshold: 65, redPacketAmount: 500
    },
    dagu: {
        name: '大姑', avatar: '👩', personality: '热情八卦爱比较', meanLevel: 3, basePatience: 100, conservativeLevel: 4,
        greetings: ['哟！回来啦！让姑姑好好看看，怎么感觉又胖了？哈哈开玩笑！', '来了来了！快坐下，姑姑有好多话想问你！听说你...'],
        fillers: ['然后呢然后呢？', '是嘛...真的假的？', '嗯嗯，接着说！', '诶，细说细说！'],
        reactions: { happy: '哎呀不错嘛！比你表哥强！', unhappy: '就这样？你表哥可都...', angry: '你什么态度！姑姑还不是为你好！' },
        toxicPhrases: ['我这都是为你好！', '你看看人家隔壁小王，都当经理了！', '你让你爸妈多操心啊！', '你表弟都生二胎了！'],
        conservativeReactions: { gay: '什么？！这可不行！你爸妈知道吗？！赶紧改！', single: '你眼光也太高了！女孩子年纪大了可不好嫁！', divorce: '离婚？怎么能离婚呢！凑合过呗！', noJob: '都多大的人了还没工作？！' },
        redPacketThreshold: 75, redPacketAmount: 200
    },
    erjiu: {
        name: '二舅', avatar: '👨', personality: '大男子主义说教狂', meanLevel: 4, basePatience: 80, conservativeLevel: 5,
        greetings: ['回来了啊！工作怎么样？来来来，坐下，二舅问你几个事儿！', '外甥回来了！好久不见！来，先喝一杯再说！'],
        fillers: ['嗯...', '然后呢？', '这样啊...二舅觉得吧...', '听二舅跟你说...'],
        reactions: { happy: '还行，有点出息了！继续努力！', unhappy: '年轻人得上进啊！像你爸那样不行！', angry: '你这是什么话！二舅吃的盐比你吃的米都多！' },
        toxicPhrases: ['我像你这么大的时候早就...', '现在年轻人就是吃不了苦！', '听二舅的准没错！', '男人就得有担当！'],
        conservativeReactions: { gay: '什么玩意儿？！这不是有病吗！赶紧去看看！', single: '男人三十没成家，说出去丢人！', divorce: '离婚？太不像话了！你对得起列祖列宗吗！', noJob: '大男人没工作像什么样子！', freelance: '自由职业？那不就是无业游民吗！' },
        redPacketThreshold: 80, redPacketAmount: 300
    },
    biaojie: {
        name: '表姐', avatar: '👱‍♀️', personality: '凡尔赛攀比狂', meanLevel: 2, basePatience: 110, conservativeLevel: 3,
        greetings: ['哎呀！小弟/小妹来啦！好久不见想死姐了～', '来啦来啦！让姐看看，还是那么精神！姐最近可累死了～'],
        fillers: ['是吗～', '哦～这样啊～', '诶，真的吗～', '哎呀～'],
        reactions: { happy: '不错不错～跟姐差不多嘛～', unhappy: '唉，也是不容易...姐当年也...', angry: '你说这话就没意思了啊～' },
        toxicPhrases: ['姐夫那个公司也就那样吧，年薪才百来万...', '唉，不像姐被房贷车贷压着，两套房真累...', '姐最近又瘦了五斤，太烦了...'],
        conservativeReactions: { gay: '额...这个...你有没有考虑过治一治？', single: '女孩子可耽误不起啊，姐给你介绍？', divorce: '怎么会离呢？是不是你的问题？', noJob: '待业？那平时干什么呀...' },
        redPacketThreshold: 70, redPacketAmount: 100
    },
    sanshu: {
        name: '三叔', avatar: '🧔', personality: '酒桌文化大男子', meanLevel: 3, basePatience: 90, conservativeLevel: 5,
        greetings: ['来了来了！坐下，叔给你倒酒！不喝可不行！', '好小子！又长高了！来，先干一杯！'],
        fillers: ['嗯！', '来来来，喝一个！', '说说看，叔听着呢！', '好！'],
        reactions: { happy: '可以可以！爷们儿！', unhappy: '年轻人要有血性！', angry: '你小子！翅膀硬了是吧！' },
        toxicPhrases: ['不喝就是不给叔面子！', '男人不喝酒，枉在世上走！', '喝了这杯，叔给你介绍个好工作！', '大男人扭扭捏捏的像什么样子！'],
        conservativeReactions: { gay: '你说什么？！滚！别丢我们老X家的人！', single: '还不找对象？是不是那方面有问题？', divorce: '离婚？没本事留住老婆？', noJob: '一个大男人整天宅家里？出息！' },
        redPacketThreshold: 75, redPacketAmount: 200
    },
    ershen: {
        name: '二婶', avatar: '👩‍🦱', personality: '八卦精传话筒', meanLevel: 5, basePatience: 70, conservativeLevel: 4,
        greetings: ['哎呀回来啦？婶可听说了不少你的事儿！', '来了！让婶看看，气色不错嘛！对了我跟你说个事儿...'],
        fillers: ['真的假的？', '然后呢然后呢？', '我可听说...', '诶？怎么回事？'],
        reactions: { happy: '还算可以！我回头跟你妈说！', unhappy: '就这样？唉，我可怎么跟别人说...', angry: '你这孩子怎么说话的！婶可要告诉你妈！' },
        toxicPhrases: ['你看隔壁家那谁，都买第二套房了！', '你妈私底下可没少为你操心哭鼻子！', '我可听说了...你是不是...', '你小时候可不是这样的！'],
        conservativeReactions: { gay: '天呐！你可别让你妈知道！她受不了！这是病得治！', single: '再不找人家都挑剩下了！', divorce: '离婚了你让婶怎么跟别人解释！太丢脸了！', noJob: '没工作你吃什么喝什么？啃老啊？' },
        redPacketThreshold: 85, redPacketAmount: 100
    }
};

// 揭穿谎言的特殊事件
const exposureEvents = [
    { icon: '📱', title: '手机暴露', text: '小表弟在玩你的手机，突然大声念出来："妈妈问我工作找到没..."' },
    { icon: '📞', title: '电话露馅', text: '这时你妈妈打来电话，亲戚凑过来听到了一些内容...' },
    { icon: '👀', title: '朋友圈穿帮', text: '亲戚刷朋友圈看到了你之前发的动态，跟你说的好像不太一样...' },
    { icon: '🗣️', title: '亲戚交流', text: '隔壁桌的亲戚走过来，聊着聊着说漏了嘴...' },
    { icon: '👶', title: '童言无忌', text: '小侄子突然说："妈妈之前说你还没找到工作呢！"' },
    { icon: '👵', title: '奶奶出卖', text: '奶奶从厨房走出来，无意间说了一句话把你卖了...' }
];

// 话题和问题（支持多轮追问）
const topics = {
    job: {
        questions: ['现在在哪工作啊？', '做什么工作呢？', '工作找得怎么样了？'],
        followUps: {
            none: [
                { q: '怎么还没找到工作？', responses: ['在看呢...', '慢慢来吧', '不着急'] },
                { q: '打算找什么样的？', responses: ['互联网吧', '考个公', '先看看'] },
                { q: '你爸妈不着急吗？', responses: ['他们还好', '有点催', '别提了'] }
            ],
            tech: [
                { q: '互联网啊，加班厉害吧？', responses: ['还好', '确实挺累', '习惯了'] },
                { q: '那35岁了怎么办？', responses: ['走一步看一步', '转管理', '存够钱就跑'] },
                { q: '什么公司？大厂吗？', responses: ['还行吧', '算大厂', '小公司'] }
            ],
            state: [
                { q: '体制内好啊！有编制吗？', responses: ['有的', '还没转正', '合同制'] },
                { q: '什么级别了？', responses: ['刚进去', '科员吧', '慢慢熬'] },
                { q: '福利待遇咋样？', responses: ['还可以', '比较稳定', '旱涝保收'] }
            ],
            private: [
                { q: '私企稳定吗？', responses: ['还可以', '挺稳的', '就那样'] },
                { q: '什么公司？做啥的？', responses: ['贸易的', '制造业', '服务业'] }
            ],
            freelance: [
                { q: '自由职业？那收入稳定吗？', responses: ['还行', '时好时坏', '比上班强'] },
                { q: '具体做什么？', responses: ['接单子', '做自媒体', '搞创作'] }
            ]
        }
    },
    salary: {
        questions: ['一个月能挣多少呀？', '工资高不高？', '收入怎么样？'],
        followUps: {
            low: [
                { q: '这也太少了！够花吗？', responses: ['勉强够', '省着点', '确实紧'] },
                { q: '有没有想过跳槽？', responses: ['在看', '先干着', '不太想动'] }
            ],
            medium: [
                { q: '还行吧...存了多少了？', responses: ['存了一点', '月光', '不多'] },
                { q: '在那城市够花吗？', responses: ['勉强够', '够用', '不太够'] }
            ],
            high: [
                { q: '不错嘛！存起来了吗？', responses: ['存着呢', '投资了', '花了不少'] },
                { q: '那买房了没？', responses: ['在看', '买了', '先不急'] }
            ],
            rich: [
                { q: '这么多！做什么这么赚钱？', responses: ['运气好', '努力吧', '行业红利'] },
                { q: '得存起来！别乱花！', responses: ['是是是', '会的', '有计划的'] }
            ]
        }
    },
    relationship: {
        questions: ['有对象了没？', '谈朋友了吗？', '处对象了没？'],
        followUps: {
            single: [
                { q: '怎么还单着呢？', responses: ['缘分没到', '太忙了', '不着急'] },
                { q: '要不要帮你介绍？', responses: ['不用了', '看看吧', '再说'] },
                { q: '是不是眼光太高了？', responses: ['没有啦', '合适的难找', '随缘吧'] }
            ],
            dating: [
                { q: '什么时候带回来看看？', responses: ['有机会吧', '下次', '过几天'] },
                { q: '对方什么条件？工作怎样？', responses: ['还不错', '挺好的', '门当户对'] },
                { q: '准备什么时候结婚？', responses: ['再处处', '明年吧', '不急'] }
            ],
            married: [
                { q: '日子过得咋样？', responses: ['挺好的', '还可以', '凑合过'] },
                { q: '打算要孩子吗？', responses: ['在计划', '顺其自然', '先不急'] }
            ],
            divorced: [
                { q: '怎么就离了呢？', responses: ['性格不合', '缘分尽了', '不说了吧'] },
                { q: '以后怎么打算？', responses: ['先一个人', '再看吧', '缘分吧'] }
            ]
        }
    },
    house: {
        questions: ['买房了没？', '在哪住？租房还是买了？'],
        followUps: {
            rent: [
                { q: '还租房呢？什么时候买？', responses: ['在攒钱', '看看吧', '房价太高'] },
                { q: '房租多少一个月？', responses: ['两三千', '挺贵的', '还行'] }
            ],
            mortgage: [
                { q: '房贷多少一个月？压力大吧？', responses: ['还好', '有点压力', '习惯了'] },
                { q: '多大的房子？几室几厅？', responses: ['两室', '小户型', '够住'] }
            ],
            owned: [
                { q: '买哪儿了？多大的？', responses: ['市区', '郊区', '不大'] },
                { q: '多少钱买的？涨了没？', responses: ['还行', '涨了点', '差不多'] }
            ]
        }
    },
    car: {
        questions: ['买车了没？', '开什么车回来的？'],
        followUps: {
            no: [
                { q: '怎么还没买车？', responses: ['不太需要', '在存钱', '以后再说'] },
                { q: '出门不方便吧？', responses: ['地铁方便', '还好', '有时打车'] }
            ],
            yes: [
                { q: '什么车？多少钱买的？', responses: ['代步车', '十几万', '不贵'] },
                { q: '一年养车费多少？', responses: ['一两万', '还好', '油钱保险'] }
            ]
        }
    }
};

// ==================== DOM ====================
let elements = {};
function initElements() {
    const ids = ['statusBar','faceValue','faceFill','mentalValue','mentalFill','moneyValue','guiltValue','guiltFill','angerValue','angerFill','relativeStatus','startScene','characterScene','gameScene','endingScene','sceneLocation','dialogueArea','optionsArea','playerInput','inputArea','eventPopup','eventIcon','eventTitle','eventText','endingTitle','endingStats','endingStory','loadingOverlay','apiKeyInput','characterPreview','childrenGroup','progressText'];
    ids.forEach(id => elements[id] = document.getElementById(id));
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function showScene(id) { document.querySelectorAll('.scene').forEach(s => s.classList.remove('active')); document.getElementById(id)?.classList.add('active'); }
function showLoading(show) { elements.loadingOverlay?.classList.toggle('active', show); gameState.isLoading = show; }
async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function updateUI() {
    const p = gameState.player;
    ['face','mental','guilt','anger'].forEach(k => p[k] = clamp(p[k], 0, 100));
    if (elements.faceValue) { elements.faceValue.textContent = p.face; elements.faceFill.style.width = p.face + '%'; }
    if (elements.mentalValue) { elements.mentalValue.textContent = p.mental; elements.mentalFill.style.width = p.mental + '%'; }
    if (elements.guiltValue) { elements.guiltValue.textContent = p.guilt; elements.guiltFill.style.width = p.guilt + '%'; }
    if (elements.angerValue) { elements.angerValue.textContent = p.anger; elements.angerFill.style.width = p.anger + '%'; }
    if (elements.moneyValue) elements.moneyValue.textContent = '¥' + p.money;
    updateRelativeStatus();
}

function updateRelativeStatus() {
    if (!elements.relativeStatus) return;
    const rs = gameState.relativeState;
    elements.relativeStatus.innerHTML = `
        <div class="relative-stat"><span>满意</span><div class="mini-bar"><div class="mini-fill satisfaction" style="width:${rs.satisfaction}%"></div></div><span class="stat-val">${rs.satisfaction}</span></div>
        <div class="relative-stat"><span>耐心</span><div class="mini-bar"><div class="mini-fill patience" style="width:${Math.min(rs.patience, 100)}%"></div></div><span class="stat-val">${rs.patience}</span></div>
        <div class="relative-stat"><span>怀疑</span><div class="mini-bar"><div class="mini-fill suspicion" style="width:${rs.suspicion}%"></div></div><span class="stat-val">${rs.suspicion}</span></div>
        <div class="relative-stat"><span>怒气</span><div class="mini-bar"><div class="mini-fill anger" style="width:${rs.anger}%"></div></div><span class="stat-val">${rs.anger}</span></div>
    `;
}

function updateProgress() {
    if (elements.progressText) elements.progressText.textContent = `第 ${gameState.currentRelativeIndex + 1}/${relativeQueue.length} 位亲戚`;
}

// ==================== 对话系统 ====================
function addDialogue(sender, avatar, text, isPlayer = false, mood = 'normal') {
    if (!elements.dialogueArea) return;
    const bubble = document.createElement('div');
    bubble.className = `dialogue-bubble ${isPlayer ? 'player' : ''} mood-${mood}`;
    bubble.innerHTML = `<div class="dialogue-sender"><span class="avatar">${avatar}</span><span>${sender}</span></div><div class="dialogue-text">${text}</div>`;
    elements.dialogueArea.appendChild(bubble);
    elements.dialogueArea.scrollTop = elements.dialogueArea.scrollHeight;
    gameState.dialogueHistory.push({ sender, text, isPlayer });
}

function addSystemMessage(text) {
    if (!elements.dialogueArea) return;
    const bubble = document.createElement('div');
    bubble.className = 'dialogue-bubble system';
    bubble.innerHTML = `<div class="dialogue-text">${text}</div>`;
    elements.dialogueArea.appendChild(bubble);
    elements.dialogueArea.scrollTop = elements.dialogueArea.scrollHeight;
}

function showEvent(icon, title, text, callback) {
    if (!elements.eventPopup) return;
    elements.eventIcon.textContent = icon;
    elements.eventTitle.textContent = title;
    elements.eventText.textContent = text;
    elements.eventPopup.classList.add('active');
    elements.eventPopup.onclick = () => { elements.eventPopup.classList.remove('active'); if (callback) callback(); };
}

// ==================== AI调用 ====================
async function callAI(prompt) {
    if (!gameState.apiKey) return null;
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gameState.apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 200 } })
        });
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e) { return null; }
}

// AI分析玩家输入类型
async function analyzeInputType(input, topic, relativeName) {
    if (!gameState.apiKey) return { type: 'normal', lie: false };
    try {
        const prompt = `你是一个中国家庭聚会对话分析器。分析以下玩家对亲戚的回复。
亲戚问的话题是：${topic}
玩家的回复是："${input}"

请判断玩家回复的类型，只返回JSON格式（不要其他文字）：
{
  "type": "counter|sarcastic|evasive|angry|normal",
  "lie": true或false（是否在吹牛/说谎）,
  "rudeness": 0-10的数字（无礼程度）,
  "confidence": 0-10的数字（底气程度）
}

判断标准：
- counter: 反问亲戚、转移话题到亲戚身上
- sarcastic: 阴阳怪气、冷嘲热讽
- evasive: 敷衍、回避问题
- angry: 明显生气、不耐烦
- normal: 正常回答`;
        
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gameState.apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 100 } })
        });
        const data = await res.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        // 尝试解析JSON
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            return JSON.parse(match[0]);
        }
    } catch (e) { console.log('AI分析失败:', e); }
    return { type: 'normal', lie: false, rudeness: 0, confidence: 5 };
}

// AI生成亲戚反应（带对话历史上下文）
async function generateRelativeReaction(rel, context, mood, playerSaid = null) {
    if (!gameState.apiKey) return null;
    try {
        // 获取最近几轮对话作为上下文
        const recentHistory = gameState.dialogueHistory.slice(-6).map(d => 
            `${d.isPlayer ? '玩家' : rel.name}：${d.text}`
        ).join('\n');
        
        const topicNames = { job: '工作', salary: '收入', relationship: '对象', house: '房子', car: '车' };
        const currentTopicName = topicNames[gameState.currentTopic] || gameState.currentTopic;
        
        const prompt = `你是中国传统亲戚"${rel.name}"（性格：${rel.personality}，刻薄程度：${rel.meanLevel}/5，保守程度：${rel.conservativeLevel}/5）。

当前话题：${currentTopicName}
${playerSaid ? `玩家刚才说："${playerSaid}"` : ''}

最近对话：
${recentHistory}

场景：${context}
情绪：${mood}

用1句话做出反应，要求：
1. 必须直接回应玩家刚才说的内容
2. 符合中国式亲戚的说话方式
3. 口语化，带语气词
4. 根据你的性格特点做出真实反应
5. 如果玩家说了具体的东西（比如车的品牌、工资数额等），你要对此发表看法

只返回台词本身，不要引号。`;
        
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gameState.apiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 100 } })
        });
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (e) { return null; }
}

// ==================== 角色创建 ====================
function showCharacterCreation() {
    gameState.apiKey = elements.apiKeyInput?.value.trim() || '';
    showScene('characterScene');
    initCharacterForm();
    updateCharacterPreview();
}

function initCharacterForm() {
    document.querySelectorAll('.option-pills').forEach(group => {
        group.querySelectorAll('.pill').forEach(pill => {
            pill.onclick = () => {
                group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const field = group.id.replace('Options', '');
                gameState.character[field] = pill.dataset.value;
                if (field === 'relationship') {
                    elements.childrenGroup.style.display = ['married', 'divorced'].includes(pill.dataset.value) ? 'block' : 'none';
                }
                updateCharacterPreview();
            };
        });
    });
    const nameInput = document.getElementById('charName');
    if (nameInput) nameInput.oninput = () => { gameState.character.name = nameInput.value.trim() || '你'; updateCharacterPreview(); };
}

function updateCharacterPreview() {
    if (!elements.characterPreview) return;
    const c = gameState.character;
    const tags = [`${c.age}岁`, characterLabels.gender[c.gender], characterLabels.job[c.job], characterLabels.relationship[c.relationship]];
    elements.characterPreview.innerHTML = `<div class="preview-title">👤 你的秘密人设</div><div class="preview-tags">${tags.map(t => `<span class="preview-tag">${t}</span>`).join('')}</div><p class="preview-note">⚠️ 亲戚只知道你的性别和年龄，你可以选择说谎...</p>`;
}

// ==================== 游戏流程 ====================
function startGame() {
    gameState.player = { face: 50, mental: 50, money: 0, guilt: 0, anger: 0 };
    gameState.currentRelativeIndex = 0;
    gameState.knownInfo = { gender: true, age: true, looks: true };
    gameState.lies = {};
    gameState.dialogueHistory = [];
    elements.statusBar?.classList.add('visible');
    updateUI();
    startNextRelative();
}

function startNextRelative() {
    if (gameState.currentRelativeIndex >= relativeQueue.length) { endGame(); return; }
    const relKey = relativeQueue[gameState.currentRelativeIndex];
    const rel = relatives[relKey];
    gameState.currentRelative = relKey;
    gameState.relativeState = { satisfaction: 50, patience: rel.basePatience, suspicion: 0, anger: 0 };
    gameState.conversationPhase = 'greeting';
    gameState.askedTopics = [];
    if (elements.dialogueArea) elements.dialogueArea.innerHTML = '';
    elements.sceneLocation.textContent = `🏠 ${rel.name}`;
    showScene('gameScene');
    updateUI();
    updateProgress();
    setTimeout(() => runConversation(), 800);
}

async function runConversation() {
    const rel = relatives[gameState.currentRelative];
    const rs = gameState.relativeState;
    const questionCount = gameState.askedTopics.length;
    
    // 强制结束条件（优先级最高）
    if (rs.patience <= 0) { await endDialogue('patience'); return; }
    if (gameState.player.mental <= 10) { await endDialogue('breakdown'); return; }
    if (gameState.player.anger >= 90) { await endDialogue('playerAngry'); return; }
    if (rs.anger >= 80) { await endDialogue('relativeAngry'); return; } // 亲戚怒气值
    
    // 奖励条件
    if (rs.satisfaction >= rel.redPacketThreshold) { await endDialogue('happy'); return; }
    
    // 失望离开
    if (rs.satisfaction <= 10 && questionCount >= 2) { await endDialogue('unhappy'); return; }
    
    // 至少问3个话题后，根据属性随机决定是否结束
    if (questionCount >= 3 && gameState.conversationPhase === 'chatting') {
        const endChance = (rs.satisfaction / 200) + ((100 - rs.patience) / 300);
        if (Math.random() < endChance) {
            const reason = rs.satisfaction >= 50 ? 'satisfied' : 'bored';
            await endDialogue(reason);
            return;
        }
    }
    
    // 对话阶段
    if (gameState.conversationPhase === 'greeting') {
        // AI生成问候语
        let greeting;
        if (gameState.apiKey) {
            showLoading(true);
            const topicNames = { job: '工作', salary: '收入', relationship: '对象', house: '房子', car: '车' };
            greeting = await callAI(`你是中国亲戚"${rel.name}"（性格：${rel.personality}，刻薄程度${rel.meanLevel}/5，保守程度${rel.conservativeLevel}/5）。
过年了，晚辈回家来了。用1-2句话热情地打招呼，要符合你的性格特点。
要求：口语化、带情感、有个人特色。只返回台词本身。`);
            showLoading(false);
        }
        if (!greeting) greeting = pick(rel.greetings);
        addDialogue(rel.name, rel.avatar, greeting, false, 'normal');
        gameState.conversationPhase = 'chatting';
        await delay(1500);
        await runConversation();
    } else if (gameState.conversationPhase === 'chatting') {
        // 选择一个未问过的话题
        const availableTopics = Object.keys(topics).filter(t => !gameState.askedTopics.includes(t));
        if (availableTopics.length === 0) { 
            await endDialogue('done'); 
            return; 
        }
        const topic = pick(availableTopics);
        gameState.currentTopic = topic;
        gameState.currentFollowUpIndex = 0;
        gameState.askedTopics.push(topic);
        
        const topicNames = { job: '工作', salary: '收入', relationship: '对象/婚姻', house: '房子', car: '车' };
        
        // AI生成话题引入
        let question;
        if (gameState.apiKey) {
            showLoading(true);
            question = await callAI(`你是中国亲戚"${rel.name}"（性格：${rel.personality}，刻薄程度${rel.meanLevel}/5）。
你正在和晚辈聊天，${questionCount === 0 ? '刚打完招呼' : `已经聊了${questionCount}个话题`}。
现在你想问问关于"${topicNames[topic]}"的情况。

用1句话自然地引入这个话题，要求：
1. 符合你的性格特点
2. 口语化、自然
3. 可以带点试探或关心的语气
4. ${questionCount > 2 ? '可以表现出有点累了或者快要结束聊天的感觉' : ''}

只返回台词本身，不要引号。`);
            showLoading(false);
        }
        if (!question) {
            const q = pick(topics[topic].questions);
            let transition = questionCount === 0 ? '对了，' : questionCount < 3 ? '那...' : '再问个，';
            question = transition + q;
        }
        
        addDialogue(rel.name, rel.avatar, question, false, 'normal');
        rs.patience -= 3;
        updateUI();
        await delay(1000);
        renderOptions(topic);
    } else if (gameState.conversationPhase === 'followup') {
        // 追问阶段
        const topic = gameState.currentTopic;
        const value = gameState.currentTopicValue;
        let followUps = topics[topic]?.followUps?.[value];
        const topicNames = { job: '工作', salary: '收入', relationship: '对象', house: '房子', car: '车' };
        
        // 如果没有预设追问（比如自由输入的内容），尝试用AI生成动态追问
        let isDynamicFollowUp = false;
        if ((!followUps || followUps.length === 0) && gameState.apiKey && gameState.currentFollowUpIndex === 0) {
            showLoading(true);
            try {
                // 获取上一次对话内容（即玩家的回答和亲戚的反应）
                const lastDialogue = gameState.dialogueHistory[gameState.dialogueHistory.length - 2]; // 玩家说的话
                const inputContent = lastDialogue ? lastDialogue.text : value;
                
                const prompt = `你是中国亲戚"${rel.name}"（性格：${rel.personality}，刻薄程度${rel.meanLevel}/5）。
当前话题：${topicNames[topic]}
玩家刚才回答说："${inputContent}"

请针对玩家的回答生成的1个追问问题，以及3个玩家可能的简短回复选项。
要求：
1. 追问要符合你的性格，哪怕玩家回答得很离谱（比如我是男同、我出家了），你也要表现出震惊并追问细节。
2. 3个回复选项要分别代表：顺从/解释、敷衍、回怼。

返回JSON格式：
{
  "question": "你的追问台词",
  "responses": ["选项1", "选项2", "选项3"]
}`;
                
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gameState.apiKey}`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: "application/json" } })
                });
                const data = await res.json();
                const jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (jsonStr) {
                    const aiFollowUp = JSON.parse(jsonStr);
                    followUps = [{ q: aiFollowUp.question, responses: aiFollowUp.responses }];
                    isDynamicFollowUp = true;
                }
            } catch (e) { console.error(e); }
            showLoading(false);
        }
        
        if (!followUps || gameState.currentFollowUpIndex >= followUps.length) {
            // 没有更多追问，继续下一个话题
            gameState.conversationPhase = 'chatting';
            await delay(500);
            await runConversation();
            return;
        }
        
        // 随机决定是否继续追问（动态追问必定触发）
        const continueChance = 0.5 + (rs.suspicion / 200);
        if (!isDynamicFollowUp && gameState.currentFollowUpIndex > 0 && Math.random() > continueChance) {
            gameState.conversationPhase = 'chatting';
            let transition;
            if (gameState.apiKey) {
                showLoading(true);
                transition = await generateRelativeReaction(rel, '你决定不再追问了，准备换个话题', '接受、正常');
                showLoading(false);
            }
            if (!transition) transition = pick(['嗯...', '行吧...', '好...']);
            addDialogue(rel.name, rel.avatar, transition, false, 'normal');
            await delay(1200);
            await runConversation();
            return;
        }
        
        // 追问
        const followUp = followUps[gameState.currentFollowUpIndex];
        let followUpQuestion = followUp.q;
        
        // 如果不是动态生成的，且有API，尝试润色预设问题
        if (!isDynamicFollowUp && gameState.apiKey) {
            // 原有的润色逻辑...
            showLoading(true);
            const enrichedQ = await callAI(`你是中国亲戚"${rel.name}"（性格：${rel.personality}）。
晚辈刚才说了关于${topicNames[topic]}的情况是"${value}"。
你想继续追问一下细节，参考问题方向：${followUp.q}

用1句话自然地追问，只返回台词本身。`);
            if (enrichedQ) followUpQuestion = enrichedQ;
            showLoading(false);
        }
        
        addDialogue(rel.name, rel.avatar, followUpQuestion, false, 'normal');
        rs.patience -= 3;
        updateUI();
        await delay(1000);
        
        // 渲染追问的回答选项
        renderFollowUpOptions(followUp);
    }
}

function renderOptions(topic) {
    if (!elements.optionsArea) return;
    elements.optionsArea.innerHTML = '';
    const char = gameState.character;
    const truthValue = char[topic];
    
    // 真话
    const truthTexts = {
        job: { none: '还在找工作呢...', private: '在一家私企', tech: '在互联网公司', state: '在体制内', freelance: '做自由职业' },
        salary: { low: '不太高，五千左右', medium: '还行，一万左右', high: '还可以，两万多', rich: '挺不错的，三万多' },
        relationship: { single: '还没有呢...', dating: '在谈着呢', married: '结婚了', divorced: '离了...' },
        house: { rent: '还在租房', mortgage: '买了，在还贷', owned: '买了' },
        car: { no: '没有呢', yes: '有' }
    };
    
    const truthText = truthTexts[topic]?.[truthValue] || '还行吧...';
    addOption('✓ ' + truthText, '如实回答', () => answerTruth(topic, truthValue, truthText), 'truth');
    
    // 谎话选项
    const lieOpts = {
        job: { none: [{ val: 'tech', text: '在互联网大厂呢', risk: 0.35 }], tech: [{ val: 'state', text: '准备考公', risk: 0.2 }], freelance: [{ val: 'tech', text: '给大厂做项目', risk: 0.25 }] },
        salary: { low: [{ val: 'medium', text: '一万左右吧', risk: 0.3 }, { val: 'high', text: '两万多', risk: 0.45 }], medium: [{ val: 'high', text: '两万多', risk: 0.35 }] },
        relationship: { single: [{ val: 'dating', text: '在谈着呢～', risk: 0.4 }, { val: 'dating', text: '有了，改天带回来', risk: 0.35 }] },
        house: { rent: [{ val: 'mortgage', text: '正在看房准备买', risk: 0.25 }, { val: 'owned', text: '买了！', risk: 0.5 }] },
        car: { no: [{ val: 'yes', text: '买了，没开回来', risk: 0.4 }] }
    };
    
    (lieOpts[topic]?.[truthValue] || []).forEach(lie => {
        addOption('🤥 ' + lie.text, `说谎 ${Math.round(lie.risk * 100)}%风险`, () => answerLie(topic, lie), 'lie');
    });
    
    // 反向拷问 - 根据话题定制
    const counterQuestions = {
        job: ['那您现在做什么呢？退休金够花吗？', '您儿子/女儿现在在哪高就啊？', '您年轻时候找工作顺利吗？'],
        salary: ['您一个月能挣多少呀？', '您家那口子工资高不高？', '问这个干嘛，要借钱？'],
        relationship: ['您家孩子结婚了没？', '您跟叔结婚的时候多大来着？', '您介绍的那些都靠谱吗？'],
        house: ['您那房子现在值多少钱了？', '您买房的时候多少钱一平？现在涨了吧！', '您打算给孩子买房吗？'],
        car: ['您开的什么车呀？', '您那车开了多少年了？', '您那车保养贵不贵？']
    };
    const counterQ = pick(counterQuestions[topic] || ['那您呢？']);
    addOption('🔄 ' + counterQ, '反将一军 ⚡刺激', () => answerCounter(topic, counterQ), 'counter');
    
    // 敷衍
    addOption('😅 还行吧...', '含糊其辞', () => answerVague(topic), 'evade');
    
    // 拒绝
    addOption('😤 这是我私事！', '拒绝回答', () => answerRefuse(topic), 'reject');
    
    // 阴阳怪气（新增）
    const sarcasticLines = {
        job: '哎呀，这不是过年嘛，别聊工作了～',
        salary: '工资都给房东和房贷了，说了也伤心～',
        relationship: '这年头一个人挺好的，自由～',
        house: '房价太高了，等降降再说吧～',
        car: '环保出行，为地球做贡献～'
    };
    addOption('😏 ' + sarcasticLines[topic], '阴阳怪气', () => answerSarcastic(topic, sarcasticLines[topic]), 'sarcastic');
    
    // 自由输入
    if (elements.inputArea) elements.inputArea.style.display = 'flex';
}

function addOption(text, hint, callback, type) {
    const btn = document.createElement('button');
    btn.className = `option-btn ${type}`;
    btn.innerHTML = `${text}<span class="option-effect">${hint}</span>`;
    btn.onclick = callback;
    elements.optionsArea.appendChild(btn);
}

// 渲染追问的回答选项
function renderFollowUpOptions(followUp) {
    if (!elements.optionsArea) return;
    elements.optionsArea.innerHTML = '';
    
    // 预设回答选项
    followUp.responses.forEach(resp => {
        addOption(resp, '简短回答', async () => {
            clearOptions();
            addDialogue('我', '😊', resp, true);
            
            const rs = gameState.relativeState;
            const rel = relatives[gameState.currentRelative];
            rs.patience -= 2;
            gameState.currentFollowUpIndex++;
            updateUI();
            
            await delay(800);
            
            // AI生成回应
            let reaction;
            if (gameState.apiKey) {
                showLoading(true);
                reaction = await generateRelativeReaction(rel, `玩家回答了："${resp}"`, '正常、继续追问或接受', resp);
                showLoading(false);
            }
            if (!reaction) reaction = pick(['哦...', '嗯嗯...', '这样啊...', '行吧...']);
            addDialogue(rel.name, rel.avatar, reaction, false, 'normal');
            
            await delay(1000);
            await runConversation();
        }, 'truth');
    });
    
    // 敷衍选项
    addOption('😅 那个...不太好说...', '含糊过去', async () => {
        clearOptions();
        addDialogue('我', '😅', '那个...不太好说...', true);
        
        const rs = gameState.relativeState;
        const rel = relatives[gameState.currentRelative];
        rs.satisfaction -= 5;
        rs.suspicion += 5;
        gameState.conversationPhase = 'chatting';
        updateUI();
        
        await delay(800);
        let reaction;
        if (gameState.apiKey) {
            showLoading(true);
            reaction = await generateRelativeReaction(rel, '玩家含糊其辞不愿意说', '不满、怀疑', '那个...不太好说...');
            showLoading(false);
        }
        if (!reaction) reaction = pick(['有什么不好说的？算了算了...', '吞吞吐吐的...', '行吧行吧...']);
        addDialogue(rel.name, rel.avatar, reaction, false, 'sarcastic');
        
        await delay(1200);
        await runConversation();
    }, 'evade');
    
    // 表达不满
    addOption('😤 问这么多干嘛...', '表达不耐烦', async () => {
        clearOptions();
        addDialogue('我', '😤', '问这么多干嘛...', true);
        
        const rs = gameState.relativeState;
        const p = gameState.player;
        const rel = relatives[gameState.currentRelative];
        rs.satisfaction -= 15;
        rs.anger += 20;
        p.anger += 10;
        gameState.conversationPhase = 'chatting';
        updateUI();
        
        await delay(800);
        let reaction;
        if (gameState.apiKey) {
            showLoading(true);
            reaction = await generateRelativeReaction(rel, '玩家不耐烦地说"问这么多干嘛"', '生气、受伤', '问这么多干嘛...');
            showLoading(false);
        }
        if (!reaction) reaction = pick([rel.reactions.angry, '问问怎么了！关心你还有错了！', '什么态度！']);
        addDialogue(rel.name, rel.avatar, reaction, false, 'angry');
        
        await delay(1500);
        await runConversation();
    }, 'reject');
    
    // 自由输入
    if (elements.inputArea) elements.inputArea.style.display = 'flex';
}

async function answerTruth(topic, value, text) {
    clearOptions();
    addDialogue('我', '😊', text, true);
    gameState.knownInfo[topic] = value;
    gameState.currentTopicValue = value; // 保存回答值用于追问
    const rs = gameState.relativeState;
    const p = gameState.player;
    
    // 根据回答好坏调整
    const badValues = { job: 'none', salary: 'low', relationship: 'single', house: 'rent', car: 'no' };
    if (badValues[topic] === value) {
        rs.satisfaction -= 10;
        p.mental -= 5;
        p.face -= 8;
    } else {
        rs.satisfaction += 8;
        rs.anger = Math.max(0, rs.anger - 5); // 顺着说消消气
    }
    rs.patience -= 5;
    updateUI();
    
    await delay(1200);
    
    // 进入追问阶段
    gameState.conversationPhase = 'followup';
    gameState.currentFollowUpIndex = 0;
    await runConversation();
}

async function answerLie(topic, lie) {
    clearOptions();
    addDialogue('我', '😊', lie.text, true);
    gameState.lies[topic] = { told: lie.val, truth: gameState.character[topic] };
    gameState.knownInfo[topic] = lie.val;
    gameState.currentTopicValue = lie.val; // 保存回答值用于追问
    
    const rs = gameState.relativeState;
    const p = gameState.player;
    rs.satisfaction += 12;
    rs.suspicion += 15;
    rs.anger = Math.max(0, rs.anger - 5); // 哄开心了消消气
    p.face += 8;
    p.guilt += 10;
    p.mental -= 3;
    updateUI();
    
    await delay(1200);
    
    // 检查是否被揭穿
    const exposureChance = lie.risk + rs.suspicion / 150;
    if (Math.random() < exposureChance) {
        await triggerExposure(topic);
    } else {
        // 进入追问阶段
        gameState.conversationPhase = 'followup';
        gameState.currentFollowUpIndex = 0;
        await runConversation();
    }
}

async function answerVague(topic) {
    clearOptions();
    addDialogue('我', '😅', '还行吧...就那样...', true);
    const rs = gameState.relativeState;
    const rel = relatives[gameState.currentRelative];
    rs.patience -= 15;
    rs.satisfaction -= 5;
    updateUI();
    
    await delay(800);
    let reaction;
    if (gameState.apiKey) {
        showLoading(true);
        reaction = await generateRelativeReaction(rel, '玩家敷衍地说"还行吧就那样"', '不满意、想追问细节', '还行吧...就那样...');
        showLoading(false);
    }
    if (!reaction) reaction = pick(['什么叫还行？具体说说！', '你这话说了等于没说！', '别糊弄我！']);
    addDialogue(rel.name, rel.avatar, reaction, false, 'sarcastic');
    
    await delay(1200);
    renderOptions(topic);
}

async function answerRefuse(topic) {
    clearOptions();
    addDialogue('我', '😤', '这是我的私事，别问了！', true);
    const rs = gameState.relativeState;
    const p = gameState.player;
    const rel = relatives[gameState.currentRelative];
    rs.satisfaction -= 20;
    rs.patience -= 25;
    rs.anger += 15;
    p.anger += 15;
    p.mental += 8;
    p.face -= 12;
    updateUI();
    
    await delay(800);
    let reaction;
    if (gameState.apiKey) {
        showLoading(true);
        reaction = await generateRelativeReaction(rel, '玩家拒绝回答说"这是我的私事别问了"', '生气、受伤、震惊', '这是我的私事，别问了！');
        showLoading(false);
    }
    if (!reaction) reaction = pick(['哎呀你这孩子，问两句怎么了！', rel.reactions.angry, '什么态度！我还不是关心你！']);
    addDialogue(rel.name, rel.avatar, reaction, false, 'angry');
    
    await delay(1500);
    await runConversation();
}

// 反向拷问 - 刺激亲戚
async function answerCounter(topic, question) {
    clearOptions();
    addDialogue('我', '😏', question, true);
    
    const rs = gameState.relativeState;
    const p = gameState.player;
    const rel = relatives[gameState.currentRelative];
    
    // 亲戚被反问，怒气大增，但玩家精神提高
    rs.anger += 25;
    rs.satisfaction -= 15;
    rs.patience -= 10;
    p.mental += 15;
    p.anger -= 5;
    p.face -= 5;
    updateUI();
    
    await delay(1000);
    
    // AI生成反应
    let reaction;
    if (gameState.apiKey) {
        showLoading(true);
        reaction = await generateRelativeReaction(rel, `玩家反问你："${question}"，把话题扯到你身上了`, '被冒犯、生气、不满', question);
        showLoading(false);
    }
    
    // fallback反应
    if (!reaction) {
        const reactions = {
            low: ['这...我们不是在说我...', '你这孩子，怎么扯到我身上了...'],
            medium: ['你说什么呢！问你还问出错了！', '我问你的事，别扯我！'],
            high: ['你什么意思！敢跟长辈这么说话！', '好好好，翅膀硬了是吧！']
        };
        const level = rel.meanLevel <= 2 ? 'low' : rel.meanLevel <= 4 ? 'medium' : 'high';
        reaction = pick(reactions[level]);
    }
    addDialogue(rel.name, rel.avatar, reaction, false, 'angry');
    
    await delay(1500);
    
    // 随机：60%继续追问，40%气得换话题
    if (Math.random() < 0.6) {
        let followUp;
        if (gameState.apiKey) {
            showLoading(true);
            followUp = await generateRelativeReaction(rel, '你决定不放过这个话题，继续追问', '坚持、不满');
            showLoading(false);
        }
        if (!followUp) followUp = '别扯开话题，还没说你呢！';
        addDialogue(rel.name, rel.avatar, followUp, false, 'angry');
        await delay(1000);
        renderOptions(topic);
    } else {
        gameState.conversationPhase = 'chatting';
        await runConversation();
    }
}

// 阴阳怪气回应
async function answerSarcastic(topic, text) {
    clearOptions();
    addDialogue('我', '😏', text, true);
    
    const rs = gameState.relativeState;
    const p = gameState.player;
    const rel = relatives[gameState.currentRelative];
    
    rs.satisfaction -= 8;
    rs.suspicion += 10;
    rs.anger += 10;
    p.mental += 5;
    updateUI();
    
    await delay(800);
    
    // AI生成反应
    let reaction;
    if (gameState.apiKey) {
        showLoading(true);
        reaction = await generateRelativeReaction(rel, `玩家阴阳怪气地说："${text}"`, '困惑、不满、怀疑', text);
        showLoading(false);
    }
    if (!reaction) reaction = pick(['你这话听着怎么怪怪的...', '你这是说还是没说？', '行吧行吧...你们年轻人...']);
    addDialogue(rel.name, rel.avatar, reaction, false, 'sarcastic');
    
    gameState.currentTopicValue = 'unknown';
    gameState.conversationPhase = 'chatting';
    
    await delay(1200);
    await runConversation();
}
// 自由输入处理
async function handleFreeInput() {
    const input = elements.playerInput?.value.trim();
    if (!input || gameState.isLoading) return;
    elements.playerInput.value = '';
    clearOptions();
    
    // 狡辩模式
    if (gameState.argumentMode) {
        gameState.argumentMode = false;
        addDialogue('我', '😤', input, true);
        
        const rel = relatives[gameState.currentRelative];
        const rs = gameState.relativeState;
        const p = gameState.player;
        
        // 根据狡辩内容决定效果
        const confidentWords = ['确实', '真的', '没骗', '相信', '发誓', '保证'];
        const angryWords = ['管得着', '关你', '滚', '烦', '闭嘴'];
        
        let isAngry = angryWords.some(w => input.includes(w));
        let isConfident = confidentWords.some(w => input.includes(w));
        
        if (isAngry) {
            rs.satisfaction -= 25;
            p.anger += 25;
            p.mental += 10;
            updateUI();
            await delay(1200);
            addDialogue(rel.name, rel.avatar, pick([rel.reactions.angry, ...rel.toxicPhrases]), false, 'angry');
        } else if (isConfident) {
            // 50%概率被信、50%概率更怀疑
            if (Math.random() < 0.5) {
                rs.suspicion -= 10;
                rs.satisfaction += 5;
                updateUI();
                await delay(1200);
                addDialogue(rel.name, rel.avatar, '好吧好吧...信你一次...', false, 'normal');
            } else {
                rs.suspicion += 20;
                rs.satisfaction -= 10;
                updateUI();
                await delay(1200);
                addDialogue(rel.name, rel.avatar, '是吗...我怎么听说的不是这样呢...', false, 'sarcastic');
            }
        } else {
            rs.satisfaction -= 5;
            updateUI();
            await delay(1200);
            let response;
            if (gameState.apiKey) {
                showLoading(true);
                response = await callAI(`你是中国传统亲戚"${rel.name}"（${rel.personality}），刚抓到玩家说谎，玩家狡辩说："${input}"。用1句话质疑或讽刺，口语化。`);
                showLoading(false);
            }
            if (!response) response = pick(['是吗...', '你说的倒好听...', '行吧行吧...']);
            addDialogue(rel.name, rel.avatar, response, false, 'sarcastic');
        }
        
        await delay(1500);
        await runConversation();
        return;
    }
    
    addDialogue('我', '😊', input, true);
    
    const rs = gameState.relativeState;
    const p = gameState.player;
    const rel = relatives[gameState.currentRelative];
    const topic = gameState.currentTopic;
    
    // 使用AI分析输入（如果有API Key）
    if (gameState.apiKey) {
        showLoading(true);
        const analysis = await analyzeInputType(input, topic, rel.name);
        showLoading(false);
        
        // 根据AI分析结果处理
        if (analysis.type === 'counter') {
            // 反问亲戚
            rs.anger += 15 + analysis.rudeness * 2;
            rs.satisfaction -= 10 + analysis.rudeness;
            p.mental += 10 + analysis.confidence;
            p.face -= 5;
            updateUI();
            
            await delay(1000);
            showLoading(true);
            let reaction = await generateRelativeReaction(rel, `玩家反问了你："${input}"`, '被冒犯、生气', input);
            showLoading(false);
            if (!reaction) reaction = pick(['你这孩子！长辈问话你还反问！', '我问你呢！别扯我！']);
            addDialogue(rel.name, rel.avatar, reaction, false, 'angry');
            
            await delay(1500);
            if (Math.random() < 0.5) {
                gameState.conversationPhase = 'chatting';
                await runConversation();
            } else {
                showLoading(true);
                let followUp = await generateRelativeReaction(rel, '你决定继续追问这个话题', '坚持、不满');
                showLoading(false);
                if (!followUp) followUp = '我问你，你老实回答！';
                addDialogue(rel.name, rel.avatar, followUp, false, 'angry');
                await delay(1000);
                renderOptions(topic);
            }
            return;
        }
        
        if (analysis.type === 'sarcastic') {
            // 阴阳怪气
            rs.satisfaction -= 8;
            rs.suspicion += 8;
            rs.anger += 5 + analysis.rudeness;
            updateUI();
            
            await delay(1000);
            showLoading(true);
            let reaction = await generateRelativeReaction(rel, `玩家阴阳怪气地说："${input}"`, '困惑、不满', input);
            showLoading(false);
            if (!reaction) reaction = pick(['你这说话阴阳怪气的...', '什么意思？好好说话！']);
            addDialogue(rel.name, rel.avatar, reaction, false, 'sarcastic');
            
            await delay(1200);
            gameState.conversationPhase = 'chatting';
            await runConversation();
            return;
        }
        
        if (analysis.type === 'angry') {
            // 表达愤怒
            rs.satisfaction -= 15;
            rs.anger += 20;
            p.anger += 15;
            p.mental += 10;
            updateUI();
            
            await delay(1000);
            showLoading(true);
            let reaction = await generateRelativeReaction(rel, `玩家愤怒地说："${input}"`, '震惊、生气、受伤', input);
            showLoading(false);
            if (!reaction) reaction = pick([rel.reactions.angry, '什么态度！']);
            addDialogue(rel.name, rel.avatar, reaction, false, 'angry');
            
            await delay(1500);
            await runConversation();
            return;
        }
        
        if (analysis.type === 'evasive') {
            // 敷衍
            rs.satisfaction -= 5;
            rs.patience -= 10;
            updateUI();
            
            await delay(1000);
            showLoading(true);
            let reaction = await generateRelativeReaction(rel, `玩家含糊其辞："${input}"`, '不满意、想追问', input);
            showLoading(false);
            if (!reaction) reaction = pick(['什么叫还行？具体说说！', '你这话说了等于没说！']);
            addDialogue(rel.name, rel.avatar, reaction, false, 'sarcastic');
            
            await delay(1200);
            renderOptions(topic);
            return;
        }
        
        // 检测是否说谎
        if (analysis.lie) {
            const truthValue = gameState.character[topic];
            const badValues = { job: 'none', salary: 'low', relationship: 'single', house: 'rent', car: 'no' };
            
            if (badValues[topic] === truthValue) {
                gameState.lies[topic] = { told: 'good', truth: truthValue };
                rs.suspicion += 20;
                p.guilt += 12;
                p.face += 10;
                
                if (Math.random() < 0.3 + rs.suspicion / 200) {
                    updateUI();
                    await delay(1000);
                    await triggerExposure(topic);
                    return;
                }
            }
        }
    } else {
        // 无API时的关键词检测（fallback）
        const counterKeywords = ['您呢', '你呢', '您家', '你家', '问这干嘛', '关您什么事'];
        const sarcasticKeywords = ['哈哈', '呵呵', '随便', '无所谓', '管他呢'];
        
        if (counterKeywords.some(kw => input.includes(kw))) {
            rs.anger += 20;
            rs.satisfaction -= 12;
            p.mental += 10;
            updateUI();
            await delay(1200);
            addDialogue(rel.name, rel.avatar, pick(['你这孩子！长辈问话你还反问！', '我问你呢！别扯我！']), false, 'angry');
            await delay(1500);
            gameState.conversationPhase = 'chatting';
            await runConversation();
            return;
        }
        
        if (sarcasticKeywords.some(kw => input.includes(kw))) {
            rs.satisfaction -= 8;
            rs.anger += 5;
            updateUI();
            await delay(1200);
            addDialogue(rel.name, rel.avatar, pick(['你这说话阴阳怪气的...', '什么意思？']), false, 'sarcastic');
            await delay(1200);
            gameState.conversationPhase = 'chatting';
            await runConversation();
            return;
        }
    }
    
    rs.patience -= 8;
    updateUI();
    
    await delay(1000);
    
    // AI生成自然回应
    let response;
    if (gameState.apiKey) {
        showLoading(true);
        response = await generateRelativeReaction(rel, `玩家正常回答："${input}"，话题是${topic}`, '正常、好奇');
        showLoading(false);
    }
    if (!response) response = pick(rel.fillers);
    
    addDialogue(rel.name, rel.avatar, response, false, 'normal');
    
    // 进入追问或下一话题
    gameState.conversationPhase = 'followup';
    gameState.currentFollowUpIndex = 0;
    
    await delay(1200);
    await runConversation();
}

async function triggerExposure(topic) {
    const event = pick(exposureEvents);
    const rel = relatives[gameState.currentRelative];
    const rs = gameState.relativeState;
    const p = gameState.player;
    const topicNames = { job: '工作', salary: '收入', relationship: '对象', house: '房子', car: '车' };
    
    showEvent(event.icon, event.title, event.text, async () => {
        addSystemMessage(`💢 ${event.title}！`);
        await delay(800);
        
        // AI生成揭穿台词
        let exposeLine;
        if (gameState.apiKey) {
            showLoading(true);
            exposeLine = await callAI(`你是中国亲戚"${rel.name}"（性格：${rel.personality}，刻薄程度${rel.meanLevel}/5）。
你刚刚发现晚辈在${topicNames[topic]}这件事上说谎了！

用1句话质问他/她，要求：
1. 符合你的性格
2. 表现出被欺骗的愤怒或失望
3. 口语化

只返回台词本身。`);
            showLoading(false);
        }
        if (!exposeLine) exposeLine = pick(['你刚才说的好像不对啊？', '等等，你妈之前跟我说的可不是这样！', '你是不是在糊弄我？']);
        addDialogue(rel.name, rel.avatar, exposeLine, false, 'angry');
        
        rs.satisfaction -= 25;
        rs.suspicion += 30;
        p.face -= 20;
        p.mental -= 15;
        p.guilt += 15;
        updateUI();
        
        await delay(1500);
        
        // 提供补救选项
        elements.optionsArea.innerHTML = '';
        addOption('😢 对不起，我说谎了...', '坦白从宽', async () => {
            clearOptions();
            addDialogue('我', '😢', '对不起...我刚才没说实话...', true);
            rs.satisfaction += 10;
            p.guilt += 10;
            p.mental -= 8;
            delete gameState.lies[topic];
            updateUI();
            await delay(1000);
            
            let reaction;
            if (gameState.apiKey) {
                showLoading(true);
                reaction = await generateRelativeReaction(rel, '晚辈承认说谎并道歉了', '原谅但有点失望', '对不起...我刚才没说实话...');
                showLoading(false);
            }
            if (!reaction) reaction = '唉...说实话不好吗...算了算了...下次可不许这样了！';
            addDialogue(rel.name, rel.avatar, reaction, false, 'normal');
            await delay(1500);
            await runConversation();
        }, 'truth');
        
        addOption('😤 我没说谎！你们乱传！', '死不承认', async () => {
            clearOptions();
            addDialogue('我', '😤', '我没说谎！你们别乱传！', true);
            rs.satisfaction -= 15;
            p.anger += 20;
            p.mental += 5;
            updateUI();
            await delay(1000);
            
            let reaction;
            if (gameState.apiKey) {
                showLoading(true);
                reaction = await generateRelativeReaction(rel, '晚辈拒绝承认说谎还狡辩', '生气、不相信', '我没说谎！你们别乱传！');
                showLoading(false);
            }
            if (!reaction) reaction = pick(rel.toxicPhrases);
            addDialogue(rel.name, rel.avatar, reaction, false, 'angry');
            await delay(1500);
            await runConversation();
        }, 'reject');
        
        // 显示自由输入框用于狡辩
        if (elements.inputArea) {
            elements.inputArea.style.display = 'flex';
            gameState.argumentMode = true;
            gameState.argumentTopic = topic;
        }
    });
}

async function relativeReact(topic, value) {
    const rel = relatives[gameState.currentRelative];
    const rs = gameState.relativeState;
    
    // 根据知道的信息追问
    const followUps = topics[topic]?.followUps?.[value];
    let response;
    
    if (gameState.apiKey) {
        showLoading(true);
        const prompt = `你是中国亲戚"${rel.name}"（${rel.personality}，刻薄程度${rel.meanLevel}/5）。玩家说关于${topic}是"${value}"。用1-2句话回应，可追问，口语化。`;
        response = await callAI(prompt);
        showLoading(false);
    }
    
    if (!response) {
        response = followUps ? pick(followUps) : pick(rel.fillers);
    }
    
    const mood = rs.satisfaction < 40 ? 'sarcastic' : 'normal';
    addDialogue(rel.name, rel.avatar, response, false, mood);
    
    rs.patience -= 12;
    updateUI();
    
    await delay(1500);
    await runConversation();
}

function clearOptions() {
    if (elements.optionsArea) elements.optionsArea.innerHTML = '';
    if (elements.inputArea) elements.inputArea.style.display = 'none';
}

async function endDialogue(reason) {
    clearOptions();
    const rel = relatives[gameState.currentRelative];
    const rs = gameState.relativeState;
    const p = gameState.player;
    
    let msg, farewell;
    switch (reason) {
        case 'happy':
            farewell = '不错不错！来，这是给你的红包！';
            msg = `${rel.name}非常满意，给了你一个红包！`;
            p.money += rel.redPacketAmount;
            break;
        case 'satisfied':
            farewell = pick(['好好好，聊得不错！', '行，那先这样吧！', '可以可以，挺好的！']);
            msg = `${rel.name}聊得很开心，满意地离开了`;
            if (rs.satisfaction >= 60) p.money += Math.floor(rel.redPacketAmount * 0.3);
            break;
        case 'bored':
            farewell = pick(['行了行了，不说了...', '得，先这样吧...', '唉...不聊了不聊了...']);
            msg = `${rel.name}有点无聊，找借口走开了`;
            break;
        case 'patience':
            farewell = '行了行了，不跟你说了，忙着呢...';
            msg = `${rel.name}没耐心了，走开了...`;
            break;
        case 'unhappy':
            farewell = '唉...算了，不说了...';
            msg = `${rel.name}很失望地离开了...`;
            p.guilt += 10;
            break;
        case 'breakdown':
            farewell = '你脸色不太好啊？去休息吧...';
            msg = '你已经精神恍惚了...';
            break;
        case 'playerAngry':
            farewell = '你怎么了？！气什么气！';
            msg = '你气得受不了了，拂袖而去...';
            p.face -= 15;
            break;
        case 'relativeAngry':
            farewell = '我不跟你说了！太气人了！';
            msg = `${rel.name}被彻底惹怒了，愤然离去...`;
            p.guilt += 15;
            p.mental -= 10;
            break;
        default:
            farewell = '好了好了，先不聊了！下个亲戚来了！';
            msg = `和${rel.name}的对话结束了`;
    }
    
    const angryReasons = ['playerAngry', 'relativeAngry'];
    addDialogue(rel.name, rel.avatar, farewell, false, angryReasons.includes(reason) ? 'angry' : 'normal');
    await delay(1500);
    addSystemMessage(msg);
    updateUI();
    
    await delay(2000);
    gameState.currentRelativeIndex++;
    startNextRelative();
}

async function endGame() {
    showScene('endingScene');
    const p = gameState.player;
    const lieCount = Object.keys(gameState.lies).length;
    
    let ending = '平安落地', emoji = '😌';
    if (p.mental >= 60 && p.guilt <= 30 && p.face >= 50) { ending = '游刃有余'; emoji = '🎉'; }
    else if (p.face >= 70 && p.mental <= 30) { ending = '表面光鲜'; emoji = '😅'; }
    else if (p.guilt >= 60) { ending = '心怀愧疚'; emoji = '😢'; }
    else if (p.mental <= 20) { ending = '精神崩溃'; emoji = '😵'; }
    else if (p.anger >= 70) { ending = '一触即发'; emoji = '🔥'; }
    else if (lieCount >= 3) { ending = '谎话连篇'; emoji = '🤥'; }
    else if (p.money >= 800) { ending = '红包收割'; emoji = '💰'; }
    
    elements.endingTitle.textContent = `${emoji} ${ending}`;
    elements.endingStats.innerHTML = `
        <div class="ending-stat"><div class="ending-stat-value">${p.face}</div><div class="ending-stat-label">面子</div></div>
        <div class="ending-stat"><div class="ending-stat-value">${p.mental}</div><div class="ending-stat-label">心理</div></div>
        <div class="ending-stat"><div class="ending-stat-value">${lieCount}</div><div class="ending-stat-label">谎言</div></div>
        <div class="ending-stat"><div class="ending-stat-value">¥${p.money}</div><div class="ending-stat-label">红包</div></div>
    `;
    
    const stories = {
        '游刃有余': '你成功在亲戚围攻中保持了心态和面子，真是社交高手！',
        '表面光鲜': '虽然面子保住了，但内心已经千疮百孔...回房间后你终于可以喘口气了。',
        '心怀愧疚': '"我这都是为你好"听多了，你开始怀疑自己是不是真的让家人失望了...',
        '精神崩溃': '连番轰炸下，你终于体会到什么叫"社死"...明年还敢回来吗？',
        '一触即发': '气氛已经很僵了...你决定明年找借口不回来了！',
        '谎话连篇': `为了面子编了${lieCount}个谎...希望明年不会被拆穿。`,
        '红包收割': `虽然过程艰难，但¥${p.money}的红包证明了一切！值了！`,
        '平安落地': '又一个普通的春节，你平安熬过了亲戚们的关怀...'
    };
    elements.endingStory.innerHTML = `<div class="ending-story-title">📝 过年实录</div><p>${stories[ending]}</p>`;
}

function restartGame() { showScene('startScene'); elements.statusBar?.classList.remove('visible'); }

// ==================== 初始化 ====================
window.onload = () => {
    initElements();
    showScene('startScene');
    elements.playerInput?.addEventListener('keypress', e => { if (e.key === 'Enter') handleFreeInput(); });
    const sendBtn = document.querySelector('.btn-send');
    if (sendBtn) sendBtn.onclick = handleFreeInput;
};

window.showCharacterCreation = showCharacterCreation;
window.startGame = startGame;
window.restartGame = restartGame;

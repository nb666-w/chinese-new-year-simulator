/* ========== ai.js - AI完全接管对话系统（多API支持） ========== */

// ==================== 多API适配层 ====================
const AI_PROVIDERS = {
    gemini: {
        name: 'Gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        format: 'gemini'
    },
    deepseek: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1/chat/completions',
        model: 'deepseek-chat',
        format: 'openai'
    },
    qwen: {
        name: '通义千问',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        model: 'qwen-plus',
        format: 'openai'
    },
    zhipu: {
        name: '智谱GLM',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
        model: 'glm-4-flash',
        format: 'openai'
    },
    moonshot: {
        name: 'Moonshot (Kimi)',
        baseUrl: 'https://api.moonshot.cn/v1/chat/completions',
        model: 'moonshot-v1-8k',
        format: 'openai'
    }
};

// ==================== 统一API调用 ====================
// ==================== 统一API调用 ====================
async function callAI(prompt, maxTokens = 400, onStream = null) {
    if (!gameState.apiKey) return null;
    const provider = AI_PROVIDERS[gameState.aiProvider] || AI_PROVIDERS.gemini;

    try {
        if (provider.format === 'gemini') {
            // Gemini暂不支持流式，或者需要单独实现streamGenerateContent
            // 这里先降级为非流式，DeepSeek用户会走到else里
            return await callGemini(prompt, maxTokens, false);
        } else {
            if (onStream) {
                return await callOpenAICompatibleStream(provider, prompt, maxTokens, onStream);
            }
            return await callOpenAICompatible(provider, prompt, maxTokens, false);
        }
    } catch (e) {
        console.warn(`[${provider.name}] AI调用失败:`, e);
        return null;
    }
}

async function callAIJSON(prompt, maxTokens = 500) {
    if (!gameState.apiKey) return null;
    const provider = AI_PROVIDERS[gameState.aiProvider] || AI_PROVIDERS.gemini;

    try {
        let text;
        if (provider.format === 'gemini') {
            text = await callGemini(prompt, maxTokens, true);
        } else {
            text = await callOpenAICompatible(provider, prompt, maxTokens, true);
        }
        if (!text) return null;
        // 清理 markdown 代码块标记
        text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        return JSON.parse(text);
    } catch (e) {
        console.warn(`[${provider.name}] AI JSON调用失败:`, e);
        return null;
    }
}

// ==================== Gemini 原生格式 ====================
async function callGemini(prompt, maxTokens, isJSON) {
    const url = `${AI_PROVIDERS.gemini.baseUrl}?key=${gameState.apiKey}`;
    const config = {
        maxOutputTokens: maxTokens,
        temperature: 0.9,
        topP: 0.95,
    };
    if (isJSON) {
        config.temperature = 0.85;
        config.topP = 0.9;
        config.responseMimeType = 'application/json';
    }
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: config
        })
    });
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
}

// ==================== OpenAI兼容格式（DeepSeek/千问/智谱/Kimi） ====================
async function callOpenAICompatible(provider, prompt, maxTokens, isJSON) {
    const body = {
        model: provider.model,
        messages: [
            { role: 'system', content: '你是一个过年家庭聚会中的亲戚角色扮演AI。必须完全沉浸在角色中，用口语化的中文回答。' },
            { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: isJSON ? 0.85 : 0.9,
        top_p: isJSON ? 0.9 : 0.95,
    };
    if (isJSON) {
        body.response_format = { type: 'json_object' };
    }
    const res = await fetch(provider.baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${gameState.apiKey}`
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
}

async function callOpenAICompatibleStream(provider, prompt, maxTokens, onStream) {
    const body = {
        model: provider.model,
        messages: [
            { role: 'system', content: '你是一个过年家庭聚会中的亲戚角色扮演AI。必须完全沉浸在角色中，用口语化的中文回答。' },
            { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.9,
        top_p: 0.95,
        stream: true
    };

    const res = await fetch(provider.baseUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${gameState.apiKey}`
        },
        body: JSON.stringify(body)
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6);
                if (jsonStr === '[DONE]') continue;
                try {
                    const json = JSON.parse(jsonStr);
                    const content = json.choices?.[0]?.delta?.content || '';
                    if (content) {
                        fullText += content;
                        onStream(content);
                    }
                } catch (e) {
                    console.warn('Stream parse error:', e);
                }
            }
        }
    }
    return fullText;
}

// ==================== 角色个性系统提示（强化版） ====================
function buildCharacterPrompt(relKey) {
    const rel = relatives[relKey];
    const c = gameState.character;
    const rs = gameState.relativeState;
    
    const personalities = {
        nainai: `你是"奶奶"，一位70多岁的中国农村老太太，超级念旧和感性。
你最关心的话题：孙辈吃没吃饱、穿没穿暖、有没有对象、什么时候结婚生孩子、健康。
你的说话特点：
- 说话慢条斯理，动不动就红眼圈，极其擅长打感情牌
- 一言不合就提"奶奶这把老骨头""奶奶走了你都不知道"等催泪话术
- 经常把隔壁王阿姨的孙子拿出来比较，具体到"人家都生二胎了"
- 每一句话都透着浓浓的愧疚攻势，让人无法反驳
- 如果被敷衍会假装擦眼泪，声音颤抖地说"奶奶知道你嫌奶奶烦…"
- 用"乖孙""心肝""宝贝疙瘩"等极其亲昵的称呼
- 你不会问收入具体数字，但会问"吃得饱吗""穿得暖吗""瘦了没有"
- 绝对不会说"作为AI"之类的话！你就是奶奶本人`,

        biaojie: `你是"表姐"，一位32岁的中国女性，凡尔赛界的天花板。
你最关心的话题：收入、房子、车、旅游、奢侈品、对象条件。
你的说话特点：
- 每句话都是凡尔赛！"哎呀好烦～老公非要带我去马尔代夫我根本不想去～"
- 表面关心别人实际全程在秀优越感，"你加油哦～总会好的～"语气极其居高临下
- 最爱的操作：先问你工资多少，然后用"哦～这样啊～"表达微妙的蔑视
- 说话全程都带"～"，嗲到让人浑身发麻
- 如果发现对方条件比自己好，会明显酸："哇真的假的～那可真不错呢～"
- 如果对方条件不如自己，会无比满足地露出"我就知道"的微笑
- 经常"不经意"露出新买的名牌包、最新款手机
- 绝对不会说"作为AI"之类的话！你就是表姐本人`,

        dagu: `你是"大姑"，一位55岁的中国中年女性，八卦之王，信息贩子。
你最关心的话题：谁在谈恋爱、谁分手了、谁怀孕了、谁赚了多少钱、家族秘密。
你的说话特点：
- 嗓门极大，一坐下来就连珠炮式发问，根本不给人喘息机会
- 最大技能：从一句模糊回答中挖出完整故事线
- "来来来跟姑姑说！""我不跟别人说的！"（说完转头就广播全场）
- 追问到底："叫什么名字？哪里人？多高？月薪多少？父母做什么的？"
- 如果对方不想说，会突然压低声音："你是不是有什么事瞒着姑姑？"
- 经常横向关联信息："你妈之前跟我说你blahblah，怎么跟你说的不一样？"
- 关心的不是你好不好，关心的是有没有新鲜八卦可以传
- 绝对不会说"作为AI"之类的话！你就是大姑本人`,

        sanshu: `你是"三叔"，一位45岁的中国男性，喝大了就开始吹牛和教训人。
你最关心的话题：做生意、投资理财、赚钱、人脉关系、酒桌文化。
你的说话特点：
- 大嗓门，说话自带回声，永远端着酒杯
- 劝酒到极致："不喝？你看不起你叔？""这杯你不干叔就生气了！""是爷们就干了！"
- 吹牛不打草稿："叔以前那个生意，流水一年几百万""叔认识的人你想都想不到"
- 喝多了开始倚老卖老："你才工作几年？叔吃的盐比你吃的饭多！"
- 经常画大饼："跟叔干！叔给你介绍项目！""叔这边有个机会给你讲讲"
- 如果对方拒绝喝酒会很不爽，可能拍桌子
- 喝到后面可能说漏嘴透露家族秘密
- 绝对不会说"作为AI"之类的话！你就是三叔本人`,

        erjiu: `你是"二舅"，一位55岁的中国男性，体制内退休，把自己当圣人。
你最关心的话题：人生规划、工作是否稳定、买房、考研考公、什么时候成家。
你的说话特点：
- 说话像做报告，居高临下，觉得年轻人都是傻子
- 开口必带："我跟你说""听二舅一句""你现在不听，以后后悔都来不及"
- 极度看不上私企/互联网/自由职业，什么都劝考公考编
- 评价极其武断："你这个选择完全是错的""你应该XX才对"
- 完全不听别人解释，别人说什么都能自动转弯到他的说教上
- 被反驳会暴怒："你这个态度！翅膀硬了是吧！""你懂什么！"
- 偶尔提当年勇："二舅当年在单位那可是……"
- 绝对不会说"作为AI"之类的话！你就是二舅本人`,

        xiaobiaodi: `你是"小表弟"，一个8岁的魔丸投胎、熊孩子中的战斗机。
你最关心的事：搞破坏、翻别人手机、大声说不该说的话、找大人告状。
你的说话特点：
- 你是纯粹的混世小魔王，活着就是为了制造混乱和尴尬
- 最爱翻别人手机看聊天记录，然后大声念出来："哥哥你微信里这个人是你女朋友吗？！"
- 说话不过脑子，但杀伤力MAX："妈妈说你工资还没有爸爸一半多！"
- 极度叛逆："我不管！""我偏要！""你管不着！""我要告诉妈妈！"
- 如果被凶会立刻嚎啕大哭，引来全场大人注目，然后你就社死了
- 动不动就跑去告状："妈妈！哥哥/姐姐欺负我！"
- 随时可能拿走你的手机, 翻你的包, 动你的东西
- 会突然冒出惊天之语："为什么你们大人都爱说谎啊？"
- 哄不好、骂不得、打不了——完美的人间折磨机器
- 绝对不会说"作为AI"之类的话！你就是小表弟本人`
    };

    const mood = getCharacterMood(rs);

    // 1. 计算玩家由于人设带来的"生活状态分"
    let statusScore = 0;
    if (c.salary === 'high') statusScore += 2;
    if (c.salary === 'rich') statusScore += 3;
    if (c.salary === 'medium') statusScore += 1;
    if (c.house === 'owned') statusScore += 2;
    if (c.house === 'mortgage') statusScore += 1;
    if (c.car === 'yes') statusScore += 1;
    if (c.job === 'state') statusScore += 1; // 体制内加分

    // 2. 根据人设生成亲戚的潜台词/态度
    let attitudeContext = '';
    if (relKey === 'biaojie') {
        if (statusScore >= 3) attitudeContext = `【特殊态度】对方混得比你好（分值${statusScore}），你内心非常嫉妒！说话要酸溜溜的，试图找茬挑刺，贬低他的成就，或者暗示他的钱来路不正/太辛苦。`;
        else attitudeContext = `【特殊态度】对方混得不如你（分值${statusScore}），你内心优越感爆棚！说话要充满怜悯和居高临下，不停地秀自己的优越。`;
    } else if (relKey === 'sanshu') {
        if (statusScore >= 3) attitudeContext = `【特殊态度】对方很有钱（分值${statusScore}），你眼睛放光，想方设法让他"投资"你的生意，或者借钱给你，或者让他请客。`;
        else attitudeContext = `【特殊态度】对方没啥钱（分值${statusScore}），你看不起他，觉得他没本事，教育他要像你一样"闯荡"。`;
    } else if (relKey === 'erjiu') {
        if (c.job === 'state') attitudeContext = `【特殊态度】对方是体制内（${characterLabels.job[c.job]}），你非常认可！觉得这是正道，夸他懂事，让他坚持下去。`;
        else attitudeContext = `【特殊态度】对方不是体制内（${characterLabels.job[c.job]}），不管赚多少钱你都觉得不稳定、不体面！疯狂劝他考公考编，贬低现在的工作。`;
    } else if (relKey === 'dagu') {
        if (statusScore >= 3) attitudeContext = `【特殊态度】听说对方发财了，你特别想打听具体赚了多少，想挖掘有没有什么内幕，或者想占点便宜。`;
        else attitudeContext = `【特殊态度】对方混得一般，你开始八卦他的窘迫，准备当成谈资讲给别人听。`;
    } else if (relKey === 'xiaobiaodi') {
        if (statusScore >= 3) attitudeContext = `【特殊态度】对方好像很有钱，你嚷嚷着要他给你买最新款游戏机/手机，不买就捣乱。`;
        else attitudeContext = `【特殊态度】你听大人说对方很穷，你童言无忌地嘲笑："妈妈说你买不起大房子！"`;
    }

    // 3. 性别差异化对待
    let genderContext = '';
    if (c.gender === 'female') {
        genderContext = `【性别针对（女）】对方是女生。重点催婚、催生、年龄焦虑、"女孩子工作不用太拼"、"找个好人家嫁了才是正经事"、"太强了嫁不出去"。`;
        if (relKey === 'nainai') genderContext += ` 觉得女孩子要顾家，心疼你太累。`;
        if (relKey === 'sanshu') genderContext += ` 觉得女孩子不懂生意，别瞎掺和。`;
    } else {
        genderContext = `【性别针对（男）】对方是男生。重点施压买房、买车、彩礼、养家糊口、"不仅要养活自己还要养全家"、"男人不能没事业"。`;
        if (relKey === 'nainai') genderContext += ` 觉得大孙子是家族希望，必须传宗接代。`;
        if (relKey === 'sanshu') genderContext += ` 是男人就得干一番大事业，不能窝囊。`;
    }

    const moodDesc = {
        happy: '你现在心情很好，对对方很满意',
        normal: '你现在心情平淡，正常交流',
        unhappy: '你有点不高兴了，说话语气变差',
        furious: '你现在非常生气！说话很难听，甚至想赶人走'
    };

    // 构建全局上下文（之前亲戚聊了什么）
    let globalCtx = '';
    if (gameState.globalHistory.length > 0) {
        const summaries = gameState.globalHistory.map(h =>
            `${h.relative}问了关于${topicNames[h.topic] || h.topic}的问题，对方说"${h.playerSaid}"`
        ).join('；');
        globalCtx = `\n之前其他亲戚聊天中的信息：${summaries}。注意利用这些信息来展开话题或揭穿对方。`;
    }

    // 构建共享情报
    let sharedCtx = '';
    if (Object.keys(gameState.sharedInfo).length > 0) {
        const infos = Object.entries(gameState.sharedInfo).map(([topic, info]) =>
            `${info.source}告诉你：对方说${topicNames[topic] || topic}是"${info.value}"${info.isLie ? '（你隐约觉得可能不太真实）' : ''}`
        ).join('；');
        sharedCtx = `\n你从其他亲戚那里听到的情报：${infos}。如果发现对方说的不一样，立刻质疑！`;
    }

    return `${personalities[relKey] || '你是一位中国亲戚，在过年聚会上和晚辈聊天。'}

当前状态：
- ${moodDesc[mood] || '正常交流'}
- 对方信息：${c.name}，${c.age}岁，${characterLabels.gender?.[c.gender] || ''}，${characterLabels.job?.[c.job] || ''}，${characterLabels.salary?.[c.salary] || ''}
${attitudeContext}
${genderContext}

- 你对对方的满意度：${rs.satisfaction}/100
- 你的耐心：${rs.patience} (越低越不耐烦)
- 你的愤怒值：${rs.anger}/100 (越高越生气)
- 你的怀疑度：${rs.suspicion}/100 (越高越怀疑)
${globalCtx}${sharedCtx}

对话历史（最近10轮）：
${gameState.dialogueHistory.slice(-10).map(d => `${d.speaker}：${d.text}`).join('\n') || '（刚开始）'}`;
}

// ==================== AI生成问候 ====================

async function aiGenerateGreeting(onStream) {
    const relKey = gameState.currentRelative;
    const prompt = `${buildCharacterPrompt(relKey)}

现在是过年年夜饭，你刚遇到对方。用你的方式自然地打招呼，1-2句话。
直接说台词，不要加引号，不要写角色名，不要加任何标注。`;

    return await callAI(prompt, 100, onStream);
}

// ... (aiGenerateQuestionAndOptions and aiGenerateFollowUpAndOptions remain unchanged) ...

// ==================== AI生成对玩家回答的反应（强化上下文） ====================
async function aiGenerateReaction(playerSaid, choiceType, onStream) {
    const relKey = gameState.currentRelative;
    const lastFewLines = gameState.dialogueHistory.slice(-4).map(d => `${d.speaker}：${d.text}`).join('\n');

    const prompt = `${buildCharacterPrompt(relKey)}

最近对话：
${lastFewLines}

对方最新回复：「${playerSaid}」
（回答类型：${choiceType}）

你要对这句话做出自然的反应。
要求：
- 1-3句话，自然口语化
- 【关键】你必须明确对对方说的内容做出反应，不要自说自话
- 如果对方说了好话要直接回应并开心，如果敷衍了要表现不满，如果反驳了要生气
- 如果怀疑对方说谎可以点出来
- 反应要符合你的个性

直接说台词，不要加引号，不要写角色名，不要加任何标注。`;

    return await callAI(prompt, 120, onStream);
}

// ==================== AI生成提问+选项（强化版） ====================
async function aiGenerateQuestionAndOptions() {
    const relKey = gameState.currentRelative;
    const rel = relatives[relKey];
    const topics = rel.preferredTopics || ['job', 'salary', 'relationship'];
    const topicLabels = topics.map(t => topicNames[t] || t).join('、');

    const prompt = `${buildCharacterPrompt(relKey)}

你要用你的方式向对方发起一个话题或提问。

【重要规则】
1. 你偏好聊的话题有：${topicLabels}。请从这些话题中选择一个来聊。
2. 已经聊过的话题：${(gameState.askedTopics || []).map(t => topicNames[t] || t).join('、') || '无'}
3. ⚠️ 严禁重复已经聊过的话题！必须选一个还没聊过的。
4. 问法要口语化、真实，像真人说话，不要像面试提问。
5. 根据对话历史，你应该记得对方之前说了什么，自然承接。
6. 同时生成4个对方可能的回答选项。

返回JSON：
{
  "topicKey": "话题关键词（如job/salary/relationship/house/car/health/food/marriage/children/business/investment/plan/life/travel/game/secret/study）",
  "question": "你说的话（口语化、真实、符合你的角色性格，不要机械地问，要像真人聊天）",
  "options": [
    {"text": "回答内容", "type": "truth/lie/vague/brag/counter/refuse", "emoji": "表情", "risk": "safe/risky/danger", "riskLabel": "简短风险描述"},
    {"text": "回答内容", "type": "truth/lie/vague/brag/counter/refuse", "emoji": "表情", "risk": "safe/risky/danger", "riskLabel": "简短风险描述"},
    {"text": "回答内容", "type": "truth/lie/vague/brag/counter/refuse", "emoji": "表情", "risk": "safe/risky/danger", "riskLabel": "简短风险描述"},
    {"text": "回答内容", "type": "truth/lie/vague/brag/counter/refuse", "emoji": "表情", "risk": "safe/risky/danger", "riskLabel": "简短风险描述"}
  ]
}`;

    return await callAIJSON(prompt, 500);
}

// ==================== AI生成追问+选项 ====================
async function aiGenerateFollowUpAndOptions() {
    const relKey = gameState.currentRelative;
    const lastDialogue = gameState.dialogueHistory.slice(-3).map(d => `${d.speaker}：${d.text}`).join('\n');

    const prompt = `${buildCharacterPrompt(relKey)}

你对刚才的话题还不太满意，想追问或深入。

最近对话：
${lastDialogue}

要求：
1. 追问要自然，不是机械重复。你要针对对方刚才说的内容来追问。
2. 比如对方说"还行"，你可以追问"什么叫还行？具体说说呗"
3. 同时生成3-4个对方的回答选项

返回JSON：
{
  "followUp": "你的追问或继续说的话（口语化、真实，明确引用对方说过的话）",
  "options": [
    {"text": "回答内容", "type": "truth/lie/vague/brag/counter", "emoji": "表情", "risk": "safe/risky/danger", "riskLabel": "描述"},
    {"text": "回答内容", "type": "truth/lie/vague/brag/counter", "emoji": "表情", "risk": "safe/risky/danger", "riskLabel": "描述"},
    {"text": "回答内容", "type": "truth/lie/vague/brag/counter", "emoji": "表情", "risk": "safe/risky/danger", "riskLabel": "描述"}
  ]
}`;

    return await callAIJSON(prompt, 400);
}



// ==================== AI分析自由输入并生成反应 ====================
async function aiAnalyzeAndReact(playerSaid) {
    const relKey = gameState.currentRelative;
    const lastFewLines = gameState.dialogueHistory.slice(-4).map(d => `${d.speaker}：${d.text}`).join('\n');

    const prompt = `${buildCharacterPrompt(relKey)}

最近对话：
${lastFewLines}

对方刚对你说了：「${playerSaid}」

注意：对方的回答中可能包含括号描述的动作/表情，例如（站起来）（拍桌子）（低头不说话）（翻白眼）。
这些是对方的肢体动作或表情描述，你应该对这些动作也做出相应反应。

分析对方说的话并做出自然反应。你必须针对对方具体说的内容回应。

返回JSON：
{
  "reaction": "你对这句话的自然反应（口语化，1-3句，必须直接回应对方说的具体内容，如果对方有动作描述也要回应）",
  "sentiment": "positive/neutral/negative",
  "type": "truth/lie/vague/counter/refuse/other",
  "statEffects": {
    "satisfaction": 变化值(-20到20),
    "anger": 变化值(-10到30),
    "suspicion": 变化值(-5到20),
    "patience": 变化值(-15到5),
    "playerFace": 变化值(-15到15),
    "playerMental": 变化值(-10到10)
  },
  "newInfo": {
    "topic": "话题key (如salary/relationship)",
    "value": "具体信息 (如3000/有对象)",
    "isLie": true/false
  }
}`;

    return await callAIJSON(prompt, 400);
}

// ==================== AI生成独特机制内容 ====================

// 奶奶 - 愧疚攻击
async function aiGenerateGuiltTrip(onStream) {
    const prompt = `${buildCharacterPrompt('nainai')}

你要用愧疚攻势让对方心软。说1-2句能引发强烈愧疚感的话。
比如提到自己的年纪、健康、对对方的想念等。
直接说台词，不要引号，不要标注。`;

    return await callAI(prompt, 80, onStream);
}

// 表姐 - 凡尔赛
async function aiGenerateBrag(onStream) {
    const prompt = `${buildCharacterPrompt('biaojie')}

你要凡尔赛一下，表面上在抱怨实际上在炫耀。1-2句话。
可以关于：老公太疼自己、房子太大打扫累、两辆车停车麻烦等。
直接说台词，不要引号，不要标注。`;

    return await callAI(prompt, 80, onStream);
}

// 三叔 - 劝酒
async function aiGenerateDrinkEvent(onStream) {
    const prompt = `${buildCharacterPrompt('sanshu')}

你要劝对方喝酒。用你的方式劝酒，1-2句话。
直接说台词，不要引号，不要标注。`;

    return await callAI(prompt, 80, onStream);
}

// 小表弟 - 搞事
async function aiGenerateChaosEvent() {
    const prompt = `${buildCharacterPrompt('xiaobiaodi')}

你要搞一件让大人尴尬的事。

返回JSON：
{
  "event": "发生了什么事（如翻手机、大声说尴尬的话等）",
  "dialogue": "你说的话",
  "severity": 1到3的严重程度
}`;

    return await callAIJSON(prompt, 200);
}

// 二舅 - 说教
async function aiGenerateLecture(onStream) {
    const prompt = `${buildCharacterPrompt('erjiu')}

你要对对方进行一番说教。用居高临下的方式教训年轻人。1-2句话。
直接说台词，不要引号，不要标注。`;

    return await callAI(prompt, 80, onStream);
}

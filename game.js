/* ========== game.js - 核心游戏逻辑 ========== */

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    setupTextboxClick();
    setupCharacterForm();
    setupEscapeButtons();
    setupProviderSelector();
    setupProviderSelector();
    setupHistory();
    setupNotebook(); // Phase 2: Init Notebook UI
    setupUIToggle(); // Initialize toggle
});

// ==================== AI提供商选择 ====================
function setupProviderSelector() {
    const select = document.getElementById('aiProviderSelect');
    const linkDiv = document.getElementById('apiProviderLink');
    if (!select || !linkDiv) return;

    const providerLinks = {
        gemini: { url: 'https://aistudio.google.com/apikey', text: '免费获取 Gemini API Key →' },
        deepseek: { url: 'https://platform.deepseek.com/api_keys', text: '获取 DeepSeek API Key →' },
        qwen: { url: 'https://dashscope.console.aliyun.com/apiKey', text: '获取通义千问 API Key →' },
        zhipu: { url: 'https://open.bigmodel.cn/usercenter/apikeys', text: '获取智谱GLM API Key →' },
        moonshot: { url: 'https://platform.moonshot.cn/console/api-keys', text: '获取 Moonshot API Key →' }
    };

    select.addEventListener('change', () => {
        const provider = select.value;
        gameState.aiProvider = provider;
        const info = providerLinks[provider];
        if (info) {
            linkDiv.innerHTML = `<a href="${info.url}" target="_blank" class="api-link">${info.text}</a>`;
        }
    });
}

// ==================== 角色创建 ====================
function showCharacterCreation() {
    gameState.apiKey = el.apiKeyInput?.value?.trim() || '';
    const providerSelect = document.getElementById('aiProviderSelect');
    if (providerSelect) gameState.aiProvider = providerSelect.value;
    showScene('characterScene');
    updateCharacterPreview();
}

function setupCharacterForm() {
    document.querySelectorAll('.option-pills').forEach(group => {
        group.querySelectorAll('.pill').forEach(pill => {
            pill.addEventListener('click', () => {
                group.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                const field = group.id.replace('Options', '');
                const val = pill.dataset.value;
                if (field === 'age') gameState.character.age = parseInt(val);
                else if (gameState.character.hasOwnProperty(field)) gameState.character[field] = val;
                if (field === 'relationship') {
                    el.childrenGroup.style.display = (val === 'married' || val === 'divorced') ? 'block' : 'none';
                }
                updateCharacterPreview();
            });
        });
    });
}

function updateCharacterPreview() {
    const c = gameState.character;
    if (el.charName?.value) c.name = el.charName.value;
    const tags = [
        characterLabels.gender?.[c.gender], `${c.age}岁`,
        characterLabels.job?.[c.job], characterLabels.salary?.[c.salary],
        characterLabels.relationship?.[c.relationship],
        characterLabels.house?.[c.house], characterLabels.car?.[c.car]
    ].filter(Boolean);
    el.characterPreview.innerHTML = `
        <div class="preview-title">📋 ${c.name || '你'} 的档案</div>
        <div class="preview-tags">${tags.map(t => `<span class="preview-tag">${t}</span>`).join('')}</div>`;
}

// ==================== 开始游戏 ====================
function startGame() {
    if (el.charName?.value) gameState.character.name = el.charName.value;
    gameState.apiKey = el.apiKeyInput?.value?.trim() || '';
    const providerSelect = document.getElementById('aiProviderSelect');
    if (providerSelect) gameState.aiProvider = providerSelect.value;

    if (!gameState.apiKey) {
        const providerName = AI_PROVIDERS[gameState.aiProvider]?.name || 'AI';
        alert(`请先输入 ${providerName} API Key！`);
        return;
    }

    gameState.currentRelativeIndex = 0;
    gameState.currentRelativeIndex = 0;
    gameState.player = { face: 50, mental: 50, money: 0, guilt: 0, anger: 0 };
    
    // Phase 2: 应用天赋加成
    if (window.applyTalentsToPlayer) {
        applyTalentsToPlayer(gameState.player);
    }
    
    gameState.sharedInfo = {};
    gameState.globalHistory = [];
    gameState.lies = {};
    gameState.escapeUses = { toilet: 2, phone: 1, mom: 1 };
    gameState.consecutiveBreakdowns = 0; // 连续心态崩溃次数
    
    // Phase 2: Roguelite & Combat 2.0
    gameState.intel = []; 
    gameState.unlockedTalents = []; 
    
    // 统计数据（用于成就）
    gameState.stats = {
        angryCount: 0,
        pleasedCount: 0,
        lieCount: 0,
        bragCount: 0,
        begCount: 0, // 卑微次数
        fightCount: 0, // 怼人次数
        breakdownCount: 0 // 总崩溃次数
    };
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
    gameState.questionCount = 0;
    gameState.consecutivePositive = 0;
    gameState.consecutiveNegative = 0;
    gameState.moodMode = 'normal';
    gameState.dialogueHistory = [];
    gameState.argumentMode = false;
    gameState.currentFollowUpIndex = 0;

    if (el.pFace) {
        if (gameState.player.face <= 0) {
            el.pFace.textContent = '💀 已破产';
            document.body.classList.add('shameless-mode');
        } else {
            el.pFace.textContent = `😊${Math.round(gameState.player.face)}`;
            document.body.classList.remove('shameless-mode');
        }
    }
    if (el.vnLocation) el.vnLocation.textContent = `🏠 ${rel.name}`;
    showScene('gameScene');
    updateUI();
    updateProgress();
    setTimeout(() => runConversation(), 600);
}

// ==================== 核心对话循环 ====================
async function runConversation() {
    if (gameState.isLoading) return;
    const rs = gameState.relativeState;

    // 结束条件
    if (rs.patience <= 0) { await endDialogue('patience'); return; }
    if (rs.anger >= 80) { await endDialogue('anger'); return; }
    if (rs.patience <= 0) { await endDialogue('patience'); return; }
    if (rs.anger >= 80) { await endDialogue('anger'); return; }
    if (gameState.player.mental <= 0) { await triggerMentalBreakdown(); return; }

    updateMoodMode();

    // 喘息事件
    if (gameState.questionCount > 0 && gameState.questionCount % 3 === 0 && Math.random() > 0.4) {
        await triggerBreathingEvent();
    }

    if (gameState.conversationPhase === 'greeting') {
        await handleGreeting();
    } else if (gameState.conversationPhase === 'chatting') {
        await handleChatting();
    } else if (gameState.conversationPhase === 'followup') {
        await handleFollowUp();
    } else if (gameState.conversationPhase === 'unique') {
        await handleUniqueMechanic();
    }
}

// ==================== 问候 ====================
async function handleGreeting() {
    const rel = relatives[gameState.currentRelative];

    showLoading();
    let hasStarted = false;
    const onStream = (chunk) => {
        if (!hasStarted) { 
            hasStarted = true; 
            hideLoading(); 
            startStreamDialogue(rel.name, async () => {
                gameState.conversationPhase = 'chatting';
                runConversation();
            }); 
        }
        appendStreamText(chunk);
    };

    let greeting = await aiGenerateGreeting(onStream);
    
    if (!greeting) {
        hideLoading();
        greeting = pick(rel.greetings);
        if (!hasStarted) {
            startStreamDialogue(rel.name, async () => {
                gameState.conversationPhase = 'chatting';
                runConversation();
            });
            appendStreamText(greeting);
        }
    }
    finishStream();
}

// ==================== 聊天（AI一次性生成提问+选项） ====================
async function handleChatting() {
    const rel = relatives[gameState.currentRelative];

    if (gameState.questionCount >= 5) {
        await endDialogue('natural');
        return;
    }

    // 触发独特机制
    if (gameState.questionCount > 0 && shouldTriggerUnique()) {
        gameState.conversationPhase = 'unique';
        await handleUniqueMechanic();
        return;
    }

    showLoading();
    let data = await aiGenerateQuestionAndOptions();
    hideLoading();

    if (data && data.question && data.options) {
        const topicKey = data.topicKey || 'other';
        gameState.currentTopic = topicKey;
        if (!gameState.askedTopics) gameState.askedTopics = [];
        gameState.askedTopics.push(topicKey);
        gameState.questionCount++;
        gameState.currentFollowUpIndex = 0;

        showDialogueImmediate(rel.name, data.question, () => {
            // Phase 2: 尝试触发情报收集
            triggerIntelEvent();
            presentAIOptions(data.options, topicKey);
        });
    } else {
        // AI失败时的基本fallback
        gameState.questionCount++;
        const fallbackQ = pick(['最近怎么样啊？', '工作还顺利吗？', '有没有对象啊？', '在哪儿上班呢？']);
        showDialogueImmediate(rel.name, fallbackQ, () => {
            presentMinimalOptions('other');
        });
    }
}

// ==================== 展示AI生成的选项 ====================
function presentAIOptions(aiOptions, topicKey) {
    const choices = aiOptions.map(opt => ({
        text: opt.text,
        emoji: opt.emoji || '',
        risk: opt.risk || 'safe',
        riskLabel: opt.riskLabel || '',
        dangerous: opt.risk === 'danger',
        action: () => handlePlayerChoice(opt, topicKey)
    }));

    // Phase 2: 检查是否有可用的情报进行暴击
    checkForCriticalHit(choices, topicKey);

    // 自由输入
    choices.push({
        text: '自由发挥…', emoji: '⌨️',
        risk: 'risky', riskLabel: 'AI判定',
        action: () => showFreeInput(async (text) => await handleFreeInputResponse(text, topicKey))
    });

    showChoices(choices);
}

function presentMinimalOptions(topicKey) {
    showChoices([
        { text: '还行吧', emoji: '😊', risk: 'safe', riskLabel: '安全', action: () => handlePlayerChoice({ text: '还行吧', type: 'truth' }, topicKey) },
        { text: '挺好的挺好的', emoji: '😄', risk: 'safe', riskLabel: '安全', action: () => handlePlayerChoice({ text: '挺好的', type: 'truth' }, topicKey) },
        { text: '嗯…不太方便说', emoji: '😶', risk: 'risky', riskLabel: '可能追问', action: () => handlePlayerChoice({ text: '不太方便说', type: 'vague' }, topicKey) },
        { text: '自由发挥…', emoji: '⌨️', risk: 'risky', riskLabel: 'AI判定', action: () => showFreeInput(async (t) => await handleFreeInputResponse(t, topicKey)) },
    ]);
}

// ==================== 处理玩家选择 ====================
async function handlePlayerChoice(option, topicKey) {
    const rel = relatives[gameState.currentRelative];
    const rs = gameState.relativeState;
    const type = option.type || 'truth';

    gameState.dialogueHistory.push({ speaker: gameState.character.name, text: option.text });
    // 记录全局历史（跨亲戚上下文）
    gameState.globalHistory.push({
        relative: relatives[gameState.currentRelative].name,
        topic: topicKey,
        playerSaid: option.text
    });
    gameState.globalHistory.push({
        relative: relatives[gameState.currentRelative].name,
        topic: topicKey,
        playerSaid: option.text
    });
    
    // Phase 2: 提取关键信息到八卦网络
    extractFactFromChoice(topicKey, option, relatives[gameState.currentRelative].name);
    
    applyChoiceEffects(type, topicKey);

    // 大姑情报
    if (rel.uniqueMechanic === 'intel') {
        gameState.sharedInfo[topicKey] = { value: option.text, source: rel.name, isLie: type === 'lie' };
    }

    // 说谎
    if (type === 'lie') {
        gameState.lies[topicKey] = option.text;
        if (rs.suspicion > 40 && Math.random() < 0.2) {
            await triggerExposure(topicKey);
            return;
        }
    }

    updateUI();

    // AI生成反应
    showLoading();
    let hasStarted = false;
    const onStream = (chunk) => {
        if (!hasStarted) { 
            hasStarted = true; 
            hideLoading(); 
            startStreamDialogue(rel.name, () => {
                // Determine next phase: mostly likely 'chatting' (Get Options), 
                // unless conversation is ending.
                // Re-enable simple flow: Reaction -> Options.
                gameState.conversationPhase = 'chatting';
                runConversation();
            }); 
        }
        appendStreamText(chunk);
    };

    let reaction = await aiGenerateReaction(option.text, type, onStream);
    
    if (!reaction) {
        hideLoading();
        reaction = '嗯…';
        if (!hasStarted) {
            startStreamDialogue(rel.name, () => {
                gameState.conversationPhase = 'chatting';
                runConversation();
            });
            appendStreamText(reaction);
        }
    }
    finishStream();
    
    // (Wait for stream callback to trigger next phase)
}

// ==================== stat效果 ====================
function applyChoiceEffects(type, topicKey) {
    const rs = gameState.relativeState;
    const p = gameState.player;

    switch (type) {
        case 'truth':
            rs.satisfaction += 8; rs.patience += 5; rs.anger = Math.max(0, rs.anger - 5);
            p.face += 5;
            gameState.consecutivePositive++; gameState.consecutiveNegative = 0;
            if (rs.satisfaction > 80) gameState.stats.pleasedCount++;
            break;
        case 'lie':
            rs.satisfaction += 12; rs.suspicion += 15;
            p.face += 10; p.guilt += 10; p.mental -= 3;
            gameState.consecutivePositive++; gameState.consecutiveNegative = 0;
            gameState.stats.lieCount++;
            break;
        case 'vague':
            rs.satisfaction -= 5; rs.patience -= 10; rs.suspicion += 5;
            gameState.consecutivePositive = 0;
            break;
        case 'brag':
            rs.satisfaction += 10; rs.suspicion += 10;
            p.face += 10; p.guilt += 5;
            gameState.consecutivePositive++; gameState.consecutiveNegative = 0;
            gameState.stats.bragCount++;
            break;
        case 'counter': case 'rude':
            rs.satisfaction -= 15; rs.anger += 20; rs.patience -= 15;
            p.anger += 10; p.mental += 5;
            gameState.consecutiveNegative++; gameState.consecutivePositive = 0;
            gameState.stats.fightCount++;
            if (rs.anger > 80) gameState.stats.angryCount++;
            break;
        case 'refuse':
            rs.satisfaction -= 10; rs.patience -= 8; rs.anger += 10;
            gameState.consecutiveNegative++; gameState.consecutivePositive = 0;
            break;
    }

    // ========== 破罐子破摔模式Buff/Debuff ==========
    if (gameState.player.face <= 0) {
        // Buff: 不要脸了，心态无敌（精神伤害减半）
        if (p.mental < gameState.player.mental) { // 如果mental减少了
            const damage = gameState.player.mental - p.mental;
            p.mental += Math.floor(damage / 2); 
        }
        
        // Debuff: 亲戚更生气（怒气增长加倍）
        if (rs.anger > gameState.relativeState.anger) { // 如果anger增加了
             const angerGain = rs.anger - gameState.relativeState.anger;
             rs.anger += Math.ceil(angerGain * 0.5);
        }
    }
    
    // 限制数值范围
    p.face = Math.max(0, Math.min(100, p.face));
    p.mental = Math.max(0, Math.min(100, p.mental));
}

function updateMoodMode() {
    if (gameState.consecutivePositive >= 3) gameState.moodMode = 'warm';
    else if (gameState.consecutiveNegative >= 2) gameState.moodMode = 'interrogation';
    else gameState.moodMode = 'normal';
}

// ==================== 追问 ====================
async function handleFollowUp() {
    const rel = relatives[gameState.currentRelative];
    gameState.currentFollowUpIndex++;

    showLoading();
    let data = await aiGenerateFollowUpAndOptions();
    hideLoading();

    if (data && data.followUp && data.options) {
        showDialogueImmediate(rel.name, data.followUp, () => {
            presentAIOptions(data.options, gameState.currentTopic);
        });
    } else {
        gameState.conversationPhase = 'chatting';
        runConversation();
    }
}

// ==================== 自由输入（AI分析+反应一次完成） ====================
async function handleFreeInputResponse(text, topicKey) {
    const rel = relatives[gameState.currentRelative];
    gameState.dialogueHistory.push({ speaker: gameState.character.name, text });
    gameState.globalHistory.push({
        relative: relatives[gameState.currentRelative].name,
        topic: gameState.currentTopic || 'other',
        playerSaid: text
    });

    showLoading();
    try {
        let result = await aiAnalyzeAndReact(text);
        hideLoading();

        if (result) {
            // Apply stats
            if (result.statEffects) {
                const e = result.statEffects;
                const rs = gameState.relativeState;
                const p = gameState.player;
                rs.satisfaction += (e.satisfaction || 0);
                rs.anger += (e.anger || 0);
                rs.suspicion += (e.suspicion || 0);
                rs.patience += (e.patience || 0);
                p.face += (e.playerFace || 0);
                p.mental += (e.playerMental || 0);
            }
            // Sentiment
            if (result.sentiment === 'positive') { gameState.consecutivePositive++; gameState.consecutiveNegative = 0; }
            else if (result.sentiment === 'negative') { gameState.consecutiveNegative++; gameState.consecutivePositive = 0; }
            updateUI();
    
            showDialogue(rel.name, result.reaction || '嗯…', () => {
                gameState.conversationPhase = 'chatting';
                runConversation();
            });
        } else {
             throw new Error("No result from AI");
        }
    } catch (e) {
        console.error("AI Error:", e);
        hideLoading();
        showDialogue(rel.name, '（奶奶似乎没听清…）嗯？你说啥？', () => {
            // Retry or resume?
            gameState.conversationPhase = 'chatting';
            runConversation(); 
        });
    }
}

// ==================== 独特机制 ====================
function shouldTriggerUnique() {
    const rel = relatives[gameState.currentRelative];
    if (!rel.uniqueMechanic) return false;
    if (gameState.questionCount % 2 !== 0) return false;
    return Math.random() > 0.5;
}

async function handleUniqueMechanic() {
    const rel = relatives[gameState.currentRelative];
    switch (rel.uniqueMechanic) {
        case 'guilt': await handleGuiltMechanic(); break;
        case 'brag': await handleBragMechanic(); break;
        case 'drink': await handleDrinkMechanic(); break;
        case 'chaos': await handleChaosMechanic(); break;
        case 'lecture': await handleLectureMechanic(); break;
        default: gameState.conversationPhase = 'chatting'; runConversation();
    }
}

async function handleGuiltMechanic() {
    showLoading();
    let hasStarted = false;
    const onStream = (chunk) => {
        if (!hasStarted) { hasStarted = true; hideLoading(); startStreamDialogue('奶奶', async () => { await delay(1200); showOptions(); }); }
        appendStreamText(chunk);
    };

    let line = await aiGenerateGuiltTrip(onStream);
    
    if (!line) {
        hideLoading();
        line = '唉，奶奶年纪大了，也不知道还能见你几次…';
        if (!hasStarted) { startStreamDialogue('奶奶', async () => { await delay(1200); showOptions(); }); appendStreamText(line); }
    }
    finishStream();

    function showOptions() {
        gameState.player.guilt += 12;
        gameState.player.mental -= 5;
        updateUI();
        showChoices([
            { text: '奶奶别这么说…我心里难受', emoji: '😢', risk: 'safe', riskLabel: '愧疚+', action: () => { gameState.player.guilt += 5; updateUI(); afterUnique(); } },
            { text: '我会常回来看您的', emoji: '🥲', risk: 'safe', riskLabel: '安全', action: () => { gameState.relativeState.satisfaction += 10; updateUI(); afterUnique(); } },
            { text: '(默默低下头)', emoji: '😶', risk: 'safe', riskLabel: '愧疚++', action: () => { gameState.player.guilt += 10; gameState.player.mental -= 5; updateUI(); afterUnique(); } },
            { text: '自由回复…', emoji: '⌨️', risk: 'risky', riskLabel: 'AI判定', action: () => showFreeInput(async (t) => await handleMechanicFreeReply(t)) },
        ]);
    }
}

async function handleBragMechanic() {
    showLoading();
    let hasStarted = false;
    const onStream = (chunk) => {
        if (!hasStarted) { hasStarted = true; hideLoading(); startStreamDialogue('表姐', async () => { await delay(1200); showOptions(); }); }
        appendStreamText(chunk);
    };

    let brag = await aiGenerateBrag(onStream);
    
    if (!brag) {
        hideLoading();
        brag = '唉，两套房贷真的好累～老公说不然再买一套投资吧～';
        if (!hasStarted) { startStreamDialogue('表姐', async () => { await delay(1200); showOptions(); }); appendStreamText(brag); }
    }
    finishStream();

    function showOptions() {
        showChoices([
            { text: '哇，好厉害啊姐！', emoji: '👏', risk: 'safe', riskLabel: '面子-5', action: () => { gameState.player.face -= 5; gameState.relativeState.satisfaction += 10; updateUI(); afterUnique(); } },
            { text: '是挺辛苦的…', emoji: '😏', risk: 'safe', riskLabel: '安全', action: () => { gameState.relativeState.satisfaction += 5; updateUI(); afterUnique(); } },
            { text: '…嗯呵', emoji: '🙄', risk: 'risky', riskLabel: '得罪', action: () => { gameState.relativeState.satisfaction -= 15; gameState.relativeState.anger += 10; gameState.player.mental += 5; updateUI(); afterUnique(); } },
            { text: '自由回复…', emoji: '⌨️', risk: 'risky', riskLabel: 'AI判定', action: () => showFreeInput(async (t) => await handleMechanicFreeReply(t)) },
        ]);
    }
}

async function handleDrinkMechanic() {
    showLoading();
    let hasStarted = false;
    const onStream = (chunk) => {
        if (!hasStarted) { hasStarted = true; hideLoading(); startStreamDialogue('三叔', async () => { await delay(1200); showOptions(); }); }
        appendStreamText(chunk);
    };

    let drinkLine = await aiGenerateDrinkEvent(onStream);
    
    if (!drinkLine) {
        hideLoading();
        drinkLine = '来来来，不喝不给叔面子！干了干了！';
        if (!hasStarted) { startStreamDialogue('三叔', async () => { await delay(1200); showOptions(); }); appendStreamText(drinkLine); }
    }
    finishStream();

    function showOptions() {
        showChoices([
            { text: '好，干了！', emoji: '🍺', risk: 'risky', riskLabel: '可能说漏嘴', action: async () => {
                gameState.relativeState.satisfaction += 15; gameState.player.mental -= 8; updateUI();
                if (Object.keys(gameState.lies).length > 0 && Math.random() < 0.3) {
                    const topic = pick(Object.keys(gameState.lies));
                    showDialogue(gameState.character.name, `（喝多了，不小心说了关于${topicNames[topic] || '某件事'}的真话…）`, () => triggerExposure(topic));
                } else {
                    showDialogue('三叔', '好！爷们儿！来来再来！', () => afterUnique());
                }
            }},
            { text: '我少喝一点吧…', emoji: '🥂', risk: 'safe', riskLabel: '面子-5', action: () => { gameState.relativeState.satisfaction += 5; gameState.player.face -= 5; updateUI(); afterUnique(); } },
            { text: '不好意思叔我不喝酒', emoji: '🙅', risk: 'danger', riskLabel: '不给面子', dangerous: true, action: () => { gameState.relativeState.satisfaction -= 15; gameState.relativeState.anger += 15; updateUI(); afterUnique(); } },
            { text: '自由回复…', emoji: '⌨️', risk: 'risky', riskLabel: 'AI判定', action: () => showFreeInput(async (t) => await handleMechanicFreeReply(t)) },
        ]);
    }
}

async function handleChaosMechanic() {
    showLoading();
    let data = await aiGenerateChaosEvent();
    hideLoading();

    let eventText, dialogue, severity;
    if (data) { eventText = data.event; dialogue = data.dialogue; severity = data.severity || 2; }
    else { eventText = '小表弟拿着你的手机跑了！'; dialogue = '哥哥你手机里这个人是谁呀？'; severity = 2; }

    await showEventPopup('👦', '小表弟出击！', eventText);

    showDialogueImmediate('小表弟', dialogue, () => {
        gameState.player.mental -= severity * 5;
        gameState.player.face -= severity * 5;
        updateUI();
        showChoices([
            { text: '快还给我！', emoji: '😰', risk: 'safe', riskLabel: '挽救', action: () => afterUnique() },
            { text: '…没什么没什么', emoji: '😅', risk: 'risky', riskLabel: '可疑', action: () => { gameState.relativeState.suspicion += 10; updateUI(); afterUnique(); } },
            { text: '(假装没看到)', emoji: '🙉', risk: 'safe', riskLabel: '躲开', action: () => afterUnique() },
            { text: '自由回复…', emoji: '⌨️', risk: 'risky', riskLabel: 'AI判定', action: () => showFreeInput(async (t) => await handleMechanicFreeReply(t)) },
        ]);
    });
}

async function handleLectureMechanic() {
    showLoading();
    let hasStarted = false;
    const onStream = (chunk) => {
        if (!hasStarted) { hasStarted = true; hideLoading(); startStreamDialogue('二舅', async () => { await delay(1200); showOptions(); }); }
        appendStreamText(chunk);
    };

    let lecture = await aiGenerateLecture(onStream);
    
    if (!lecture) {
        hideLoading();
        lecture = '我跟你说啊，你现在最重要的是先把事业搞好…';
        if (!hasStarted) { startStreamDialogue('二舅', async () => { await delay(1200); showOptions(); }); appendStreamText(lecture); }
    }
    finishStream();

    function showOptions() {
        showChoices([
            { text: '您说得对…', emoji: '🙇', risk: 'safe', riskLabel: '好感+', action: () => { gameState.relativeState.satisfaction += 15; gameState.player.mental -= 8; updateUI(); afterUnique(); } },
            { text: '我有自己想法', emoji: '💪', risk: 'risky', riskLabel: '可能惹怒', action: () => { gameState.relativeState.satisfaction -= 5; gameState.relativeState.anger += 10; gameState.player.mental += 5; updateUI(); afterUnique(); } },
            { text: '时代不一样了舅', emoji: '🔥', risk: 'danger', riskLabel: '怒气+20', dangerous: true, action: () => { gameState.relativeState.anger += 20; gameState.relativeState.satisfaction -= 15; gameState.player.mental += 10; updateUI(); afterUnique(); } },
            { text: '自由回复…', emoji: '⌨️', risk: 'risky', riskLabel: 'AI判定', action: () => showFreeInput(async (t) => await handleMechanicFreeReply(t)) },
        ]);
    }
}

async function handleMechanicFreeReply(text) {
    gameState.dialogueHistory.push({ speaker: gameState.character.name, text });
    
    // Add to global history too
    gameState.globalHistory.push({
        relative: relatives[gameState.currentRelative].name,
        topic: 'mechanic',
        playerSaid: text
    });

    showLoading();
    try {
        let result = await aiAnalyzeAndReact(text);
        hideLoading();

        if (!result) {
            result = { reaction: '……', statEffects: {} };
        }

        const rs = gameState.relativeState;
        const fx = result.statEffects || {};
        rs.satisfaction = Math.max(0, Math.min(100, rs.satisfaction + (fx.satisfaction || 0)));
        rs.anger = Math.max(0, Math.min(100, rs.anger + (fx.anger || 0)));
        rs.suspicion = Math.max(0, Math.min(100, rs.suspicion + (fx.suspicion || 0)));
        rs.patience = Math.max(0, Math.min(200, rs.patience + (fx.patience || 0)));
        gameState.player.face = Math.max(0, Math.min(100, gameState.player.face + (fx.playerFace || 0)));
        gameState.player.mental = Math.max(0, Math.min(100, gameState.player.mental + (fx.playerMental || 0)));
        updateUI();

        const rel = relatives[gameState.currentRelative];
        showDialogue(rel.name, result.reaction, () => afterUnique());
    } catch (e) {
        console.error("Mechanic AI Error", e);
        hideLoading();
        showDialogue(gameState.character.name, "（好像没听清）…你说啥？", () => afterUnique());
    }
}

function afterUnique() {
    gameState.conversationPhase = 'chatting';
    runConversation();
}

// ==================== 心态崩溃与结局逻辑 ====================
async function triggerMentalBreakdown() {
    gameState.stats.breakdownCount++;
    gameState.consecutiveBreakdowns++;

    // 连续两次崩溃 -> 悲惨结局
    if (gameState.consecutiveBreakdowns >= 2) {
        showScene('endingScene');
        el.endingTitle.textContent = '🏥 精神卫生中心';
        el.endingStory.textContent = '连续的“头痛欲裂”让你彻底崩溃了。大年初一，救护车的警笛声响彻小区。你成为了亲戚们接下来一整年的谈资：“那孩子，平时看着挺正常的，怎么吃个饭就疯了呢？”\n\n（达成结局：过于真实的崩溃）';
        
        // 生成悲惨统计
        el.endingStats.innerHTML = `<div style="color:#ff4d4f; text-align:center; width:100%;">心态值：断崖式下跌 (-999)</div>`;
        return;
    }

    // 第一次崩溃 -> 提示是否喘息
    hideChoices(); hideFreeInput();
    await showEventPopup('💔', '心态崩了', '你感觉天旋地转，亲戚的声音变成了嘈杂的耳鸣…\n再不离开，可能真的要出事了。');
    
    showDialogueImmediate(gameState.character.name, '（不行了…再待下去我会疯的…）', () => {
        showChoices([
            { text: '借口不舒服，去走廊透透气 (回血20)', emoji: '🌬️', risk: 'safe', riskLabel: '苟住', action: () => handleBreakdownRecovery(true) },
            { text: '彻底发疯，掀桌子不干了！', emoji: '💥', risk: 'danger', riskLabel: '结束游戏', dangerous: true, action: () => handleBreakdownRecovery(false) }
        ]);
    });
}

async function handleBreakdownRecovery(recover) {
    if (recover) {
        gameState.player.mental = 20; // 恢复到 20
        updateUI();
        showDialogue('', '你冲出餐厅，在寒风中大口喘着粗气…虽然还是很想死，但勉强能再战一轮。', () => {
             // 结束当前亲戚对话，进入下一个
             gameState.currentRelativeIndex++;
             startNextRelative();
        });
    } else {
        // 掀桌结局
        showScene('endingScene');
        el.endingTitle.textContent = '🧨 除夕夜的传说';
        el.endingStory.textContent = '你猛地站起来，一把掀翻了桌子。油汤泼了二舅一身，红烧肉飞到了大姑脸上。全场死寂。你狂笑着走出门去，留下一屋子目瞪口呆的亲戚。\n你成为了家族传说中的“那个疯子”，但你从未感觉如此自由。\n\n（达成结局：掀桌自由）';
        el.endingStats.innerHTML = '';
    }
}

// ==================== 喘息事件 ====================
async function triggerBreathingEvent() {
    const event = pick(breathingEvents);
    showEnvEvent(`[${event.title}]`, 3000);
    if (event.effect?.mental) { gameState.player.mental += event.effect.mental; updateUI(); }
    await showEventPopup(event.icon, event.title, event.text);
}

// ==================== 逃跑 ====================
function setupEscapeButtons() {
    if (el.btnToilet) el.btnToilet.onclick = () => escapeToilet();
    if (el.btnPhone) el.btnPhone.onclick = () => escapePhone();
    if (el.btnMom) el.btnMom.onclick = () => escapeMom();
    if (el.btnEnd) el.btnEnd.onclick = () => triggerRageQuit();
}

async function triggerRageQuit() {
    if (gameState.isLoading || gameState.isTyping) return;
    
    // 确认弹窗
    if (!confirm('确定要“摆烂走人”吗？\n面子将大幅下降 (-20)，亲戚好感度暴跌，但你能立刻解脱。')) return;

    gameState.player.face -= 20;
    gameState.player.mental += 10; // 虽然丢人，但这爽啊
    gameState.relativeState.satisfaction -= 30;
    gameState.relativeState.anger += 30;
    
    updateUI(); hideChoices(); hideFreeInput();
    
    await showEventPopup('👋', '摆烂走人', '你不想再装了，随便找了个借口直接开溜。\n虽然场面很尴尬，但你感觉空气都清新了。');
    await endDialogue('rage_quit');
}

async function escapeToilet() {
    if (gameState.escapeUses.toilet <= 0 || gameState.isLoading || gameState.isTyping) return;
    gameState.escapeUses.toilet--;
    gameState.relativeState.patience -= 15;
    gameState.player.mental += 10;
    updateUI(); hideChoices(); hideFreeInput();
    await showEventPopup('🚽', '战术撤退', '你借口上厕所暂时脱离了战场…精神恢复了一点。');
    gameState.conversationPhase = 'chatting'; gameState.questionCount++;
    runConversation();
}

async function escapePhone() {
    if (gameState.escapeUses.phone <= 0 || gameState.isLoading || gameState.isTyping) return;
    gameState.escapeUses.phone--;
    updateUI(); hideChoices(); hideFreeInput();
    if (Math.random() < 0.25) {
        gameState.relativeState.suspicion += 10; updateUI();
        await showEventPopup('📱', '被识破了', '亲戚注意到你手机根本没响…怀疑度上升。');
    } else {
        gameState.player.mental += 8; gameState.relativeState.patience -= 10; updateUI();
        await showEventPopup('📱', '假装接电话', '"喂？嗯嗯好的…" 争取了一点喘息时间。');
    }
    gameState.conversationPhase = 'chatting';
    runConversation();
}

async function escapeMom() {
    if (gameState.escapeUses.mom <= 0 || gameState.isLoading || gameState.isTyping) return;
    gameState.escapeUses.mom--;
    gameState.player.guilt += 10; gameState.relativeState.satisfaction += 5; gameState.player.mental += 15;
    updateUI(); hideChoices(); hideFreeInput();
    await showEventPopup('🆘', '妈妈救场', '妈妈从厨房走出来："别老问孩子了，来帮我端菜！"\n精神大幅恢复。');
    gameState.conversationPhase = 'chatting'; gameState.questionCount++;
    runConversation();
}

// ==================== 揭穿 ====================
async function triggerExposure(topicKey) {
    const event = pick(exposureEvents);
    await showEventPopup(event.icon, event.title, event.text);

    const rel = relatives[gameState.currentRelative];
    const rs = gameState.relativeState;
    rs.suspicion += 25; rs.satisfaction -= 20; rs.anger += 15;
    gameState.player.face -= 15; updateUI();

    showDialogueImmediate(rel.name, `你…你刚才说的${topicNames[topicKey] || '那件事'}是不是骗我的？！`, () => {
        showChoices([
            { text: '对不起…我说谎了', emoji: '😔', risk: 'safe', riskLabel: '坦白', action: () => {
                gameState.relativeState.anger -= 5; gameState.player.guilt += 15; updateUI();
                showDialogue(rel.name, '唉，你这孩子…', () => { gameState.conversationPhase = 'chatting'; runConversation(); });
            }},
            { text: '没有您误会了！', emoji: '😰', risk: 'danger', riskLabel: '越描越黑', dangerous: true, action: () => {
                gameState.relativeState.suspicion += 15; gameState.relativeState.anger += 10; updateUI();
                showDialogue(rel.name, '误会？那你解释解释！', () => { gameState.conversationPhase = 'chatting'; runConversation(); });
            }},
            { text: '⌨️ 自由狡辩…', emoji: '🗣️', risk: 'risky', riskLabel: 'AI判定', action: () => {
                showFreeInput(async (text) => {
                    await handleExposureFreeReply(text, topicKey);
                });
            }},
        ]);
    });
}

async function handleExposureFreeReply(text, topicKey) {
    const rel = relatives[gameState.currentRelative];
    gameState.dialogueHistory.push({ speaker: gameState.character.name, text });

    showLoading();
    const prompt = `${buildCharacterPrompt(gameState.currentRelative)}

【情境】你刚刚质问对方之前说的关于"${topicNames[topicKey] || topicKey}"的事是不是骗你的。

对方的回应：「${text}」

注意：对方的回答中可能包含括号描述的动作/表情，例如（站起来）（拍桌子）（低头不说话）。
这些是对方的肢体动作或表情描述，你应该对这些动作也做出相应反应。

你要对这个狡辩做出自然反应，并判断你的情绪变化。
要求：
- 你必须根据对方的狡辩内容做出反应，不要自说自话
- 如果狡辩合理，可以半信半疑；如果明显在胡扯，要更生气
- 反应要符合你的个性
- 如果对方做了括号里的动作，你也要对动作做出回应

返回JSON：
{
  "reaction": "你的反应台词（1-3句，口语化）",
  "believable": true/false,
  "angerChange": -10到+20之间的数字,
  "suspicionChange": -10到+15之间的数字,
  "satisfactionChange": -15到+5之间的数字
}`;

    let result = await callAIJSON(prompt, 300);
    hideLoading();

    if (!result) {
        result = { reaction: '别以为我不知道！', believable: false, angerChange: 10, suspicionChange: 10, satisfactionChange: -10 };
    }

    const rs = gameState.relativeState;
    rs.anger = Math.max(0, Math.min(100, rs.anger + (result.angerChange || 0)));
    rs.suspicion = Math.max(0, Math.min(100, rs.suspicion + (result.suspicionChange || 0)));
    rs.satisfaction = Math.max(0, Math.min(100, rs.satisfaction + (result.satisfactionChange || 0)));
    updateUI();

    showDialogue(rel.name, result.reaction, () => {
        gameState.conversationPhase = 'chatting';
        runConversation();
    });
}

// ==================== 结束 ====================
async function endDialogue(reason) {
    const rel = relatives[gameState.currentRelative];
    const rs = gameState.relativeState;
    let endText = '';

    switch (reason) {
        case 'patience': 
            endText = `${rel.name}叹了口气，走开了…`; 
            gameState.consecutiveBreakdowns = 0; // 成功结束（哪怕是负面），重置崩溃计数
            break;
        case 'anger': 
            endText = `${rel.name}气呼呼地走了。`; 
            gameState.player.face -= 15; 
            gameState.consecutiveBreakdowns = 0; // 重置
            break;
        case 'mental': 
            // 如果通过旧逻辑触发，也给予20点恢复
            endText = '你感觉头痛欲裂，借口不舒服离开了…（在走廊吹了会儿风，感觉好多了）'; 
            gameState.player.mental = Math.max(gameState.player.mental, 20); 
            // 不重置崩溃计数，因为这是崩溃
            break;
        case 'rage_quit':
            endText = `${rel.name}愣在原地，还没反应过来你就已经消失了…`;
            gameState.consecutiveBreakdowns = 0; // 主动摆烂不算崩溃，算战术撤退
            break;
        case 'natural':
            endText = `和${rel.name}的对话告一段落。`;
            // 破产状态下无法获得红包
            if (gameState.player.face > 0 && rs.satisfaction >= (rel.redPacketThreshold || 999)) {
                gameState.player.money += rel.redPacketAmount;
                endText += ` 🧧 +¥${rel.redPacketAmount}`;
            } else if (gameState.player.face <= 0 && rs.satisfaction >= (rel.redPacketThreshold || 999)) {
                 endText += ` (亲戚觉得你太不要脸，把准备好的红包收回了)`;
            }
            gameState.consecutiveBreakdowns = 0; // 完美结束，重置
            break;
    }

    updateUI();
    showDialogue('', endText, () => {
        gameState.currentRelativeIndex++;
        startNextRelative();
    });
}

function endGame() {
    const p = gameState.player;
    showScene('endingScene');

    const score = p.face + p.mental - p.guilt;
    let title;
    
    // 特殊结局判定
    if (p.face <= 0) {
        title = '🤡 小丑竟是我自己';
    } else {
        if (score >= 120) title = '🏆 社交达人';
        else if (score >= 80) title = '😊 游刃有余';
        else if (score >= 40) title = '😰 勉强过关';
        else if (score >= 0) title = '😱 社死现场';
        else title = '💀 年夜饭噩梦';
    }

    const stories = {
        '🏆 社交达人': '你在亲戚面前应对自如，面子里子都保住了！',
        '😊 游刃有余': '虽然有些小波折，但总体还行。',
        '😰 勉强过关': '这顿饭吃得真不容易…',
        '😱 社死现场': '你已经开始恐惧下一次过年了。',
        '💀 年夜饭噩梦': '你决定明年开始海外过年。永远。',
        '🤡 小丑竟是我自己': '你不顾颜面的行为彻底震惊了整个家族。大家虽然嘴上不说，但眼神里充满了...同情？现在的你，仿佛看破了红尘，在这个虚伪的社交场中获得了真正的自由。\n\n（达成结局：绝对防御）'
    };

    el.endingTitle.textContent = title;
    el.endingStats.innerHTML = `
        <div class="ending-stat"><div class="ending-stat-value">${p.face}</div><div class="ending-stat-label">面子</div></div>
        <div class="ending-stat"><div class="ending-stat-value">${p.mental}</div><div class="ending-stat-label">心理</div></div>
        <div class="ending-stat"><div class="ending-stat-value">¥${p.money}</div><div class="ending-stat-label">红包</div></div>`;
    
    // 生成成就标签
    let achievements = [];
    if (gameState.stats.angryCount >= 3) achievements.push('💣 火药桶');
    if (gameState.stats.pleasedCount >= 5) achievements.push('🌊 端水大师');
    if (gameState.stats.lieCount >= 3) achievements.push('🤥 大忽悠');
    if (gameState.stats.bragCount >= 3) achievements.push('🦚 凡尔赛大师');
    if (gameState.player.face <= 0) achievements.push('🛡️ 绝对防御');
    if (gameState.stats.fightCount >= 3) achievements.push('🥊 抬杠运动员');
    if (gameState.stats.breakdownCount > 0) achievements.push('🤕 忍辱负重');
    if (p.money >= 1000) achievements.push('💰 恭喜发财');
    if (achievements.length === 0) achievements.push('😐 平平淡淡');

    el.endingStory.innerHTML = stories[title] || '过年结束了。';
    el.endingStory.innerHTML += `<div style="margin-top:20px; border-top:1px dashed #666; padding-top:10px;">
        <div style="font-size:14px; color:#aaa; margin-bottom:8px;">获得成就：</div>
        <div style="display:flex; flex-wrap:wrap; gap:8px; justify-content:center;">
            ${achievements.map(a => `<span style="background:rgba(255,215,0,0.1); border:1px solid #d4b106; color:#d4b106; padding:2px 8px; border-radius:12px; font-size:12px;">${a}</span>`).join('')}
        </div>
    </div>`;
    
    // Phase 2: 引导至结算界面
    const restartBtn = el.endingScene.querySelector('button');
    if (restartBtn) {
        restartBtn.textContent = '🧬 前往结算';
        restartBtn.onclick = goToSettlement;
    }
}

function restartGame() { showScene('startScene'); }

// ==================== Phase 2: Roguelite 结算逻辑 ====================

function goToSettlement() {
    const points = calculateLegacyPoints(gameState);
    const data = getSaveData();
    data.legacyPoints += points;
    data.totalRuns += 1;
    saveGameData(data);
    
    document.getElementById('runPoints').textContent = `+${points}`;
    document.getElementById('totalPoints').textContent = data.legacyPoints;
    
    renderTalentTreeUI();
    showScene('settlementScene');
}

function renderTalentTreeUI() {
    const container = document.getElementById('talentTree');
    container.innerHTML = '';
    
    const data = getSaveData();
    
    Object.values(TALENT_TREE).forEach(t => {
        const level = data.talents[t.id] || 0;
        const isMax = level >= t.maxLevel;
        const canAfford = data.legacyPoints >= t.cost;
        
        const card = document.createElement('div');
        card.className = 'talent-card';
        card.style.cssText = `background:rgba(0,0,0,0.6); border:1px solid ${isMax ? '#ffd700' : '#444'}; padding:10px; border-radius:4px; text-align:center; opacity:${isMax ? 0.7 : 1}`;
        
        card.innerHTML = `
            <div style="font-size:16px; color:#ffd700; margin-bottom:4px;">${t.name} (Lv.${level}/${t.maxLevel})</div>
            <div style="font-size:12px; color:#ccc; margin-bottom:8px;">${t.description}</div>
            <button class="pixel-btn tiny" ${isMax || !canAfford ? 'disabled' : ''} style="width:100%; font-size:12px;">
                ${isMax ? '已满级' : `升级 (${t.cost}点)`}
            </button>
        `;
        
        card.querySelector('button').onclick = () => {
            if (unlockTalent(t.id)) {
                renderTalentTreeUI(); // 刷新
                document.getElementById('totalPoints').textContent = getSaveData().legacyPoints;
            }
        };
        
        container.appendChild(card);
    });
}

function startNewRun() {
    showScene('startScene');
}

// ==================== Phase 2: 情报系统逻辑 ====================

function triggerIntelEvent() {
    // 30% 概率触发
    if (Math.random() > 0.3) return;
    
    // 筛选未收集的情报
    const collectedIds = gameState.intel.map(i => i.id);
    const availableIntel = INTEL_DATA.filter(i => !collectedIds.includes(i.id));
    
    if (availableIntel.length === 0) return;
    
    const intel = pick(availableIntel);
    gameState.intel.push(intel);
    
    // 弹窗通知
    const targetName = relatives[intel.target]?.name || '亲戚';
    showEventPopup('🕵️‍♂️', '吃瓜时间', `你无意中听到了关于【${targetName}】的秘密！\n"${intel.content}"\n(已记录到情报本)`);
}

function checkForCriticalHit(choices, topicKey) {
    if (!gameState.intel || gameState.intel.length === 0) return;
    
    const currentRelKey = gameState.currentRelative;
    
    // 查找针对当前亲戚、且（可选）话题相关的情报
    // 为了增加可用性，暂时只要是针对当前亲戚的秘密都可以抛出来，或者限制话题
    // 这里放宽限制：只要是该亲戚的秘密，任何时候都能用（除了Greeting? Now we are in Chatting）
    // 或者限制：只有当对方在吹牛(brag)或者这就是相关话题时。
    // 简化：只要有针对当前亲戚的秘密，就添加一个“绝杀”选项。
    
    const validIntel = gameState.intel.filter(i => i.target === currentRelKey);
    
    validIntel.forEach(intel => {
        choices.push({
            text: `(抛出情报) 听说...${intel.content.substring(0, 10)}...`,
            emoji: '✨',
            risk: 'safe', // 暴击是安全的，必胜
            riskLabel: '弱点暴击',
            action: () => handleCriticalHit(intel)
        });
    });
}

function handleCriticalHit(intel) {
    const p = gameState.player;
    const rs = gameState.relativeState;
    
    // 效果：大获全胜
    rs.satisfaction -= 20; // 对方尴尬
    rs.anger += 40; // 对方破防（注意不要直接满怒气结束，或者设计为“沉默”）
    // 设计为：对方闭嘴，直接跳过当前话题/增加大量面子
    rs.anger = Math.min(79, rs.anger); // 卡在80爆发边缘，吓死他
    
    p.face += 20;
    p.mental += 20;
    
    gameState.dialogueHistory.push({ speaker: p.name, text: `（拿出证据）${intel.content}` });
    gameState.stats.fightCount++; // 算作反击
    
    updateUI();
    
    // 消耗情报？或者保留？设计为消耗，增加策略性。
    gameState.intel = gameState.intel.filter(i => i.id !== intel.id);
    
    showDialogueImmediate(relatives[gameState.currentRelative].name, '你...你从哪听来的？！（脸色铁青，无言以对）', () => {
         endDialogue('natural'); // 直接结束当前对话or继续？
         // 既然是绝杀，直接赢下这一轮对话
    });
}

// ==================== Phase 2: 八卦网络逻辑 ====================
function extractFactFromChoice(topic, option, sourceName) {
    // 只记录关键话题
    const keyTopics = ['salary', 'job', 'marriage', 'house', 'car', 'children'];
    if (!keyTopics.includes(topic)) return;

    // 简易提取规则：如果不是模糊回答，就记录
    if (option.type !== 'vague' && option.type !== 'refuse') {
        // 模拟流言蜚语：不管你说的是真是假，亲戚都当真的听
        // 如果是谎言，记录为"存疑"
        if (!gameState.sharedInfo) gameState.sharedInfo = {};
        
        gameState.sharedInfo[topic] = {
            source: sourceName,
            value: option.text,
            isLie: option.type === 'lie' || option.type === 'brag'
        };
        
        // 概率触发弹窗通知流言已传播
        if (Math.random() > 0.5) {
            showEnvEvent(`👂 你的回答正在家族群里传播...`);
        }
    }
}

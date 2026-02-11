/* ========== ui.js - UI操作、打字机、立绘切换 ========== */

// DOM缓存
const el = {};
function cacheDom() {
    el.startScene = document.getElementById('startScene');
    el.characterScene = document.getElementById('characterScene');
    el.gameScene = document.getElementById('gameScene');
    el.endingScene = document.getElementById('endingScene');
    el.apiKeyInput = document.getElementById('apiKeyInput');
    el.charName = document.getElementById('charName');
    el.characterForm = document.getElementById('characterForm');
    el.characterPreview = document.getElementById('characterPreview');
    el.childrenGroup = document.getElementById('childrenGroup');
    el.vnStage = document.getElementById('vnStage');
    el.vnBg = document.getElementById('vnBg');
    el.vnCharacter = document.getElementById('vnCharacter');
    el.vnCharImg = document.getElementById('vnCharImg');
    el.vnEnv = document.getElementById('vnEnv');
    el.vnLocation = document.getElementById('vnLocation');
    el.vnProgress = document.getElementById('vnProgress');
    el.vnSpeaker = document.getElementById('vnSpeaker');
    el.vnDialogue = document.getElementById('vnDialogue');
    el.vnText = document.getElementById('vnText');
    el.vnCursor = document.getElementById('vnCursor');
    el.vnTextbox = document.getElementById('vnTextbox');
    el.vnChoices = document.getElementById('vnChoices');
    el.vnInput = document.getElementById('vnInput');
    el.vnEscape = document.getElementById('vnEscape');
    el.playerInput = document.getElementById('playerInput');
    el.btnSend = document.getElementById('btnSend');
    el.pFace = document.getElementById('pFace');
    el.pMental = document.getElementById('pMental');
    el.pMoney = document.getElementById('pMoney');
    el.statSatisfaction = document.getElementById('statSatisfaction');
    el.statPatience = document.getElementById('statPatience');
    el.statAnger = document.getElementById('statAnger');
    el.statSuspicion = document.getElementById('statSuspicion');
    el.valSatisfaction = document.getElementById('valSatisfaction');
    el.valPatience = document.getElementById('valPatience');
    el.valAnger = document.getElementById('valAnger');
    el.valSuspicion = document.getElementById('valSuspicion');
    el.btnToilet = document.getElementById('btnToilet');
    el.btnPhone = document.getElementById('btnPhone');
    el.btnMom = document.getElementById('btnMom');
    el.btnEnd = document.getElementById('btnEnd');
    el.btnNotebook = document.getElementById('btnNotebook');
    el.intelModal = document.getElementById('intelModal');
    el.intelList = document.getElementById('intelList');
    el.eventPopup = document.getElementById('eventPopup');
    el.eventIcon = document.getElementById('eventIcon');
    el.eventTitle = document.getElementById('eventTitle');
    el.eventText = document.getElementById('eventText');
    el.loadingOverlay = document.getElementById('loadingOverlay');
    el.endingTitle = document.getElementById('endingTitle');
    el.endingStats = document.getElementById('endingStats');
    el.endingStory = document.getElementById('endingStory');

    checkBgImage();
}

function checkBgImage() {
    const img = new Image();
    img.onload = () => { el.vnBg.classList.remove('no-image'); };
    img.onerror = () => { el.vnBg.classList.add('no-image'); };
    img.src = 'assets/bg_livingroom.png';
}

// ==================== 场景切换 ====================
function showScene(sceneId) {
    document.querySelectorAll('.scene').forEach(s => s.classList.remove('active'));
    document.getElementById(sceneId).classList.add('active');
}

// ==================== 打字机效果 ====================
let typewriterTimer = null;
let _pendingContinue = null;

function typewrite(text, callback) {
    if (typewriterTimer) clearInterval(typewriterTimer);
    _pendingContinue = null;
    gameState.isTyping = true;
    gameState.skipTyping = false;
    el.vnText.textContent = '';
    el.vnCursor.style.display = 'none';
    hideChoices();

    let i = 0;
    const speed = 40;
    typewriterTimer = setInterval(() => {
        if (gameState.skipTyping || i >= text.length) {
            clearInterval(typewriterTimer);
            typewriterTimer = null;
            el.vnText.textContent = text;
            gameState.isTyping = false;
            gameState.isTyping = false;
            el.vnCursor.style.display = 'inline-block';
            
            // Show arrow and wait
            if (callback) {
                showNextArrow();
                _pendingContinue = callback;
            }
            return;
        }
        el.vnText.textContent += text[i];
        i++;
    }, speed);
}

function setupTextboxClick() {
    el.vnTextbox.addEventListener('click', () => {
        if (gameState.isTyping) {
            gameState.skipTyping = true;
        } else if (_pendingContinue) {
            el.vnCursor.style.display = 'none';
            // Hide Next Arrow if active
            const arrow = document.getElementById('vnNextArrow');
            if (arrow) arrow.classList.remove('active');
            
            const cb = _pendingContinue;
            _pendingContinue = null;
            cb();
        }
    });
}

function showNextArrow() {
    const arrow = document.getElementById('vnNextArrow');
    if (arrow) arrow.classList.add('active');
    // Hide cursor to avoid double triangle
    if (el.vnCursor) el.vnCursor.style.display = 'none';
}

function showReplyButton(callback) {
    const btn = document.getElementById('vnReplyBtn');
    if (btn) {
        // Dynamic Positioning handled by CSS (relative to .vn-textbox)
        // Just make it active
        btn.classList.add('active');
        btn.onclick = (e) => {
            e.stopPropagation();
            btn.classList.remove('active');
            if (callback) callback();
        };
    }
}

function showDialogue(speaker, text, callback) {
    el.vnSpeaker.textContent = speaker;
    typewrite(text, callback);
    gameState.dialogueHistory.push({ speaker, text });
    if (gameState.dialogueHistory.length > 20) gameState.dialogueHistory.shift();
}

function showDialogueImmediate(speaker, text, callback) {
    el.vnSpeaker.textContent = speaker;
    el.vnText.textContent = '';
    el.vnCursor.style.display = 'none';
    gameState.isTyping = true;
    gameState.skipTyping = false;
    _pendingContinue = null;

    let i = 0;
    if (typewriterTimer) clearInterval(typewriterTimer);
    typewriterTimer = setInterval(() => {
        if (gameState.skipTyping || i >= text.length) {
            clearInterval(typewriterTimer);
            typewriterTimer = null;
            el.vnText.textContent = text;
            gameState.isTyping = false;
            if (callback) {
                showReplyButton(callback);
            }
            return;
        }
        el.vnText.textContent += text[i];
        i++;
    }, 30);
}

// -------------------- 流式对话支持 --------------------
let _streamBuffer = '';
let _streamActive = false;
let _streamDone = false;
let _streamCallback = null;

function startStreamDialogue(speaker, onFinish) {
    el.vnSpeaker.textContent = speaker;
    el.vnText.textContent = '';
    el.vnCursor.style.display = 'none';
    gameState.isTyping = true;
    gameState.skipTyping = false;
    _pendingContinue = null;
    _streamBuffer = '';
    _streamActive = true;
    _streamDone = false;
    _streamCallback = onFinish;

    if (typewriterTimer) clearInterval(typewriterTimer);
    
    let displayIdx = 0;
    typewriterTimer = setInterval(() => {
        // 如果点击了跳过，直接显示全部现有缓冲（注意：流还在继续，所以只能显示已有的）
        if (gameState.skipTyping) {
            el.vnText.textContent = _streamBuffer;
            displayIdx = _streamBuffer.length;
            // 如果流也结束了，那就彻底结束
            if (_streamDone) {
                clearInterval(typewriterTimer);
                typewriterTimer = null;
                gameState.isTyping = false;
                _streamActive = false;
                if (_streamCallback) {
                    showNextArrow();
                    _pendingContinue = _streamCallback;
                }
            }
            return;
        }

        // 正常打字：如果显示长度小于缓冲长度，继续打
        if (displayIdx < _streamBuffer.length) {
            el.vnText.textContent += _streamBuffer[displayIdx];
            displayIdx++;
        } 
        // 缓冲区打完了，且流已标记结束 -> 真正结束
        else if (_streamDone) {
            clearInterval(typewriterTimer);
            typewriterTimer = null;
            gameState.isTyping = false;
            _streamActive = false;
            if (_streamCallback) {
               showNextArrow();
               _pendingContinue = _streamCallback;
            }
        }
        // 缓冲区打完了，但流还在继续 -> 等待新数据，什么都不做
    }, 30);
}

function appendStreamText(text) {
    _streamBuffer += text;
    // 如果处于跳过模式，实时更新显示
    if (gameState.skipTyping) {
        el.vnText.textContent = _streamBuffer;
    }
}

function finishStream() {
    _streamDone = true;
}



// ==================== 选项显示 ====================
function showChoices(options) {
    el.vnChoices.innerHTML = '';
    el.vnCursor.style.display = 'none';
    _pendingContinue = null;

    options.forEach((opt) => {
        const btn = document.createElement('button');
        btn.className = 'vn-choice';
        if (opt.dangerous) btn.classList.add('dangerous');
        if (opt.disabled) btn.classList.add('disabled');

        let label = opt.emoji ? `${opt.emoji} ${opt.text}` : opt.text;
        btn.innerHTML = label;

        if (opt.risk) {
            const tag = document.createElement('span');
            tag.className = `risk-tag ${opt.risk}`;
            tag.textContent = opt.riskLabel || (opt.risk === 'safe' ? '安全' : opt.risk === 'risky' ? '⚠️风险' : '💥危险');
            btn.appendChild(tag);
        }
        if (!opt.disabled) {
            btn.onclick = () => { hideChoices(); if (opt.action) opt.action(); };
        }
        el.vnChoices.appendChild(btn);
    });
    
    el.vnChoices.classList.add('visible');
    // Show toggle button (Top 1% feature)
    const btnToggle = document.getElementById('btnToggleUI');
    if(btnToggle) {
        btnToggle.style.display = 'block';
        btnToggle.textContent = '👁️'; // Reset icon
        el.vnChoices.classList.remove('hidden-ui'); // Reset visibility
    }
    el.vnTextbox.classList.add('collapsed');
}

function hideChoices() {
    el.vnChoices.classList.remove('visible');
    const btnToggle = document.getElementById('btnToggleUI');
    if(btnToggle) btnToggle.style.display = 'none';
    el.vnChoices.innerHTML = '';
    el.vnTextbox.classList.remove('collapsed');
}

// ==================== 自由输入 (Redesigned) ====================
function showFreeInput(onSubmit) {
    // 1. Clear existing choices but keep container or overlay?
    // We want the input to overlay the choices area or sit above it.
    el.vnChoices.innerHTML = ''; 
    el.vnChoices.classList.remove('visible'); // Hide choices container
    
    // 2. Show Input Area
    el.vnInput.style.display = 'flex';
    el.vnInput.style.zIndex = '3000'; 
    el.vnInput.style.pointerEvents = 'auto'; // Ensure clickable
    
    const input = el.vnInput.querySelector('input');
    const btn = el.vnInput.querySelector('button');
    
    input.value = '';
    input.disabled = false;
    input.placeholder = '想说什么...';
    input.focus();
    
    btn.textContent = '发送';
    btn.disabled = false;
    btn.classList.remove('loading');

    console.log('[UI] Free Input Opened');

    // 3. Define Submit Logic with Loading State
    const submit = async () => {
        const text = input.value.trim();
        console.log('[UI] Input Submit:', text);
        
        if (!text) {
            // Shake effect for empty input
            el.vnInput.classList.add('shake');
            setTimeout(() => el.vnInput.classList.remove('shake'), 500);
            return;
        }
        
        // LOCK UI: Loading State
        input.disabled = true;
        btn.disabled = true;
        btn.textContent = '思考中...';
        btn.classList.add('loading');
        
        try {
            // Call the callback (which is now async)
            // We wait for it to finish (AI generation + Dialogue start)
            await onSubmit(text);
            
            // Only hide after success (or if callback handles hiding)
            // Usually callback triggers next dialogue, so we hide input now.
            el.vnInput.style.display = 'none';
        } catch (e) {
            console.error('[UI] Input Submit Error:', e);
            // Recover UI
            input.disabled = false;
            btn.disabled = false;
            btn.textContent = '重试';
            btn.classList.remove('loading');
            input.focus();
            alert('亲戚好像没听清，请重试！');
        }
    };
    
    // 4. Bind Events (Robust)
    // Remove old listeners by cloning or direct assignment
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Stop bubbling to scene
        submit();
    };
    
    input.onkeydown = (e) => { 
        if (e.key === 'Enter') {
            e.preventDefault();
            submit(); 
        }
    };
}

function hideFreeInput() { el.vnInput.style.display = 'none'; }

// ==================== 立绘管理 ====================
const moodFileMap = {
    happy: 'happy',
    normal: 'normal',
    unhappy: 'unhappy',
    furious: 'angry'
};
const charMoodOverrides = {
    nainai: { unhappy: 'sad' }
};
const spriteLayouts = {
    nainai_sprites: { cols: 2, rows: 2, moods: { happy: [0, 0], normal: [1, 0], unhappy: [0, 1], furious: [1, 1] } },
    dagu_sprites: { cols: 2, rows: 2, moods: { happy: [0, 0], normal: [1, 0], unhappy: [0, 1], furious: [1, 1] } },
    erjiu_sprites: { cols: 2, rows: 2, moods: { happy: [0, 0], normal: [1, 0], unhappy: [0, 1], furious: [1, 1] } },
    biaojie_sprites: { cols: 4, rows: 2, moods: { happy: [0, 0], normal: [1, 0], unhappy: [2, 0], furious: [3, 0] } },
    sanshu_sprites: { cols: 2, rows: 2, moods: { happy: [0, 0], normal: [1, 0], unhappy: [0, 1], furious: [1, 1] } },
    xiaobiaodi_sprites: { cols: 2, rows: 2, moods: { happy: [0, 0], normal: [1, 0], unhappy: [0, 1], furious: [1, 1] } },
};
const charFilePrefix = {
    nainai: 'nainai', biaojie: 'biaojie', dagu: 'dagu',
    sanshu: 'sanshu', erjiu: 'erjiu', xiaobiaodi: 'xiaobiaodi',
};

const _imgCache = {};

function getCharacterMood(rs) {
    if (rs.anger >= 60) return 'furious';
    if (rs.anger >= 30 || rs.satisfaction < 30) return 'unhappy';
    if (rs.satisfaction >= 60) return 'happy';
    return 'normal';
}

function updateCharacterSprite() {
    const relKey = gameState.currentRelative;
    if (!relKey) return;
    const rel = relatives[relKey];
    const mood = getCharacterMood(gameState.relativeState);

    el.vnCharacter.className = 'vn-character';
    el.vnCharacter.classList.add(`mood-${mood}`);

    const prefix = charFilePrefix[relKey] || relKey;
    const overrides = charMoodOverrides[relKey];
    const moodSuffix = (overrides && overrides[mood]) || moodFileMap[mood] || mood;
    const singleFile = `assets/${prefix}_${moodSuffix}.png`;

    const cacheKey = singleFile;
    if (_imgCache[cacheKey] === true) {
        showCharacterImage(singleFile);
        return;
    }
    if (_imgCache[cacheKey] === false) {
        fallbackToSpriteOrEmoji(rel, mood);
        return;
    }

    const probe = new Image();
    probe.onload = () => {
        _imgCache[cacheKey] = true;
        showCharacterImage(singleFile);
    };
    probe.onerror = () => {
        _imgCache[cacheKey] = false;
        fallbackToSpriteOrEmoji(rel, mood);
    };
    probe.src = singleFile;
}

// 显示角色图片（已在后端去底）
function showCharacterImage(src) {
    if (el.charCanvas) el.charCanvas.style.display = 'none';
    
    el.vnCharImg.src = src;
    el.vnCharImg.style.display = 'block';
    // 清除可能由fallback设置的内联样式，让CSS接管
    el.vnCharImg.style.width = '';
    el.vnCharImg.style.height = '';
    el.vnCharImg.style.marginLeft = '';
    el.vnCharImg.style.marginTop = '';
    el.vnCharImg.style.objectFit = '';
    el.vnCharImg.style.mixBlendMode = ''; // 移除混合模式

    const emojiEl = el.vnCharacter.querySelector('.emoji-avatar');
    if (emojiEl) emojiEl.remove();
}

function fallbackToSpriteOrEmoji(rel, mood) {
    if (el.charCanvas) el.charCanvas.style.display = 'none';

    const spriteFile = findSpriteFile(rel.sprite);
    const layout = spriteLayouts[rel.sprite];

    if (spriteFile && layout) {
        const moodPos = layout.moods[mood] || layout.moods['normal'];
        const col = moodPos[0];
        const row = moodPos[1];

        el.vnCharImg.src = spriteFile;
        el.vnCharImg.style.display = 'block';
        el.vnCharImg.style.objectFit = 'fill';
        el.vnCharImg.style.objectPosition = 'unset';
        
        const containerW = el.vnCharacter.clientWidth || 240;
        const containerH = el.vnCharacter.clientHeight || 320;
        
        el.vnCharImg.style.width = (containerW * layout.cols) + 'px';
        el.vnCharImg.style.height = (containerH * layout.rows) + 'px';
        el.vnCharImg.style.marginLeft = -(col * containerW) + 'px';
        el.vnCharImg.style.marginTop = -(row * containerH) + 'px';

        const emojiEl = el.vnCharacter.querySelector('.emoji-avatar');
        if (emojiEl) emojiEl.remove();
    } else {
        el.vnCharImg.style.display = 'none';
        let emojiEl = el.vnCharacter.querySelector('.emoji-avatar');
        if (!emojiEl) {
            emojiEl = document.createElement('span');
            emojiEl.className = 'emoji-avatar';
            el.vnCharacter.appendChild(emojiEl);
        }
        emojiEl.textContent = rel.avatar;
    }
}

function findSpriteFile(spriteName) {
    const knownFiles = [
        'nainai_sprites_1770721032891.png',
        'dagu_sprites_1770721052034.png',
        'erjiu_sprites_1770721068244.png',
        'biaojie_sprites_1770721084104.png'
    ];
    const match = knownFiles.find(f => f.startsWith(spriteName));
    return match ? `assets/${match}` : null;
}

// ==================== 状态栏更新 ====================
function updateUI() {
    const p = gameState.player;
    const rs = gameState.relativeState;

    p.face = Math.max(0, Math.min(100, p.face));
    p.mental = Math.max(0, Math.min(100, p.mental));
    p.guilt = Math.max(0, Math.min(100, p.guilt));
    p.anger = Math.max(0, Math.min(100, p.anger));
    rs.satisfaction = Math.max(0, Math.min(100, rs.satisfaction));
    rs.patience = Math.max(0, rs.patience);
    rs.suspicion = Math.max(0, Math.min(100, rs.suspicion));
    rs.anger = Math.max(0, Math.min(100, rs.anger));

    if (el.pFace) el.pFace.textContent = `😊${p.face}`;
    if (el.pMental) el.pMental.textContent = `💚${p.mental}`;
    if (el.pMoney) el.pMoney.textContent = `🧧¥${p.money}`;

    if (el.statSatisfaction) el.statSatisfaction.style.height = `${rs.satisfaction}%`;
    if (el.statPatience) el.statPatience.style.height = `${Math.min(rs.patience, 100)}%`;
    if (el.statAnger) el.statAnger.style.height = `${rs.anger}%`;
    if (el.statSuspicion) el.statSuspicion.style.height = `${rs.suspicion}%`;
    if (el.valSatisfaction) el.valSatisfaction.textContent = rs.satisfaction;
    if (el.valPatience) el.valPatience.textContent = rs.patience;
    if (el.valAnger) el.valAnger.textContent = rs.anger;
    if (el.valSuspicion) el.valSuspicion.textContent = rs.suspicion;

    updateCharacterSprite();
    updateEscapeButtons();
}

function updateEscapeButtons() {
    const uses = gameState.escapeUses;
    if (el.btnToilet) { el.btnToilet.textContent = `🚽×${uses.toilet}`; el.btnToilet.disabled = uses.toilet <= 0; }
    if (el.btnPhone) { el.btnPhone.textContent = `📱`; el.btnPhone.disabled = uses.phone <= 0; }
    if (el.btnMom) { el.btnMom.textContent = `🆘×${uses.mom}`; el.btnMom.disabled = uses.mom <= 0; }
}

function updateProgress() {
    const idx = gameState.currentRelativeIndex + 1;
    const total = relativeQueue.length;
    if (el.vnProgress) el.vnProgress.textContent = `${idx}/${total}`;
}

function showEnvEvent(text, duration = 3000) {
    if (!el.vnEnv) return;
    el.vnEnv.textContent = text;
    el.vnEnv.classList.add('visible');
    setTimeout(() => el.vnEnv.classList.remove('visible'), duration);
}

function showEventPopup(icon, title, text) {
    return new Promise(resolve => {
        el.eventIcon.textContent = icon;
        el.eventTitle.textContent = title;
        el.eventText.textContent = text;
        el.eventPopup.classList.add('active');
        const btn = el.eventPopup.querySelector('button');
        btn.onclick = () => { el.eventPopup.classList.remove('active'); resolve(); };
    });
}

function showLoading() { gameState.isLoading = true; el.loadingOverlay.classList.add('active'); }
function hideLoading() { gameState.isLoading = false; el.loadingOverlay.classList.remove('active'); }
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// ==================== 历史记录 ====================
function setupHistory() {
    const btn = document.getElementById('btnHistory');
    const modal = document.getElementById('historyModal');
    if(btn) btn.onclick = openHistory;
    
    // Close on outside click
    window.onclick = (e) => {
        if (e.target == modal) closeHistory();
    }
}

function openHistory() {
    const modal = document.getElementById('historyModal');
    const list = document.getElementById('historyList');
    list.innerHTML = '';
    
    // 倒序显示，新的在上面？或者正序显示，新的在下面？
    // 通常是在下面，需要滚动到底部。
    gameState.dialogueHistory.forEach(d => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `<div class="history-speaker">${d.speaker}</div><div class="history-text">${d.text}</div>`;
        list.appendChild(item);
    });
    
    modal.style.display = 'flex';
    // 滚动到底部
    setTimeout(() => list.scrollTop = list.scrollHeight, 10);
}

function closeHistory() {
    document.getElementById('historyModal').style.display = 'none';
}

// ==================== UI切换 (1% Design: 选项/对话切换) ====================
function setupUIToggle() {
    const btn = document.getElementById('btnToggleUI');
    const choices = document.getElementById('vnChoices');
    
    if(!btn || !choices) return;
    
    btn.onclick = () => {
        const isHidden = choices.classList.toggle('hidden-ui');
        btn.textContent = isHidden ? '💬' : '👁️'; 
    };
}

// ==================== 情报本 (Phase 2) ====================
function setupNotebook() {
    if (el.btnNotebook) el.btnNotebook.onclick = openIntel;
    // Close on outside click
    window.onclick = (e) => {
        if (e.target == el.intelModal) closeIntel();
        if (e.target == document.getElementById('historyModal')) closeHistory();
    }
}

function openIntel() {
    if (!el.intelModal) return;
    renderIntelList();
    el.intelModal.style.display = 'flex';
}

function closeIntel() {
    if (el.intelModal) el.intelModal.style.display = 'none';
}

function renderIntelList() {
    if (!el.intelList) return;
    el.intelList.innerHTML = '';
    
    if (!gameState.intel || gameState.intel.length === 0) {
        el.intelList.innerHTML = '<div class="intel-empty" style="text-align:center; color:#888; margin-top:50px;">暂无情报，多听听墙角吧...</div>';
        return;
    }

    gameState.intel.forEach(item => {
        const div = document.createElement('div');
        div.className = 'intel-item';
        div.style.cssText = 'background:rgba(0,0,0,0.5); border:1px solid #444; margin-bottom:10px; padding:10px; border-radius:4px;';
        
        const targetName = relatives[item.target]?.name || item.target;
        div.innerHTML = `
            <div style="color:#ffd700; font-size:14px; margin-bottom:5px;">🔍 关于 ${targetName}</div>
            <div style="color:#ddd; font-size:13px;">${item.content}</div>
        `;
        el.intelList.appendChild(div);
    });
}

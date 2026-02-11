const TALENT_TREE = {
    thick_face: {
        id: 'thick_face',
        name: '🛡️ 厚脸皮',
        description: '初始面子 +20',
        cost: 100,
        maxLevel: 5,
        effect: (p) => { p.face += 20 * getTalentLevel('thick_face'); }
    },
    big_heart: {
        id: 'big_heart',
        name: '❤️ 大心脏',
        description: '初始心态 +20',
        cost: 100,
        maxLevel: 5,
        effect: (p) => { p.mental += 20 * getTalentLevel('big_heart'); }
    },
    gossip_ear: {
        id: 'gossip_ear',
        name: '👂 顺风耳',
        description: '情报收集概率 +10%',
        cost: 200,
        maxLevel: 3,
        // Logic handled in game.js triggerIntelEvent
    },
    rich_kid: {
        id: 'rich_kid',
        name: '💰 富二代',
        description: '初始资金 +500',
        cost: 300,
        maxLevel: 1,
        effect: (p) => { p.money += 500; }
    },
    vip: {
        id: 'vip',
        name: '👑 家族核心',
        description: '亲戚初始满意度 +10',
        cost: 500,
        maxLevel: 1,
        // Logic handled in game.js startNextRelative
    }
};

function getSaveData() {
    const json = localStorage.getItem('guomi_save_v2');
    return json ? JSON.parse(json) : { 
        totalRuns: 0, 
        legacyPoints: 0, 
        talents: {}, // { id: level }
        achievements: [] 
    };
}

function saveGameData(data) {
    localStorage.setItem('guomi_save_v2', JSON.stringify(data));
}

function getTalentLevel(id) {
    const data = getSaveData();
    return data.talents[id] || 0;
}

function unlockTalent(id) {
    const data = getSaveData();
    const talent = TALENT_TREE[id];
    const currentLevel = data.talents[id] || 0;
    
    if (currentLevel >= talent.maxLevel) return false;
    if (data.legacyPoints < talent.cost) return false;
    
    data.legacyPoints -= talent.cost;
    data.talents[id] = currentLevel + 1;
    saveGameData(data);
    return true;
}

function calculateLegacyPoints(gameState) {
    const p = gameState.player;
    let points = 0;
    
    // 基础分：存活的亲戚数
    points += gameState.currentRelativeIndex * 50;
    
    // 结局分
    const totalScore = p.face + p.mental;
    points += Math.floor(totalScore / 2);
    
    // 财富分
    points += Math.floor(p.money / 10);
    
    // 成就分 (每次获得成就额外+100? 简化先)
    
    return Math.max(0, points);
}

function applyTalentsToPlayer(player) {
    Object.values(TALENT_TREE).forEach(talent => {
        if (talent.effect && getTalentLevel(talent.id) > 0) {
            talent.effect(player);
        }
    });
}

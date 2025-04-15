// 全局游戏状态对象
let gameState = {
    currentPhase: 'START', // START, MAIN_EVENT, INTERLUDE, END
    currentPlayer: null,
    currentEventId: null,
    knownNPCs: {}, // { npcId: npcObject, ... }
    inventory: [], // [ { itemId: 'potion', quantity: 2 }, ... ]
    globalTags: [], // 影响全局事件或结局的TAG
    interlude: {
        actionPoints: 3, // 幕间行动点
        merchantVisited: false, // 本次幕间是否已访问商人
        availableMerchantItems: [], // 本次幕间商人提供的物品
        tavernNPCs: [] // 本次幕间酒馆刷新的NPC
    },
    // ... 其他需要追踪的状态
};

// --- 玩家类 ---
class Player {
    constructor(name, avatar = 'assets/images/default_avatar.png') {
        this.name = name;
        this.avatar = avatar;
        this.hp = 100;
        this.maxHp = 100;
        this.money = 10;
        this.stats = {
            combat: 10,
            intelligence: 10,
            charisma: 10,
            willpower: 10,
            magic: 10
        };
        this.tags = []; // 例如: ['新手', '好奇']
        this.skills = {}; // { skillId: { level: 1, description: '...' } }
        this.equippedItems = { // 示例: 记录装备的物品ID
            weapon: null,
            armor: null,
            accessory: null
        };
    }

    addTag(tag) {
        if (!this.tags.includes(tag)) {
            this.tags.push(tag);
        }
    }

    removeTag(tag) {
        this.tags = this.tags.filter(t => t !== tag);
    }

    hasTag(tag) {
        return this.tags.includes(tag);
    }

    changeStat(stat, amount) {
        if (this.stats.hasOwnProperty(stat)) {
            this.stats[stat] = Math.max(10, Math.min(100, this.stats[stat] + amount)); // 保持在10-100区间
        }
    }

    changeHp(amount) {
        this.hp = Math.max(0, Math.min(this.maxHp, this.hp + amount));
        if (this.hp === 0) {
            // 触发游戏结束
            endGame('死亡结局', '你的生命值归零...');
        }
    }

    changeMoney(amount) {
        this.money = Math.max(0, this.money + amount);
    }

     // 计算考虑装备加成的最终属性
    getEffectiveStat(stat) {
        let baseStat = this.stats[stat] || 0;
        let bonus = 0;
        // 遍历装备，查找是否有增加该属性的被动效果
        Object.values(this.equippedItems).forEach(itemId => {
            if (itemId) {
                const item = findItemById(itemId); // 需要一个查找物品的函数
                if (item && item.passiveEffect && item.passiveEffect.stat === stat) {
                    bonus += item.passiveEffect.value;
                }
            }
        });
        return baseStat + bonus;
    }

    equipItem(item, slot) {
         // 检查槽位是否有效，物品是否可装备等
         if (this.equippedItems.hasOwnProperty(slot)) {
             // 可能需要卸下旧装备
             this.unequipItem(slot);
             this.equippedItems[slot] = item.id;
             console.log(`${item.name} 已装备到 ${slot}`);
             // 应用被动效果 (UI更新应该在其他地方处理)
             updatePlayerUI(); // 更新UI显示
         }
    }

    unequipItem(slot) {
        if (this.equippedItems.hasOwnProperty(slot) && this.equippedItems[slot]) {
            const itemId = this.equippedItems[slot];
            this.equippedItems[slot] = null;
            const item = findItemById(itemId);
            console.log(`${item.name} 已从 ${slot} 卸下`);
            // 移除被动效果 (UI更新)
             updatePlayerUI(); // 更新UI显示
        }
    }
}

// --- NPC 类 ---
class NPC {
    constructor(id, name, avatar) {
        this.id = id;
        this.name = name;
        this.avatar = avatar || 'assets/images/default_avatar.png';
        this.affinity = 50; // 0-100 好感度
        this.stats = { /* ... NPC 属性 ... */ };
        this.tags = []; // 例如: ['商人', '酒馆常客']
        this.inventory = []; // 持有物品列表 [ { itemId: 'sword', quantity: 1 }, ... ]
        this.isAlive = true;
        // ... 其他NPC特定属性
    }

    changeAffinity(amount) {
        this.affinity = Math.max(0, Math.min(100, this.affinity + amount));
    }

    die() {
        this.isAlive = false;
        console.log(`${this.name} 死亡了.`);
        // 可以在这里处理物品掉落逻辑
        // dropItems(this.inventory);
        // 从 gameState.knownNPCs 中移除或标记为死亡
    }
}

// --- 物品类 ---
class Item {
    constructor(id, name, description, type, icon = 'assets/images/items/default.png') {
        this.id = id;
        this.name = name;
        this.description = description;
        this.type = type; // 'consumable', 'equipment', 'key', 'misc'
        this.icon = icon;
        this.passiveEffect = null; // { stat: 'combat', value: 5 }
        this.activeEffect = null; // { action: 'heal', value: 20 } 可在幕间使用
        this.equipSlot = null; // 'weapon', 'armor', 'accessory' if equipment
    }
}

// --- 查找函数示例 (需要从 data/xxx.json 加载数据) ---
let gameData = { items: {}, npcs: {}, events: {} }; // 存储从JSON加载的数据

async function loadGameData() {
    try {
        const [itemsRes, npcsRes, eventsRes, playerInitRes] = await Promise.all([
            fetch('js/data/items.json'),
            fetch('js/data/npcs.json'),
            fetch('js/data/events.json'),
            fetch('js/data/player_init.json')
        ]);
        gameData.items = await itemsRes.json();
        gameData.npcs = await npcsRes.json();
        gameData.events = await eventsRes.json();
        gameData.playerInit = await playerInitRes.json(); // 玩家初始数据
        console.log("Game data loaded successfully.");
    } catch (error) {
        console.error("Failed to load game data:", error);
    }
}

function findItemById(itemId) {
    return gameData.items[itemId];
}

function findNpcById(npcId) {
    // 注意：这返回的是基础数据，实际游戏中的NPC状态在 gameState.knownNPCs
    return gameData.npcs[npcId];
}
function findEventById(eventId) {
     return gameData.events[eventId];
}

// --- 库存管理 ---
function addItemToInventory(itemId, quantity = 1) {
    const existingItem = gameState.inventory.find(item => item.itemId === itemId);
    const itemData = findItemById(itemId);
    if (!itemData) {
        console.error(`Item with ID ${itemId} not found.`);
        return;
    }

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        gameState.inventory.push({ itemId: itemId, quantity: quantity, name: itemData.name, icon: itemData.icon });
    }
    updateInventoryUI(); // 更新UI
}

function removeItemFromInventory(itemId, quantity = 1) {
    const itemIndex = gameState.inventory.findIndex(item => item.itemId === itemId);
    if (itemIndex > -1) {
        gameState.inventory[itemIndex].quantity -= quantity;
        if (gameState.inventory[itemIndex].quantity <= 0) {
            gameState.inventory.splice(itemIndex, 1); // 移除物品
        }
        updateInventoryUI(); // 更新UI
        return true; // 表示成功移除
    }
    return false; // 表示物品不足或不存在
}

function hasItem(itemId, quantity = 1) {
    const item = gameState.inventory.find(i => i.itemId === itemId);
    return item && item.quantity >= quantity;
}

// --- 添加或更新已知NPC ---
function addOrUpdateKnownNpc(npcId) {
    if (!gameState.knownNPCs[npcId]) {
        const npcData = findNpcById(npcId);
        if (npcData) {
            gameState.knownNPCs[npcId] = new NPC(npcId, npcData.name, npcData.avatar);
            // 可以从 npcData 中加载更多初始属性
             Object.assign(gameState.knownNPCs[npcId].stats, npcData.stats);
             gameState.knownNPCs[npcId].tags = [...npcData.tags];
             gameState.knownNPCs[npcId].inventory = [...(npcData.inventory || [])];
            console.log(`Discovered NPC: ${npcData.name}`);
        } else {
            console.error(`NPC data not found for ID: ${npcId}`);
            return null;
        }
    }
     updateNpcPanelUI(); // 更新NPC面板
    return gameState.knownNPCs[npcId];
}
// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
    cacheUIElements(); // 缓存UI元素引用
    setupEventListeners(); // 设置基本事件监听器
    setupContextMenuActions(); // 设置物品菜单监听器
    showScreen('start-screen'); // 显示开始界面
    // 尝试加载游戏数据
     loadGameData().then(() => {
         console.log("Game data loading process finished.");
         // 数据加载后可以启用开始按钮等
         UIElements.startButton.disabled = false;
          UIElements.startButton.textContent = "开始游戏";
     }).catch(error => {
          console.error("Error during game data loading:", error);
           UIElements.startButton.textContent = "数据加载失败";
           UIElements.startButton.disabled = true;
     });
     UIElements.startButton.disabled = true; // 初始禁用，等待数据加载
     UIElements.startButton.textContent = "加载数据中...";

     // 尝试加载存档
     // if (loadGame()) {
     //    console.log("Game loaded from save.");
     //    // 如果加载成功，直接显示游戏界面，而不是开始界面
     //    showScreen('game-screen');
     //    updateAllUI(); // 更新所有UI
     // } else {
     //    showScreen('start-screen');
     // }


});

// --- 设置事件监听器 ---
function setupEventListeners() {
    // 开始按钮
    UIElements.startButton.addEventListener('click', initializeGame);

    // 头像上传 (简单预览)
    UIElements.avatarUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                UIElements.avatarPreview.src = e.target.result;
                // 注意：实际游戏中可能需要上传到服务器或用 Canvas 处理
            }
            reader.readAsDataURL(file);
        }
    });

    // 幕间按钮 (已在 HTML 中用 onclick 添加，也可以在这里添加)
    // UIElements.interludeButton.addEventListener('click', enterInterlude);

    // 页面卸载前自动保存 (可选)
    // window.addEventListener('beforeunload', () => {
    //     if (gameState.currentPhase !== 'START' && gameState.currentPhase !== 'END') {
    //         saveGame();
    //     }
    // });
}

// --- 初始化新游戏 ---
function initializeGame() {
    console.log("Initializing new game...");
    const playerName = UIElements.playerNameInput.value.trim() || "无名氏";
    const playerAvatar = UIElements.avatarPreview.src; // 获取预览图地址

    // 创建玩家对象
    gameState.currentPlayer = new Player(playerName, playerAvatar);

     // --- 应用初始设定 (从 player_init.json 加载) ---
     if (gameData.playerInit) {
         const initData = gameData.playerInit;
         gameState.currentPlayer.hp = initData.initialHp || 100;
         gameState.currentPlayer.maxHp = initData.initialHp || 100;
         gameState.currentPlayer.money = initData.initialMoney || 10;
         Object.assign(gameState.currentPlayer.stats, initData.initialStats);
         if (initData.initialTags) {
             initData.initialTags.forEach(tag => gameState.currentPlayer.addTag(tag));
         }
         if (initData.initialItems) {
             initData.initialItems.forEach(item => addItemToInventory(item.itemId, item.quantity));
         }
         // 设置初始主线进度
         gameState.mainQuestProgress = initData.initialQuestProgress || 0;
     } else {
          console.warn("Player initial data not found. Using defaults.");
     }


    gameState.currentPhase = 'MAIN_EVENT';
    gameState.knownNPCs = {}; // 清空NPC
    gameState.inventory = []; // 清空背包
    gameState.globalTags = [];
    // 重置幕间状态
     gameState.interlude = {
         actionPoints: 3,
         merchantVisited: false,
         availableMerchantItems: [],
         tavernNPCs: []
     };


    // 更新所有UI
    updateAllUI();

    // 切换到游戏界面
    showScreen('game-screen');

    // 加载第一个事件 (通常是 'start_event')
    const startEventId = gameData.playerInit?.startEventId || 'start_event'; // 从初始数据或默认值获取
    loadAndDisplayEvent(startEventId); // 需要在 events.json 中定义 'start_event'
}

// --- 更新所有UI面板 ---
function updateAllUI() {
    updatePlayerUI();
    updateNpcPanelUI();
    updateInventoryUI();
    // 事件面板由 loadAndDisplayEvent 更新
}


// --- 游戏结束 ---
function endGame(title, message) {
    console.log(`Game Over: ${title} - ${message}`);
    gameState.currentPhase = 'END';
    showScreen('end-screen');

    UIElements.endTitle.textContent = title;
    UIElements.endMessage.textContent = message;

    // 显示结局回放 (可选)
    UIElements.endPlayback.innerHTML = `
        <h4>你的旅程回顾:</h4>
        <p>姓名: ${gameState.currentPlayer.name}</p>
        <p>最终状态: HP ${gameState.currentPlayer.hp}, 金钱 ${gameState.currentPlayer.money}</p>
        <p>获得TAGs: ${gameState.currentPlayer.tags.join(', ') || '无'}</p>
        <p>重要NPC关系:</p>
        <ul>
            ${Object.values(gameState.knownNPCs)
                   .map(npc => `<li>${npc.name}: 好感度 ${npc.affinity} ${npc.isAlive ? '' : '(已故)'}</li>`)
                   .join('')}
        </ul>
        `;

     // 清除存档？ (可选，允许多周目继承的话就不清除)
     // localStorage.removeItem('textAdventureSave');
}

// --- 重新开始游戏 ---
function restartGame() {
    // 简单地重新加载页面
    window.location.reload();
    // 或者调用 initializeGame() 但需要确保状态完全重置
    // initializeGame(); // 如果不刷新页面，需要非常小心地重置所有状态
}


// --- 处理物品交互 (由 ui.js 调用) ---
function handleItemAction(itemId, action) {
    const itemData = findItemById(itemId);
    if (!itemData) return;

    console.log(`Action '${action}' on item '${itemData.name}' (ID: ${itemId})`);

    switch (action) {
        case 'use':
            if (itemData.activeEffect && gameState.currentPhase === 'INTERLUDE') {
                 // 应用主动效果
                if (applyActiveItemEffect(itemData.activeEffect)) {
                     // 消耗物品
                     removeItemFromInventory(itemId, 1);
                     showTemporaryMessage(UIElements.interludeContent || UIElements.eventPanel, `${itemData.name} 使用成功。`, 'success'); // 显示消息
                     updatePlayerUI(); // 更新玩家状态显示
                } else {
                    showTemporaryMessage(UIElements.interludeContent || UIElements.eventPanel, `${itemData.name} 使用失败或无效。`, 'error');
                }

            } else {
                 console.warn("Cannot use item now or item has no active effect.");
            }
            break;
        case 'give':
            // 实现赠送逻辑: 弹出 NPC 选择框?
             selectNpcToGiveItem(itemId); // 需要实现这个 UI 交互函数
            break;
        case 'sell':
             // 实现售卖逻辑: 如果在商人界面，卖给商人?
             if (gameState.currentPhase === 'INTERLUDE' /* && isMerchantPresent() */) {
                 const sellPrice = Math.floor((itemData.price || 10) * 0.5); // 假设卖价是原价一半
                 gameState.currentPlayer.changeMoney(sellPrice);
                 removeItemFromInventory(itemId, 1);
                 showTemporaryMessage(UIElements.interludeContent, `你卖掉了 ${itemData.name}，获得了 ${sellPrice} 金币。`);
                 updatePlayerUI();
             } else {
                  showTemporaryMessage(UIElements.inventoryPanel, `现在不能出售物品。`); // 在背包附近显示提示
             }
            break;
        case 'destroy':
            // 确认是否销毁? (可选)
            if (confirm(`确定要销毁 ${itemData.name} 吗？`)) { // 使用浏览器原生确认框
                 removeItemFromInventory(itemId, 1);
                 console.log(`${itemData.name} 已销毁。`);
                  // showTemporaryMessage(UIElements.inventoryPanel, `${itemData.name} 已销毁。`);
            }
            break;
        case 'equip':
             if (itemData.equipSlot) {
                  gameState.currentPlayer.equipItem(itemData, itemData.equipSlot);
                  // removeItemFromInventory(itemId, 1); // 装备不消耗，只是改变状态
                  updateInventoryUI(); // 更新背包（可能改变显示）
             }
            break;
        case 'unequip':
             if (itemData.equipSlot) {
                 gameState.currentPlayer.unequipItem(itemData.equipSlot);
                 // addItemToInventory(itemId, 1); // 卸下回到背包？看设计，如果装备不占背包格子则不需要
                 updateInventoryUI();
             }
             break;
        default:
            console.warn(`Unhandled item action: ${action}`);
    }
}

// 应用物品主动效果 (示例)
function applyActiveItemEffect(effect) {
     switch(effect.action) {
         case 'heal':
             if (gameState.currentPlayer.hp < gameState.currentPlayer.maxHp) {
                 gameState.currentPlayer.changeHp(effect.value);
                 return true; // 表示使用成功
             }
             return false; // 满血时使用失败
         case 'restore_mana': // 假设有魔法值
              // gameState.currentPlayer.changeMana(effect.value); return true;
              return false; // 暂未实现魔法值
          case 'temp_buff':
               // 施加临时状态 (需要状态效果系统)
               // addStatusEffect(gameState.currentPlayer, effect.buffId, effect.duration);
               console.log(`Applying temporary buff (not fully implemented): ${effect.buffId}`);
               return true;
         default:
             console.warn(`Unknown active item effect action: ${effect.action}`);
             return false;
     }
}

// 选择赠送物品给哪个NPC (简单示例)
function selectNpcToGiveItem(itemId) {
    const itemData = findItemById(itemId);
    const npcOptions = Object.values(gameState.knownNPCs)
                           .filter(npc => npc.isAlive)
                           .map(npc => `<option value="${npc.id}">${npc.name}</option>`)
                           .join('');

    if (!npcOptions) {
        alert("没有可以赠送的对象。");
        return;
    }

    // 使用简单的 prompt 或创建一个模态框
    const npcSelectHtml = `
        <label for="npc-give-select">选择要赠送 ${itemData.name} 给谁:</label>
        <select id="npc-give-select">${npcOptions}</select>
        <button onclick="confirmGiveItem('${itemId}')">确认赠送</button>
        <button onclick="cancelGiveItem()">取消</button>
    `;
    // 将这个 HTML 插入到一个临时的模态框或区域
    const tempContainer = document.createElement('div');
    tempContainer.id = 'give-item-dialog';
    tempContainer.style.position = 'fixed';
    tempContainer.style.top = '30%';
    tempContainer.style.left = '50%';
    tempContainer.style.transform = 'translateX(-50%)';
    tempContainer.style.background = 'white';
    tempContainer.style.padding = '20px';
    tempContainer.style.border = '1px solid black';
    tempContainer.style.zIndex = '101';
    tempContainer.innerHTML = npcSelectHtml;
    document.body.appendChild(tempContainer);
}
// 确认赠送的回调 (需要全局可访问)
function confirmGiveItem(itemId) {
    const select = document.getElementById('npc-give-select');
    const npcId = select.value;
    const npc = gameState.knownNPCs[npcId];
    const itemData = findItemById(itemId);

    if (npc && itemData) {
        console.log(`Giving ${itemData.name} to ${npc.name}`);
        removeItemFromInventory(itemId, 1); // 从玩家背包移除
        // npc.inventory.push({ itemId: itemId, quantity: 1 }); // 添加到NPC物品栏？(可选)

        // --- 计算好感度变化 ---
        let affinityChange = 5; // 基础好感度
        // 可以根据NPC喜好、物品价值等调整
        // if (npc.likes.includes(itemData.category)) affinityChange += 10;
        // if (itemData.rarity === 'rare') affinityChange += 5;
        npc.changeAffinity(affinityChange);

        alert(`你将 ${itemData.name} 送给了 ${npc.name}。对方的好感度 ${affinityChange > 0 ? '提升' : '降低'}了 ${Math.abs(affinityChange)} 点。`);
        updateNpcPanelUI(npcId); // 更新NPC面板并置顶
    }
    cancelGiveItem(); // 关闭对话框
}
// 取消赠送的回调
function cancelGiveItem() {
     const dialog = document.getElementById('give-item-dialog');
     if (dialog) {
         dialog.remove();
     }
}

// --- 工具函数 ---
function rollD100() {
    return Math.floor(Math.random() * 100) + 1;
}
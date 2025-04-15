// --- 进入幕间 ---
function enterInterlude() {
    console.log("Entering Interlude Phase");
    gameState.currentPhase = 'INTERLUDE';
    showScreen('interlude-screen');

    // 重置幕间状态
    gameState.interlude.actionPoints = 3; // 或者根据游戏规则设置
    gameState.interlude.merchantVisited = false;
    gameState.interlude.availableMerchantItems = []; // 需要逻辑生成商人商品
    gameState.interlude.tavernNPCs = []; // 需要逻辑刷新酒馆NPC

    // 刷新酒馆NPC (示例)
    refreshTavernNPCs();
    // 刷新商人商品 (示例)
    refreshMerchantItems();


    updateInterludeUI();
    clearInterludeContent(); // 清空上次的内容区
}

// --- 更新幕间界面 ---
function updateInterludeUI() {
    UIElements.interludeAP.textContent = gameState.interlude.actionPoints;
    // 根据剩余行动点或访问状态禁用按钮
     UIElements.interludeActions.querySelectorAll('button').forEach(button => {
          // 访问地点按钮在AP=0时禁用
          if (['tavern', 'merchant', 'home'].includes(button.getAttribute('onclick')?.match(/visitLocation\('(\w+)'\)/)?.[1])) {
              button.disabled = gameState.interlude.actionPoints <= 0;
          }
          // 商人按钮在访问过后禁用
          if (button.getAttribute('onclick')?.includes('merchant') && gameState.interlude.merchantVisited) {
              button.disabled = true;
              button.textContent = "拜访神秘商人 (已访问)";
          } else if (button.getAttribute('onclick')?.includes('merchant')) {
               // 恢复按钮文本（如果之前被修改）
               button.textContent = "拜访神秘商人";
          }
     });
}

// --- 清空内容区 ---
function clearInterludeContent() {
    UIElements.interludeContent.innerHTML = '';
    // 可能需要隐藏特定的内容容器
}

// --- 访问地点 ---
function visitLocation(location) {
    if (gameState.interlude.actionPoints <= 0) {
        console.log("行动点不足！");
        // 可以显示提示信息
        showTemporaryMessage(UIElements.interludeContent, "行动点不足！", 'error');
        return;
    }

     // 消耗行动点 (特定地点可能不消耗，例如回家?)
     // gameState.interlude.actionPoints--; // 在具体函数里消耗更合适

    clearInterludeContent(); // 清空内容区
    let contentHtml = `<h3>欢迎来到 ${getLocationName(location)}</h3>`;

    switch (location) {
        case 'tavern':
            contentHtml += renderTavern();
            break;
        case 'merchant':
            contentHtml += renderMerchant();
            break;
        case 'home':
            contentHtml += renderHome();
            break;
        default:
            contentHtml = '<p>未知地点。</p>';
    }

    UIElements.interludeContent.innerHTML = contentHtml;
    // 更新行动点显示等
    // updateInterludeUI(); // 在具体函数中调用
}

function getLocationName(location) {
    switch (location) {
        case 'tavern': return '酒馆';
        case 'merchant': return '神秘商人';
        case 'home': return '住宅';
        default: return '未知地点';
    }
}


// --- 酒馆逻辑 ---
function refreshTavernNPCs() {
    gameState.interlude.tavernNPCs = [];
    const potentialNpcs = Object.entries(gameData.npcs)
                               .filter(([id, npcData]) => npcData.tags.includes('酒馆常客') && (!gameState.knownNPCs[id] || gameState.knownNPCs[id].isAlive)) // 只选活着的或未知的酒馆常客
                               .map(([id, npcData]) => id);

    const numNpcsToSpawn = Math.min(potentialNpcs.length, 3); // 最多刷新3个

    for (let i = 0; i < numNpcsToSpawn; i++) {
        const randomIndex = Math.floor(Math.random() * potentialNpcs.length);
        const npcId = potentialNpcs.splice(randomIndex, 1)[0]; // 移除已选，避免重复
        if (npcId) {
             gameState.interlude.tavernNPCs.push(npcId);
             addOrUpdateKnownNpc(npcId); // 确保在酒馆遇到的NPC被记录
        }
    }
    console.log("Tavern NPCs refreshed:", gameState.interlude.tavernNPCs);
}

function renderTavern() {
     if (gameState.interlude.actionPoints <= 0) return "<p>你没有行动点留在酒馆了。</p>";

    let html = `<p>昏暗的灯光下人声鼎沸。你看到：</p><ul>`;
    if (gameState.interlude.tavernNPCs.length > 0) {
        gameState.interlude.tavernNPCs.forEach(npcId => {
            const npc = gameState.knownNPCs[npcId];
            if(npc) {
                 html += `<li>
                    <img src="${npc.avatar}" alt="${npc.name}" width="20" height="20" style="vertical-align: middle;">
                    ${npc.name}
                    <button onclick="interactTavernNpc('${npcId}', 'talk')">交谈</button>
                    <button onclick="interactTavernNpc('${npcId}', 'recruit')">招募(可能需要)</button>
                    <button onclick="interactTavernNpc('${npcId}', 'fight')">挑衅(战斗)</button>
                 </li>`;
            }
        });
    } else {
        html += "<li>这里现在没什么人。</li>";
    }
    html += `</ul> <p id="tavern-interaction-result"></p>`;
    return html;
}

function interactTavernNpc(npcId, action) {
     if (gameState.interlude.actionPoints <= 0) {
         showTemporaryMessage(document.getElementById('tavern-interaction-result'), "行动点不足！", 'error');
         return;
     }
      gameState.interlude.actionPoints--;
     updateInterludeUI();


    const npc = gameState.knownNPCs[npcId];
    const resultElement = document.getElementById('tavern-interaction-result');
    resultElement.textContent = ''; // Clear previous result

    console.log(`Interacting with ${npc.name}: ${action}`);

    // --- 实现交互逻辑 ---
    let interactionResultText = "";
    switch (action) {
        case 'talk':
             // 根据好感度、TAG等触发不同对话事件或简单反馈
             interactionResultText = `你和 ${npc.name} 聊了一会儿。`;
             if (npc.affinity < 30) {
                 interactionResultText += " 对方似乎不太想理你。";
                 npc.changeAffinity(-2);
             } else if (npc.affinity > 70) {
                  interactionResultText += " 你们相谈甚欢。";
                  npc.changeAffinity(5);
                  // 可能触发特殊对话或任务?
             } else {
                 interactionResultText += " 只是普通的闲聊。";
                 npc.changeAffinity(1);
             }
            // loadAndDisplayEvent('dialogue_event_id'); // 或者触发特定对话事件
            break;
        case 'recruit':
            // 检查招募条件（魅力、金钱、TAG等）
            interactionResultText = `你尝试招募 ${npc.name}...`;
            // 实现招募判定逻辑
             if (gameState.currentPlayer.getEffectiveStat('charisma') > 60 && npc.affinity > 50) {
                 interactionResultText += ` ${npc.name} 同意加入你的队伍！`;
                 // 添加到队伍逻辑 (需要实现队伍系统)
                 // addNpcToParty(npcId);
             } else {
                 interactionResultText += ` 但被拒绝了。`;
                 npc.changeAffinity(-5);
             }
            break;
        case 'fight':
            // 触发战斗逻辑
             interactionResultText = `你向 ${npc.name} 发起了挑战！`;
            // startCombat(gameState.currentPlayer, npc); // 需要战斗系统
             // 临时处理：扣除HP，判断胜负
             const playerRoll = rollD100() + gameState.currentPlayer.getEffectiveStat('combat');
             const npcRoll = rollD100() + (npc.stats.combat || 30); // 假设NPC有战斗属性
             if (playerRoll > npcRoll) {
                  interactionResultText += ` 你击败了 ${npc.name}!`;
                  npc.changeHp(-30); // 假设扣30血
                  npc.changeAffinity(-20);
                  // 可能获得战利品
             } else {
                 interactionResultText += ` 你被 ${npc.name} 教训了一顿!`;
                 gameState.currentPlayer.changeHp(-15);
                 npc.changeAffinity(-10);
                 updatePlayerUI();
             }
            break;
    }
    showTemporaryMessage(resultElement, interactionResultText);
     updateNpcPanelUI(); // 更新好感度显示
     // 可能需要重新渲染酒馆界面，去除已被击败或招募的NPC
     visitLocation('tavern'); // 简单粗暴的方式：重新渲染

}

// --- 神秘商人逻辑 ---
function refreshMerchantItems() {
     gameState.interlude.availableMerchantItems = [];
    const allItems = Object.entries(gameData.items);
    const potentialItems = allItems.filter(([id, item]) => item.type !== 'key' && item.type !== 'quest'); // 不卖关键物品
    const numItemsToSell = Math.min(potentialItems.length, 5); // 最多卖5个

    for (let i = 0; i < numItemsToSell; i++) {
         const randomIndex = Math.floor(Math.random() * potentialItems.length);
         const [itemId, itemData] = potentialItems.splice(randomIndex, 1)[0];
         if (itemId) {
              // 动态定价 (示例：基础价 +/- 30%)
              const basePrice = itemData.price || 20; // 假设物品有基础价格
              const priceMultiplier = 0.7 + Math.random() * 0.6;
              const price = Math.max(1, Math.round(basePrice * priceMultiplier)); // 最低价格为1
              gameState.interlude.availableMerchantItems.push({ itemId, price, quantity: 1 }); // 默认限购1
         }
    }
     console.log("Merchant items refreshed:", gameState.interlude.availableMerchantItems);
}


function renderMerchant() {
     if (gameState.interlude.actionPoints <= 0) return "<p>你没有行动点拜访商人了。</p>";
     if (gameState.interlude.merchantVisited) return "<p>你今天已经拜访过商人了。</p>";

    let html = `<p>一个戴着兜帽的身影在阴影中向你招手。</p><ul>`;
    if (gameState.interlude.availableMerchantItems.length > 0) {
        gameState.interlude.availableMerchantItems.forEach((itemOffer, index) => {
            const itemData = findItemById(itemOffer.itemId);
            if(itemData) {
                const canAfford = gameState.currentPlayer.money >= itemOffer.price;
                 html += `<li>
                    <img src="${itemData.icon}" alt="${itemData.name}" width="20" height="20" style="vertical-align: middle;">
                    ${itemData.name} - ${itemData.description} (价格: ${itemOffer.price} 金币)
                    <button onclick="buyMerchantItem(${index})" ${canAfford ? '' : 'disabled style="background-color: grey;"'}>购买</button>
                 </li>`;
            }
        });
    } else {
        html += "<li>商人今天似乎没什么好东西。</li>";
    }
    html += `</ul><p id="merchant-result"></p>`;
    return html;
}

function buyMerchantItem(itemIndex) {
     if (gameState.interlude.actionPoints <= 0 || gameState.interlude.merchantVisited) return; // 双重检查

    const itemOffer = gameState.interlude.availableMerchantItems[itemIndex];
    const resultElement = document.getElementById('merchant-result');

    if (!itemOffer) {
         showTemporaryMessage(resultElement, "无效的商品！", 'error');
        return;
    }
     const itemData = findItemById(itemOffer.itemId);

     if (gameState.currentPlayer.money >= itemOffer.price) {
         // 消耗行动点 (购买本身可能不消耗，但访问商人消耗)
         // 在 visitLocation('merchant') 时统一消耗可能更好
         if (!gameState.interlude.merchantVisited) { // 首次交互消耗行动点
             gameState.interlude.actionPoints--;
             gameState.interlude.merchantVisited = true; // 标记已访问
             updateInterludeUI();
         }


         gameState.currentPlayer.changeMoney(-itemOffer.price);
         addItemToInventory(itemOffer.itemId, 1);
         showTemporaryMessage(resultElement, `你购买了 ${itemData.name}。`);
         updatePlayerUI();

         // 从商人列表移除已购买商品 (或者标记为已售罄)
          gameState.interlude.availableMerchantItems.splice(itemIndex, 1);
          // 重新渲染商人界面
          UIElements.interludeContent.innerHTML = renderMerchant();

     } else {
         showTemporaryMessage(resultElement, "金币不足！", 'error');
     }

}

// --- 住宅逻辑 ---
function renderHome() {
     // 回家通常不消耗行动点
    let html = `<p>你回到了简陋的住所。</p>`;
     html += `<h4>管理NPC (待实现):</h4>`;
     html += `<ul>`;
     // 假设有队伍系统 gameState.party = [npcId1, npcId2]
     const partyMembers = gameState.party || [];
      if (partyMembers.length > 0) {
          partyMembers.forEach(npcId => {
              const npc = gameState.knownNPCs[npcId];
              if (npc && npc.isAlive) {
                   html += `<li>
                     ${npc.name}
                     <button onclick="interactHomeNpc('${npcId}', 'date')">约会 (+好感?)</button>
                     <button onclick="interactHomeNpc('${npcId}', 'train')">训练 (提升属性?)</button>
                     <button onclick="interactHomeNpc('${npcId}', 'rob')">抢劫 (-好感, +物品?)</button>
                     <button onclick="interactHomeNpc('${npcId}', 'kill')">杀死 (-道德, +物品?)</button>
                  </li>`;
              }
          });
      } else {
           html += "<li>你的队伍里还没有人。</li>";
      }

     html += `</ul>`;
     html += `<h4>使用物品:</h4>`;
     html += `<p>(在背包面板通过右键菜单使用消耗品)</p>`; // 指导玩家操作
     html += `<p id="home-result"></p>`;

    return html;
}

function interactHomeNpc(npcId, action) {
     // 这些交互可能消耗或不消耗行动点，根据设计决定
     // if (gameState.interlude.actionPoints <= 0) { ... }
     // gameState.interlude.actionPoints--;
     // updateInterludeUI();

     const npc = gameState.knownNPCs[npcId];
     const resultElement = document.getElementById('home-result');
     console.log(`Interacting with ${npc.name} at home: ${action}`);
     let resultText = "";

     // --- 实现交互逻辑 ---
     switch(action) {
         case 'date':
             resultText = `你尝试和 ${npc.name} 增进感情...`;
             // 好感度判定等
             if (npc.affinity > 50) {
                 resultText += ` 效果不错。`;
                 npc.changeAffinity(5 + Math.floor(gameState.currentPlayer.getEffectiveStat('charisma') / 10));
             } else {
                  resultText += ` 对方似乎没什么兴趣。`;
                  npc.changeAffinity(-2);
             }
             break;
         case 'train':
              resultText = `你和 ${npc.name} 一起训练...`;
              // 提升属性逻辑，可能需要消耗金钱或物品
              // gameState.currentPlayer.changeStat('combat', 1);
              // npc.changeStat('combat', 1); // 如果NPC也有属性增长
              break;
         case 'rob':
              resultText = `你试图抢劫 ${npc.name}...`;
              // 判定逻辑 (战斗检定? 潜行检定?)
               // 影响好感度，可能获得物品，影响道德值
               npc.changeAffinity(-50);
               // gameState.morality -= 10; // 需要道德系统
               // 获得物品逻辑
               break;
         case 'kill':
               resultText = `你对 ${npc.name} 痛下杀手...`;
                // 判定逻辑 (战斗?)
                // NPC死亡，掉落物品，影响道德值
                 npc.die();
                 // 从队伍移除
                 // gameState.party = gameState.party.filter(id => id !== npcId);
                  // gameState.morality -= 50;
                  // 重新渲染住宅界面
                 UIElements.interludeContent.innerHTML = renderHome();
                 break;
     }

      showTemporaryMessage(resultElement, resultText);
     updateNpcPanelUI(); // 更新NPC状态

}

// --- 开始下一阶段 ---
function startNextPhase() {
    console.log("Starting Next Main Phase");
    gameState.currentPhase = 'MAIN_EVENT';
    showScreen('game-screen');
    // 清除幕间内容区的消息
    clearInterludeContent();

    // 决定下一个主线事件ID (需要逻辑)
    const nextMainEventId = determineNextMainEvent(); // 需要实现这个函数
    if (nextMainEventId) {
        loadAndDisplayEvent(nextMainEventId);
    } else {
        // 如果没有主线了？ 触发随机事件或结局？
        console.warn("No next main event determined. Triggering random event or ending?");
        triggerRandomEvent(); // 或者 endGame(...)
    }
}

// --- 显示临时消息 ---
function showTemporaryMessage(element, message, type = 'info') {
    if (!element) return;
    element.textContent = message;
    element.style.color = type === 'error' ? 'red' : (type === 'success' ? 'green' : 'black');
    // 可以设置定时器自动清除消息
    // setTimeout(() => {
    //     if (element.textContent === message) { // 避免清除后续消息
    //         element.textContent = '';
    //     }
    // }, 3000);
}

// --- 决定下一个主线事件 ---
function determineNextMainEvent() {
    // 这个函数需要复杂的逻辑，可能基于：
    // 1. 当前主线进度 (例如存储在 gameState.mainQuestProgress)
    // 2. 玩家的 TAGs
    // 3. 完成的支线任务
    // 4. NPC 好感度
    // 5. 全局变量

    // 简单示例：线性主线
    const mainQuestLine = ['main_event_1', 'main_event_2', 'final_battle', 'epilogue']; // 假设的主线事件ID列表
    let currentProgress = gameState.mainQuestProgress || 0; // 需要在 gameState 中添加

    if (currentProgress < mainQuestLine.length) {
         // 更新进度
         gameState.mainQuestProgress = currentProgress + 1;
        return mainQuestLine[currentProgress];
    } else {
        // 主线已完成
        return null; // 或者返回一个 "主线后" 的随机事件池ID
    }
}
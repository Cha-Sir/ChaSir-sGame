// --- 加载并显示事件 ---
function loadAndDisplayEvent(eventId) {
    console.log(`Loading event: ${eventId}`);
    const eventData = findEventById(eventId);

    if (!eventData) {
        console.error(`Event data for ID ${eventId} not found!`);
        // 可以尝试加载一个默认错误事件或返回主菜单
        loadAndDisplayEvent('error_event_not_found'); // 需要定义这个事件
        return;
    }

    gameState.currentEventId = eventId;

    // --- 事件触发效果 (在显示之前处理) ---
    if (eventData.onEnterEffects) {
        applyEffects(eventData.onEnterEffects);
    }

    // 更新UI
    displayEventUI(eventData);

    // --- 触发被动事件检查 (如再生术) ---
    checkPassiveEvents(); // 需要实现这个函数

     // --- 更新NPC面板，突出显示相关NPC ---
    if (eventData.relatedNpcId) {
        addOrUpdateKnownNpc(eventData.relatedNpcId); // 确保NPC已知
        updateNpcPanelUI(eventData.relatedNpcId); // 将相关NPC置顶
    } else {
         updateNpcPanelUI(); // 正常更新
    }
}

// --- 处理选项点击 ---
function handleOptionClick(event) {
    const button = event.currentTarget; // 获取被点击的按钮
    const optionIndex = parseInt(button.dataset.optionIndex);
    const currentEvent = findEventById(gameState.currentEventId);

    if (!currentEvent || !currentEvent.options || !currentEvent.options[optionIndex]) {
        console.error("无法找到当前事件或选项数据");
        return;
    }

    const selectedOption = currentEvent.options[optionIndex];

    // --- 隐藏骰子结果 ---
    UIElements.diceRollResult.classList.add('hidden');

    // --- 处理数值判定 ---
    if (selectedOption.check) {
        const statName = selectedOption.check.stat; // "combat", "intelligence" etc.
        const targetValue = gameState.currentPlayer.getEffectiveStat(statName); // 获取玩家对应属性值
        const roll = rollD100();
        const success = roll <= targetValue;

        // 显示检定结果
        showDiceRollUI(roll, targetValue, statName, success);

        // 根据成功/失败应用效果和决定下一个事件
        const outcome = success ? selectedOption.check.success : selectedOption.check.failure;
        if (outcome) {
            if (outcome.effects) {
                applyEffects(outcome.effects);
            }
            if (outcome.nextEventId) {
                // 延迟加载下一个事件，让玩家看到检定结果
                setTimeout(() => loadAndDisplayEvent(outcome.nextEventId), 1500);
            } else if (outcome.endGame) {
                 setTimeout(() => endGame(outcome.endGame.title, outcome.endGame.message), 1500);
            } else if (outcome.goToInterlude) {
                // 可能检定失败直接进入幕间
                UIElements.interludeButton.classList.remove('hidden');
            } else {
                 // 检定后没有明确的下一步？可能需要回到当前事件或默认行为
                 console.warn("检定后没有指定 nextEventId 或 endGame");
                  // 可以在这里决定是重新显示当前事件选项，还是强制进入幕间等
                  // 也许显示一个 "继续" 按钮？
            }
        } else {
             console.error("检定结果缺少 success 或 failure 分支");
             // 默认行为？或者也显示继续按钮？
        }

    } else {
        // --- 处理普通选项 ---
        // 应用效果
        if (selectedOption.effects) {
            applyEffects(selectedOption.effects);
        }

        // 决定下一个事件
        if (selectedOption.nextEventId) {
            loadAndDisplayEvent(selectedOption.nextEventId);
        } else if (selectedOption.endGame) {
             endGame(selectedOption.endGame.title, selectedOption.endGame.message);
        } else if (selectedOption.goToInterlude) {
            // 事件链结束，显示进入幕间按钮
            UIElements.interludeButton.classList.remove('hidden');
            UIElements.eventOptions.innerHTML = '<p>此事件链已结束。</p>'; // 清空选项
        } else {
            // 如果选项没有指定下一步，这可能是一个错误，或者意味着事件链结束
            console.warn(`选项 ${optionIndex} 没有指定 nextEventId 或 endGame。`);
            // 默认行为：显示进入幕间按钮？
            UIElements.interludeButton.classList.remove('hidden');
             UIElements.eventOptions.innerHTML = '<p>似乎没什么可做的了。</p>'; // 清空选项
        }
    }

     // 更新UI (血量、金钱等可能已改变)
    updatePlayerUI();
    updateNpcPanelUI(); // 好感度可能已改变
}

// --- 应用效果 ---
function applyEffects(effects) {
    if (!effects) return;

    effects.forEach(effect => {
        console.log("Applying effect:", effect);
        switch (effect.type) {
            case 'stat_change':
                gameState.currentPlayer.changeStat(effect.stat, effect.value);
                break;
            case 'hp_change':
                gameState.currentPlayer.changeHp(effect.value);
                break;
            case 'money_change':
                gameState.currentPlayer.changeMoney(effect.value);
                break;
            case 'add_tag':
                gameState.currentPlayer.addTag(effect.tag);
                break;
            case 'remove_tag':
                gameState.currentPlayer.removeTag(effect.tag);
                break;
            case 'affinity_change':
                const npc = gameState.knownNPCs[effect.npcId];
                if (npc && npc.isAlive) {
                    npc.changeAffinity(effect.value);
                } else {
                     console.warn(`Attempted to change affinity for unknown or dead NPC: ${effect.npcId}`);
                }
                break;
            case 'add_item':
                addItemToInventory(effect.itemId, effect.quantity || 1);
                break;
            case 'remove_item':
                if (!removeItemFromInventory(effect.itemId, effect.quantity || 1)) {
                    console.warn(`Failed to remove item ${effect.itemId}, maybe not enough?`);
                    // 根据游戏设计，这里可能需要处理移除失败的情况
                }
                break;
            case 'npc_die':
                 const targetNpc = gameState.knownNPCs[effect.npcId];
                 if (targetNpc) {
                     targetNpc.die(); // 处理NPC死亡
                 }
                 break;
            case 'trigger_event': // 立即触发另一个事件 (小心死循环)
                 loadAndDisplayEvent(effect.eventId);
                 break;
            // 添加更多效果类型...
            default:
                console.warn(`Unknown effect type: ${effect.type}`);
        }
    });
}

// --- 检查选项条件 ---
function checkOptionCondition(condition) {
    if (!condition) {
        return true; // 没有条件，默认显示
    }

    let meetsCondition = true; // 假设满足

    if (condition.requiredTags && condition.requiredTags.length > 0) {
        if (!condition.requiredTags.every(tag => gameState.currentPlayer.hasTag(tag))) {
            meetsCondition = false;
        }
    }
    if (meetsCondition && condition.forbiddenTags && condition.forbiddenTags.length > 0) {
         if (condition.forbiddenTags.some(tag => gameState.currentPlayer.hasTag(tag))) {
             meetsCondition = false;
         }
    }

    if (meetsCondition && condition.minStats) {
        for (const stat in condition.minStats) {
            if (gameState.currentPlayer.getEffectiveStat(stat) < condition.minStats[stat]) {
                meetsCondition = false;
                break;
            }
        }
    }
     if (meetsCondition && condition.maxStats) {
         for (const stat in condition.maxStats) {
             if (gameState.currentPlayer.getEffectiveStat(stat) > condition.maxStats[stat]) {
                 meetsCondition = false;
                 break;
             }
         }
     }


    if (meetsCondition && condition.requiredItems && condition.requiredItems.length > 0) {
        if (!condition.requiredItems.every(itemReq => hasItem(itemReq.itemId, itemReq.quantity || 1))) {
            meetsCondition = false;
        }
    }

    if (meetsCondition && condition.requiredAffinity) {
        const npc = gameState.knownNPCs[condition.requiredAffinity.npcId];
        if (!npc || npc.affinity < condition.requiredAffinity.min) {
            meetsCondition = false;
        }
         if (npc && condition.requiredAffinity.max && npc.affinity > condition.requiredAffinity.max) {
             meetsCondition = false;
         }
    }
    // 添加更多条件检查...

    return meetsCondition;
}


// --- 检查被动事件 (例如，在每次事件加载后调用) ---
function checkPassiveEvents() {
    // 示例：再生术 (假设玩家有 '再生术' TAG)
    if (gameState.currentPlayer.hasTag('再生术')) {
        // 假设每回合恢复 1 HP，且不在战斗中等条件
        if (gameState.currentPlayer.hp < gameState.currentPlayer.maxHp) {
            console.log("被动事件: 再生术触发");
            gameState.currentPlayer.changeHp(1);
            updatePlayerUI(); // 需要更新UI
             // 可能需要添加视觉提示
             // showPassiveEffectNotification("再生术恢复了1点生命！");
        }
    }
    // 添加其他被动事件检查...
}

// --- 触发随机事件 ---
function triggerRandomEvent() {
     console.log("Attempting to trigger a random event...");
    // 1. 从 gameData.events 中筛选出 type 为 'random' 的事件
    const randomEventPool = Object.entries(gameData.events)
                                  .filter(([id, event]) => event.type === 'random')
                                  .map(([id, event]) => id); // 获取ID列表

    if (randomEventPool.length === 0) {
        console.warn("No random events found in the pool.");
        // 如果没有随机事件，可能直接进入幕间或主线
         // 显示幕间按钮？
          UIElements.interludeButton.classList.remove('hidden');
          UIElements.eventOptions.innerHTML = '<p>似乎没有特别的事情发生。</p>';
        return;
    }

    // 2. 随机选择一个事件ID
    const randomIndex = Math.floor(Math.random() * randomEventPool.length);
    const randomEventId = randomEventPool[randomIndex];

    console.log(`Selected random event: ${randomEventId}`);
    // 3. 加载并显示该事件
    loadAndDisplayEvent(randomEventId);
}
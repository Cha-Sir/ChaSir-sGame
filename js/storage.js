const SAVE_KEY = 'textAdventureSave_v1'; // 使用版本号，避免旧存档冲突

function saveGame() {
    if (!gameState.currentPlayer || gameState.currentPhase === 'END') {
        console.log("Cannot save game in current state (no player or game ended).");
        return;
    }
    try {
        // 只保存必要的数据，避免保存整个 gameData
        const saveData = {
            currentPhase: gameState.currentPhase,
            currentPlayer: gameState.currentPlayer, // Player 对象会被序列化
            currentEventId: gameState.currentEventId,
            knownNPCs: gameState.knownNPCs, // NPC 对象会被序列化
            inventory: gameState.inventory,
            globalTags: gameState.globalTags,
            interludeState: gameState.interlude, // 保存幕间状态
            mainQuestProgress: gameState.mainQuestProgress, // 保存主线进度
            timestamp: new Date().toISOString() // 保存时间戳
        };
        const saveDataString = JSON.stringify(saveData);
        localStorage.setItem(SAVE_KEY, saveDataString);
        console.log("Game saved successfully.");
        // 可以显示一个短暂的保存成功提示
        // showTemporaryMessage(document.body, "游戏已保存", "success");
    } catch (error) {
        console.error("Error saving game:", error);
        // 可能需要提示用户保存失败
         alert("保存游戏时出错！可能是本地存储已满。");
    }
}

function loadGame() {
    const saveDataString = localStorage.getItem(SAVE_KEY);
    if (!saveDataString) {
        console.log("No save game found.");
        return false;
    }

    try {
        const savedData = JSON.parse(saveDataString);

        // --- 数据恢复与类实例重建 ---
        // 简单恢复状态
        gameState.currentPhase = savedData.currentPhase;
        gameState.currentEventId = savedData.currentEventId;
        gameState.inventory = savedData.inventory || [];
        gameState.globalTags = savedData.globalTags || [];
        gameState.interlude = savedData.interludeState || { /* 默认值 */ };
        gameState.mainQuestProgress = savedData.mainQuestProgress || 0;


        // 重建 Player 对象 (因为类方法不会被 JSON 保存)
        const tempPlayer = savedData.currentPlayer;
        gameState.currentPlayer = new Player(tempPlayer.name, tempPlayer.avatar);
        Object.assign(gameState.currentPlayer, tempPlayer); // 复制属性

        // 重建 NPC 对象
        gameState.knownNPCs = {};
        for (const npcId in savedData.knownNPCs) {
            const tempNpc = savedData.knownNPCs[npcId];
            const npc = new NPC(tempNpc.id, tempNpc.name, tempNpc.avatar);
             Object.assign(npc, tempNpc); // 复制属性
            gameState.knownNPCs[npcId] = npc;
        }

        console.log("Game loaded successfully from save dated:", savedData.timestamp);

        // --- 加载后处理 ---
         showScreen('game-screen'); // 显示游戏主界面
         updateAllUI(); // 根据加载的数据更新所有UI

         // 根据加载时的阶段决定显示哪个事件或界面
         if (gameState.currentPhase === 'MAIN_EVENT' && gameState.currentEventId) {
             loadAndDisplayEvent(gameState.currentEventId); // 重新加载当前事件
         } else if (gameState.currentPhase === 'INTERLUDE') {
              showScreen('interlude-screen'); // 直接显示幕间界面
              updateInterludeUI(); // 更新幕间UI状态
              // 可能需要重新渲染当前地点的视图
              // visitLocation(gameState.interlude.lastLocation); // 如果保存了上次访问地点
         } else {
              // 如果状态未知，可能需要回到某个安全点
              console.warn("Loaded game state is unusual. Loading start event.");
              loadAndDisplayEvent(gameData.playerInit?.startEventId || 'start_event');
         }

        return true; // 表示加载成功

    } catch (error) {
        console.error("Error loading game:", error);
        localStorage.removeItem(SAVE_KEY); // 加载失败，可能存档已损坏，移除它
        alert("加载存档失败，存档可能已损坏。将开始新游戏。");
        return false;
    }
}

function deleteSave() {
     localStorage.removeItem(SAVE_KEY);
     console.log("Save game deleted.");
}
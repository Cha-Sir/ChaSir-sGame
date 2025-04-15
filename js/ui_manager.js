function updateUI() {
    if (!gameState || !gameState.player) return; // Don't update if state is not ready

    // Update Player Panel
    const playerAvatar = document.getElementById('player-avatar');
    const playerIdDisplay = document.getElementById('player-id-display');
    const playerAttributesDiv = document.getElementById('player-attributes');

    if (playerAvatar) playerAvatar.src = gameState.player.avatarDataUrl || 'assets/images/default_avatar.png';
    if (playerIdDisplay) playerIdDisplay.textContent = gameState.player.id;

    if (playerAttributesDiv) {
        playerAttributesDiv.innerHTML = ''; // Clear old attributes
        for (const attr in gameState.player.attributes) {
             // Simple display, could be enhanced (e.g., mapping keys to Chinese names)
            const p = document.createElement('p');
            p.textContent = `${attr}: ${gameState.player.attributes[attr]}`;
            playerAttributesDiv.appendChild(p);
        }
    }

    // Update NPC Panel
    const npcListUl = document.getElementById('npc-list');
    if (npcListUl) {
        npcListUl.innerHTML = ''; // Clear old list
        gameState.player.activeNPCs.forEach(npcId => {
            const npcData = gameState.npcs[npcId];
            if (npcData) {
                const li = document.createElement('li');
                li.dataset.npcId = npcId; // Store ID for later interaction

                const img = document.createElement('img');
                img.src = npcData.avatar || 'assets/images/default_avatar.png';
                img.alt = npcData.name;
                img.width = 40;

                const span = document.createElement('span');
                span.textContent = `${npcData.name} (${npcData.simpleAttributes || ''})`;

                const detailsBtn = document.createElement('button');
                detailsBtn.textContent = '详情';
                detailsBtn.classList.add('details-btn');
                detailsBtn.onclick = () => showNpcDetails(npcId); // Use modal or inline expansion

                li.appendChild(img);
                li.appendChild(span);
                li.appendChild(detailsBtn);
                npcListUl.appendChild(li);
            }
        });
    }

    // Update Item Panel
    const itemListUl = document.getElementById('item-list');
    if (itemListUl) {
        itemListUl.innerHTML = ''; // Clear old list
        gameState.player.inventory.forEach(itemId => {
            const itemData = gameState.items[itemId];
            if (itemData) {
                const li = document.createElement('li');
                li.dataset.itemId = itemId;

                const span = document.createElement('span');
                span.textContent = itemData.name;
                // Optionally add an icon: const img = document.createElement('img'); img.src = itemData.icon; li.appendChild(img);

                li.appendChild(span);

                // Add 'Use' button if usable
                if (itemData.usableOnNpc) { // Extend this for other uses
                     const useBtn = document.createElement('button');
                     useBtn.textContent = '使用';
                     useBtn.classList.add('use-item-btn');
                     useBtn.onclick = () => handleItemUse(itemId); // Implement this function
                     li.appendChild(useBtn);
                }

                itemListUl.appendChild(li);
            }
        });
    }
}

function displayEvent(event) {
    const eventImage = document.getElementById('event-image');
    const eventText = document.getElementById('event-text');
    const eventOptionsDiv = document.getElementById('event-options');

    if (!event) {
        console.error("Attempted to display null event");
        eventText.textContent = "错误：无法加载事件。";
        eventOptionsDiv.innerHTML = "";
        if(eventImage) eventImage.style.display = 'none';
        return;
    }

    if (eventImage) {
        if (event.image) {
            eventImage.src = event.image;
            eventImage.alt = event.id;
            eventImage.style.display = 'block';
        } else {
            eventImage.style.display = 'none'; // Hide if no image
        }
    }
    if (eventText) eventText.innerHTML = event.text; // Use innerHTML to allow basic HTML in event text
    if (eventOptionsDiv) {
        eventOptionsDiv.innerHTML = ''; // Clear old options
        event.options.forEach((option, index) => {
            // Check if option prerequisites are met
            if (checkPrerequisites(option.prerequisites)) {
                const button = document.createElement('button');
                button.textContent = option.text;
                button.dataset.optionIndex = index; // Store index to find the option later
                button.onclick = () => handleOptionClick(event.id, index);
                eventOptionsDiv.appendChild(button);
            }
        });
         // Add a default "Continue" if no options are available/valid?
         if (eventOptionsDiv.children.length === 0 && !event.endsGame) {
             const continueBtn = document.createElement('button');
             continueBtn.textContent = "继续...";
             continueBtn.onclick = () => findAndTriggerNextEvent(); // Find a suitable random/next event
             eventOptionsDiv.appendChild(continueBtn);
         }
    }

    gameState.currentEvent = event.id; // Track the current event
    console.log(`Displayed event: ${event.id}`);
}


function showNpcDetails(npcId) {
    const npcData = gameState.npcs[npcId];
    if (!npcData) return;

    const modal = document.getElementById('npc-detail-modal');
    const nameEl = document.getElementById('modal-npc-name');
    const avatarEl = document.getElementById('modal-npc-avatar');
    const attributesEl = document.getElementById('modal-npc-attributes');
    const functionsEl = document.getElementById('modal-npc-functions');
    const closeBtn = modal.querySelector('.close-btn');

    nameEl.textContent = npcData.name;
    avatarEl.src = npcData.avatar || 'assets/images/default_avatar.png';
    attributesEl.innerHTML = ''; // Clear previous
    for (const key in npcData.detailedAttributes) {
        const p = document.createElement('p');
        p.textContent = `${key}: ${npcData.detailedAttributes[key]}`;
        attributesEl.appendChild(p);
    }

    functionsEl.innerHTML = ''; // Clear previous
    if (npcData.specialFunctions) {
        npcData.specialFunctions.forEach(func => {
            const btn = document.createElement('button');
            btn.textContent = func.text;
            btn.onclick = () => handleNpcFunction(npcId, func.id); // Implement this
            functionsEl.appendChild(btn);
        });
    }

    modal.style.display = 'block';

    closeBtn.onclick = () => {
        modal.style.display = 'none';
    }
    // Close modal if clicking outside of it
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function handleItemUse(itemId) {
    const item = gameState.items[itemId];
    console.log(`Attempting to use item: ${item.name}`);
    // Simple example: Use gift on an NPC
    if (item.usableOnNpc) {
        // Ask player to select an NPC target
        const targetNpcId = prompt(`对哪个 NPC 使用 ${item.name}? (输入ID: ${gameState.player.activeNPCs.join(', ')})`);
        if (targetNpcId && gameState.player.activeNPCs.includes(targetNpcId)) {
            console.log(`Using ${itemId} on ${targetNpcId}`);
            // Implement effect: e.g., improve relationship
            alert(`${item.name} 已对 ${gameState.npcs[targetNpcId].name} 使用!`); // Placeholder feedback
            removeItemFromInventory(itemId); // Consume item
            // Potentially trigger a specific event or update NPC state
            // updateNpcRelationship(targetNpcId, 10); // Example function
            saveGame(gameState);
            updateUI();
        } else if (targetNpcId) {
            alert("无效的 NPC ID 或该 NPC 不在队伍中。");
        }
    } else {
        alert(`你不能在这里使用 ${item.name}。`);
    }
    // Add logic for other item types (potions, keys in specific events, etc.)
}

function handleNpcFunction(npcId, functionId) {
     const npc = gameState.npcs[npcId];
     console.log(`Interacting with ${npc.name}, function: ${functionId}`);
     alert(`你对 ${npc.name} 执行了 ${functionId} 操作。（功能待实现）`);
     // Implement logic based on functionId (e.g., 'talk' might trigger a specific event, 'bribe' check inventory for gold)
     document.getElementById('npc-detail-modal').style.display = 'none'; // Close modal after action
}


function switchScreen(hideId, showId) {
    const hideElement = document.getElementById(hideId);
    const showElement = document.getElementById(showId);
    if (hideElement) hideElement.classList.remove('active');
    if (showElement) showElement.classList.add('active');
}

function loadGameScreenHTML(callback) {
    const gameContainer = document.getElementById('game-container');
    if (!gameContainer) {
        console.error("Game container not found!");
        return;
    }
    // Check if already loaded
    if (document.getElementById('game-screen')) {
         if(callback) callback();
         return;
    }

    fetch('game.html')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(html => {
            gameContainer.innerHTML = html;
            console.log("game.html loaded into container.");
            if (callback) callback(); // Execute callback after loading
        })
        .catch(error => {
            console.error('Error loading game.html:', error);
            gameContainer.innerHTML = "<p>错误：无法加载游戏界面。</p>";
        });
}
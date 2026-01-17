// script.js
document.addEventListener('DOMContentLoaded', async () => {
    const openModalBtn = document.getElementById('open-search-modal');
    const searchModal = document.getElementById('search-modal');
    const closeModalBtn = document.getElementById('close-search-modal');
    const startSearchFromModalBtn = document.querySelector('.modal-start-btn');
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const controlBtn = document.getElementById('control-btn');
    const statusHeader = document.getElementById('status-header');
    
    const diceBtn = document.getElementById('random-question-btn');
    
    const userCountElement = document.getElementById('user-count-number');
    const reportBtn = document.getElementById('report-user-btn');
    const banNotification = document.getElementById('ban-notification');
    const reportConfirmationPopup = document.getElementById('report-confirmation-popup');
    
    const favicon = document.getElementById('favicon');
    const originalTitle = document.title;
    const defaultFavicon = 'public/img/fav.png';
    const notificationFavicon = 'public/img/fav_.png';
    const notificationSound = new Audio('public/sound/not.mp3');
    const soundBtn = document.getElementById('toggle-sound-btn');
    const soundIcon = soundBtn.querySelector('i');
    let isMuted = localStorage.getItem('notificationsMuted') === 'true';

    userInput.maxLength = 300;
    let searchPreferences = null;
    const defaultSearchGender = document.querySelector('input[name="search-gender"][value="any"]');
    if (defaultSearchGender) defaultSearchGender.checked = true;
    
    let currentSessionId = null;
    let socket, peerConnection, dataChannel, connectionTimer, typingTimer, disconnectCooldownTimer, botTypingAnimationTimeout, p2pConnectionTimeout;

    let isBotMode = false, isTyping = false, isConnecting = false, isBotTypingAnimationActive = false, isConnectionEnding = false;
    let canSendMessage = true;
    const MESSAGE_COOLDOWN = 1500;
    let inactivityTimeout = null, inactivityProbeTimer = null;
    const TYPING_TIMER_LENGTH = 1500;
    
    let isBanned = false;
    let hasReportedCurrentPartner = false;
    let reportButtonTimer = null;
    
    let isDiceOnCooldown = false;
    const DICE_COOLDOWN = 20000;

    let realUserCount = 0;
    const fakeUserSchedule = [
        { time: 0, users: 727 }, { time: 20, users: 685 }, { time: 40, users: 643 }, { time: 60, users: 602 }, { time: 80, users: 560 }, { time: 100, users: 518 },
        { time: 120, users: 476 }, { time: 140, users: 435 }, { time: 160, users: 393 }, { time: 180, users: 351 }, { time: 200, users: 309 }, { time: 220, users: 268 },
        { time: 240, users: 226 }, { time: 260, users: 184 }, { time: 280, users: 142 }, { time: 300, users: 98 }, { time: 320, users: 105 }, { time: 340, users: 113 },
        { time: 360, users: 121 }, { time: 380, users: 128 }, { time: 400, users: 136 }, { time: 420, users: 144 }, { time: 440, users: 151 }, { time: 460, users: 159 },
        { time: 480, users: 167 }, { time: 500, users: 175 }, { time: 520, users: 182 }, { time: 540, users: 190 }, { time: 560, users: 198 }, { time: 580, users: 205 },
        { time: 600, users: 213 }, { time: 620, users: 221 }, { time: 640, users: 228 }, { time: 660, users: 236 }, { time: 680, users: 244 }, { time: 700, users: 251 },
        { time: 720, users: 254 }, { time: 740, users: 278 }, { time: 760, users: 302 }, { time: 780, users: 326 }, { time: 800, users: 350 }, { time: 820, users: 374 },
        { time: 840, users: 398 }, { time: 860, users: 422 }, { time: 880, users: 446 }, { time: 900, users: 470 }, { time: 920, users: 494 }, { time: 940, users: 518 },
        { time: 960, users: 542 }, { time: 980, users: 566 }, { time: 1000, users: 590 }, { time: 1020, users: 614 }, { time: 1040, users: 638 }, { time: 1060, users: 662 },
        { time: 1080, users: 686 }, { time: 1100, users: 710 }, { time: 1120, users: 734 }, { time: 1140, users: 758 }, { time: 1160, users: 782 }, { time: 1180, users: 806 },
        { time: 1200, users: 830 }, { time: 1220, users: 854 }, { time: 1240, users: 878 }, { time: 1260, users: 902 }, { time: 1280, users: 926 }, { time: 1300, users: 950 },
        { time: 1320, users: 971 }, { time: 1340, users: 944 }, { time: 1360, users: 917 }, { time: 1380, users: 890 }, { time: 1400, users: 863 }, { time: 1420, users: 806 },
        { time: 1440, users: 727 }
    ];

    let iceServersConfig = null;

    async function fetchIceServers() {
        try {
            const response = await fetch('/get-ice-servers');
            if (!response.ok) {
                throw new Error('Server response was not ok.');
            }
            const config = await response.json();
            iceServersConfig = config;
            console.log("Pomyślnie pobrano konfigurację serwerów.");
        } catch (error) {
            console.error("Nie udało się pobrać konfiguracji ICE. Używam publicznych STUN.", error);
            iceServersConfig = { 
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ] 
            };
        }
    }

    await fetchIceServers();
    
    const handleNewMessageNotification = () => {
        if (document.hidden) {
            favicon.href = notificationFavicon;
            document.title = 'Nowa wiadomość! | ' + originalTitle;
            if (!isMuted) {
                notificationSound.play().catch(error => console.error("Błąd odtwarzania dźwięku:", error));
            }
        }
    };
    
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            favicon.href = defaultFavicon;
            document.title = originalTitle;
        }
    });

    const updateSoundIcon = () => {
        if (isMuted) {
            soundIcon.className = 'fas fa-volume-mute';
            soundBtn.title = 'Włącz dźwięk powiadomień';
        } else {
            soundIcon.className = 'fas fa-volume-up';
            soundBtn.title = 'Wycisz dźwięk powiadomień';
        }
    };
    
    soundBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        localStorage.setItem('notificationsMuted', isMuted);
        updateSoundIcon();
    });

    updateSoundIcon();

    function getFakeUserCount() {
        const now = new Date();
        const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
        let startIndex = 0;
        for (let i = 0; i < fakeUserSchedule.length - 1; i++) {
            if (minutesSinceMidnight >= fakeUserSchedule[i].time && minutesSinceMidnight < fakeUserSchedule[i + 1].time) {
                startIndex = i;
                break;
            }
        }
        const endIndex = startIndex + 1;
        const startPoint = fakeUserSchedule[startIndex];
        const endPoint = fakeUserSchedule[endIndex];
        const timeRange = endPoint.time - startPoint.time;
        if (timeRange === 0) return startPoint.users;
        const timeProgress = (minutesSinceMidnight - startPoint.time) / timeRange;
        const userRange = endPoint.users - startPoint.users;
        const interpolatedUsers = startPoint.users + userRange * timeProgress;
        return Math.round(interpolatedUsers);
    }

    function updateDisplayedUserCount() {
        if (!userCountElement) return;
        const fakeUsers = getFakeUserCount();
        const totalUsers = fakeUsers + realUserCount;
        const fluctuation = Math.floor(Math.random() * 4) - 2;
        const finalCount = totalUsers + fluctuation;
        userCountElement.textContent = finalCount > 0 ? finalCount : 0;
    }
    
    const openModal = () => searchModal.classList.add('visible');
    const closeModal = () => searchModal.classList.remove('visible');
    openModalBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    searchModal.addEventListener('click', (e) => { if (e.target === searchModal) closeModal(); });
    const setStatus = (text, statusClass) => { statusHeader.innerHTML = `<span id="status-dot" class="status-dot ${statusClass}"></span>${text}`; };
    const linkify = (text) => text.replace(/(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    const getFormattedTime = () => { const now = new Date(); const hours = String(now.getHours()).padStart(2, '0'); const minutes = String(now.getMinutes()).padStart(2, '0'); return `${hours}:${minutes}`; };
    const addMessage = (text, className) => {
        const el = document.createElement('div');
        el.classList.add('message', className);
        const content = document.createElement('span');
        content.classList.add('message-content');
        content.innerHTML = linkify(text);
        el.appendChild(content);
        if (className === 'user-message' || className === 'stranger-message') {
            const meta = document.createElement('div');
            meta.classList.add('message-meta');
            const time = document.createElement('span');
            time.classList.add('message-time');
            time.textContent = getFormattedTime();
            meta.appendChild(time);
            if (className === 'user-message') {
                const tick = document.createElement('img');
                tick.src = 'public/img/tick.png';
                tick.alt = 'status';
                tick.classList.add('message-tick', 'pending');
                meta.appendChild(tick);
            }
            el.appendChild(meta);
        }
        chatBox.appendChild(el);
        chatBox.scrollTop = chatBox.scrollHeight;
        
        if (className === 'stranger-message') {
            handleNewMessageNotification();
        }
    };
    const showConfirmationPopup = (message) => { reportConfirmationPopup.textContent = message; reportConfirmationPopup.classList.add('visible'); setTimeout(() => { reportConfirmationPopup.classList.remove('visible'); }, 3000); };
    const getPolishMinuteForm = (minutes) => { if (minutes === 1) return "minutę"; if ([2, 3, 4].includes(minutes % 10) && ![12, 13, 14].includes(minutes % 100)) return "minuty"; return "minut"; };
    const showBanScreen = (expiryTimestamp) => { isBanned = true; controlBtn.disabled = true; const remainingTime = Math.round((expiryTimestamp - Date.now()) / 1000); const minutes = Math.max(1, Math.ceil(remainingTime / 60)); const banMessage = banNotification.querySelector('span'); const minuteForm = getPolishMinuteForm(minutes); banMessage.textContent = `Wykryliśmy naruszenie regulaminu. Ochłoń i wróć za ${minutes} ${minuteForm} :)`; banNotification.classList.add('visible'); const banCheckInterval = setInterval(() => { if (Date.now() > expiryTimestamp) { isBanned = false; controlBtn.disabled = false; banNotification.classList.remove('visible'); addMessage('Możesz ponownie łączyć się z innymi.', 'system-message'); clearInterval(banCheckInterval); } }, 5000); };
    const showTypingIndicator = () => { if (!document.getElementById('typing-indicator')) { const i = document.createElement('div'); i.id = 'typing-indicator'; i.classList.add('message', 'typing-indicator'); i.innerHTML = '<span></span><span></span><span></span>'; chatBox.appendChild(i); chatBox.scrollTop = chatBox.scrollHeight; } };
    const hideTypingIndicator = () => { const i = document.getElementById('typing-indicator'); if (i) i.remove(); };
    const stopBotTypingAnimation = () => { isBotTypingAnimationActive = false; clearTimeout(botTypingAnimationTimeout); hideTypingIndicator(); };
    const startIntermittentBotTyping = () => { stopBotTypingAnimation(); isBotTypingAnimationActive = true; const typingCycle = () => { if (!isBotTypingAnimationActive) { hideTypingIndicator(); return; } const writingDuration = Math.random() * 2000 + 4000; showTypingIndicator(); botTypingAnimationTimeout = setTimeout(() => { hideTypingIndicator(); const pauseDuration = Math.random() * 2000 + 2000; botTypingAnimationTimeout = setTimeout(typingCycle, pauseDuration); }, writingDuration); }; botTypingAnimationTimeout = setTimeout(typingCycle, 2000); };
    const clearChat = () => { chatBox.innerHTML = ''; };
    const enableChat = () => { const textareaWrapper = document.querySelector('.textarea-wrapper'); userInput.disabled = false; sendBtn.disabled = false; userInput.focus(); if (textareaWrapper) textareaWrapper.classList.remove('chat-disabled'); };
    const disableChat = () => { const textareaWrapper = document.querySelector('.textarea-wrapper'); const emojiPicker = document.getElementById('emoji-picker'); userInput.disabled = true; sendBtn.disabled = true; userInput.value = ''; autoGrowTextarea(); if (textareaWrapper) textareaWrapper.classList.add('chat-disabled'); if (emojiPicker) emojiPicker.classList.remove('visible'); };
    const autoGrowTextarea = () => { userInput.style.height = 'auto'; userInput.style.height = userInput.scrollHeight + 'px'; };
    const setButtonToConnectMode = () => { controlBtn.classList.remove('disconnect-mode'); controlBtn.classList.add('connect-mode'); controlBtn.title = 'Połącz'; controlBtn.innerHTML = '<i class="fas fa-play"></i>'; };
    const setButtonToDisconnectMode = () => { controlBtn.classList.remove('connect-mode'); controlBtn.classList.add('disconnect-mode'); controlBtn.title = 'Rozłącz'; controlBtn.innerHTML = '<i class="fas fa-stop"></i>'; };
    
    const startInactivityTimer = () => {
        clearTimeout(inactivityTimeout);
        clearTimeout(inactivityProbeTimer);
    
        const probingMessages = [
            [], ["halo"], [], ["halo?"], ["jesteś?"], , [], ["jestes??"], [], ["halooo?"], [], [":)"], ["jestes tam?"], [], ["Jestes??"], [": )"], [], ["😅"] ["?"],["?"], ["ej?"], ["hmm"], ["halo ?"], [], ["🙃"], [], ["😉"], [], ["🤨"], ["😏"], [], ["☺️"]
        ];
    
        inactivityProbeTimer = setTimeout(() => {
            if (isBotMode) {
                const selectedMessage = probingMessages[Math.floor(Math.random() * probingMessages.length)];
                if (selectedMessage.length > 0) {
                    displayBotMessages(selectedMessage, { resetInactivityTimer: false });
                }
            }
        }, 20000);
    
        inactivityTimeout = setTimeout(() => {
            if (isBotMode) {
                addMessage('<strong>Rozmówca się rozłączył.</strong>', 'system-message');
                endConnection();
            }
        }, 30000);
    };
    
    const finalizeConnection = () => {
        clearTimeout(connectionTimer); clearTimeout(p2pConnectionTimeout); isConnecting = false; clearChat(); setStatus('Połączono', 'connected'); addMessage('Połączono! Możesz zacząć rozmowę.', 'system-message'); enableChat();
        hasReportedCurrentPartner = false; reportBtn.style.display = 'block'; reportBtn.classList.add('disabled'); reportBtn.title = 'Musisz odczekać 10 sekund';
        clearTimeout(reportButtonTimer);
        reportButtonTimer = setTimeout(() => { reportBtn.classList.remove('disabled'); reportBtn.title = 'Zgłoś użytkownika'; }, 10000);
        
        // ZABLOKUJ OBA PRZYCISKI
        controlBtn.disabled = true;
        controlBtn.classList.add('cooldown', 'recharging');
        openModalBtn.style.pointerEvents = 'none'; // Blokuje kliknięcie
        openModalBtn.style.opacity = '0.5'; // Wygasza ikonę
    
        setTimeout(() => controlBtn.classList.remove('cooldown'), 50);
        
        disconnectCooldownTimer = setTimeout(() => {
            // ODBLOKUJ OBA PRZYCISKI
            controlBtn.disabled = false;
            controlBtn.classList.remove('recharging');
            openModalBtn.style.pointerEvents = 'auto'; // Przywraca klikalność
            openModalBtn.style.opacity = '1'; // Przywraca normalny wygląd
        }, 10000);
    };

    window.addEventListener('offline', () => { if (controlBtn.classList.contains('disconnect-mode')) { endConnection(); addMessage('Rozmowa zakończona. Sprawdź połączenie z internetem.', 'system-message'); } });
    window.addEventListener('online', () => { addMessage('Połączenie internetowe zostało przywrócone.', 'system-message'); });
    
    const startSearch = (preferences) => {
        if (!navigator.onLine) { addMessage('Błąd. Sprawdź połączenie z internetem.', 'system-message'); setStatus('Rozłączono', 'disconnected'); setButtonToConnectMode(); isConnecting = false; isConnectionEnding = false; return; }
        if (isConnecting || isBanned) return;
        isConnecting = true; isConnectionEnding = false; clearChat(); isBotMode = false; setButtonToDisconnectMode(); setStatus('Szukam rozmówcy...', 'connecting'); addMessage('Łączenie z serwerem i szukanie pary...', 'system-message');
        connectionTimer = setTimeout(() => { if (!navigator.onLine) { handleDisconnection('Rozmowa zakończona. Sprawdź połączenie z internetem.'); return; } connectToBot(preferences); }, 10000);
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'findPartner', preferences: preferences }));
        } else {
            console.error("Błąd: Socket nie jest połączony.");
            addMessage('Błąd połączenia z serwerem. Odśwież stronę.', 'system-message');
            setButtonToConnectMode();
            isConnecting = false;
            return;
        }
    };

    const connectToBot = (preferences) => {
        isBotMode = true; clearTimeout(connectionTimer);
        if (socket && socket.readyState !== WebSocket.CLOSED) { socket.onclose = null; socket.close(); socket = null; }
        finalizeConnection();
        const body = preferences ? { preferredGender: preferences.searchGender } : {};
        fetch('/start-bot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(res => res.json()).then(data => { if (data.sessionId) currentSessionId = data.sessionId; if (data.initialMessage && isBotMode) setTimeout(async () => { if (isBotMode) await displayBotMessages([data.initialMessage]); }, 1000); }).catch(err => { console.error("Błąd.", err); if (isBotMode) addMessage("Błąd połączenia.", 'system-message'); });
    };
    
    const endConnection = () => {
        isConnectionEnding = false; isConnecting = false; stopBotTypingAnimation();
        clearTimeout(connectionTimer); clearTimeout(p2pConnectionTimeout); clearTimeout(disconnectCooldownTimer); clearTimeout(inactivityTimeout); clearTimeout(inactivityProbeTimer); clearTimeout(reportButtonTimer);
        currentSessionId = null; 
        
        // Zapewnij, że przyciski są odblokowane po zakończeniu
        controlBtn.classList.remove('cooldown', 'recharging');
        if (!isBanned) controlBtn.disabled = false;
        openModalBtn.style.pointerEvents = 'auto';
        openModalBtn.style.opacity = '1';

        if (peerConnection) { peerConnection.close(); peerConnection = null; }
        if (dataChannel) dataChannel = null;
        if (socket) {
             if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'disconnectPeer' })); 
             socket.onclose = null;
             socket.close(); 
             socket = null; 
        }
        isBotMode = false; disableChat(); setStatus('Rozłączono', 'disconnected'); setButtonToConnectMode(); reportBtn.style.display = 'none';
        if (typeof window.incrementConversationCount === 'function') window.incrementConversationCount();
        initializeWebSocket();
    };

    const handleDisconnection = (message) => { if (isConnecting || isBotMode || peerConnection) { addMessage(message, 'system-message'); endConnection(); } };
    
    const startP2PConnection = (isInitiator) => {
        if (peerConnection) return;
        peerConnection = new RTCPeerConnection(iceServersConfig);

        clearTimeout(p2pConnectionTimeout);
        p2pConnectionTimeout = setTimeout(() => { if (isConnecting && peerConnection) { addMessage('Nawiązywanie połączenia z rozmówcą trwa zbyt długo. Ponawiam...', 'system-message'); peerConnection.close(); peerConnection = null; dataChannel = null; connectToBot(searchPreferences); } }, 3000);
        peerConnection.onicecandidate = (e) => { if (e.candidate && socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'signal', data: { candidate: e.candidate } })); };
        peerConnection.onconnectionstatechange = () => { if (peerConnection && peerConnection.connectionState === "failed") { if (isConnecting) { isConnecting = false; addMessage('Połączenie z rozmówcą nie powiodło się. Ponawiam...', 'system-message'); if (peerConnection) { peerConnection.close(); peerConnection = null; } dataChannel = null; connectToBot(searchPreferences); } } };
        peerConnection.ondatachannel = (e) => { dataChannel = e.channel; setupDataChannel(); };
        if (isInitiator) { dataChannel = peerConnection.createDataChannel('chat'); setupDataChannel(); peerConnection.createOffer().then(o => peerConnection.setLocalDescription(o)).then(() => { if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'signal', data: { sdp: peerConnection.localDescription } })); }); } 
        addMessage('Znaleziono rozmówcę! Nawiązywanie połączenia...', 'system-message');
    };

    const handleSignalingData = async (data) => { if (!peerConnection || peerConnection.signalingState === 'closed') return; try { if (data.sdp) { await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp)); if (peerConnection.remoteDescription.type === 'offer') { const answer = await peerConnection.createAnswer(); await peerConnection.setLocalDescription(answer); if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'signal', data: { sdp: peerConnection.localDescription } })); } } else if (data.candidate) await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch (error) { console.error("Błąd przy obsłudze sygnału:", error); } };
    
    const setupDataChannel = () => {
        dataChannel.onopen = () => finalizeConnection();
        dataChannel.onmessage = (event) => {
            try {
                const d = JSON.parse(event.data);
                if (d.type === 'typing') {
                    if (d.status) showTypingIndicator();
                    else hideTypingIndicator();
                } 
                else if (d.type === 'random_question' && d.text) {
                    hideTypingIndicator();
                    const displayText = `<img src="public/img/dice.png" alt="dice" class="dice-prefix"> ${d.text}`;
                    addMessage(displayText, 'stranger-message');
                }
            } catch (e) {
                hideTypingIndicator();
                addMessage(event.data, 'stranger-message');
            }
        };
        dataChannel.onclose = () => handleDisconnection('<strong>Rozmówca się rozłączył.</strong>');
    };

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    const displayBotMessages = async (messages, options = { resetInactivityTimer: true }) => {
        if (isBotMode && options.resetInactivityTimer) {
            startInactivityTimer();
        }

        for (let i = 0; i < messages.length; i++) {
            if (!isBotMode) return;
            const msg = messages[i];
            const typingTime = msg.length * 60 + (Math.random() * 1700 + 400);

            showTypingIndicator();
            await wait(typingTime);
            hideTypingIndicator();

            await wait(250);

            if (isBotMode) {
                addMessage(msg, 'stranger-message');
            }

            if (i < messages.length - 1) {
                await wait(Math.random() * 1400 + 500);
            }
        }
    };

    const sendMessage = async (messagePayload = null) => {
        if (!canSendMessage && !messagePayload) return;
        clearTimeout(inactivityTimeout); clearTimeout(inactivityProbeTimer);
        const isCustomMessage = messagePayload !== null;
        const backendMessage = isCustomMessage ? messagePayload.backendText : userInput.value.trim();
        const displayMessage = isCustomMessage ? messagePayload.displayText : backendMessage;
        if (backendMessage === '' || backendMessage.length > 300) return;
        canSendMessage = false; sendBtn.disabled = true;
        setTimeout(() => { canSendMessage = true; if (!userInput.disabled) sendBtn.disabled = false; }, MESSAGE_COOLDOWN);
        addMessage(displayMessage, 'user-message');
        if (!isCustomMessage) { userInput.value = ''; autoGrowTextarea(); }
        const lastTick = chatBox.querySelector('.message-tick.pending:last-of-type');
        if (isBotMode) {
            if (!currentSessionId) return addMessage("Błąd sesji. Odśwież stronę.", "system-message");
            if (isConnectionEnding) return;
            startIntermittentBotTyping();
            try {
                const response = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: backendMessage, sessionId: currentSessionId }) });
                if (lastTick) lastTick.classList.remove('pending');
                stopBotTypingAnimation();
                if (!response.ok || response.status === 204) return; const data = await response.json(); if (!isBotMode) return;
                if (data.action === "contradictionDisconnect") { addMessage("Bot wykrył sprzeczność w rozmowie. Koniec.", "system-message"); setTimeout(() => endConnection(), 4000); return; }
                if (data.action === "disconnect") { if (data.replies?.length > 0) await displayBotMessages(data.replies); setTimeout(() => { addMessage('<strong>Rozmówca się rozłączył.</strong>', 'system-message'); endConnection(); }, 4000); return; }
                if (data.action === "silentDisconnect") { if (data.replies?.length > 0) await displayBotMessages(data.replies); isConnectionEnding = true; setTimeout(() => { if (isBotMode) { addMessage('<strong>Rozmówca się rozłączył.</strong>', 'system-message'); endConnection(); } }, 10000); return; }
                if (data.replies?.length > 0) await displayBotMessages(data.replies);
            } catch (error) { stopBotTypingAnimation(); console.error(error); if (isBotMode) { addMessage('pa', 'stranger-message'); isConnectionEnding = true; setTimeout(() => { if (isBotMode) { addMessage('Rozmowa zakończona z powodu błędu.', 'system-message'); endConnection(); } }, 10000); } }
        } 
        else if (dataChannel?.readyState === 'open') {
            if (isCustomMessage) {
                const payload = {
                    type: 'random_question',
                    text: backendMessage 
                };
                dataChannel.send(JSON.stringify(payload));
            } else {
                dataChannel.send(backendMessage);
            }
            if (lastTick) lastTick.classList.remove('pending');
            clearTimeout(typingTimer); isTyping = false; dataChannel.send(JSON.stringify({ type: 'typing', status: false }));
        }
    };

    controlBtn.addEventListener('click', () => {
        if (isBanned) { banNotification.classList.add('visible'); return; }
        if (controlBtn.classList.contains('connect-mode')) {
            if (searchPreferences === null) openModal(); 
            else startSearch(searchPreferences);
        } else { 
            addMessage('<strong>Rozłączyłeś się</strong>', 'system-message'); 
            endConnection(); 
        }
    });

    startSearchFromModalBtn.addEventListener('click', () => {
        searchPreferences = { searchGender: document.querySelector('input[name="search-gender"]:checked').value, purpose: document.querySelector('input[name="purpose"]:checked').value, myGender: document.querySelector('input[name="my-gender"]:checked').value };
        closeModal(); startSearch(searchPreferences);
    });

    sendBtn.addEventListener('click', () => sendMessage());
    userInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    userInput.addEventListener('input', () => {
        autoGrowTextarea(); if (isBotMode || !dataChannel || dataChannel.readyState !== 'open') return;
        clearTimeout(typingTimer);
        if (!isTyping) { isTyping = true; dataChannel.send(JSON.stringify({ type: 'typing', status: true })); }
        typingTimer = setTimeout(() => { isTyping = false; dataChannel.send(JSON.stringify({ type: 'typing', status: false })); }, TYPING_TIMER_LENGTH);
    });

    diceBtn.addEventListener('click', async () => {
        if (userInput.disabled || isDiceOnCooldown) return;
        isDiceOnCooldown = true;
        diceBtn.classList.add('disabled');
        setTimeout(() => { isDiceOnCooldown = false; diceBtn.classList.remove('disabled'); }, DICE_COOLDOWN);
        try {
            const response = await fetch('/random-question');
            if (!response.ok) throw new Error('Server response not ok');
            const data = await response.json();
            if (data.question) {
                const messagePayload = {
                    displayText: `<img src="public/img/dice.png" alt="dice" class="dice-prefix"> ${data.question}`,
                    backendText: data.question
                };
                sendMessage(messagePayload);
            }
        } catch (error) {
            console.error('Błąd podczas losowania pytania:', error);
            addMessage('Nie udało się wylosować pytania. Spróbuj ponownie.', 'system-message');
        }
    });

    reportBtn.addEventListener('click', () => {
        if (reportBtn.classList.contains('disabled') || hasReportedCurrentPartner) return;
        hasReportedCurrentPartner = true;
        if (isBotMode) { showConfirmationPopup('Dziękujemy za zgłoszenie.'); setTimeout(() => endConnection(), 500); return; }
        if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'reportPartner' }));
        showConfirmationPopup('Dziękujemy za zgłoszenie.');
    });
    
    function initializeWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const WSS_URL = `${protocol}//${window.location.host}`;

        socket = new WebSocket(WSS_URL);
        
        socket.onopen = () => {
            if (isBanned) return;
            console.log("Połączono z serwerem WebSocket.");
        };

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'userCountUpdate') {
                realUserCount = data.count;
                updateDisplayedUserCount();
                return;
            }
            if (data.type === 'banned') {
                showBanScreen(data.expiry);
                endConnection();
                return;
            }
            if (data.type === 'partnerFound') {
                clearTimeout(connectionTimer);
                startP2PConnection(data.initiator);
            } else if (data.type === 'signal') {
                if (peerConnection) handleSignalingData(data.data);
            } else if (data.type === 'partnerDisconnected') {
                handleDisconnection('<strong>Rozmówca się rozłączył.</strong>');
            }
        };
        
        socket.onclose = () => {
            console.log("Połączenie z serwerem WebSocket zostało zamknięte.");
             if (isBanned) return;
             if (peerConnection || isConnecting) {
                const message = navigator.onLine ? 'Połączenie z serwerem zostało zerwane.' : 'Rozmowa zakończona. Sprawdź połączenie z internetem.';
                handleDisconnection(message);
             }
        };
        
        socket.onerror = (err) => { 
            console.error("Błąd WebSocket:", err); 
            addMessage('Nie udało się połączyć z serwerem. Spróbuj odświeżyć stronę.', 'system-message');
        };
    }

    initializeWebSocket();
    updateDisplayedUserCount();
    setInterval(updateDisplayedUserCount, 7000);
});
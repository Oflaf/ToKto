// server.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fetch = require('node-fetch');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const fs = require('fs').promises;

// NOWA ZMIANA: Import biblioteki Twilio
const twilio = require('twilio');

const { generateBotProfile } = require('./persona-generator.js');

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
    console.error('BRAK KLUCZA GOOGLE_API_KEY W .env');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const BANS_FILE_PATH = path.join(__dirname, 'bans.json');
const BAN_DURATION = 10 * 60 * 1000;
const REPORTS_TO_BAN = 5;

let bannedIPs = new Map();
let reportCounts = new Map();
let randomQuestions = [];

async function loadQuestions() {
    try {
        const data = await fs.readFile(path.join(__dirname, 'los.txt'), 'utf8');
        randomQuestions = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (randomQuestions.length > 0) {
            console.log(`[Pytania] Wczytano ${randomQuestions.length} losowych pytań.`);
        } else {
            console.warn('[Pytania] Plik los.txt jest pusty.');
        }
    } catch (error) {
        console.error('[Pytania] Nie udało się wczytać pliku los.txt:', error);
    }
}

async function loadBans() {
    try {
        await fs.access(BANS_FILE_PATH);
        const data = await fs.readFile(BANS_FILE_PATH, 'utf8');
        const bansFromFile = JSON.parse(data);
        const now = Date.now();
        bannedIPs.clear();
        for (const ip in bansFromFile) {
            if (bansFromFile[ip] > now) {
                bannedIPs.set(ip, bansFromFile[ip]);
            }
        }
        console.log(`[Bans] Wczytano ${bannedIPs.size} aktywnych banów z pliku.`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('[Bans] Plik bans.json nie istnieje. Zostanie utworzony przy pierwszym banie.');
            await fs.writeFile(BANS_FILE_PATH, JSON.stringify({}));
        } else {
            console.error('[Bans] Błąd wczytywania pliku bans.json:', error);
        }
    }
}

async function saveBans() {
    const bansToSave = {};
    for (const [ip, expiry] of bannedIPs.entries()) {
        bansToSave[ip] = expiry;
    }
    try {
        await fs.writeFile(BANS_FILE_PATH, JSON.stringify(bansToSave, null, 2));
    } catch (error) {
        console.error('[Bans] Błąd zapisu do pliku bans.json:', error);
    }
}

function cleanupExpiredBans() {
    const now = Date.now();
    let changed = false;
    for (const [ip, expiry] of bannedIPs.entries()) {
        if (expiry <= now) {
            bannedIPs.delete(ip);
            reportCounts.delete(ip);
            changed = true;
            console.log(`[Bans] Ban dla IP ${ip} wygasł.`);
        }
    }
    if (changed) {
        saveBans();
    }
}

const MODEL_NAME = 'gemma-3n-e4b-it';
const CONTRADICTION_KEYWORDS = ['zaprzeczasz', 'sprzeczne', 'pisałeś inaczej', 'bez sensu', 'gubisz się'];
const OFFENSIVE_KEYWORDS = ['spierdalaj', 'kurwo', 'wtf', 'o co ci chodzi', 'co?', 'botem', 'jestes ai', 'wypierdalaj', 'pierdol', 'jeb', ];
const SAFE_FALLBACKS = ["eee", "ta", "aha", "yhm", "no", "mhm", "huh", "Huh", "AHa", "Aha", "No", "Yyy", "XD", "Hm"];
const RESTART_MESSAGES = [[], ["xd"], ["XD"], ["lol"], ["."], [], [], [], ["xddd"]];
const GOODBYE_MESSAGES = [["?"], ["xd"], ["XD"], ["."], ["aha"], ["wtf"], [], [], [], [], [], []];
const conversations = new Map();


// NOWA ZMIANA: Dodajemy bezpieczny endpoint do pobierania serwerów ICE
app.get('/get-ice-servers', async (req, res) => {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.warn('[ICE] Brak kluczy Twilio w .env. Zwracam tylko publiczne serwery STUN.');
        return res.json({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });
    }

    try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const token = await client.tokens.create();
        res.json({ iceServers: token.iceServers });
    } catch (error) {
        console.error('[ICE] Błąd podczas pobierania tokenu od Twilio:', error);
        res.status(500).json({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });
    }
});


app.get('/random-question', (req, res) => {
    if (randomQuestions.length === 0) {
        return res.status(500).json({ error: "Brak dostępnych pytań na serwerze." });
    }
    const question = randomQuestions[Math.floor(Math.random() * randomQuestions.length)];
    res.json({ question });
});


function isRepetitive(newMessage, history) {
    const normalize = (txt) => txt.toLowerCase().trim().replace(/[.,?!]/g, '');
    const newNorm = normalize(newMessage);
    const lastBotMessages = history.filter(msg => msg.role === "model").slice(-6).map(msg => normalize(msg.parts[0].text));
    if (lastBotMessages.length === 0) return false;
    const lastMsg = lastBotMessages[lastBotMessages.length - 1];
    if (newNorm === lastMsg) return true;
    if (newNorm.length < 5) return false;
    if (lastBotMessages.includes(newNorm)) return true;
    if ((newNorm.includes("co tam") || newNorm.includes("co robisz")) && lastBotMessages.some(m => m.includes("co tam") || m.includes("co robisz"))) return true;
    return false;
}

async function processBufferedMessages(sessionId) {
    const conversation = conversations.get(sessionId);
    if (!conversation) {
        console.error(`Próba przetworzenia wiadomości dla nieistniejącej sesji: ${sessionId}`);
        return;
    }
    if (conversation.isProcessing || conversation.messageBuffer.length === 0) return;
    conversation.isProcessing = true;
    const combinedUserMessage = conversation.messageBuffer[conversation.messageBuffer.length - 1];
    const responsesToResolve = [...conversation.pendingResponses];
    conversation.messageBuffer = [];
    conversation.pendingResponses = [];
    conversation.history.push({ role: "user", parts: [{ text: combinedUserMessage }] });
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: conversation.history })
        });
        const data = await response.json();
        if (!data.candidates || !data.candidates[0].content) {
            const randomReply = RESTART_MESSAGES[Math.floor(Math.random() * RESTART_MESSAGES.length)];
            responsesToResolve.forEach(res => res.json({ replies: randomReply, action: "silentDisconnect" }));
            conversations.delete(sessionId);
            conversation.isProcessing = false;
            return;
        }
        let botReply = data.candidates[0].content.parts[0].text.trim();
        if (isRepetitive(botReply, conversation.history)) {
            botReply = SAFE_FALLBACKS[Math.floor(Math.random() * SAFE_FALLBACKS.length)];
        }
        const archetype = conversation.archetype;
        let words = botReply.split(' ').filter(w => w.length > 0);
        if (archetype) {
            switch (archetype.type) {
                case 'one_word_reaction': words = words.slice(0, 1); break;
                case 'lowercase_lazy': case 'dry_short': case 'emoticon_minimalist': words = words.slice(0, 2); break;
                case 'short_answers_only': words = words.slice(0, 3); break;
                case 'lazy_abbreviation': words = words.slice(0, 4); break;
                default: words = words.slice(0, 6); break;
            }
            botReply = words.join(' ');
        }
        const firstQuestionMark = botReply.indexOf('?');
        const firstPeriod = botReply.indexOf('.');
        const endPositions = [firstQuestionMark, firstPeriod].filter(pos => pos !== -1);
        if (endPositions.length > 0) {
            const firstEndPosition = Math.min(...endPositions);
            botReply = botReply.substring(0, firstEndPosition + 1);
        }
        const questionCount = (botReply.match(/\?/g) || []).length;
        if (questionCount > 1) {
            botReply = botReply.substring(0, botReply.indexOf('?') + 1);
        }
        let replies = [botReply];
        const acceptableReactions = ['xd', 'lol', 'haha', 'xddd', 'xD', 'XD', 'x D'];
        if (botReply.includes('\n')) {
            const parts = botReply.split('\n').map(p => p.trim()).filter(p => p);
            if (parts.length === 2 && acceptableReactions.includes(parts[1].toLowerCase())) {
                replies = parts;
            } else {
                replies = [parts.join(' ')];
            }
        }
        conversation.history.push({ role: "model", parts: [{ text: botReply }] });
        const lastRes = responsesToResolve.pop();
        responsesToResolve.forEach(res => {
            if (!res.headersSent) res.status(204).send();
        });
        if (lastRes && !lastRes.headersSent) {
            lastRes.json({ replies: replies });
        }
    } catch (error) {
        console.error("Błąd przetwarzania:", error);
        const randomReply = RESTART_MESSAGES[Math.floor(Math.random() * RESTART_MESSAGES.length)];
        responsesToResolve.forEach(res => { if (!res.headersSent) res.json({ replies: randomReply, action: "silentDisconnect" }); });
        conversations.delete(sessionId);
    } finally {
        if (conversation) conversation.isProcessing = false;
    }
}

app.post('/start-bot', (req, res) => {
    let genderPreference = req.body.preferredGender;
    if (genderPreference === 'woman') genderPreference = 'k';
    else if (genderPreference === 'man') genderPreference = 'm';
    else if (genderPreference !== 'any') genderPreference = null;
    const botProfile = generateBotProfile({ preferredGender: genderPreference });
    
    let firstMessage = '';
    const botStartsConversation = Math.random() < 0.5;

    if (botStartsConversation) {
        const defaultGreetings = ['km', 'km?', 'k czy m?', 'hej', 'siema', 'k/m', 'hejka', 'czesc', 'siemaa', ''];
        firstMessage = defaultGreetings[Math.floor(Math.random() * defaultGreetings.length)];
        
        if (botProfile.type === 'slang_zoomer') {
            const greetings = ['siema', 'elo', 'hej', 'Siema', 'siemka', 'km?', 'KM?', "K czy m?", "k czy m", "km"];
            firstMessage = greetings[Math.floor(Math.random() * greetings.length)];
        } 
        if (botProfile.type === 'lowercase_lazy') firstMessage = Math.random() > 0.5 ? "hej" : "siema";
        if (botProfile.type === 'dry_short') firstMessage = "Hej.";
        if (Math.random() > 0.9) firstMessage += ` ${botProfile.persona.gender === 'k' ? 'k' : 'm'}`;
    }

    const sessionId = crypto.randomUUID();
    const newConversation = {
        id: sessionId,
        persona: botProfile.persona,
        archetype: botProfile.archetype,
        history: [{ role: "user", parts: [{ text: botProfile.instruction }] }, { role: "model", parts: [{ text: firstMessage }] }],
        isBotLocked: false, isProcessing: false, messageBuffer: [], pendingResponses: [],
        debounceTimer: null, conversationTurns: 0,
        maxTurns: Math.floor(Math.random() * (12 - 4 + 1)) + 4,
        lastActivity: Date.now()
    };
    conversations.set(sessionId, newConversation);
    console.log(`Nowa sesja bota utworzona: ${sessionId}. Postać: ${botProfile.persona.name} (${botProfile.persona.gender})`);
    
    res.json({ sessionId: sessionId, initialMessage: firstMessage });
});

app.post('/chat', (req, res) => {
    const { message, sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "Session ID is missing." });
    const conversation = conversations.get(sessionId);
    if (!conversation) return res.status(404).json({ error: "Session not found. Please start a new conversation." });
    if (conversation.isProcessing) return res.status(429).json({ error: "Bot is thinking, please wait." });
    const normalizedMessage = message.toLowerCase().trim().replace(/,/g, '');
    if (normalizedMessage === 'a ty' || normalizedMessage === 'a ty?') {
        console.log(`[Filtr] Zignorowano samotne 'a ty' dla sesji ${sessionId}.`);
        return res.status(204).send();
    }
    const persona = conversation.persona;
    const getBotIdentityResponse = () => {
        const genderResponse = persona.gender === 'k' ? 'k' : 'm';
        const kmResponseVariations = [`${genderResponse}`, `${genderResponse} ${persona.age}`, `${genderResponse}, ${persona.age}`, `${genderResponse}, ${persona.name}`, `${genderResponse} ${persona.age}, ${persona.name}`];
        return kmResponseVariations[Math.floor(Math.random() * kmResponseVariations.length)];
    };
    const kmTriggers = ["km", "k/m", "mk", "k czy m", "k/m?", "k czy m?"];
    const contextAndYouRegex = /^[mk\d\s]+a\s+ty\??$/;
    if (kmTriggers.includes(normalizedMessage) || contextAndYouRegex.test(normalizedMessage)) {
        const botReply = getBotIdentityResponse();
        conversation.history.push({ role: "user", parts: [{ text: message }] });
        conversation.history.push({ role: "model", parts: [{ text: botReply }] });
        return res.json({ replies: [botReply] });
    }
    conversation.lastActivity = Date.now();
    if (conversation.isBotLocked) return res.status(429).json({ error: "Wait" });
    if (!message) return res.status(400).json({ error: 'Empty' });
    const contradictionKeyword = CONTRADICTION_KEYWORDS.find(k => message.toLowerCase().includes(k));
    if (contradictionKeyword) {
        conversation.isBotLocked = true;
        res.json({ action: "contradictionDisconnect" });
        setTimeout(() => conversations.delete(sessionId), 5000); 
        return;
    }
    const foundKeyword = OFFENSIVE_KEYWORDS.find(k => message.toLowerCase().includes(k));
    if (foundKeyword) {
        conversation.isBotLocked = true; 
        const randomReply = RESTART_MESSAGES[Math.floor(Math.random() * RESTART_MESSAGES.length)];
        res.json({ replies: randomReply, action: "disconnect" });
        setTimeout(() => conversations.delete(sessionId), 5000);
        return;
    }
    conversation.conversationTurns++;
    if (conversation.conversationTurns >= conversation.maxTurns) {
        conversation.isBotLocked = true;
        const goodbyeMessage = GOODBYE_MESSAGES[Math.floor(Math.random() * GOODBYE_MESSAGES.length)];
        res.json({ replies: goodbyeMessage, action: "disconnect" });
        setTimeout(() => conversations.delete(sessionId), 5000);
        return;
    }
    conversation.messageBuffer.push(message);
    conversation.pendingResponses.push(res);
    if (conversation.debounceTimer) clearTimeout(conversation.debounceTimer);
    conversation.debounceTimer = setTimeout(() => processBufferedMessages(sessionId), 1500);
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
let waitingUsers = [];

wss.on('connection', (ws, req) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    ws.ip = ip;
    
    const banExpires = bannedIPs.get(ip);
    if (banExpires && banExpires > Date.now()) {
        console.log(`[Auth] Odrzucono połączenie od zbanowanego IP: ${ip}`);
        ws.send(JSON.stringify({ type: 'banned', expiry: banExpires }));
        ws.terminate();
        return;
    }
    console.log(`Nowy klient połączony z WebSocket (IP: ${ip}).`);
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            switch (data.type) {
                case 'findPartner':
                    ws.preferences = data.preferences;
                    console.log(`Klient (IP: ${ws.ip}) szuka partnera:`, ws.preferences);
                    findPartnerFor(ws);
                    break;
                case 'signal':
                    if (ws.partner && ws.partner.readyState === ws.OPEN) {
                        ws.partner.send(JSON.stringify({ type: 'signal', data: data.data }));
                    }
                    break;
                case 'disconnectPeer':
                    if (ws.partner) {
                        if (ws.partner.readyState === ws.OPEN) {
                            ws.partner.send(JSON.stringify({ type: 'partnerDisconnected' }));
                        }
                        ws.partner.partner = null;
                    }
                    ws.partner = null;
                    break;
                case 'reportPartner':
                    if (ws.partner) {
                        const reportedIP = ws.partner.ip;
                        console.log(`[Report] Użytkownik ${ws.ip} zgłosił ${reportedIP}`);
                        const currentReports = (reportCounts.get(reportedIP) || 0) + 1;
                        reportCounts.set(reportedIP, currentReports);
                        console.log(`[Report] IP ${reportedIP} ma teraz ${currentReports} zgłoszeń.`);
                        if (currentReports >= REPORTS_TO_BAN) {
                            const expiryTime = Date.now() + BAN_DURATION;
                            bannedIPs.set(reportedIP, expiryTime);
                            reportCounts.delete(reportedIP);
                            saveBans();
                            console.log(`[Bans] Nałożono bana na IP ${reportedIP} do ${new Date(expiryTime).toLocaleString()}`);
                        }
                        if (ws.partner.readyState === ws.OPEN) {
                            ws.partner.send(JSON.stringify({ type: 'partnerDisconnected' }));
                        }
                        if (ws.readyState === ws.OPEN) {
                           ws.send(JSON.stringify({ type: 'partnerDisconnected' }));
                        }
                        ws.partner.partner = null;
                        ws.partner = null;
                    }
                    break;
            }
        } catch (e) { console.error('Błąd parsowania wiadomości WebSocket:', e); }
    });
    ws.on('close', () => {
        console.log(`Klient WebSocket (IP: ${ws.ip}) rozłączony.`);
        waitingUsers = waitingUsers.filter(user => user !== ws);
        if (ws.partner) {
            if (ws.partner.readyState === ws.OPEN) {
                ws.partner.send(JSON.stringify({ type: 'partnerDisconnected' }));
            }
            ws.partner.partner = null;
        }
    });
});

function findPartnerFor(currentUser) {
    let partner = null;
    for (let i = 0; i < waitingUsers.length; i++) {
        const potentialPartner = waitingUsers[i];
        if (areCompatible(currentUser.preferences, potentialPartner.preferences)) {
            partner = potentialPartner;
            waitingUsers.splice(i, 1);
            break;
        }
    }
    if (partner) {
        console.log('Znaleziono parę!');
        currentUser.partner = partner;
        partner.partner = currentUser;
        currentUser.send(JSON.stringify({ type: 'partnerFound', initiator: true }));
        partner.send(JSON.stringify({ type: 'partnerFound', initiator: false }));
    } else {
        console.log('Nie znaleziono pary, dodaję do kolejki.');
        waitingUsers.push(currentUser);
    }
}

function areCompatible(prefsA, prefsB) {
    if (prefsA.purpose !== prefsB.purpose) return false;
    const a_wants_b = prefsA.searchGender === prefsB.myGender || prefsA.searchGender === 'any';
    const b_wants_a = prefsB.searchGender === prefsA.myGender || prefsB.searchGender === 'any';
    return a_wants_b && b_wants_a;
}

const SESSION_TTL = 30 * 60 * 1000;
function cleanupInactiveSessions() {
    const now = Date.now();
    let cleanedCount = 0;
    for (const [sessionId, conversation] of conversations.entries()) {
        if (now - conversation.lastActivity > SESSION_TTL) {
            conversations.delete(sessionId);
            cleanedCount++;
        }
    }
    if (cleanedCount > 0) console.log(`[Higiena] Usunięto ${cleanedCount} nieaktywnych sesji.`);
}

function broadcastUserCount() {
    const realUserCount = wss.clients.size;
    const countPayload = JSON.stringify({ type: 'userCountUpdate', count: realUserCount });
    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) client.send(countPayload);
    });
}

server.listen(PORT, async () => {
    console.log(`Serwer HTTP i WebSocket nasłuchuje na porcie ${PORT}`);
    await loadBans();
    await loadQuestions();
    setInterval(cleanupExpiredBans, 60 * 1000);
    setInterval(cleanupInactiveSessions, 5 * 60 * 1000);
    setInterval(broadcastUserCount, 15000);
    setInterval(() => {
        const userCount = wss.clients.size;
        console.log(`[Status] Liczba połączonych użytkowników: ${userCount}`);
    }, 10000);
    console.log('[System] Automatyczne czyszczenie sesji i banów jest aktywne.');
});
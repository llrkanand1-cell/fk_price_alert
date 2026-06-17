const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');

// --- 🔒 CONFIGURATION HARDLOCKED ---
const BOT_TOKEN = '8980239383:AAFwZVEzP0lTYoIG3-HYig4xTz47L1n0lXY'; // Aapka exact correct token
const ADMIN_CHAT_ID = '7485181331'; 
const CHECK_INTERVAL = 30000; // 30 second precision loop
const RENDER_URL = 'https://fk-financial-tracker.onrender.com'; 
const DB_FILE = path.join(__dirname, 'database.json');
// ----------------------------------------

const bot = new Telegraf(BOT_TOKEN);
const activeUsers = {};
const userSessions = {}; 

let approvedUsersCache = [];

function initDatabase() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            const initialData = [ADMIN_CHAT_ID.toString()];
            fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
            approvedUsersCache = initialData;
            return;
        }
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        if (!fileContent.trim()) {
            approvedUsersCache = [ADMIN_CHAT_ID.toString()];
            return;
        }
        const users = JSON.parse(fileContent);
        if (!Array.isArray(users)) {
            approvedUsersCache = [ADMIN_CHAT_ID.toString()];
            return;
        }
        if (!users.includes(ADMIN_CHAT_ID.toString())) {
            users.push(ADMIN_CHAT_ID.toString());
        }
        approvedUsersCache = users.map(String);
    } catch (e) {
        approvedUsersCache = [ADMIN_CHAT_ID.toString()];
    }
}

initDatabase();

function isUserApproved(userId) {
    if (!userId) return false;
    return approvedUsersCache.includes(userId.toString());
}

const app = express();
const PORT = process.env.PORT || 10000;

// Webhook for Render stability
app.use(bot.webhookCallback('/secret-telegram-webhook'));

app.get('/', (req, res) => res.status(200).send('Financial Core Engine Webhook Live!'));

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Core Server listening on port ${PORT}`);
    try {
        await bot.telegram.setWebhook(`${RENDER_URL}/secret-telegram-webhook`, {
            drop_pending_updates: true 
        });
        console.log("🎯 Telegram Webhook binded successfully!");
    } catch (err) {
        console.log("⚠️ Webhook setup warning: ", err.message);
    }
});

setInterval(() => {
    axios.get(RENDER_URL).catch(() => {}); 
}, 30000); 

const getProKeyboard = () => {
    return Markup.keyboard([
        ['🚀 Track Both', '🛵 Track Bank'],
        ['📋 List Active', '🛑 Stop All Operations']
    ]).resize();
};

bot.start((ctx) => {
    const userId = ctx.from.id.toString();
    const name = `${ctx.from.first_name || ''}`.trim();
    if (isUserApproved(userId)) {
        delete userSessions[userId]; 
        return ctx.reply(`🤖 *Welcome Agent ${name}!* Price + Bank Tracker Active!`, getProKeyboard());
    }
    ctx.reply(`🔒 **Access Denied!**`);
});

bot.hears('🚀 Track Both', (ctx) => {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return;
    userSessions[userId] = 'both'; 
    ctx.reply("🕵️‍♂️ **Agent Price + Bank Engine Ready!**\n\nLink paste karke send kar do bhai!");
});

bot.hears('🛵 Track Bank', (ctx) => {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return;
    userSessions[userId] = 'bankonly'; 
    ctx.reply("🕵️‍♂️ **Agent Only-Bank Engine Ready!**\n\nLink paste karke send kar do bhai!");
});

bot.hears('📋 List Active', (ctx) => { displayActiveTracks(ctx); });
bot.hears('🛑 Stop All Operations', (ctx) => { killAllOperations(ctx); });

// 🔥 HIGH-PRECISION TEXT TEXT COMMAND INTERCEPTOR FOR /stop1, /stop2, etc.
bot.on('text', async (ctx, next) => {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return;

    const textInput = ctx.message.text.trim().toLowerCase();

    // Agar text "/stop" se shuru ho raha hai (jaise /stop1, /stop2)
    if (textInput.startsWith('/stop') && textInput !== '/stop_all') {
        const chatId = ctx.chat.id.toString();
        
        // Piche ka number nikalne ke liye
        const numStr = textInput.replace('/stop', '').trim();
        const index = parseInt(numStr) - 1; // Array 0 se shuru hota hai

        if (isNaN(index) || !activeUsers[chatId] || !activeUsers[chatId][index]) {
            return ctx.reply("⚠️ **Galat Target Number!** Pehle `📋 List Active` check karo boss.");
        }

        const removedItem = activeUsers[chatId][index];
        
        // Loop clear karo aur array se delete karo
        clearInterval(removedItem.interval);
        activeUsers[chatId].splice(index, 1);

        return ctx.reply(`🛑 <b>Target [${index + 1}] radar se permanent saaf!</b>\nTracking successfully stopped for:\n<code>${removedItem.url}</code>`, { parse_mode: 'HTML', disable_web_page_preview: true });
    }

    // Baaki normal flow chalne do
    if (['🚀 track both', '🛵 track bank', '📋 list active', '🛑 stop all operations'].includes(textInput)) return;

    if (userSessions[userId]) {
        const mode = userSessions[userId];
        const modeLabel = mode === 'both' ? 'Price + Deep Bank Offers' : 'Only Deep Bank Offers';
        const args = ctx.message.text.replace(/\n/g, ' ').split(' ').filter(arg => arg.trim() !== '');
        let fkLink = args.find(arg => arg.includes('flipkart.com') || arg.includes('fkrt.it'));

        if (!fkLink) return ctx.reply(`❌ Valid Flipkart link bhejo bhai!`, getProKeyboard());
        setupCoreScraperSystem(ctx, fkLink, mode, modeLabel);
        delete userSessions[userId]; 
    }
});

function setupCoreScraperSystem(ctx, fkLink, mode, modeLabel) {
    const chatId = ctx.chat.id.toString();
    let pid = Buffer.from(fkLink).toString('base64').substring(0, 10);

    if (!activeUsers[chatId]) activeUsers[chatId] = [];
    const intervalId = setInterval(() => { checkFinancialFluctuations(ctx, chatId, pid, fkLink, mode); }, CHECK_INTERVAL);

    activeUsers[chatId].push({
        id: pid, url: fkLink, mode: modeLabel, interval: intervalId, lastPrice: null, lastOffers: null
    });

    ctx.reply(`🕵️‍♂️ **Undercover Agent Active!**\n\nTracking shuru ho gayi hai boss!`);
    checkFinancialFluctuations(ctx, chatId, pid, fkLink, mode);
}

// 🔥 FIXED UI: Ab har active link ke sath uski direct /stop command dikhegi
function displayActiveTracks(ctx) {
    const chatId = ctx.chat.id.toString();
    if (!activeUsers[chatId] || activeUsers[chatId].length === 0) return ctx.reply("😴 Koyi active target radar par nahi hai.");
    
    let msg = "📋 <b>Radar Par Active Targets Matrix:</b>\n\n";
    activeUsers[chatId].forEach((item, index) => {
        msg += `🔢 <b>Target [${index + 1}]</b>\n⚙️ <b>Mode:</b> <code>[${item.mode}]</code>\n🔗 <b>Link:</b> ${item.url}\n🛑 <b>Stop Command:</b> /stop${index + 1}\n\n`;
    });
    
    ctx.reply(msg, { parse_mode: 'HTML', disable_web_page_preview: true });
}

function killAllOperations(ctx) {
    const chatId = ctx.chat.id.toString();
    if (activeUsers[chatId] && activeUsers[chatId].length > 0) {
        activeUsers[chatId].forEach(item => clearInterval(item.interval));
        delete activeUsers[chatId];
        ctx.reply("🛑 Saari tracking band kar di gayi.");
    } else { ctx.reply("⚠️ Koyi active operation chal hi nahi rahi."); }
}

async function checkFinancialFluctuations(ctx, chatId, pid, originalUrl, mode) {
    if (!activeUsers[chatId]) return;
    const itemIndex = activeUsers[chatId].findIndex(item => item.id === pid);
    if (itemIndex === -1) return;

    try {
        const response = await axios.get(originalUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
            timeout: 12000 
        });
        const html = response.data;
        let currentPrice = "N/A";
        const priceMatch = html.match(/"price"\s*:\s*"?([0-9]+)"?/i);
        if (priceMatch) currentPrice = priceMatch[1];

        let currentOffersRaw = [];
        const offerRegex = /(?:bank offer|instant discount| cashback|off on credit card|off on debit card)[^<"']+/gi;
        let match;
        let combinedOffersText = "";
        while ((match = offerRegex.exec(html)) !== null && currentOffersRaw.length < 4) {
            let cleanOffer = match[0].replace(/<\/?[^>]+(>|$)/g, "").trim();
            if (cleanOffer.length > 15 && cleanOffer.length < 100 && !currentOffersRaw.includes(cleanOffer)) {
                currentOffersRaw.push(cleanOffer);
                combinedOffersText += `🔹 ${cleanOffer}\n`;
            }
        }
        if (!combinedOffersText) combinedOffersText = "No active bank offers detected.";

        let instance = activeUsers[chatId][itemIndex];
        if (instance.lastPrice === null) {
            instance.lastPrice = currentPrice;
            instance.lastOffers = combinedOffersText;
            return;
        }

        if ((mode === 'both' && currentPrice !== instance.lastPrice) || combinedOffersText !== instance.lastOffers) {
            instance.lastPrice = currentPrice;
            instance.lastOffers = combinedOffersText;

            await bot.telegram.sendMessage(chatId, 
                `🔥 <b>Oo bhaiiii badal gya hai snapshot!</b> 🔥\n\n💰 Price: <b>₹${currentPrice}</b>\n🏛️ Bank Offers:\n${combinedOffersText}\nLink:\n${originalUrl}\n\n🛑 Stop instant: /stop${itemIndex + 1}`,
                { parse_mode: 'HTML' }
            ).catch(() => {});
        }
    } catch (err) {}
}

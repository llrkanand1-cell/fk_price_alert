const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const BOT_TOKEN = '8980239383:AAFwZVEzP0lTYoIG3-HYig4xTz47L1n0lXY'; // 🔥 NAYA FRESH TOKEN FIXED!
const ADMIN_CHAT_ID = '7485181331'; // Admin Chat ID Fixed
const CHECK_INTERVAL = 15000; // Har 15 second me dynamic monitoring loop
const RENDER_URL = 'https://instamart-tracker-bot.onrender.com/'; // Render URL template setup
const DB_FILE = path.join(__dirname, 'database.json');
// ---------------------

const bot = new Telegraf(BOT_TOKEN);
const activeUsers = {};
const sessionSetup = {}; // Dynamic multi-option state tracker

// --- 📂 PERMANENT FILE DATABASE LOGIC ---
function loadApprovedUsers() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            const initialData = [ADMIN_CHAT_ID.toString()];
            fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
            return initialData;
        }
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        const users = JSON.parse(fileContent);
        if (!users.includes(ADMIN_CHAT_ID.toString())) {
            users.push(ADMIN_CHAT_ID.toString());
        }
        return users.map(String);
    } catch (e) {
        return [ADMIN_CHAT_ID.toString()];
    }
}

function saveApprovedUsers(usersList) {
    try {
        const uniqueUsers = [...new Set(usersList.map(String))];
        fs.writeFileSync(DB_FILE, JSON.stringify(uniqueUsers, null, 2));
    } catch (e) {}
}

function isUserApproved(userId) {
    if (!userId) return false;
    return loadApprovedUsers().includes(userId.toString());
}
// --------------------------------------------

const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.status(200).send('Financial Engine Running Live!'));
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Port Binding Successful on ${PORT}`));

// 🔥 ALIVE JHATKA SYSTEM
setInterval(() => {
    axios.get(RENDER_URL).catch(() => {}); 
}, 30000); 

// --- CALLBACK BUTTONS HANDLER ---
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.chat.id.toString();
    const clickerId = ctx.from.id.toString();
    
    // Stop single tracker logic button
    if (data.startsWith('stop_fk_')) {
        const index = parseInt(data.split('_')[2]);
        if (activeUsers[chatId] && activeUsers[chatId][index]) {
            const removedItem = activeUsers[chatId][index];
            clearInterval(removedItem.interval);
            activeUsers[chatId].splice(index, 1);
            await ctx.answerCbQuery("Tracking band kar di gayi hai! 🛑").catch(() => {});
            return ctx.reply(`🛑 Stopped tracking for:\n${removedItem.url}`, { disable_web_page_preview: true });
        }
        return ctx.answerCbQuery("⚠️ Already stopped.").catch(() => {});
    }

    // Interactive configuration setup mode
    if (data.startsWith('setmode_')) {
        const parts = data.split('_');
        const mode = parts[1]; 
        
        if (!sessionSetup[chatId]) {
            return ctx.answerCbQuery("❌ Session Expired! Please use /start_track again.").catch(() => {});
        }
        
        const { pid, url } = sessionSetup[chatId];
        delete sessionSetup[chatId]; 

        if (!activeUsers[chatId]) activeUsers[chatId] = [];
        if (activeUsers[chatId].some(item => item.id === pid)) {
            return ctx.reply("⚠️ Yeh product pehle se hi track ho raha hai!");
        }

        const modeLabel = mode === 'both' ? "Price + Bank Offer" : "Only Bank Offer";
        
        const intervalId = setInterval(() => { 
            checkFinancialFluctuations(ctx, chatId, pid, url, mode); 
        }, CHECK_INTERVAL);

        activeUsers[chatId].push({
            id: pid,
            url: url,
            mode: modeLabel,
            interval: intervalId,
            alertFired: false 
        });

        await ctx.editMessageText(`🚀 **Tracking Initiated!**\n⚙️ Mode: \`[${modeLabel}]\` \nScanning changes every 15 seconds...`).catch(() => {});
        checkFinancialFluctuations(ctx, chatId, pid, url, mode);
        return ctx.answerCbQuery().catch(() => {});
    }

    // Admin validation panel
    if (clickerId !== ADMIN_CHAT_ID.toString()) {
        return ctx.answerCbQuery("❌ Unauthorized!").catch(() => {});
    }
    
    const targetUserId = data.split('_')[1].trim();
    let currentList = loadApprovedUsers();
    
    if (data.startsWith('approve_')) {
        if (!currentList.includes(targetUserId)) {
            currentList.push(targetUserId);
            saveApprovedUsers(currentList);
        }
        await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n✅ **Status: Approved Permanently!**`).catch(() => {});
        await bot.telegram.sendMessage(targetUserId, "🎉 **Mubarak ho! Admin ne aapka access approve kar diya hai!**\n\nAb aap permanent approved hain.\n👉 Track karne ke liye input format:\n`/start_track <Flipkart_URL>`", { parse_mode: 'Markdown' }).catch(() => {});
    } else if (data.startsWith('decline_')) {
        await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n❌ **Status: Declined!**`).catch(() => {});
    }
    await ctx.answerCbQuery().catch(() => {});
});

// --- COMMAND: START ---
bot.start((ctx) => {
    const userId = ctx.from.id.toString();
    const name = `${ctx.from.first_name || ''}`.trim();
    
    if (isUserApproved(userId)) {
        return ctx.reply(`🤖 *Welcome ${name}!* Financial Master Tracker Engine Live!\n\n🔹 **Control Options:**\n🚀 \`/start_track <Flipkart_URL>\` — Lagaen naya link\n📋 \`/list_track\` — Check running configuration matrix\n🛑 \`/stop_all\` — Clear all tracks instantly`, { parse_mode: 'Markdown' });
    }
    
    ctx.reply(`🔒 **Access Denied!** ID: \`${userId}\` \nAdmin ke paas approval request bhej di gayi hai.`);
    
    bot.telegram.sendMessage(ADMIN_CHAT_ID, `🚨 **New Request Alert!**\nName: ${name}\nID: \`${userId}\``, {
        ...Markup.inlineKeyboard([[Markup.button.callback('Approve ✅', `approve_${userId}`), Markup.button.callback('Decline ❌', `decline_${userId}`)]])
    }).catch(() => {});
});

// --- COMMAND: START TRACK (With Mode Inline Dialog) ---
bot.command('start_track', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return ctx.reply("❌ Access Denied!");
    
    const chatId = ctx.chat.id.toString();
    const args = ctx.message.text.replace(/\n/g, ' ').split(' ').filter(arg => arg.trim() !== '');
    
    let fkLink = args.find(arg => arg.includes('flipkart.com/'));
    if (!fkLink) return ctx.reply("❌ Sahi Flipkart product link bhejo bhai!");
    
    let pid = "";
    try {
        const urlObj = new URL(fkLink);
        pid = urlObj.searchParams.get('pid');
    } catch (e) {}

    if (!pid) {
        const pidMatch = fkLink.match(/pid=([A-Z0-9]+)/i);
        if (pidMatch) pid = pidMatch[1];
    }
    if (!pid) pid = Buffer.from(fkLink).toString('base64').substring(0, 10);

    sessionSetup[chatId] = { pid: pid, url: fkLink };

    ctx.reply("🎯 **Bhai koun sa tracking operation active karna hai? Option select karo:**", {
        ...Markup.inlineKeyboard([
            [Markup.button.callback('1️⃣ Price Alert + Bank Offer', 'setmode_both')],
            [Markup.button.callback('2️⃣ Only Bank Offer Alert', 'setmode_bankonly')]
        ])
    });
});

// --- COMMAND: LIST TRACK ---
bot.command('list_track', (ctx) => {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return ctx.reply("❌ Access Denied!");
    
    const chatId = ctx.chat.id.toString();
    if (!activeUsers[chatId] || activeUsers[chatId].length === 0) {
        return ctx.reply("😴 Koyi active links abhi track nahi ho rahe hain.");
    }
    
    let msg = "📋 **Aapki Running Tracking Matrix:**\n\n";
    activeUsers[chatId].forEach((item, index) => {
        msg += `${index + 1}. 📦 **ID:** \`${item.id}\` \n⚙️ **Mode:** \`[${item.mode}]\` \n🔗 **Link:** ${item.url}\n\n`;
    });
    ctx.reply(msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

// --- COMMAND: STOP ALL ---
bot.command('stop_all', (ctx) => {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return ctx.reply("❌ Access Denied!");
    
    const chatId = ctx.chat.id.toString();
    if (activeUsers[chatId] && activeUsers[chatId].length > 0) {
        activeUsers[chatId].forEach(item => clearInterval(item.interval));
        delete activeUsers[chatId];
        ctx.reply("🛑 Saari active tracking links instantly band kar di gayi hain.");
    } else { 
        ctx.reply("⚠️ Koyi active tracking nahi chal rahi hai."); 
    }
});

// Admin structural core features
bot.command('approve', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) return;
    const args = ctx.message.text.split(' ').filter(arg => arg.trim() !== '');
    if (args.length < 2) return;
    const targetUserId = args[1].trim();
    let currentList = loadApprovedUsers();
    if (!currentList.includes(targetUserId)) {
        currentList.push(targetUserId);
        saveApprovedUsers(currentList);
        ctx.reply(`✅ Approved ${targetUserId}`);
    }
});

bot.command('list_users', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) return;
    const currentList = loadApprovedUsers();
    let msg = "📋 Approved Users:\n";
    currentList.forEach(u => msg += `- \`${u}\`\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('remove_user', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) return;
    const args = ctx.message.text.split(' ').filter(arg => arg.trim() !== '');
    if (args.length < 2) return;
    const targetUserId = args[1].trim();
    let currentList = loadApprovedUsers();
    const idx = currentList.indexOf(targetUserId);
    if (idx !== -1) {
        currentList.splice(idx, 1);
        saveApprovedUsers(currentList);
        ctx.reply(`❌ Removed ${targetUserId}`);
    }
});

// --- 🔥 CORE FINANCIAL ENGINE ---
async function checkFinancialFluctuations(ctx, chatId, pid, originalUrl, mode) {
    if (!activeUsers[chatId]) return;
    const itemIndex = activeUsers[chatId].findIndex(item => item.id === pid);
    if (itemIndex === -1) return;

    try {
        const response = await axios.get(originalUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            timeout: 8000
        });

        const html = response.data;
        
        let currentPrice = "N/A";
        let priceMatch = html.match(/₹\s*[0-9,]+/);
        if (priceMatch) currentPrice = priceMatch[0].trim().replace(/[^0-9]/g, '');

        let foundOffers = [];
        const offerRegex = /(?:bank offer|instant discount| cashback|off on credit card|off on debit card)[^<]+/gi;
        let match;
        let combinedOffersText = "";
        
        while ((match = offerRegex.exec(html)) !== null && foundOffers.length < 4) {
            let cleanOffer = match[0].replace(/<\/?[^>]+(>|$)/g, "").trim().substring(0, 80);
            if (cleanOffer.length > 10 && !foundOffers.includes(cleanOffer)) {
                foundOffers.push(cleanOffer);
                combinedOffersText += `🔹 ${cleanOffer}\n`;
            }
        }
        if (!combinedOffersText) combinedOffersText = "No active bank offers detected on page.";

        let instance = activeUsers[chatId][itemIndex];

        // First initial setup base values lock
        if (!instance.lastPrice && !instance.lastOffers) {
            instance.lastPrice = currentPrice;
            instance.lastOffers = combinedOffersText;
            return;
        }

        let isFluctuationDetected = false;
        let alertMessageText = "";

        if (mode === 'both') {
            if (currentPrice !== "N/A" && instance.lastPrice !== "N/A" && currentPrice !== instance.lastPrice) {
                isFluctuationDetected = true;
                alertMessageText = `💰 **PRICE FLUCTUATION DETECTED!** 💰\n\n📉 Old Price: ₹${instance.lastPrice}\n📈 New Price: ₹${currentPrice}`;
            } else if (combinedOffersText !== instance.lastOffers) {
                isFluctuationDetected = true;
                alertMessageText = `💳 **BANK OFFER MATRIX CHANGED!** 💳\n\n📝 Old Offers:\n${instance.lastOffers}\n\n📝 New Current Offers:\n${combinedOffersText}`;
            }
        } else if (mode === 'bankonly') {
            if (combinedOffersText !== instance.lastOffers) {
                isFluctuationDetected = true;
                alertMessageText = `💳 **BANK OFFER EXCLUSIVE MATRIX CHANGED!** 💳\n\n📝 Old Offers:\n${instance.lastOffers}\n\n📝 New Current Offers:\n${combinedOffersText}`;
            }
        }

        // --- RELENTLESS CRITICAL NAG LOOP (Har 15 Sec blast alert) ---
        if (isFluctuationDetected || instance.alertFired === true) {
            instance.alertFired = true; 

            let priceDisplay = currentPrice !== "N/A" ? `₹${currentPrice}` : "N/A";
            
            await bot.telegram.sendMessage(chatId, 
                `🔥 **Oo bhaiiii price ya offers badal gya hai jldi ja lgake lgane!** 🔥\n\n${alertMessageText || '⚠️ *System Alert:* Fluctuations continuous!'}\n\n📊 **Current Live Snapshot:**\n💰 Price: *${priceDisplay}*\n🏛️ Offers Found:\n${combinedOffersText}\n\nLink:\n${originalUrl}`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback('Stop Tracking 🛑', `stop_fk_${itemIndex}`)]])
                }
            ).catch(() => {});
        }

    } catch (err) {
        // Heartbeat protection
    }
}

bot.launch().then(() => console.log("Fresh Naya Financial Master Bot Live..."));

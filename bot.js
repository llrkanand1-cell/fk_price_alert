const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');

// --- 🔒 CONFIGURATION HARDLOCKED ---
const BOT_TOKEN = '8980239383:AAFwZVEzP0lTYoIG3-HYig4xTz47L1n0lXY'; 
const ADMIN_CHAT_ID = '7485181331'; 
const CHECK_INTERVAL = 15000; 
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

function saveApprovedUsers(usersList) {
    try {
        const uniqueUsers = [...new Set(usersList.map(String))];
        if (!uniqueUsers.includes(ADMIN_CHAT_ID.toString())) {
            uniqueUsers.push(ADMIN_CHAT_ID.toString());
        }
        approvedUsersCache = uniqueUsers; 
        fs.writeFileSync(DB_FILE, JSON.stringify(uniqueUsers, null, 2));
    } catch (e) {}
}

function isUserApproved(userId) {
    if (!userId) return false;
    return approvedUsersCache.includes(userId.toString());
}

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware explicitly bound
app.use(express.json());
app.use(bot.webhookCallback('/secret-telegram-webhook'));

app.get('/', (req, res) => res.status(200).send('Financial Core Engine Webhook Live!'));

app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Core Server listening on port ${PORT}`);
    try {
        // Force flush and apply webhook strictly
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.telegram.setWebhook(`${RENDER_URL}/secret-telegram-webhook`, {
            drop_pending_updates: true 
        });
        console.log("🎯 Telegram Webhook and Approval Matrix binded successfully!");
    } catch (err) {
        console.log("⚠️ Webhook setup warning: ", err.message);
    }
});

setInterval(() => {
    axios.get(RENDER_URL).catch(() => {}); 
}, 15000); 

const getProKeyboard = () => {
    return Markup.keyboard([
        ['🚀 Track Both', '🛵 Track Bank'],
        ['📋 List Active', '🛑 Stop All Operations']
    ]).resize();
};

// 🔥 STRICT CALLBACK HANDLER FOR ADMIN ACTION BUTTONS
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const clickerId = ctx.from.id.toString();
    
    if (data.startsWith('approve_')) {
        if (clickerId !== ADMIN_CHAT_ID.toString()) return ctx.answerCbQuery("Unauthorized! ❌").catch(() => {});
        const targetUserId = data.split('_')[1].trim();
        
        initDatabase();
        if (!approvedUsersCache.includes(targetUserId)) {
            approvedUsersCache.push(targetUserId);
            saveApprovedUsers(approvedUsersCache);
        }
        
        await ctx.answerCbQuery("User Approved! ✅").catch(() => {});
        await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n✅ **Status: Approved!**`).catch(() => {});
        bot.telegram.sendMessage(targetUserId, "🥳 **Aapka access approve ho gaya hai!**\nCommands use karne ke liye ek baar `/start` dabayein.").catch(() => {});
        return;
    }

    if (data.startsWith('decline_')) {
        if (clickerId !== ADMIN_CHAT_ID.toString()) return ctx.answerCbQuery("Unauthorized! ❌").catch(() => {});
        await ctx.answerCbQuery("User Declined! ❌").catch(() => {});
        await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n❌ **Status: Declined!**`).catch(() => {});
        return;
    }
});

// 🔥 VERIFIED START FLOW
bot.start((ctx) => {
    const userId = ctx.from.id.toString();
    const name = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || 'No Name';
    
    initDatabase();
    if (isUserApproved(userId)) {
        delete userSessions[userId]; 
        return ctx.reply(`🤖 *Welcome Agent ${name}!* Price + Bank Tracker Active!`, getProKeyboard());
    }
    
    // Explicit format fallback text to ensure ID visibility
    ctx.reply(`🔒 **Access Denied!**\n\nAap abhi approved nahi hain.\nAapki Telegram ID: \`${userId}\`\n\nAdmin ko automatic request bhej di gayi hai, kripya thoda wait karein.`);
    
    // 🔥 LIVE ADMIN NOTIFICATION FORWARDER
    bot.telegram.sendMessage(ADMIN_CHAT_ID, 
        `🚨 **New Flipkart Bot Request!**\n\n👤 Name: ${name}\n🆔 ID: \`${userId}\`\n\n👉 Action lein:`,
        Markup.inlineKeyboard([[
            Markup.button.callback('Approve ✅', `approve_${userId}`), 
            Markup.button.callback('Decline ❌', `decline_${userId}`)
        ]])
    ).catch(() => {});
});

bot.command('approve', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) return ctx.reply("❌ Admin Only!");
    const args = ctx.message.text.split(' ').filter(arg => arg.trim() !== '');
    if (args.length < 2) return ctx.reply("⚠️ Format: `/approve <User_ID>`");
    
    const targetUserId = args[1].trim();
    initDatabase();
    if (!approvedUsersCache.includes(targetUserId)) {
        approvedUsersCache.push(targetUserId);
        saveApprovedUsers(approvedUsersCache);
        ctx.reply(`✅ User ID \`${targetUserId}\` ko successfully approve kar diya gaya hai.`);
        bot.telegram.sendMessage(targetUserId, "🥳 **Approved!** Use karne ke liye \`/start\` likhein.").catch(() => {});
    } else {
        ctx.reply("⚠️ Yeh user pehle se approved hai.");
    }
});

bot.command('list_users', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) return ctx.reply("❌ Admin Only!");
    initDatabase();
    if (approvedUsersCache.length <= 1) return ctx.reply("👥 Koyi approved user nahi hai.");
    let msg = "👥 **Approved Users List:**\n\n";
    let count = 1;
    approvedUsersCache.forEach((userId) => {
        if (userId !== ADMIN_CHAT_ID.toString()) {
            msg += `${count}. 🆔 User ID: \`${userId}\`\n`;
            count++;
        }
    });
    ctx.reply(msg);
});

bot.command('remove_user', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) return ctx.reply("❌ Admin Only!");
    const args = ctx.message.text.split(' ').filter(arg => arg.trim() !== '');
    if (args.length < 2) return ctx.reply("⚠️ Format: `/remove_user <User_ID>`");
    const targetUserId = args[1].trim();
    
    initDatabase();
    const index = approvedUsersCache.indexOf(targetUserId);
    if (index > -1) {
        approvedUsersCache.splice(index, 1);
        saveApprovedUsers(approvedUsersCache);
        if (activeUsers[targetUserId]) {
            activeUsers[targetUserId].forEach(item => clearInterval(item.interval));
            delete activeUsers[targetUserId];
        }
        ctx.reply(`✅ User ID ${targetUserId} remove ho gaya.`);
        bot.telegram.sendMessage(targetUserId, "🔒 Admin ne aapka access remove kar diya hai.").catch(() => {});
    } else { ctx.reply("⚠️ ID nahi mili."); }
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

bot.on('text', async (ctx, next) => {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return;

    const textInput = ctx.message.text.trim().toLowerCase();

    if (textInput.startsWith('/stop') && textInput !== '/stop_all') {
        const chatId = ctx.chat.id.toString();
        const numStr = textInput.replace('/stop', '').trim();
        const index = parseInt(numStr) - 1;

        if (isNaN(index) || !activeUsers[chatId] || !activeUsers[chatId][index]) {
            return ctx.reply("⚠️ **Galat Target Number!** Pehle \`📋 List Active\` check karo boss.");
        }

        const removedItem = activeUsers[chatId][index];
        clearInterval(removedItem.interval);
        activeUsers[chatId].splice(index, 1);

        return ctx.reply(`🛑 <b>Target [${index + 1}] radar se permanent saaf!</b>\nTracking successfully stopped for:\n<code>${removedItem.url}</code>`, { parse_mode: 'HTML', disable_web_page_preview: true });
    }

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

    ctx.reply(`🕵️‍♂️ **Undercover Agent Active!**\n\nRaat ke test ke liye loop on ho gaya hai boss!`);
    checkFinancialFluctuations(ctx, chatId, pid, fkLink, mode);
}

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
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 12000 
        });
        const html = response.data;
        
        let currentPrice = "N/A";
        const sellingPriceMatch = html.match(/"sellingPrice"\s*:\s*([0-9]+)/i) || 
                                  html.match(/"specialPrice"\s*:\s*([0-9]+)/i) ||
                                  html.match(/"price"\s*:\s*"?([0-9]+)"?/i);
                                  
        if (sellingPriceMatch) currentPrice = sellingPriceMatch[1];

        let currentOffersRaw = [];
        const offerRegex = /(?:bank offer|instant discount| cashback|off on credit card|off on debit card)[^<"']+/gi;
        let match;
        while ((match = offerRegex.exec(html)) !== null && currentOffersRaw.length < 5) {
            let cleanOffer = match[0].replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g, " ").trim();
            if (cleanOffer.length > 15 && cleanOffer.length < 90 && !currentOffersRaw.includes(cleanOffer)) {
                currentOffersRaw.push(cleanOffer);
            }
        }
        
        currentOffersRaw.sort();
        let combinedOffersText = currentOffersRaw.map(o => `🔹 ${o}`).join('\n');
        if (!combinedOffersText) combinedOffersText = "No active bank offers detected.";

        let instance = activeUsers[chatId][itemIndex];
        
        if (instance.lastPrice === null) {
            instance.lastPrice = currentPrice;
            instance.lastOffers = combinedOffersText;
            return;
        }

        let priceChanged = (mode === 'both' && currentPrice !== instance.lastPrice && currentPrice !== "N/A");
        let offersChanged = (combinedOffersText !== instance.lastOffers);

        if (priceChanged || offersChanged) {
            instance.lastPrice = currentPrice;
            instance.lastOffers = combinedOffersText;

            await bot.telegram.sendMessage(chatId, 
                `🔥 <b>Oo bhaiiii badal gya hai snapshot!</b> 🔥\n\n💰 Live Price: <b>₹${currentPrice}</b>\n🏛️ Bank Offers:\n${combinedOffersText}\nLink:\n${originalUrl}\n\n🛑 Stop instant: /stop${itemIndex + 1}`,
                { parse_mode: 'HTML' }
            ).catch(() => {});
        }
    } catch (err) {}
}

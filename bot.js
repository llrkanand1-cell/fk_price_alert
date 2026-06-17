const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const BOT_TOKEN = '8980239383:AAFwZVEzP0lTYoIG3-HYig4xTz47L1n0lXY'; 
const ADMIN_CHAT_ID = '7485181331'; 
const CHECK_INTERVAL = 30000; // 30 second loop
const RENDER_URL = 'https://fk-financial-tracker.onrender.com'; // Locked Live URL
const DB_FILE = path.join(__dirname, 'database.json');
// ---------------------

const bot = new Telegraf(BOT_TOKEN);
const activeUsers = {};
const userSessions = {}; // Handles user tracking state silently

// HARD ENGINE CACHE: Prevents file lock crashes
let approvedUsersCache = [];

// --- 📂 BULLET-PROOF DATABASE LOGIC ---
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

// Initialize database cache instantly
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
// --------------------------------------------

const app = express();
const PORT = process.env.PORT || 10000;
app.get('/', (req, res) => res.status(200).send('Financial Core Engine Fixed Live!'));
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Port Binding Successful on ${PORT}`));

// 🔥 SILENT 30-SECOND NON-STOP JHATKA SYSTEM (NO LOGS)
setInterval(() => {
    axios.get(RENDER_URL).catch(() => {}); 
}, 30000); 

// Permanent Panel Buttons Layout
const getProKeyboard = () => {
    return Markup.keyboard([
        ['🚀 Track Both', '🛵 Track Bank'],
        ['📋 List Active', '🛑 Stop All Operations']
    ]).resize();
};

// --- CALLBACK BUTTONS HANDLER ---
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.chat.id.toString();
    const clickerId = ctx.from.id.toString();
    
    // Dynamic stop system for specific links
    if (data.startsWith('stop_fk_')) {
        const index = parseInt(data.split('_')[2]);
        if (activeUsers[chatId] && activeUsers[chatId][index]) {
            const removedItem = activeUsers[chatId][index];
            clearInterval(removedItem.interval);
            activeUsers[chatId].splice(index, 1);
            await ctx.answerCbQuery("Target Radar Se Deleted! 🛑").catch(() => {});
            
            // Fixed Live Update with safe HTML syntax
            await ctx.editMessageText(`🛑 <b>Mission Aborted!</b> Undercover agent ko is link se permanent wapas bula liya gaya hai:<br>${removedItem.url}`, { parse_mode: 'HTML', disable_web_page_preview: true }).catch(() => {});
            return;
        }
        return ctx.answerCbQuery("⚠️ Yeh target pehle se hi band ho chuka hai.").catch(() => {});
    }

    if (clickerId !== ADMIN_CHAT_ID.toString()) return ctx.answerCbQuery("❌ Unauthorized!").catch(() => {});
    const targetUserId = data.split('_')[1].trim();
    
    if (data.startsWith('approve_')) {
        if (!approvedUsersCache.includes(targetUserId)) {
            approvedUsersCache.push(targetUserId);
            saveApprovedUsers(approvedUsersCache);
        }
        await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n✅ **Mission Status: Agent Activated Permanently!**`).catch(() => {});
        await bot.telegram.sendMessage(targetUserId, "🎉 **Mubarak ho! Admin ne aapka secret access approve kar diya hai! Neeche diye gaye control panel se operation chalu karo.**", getProKeyboard()).catch(() => {});
    } else if (data.startsWith('decline_')) {
        await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n❌ **Mission Status: Access Request Burnt!**`).catch(() => {});
    }
    await ctx.answerCbQuery().catch(() => {});
});

// --- COMMANDS MATRIX ---
bot.start((ctx) => {
    const userId = ctx.from.id.toString();
    const name = `${ctx.from.first_name || ''}`.trim();
    
    if (isUserApproved(userId)) {
        delete userSessions[userId]; 
        return ctx.reply(`🤖 *Welcome Agent ${name}!* Secret Control Panel Activated!\n\nNeeche diye gaye buttons par click karke direct use karo boss! 😎`, getProKeyboard());
    }
    
    ctx.reply(`🔒 **Access Denied!** ID: \`${userId}\` \nAdmin ke paas request bhej di gayi hai.`);
    
    bot.telegram.sendMessage(ADMIN_CHAT_ID, `🚨 **Khufiya Report: New Agent Request!**\n\nControl Room Check! Ek naya banda secret network par aane ke liye line par aaya hai.\n👤 Name: *${name}*\n🆔 ID: \`${userId}\``, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('Approve Permanent ✅', `approve_${userId}`), Markup.button.callback('Decline ❌', `decline_${userId}`)]])
    }).catch(() => {});
});

// --- KEYBOARD BUTTON TRIGGERS ---
bot.hears('🚀 Track Both', (ctx) => {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return;
    userSessions[userId] = 'both'; 
    ctx.reply("🕵️‍♂️ **Agent Price + Bank Engine Ready!**\n\nAb seedha Flipkart ka **link paste karke send kar do** bhai!");
});

bot.hears('🛵 Track Bank', (ctx) => {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return;
    userSessions[userId] = 'bankonly'; 
    ctx.reply("🕵️‍♂️ **Agent Only-Bank Engine Ready!**\n\nAb seedha Flipkart ka **link paste karke send kar do** bhai!");
});

bot.command('track_both', async (ctx) => { handleLegacyCommands(ctx, 'both', 'Price + Deep Bank Offers'); });
bot.command('track_bank', async (ctx) => { handleLegacyCommands(ctx, 'bankonly', 'Only Deep Bank Offers'); });

bot.command('list_track', (ctx) => { displayActiveTracks(ctx); });
bot.hears('📋 List Active', (ctx) => { displayActiveTracks(ctx); });

bot.command('stop_all', (ctx) => { killAllOperations(ctx); });
bot.hears('🛑 Stop All Operations', (ctx) => { killAllOperations(ctx); });

// --- SMART INCOMING MESSAGE INTERCEPTOR ---
bot.on('text', async (ctx) => {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return;

    const textInput = ctx.message.text.trim();

    if (['🚀 Track Both', '🛵 Track Bank', '📋 List Active', '🛑 Stop All Operations'].includes(textInput)) return;

    if (userSessions[userId]) {
        const mode = userSessions[userId];
        const modeLabel = mode === 'both' ? 'Price + Deep Bank Offers' : 'Only Deep Bank Offers';
        
        const args = textInput.replace(/\n/g, ' ').split(' ').filter(arg => arg.trim() !== '');
        let fkLink = args.find(arg => arg.includes('flipkart.com/'));

        if (!fkLink) {
            return ctx.reply(`❌ **Abe saaf link bhejo Agent!**\nInput mein Flipkart ka link nahi mila. Dobara sahi se link bhejo!`, getProKeyboard());
        }

        setupCoreScraperSystem(ctx, fkLink, mode, modeLabel);
        delete userSessions[userId]; 
    } else {
        if (textInput.includes('flipkart.com/')) {
            ctx.reply(`💡 **Bhai pehle select toh karo kya track karna hai!**\nNeeche panel se \`🚀 Track Both\` ya \`🛵 Track Bank\` select karo, fir link bhejo!`, getProKeyboard());
        }
    }
});

function handleLegacyCommands(ctx, mode, modeLabel) {
    const args = ctx.message.text.replace(/\n/g, ' ').split(' ').filter(arg => arg.trim() !== '');
    let fkLink = args.find(arg => arg.includes('flipkart.com/'));
    if (!fkLink) return ctx.reply(`❌ Format Error! Commands ke sath space dekar link bhejein.`);
    setupCoreScraperSystem(ctx, fkLink, mode, modeLabel);
}

function setupCoreScraperSystem(ctx, fkLink, mode, modeLabel) {
    const chatId = ctx.chat.id.toString();
    
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

    if (!activeUsers[chatId]) activeUsers[chatId] = [];
    if (activeUsers[chatId].some(item => item.id === pid)) return ctx.reply("⚠️ Abe ye target pehle se hi radar par locked hai!");

    const intervalId = setInterval(() => { checkFinancialFluctuations(ctx, chatId, pid, fkLink, mode); }, CHECK_INTERVAL);

    activeUsers[chatId].push({
        id: pid,
        url: fkLink,
        mode: modeLabel,
        interval: intervalId,
        alertFired: false,
        lastPrice: null,
        lastOffers: null,
        lastOffersRaw: []
    });

    ctx.reply(`🕵️‍♂️ **Undercover Agent Active!**\n\nBhai, tu Flipkart waalon ke liye ek "secret spy" chhod raha hai. \n\n☕ Chal ab tu aaram se jaake **chai-wai piyo ya mast neend poori karo**, unki lanka lagane ka kaam tere bhai par locked hai! 💣🚀`);

    checkFinancialFluctuations(ctx, chatId, pid, fkLink, mode);
}

// 🔥🔥🔥 ULTRA FIXED FUNCTION: HTML parsing used to avoid raw link crashes 🔥🔥🔥
function displayActiveTracks(ctx) {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return;
    const chatId = ctx.chat.id.toString();
    
    if (!activeUsers[chatId] || activeUsers[chatId].length === 0) {
        return ctx.reply("😴 Abhi koi target radar par nahi hai, sab shant hai.");
    }
    
    let msg = "📋 <b>Radar Par Locked Targets Matrix:</b>\n\n";
    let keyboardButtons = [];
    let currentRow = [];

    for (let index = 0; index < activeUsers[chatId].length; index++) {
        const item = activeUsers[chatId][index];
        
        // Strictly using safe HTML tags to enclose links cleanly
        msg += `🔢 <b>Target [${index + 1}]</b>\n📦 <b>ID:</b> <code>${item.id}</code>\n⚙️ <b>Mode:</b> <code>[${item.mode}]</code>\n🔗 <b>Link:</b> ${item.url}\n\n`;
        
        currentRow.push(Markup.button.callback(`Stop ${index + 1} 🛑`, `stop_fk_${index}`));
        
        if (currentRow.length === 2) {
            keyboardButtons.push(currentRow);
            currentRow = [];
        }
    }
    
    if (currentRow.length > 0) {
        keyboardButtons.push(currentRow);
    }

    ctx.reply(msg, { 
        parse_mode: 'HTML', 
        disable_web_page_preview: true,
        ...Markup.inlineKeyboard(keyboardButtons)
    }).catch((err) => {
        ctx.reply("⚠️ Structural layout re-syncing. Please try again.");
    });
}

function killAllOperations(ctx) {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return;
    const chatId = ctx.chat.id.toString();
    if (activeUsers[chatId] && activeUsers[chatId].length > 0) {
        activeUsers[chatId].forEach(item => clearInterval(item.interval));
        delete activeUsers[chatId];
        ctx.reply("🛑 Saare undercover agents ko headquarter wapas bula liya gya hai! Matrix cleared.");
    } else { ctx.reply("⚠️ Koyi active operation chal hi nahi rahi."); }
}

// Admin controlroom core logic
bot.command('approve', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) {
        return ctx.reply("❌ **Warning! Identity Verification Failed.**\nAbe shaane, yeh command sirf asli Loot Master (Admin) ke fingerprint par khulti hai. Chal peeche hatt! 👮‍♂️🔥");
    }
    const args = ctx.message.text.split(' ').filter(arg => arg.trim() !== '');
    if (args.length < 2) return ctx.reply("⚠️ Format: `/approve <user_id>`");
    const targetUserId = args[1].trim();
    
    if (!approvedUsersCache.includes(targetUserId)) {
        approvedUsersCache.push(targetUserId);
        saveApprovedUsers(approvedUsersCache);
        ctx.reply(`✅ Agent \`${targetUserId}\` ko permanent mission access de diya gaya hai!`, { parse_mode: 'Markdown' });
    } else {
        ctx.reply("⚠️ Yeh ID pehle se hi approved list mein hai.");
    }
});

bot.command('list_users', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) {
        return ctx.reply("❌ **Warning! Identity Verification Failed.**\nAbe shaane, yeh command sirf asli Loot Master (Admin) ke fingerprint par khulti hai. Chal peeche hatt! 👮‍♂️🔥");
    }
    let msg = "📋 **Approved Secret Agents Database List:**\n\n";
    approvedUsersCache.forEach(u => msg += `- \`${u}\`\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('remove_user', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) {
        return ctx.reply("❌ **Warning! Identity Verification Failed.**\nAbe shaane, yeh command sirf asli Loot Master (Admin) ke fingerprint par khulti hai. Chal peeche hatt! 👮‍♂️🔥");
    }
    const args = ctx.message.text.split(' ').filter(arg => arg.trim() !== '');
    if (args.length < 2) return ctx.reply("⚠️ Format: `/remove_user <user_id>`");
    const targetUserId = args[1].trim();
    
    const idx = approvedUsersCache.indexOf(targetUserId);
    if (idx !== -1) {
        approvedUsersCache.splice(idx, 1);
        saveApprovedUsers(approvedUsersCache);
        ctx.reply(`❌ Agent \`${targetUserId}\` ka licence permanent cancel kar diya gaya hai.`, { parse_

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

// Permanent Panel Buttons Layout
const getProKeyboard = () => {
    return Markup.keyboard([
        ['🚀 Track Both', '🛵 Track Bank'],
        ['📋 List Active', '🛑 Stop All Operations']
    ]).resize();
};

// --- 📂 HARD-LOCKED FILE DATABASE LOGIC ---
function loadApprovedUsers() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            const initialData = [ADMIN_CHAT_ID.toString()];
            fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
            return initialData;
        }
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        if (!fileContent.trim()) {
            return [ADMIN_CHAT_ID.toString()];
        }
        const users = JSON.parse(fileContent);
        if (!Array.isArray(users)) {
            return [ADMIN_CHAT_ID.toString()];
        }
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
        if (!uniqueUsers.includes(ADMIN_CHAT_ID.toString())) {
            uniqueUsers.push(ADMIN_CHAT_ID.toString());
        }
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
app.get('/', (req, res) => res.status(200).send('Financial Core Engine Fixed Live!'));
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Port Binding Successful on ${PORT}`));

// 🔥 SILENT 30-SECOND NON-STOP JHATKA SYSTEM (NO LOGS)
setInterval(() => {
    axios.get(RENDER_URL).catch(() => {}); 
}, 30000); 

// --- CALLBACK BUTTONS HANDLER ---
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.chat.id.toString();
    const clickerId = ctx.from.id.toString();
    
    if (data.startsWith('stop_fk_')) {
        const index = parseInt(data.split('_')[2]);
        if (activeUsers[chatId] && activeUsers[chatId][index]) {
            const removedItem = activeUsers[chatId][index];
            clearInterval(removedItem.interval);
            activeUsers[chatId].splice(index, 1);
            await ctx.answerCbQuery("Target Radar Se Deleted! 🛑").catch(() => {});
            
            await ctx.editMessageText(`🛑 **Mission Aborted!** Undercover agent ko is link se permanent wapas bula liya gaya hai:\n${removedItem.url}`, { disable_web_page_preview: true }).catch(() => {});
            return;
        }
        return ctx.answerCbQuery("⚠️ Yeh target pehle se hi band ho chuka hai.").catch(() => {});
    }

    if (clickerId !== ADMIN_CHAT_ID.toString()) return ctx.answerCbQuery("❌ Unauthorized!").catch(() => {});
    const targetUserId = data.split('_')[1].trim();
    let currentList = loadApprovedUsers();
    
    if (data.startsWith('approve_')) {
        if (!currentList.includes(targetUserId)) {
            currentList.push(targetUserId);
            saveApprovedUsers(currentList);
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
    
    ctx.reply(`🔒 **Radar Blocked! Access Denied.**\n\nBhai, tu abhi secret network se bahar hai. Teri Request ID: \`${userId}\` ko cipher karke Admin (Loot Master) ke Control Room mein bhej diya gaya hai. Jab tak woh wahan se green signal nahi dete, tab tak chupchaap wait kar! 🤫`, { parse_mode: 'Markdown' });
    
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


// --- SMART INCOMING TEXT INTERCEPTOR ---
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
            return ctx.reply(`❌ **Abe saaf link bhejo Agent!**\nInput mein Flipkart ka link nahi mila. Dobara bhejien!`, getProKeyboard());
        }

        setupCoreScraperSystem(ctx, fkLink, mode, modeLabel);
        delete userSessions[userId]; 
    } else {
        if (textInput.includes('flipkart.com/')) {
            ctx.reply(`💡 **Bhai pehle select toh karo kya track karna hai!**\nNeeche panel se \`🚀 Track Both\` ya \`🛵 Track Bank\` select karo, fir link bhejo!`, getProKeyboard());
        }
    }
});


// Helper core processors
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

    ctx.reply(`🕵️‍♂️ **Undercover Agent Active!**\n\nBhai, tu Flipkart waalon ke liye ek "secret spy" chhod raha hai. Woh log raat ko 2 baje bhi price badlenge ya bank discount ₹1500 se ₹2000 karenge na, toh tera bhai unki deewar kood kar tujhe khabar dega. \n\n☕ Chal ab tu aaram se jaake **chai-wai piyo ya mast neend poori karo**, unki lanka lagane ka kaam tere bhai par locked hai! 💣🚀`);

    checkFinancialFluctuations(ctx, chatId, pid, fkLink, mode);
}

// 🔥 FIXED: Ekdum saaf format parser taaki list console par crash na ho
function displayActiveTracks(ctx) {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return;
    const chatId = ctx.chat.id.toString();
    
    if (!activeUsers[chatId] || activeUsers[chatId].length === 0) {
        return ctx.reply("😴 Abhi koi target radar par nahi hai, sab shant hai.");
    }
    
    let msg = "📋 **Radar Par Locked Targets Matrix:**\n\n";
    let keyboardButtons = [];
    let currentRow = [];

    activeUsers[chatId].forEach((item, index) => {
        msg += `🔢 *Target [${index + 1}]*\n📦 *ID:* \`${item.id}\` \n⚙️ *Mode:* \`[${item.mode}]\` \n🔗 *Link:* ${item.url}\n\n`;
        
        currentRow.push(Markup.button.callback(`Stop ${index + 1} 🛑`, `stop_fk_${index}`));
        
        if (currentRow.length === 2) {
            keyboardButtons.push(currentRow);
            currentRow = [];
        }
    });
    
    if (currentRow.length > 0) {
        keyboardButtons.push(currentRow);
    }

    ctx.reply(msg, { 
        parse_mode: 'Markdown', 
        disable_web_page_preview: true,
        ...Markup.inlineKeyboard(keyboardButtons)
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

// --- ADMIN CONTROL ROOM COMMANDS ---
bot.command('approve', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) {
        return ctx.reply("❌ **Warning! Identity Verification Failed.**\nAbe shaane, yeh command sirf asli Loot Master (Admin) ke fingerprint par khulti hai. Chal peeche hatt! 👮‍♂️🔥");
    }
    const args = ctx.message.text.split(' ').filter(arg => arg.trim() !== '');
    if (args.length < 2) return ctx.reply("⚠️ Format: `/approve <user_id>`");
    const targetUserId = args[1].trim();
    let currentList = loadApprovedUsers();
    if (!currentList.includes(targetUserId)) {
        currentList.push(targetUserId);
        saveApprovedUsers(currentList);
        ctx.reply(`✅ Agent \`${targetUserId}\` ko permanent mission access de diya gaya hai!`, { parse_mode: 'Markdown' });
    } else {
        ctx.reply("⚠️ Yeh ID pehle se hi approved list mein hai.");
    }
});

bot.command('list_users', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) {
        return ctx.reply("❌ **Warning! Identity Verification Failed.**\nAbe shaane, yeh command sirf asli Loot Master (Admin) ke fingerprint par khulti hai. Chal peeche hatt! 👮‍♂️🔥");
    }
    const currentList = loadApprovedUsers();
    let msg = "📋 **Approved Secret Agents Database List:**\n\n";
    currentList.forEach(u => msg += `- \`${u}\`\n`);
    ctx.reply(msg, { parse_mode: 'Markdown' });
});

bot.command('remove_user', (ctx) => {
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) {
        return ctx.reply("❌ **Warning! Identity Verification Failed.**\nAbe shaane, yeh command sirf asli Loot Master (Admin) ke fingerprint par khulti hai. Chal peeche hatt! 👮‍♂️🔥");
    }
    const args = ctx.message.text.split(' ').filter(arg => arg.trim() !== '');
    if (args.length < 2) return ctx.reply("⚠️ Format: `/remove_user <user_id>`");
    const targetUserId = args[1].trim();
    
    if (targetUserId === ADMIN_CHAT_ID.toString()) {
        return ctx.reply("⚠️ Abe khud ko hi thodi na remove kar doge master! 🤣");
    }

    let currentList = loadApprovedUsers();
    const idx = currentList.indexOf(targetUserId);
    if (idx !== -1) {
        currentList.splice(idx, 1);
        saveApprovedUsers(currentList);
        
        if (activeUsers[targetUserId]) {
            activeUsers[targetUserId].forEach(item => clearInterval(item.interval));
            delete activeUsers[targetUserId];
        }
        
        ctx.reply(`❌ Agent \`${targetUserId}\` ka licence permanent cancel kar diya gaya hai aur data wipe kar diya hai!`, { parse_mode: 'Markdown' });
        bot.telegram.sendMessage(targetUserId, "🔒 **Your session has been terminated by Admin.** Access revoked!").catch(() => {});
    } else {
        ctx.reply("⚠️ Yeh ID agents ki approved database list mein nahi mili.");
    }
});

// --- 🔬 CORE BREAKDOWN SCRAPER ENGINE ---
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
            timeout: 12000 
        });

        const html = response.data;
        
        let currentPrice = "N/A";
        const jsonLdMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
        if (jsonLdMatch && jsonLdMatch[1]) {
            try {
                const jsonData = JSON.parse(jsonLdMatch[1].trim());
                const itemData = Array.isArray(jsonData) ? jsonData.find(i => i["@type"] === "Product" || i.offers) : jsonData;
                if (itemData && itemData.offers) {
                    let priceVal = Array.isArray(itemData.offers) ? itemData.offers[0].price : itemData.offers.price;
                    if (priceVal) currentPrice = String(priceVal).replace(/[^0-9]/g, '');
                }
            } catch (e) {}
        }
        if (currentPrice === "N/A") {
            let priceMatch = html.match(/"price"\s*:\s*"?([0-9]+)"?/i);
            if (priceMatch) currentPrice = priceMatch[1];
        }

        let currentOffersRaw = [];
        const offerRegex = /(?:bank offer|instant discount| cashback|off on credit card|off on debit card|emi)[^<"'\x7b\x7d\(\)]+/gi;
        let match;
        let combinedOffersText = "";
        
        while ((match = offerRegex.exec(html)) !== null && currentOffersRaw.length < 5) {
            let cleanOffer = match[0].replace(/<\/?[^>]+(>|$)/g, "").trim();
            cleanOffer = cleanOffer.replace(/[a-zA-Z0-9\-_.]+\.[a-zA-Z0-9]+.*/g, "").trim();
            
            if (cleanOffer.length > 12 && cleanOffer.length < 120 && !currentOffersRaw.includes(cleanOffer) && !cleanOffer.includes('font-family') && !cleanOffer.includes('emit')) {
                currentOffersRaw.push(currentOffersRaw.length);
                currentOffersRaw[currentOffersRaw.length - 1] = cleanOffer;
                combinedOffersText += `🔹 ${cleanOffer}\n`;
            }
        }
        if (!combinedOffersText) combinedOffersText = "No active bank offers detected on page.";

        let instance = activeUsers[chatId][itemIndex];

        if (instance.lastPrice === null && instance.lastOffers === null) {
            instance.lastPrice = currentPrice;
            instance.lastOffers = combinedOffersText;
            instance.lastOffersRaw = currentOffersRaw;
            return;
        }

        let isFluctuationDetected = false;
        let changeLogs = [];

        if (mode === 'both') {
            if (currentPrice !== "N/A" && instance.lastPrice !== "N/A" && currentPrice !== instance.lastPrice) {
                isFluctuationDetected = true;
                changeLogs.push(`💰 **PRICE CHANGE DETECTED:**\n📉 Old Price: ₹${instance.lastPrice}\n📈 New Price: ₹${currentPrice}`);
            }
        }

        if (combinedOffersText !== instance.lastOffers) {
            isFluctuationDetected = true;
            
            let addedOffers = currentOffersRaw.filter(x => !instance.lastOffersRaw.includes(x));
            let removedOffers = instance.lastOffersRaw.filter(x => !currentOffersRaw.includes(x));

            let offerChangeMsg = `💳 **BANK OFFER TEXT/VALUE CHANGED:**\n`;
            if (addedOffers.length > 0) {
                offerChangeMsg += `✅ **Naya Offer Add Hua:**\n${addedOffers.map(o => `👉 ${o}`).join('\n')}\n`;
            }
            if (removedOffers.length > 0) {
                offerChangeMsg += `❌ **Purana Offer Hat Gya:**\n${removedOffers.map(o => `👉 ${o}`).join('\n')}\n`;
            }
            if (addedOffers.length === 0 && removedOffers.length === 0) {
                offerChangeMsg += `⚠️ *Offers ke numeric values/EMI conditions badle hain!*`;
            }
            changeLogs.push(offerChangeMsg);
        }

        if (isFluctuationDetected || instance.alertFired === true) {
            if (isFluctuationDetected && !instance.savedChangeLogs) {
                instance.savedChangeLogs = changeLogs.join('\n\n');
                instance.lastPrice = currentPrice;
                instance.lastOffers = combinedOffersText;
                instance.lastOffersRaw = currentOffersRaw;
            }
            
            instance.alertFired = true; 
            let priceDisplay = currentPrice !== "N/A" ? `₹${currentPrice}` : "N/A";
            let displayLogs = instance.savedChangeLogs || `⚠️ *System Alert:* Fluctuations observed!`;

            await bot.telegram.sendMessage(chatId, 
                `🔥 **Oo bhaiiii price ya offers badal gya hai jldi ja lgake lgane!** 🔥\n\n${displayLogs}\n\n📊 **Current Live Snapshot:**\n💰 Price: *${priceDisplay}*\n🏛️ Live Bank Terms:\n${combinedOffersText}\n\nLink:\n${originalUrl}`,
                {
                    parse_mode: 'Markdown',
                    ...Markup.inlineKeyboard([[Markup.button.callback('Stop Tracking 🛑', `stop_fk_${itemIndex}`)]])
                }
            ).catch(() => {});
        }

    } catch (err) {}
}

bot.launch().then(() => console.log("Spy Control Room System Hardlocked Permanently..."));

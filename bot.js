const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const express = require('express');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const BOT_TOKEN = '8980239383:AAFwZVEzP0lTYoIG3-HYig4xTz47L1n0lXY'; 
const ADMIN_CHAT_ID = '7485181331'; 
const CHECK_INTERVAL = 30000; // 30 second precision loop
const RENDER_URL = 'https://fk-financial-tracker.onrender.com'; // Locked Live URL
const DB_FILE = path.join(__dirname, 'database.json');
// ---------------------

const bot = new Telegraf(BOT_TOKEN);
const activeUsers = {};

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
            await ctx.answerCbQuery("Tracking band kar di gayi hai! 🛑").catch(() => {});
            return ctx.reply(`🛑 Ok boss, tracking band kar di is link ki:\n${removedItem.url}`, { disable_web_page_preview: true });
        }
        return ctx.answerCbQuery("⚠️ Already stopped.").catch(() => {});
    }

    if (clickerId !== ADMIN_CHAT_ID.toString()) return ctx.answerCbQuery("❌ Unauthorized!").catch(() => {});
    const targetUserId = data.split('_')[1].trim();
    let currentList = loadApprovedUsers();
    
    if (data.startsWith('approve_')) {
        if (!currentList.includes(targetUserId)) {
            currentList.push(targetUserId);
            saveApprovedUsers(currentList);
        }
        await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n✅ **Status: Approved Permanently!**`).catch(() => {});
        
        // 🔥 FIXED: Approve hone ke baad saari commands perfectly underscore (_) format me clickeable jayengi!
        await bot.telegram.sendMessage(targetUserId, "🎉 **Mubarak ho! Admin ne aapka access approve kar diya hai!**\n\n👉 **Bot Commands Matrix:**\n💰 /track_both — Price + Bank Offers Monitor\n💳 /track_bank — Only Bank Offers Alert\n📋 /list_track — Active tracking matrix\n🛑 /stop_all — Clear all tracking", { parse_mode: 'Markdown' }).catch(() => {});
    } else if (data.startsWith('decline_')) {
        await ctx.editMessageText(`${ctx.callbackQuery.message.text}\n\n❌ **Status: Declined!**`).catch(() => {});
    }
    await ctx.answerCbQuery().catch(() => {});
});

// --- COMMANDS MATRIX ---
bot.start((ctx) => {
    const userId = ctx.from.id.toString();
    const name = `${ctx.from.first_name || ''}`.trim();
    
    if (isUserApproved(userId)) {
        return ctx.reply(`🤖 *Welcome ${name}!* Fixed Financial Tracker Live!\n\n🔹 **Commands Matrix:**\n🚀 \`/track_both\` — Price + Bank Offers Monitor\n🛵 \`/track_bank\` — Only Bank Offers Alert\n📋 \`/list_track\` — Active tracking matrix\n🛑 \`/stop_all\` — Clear all tracking`, { parse_mode: 'Markdown' });
    }
    
    ctx.reply(`🔒 **Access Denied!** ID: \`${userId}\` \nAdmin ke paas request bhej di gayi hai.`);
    bot.telegram.sendMessage(ADMIN_CHAT_ID, `🚨 **New Request Alert!**\nName: ${name}\nID: \`${userId}\``, {
        ...Markup.inlineKeyboard([[Markup.button.callback('Approve ✅', `approve_${userId}`), Markup.button.callback('Decline ❌', `decline_${userId}`)]])
    }).catch(() => {});
});

bot.command('track_both', async (ctx) => { setupTrackingEngine(ctx, 'both', 'Price + Deep Bank Offers'); });
bot.command('track_bank', async (ctx) => { setupTrackingEngine(ctx, 'bankonly', 'Only Deep Bank Offers'); });

function setupTrackingEngine(ctx, mode, modeLabel) {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return; 
    
    const chatId = ctx.chat.id.toString();
    const args = ctx.message.text.replace(/\n/g, ' ').split(' ').filter(arg => arg.trim() !== '');
    
    let fkLink = args.find(arg => arg.includes('flipkart.com/'));
    if (!fkLink) return ctx.reply(`❌ Format error! Command ke aage link space dekar bhejein. Example:\n\`/${ctx.command} https://flipkart.com/...\``, { parse_mode: 'Markdown' });
    
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
    if (activeUsers[chatId].some(item => item.id === pid)) return ctx.reply("⚠️ Abe ye product toh pehle se hi dauda rakha hai list me!");

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

    ctx.reply(`🎯 **Link Lock Ho Gya Bhai!**\n\n☕ Chal ab tu aaram se jaake **chai-wai piyo ya mast apni neend poori karo**, cheetah jaisi nazar laga di hai tere bhai ne. Jaise hi thoda sa bhi fluctuation hoga, tera bhai tere kaan ke neeche **alert baja baja kar** tujhe jaga dega! 😎🚀`);

    checkFinancialFluctuations(ctx, chatId, pid, fkLink, mode);
}

bot.command('list_track', (ctx) => {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return;
    const chatId = ctx.chat.id.toString();
    if (!activeUsers[chatId] || activeUsers[chatId].length === 0) return ctx.reply("😴 Abhi koi link nahi chal raha, sab shant hai.");
    
    let msg = "📋 **Aapki Running Tracking Matrix:**\n\n";
    activeUsers[chatId].forEach((item, index) => {
        msg += `${index + 1}. 📦 **ID:** \`${item.id}\` \n⚙️ **Mode:** \`[${item.mode}]\` \n🔗 **Link:** ${item.url}\n\n`;
    });
    ctx.reply(msg, { parse_mode: 'Markdown', disable_web_page_preview: true });
});

bot.command('stop_all', (ctx) => {
    const userId = ctx.from.id.toString();
    if (!isUserApproved(userId)) return;
    const chatId = ctx.chat.id.toString();
    if (activeUsers[chatId] && activeUsers[chatId].length > 0) {
        activeUsers[chatId].forEach(item => clearInterval(item.interval));
        delete activeUsers[chatId];
        ctx.reply("🛑 Saari active tracking ek jhatke me saaf kar di!");
    } else { ctx.reply("⚠️ Koyi active tracking chal hi nahi rahi."); }
});

// Admin commands
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

// --- 🔥 CORE BREAKDOWN SCRAPER ENGINE ---
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
                currentOffersRaw.push(cleanOffer);
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

bot.launch().then(() => console.log("Silent 30s Loop Engine Connected..."));

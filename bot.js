const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const BOT_TOKEN = '8980239383:AAFwZVEzP0lTYoIG3-HYig4xTz47L1n0lXY'; 
const ADMIN_CHAT_ID = '7485181331'; 
const DB_FILE = path.join(__dirname, 'database.json');
// ---------------------

const bot = new Telegraf(BOT_TOKEN);

// Database files load karne ke liye helper function
function loadApprovedUsers() {
    try {
        if (!fs.existsSync(DB_FILE)) return [ADMIN_CHAT_ID.toString()];
        const fileContent = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(fileContent).map(String);
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

// --- 🔥 ONLY ADMIN REMOVE USER COMMAND ---
bot.command('remove_user', async (ctx) => {
    // 1. Identity Check: Sirf asli admin chala sake
    if (ctx.from.id.toString() !== ADMIN_CHAT_ID.toString()) {
        return ctx.reply("❌ **Warning! Identity Verification Failed.**\nAbe shaane, yeh command sirf asli Loot Master (Admin) ke fingerprint par khulti hai. Chal peeche hatt! 👮‍♂️🔥");
    }

    const args = ctx.message.text.split(' ').filter(arg => arg.trim() !== '');
    if (args.length < 2) return ctx.reply("⚠️ Format: `/remove_user <user_id>`");
    
    const targetUserId = args[1].trim();
    let currentList = loadApprovedUsers();
    const idx = currentList.indexOf(targetUserId);
    
    if (idx !== -1) {
        // 2. Database se remove karo
        currentList.splice(idx, 1);
        saveApprovedUsers(currentList);

        // 3. Admin ko instant reply bhejo
        ctx.reply(`✅ **Operation Successful!**\n\nAgent \`${targetUserId}\` ka access permanent cancel kar diya gaya hai! ⚡💥`, { parse_mode: 'Markdown' });
        
        // 4. Samne wale bande ko jhatka message + Keyboard removal
        bot.telegram.sendMessage(
            targetUserId, 
            "⚠️ **bhai admin ne tera access hata diya hai** 🚫\n\nAb aap is bot ke khufiya features aur control panel use nahi kar sakte.",
            Markup.removeKeyboard() // Uske screen se buttons permanent saaf
        ).catch((err) => {
            console.log(`User tak message nahi gaya (Maybe blocked us): ${err.message}`);
        });
        
    } else {
        ctx.reply("⚠️ Yeh ID approved agents ki list mein nahi mili.");
    }
});

// Bot launch
bot.launch().then(() => console.log("Admin Clean Engine Live..."));

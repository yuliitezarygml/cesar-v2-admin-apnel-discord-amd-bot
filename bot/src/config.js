require('dotenv').config({ path: '../.env' });

module.exports = {
    // Discord Bot Token
    token: process.env.DISCORD_TOKEN,

    // Discord Client ID
    clientId: process.env.DISCORD_CLIENT_ID,

    // Bot prefix for commands
    prefix: '!',

    // Embed colors
    colors: {
        success: 0x00FF00,
        error: 0xFF0000,
        warning: 0xFFFF00,
        info: 0x0099FF,
        ban: 0xFF0000,
        unban: 0x00FF00,
        kick: 0xFFA500,
        mute: 0x808080,
        unmute: 0x00FF00,
        warn: 0xFFFF00,
    },
};

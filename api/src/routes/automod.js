const express = require('express');
const router = express.Router();

// Получить настройки автомодерации
router.get('/:guildId', async (req, res) => {
    try {
        const settings = await req.prisma.autoModSettings.findUnique({
            where: { guildId: req.params.guildId }
        });
        res.json(settings);
    } catch (error) {
        console.error('Error fetching automod settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Обновить настройки автомодерации
router.put('/:guildId', async (req, res) => {
    try {
        const settings = await req.prisma.autoModSettings.upsert({
            where: { guildId: req.params.guildId },
            update: req.body,
            create: {
                guildId: req.params.guildId,
                ...req.body
            }
        });
        res.json(settings);
    } catch (error) {
        console.error('Error updating automod settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Добавить запрещённое слово
router.post('/:guildId/words', async (req, res) => {
    try {
        const { word } = req.body;
        const settings = await req.prisma.autoModSettings.findUnique({
            where: { guildId: req.params.guildId }
        });
        
        const bannedWords = settings?.bannedWords || [];
        if (!bannedWords.includes(word)) {
            bannedWords.push(word);
        }
        
        const updated = await req.prisma.autoModSettings.upsert({
            where: { guildId: req.params.guildId },
            update: { bannedWords },
            create: {
                guildId: req.params.guildId,
                bannedWords
            }
        });
        
        res.json(updated);
    } catch (error) {
        console.error('Error adding banned word:', error);
        res.status(500).json({ error: 'Failed to add word' });
    }
});

// Удалить запрещённое слово
router.delete('/:guildId/words/:word', async (req, res) => {
    try {
        const settings = await req.prisma.autoModSettings.findUnique({
            where: { guildId: req.params.guildId }
        });
        
        const bannedWords = (settings?.bannedWords || []).filter(w => w !== req.params.word);
        
        const updated = await req.prisma.autoModSettings.update({
            where: { guildId: req.params.guildId },
            data: { bannedWords }
        });
        
        res.json(updated);
    } catch (error) {
        console.error('Error removing banned word:', error);
        res.status(500).json({ error: 'Failed to remove word' });
    }
});

module.exports = router;

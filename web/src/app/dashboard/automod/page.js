'use client';

import { useState, useEffect } from 'react';

export default function AutomodPage() {
    const [guilds, setGuilds] = useState([]);
    const [selectedGuild, setSelectedGuild] = useState('');
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchGuilds();
    }, []);

    useEffect(() => {
        if (selectedGuild) {
            fetchSettings();
        }
    }, [selectedGuild]);

    const fetchGuilds = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/guilds');
            const data = await res.json();
            setGuilds(data);
            if (data.length > 0) {
                setSelectedGuild(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching guilds:', error);
        }
    };

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const res = await fetch(`http://localhost:3001/api/automod/${selectedGuild}`);
            const data = await res.json();
            setSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
            setSettings(null);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (updates) => {
        setSaving(true);
        try {
            await fetch(`http://localhost:3001/api/automod/${selectedGuild}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            setSettings({ ...settings, ...updates });
        } catch (error) {
            console.error('Error updating settings:', error);
        } finally {
            setSaving(false);
        }
    };

    const ModuleCard = ({ title, icon, enabled, onToggle, children }) => (
        <div className={`bg-gray-800 rounded-lg p-6 border-2 transition-colors ${
            enabled ? 'border-green-500' : 'border-gray-700'
        }`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                </div>
                <button
                    onClick={onToggle}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        enabled 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                    }`}
                >
                    {enabled ? '✓ Включено' : 'Выключено'}
                </button>
            </div>
            {enabled && <div className="space-y-3 pt-4 border-t border-gray-700">{children}</div>}
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">🛡️ Автомодерация</h1>
                <div className="flex items-center gap-4">
                    {saving && <span className="text-yellow-400">Сохранение...</span>}
                    <select
                        value={selectedGuild}
                        onChange={(e) => setSelectedGuild(e.target.value)}
                        className="bg-gray-700 text-white px-4 py-2 rounded-lg"
                    >
                        {guilds.map((guild) => (
                            <option key={guild.id} value={guild.id}>
                                {guild.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center text-gray-400 py-10">Загрузка...</div>
            ) : !settings ? (
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <div className="text-4xl mb-4">⚙️</div>
                    <h2 className="text-xl text-white mb-2">Автомодерация не настроена</h2>
                    <p className="text-gray-400">Используйте команду /automod в Discord для первоначальной настройки</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Анти-спам */}
                    <ModuleCard
                        title="Анти-спам"
                        icon="🚫"
                        enabled={settings.antiSpamEnabled}
                        onToggle={() => updateSettings({ antiSpamEnabled: !settings.antiSpamEnabled })}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-gray-400 text-sm">Макс. сообщений</label>
                                <input
                                    type="number"
                                    value={settings.antiSpamMaxMessages || 5}
                                    onChange={(e) => updateSettings({ antiSpamMaxMessages: parseInt(e.target.value) })}
                                    className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm">За секунд</label>
                                <input
                                    type="number"
                                    value={settings.antiSpamInterval || 5}
                                    onChange={(e) => updateSettings({ antiSpamInterval: parseInt(e.target.value) })}
                                    className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm">Действие</label>
                            <select
                                value={settings.antiSpamAction || 'warn'}
                                onChange={(e) => updateSettings({ antiSpamAction: e.target.value })}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                            >
                                <option value="warn">Предупреждение</option>
                                <option value="mute">Мут</option>
                                <option value="kick">Кик</option>
                                <option value="ban">Бан</option>
                            </select>
                        </div>
                    </ModuleCard>

                    {/* Фильтр слов */}
                    <ModuleCard
                        title="Фильтр слов"
                        icon="🔤"
                        enabled={settings.wordFilterEnabled}
                        onToggle={() => updateSettings({ wordFilterEnabled: !settings.wordFilterEnabled })}
                    >
                        <div>
                            <label className="text-gray-400 text-sm">Запрещённые слова (через запятую)</label>
                            <textarea
                                value={(settings.bannedWords || []).join(', ')}
                                onChange={(e) => updateSettings({ 
                                    bannedWords: e.target.value.split(',').map(w => w.trim()).filter(w => w) 
                                })}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1 h-24"
                                placeholder="слово1, слово2, слово3"
                            />
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm">Действие</label>
                            <select
                                value={settings.wordFilterAction || 'delete'}
                                onChange={(e) => updateSettings({ wordFilterAction: e.target.value })}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                            >
                                <option value="delete">Удалить</option>
                                <option value="warn">Предупреждение</option>
                                <option value="mute">Мут</option>
                            </select>
                        </div>
                    </ModuleCard>

                    {/* Анти-ссылки */}
                    <ModuleCard
                        title="Анти-ссылки"
                        icon="🔗"
                        enabled={settings.antiLinksEnabled}
                        onToggle={() => updateSettings({ antiLinksEnabled: !settings.antiLinksEnabled })}
                    >
                        <div>
                            <label className="text-gray-400 text-sm">Разрешённые домены (через запятую)</label>
                            <input
                                type="text"
                                value={(settings.allowedDomains || []).join(', ')}
                                onChange={(e) => updateSettings({ 
                                    allowedDomains: e.target.value.split(',').map(w => w.trim()).filter(w => w) 
                                })}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                                placeholder="youtube.com, discord.com"
                            />
                        </div>
                    </ModuleCard>

                    {/* Анти-капс */}
                    <ModuleCard
                        title="Анти-CAPS"
                        icon="🔠"
                        enabled={settings.antiCapsEnabled}
                        onToggle={() => updateSettings({ antiCapsEnabled: !settings.antiCapsEnabled })}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-gray-400 text-sm">% заглавных</label>
                                <input
                                    type="number"
                                    value={settings.antiCapsPercentage || 70}
                                    onChange={(e) => updateSettings({ antiCapsPercentage: parseInt(e.target.value) })}
                                    className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                                    min="50"
                                    max="100"
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm">Мин. длина</label>
                                <input
                                    type="number"
                                    value={settings.antiCapsMinLength || 10}
                                    onChange={(e) => updateSettings({ antiCapsMinLength: parseInt(e.target.value) })}
                                    className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                                />
                            </div>
                        </div>
                    </ModuleCard>

                    {/* Анти-эмодзи */}
                    <ModuleCard
                        title="Лимит эмодзи"
                        icon="😀"
                        enabled={settings.antiEmojiEnabled}
                        onToggle={() => updateSettings({ antiEmojiEnabled: !settings.antiEmojiEnabled })}
                    >
                        <div>
                            <label className="text-gray-400 text-sm">Максимум эмодзи</label>
                            <input
                                type="number"
                                value={settings.antiEmojiMax || 10}
                                onChange={(e) => updateSettings({ antiEmojiMax: parseInt(e.target.value) })}
                                className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                            />
                        </div>
                    </ModuleCard>

                    {/* Статистика */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">📊 Статистика</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-700 rounded p-4 text-center">
                                <div className="text-2xl font-bold text-red-400">0</div>
                                <div className="text-gray-400 text-sm">Заблокировано сегодня</div>
                            </div>
                            <div className="bg-gray-700 rounded p-4 text-center">
                                <div className="text-2xl font-bold text-yellow-400">0</div>
                                <div className="text-gray-400 text-sm">Предупреждений</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

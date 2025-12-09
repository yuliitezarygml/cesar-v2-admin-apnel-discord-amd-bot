'use client';

import { useState, useEffect } from 'react';

export default function LevelsPage() {
    const [guilds, setGuilds] = useState([]);
    const [selectedGuild, setSelectedGuild] = useState('');
    const [leaderboard, setLeaderboard] = useState([]);
    const [settings, setSettings] = useState(null);
    const [rewards, setRewards] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGuilds();
    }, []);

    useEffect(() => {
        if (selectedGuild) {
            fetchLevelData();
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

    const fetchLevelData = async () => {
        setLoading(true);
        try {
            const [leaderboardRes, settingsRes, rewardsRes] = await Promise.all([
                fetch(`http://localhost:3001/api/levels/${selectedGuild}/leaderboard`),
                fetch(`http://localhost:3001/api/levels/${selectedGuild}/settings`),
                fetch(`http://localhost:3001/api/levels/${selectedGuild}/rewards`)
            ]);
            
            const leaderboardData = await leaderboardRes.json();
            const settingsData = await settingsRes.json();
            const rewardsData = await rewardsRes.json();
            
            setLeaderboard(leaderboardData);
            setSettings(settingsData);
            setRewards(rewardsData);
        } catch (error) {
            console.error('Error fetching level data:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSettings = async (newSettings) => {
        try {
            await fetch(`http://localhost:3001/api/levels/${selectedGuild}/settings`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings)
            });
            setSettings({ ...settings, ...newSettings });
        } catch (error) {
            console.error('Error updating settings:', error);
        }
    };

    const calculateXpForLevel = (level) => {
        return 5 * Math.pow(level, 2) + 50 * level + 100;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">📊 Система уровней</h1>
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

            {loading ? (
                <div className="text-center text-gray-400 py-10">Загрузка...</div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Настройки */}
                    <div className="bg-gray-800 rounded-lg p-6">
                        <h2 className="text-xl font-semibold text-white mb-4">⚙️ Настройки</h2>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-300">Система включена</span>
                                <button
                                    onClick={() => updateSettings({ enabled: !settings?.enabled })}
                                    className={`px-4 py-2 rounded ${
                                        settings?.enabled 
                                            ? 'bg-green-600 text-white' 
                                            : 'bg-gray-600 text-gray-300'
                                    }`}
                                >
                                    {settings?.enabled ? 'Вкл' : 'Выкл'}
                                </button>
                            </div>

                            <div>
                                <label className="text-gray-300 text-sm">XP за сообщение</label>
                                <input
                                    type="number"
                                    value={settings?.xpPerMessage || 15}
                                    onChange={(e) => updateSettings({ xpPerMessage: parseInt(e.target.value) })}
                                    className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                                />
                            </div>

                            <div>
                                <label className="text-gray-300 text-sm">Кулдаун (сек)</label>
                                <input
                                    type="number"
                                    value={settings?.xpCooldown || 60}
                                    onChange={(e) => updateSettings({ xpCooldown: parseInt(e.target.value) })}
                                    className="w-full bg-gray-700 text-white px-3 py-2 rounded mt-1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Топ пользователей */}
                    <div className="bg-gray-800 rounded-lg p-6 lg:col-span-2">
                        <h2 className="text-xl font-semibold text-white mb-4">🏆 Таблица лидеров</h2>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-gray-400 border-b border-gray-700">
                                        <th className="pb-3">#</th>
                                        <th className="pb-3">Пользователь</th>
                                        <th className="pb-3">Уровень</th>
                                        <th className="pb-3">XP</th>
                                        <th className="pb-3">Сообщений</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leaderboard.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center text-gray-500 py-8">
                                                Нет данных о пользователях
                                            </td>
                                        </tr>
                                    ) : (
                                        leaderboard.map((user, index) => (
                                            <tr key={user.id} className="border-b border-gray-700">
                                                <td className="py-3">
                                                    <span className={`
                                                        ${index === 0 ? 'text-yellow-400' : ''}
                                                        ${index === 1 ? 'text-gray-300' : ''}
                                                        ${index === 2 ? 'text-amber-600' : ''}
                                                    `}>
                                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-white">{user.userId}</td>
                                                <td className="py-3">
                                                    <span className="bg-indigo-600 px-2 py-1 rounded text-white text-sm">
                                                        Ур. {user.level}
                                                    </span>
                                                </td>
                                                <td className="py-3 text-gray-300">
                                                    {user.xp.toLocaleString()} / {calculateXpForLevel(user.level).toLocaleString()}
                                                </td>
                                                <td className="py-3 text-gray-400">{user.messageCount.toLocaleString()}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Награды за уровни */}
                    <div className="bg-gray-800 rounded-lg p-6 lg:col-span-3">
                        <h2 className="text-xl font-semibold text-white mb-4">🎁 Награды за уровни</h2>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {rewards.length === 0 ? (
                                <div className="col-span-full text-center text-gray-500 py-4">
                                    Награды не настроены. Используйте команду /level settings в Discord.
                                </div>
                            ) : (
                                rewards.map((reward) => (
                                    <div key={reward.id} className="bg-gray-700 rounded-lg p-4 text-center">
                                        <div className="text-2xl mb-2">🎖️</div>
                                        <div className="text-white font-semibold">Уровень {reward.level}</div>
                                        <div className="text-gray-400 text-sm">Роль: {reward.roleId}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

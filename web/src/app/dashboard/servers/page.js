'use client';

import { useState, useEffect } from 'react';
import { Search, Server, Users, ScrollText, UserCheck, UserX, Timer, UserMinus } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ServersPage() {
    const [guilds, setGuilds] = useState([]);
    const [guildsStats, setGuildsStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchGuilds();
        fetchGuildsStats();
        
        // Обновляем статистику каждые 30 секунд
        const interval = setInterval(fetchGuildsStats, 30000);
        return () => clearInterval(interval);
    }, []);

    async function fetchGuilds() {
        try {
            const response = await fetch(`${API_URL}/api/guilds`);
            const data = await response.json();
            setGuilds(data);
        } catch (error) {
            console.error('Error fetching guilds:', error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchGuildsStats() {
        try {
            const response = await fetch(`${API_URL}/api/stats/all-guilds-online`);
            const data = await response.json();
            
            // Создаем мапу статистики по guildId
            const statsMap = {};
            data.guilds.forEach(guild => {
                statsMap[guild.guildId] = guild.stats;
            });
            setGuildsStats(statsMap);
        } catch (error) {
            console.error('Error fetching guilds stats:', error);
        }
    }

    const filteredGuilds = guilds.filter(guild =>
        guild.name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-4 border-discord-blurple border-t-transparent rounded-full"></div>
            </div>
        );
    }

    return (
        <div className="p-6 animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Серверы</h1>
                <p className="text-gray-400">Управление подключенными Discord серверами</p>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Поиск серверов..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full max-w-md pl-10 pr-4 py-2 bg-discord-light border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-discord-blurple"
                />
            </div>

            {/* Guilds Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGuilds.length > 0 ? (
                    filteredGuilds.map((guild) => {
                        const stats = guildsStats[guild.id] || {
                            totalMembers: 0,
                            onlineMembers: 0,
                            offlineMembers: 0,
                            idleMembers: 0,
                            dndMembers: 0,
                        };
                        
                        return (
                            <div
                                key={guild.id}
                                className="bg-discord-dark rounded-xl p-5 card-hover"
                            >
                                <div className="flex items-center gap-4 mb-4">
                                    {guild.iconUrl ? (
                                        <img
                                            src={guild.iconUrl}
                                            alt={guild.name}
                                            className="w-12 h-12 rounded-full"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-discord-blurple rounded-full flex items-center justify-center">
                                            <Server className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white">{guild.name}</h3>
                                        <p className="text-gray-500 text-xs">{guild.id}</p>
                                    </div>
                                </div>

                                {/* Статистика пользователей */}
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div className="bg-discord-lighter rounded-lg p-2 flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-lg font-bold text-white">{stats.onlineMembers}</p>
                                            <p className="text-xs text-gray-400 truncate">Онлайн</p>
                                        </div>
                                    </div>
                                    <div className="bg-discord-lighter rounded-lg p-2 flex items-center gap-2">
                                        <UserX className="w-4 h-4 text-gray-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-lg font-bold text-white">{stats.offlineMembers}</p>
                                            <p className="text-xs text-gray-400 truncate">Офлайн</p>
                                        </div>
                                    </div>
                                    <div className="bg-discord-lighter rounded-lg p-2 flex items-center gap-2">
                                        <Timer className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-lg font-bold text-white">{stats.idleMembers}</p>
                                            <p className="text-xs text-gray-400 truncate">Неактивен</p>
                                        </div>
                                    </div>
                                    <div className="bg-discord-lighter rounded-lg p-2 flex items-center gap-2">
                                        <UserMinus className="w-4 h-4 text-red-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-lg font-bold text-white">{stats.dndMembers}</p>
                                            <p className="text-xs text-gray-400 truncate">Не беспокоить</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Дополнительная статистика */}
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-discord-lighter rounded-lg p-2 text-center">
                                        <ScrollText className="w-4 h-4 mx-auto mb-1 text-discord-blurple" />
                                        <p className="text-lg font-bold text-white">
                                            {guild._count?.moderationLogs || 0}
                                        </p>
                                        <p className="text-xs text-gray-400">Логов</p>
                                    </div>
                                    <div className="bg-discord-lighter rounded-lg p-2 text-center">
                                        <Users className="w-4 h-4 mx-auto mb-1 text-discord-green" />
                                        <p className="text-lg font-bold text-white">
                                            {guild._count?.admins || 0}
                                        </p>
                                        <p className="text-xs text-gray-400">Админов</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full text-center py-12 text-gray-400">
                        <Server className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Серверы не найдены</p>
                    </div>
                )}
            </div>
        </div>
    );
}

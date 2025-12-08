'use client';

import { useState, useEffect } from 'react';
import { Search, Server, Users, ScrollText } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function ServersPage() {
    const [guilds, setGuilds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchGuilds();
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
                    filteredGuilds.map((guild) => (
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
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{guild.name}</h3>
                                    <p className="text-gray-500 text-xs">{guild.id}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-discord-lighter rounded-lg p-3 text-center">
                                    <ScrollText className="w-5 h-5 mx-auto mb-1 text-discord-blurple" />
                                    <p className="text-xl font-bold text-white">
                                        {guild._count?.moderationLogs || 0}
                                    </p>
                                    <p className="text-xs text-gray-400">Логов</p>
                                </div>
                                <div className="bg-discord-lighter rounded-lg p-3 text-center">
                                    <Users className="w-5 h-5 mx-auto mb-1 text-discord-green" />
                                    <p className="text-xl font-bold text-white">
                                        {guild._count?.admins || 0}
                                    </p>
                                    <p className="text-xs text-gray-400">Админов</p>
                                </div>
                            </div>
                        </div>
                    ))
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

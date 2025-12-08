'use client';

import { useState, useEffect } from 'react';
import { Search, User, Ban, AlertTriangle, Clock, Users, RefreshCw, ChevronRight } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function UsersPage() {
    const [userId, setUserId] = useState('');
    const [userLogs, setUserLogs] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(true);

    useEffect(() => {
        fetchAllUsers();
    }, []);

    async function fetchAllUsers() {
        setLoadingUsers(true);
        try {
            // Получаем последние логи чтобы показать пользователей
            const response = await fetch(`${API_URL}/api/logs?limit=100`);
            const data = await response.json();

            // Собираем уникальных пользователей
            const usersMap = new Map();
            (data.data || []).forEach(log => {
                if (log.target && !usersMap.has(log.targetId)) {
                    usersMap.set(log.targetId, {
                        id: log.targetId,
                        username: log.target.username,
                        lastAction: log.action,
                        lastActionDate: log.createdAt,
                    });
                }
            });

            setAllUsers(Array.from(usersMap.values()).slice(0, 20));
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoadingUsers(false);
        }
    }

    async function searchUser(id = null) {
        const searchId = id || userId;
        if (!searchId.trim()) return;

        setUserId(searchId);
        setLoading(true);
        setSearched(true);
        try {
            const response = await fetch(`${API_URL}/api/logs/user/${searchId}`);
            const data = await response.json();
            setUserLogs(data.data || []);
        } catch (error) {
            console.error('Error searching user:', error);
            setUserLogs([]);
        } finally {
            setLoading(false);
        }
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);
    }

    const ACTION_LABELS = {
        BAN: 'Бан',
        UNBAN: 'Разбан',
        KICK: 'Кик',
        MUTE: 'Мут',
        UNMUTE: 'Размут',
        WARN: 'Предупреждение',
        UNWARN: 'Снятие предупр.',
        TIMEOUT: 'Таймаут',
        REMOVE_TIMEOUT: 'Снятие таймаута',
        NOTE: 'Заметка',
        SLOWMODE: 'Медл. режим',
        LOCK: 'Блокировка',
        UNLOCK: 'Разблокировка',
        CLEAR: 'Очистка',
        ROLE_ADD: 'Добавление роли',
        ROLE_REMOVE: 'Удаление роли',
    };

    const ACTION_COLORS = {
        BAN: 'bg-discord-red/20 text-discord-red',
        UNBAN: 'bg-discord-green/20 text-discord-green',
        KICK: 'bg-orange-500/20 text-orange-400',
        WARN: 'bg-discord-yellow/20 text-discord-yellow',
        UNWARN: 'bg-discord-green/20 text-discord-green',
        TIMEOUT: 'bg-gray-500/20 text-gray-400',
        NOTE: 'bg-blue-500/20 text-blue-400',
    };

    return (
        <div className="p-6 animate-fadeIn">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">Пользователи</h1>
                <p className="text-gray-400">Поиск и просмотр истории пользователей</p>
            </div>

            {/* Search */}
            <div className="flex gap-4 mb-8">
                <div className="relative flex-1 max-w-md">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Введите Discord ID пользователя..."
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && searchUser()}
                        className="w-full pl-10 pr-4 py-3 bg-discord-light border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-discord-blurple"
                    />
                </div>
                <button
                    onClick={() => searchUser()}
                    disabled={loading || !userId.trim()}
                    className="px-6 py-3 bg-discord-blurple rounded-lg hover:bg-discord-blurple/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                    <Search className="w-4 h-4" />
                    Поиск
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Users */}
                <div className="lg:col-span-1">
                    <div className="bg-discord-dark rounded-xl p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Недавние пользователи
                            </h2>
                            <button onClick={fetchAllUsers} className="text-gray-400 hover:text-white">
                                <RefreshCw className={`w-4 h-4 ${loadingUsers ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loadingUsers ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin w-6 h-6 border-2 border-discord-blurple border-t-transparent rounded-full"></div>
                            </div>
                        ) : allUsers.length > 0 ? (
                            <div className="space-y-2">
                                {allUsers.map(user => (
                                    <button
                                        key={user.id}
                                        onClick={() => searchUser(user.id)}
                                        className="w-full flex items-center justify-between p-3 bg-discord-lighter rounded-lg hover:bg-discord-light transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-discord-blurple rounded-full flex items-center justify-center text-sm font-bold">
                                                {user.username?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="text-white text-sm font-medium">{user.username || 'Неизвестный'}</p>
                                                <p className="text-gray-500 text-xs">{user.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-1 rounded ${ACTION_COLORS[user.lastAction] || 'bg-gray-500/20 text-gray-400'}`}>
                                                {ACTION_LABELS[user.lastAction] || user.lastAction}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-gray-500" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>Нет данных</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* User History */}
                <div className="lg:col-span-2">
                    {loading ? (
                        <div className="bg-discord-dark rounded-xl p-6 flex items-center justify-center py-12">
                            <div className="animate-spin w-8 h-8 border-4 border-discord-blurple border-t-transparent rounded-full"></div>
                        </div>
                    ) : searched ? (
                        <div className="bg-discord-dark rounded-xl p-6">
                            {userLogs.length > 0 ? (
                                <>
                                    <h2 className="text-xl font-semibold text-white mb-4">
                                        История пользователя ({userLogs.length} записей)
                                    </h2>
                                    <div className="space-y-3">
                                        {userLogs.map((log) => (
                                            <div
                                                key={log.id}
                                                className="flex items-center justify-between p-4 bg-discord-lighter rounded-lg"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg ${ACTION_COLORS[log.action] || 'bg-gray-500/20 text-gray-400'}`}>
                                                        {log.action === 'BAN' ? <Ban className="w-4 h-4" /> :
                                                            log.action === 'WARN' ? <AlertTriangle className="w-4 h-4" /> :
                                                                <Clock className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">
                                                            {ACTION_LABELS[log.action] || log.action}
                                                        </p>
                                                        <p className="text-gray-400 text-sm">
                                                            {log.targetId === userId ? 'Получил' : 'Выдал'} • {log.reason || 'Без причины'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-gray-300 text-sm">
                                                        {log.targetId === userId ? log.moderator?.username : log.target?.username}
                                                    </p>
                                                    <p className="text-gray-500 text-xs">
                                                        {formatDate(log.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>История пользователя не найдена</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-discord-dark rounded-xl p-6 text-center py-12 text-gray-400">
                            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Введите ID пользователя или выберите из списка слева</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

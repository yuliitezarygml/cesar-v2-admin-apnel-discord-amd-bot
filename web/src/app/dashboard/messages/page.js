'use client';

import { useState, useEffect } from 'react';
import { Trash2, Search, ChevronLeft, ChevronRight, RefreshCw, MessageSquare } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function MessagesPage() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchMessages();
    }, [pagination.page]);

    async function fetchMessages() {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: 20,
            });

            const response = await fetch(`${API_URL}/api/messages?${params}`);
            const data = await response.json();

            setMessages(data.data || []);
            setPagination(prev => ({
                ...prev,
                pages: data.pagination?.pages || 1,
                total: data.pagination?.total || 0,
            }));
        } catch (error) {
            console.error('Error fetching messages:', error);
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

    const filteredMessages = messages.filter(msg =>
        msg.content.toLowerCase().includes(search.toLowerCase()) ||
        msg.authorName.toLowerCase().includes(search.toLowerCase()) ||
        msg.channelName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Удалённые сообщения</h1>
                    <p className="text-gray-400">Всего записей: {pagination.total}</p>
                </div>
                <button
                    onClick={fetchMessages}
                    className="flex items-center gap-2 px-4 py-2 bg-discord-blurple rounded-lg hover:bg-discord-blurple/80 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Обновить
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Поиск по сообщениям, авторам, каналам..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-discord-light border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-discord-blurple"
                />
            </div>

            {/* Messages List */}
            <div className="bg-discord-dark rounded-xl overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin w-8 h-8 border-4 border-discord-blurple border-t-transparent rounded-full"></div>
                    </div>
                ) : filteredMessages.length > 0 ? (
                    <div className="divide-y divide-gray-800">
                        {filteredMessages.map((msg) => (
                            <div key={msg.id} className="p-4 hover:bg-discord-lighter transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-discord-blurple rounded-full flex items-center justify-center flex-shrink-0">
                                        <MessageSquare className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-medium text-white">{msg.authorName}</span>
                                            <span className="text-gray-500 text-sm">в</span>
                                            <span className="text-discord-blurple text-sm">#{msg.channelName}</span>
                                            <span className="text-gray-500 text-xs">•</span>
                                            <span className="text-gray-500 text-xs">{formatDate(msg.createdAt)}</span>
                                        </div>
                                        <p className="text-gray-300 break-words">{msg.content}</p>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                                            <Trash2 className="w-3 h-3 text-discord-red" />
                                            <span>Удалил: {msg.deletedByName}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-400">
                        <Trash2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>Удалённые сообщения не найдены</p>
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex items-center justify-between p-4 border-t border-gray-700">
                        <p className="text-gray-400 text-sm">
                            Страница {pagination.page} из {pagination.pages}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                disabled={pagination.page <= 1}
                                className="p-2 bg-discord-light rounded-lg hover:bg-discord-lighter disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                disabled={pagination.page >= pagination.pages}
                                className="p-2 bg-discord-light rounded-lg hover:bg-discord-lighter disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

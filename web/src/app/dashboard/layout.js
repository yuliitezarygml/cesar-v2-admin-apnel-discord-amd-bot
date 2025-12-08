import Link from 'next/link';
import {
    LayoutDashboard,
    ScrollText,
    Users,
    Settings,
    Server,
    Shield,
    Trash2
} from 'lucide-react';

export default function DashboardLayout({ children }) {
    return (
        <div className="flex min-h-screen bg-discord-darker">
            {/* Sidebar */}
            <aside className="w-64 bg-discord-dark border-r border-gray-800 flex flex-col">
                {/* Logo */}
                <div className="p-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-discord-blurple rounded-full flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-white">Mod Panel</h1>
                            <p className="text-xs text-gray-400">Администрирование</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4">
                    <ul className="space-y-2">
                        <NavItem href="/dashboard" icon={<LayoutDashboard />}>
                            Дашборд
                        </NavItem>
                        <NavItem href="/dashboard/logs" icon={<ScrollText />}>
                            Логи модерации
                        </NavItem>
                        <NavItem href="/dashboard/messages" icon={<Trash2 />}>
                            Удалённые сообщения
                        </NavItem>
                        <NavItem href="/dashboard/users" icon={<Users />}>
                            Пользователи
                        </NavItem>
                        <NavItem href="/dashboard/servers" icon={<Server />}>
                            Серверы
                        </NavItem>
                        <NavItem href="/dashboard/settings" icon={<Settings />}>
                            Настройки
                        </NavItem>
                    </ul>
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800">
                    <p className="text-xs text-gray-500 text-center">
                        Discord Mod Bot v1.0
                    </p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}

function NavItem({ href, icon, children }) {
    return (
        <li>
            <Link
                href={href}
                className="flex items-center gap-3 px-3 py-2 text-gray-300 rounded-lg hover:bg-discord-lighter hover:text-white transition-colors"
            >
                <span className="w-5 h-5">{icon}</span>
                {children}
            </Link>
        </li>
    );
}

'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import useAuthStore from '@/store/authStore';
import {
  Home,
  FileText,
  Users,
  BarChart3,
  Settings,
  LogOut,
  MessageCircle,
  X,
  Menu,
  MapPin,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Laporan', href: '/laporan', icon: FileText },
  {
    name: 'Pengguna',
    href: '/pengguna',
    icon: Users,
    roles: ['admin'],
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    roles: ['admin', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'],
  },
  {
    name: 'Peta Laporan',
    href: '/admin/peta-laporan',
    icon: MapPin,
    roles: ['admin_sistem', 'admin_rw', 'ketua_rt', 'sekretaris_rt', 'sekretaris', 'pengurus'],
  },
  { name: 'Pengaturan', href: '/pengaturan', icon: Settings },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 shadow-lg flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        suppressHydrationWarning
      >
        {/* Logo dengan close button untuk mobile */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between" suppressHydrationWarning>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center" suppressHydrationWarning>
              <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="text-xl font-bold text-gray-900">LaporIn</span>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Tutup sidebar"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50" suppressHydrationWarning>
        <div className="flex items-center gap-3" suppressHydrationWarning>
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center text-white font-semibold" suppressHydrationWarning>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0" suppressHydrationWarning>
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.name || 'User'}
            </p>
            <p className="text-xs text-gray-600 truncate">
              {user?.role === 'warga'
                ? 'Warga'
                : user?.role === 'admin'
                ? 'Admin Sistem'
                : user?.role === 'admin_rw'
                ? 'Admin RW'
                : user?.role === 'ketua_rt'
                ? 'Ketua RT'
                : ['sekretaris_rt', 'sekretaris'].includes(user?.role || '')
                ? 'Sekretaris RT'
                : user?.role === 'pengurus'
                ? 'Pengurus'
                : user?.role || 'User'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1" suppressHydrationWarning>
        {filteredNavItems.map((item, index) => {
          const Icon = item.icon;
          // Active state: exact match or starts with (for nested routes)
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          
          // Use unique key: combination of name and index to avoid duplicate keys
          return (
            <Link
              key={`${item.name}-${index}`}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-blue-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200" suppressHydrationWarning>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all w-full"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Keluar</span>
        </button>
      </div>
    </div>
    </>
  );
}


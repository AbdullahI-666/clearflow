import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, Map, MessageSquare, BarChart3, Users, Menu, Search, UserCircle, LogOut, Settings, FolderKanban, Receipt } from 'lucide-react';
import { useAuth } from '../../../entities/user/hooks/useAuth';
import { usePermissions } from '../../../entities/user/hooks/usePermissions';
import { Role } from '../../../entities/user/types';
import { NotificationBell } from '../NotificationBell';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export const DashboardLayout = () => {
  const { user, logout, updateUser } = useAuth();
  const { isClient, isFieldTeam, isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Quick switch for demo purposes
  const switchRole = (role: Role) => {
    updateUser({ role });
    navigate('/dashboard');
  };

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: [Role.CLIENT, Role.FIELD_TEAM, Role.ADMIN] },
    { label: 'Work Orders', icon: ClipboardList, path: '/work-orders', roles: [Role.CLIENT, Role.FIELD_TEAM, Role.ADMIN] },
    { label: 'Live Tracking', icon: Map, path: '/tracking', roles: [Role.ADMIN] },
    { label: 'Categories', icon: FolderKanban, path: '/categories', roles: [Role.ADMIN] },
    { label: 'Invoices', icon: Receipt, path: '/invoices', roles: [Role.ADMIN] },
    { label: 'Analytics', icon: BarChart3, path: '/analytics', roles: [Role.ADMIN] },
    { label: 'Teams', icon: Users, path: '/teams', roles: [Role.ADMIN] },
    { label: 'Chat', icon: MessageSquare, path: '/chat', roles: [Role.CLIENT, Role.FIELD_TEAM, Role.ADMIN] },
    { label: 'Settings', icon: Settings, path: '/settings', roles: [Role.ADMIN] },
  ];

  const userRole = (user?.role || Role.CLIENT).toLowerCase();
  const filteredNavItems = navItems.filter(item => 
    item.roles.some(r => r.toLowerCase() === userRole || (r === 'FieldTeam' && userRole === 'field_team'))
  );

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-100">
      <div className="p-6 flex items-center gap-3 border-b border-gray-50">
        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">CF</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">ClearFlow</h1>
      </div>
      
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-teal-50 text-teal-700 relative font-bold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-teal-600 rounded-r-full" />}
                <item.icon className={`w-5 h-5 ${isActive ? 'text-teal-600' : 'text-gray-400'}`} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100">
        <div className="mb-4 px-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">View As (Demo)</p>
          <div className="flex gap-2">
            <Button size="sm" variant={isClient ? 'default' : 'outline'} className={isClient ? 'bg-teal-600 hover:bg-teal-700' : ''} onClick={() => switchRole(Role.CLIENT)}>C</Button>
            <Button size="sm" variant={isFieldTeam ? 'default' : 'outline'} className={isFieldTeam ? 'bg-teal-600 hover:bg-teal-700' : ''} onClick={() => switchRole(Role.FIELD_TEAM)}>F</Button>
            <Button size="sm" variant={isAdmin ? 'default' : 'outline'} className={isAdmin ? 'bg-teal-600 hover:bg-teal-700' : ''} onClick={() => switchRole(Role.ADMIN)}>A</Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0FDF4] lg:bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 fixed inset-y-0 z-20">
        <NavContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="text-gray-600">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <NavContent />
              </SheetContent>
            </Sheet>
            
            <div className="hidden md:flex items-center bg-gray-50 rounded-full px-4 py-2 border border-gray-100 w-64 focus-within:ring-2 focus-within:ring-teal-100 focus-within:border-teal-300 transition-all">
              <Search className="w-4 h-4 text-gray-400 mr-2" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="bg-transparent border-none outline-none text-sm w-full placeholder:text-gray-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <NotificationBell />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-4 py-1.5 h-auto rounded-full hover:bg-gray-50 cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700">
                    <UserCircle className="w-5 h-5" />
                  </div>
                  <div className="hidden sm:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-700 leading-none">{user?.name || user?.firstName || 'User'}</span>
                    <span className="text-xs text-gray-400 mt-1">{user?.role}</span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white shadow-xl rounded-xl border border-gray-100">
                <DropdownMenuItem className="cursor-pointer text-gray-700" onClick={() => navigate('/profile')}>
                  <UserCircle className="w-4 h-4 mr-2" />
                  User Profile
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem className="cursor-pointer text-gray-700" onClick={() => navigate('/settings')}>
                    <Settings className="w-4 h-4 mr-2" />
                    System Settings
                  </DropdownMenuItem>
                )}
                <div className="border-t border-gray-100 my-1" />
                <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50" onClick={logout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

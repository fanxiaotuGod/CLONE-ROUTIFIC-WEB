import React from 'react';
import {
  MapIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline';

export type ViewType = 'map' | 'drivers' | 'deliveries' | 'settings';

interface LeftSidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ activeView, setActiveView }) => {
  const menuItems = [
    { id: 'map', icon: MapIcon, name: 'Map View' },
    { id: 'drivers', icon: UsersIcon, name: 'Drivers' },
    { id: 'deliveries', icon: ClipboardDocumentListIcon, name: 'Deliveries' },
  ];

  const bottomItems = [
    { id: 'settings', icon: Cog6ToothIcon, name: 'Settings' },
    { id: 'help', icon: QuestionMarkCircleIcon, name: 'Help' },
  ];

  const NavButton = ({ item, isActive }: { item: { id: string, icon: React.ElementType, name: string }, isActive: boolean }) => (
    <button
      onClick={() => setActiveView(item.id as ViewType)}
      title={item.name}
      className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors duration-200 ${
        isActive
          ? 'bg-primary-500 text-white'
          : 'text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700'
      }`}
    >
      <item.icon className="h-6 w-6" />
    </button>
  );

  return (
    <div className="fixed top-0 left-0 h-screen w-20 z-50 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col items-center justify-between py-4">
      <div className="flex flex-col items-center space-y-3">
        {/* Logo */}
        <div className="bg-primary-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl shrink-0 mb-4">
          F
        </div>
        {menuItems.map(item => (
          <NavButton key={item.id} item={item} isActive={activeView === item.id} />
        ))}
      </div>
      
      <div className="flex flex-col items-center space-y-3">
        {bottomItems.map(item => (
          <NavButton key={item.id} item={item} isActive={activeView === item.id} />
        ))}
      </div>
    </div>
  );
};

export default LeftSidebar; 
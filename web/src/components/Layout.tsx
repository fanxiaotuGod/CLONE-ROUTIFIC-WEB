import React, { ReactNode } from 'react';
// import Sidebar from './Sidebar'; // Sidebar is no longer imported or used
import TopBar from './TopBar';

interface TopBarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  onFinalize: () => void;
  onGenerateRoutes: () => void;
  routesGenerated: boolean;
  onAddDriver: () => void;
  onUploadDeliveries: (file: File) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onDeleteAllDeliveries?: () => void;
  onDeleteAllDrivers?: () => void;
}

interface LayoutProps {
  children: ReactNode;
  topBarProps: TopBarProps;
}

const Layout: React.FC<LayoutProps> = ({ children, topBarProps }) => {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200">
      <div className="flex-1 flex flex-col pl-20"> {/* Add left padding for the sidebar */}
        <TopBar {...topBarProps} />
        <main className="flex-1 w-full h-full pt-16"> {/* Add top padding for the TopBar */}
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 
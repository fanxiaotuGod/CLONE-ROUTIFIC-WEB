import React from 'react';
// import Sidebar from './Sidebar'; // Sidebar is no longer imported or used
import TopBar from './TopBar';

const Layout: React.FC<{ // Removed SidebarProps as it's no longer used
  children: React.ReactNode;
  topBarProps: any; // Consider defining a more specific type for topBarProps
}> = ({ children, topBarProps }) => {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-100 dark:bg-slate-900 text-slate-900 dark:text-slate-50">
      {children} {/* MapView will be passed here and take full screen */}
      <TopBar {...topBarProps} /> {/* TopBar is fixed, full-width, z-40 */}
      {/* <Sidebar /> Sidebar component removed from here */}
      {/* Other floating elements like timeline, popups will be direct children of App, positioned over the map */}
    </div>
  );
};

export default Layout; 
import React, { useState, useRef, useEffect } from 'react';
import {
  CalendarIcon, ArrowDownTrayIcon, ClockIcon, UserPlusIcon, MoonIcon, SunIcon, InboxArrowDownIcon, DocumentArrowUpIcon, CogIcon, CheckCircleIcon, TrashIcon, ExclamationTriangleIcon, PlusIcon, ArrowUpTrayIcon, Cog6ToothIcon, ChevronDownIcon, ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { WithAuthenticatorProps } from '@aws-amplify/ui-react';

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
  onAddDeliveryClick?: () => void;
  onDeleteAllDeliveries?: () => void;
  onDeleteAllDrivers?: () => void;
  signOut?: WithAuthenticatorProps['signOut'];
  user?: WithAuthenticatorProps['user'];
}

const TopBar: React.FC<TopBarProps> = ({
  selectedDate,
  onDateChange,
  onFinalize,
  onGenerateRoutes,
  routesGenerated,
  onAddDriver,
  onUploadDeliveries,
  darkMode,
  onToggleDarkMode,
  onAddDeliveryClick,
  onDeleteAllDeliveries,
  onDeleteAllDrivers,
  signOut,
  user,
}) => {
  const [isDeleteDropdownOpen, setIsDeleteDropdownOpen] = useState(false);
  const deleteDropdownRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUploadDeliveries(file);
      event.target.value = '';
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (deleteDropdownRef.current && !deleteDropdownRef.current.contains(event.target as Node)) {
        setIsDeleteDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDeleteAllDeliveriesClick = () => {
    onDeleteAllDeliveries?.();
    setIsDeleteDropdownOpen(false);
  };

  const handleDeleteAllDriversClick = () => {
    onDeleteAllDrivers?.();
    setIsDeleteDropdownOpen(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-16 z-40 flex items-center justify-between px-4 sm:px-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-slate-700 shadow-lg" style={{ fontFamily: 'Google Sans, sans-serif' }}>
      {/* Left side: Logo, Date, Start Time */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-lg shrink-0">F</div>
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-primary-600 dark:text-primary-400 shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => onDateChange(e.target.value)}
            className="border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200"
            style={{ fontFamily: 'inherit' }}
          />
        </div>
        <div className="hidden lg:flex items-center ml-2 sm:ml-4 text-sm text-gray-600 dark:text-slate-400">
          <ClockIcon className="h-4 w-4 mr-1 text-primary-500 dark:text-primary-400 shrink-0" />
          Start: <span className="ml-1 font-semibold whitespace-nowrap">8:00 AM</span>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        <label htmlFor="csv-upload" className="btn btn-secondary btn-sm flex items-center cursor-pointer">
          <DocumentArrowUpIcon className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Upload CSV</span>
        </label>
        <input type="file" id="csv-upload" accept=".csv" onChange={handleFileChange} className="hidden" />

        {onAddDeliveryClick && (
          <button onClick={onAddDeliveryClick} className="btn btn-secondary btn-sm flex items-center">
            <InboxArrowDownIcon className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Add Delivery</span>
          </button>
        )}

        <button onClick={onAddDriver} className="btn btn-secondary btn-sm flex items-center"><UserPlusIcon className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Add Driver</span></button>
        
        {routesGenerated ? (
          <button onClick={onFinalize} className="btn btn-success btn-sm flex items-center transition-all duration-300 ease-in-out">
            <CheckCircleIcon className="h-4 w-4 mr-1" /> Finalize
          </button>
        ) : (
          <button onClick={onGenerateRoutes} className="btn btn-primary btn-sm flex items-center transition-all duration-300 ease-in-out">
            <CogIcon className="h-4 w-4 mr-1" /> Generate Routes
          </button>
        )}

        <button onClick={onToggleDarkMode} className="ml-1 p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
          {darkMode ? <SunIcon className="h-5 w-5 text-yellow-400" /> : <MoonIcon className="h-5 w-5 text-slate-500" />}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <UserCircleIcon className="h-8 w-8 text-gray-500 dark:text-slate-400" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50">
              {user && (
                <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-200">Signed in as</p>
                  <p className="text-sm text-gray-600 dark:text-slate-400 truncate">{(user as any).attributes?.email}</p>
                </div>
              )}
              <div className="py-1">
                <button
                  onClick={onToggleDarkMode}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                >
                  <Cog6ToothIcon className="h-5 w-5 mr-3" />
                  <span>Toggle {darkMode ? 'Light' : 'Dark'} Mode</span>
                </button>
                <button
                  onClick={onDeleteAllDeliveries}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                >
                  <TrashIcon className="h-5 w-5 mr-3" />
                  <span>Delete All Deliveries</span>
                </button>
                <button
                  onClick={onDeleteAllDrivers}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center"
                >
                  <TrashIcon className="h-5 w-5 mr-3" />
                  <span>Delete All Drivers</span>
                </button>
              </div>
              <div className="py-1 border-t border-gray-200 dark:border-slate-700">
                <button
                  onClick={signOut}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar; 
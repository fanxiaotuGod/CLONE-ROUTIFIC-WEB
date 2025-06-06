import React from 'react';
import { Driver } from '../hooks/useRoutes';
import { UserCircleIcon, TrashIcon } from '@heroicons/react/24/solid';

interface DriversPageProps {
  drivers: Driver[];
  onDeleteDriver: (driverId: string, driverName: string) => void;
}

const DriversPage: React.FC<DriversPageProps> = ({ drivers, onDeleteDriver }) => {
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100 mb-2">Drivers</h1>
        <p className="text-gray-500 dark:text-slate-400 mb-8">
          Manage all the drivers in your fleet. You can add new drivers from the top bar.
        </p>
        
        <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-gray-200 dark:border-slate-700">
          <ul className="divide-y divide-gray-200 dark:divide-slate-700">
            {drivers.map(driver => (
              <li key={driver.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <div className="flex items-center">
                  <UserCircleIcon className="h-10 w-10 text-gray-400 dark:text-slate-500 mr-4" />
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-slate-100">{driver.name}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-400">{driver.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onDeleteDriver(driver.id, driver.name)}
                  className="p-2 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-colors"
                  title={`Delete ${driver.name}`}
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
          {drivers.length === 0 && (
            <div className="text-center p-12 text-gray-500 dark:text-slate-400">
              <p>No drivers found.</p>
              <p className="text-sm mt-1">Click "Add Driver" in the top bar to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriversPage; 
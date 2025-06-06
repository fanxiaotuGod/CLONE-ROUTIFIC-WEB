import React, { useState, useEffect } from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/solid';

interface Location {
  lat: number;
  lng: number;
  name: string;
}

interface SettingsPageProps {
  depotLocation: Location;
  setDepotLocation: (location: Location) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ depotLocation, setDepotLocation }) => {
  const [name, setName] = useState(depotLocation.name);
  const [lat, setLat] = useState(depotLocation.lat.toString());
  const [lng, setLng] = useState(depotLocation.lng.toString());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setName(depotLocation.name);
    setLat(depotLocation.lat.toString());
    setLng(depotLocation.lng.toString());
  }, [depotLocation]);

  const handleSave = () => {
    const newLat = parseFloat(lat);
    const newLng = parseFloat(lng);

    if (name && !isNaN(newLat) && !isNaN(newLng)) {
      setDepotLocation({ name, lat: newLat, lng: newLng });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000); // Hide message after 2s
    } else {
      // Basic validation feedback
      alert("Please enter a valid name, latitude, and longitude.");
    }
  };
  
  return (
    <div className="p-8 h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-slate-100 mb-2">Settings</h1>
        <p className="text-gray-500 dark:text-slate-400 mb-8">
          Configure application-wide settings.
        </p>
        
        <div className="bg-white dark:bg-slate-800 shadow-lg rounded-lg border border-gray-200 dark:border-slate-700 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Cog6ToothIcon className="h-6 w-6 mr-2 text-primary-500"/>
            Warehouse / Depot Location
          </h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="depot-name" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Depot Name</label>
              <input 
                type="text"
                id="depot-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="depot-lat" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Latitude</label>
                <input 
                  type="number"
                  id="depot-lat"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label htmlFor="depot-lng" className="block text-sm font-medium text-gray-700 dark:text-slate-300">Longitude</label>
                <input 
                  type="number"
                  id="depot-lng"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end pt-2">
              {isSaved && <p className="text-sm text-green-600 dark:text-green-400 mr-4 animate-fade-in">Settings saved!</p>}
              <button 
                onClick={handleSave}
                className="btn btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 
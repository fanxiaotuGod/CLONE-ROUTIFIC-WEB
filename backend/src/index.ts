import dotenv from 'dotenv';
dotenv.config(); // Loads variables from .env into process.env

import express, { Request, Response } from 'express';
import cors from 'cors';
import pool from './db'; // Import the database pool
import { Client, GeocodeResponse, GeocodeResult } from "@googlemaps/google-maps-services-js";
import { v4 as uuidv4 } from 'uuid'; // Import UUID

const app = express();
const port = process.env.PORT || 3001;

// Initialize Google Maps Client
// Ensure GOOGLE_MAPS_API_KEY is set in your environment variables
const googleMapsClient = new Client({});

app.use(cors());
app.use(express.json());

// Function to initialize database schema
const initializeDatabase = async () => {
  try {
    // Check if the deliveries table exists
    const deliveriesTableCheckRes = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deliveries');"
    );

    if (!deliveriesTableCheckRes.rows[0].exists) {
      console.log('Deliveries table not found, creating table...');
      await pool.query(`
        CREATE TABLE deliveries (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          address TEXT NOT NULL,
          email VARCHAR(255),
          lat DECIMAL(9,6),
          lng DECIMAL(9,6),
          status VARCHAR(50) DEFAULT 'Pending',
          eta VARCHAR(50),
          photo_url TEXT,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Deliveries table created successfully.');

      // Add some initial mock data if the table was just created
      const mockDeliveries = [
        {
          id: 'db-test-1',
          name: 'Database Test Downtown',
          address: '1000 Main St, Vancouver',
          email: 'db.test1@example.com',
          lat: 49.2800,
          lng: -123.1100,
          status: 'Pending',
          eta: '10:30 AM',
          notes: 'Loaded from DB'
        },
        {
          id: 'db-test-2',
          name: 'Database Test Kitsilano',
          address: '2000 W Broadway, Vancouver',
          email: 'db.test2@example.com',
          lat: 49.2635,
          lng: -123.1500,
          status: 'In Progress',
          eta: '11:45 AM'
        }
      ];

      for (const delivery of mockDeliveries) {
        await pool.query(
          'INSERT INTO deliveries (id, name, address, email, lat, lng, status, eta, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [delivery.id, delivery.name, delivery.address, delivery.email, delivery.lat, delivery.lng, delivery.status, delivery.eta, delivery.notes]
        );
      }
      console.log('Mock deliveries inserted into the database.');

    } else {
      console.log('Deliveries table already exists.');
    }

    // Check if the drivers table exists
    const driversTableCheckRes = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drivers');"
    );

    if (!driversTableCheckRes.rows[0].exists) {
      console.log('Drivers table not found, creating table...');
      await pool.query(`
        CREATE TABLE drivers (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          phone_number VARCHAR(50),
          cognito_sub VARCHAR(255) UNIQUE, -- For future Cognito integration, can be NULL
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('Drivers table created successfully.');

      // Optionally, add some mock drivers if the table was just created
      const mockDrivers = [
        { id: `drv-${Date.now()}-1`, name: 'Driver Alice', email: 'alice@example.com', phone_number: '555-0101' },
        { id: `drv-${Date.now()}-2`, name: 'Driver Brian', email: 'brian@example.com', phone_number: '555-0102' }
      ];
      for (const driver of mockDrivers) {
        await pool.query(
          'INSERT INTO drivers (id, name, email, phone_number) VALUES ($1, $2, $3, $4)',
          [driver.id, driver.name, driver.email, driver.phone_number]
        );
      }
      console.log('Mock drivers inserted.');
    } else {
      console.log('Drivers table already exists.');
    }

  } catch (err) {
    console.error('Error initializing database:', err);
    // process.exit(1); // Optionally exit if DB init fails
  }
};


app.get('/', (req: Request, res: Response) => {
  res.send('Backend server is running!');
});

// API endpoint to get all deliveries
app.get('/api/deliveries', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM deliveries ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching deliveries:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to create a new delivery
app.post('/api/deliveries', async (req: Request, res: Response) => {
  const { name, address, email, lat, lng, status, eta, photo_url, notes } = req.body;

  // Basic validation
  if (!name || !address) {
    return res.status(400).json({ error: 'Name and address are required' });
  }
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  const newDeliveryId = `db-d${Date.now()}`;
  // Ensure lat/lng are stored as numbers if your DB schema expects DECIMAL/NUMERIC
  // The 'pg' library should handle JavaScript numbers correctly for DECIMAL columns.
  const numericLat = parseFloat(lat);
  const numericLng = parseFloat(lng);

  if (isNaN(numericLat) || isNaN(numericLng)) {
    return res.status(400).json({ error: 'Invalid latitude or longitude values' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO deliveries (id, name, address, email, lat, lng, status, eta, photo_url, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [newDeliveryId, name, address, email, numericLat, numericLng, status || 'Pending', eta, photo_url, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating delivery:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to get all drivers
app.get('/api/drivers', async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT id, name, email, phone_number, cognito_sub, created_at, updated_at FROM drivers ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching drivers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to create a new driver
app.post('/api/drivers', async (req: Request, res: Response) => {
  const { name, email, phone_number, cognito_sub } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required for a driver.' });
  }

  // Basic email format validation (can be more sophisticated)
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format.' });
  }

  const newDriverId = `drv-${Date.now()}`;

  try {
    const result = await pool.query(
      'INSERT INTO drivers (id, name, email, phone_number, cognito_sub) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, phone_number, cognito_sub, created_at, updated_at',
      [newDriverId, name, email, phone_number, cognito_sub]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) { // Explicitly type err
    if (err.code === '23505') { // Unique violation (e.g., email or cognito_sub already exists)
        if (err.constraint === 'drivers_email_key') {
            return res.status(409).json({ error: 'Driver with this email already exists.' });
        }
        if (err.constraint === 'drivers_cognito_sub_key') {
            return res.status(409).json({ error: 'Driver with this Cognito SUB already exists.' });
        }
        return res.status(409).json({ error: 'A unique constraint was violated.' });
    }
    console.error('Error creating driver:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to delete a single delivery by ID
app.delete('/api/deliveries/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const deleteOp = await pool.query('DELETE FROM deliveries WHERE id = $1 RETURNING id', [id]);
    if (deleteOp.rowCount === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.status(200).json({ message: 'Delivery deleted successfully', id });
  } catch (err) {
    console.error(`Error deleting delivery ${id}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to delete all deliveries
app.delete('/api/deliveries', async (req: Request, res: Response) => {
  try {
    await pool.query('DELETE FROM deliveries');
    res.status(200).json({ message: 'All deliveries deleted successfully' });
  } catch (err) {
    console.error('Error deleting all deliveries:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to delete a single driver by ID
app.delete('/api/drivers/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // Before deleting a driver, you might want to handle their assigned deliveries.
    // For now, we'll just delete the driver.
    // TODO: Decide on a strategy: unassign deliveries, delete deliveries, or prevent deletion if deliveries are assigned.
    const deleteOp = await pool.query('DELETE FROM drivers WHERE id = $1 RETURNING id', [id]);
    if (deleteOp.rowCount === 0) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.status(200).json({ message: 'Driver deleted successfully', id });
  } catch (err) {
    console.error(`Error deleting driver ${id}:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to delete all drivers
app.delete('/api/drivers', async (req: Request, res: Response) => {
  try {
    // Similar to deleting a single driver, consider handling deliveries assigned to any driver.
    // TODO: Decide on strategy for deliveries when all drivers are deleted.
    await pool.query('DELETE FROM drivers');
    res.status(200).json({ message: 'All drivers deleted successfully' });
  } catch (err) {
    console.error('Error deleting all drivers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API endpoint to create a new delivery WITH geocoding
app.post('/api/deliveries/with-geocode', async (req: Request, res: Response) => {
  const { name, address, email } = req.body; // Expecting only these fields

  if (!name || !address) {
    return res.status(400).json({ message: 'Name and address are required' });
  }
  if (!email) { // Email is also essential
    return res.status(400).json({ message: 'Email is required' });
  }
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.error("GOOGLE_MAPS_API_KEY is not set. Geocoding will fail.");
    return res.status(500).json({ message: 'Server configuration error: Missing API key for geocoding.' });
  }

  let lat: number | undefined;
  let lng: number | undefined;

  try {
    const geocodeResult: GeocodeResponse = await googleMapsClient.geocode({
      params: {
        address: address,
        key: process.env.GOOGLE_MAPS_API_KEY!, // API key
      },
      timeout: 5000, // milliseconds
    });

    if (geocodeResult.data.status === 'OK' && geocodeResult.data.results.length > 0) {
      const location = geocodeResult.data.results[0].geometry.location;
      lat = location.lat;
      lng = location.lng;
    } else {
      console.warn('Geocoding failed or returned no results for address:', address, 'Status:', geocodeResult.data.status, 'Error Message:', geocodeResult.data.error_message);
      return res.status(400).json({ message: `Could not geocode address. Status: ${geocodeResult.data.status}${geocodeResult.data.error_message ? ' - ' + geocodeResult.data.error_message : ''}` });
    }
  } catch (error: any) {
    console.error('Error during geocoding request:', error);
    return res.status(500).json({ message: 'Error connecting to geocoding service.', details: error.message });
  }

  if (lat === undefined || lng === undefined) {
    // This case should be caught by the geocoding result check, but as a safeguard:
    return res.status(400).json({ message: 'Failed to obtain coordinates for the address.' });
  }

  const newDeliveryId = uuidv4(); // Use UUID for ID generation
  const status = 'Pending'; // Default status

  try {
    const dbResult = await pool.query(
      'INSERT INTO deliveries (id, name, address, email, lat, lng, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [newDeliveryId, name, address, email, lat, lng, status]
    );
    res.status(201).json(dbResult.rows[0]);
  } catch (dbErr) {
    console.error('Error creating delivery in DB after geocoding:', dbErr);
    res.status(500).json({ message: 'Database error after geocoding.' });
  }
});

interface BulkDeliveryItem {
  name: string;
  address: string;
  email: string;
  tempId?: string; // Optional temporary ID from frontend for mapping results
}

// API endpoint for bulk creating deliveries WITH geocoding
app.post('/api/deliveries/bulk-geocode-and-create', async (req: Request, res: Response) => {
  const itemsToProcess = req.body as BulkDeliveryItem[];

  if (!Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
    return res.status(400).json({ message: 'Request body must be a non-empty array of delivery items.' });
  }
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.error("GOOGLE_MAPS_API_KEY is not set. Geocoding will fail.");
    return res.status(500).json({ message: 'Server configuration error: Missing API key for geocoding.' });
  }

  const results = {
    success: [] as any[], // Will hold successfully created delivery objects from DB
    errors: [] as { item: BulkDeliveryItem, error: string }[],
  };

  for (const item of itemsToProcess) {
    if (!item.name || !item.address || !item.email) {
      results.errors.push({ item, error: 'Missing name, address, or email.' });
      continue;
    }

    let lat: number | undefined;
    let lng: number | undefined;

    try {
      // Simple delay to avoid hitting API limits too quickly in a loop for basic demo.
      // For production, consider a proper queue, batching, or more sophisticated rate limiting.
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay between geocoding requests

      const geocodeResult = await googleMapsClient.geocode({
        params: { address: item.address, key: process.env.GOOGLE_MAPS_API_KEY! },
        timeout: 5000,
      });

      if (geocodeResult.data.status === 'OK' && geocodeResult.data.results.length > 0) {
        const location = geocodeResult.data.results[0].geometry.location;
        lat = location.lat;
        lng = location.lng;
      } else {
        results.errors.push({ item, error: `Geocoding failed: ${geocodeResult.data.status} ${geocodeResult.data.error_message || ''}`.trim() });
        continue;
      }
    } catch (error: any) {
      results.errors.push({ item, error: `Geocoding service error: ${error.message}` });
      continue;
    }

    if (lat === undefined || lng === undefined) {
        results.errors.push({ item, error: 'Failed to obtain coordinates for the address after attempting geocoding.' });
        continue;
    }

    const newDeliveryId = uuidv4(); // Use UUID for ID generation
    const status = 'Pending';

    try {
      const dbResult = await pool.query(
        'INSERT INTO deliveries (id, name, address, email, lat, lng, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [newDeliveryId, item.name, item.address, item.email, lat, lng, status]
      );
      results.success.push(dbResult.rows[0]);
    } catch (dbErr: any) {
      // Check for unique constraint violation specifically if needed, otherwise generic DB error
      if (dbErr.code === '23505') { // 23505 is unique_violation for PostgreSQL
        results.errors.push({ item, error: `Database error: ID ${newDeliveryId} likely already exists (unique constraint violation). This shouldn't happen with UUIDs unless very unlucky or item reprocessed.` });
      } else {
        results.errors.push({ item, error: `Database error: ${dbErr.message}` });
      }
    }
  }

  if (results.success.length === 0 && results.errors.length > 0 && itemsToProcess.length === results.errors.length) {
    // All items failed
    return res.status(400).json({ message: 'All items failed to process.', ...results });
  }

  // Partial success or full success
  res.status(results.errors.length > 0 ? 207 : 201).json(results); // 207 Multi-Status if there are errors
});

// TODO: Add more routes (PUT for deliveries, routes for drivers etc.)

app.listen(port, async () => { // Make the listen callback async
  console.log(`Backend server listening at http://localhost:${port}`);
  await initializeDatabase(); // Initialize DB when server starts
}); 
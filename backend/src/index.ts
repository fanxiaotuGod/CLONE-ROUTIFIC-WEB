import express, { Request, Response } from 'express';
import cors from 'cors';
import pool from './db'; // Import the database pool

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Function to initialize database schema
const initializeDatabase = async () => {
  try {
    // Check if the deliveries table exists
    const tableCheckRes = await pool.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deliveries');"
    );

    if (!tableCheckRes.rows[0].exists) {
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
          notes TEXT
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

// TODO: Add more routes (PUT, DELETE for deliveries, routes for drivers etc.)

app.listen(port, async () => { // Make the listen callback async
  console.log(`Backend server listening at http://localhost:${port}`);
  await initializeDatabase(); // Initialize DB when server starts
}); 
// IMPORTANT: The API key should be stored in an environment variable, not hardcoded.
// Create a .env.local file in the /web directory and add:
// VITE_ROUTIFIC_API_KEY="YOUR_ACTUAL_API_KEY"
const API_KEY = import.meta.env.VITE_ROUTIFIC_API_KEY;
const API_URL = 'https://api.routific.com/v1/vrp';
const LONG_API_URL = 'https://api.routific.com/v1/vrp-long';
const RESULT_URL_PREFIX = 'https://api.routific.com/v1/jobs/';


// Define types for the API input and output for better type-safety.
interface Location {
  name?: string;
  lat: number;
  lng: number;
}

export interface Visit {
  location: Location;
  duration?: number;
  start?: string;
  end?: string;
  load?: number;
}

export interface Vehicle {
  start_location: Location;
  end_location?: Location;
  shift_start?: string;
  shift_end?: string;
  capacity?: number;
}

export interface RoutificInput {
  visits: Record<string, Visit>;
  fleet: Record<string, Vehicle>;
  options?: {
    traffic: 'fast' | 'normal' | 'slow';
  };
}

export interface Stop {
  location_id: string;
  location_name: string;
  arrival_time: string;
  finish_time: string;
  distance?: number;
  travel_time?: number;
  idle_time?: number;
  load?: number[];
}

export interface RoutificSolution {
  status: 'success' | 'error';
  total_travel_time: number;
  total_working_time: number;
  solution: {
    [driverId: string]: Stop[];
  };
}

interface RoutificJobResponse {
  status: 'pending' | 'processing' | 'finished' | 'error';
  job_id?: string;
  output?: RoutificSolution;
  error?: string;
}

// Function to poll for the result of a long-running job
const pollForResult = async (jobId: string): Promise<RoutificSolution> => {
  const url = `${RESULT_URL_PREFIX}${jobId}`;
  
  while (true) {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${API_KEY}` }
    });

    if (!response.ok) {
      throw new Error(`Polling failed with status ${response.status}`);
    }
    
    const data: RoutificJobResponse = await response.json();

    if (data.status === 'finished') {
      if (!data.output) {
        throw new Error('Job finished but no output was provided.');
      }
      return data.output;
    } else if (data.status === 'error') {
      throw new Error(data.error || 'An unknown error occurred while polling for results.');
    }
    
    // Wait for 2 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
};

export const getOptimizedRoutes = async (input: RoutificInput): Promise<RoutificSolution> => {
  if (!API_KEY || API_KEY.includes('YOUR_ACTUAL_API_KEY')) {
    throw new Error('Routific API Key is missing. Please set VITE_ROUTIFIC_API_KEY in your web/.env.local file.');
  }

  const visitCount = Object.keys(input.visits).length;
  const useLongRunning = visitCount > 60;
  const apiUrl = useLongRunning ? LONG_API_URL : API_URL;

  console.log(`Processing ${visitCount} visits using ${useLongRunning ? 'long-running' : 'immediate'} endpoint...`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Routific API error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const apiResponse = await response.json();

    // The immediate endpoint returns the solution directly.
    if (!useLongRunning) {
      return apiResponse as RoutificSolution;
    }

    // The long-running endpoint returns a job_id to poll.
    if (apiResponse.job_id) {
      console.log(`Job created with ID: ${apiResponse.job_id}. Polling for results...`);
      return await pollForResult(apiResponse.job_id);
    }
    
    throw new Error('Unexpected API response format.');

  } catch (error) {
    console.error("Failed to get optimized routes from Routific:", error);
    throw error;
  }
}; 
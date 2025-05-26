# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app/backend

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install project dependencies
# This is done as a separate step to leverage Docker cache
RUN npm install

# Copy the rest of the application code to the working directory
COPY . .

# Transpile TypeScript to JavaScript
RUN npm run build

# Expose the port the app runs on
EXPOSE 3001

# Define the command to run the application
# This will be overridden by docker-compose command for development
CMD ["npm", "start"] 
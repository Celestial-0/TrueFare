# Use an official Node.js runtime as a parent image
FROM node:24

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on 8000
EXPOSE 8000

# Define the command to run the application
CMD ["npm", "start"]

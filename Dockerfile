# Use Node.js official image as the base image
FROM node:18-slim

# Set working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Create a directory for static files
RUN mkdir -p public
RUN mkdir -p views

# Expose the port the app runs on
ENV PORT=3000
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
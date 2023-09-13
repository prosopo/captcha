# Use the Node.js 14 image
FROM node:14

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy the compiled code
COPY ./dist ./dist

# Copy the images (assuming they are in the same directory as your Dockerfile)
COPY /home/hugh/data/v2_demo_dset/images /app/images

# Expose port 3000
EXPOSE 3000

# Command to run the application
CMD [ "node", "./dist/index.js" ]

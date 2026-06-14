// config/db.js
// Responsible for establishing a MongoDB connection using mongoose.
// If MONGO_URI is not present in the environment, this function will
// log a warning and skip trying to connect — this allows the server
// to start in development without a configured database.

import mongoose from 'mongoose';



export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    
    if (!uri) {
      console.warn('MONGO_URI not set in environment — continuing without MongoDB');
      return Promise.resolve();
    }

    const conn = await mongoose.connect(uri);

    // Monitor connection states
    mongoose.connection.on('connected', () => {
      console.log('MongoDB connection established');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB connection disconnected');
    });

    console.log(`MongoDB Connected to: ${conn.connection.host}`);
    console.log(`Current connection state: ${mongoose.connection.readyState}`);
    return conn;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error.message);
    throw error; // Let the server handle the error
  }
};
// 1 = connected, 0 = disconnected

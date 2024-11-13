// Import required libraries
const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const WebSocket = require('ws');


// Create a MySQL connection pool
const pool = mysql.createPool({
  host: '3.111.189.192', // Your Database Host endpoint
  user: 'stickynote',      // Your Database username
  password: 'Qwerty#2024',     // Your Database password
  database: 'sticky_notes', // Your database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(bodyParser.json());


// Test MySQL database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Connected to the MySQL database');
  connection.release(); // Release the connection back to the pool
});

// WebSocket server configuration
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0'; // IP address to bind to

// Create the WebSocket server
const wss = new WebSocket.Server({ port: PORT, host: HOST });

// Handle new client connections
wss.on('connection', (ws) => {
  console.log('Client connected');

  // Listen for messages from the client
  ws.on('message', (message) => {
    console.log('Received:', message);

    // Attempt to parse message as JSON (assuming it's sent in JSON format)
    let data;
    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error('Invalid JSON format:', err);
      ws.send(JSON.stringify({ status: 'error', message: 'Invalid JSON format' }));
      return;
    }

    // Insert received data into MySQL (assuming 'notes' is the table and 'content' is a column)
    const query = 'INSERT INTO notes (content) VALUES (?)';
    pool.query(query, [data.content], (err, results) => {
      if (err) {
        console.error('Error saving note:', err);
        ws.send(JSON.stringify({ status: 'error', message: 'Failed to save note' }));
      } else {
        console.log('Note saved to database');
        ws.send(JSON.stringify({ status: 'success', message: 'Note saved successfully' }));
      }
    });

    // Broadcast the message to all connected clients
    broadcast(message);
  });

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Broadcast function to send a message to all connected clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Error handling for WebSocket server
wss.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Graceful shutdown on process termination
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

console.log(`WebSocket server is running on ws://${HOST}:${PORT}`);
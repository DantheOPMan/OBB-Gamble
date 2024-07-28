// backend/server.js
const express = require('express'); // Ensure to require express here
const { app, server } = require('./app');
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'build', 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});

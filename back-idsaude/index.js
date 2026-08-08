const express = require('express');
const app = express();
const PORT = 3000;

// Middleware to parse incoming JSON bodies
app.use(express.json());

// Basic GET route
app.get('/', (req, res) => {
  res.json({ message: "Hello from your Node.js backend!" });
});

// Start listening for requests
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

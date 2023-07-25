const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');


// Connection string to MongoDB
const connectionString = 'mongodb+srv://back1:bEL1SnG5VbLEJWOm@media-test.bdyppol.mongodb.net';


// Connect to MongoDB
mongoose.connect(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.log("MongoDB connection error: ", err));

//Create stream schema and model
const streamSchema = new mongoose.Schema({
  id: String,
  live_stream_url: String,
  username: String,
  password: String
});

const Stream = mongoose.model('Stream', streamSchema);

const app = express();
app.use(express.json());

// Allow cross-origin requests
app.use(cors());

const mockUser = {
  id: "beach1",
  live_stream_url: "https://server1.media.sightbit.app:8889",
  username: "user1",
  password: "9iKscFQzEwiE49hdEtrR49tg"
};

function mockJWT(req, res, next) {
 const token = req.cookies.token;  //takes the token from the cookies in the request
 const user = jwt.verify(token, process.env.MY_SECRET) // varifiying if the token match the secret
  req.user = mockUser; 
  next(); // Proceed to the next middleware or request handler
}

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true'); // Add this line for handling cookies and SSL certificates
  next();
});

app.get('/stream/:id', mockJWT, async (req, res) => {
  try {
    const stream = await Stream.findOne({ id: req.params.id });
    if (!stream) return res.status(404).send('No stream found with the provided ID.');

    // Send the stream data along with the authentication message and user data
console.log(stream);
    res.json({
      message: 'You are authenticated!',

      //same values just for showing the mock authentication 
      user: req.user,
      stream: stream
    });
    console.log('You are authenticated!')

  } catch (err) {
    console.log(err);
    res.status(500).send('Server error');
  }

});

//posting a mock stream data
app.post('/stream', async (req, res) => {
  try {
    const { id } = req.body;

    // Check if a stream with the given ID already exists
    const existingStream = await Stream.findOne({ id });
    if (existingStream) return res.status(400).send('Stream with the provided ID already exists.');
    
    // Create a new stream
    const newStream = new Stream({
      id: mockUser.id,
      live_stream_url: mockUser.live_stream_url,
      username: mockUser.username,
      password: mockUser.password
    });

    // Save the new stream
    const savedStream = await newStream.save();

    // Send the saved stream back as the response
    res.send(savedStream);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// WebSocket endpoint using socket.io
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Access-Control-Allow-Origin'],
    credentials: true,
  },
});

let savedData = null;

//recieve post data from different services
app.post('/event1', (req, res) => {
  const eventData = req.body;
  savedData = eventData;
  console.log("Saved data: ", savedData);
  res.status(200).send();

});

io.on('connection', (socket) => {
  console.log('New client connected');
  // Send the saved data whenever a new client connects
  if (savedData) {
    socket.emit('message-services', savedData);
  }
});

const port = process.env.PORT || 5000;
server.listen(port, () => console.log(`Server is running on port ${port}`));

module.exports = { app, server };
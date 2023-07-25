const request = require('supertest');
const { app, server } = require('./server');
const mongoose = require('mongoose');


// Function to generate a random string
// Used for creating unique stream IDs in tests
function generateRandomString(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

describe('Test stream path', () => {
    
    // Test case for POST method
    test('It should response the POST method', async () => {
        const response = await request(app)
            .post('/stream')
            .send({
                id : generateRandomString(10), // Generate a unique ID for each test case
                live_stream_url : "https://server1.media.sightbit.app:8889",
                username : "user1",
                password : "9iKscFQzEwiE49hdEtrR49tg"
            });
        expect(response.statusCode).toBe(200);
    });

    // Test case for GET method
    test('It should response the GET method', async () => {
        const response = await request(app).get('/stream/beach1');
        expect(response.statusCode).toBe(200);
    });
});

// Closing the mongoose connection and server after all tests are run
afterAll(async () => {
    await new Promise(resolve => setTimeout(() => resolve(), 500)); // avoid jest open handle error
    await mongoose.connection.close();
    server.close();
  });
  
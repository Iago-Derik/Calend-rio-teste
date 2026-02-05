const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.static(__dirname)); // Serve static files

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const DB_FILE = path.join(__dirname, 'db.json');

// Initial Data
let data = {
    people: [],
    tasks: [],
    assignments: {} // { 'YYYY-MM-DD': [ ... ] }
};

// Load Data
if (fs.existsSync(DB_FILE)) {
    try {
        data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        console.error("Error reading DB:", e);
    }
}

function saveData() {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send initial data
    socket.emit('init', data);

    socket.on('updateData', (newData) => {
        // Merge or replace? Let's assume full state replacement for simplicity or granular updates.
        // For this app size, full state sync or key-based sync is fine.
        // Let's expect newData to have keys like { type: 'people', value: [...] } or { full: data }

        if (newData.full) {
            data = newData.full;
        } else {
            if (newData.people) data.people = newData.people;
            if (newData.tasks) data.tasks = newData.tasks;
            if (newData.assignments) data.assignments = newData.assignments;
        }

        saveData();
        // Broadcast to all OTHER clients
        socket.broadcast.emit('dataUpdated', data);
        // Also emit back to sender? Usually sender updates optimistic, but let's confirm.
        // Or just emit to everyone:
        // io.emit('dataUpdated', data);
    });

    // Granular Events (Better for conflict avoidance?)
    // Let's stick to "Sync All" for now as requested "todos vejam as mesmas informações".

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.static(__dirname));

let data = {
    people: [],
    tasks: [],
    assignments: {}
};

// Load data
if (fs.existsSync(DATA_FILE)) {
    try {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
        if (fileContent.trim()) {
            data = JSON.parse(fileContent);
        }
    } catch (e) {
        console.error("Error reading data.json", e);
    }
}

function saveData() {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Error saving data:", e);
    }
}

io.on('connection', (socket) => {
    console.log('A user connected');

    // Send initial data
    socket.emit('initialData', data);

    socket.on('updateData', (newData) => {
        console.log('Data update received');
        data = newData;
        saveData();
        // Broadcast to everyone else
        socket.broadcast.emit('dataUpdated', data);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

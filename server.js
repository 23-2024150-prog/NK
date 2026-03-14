const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let gameState = {
    players: {},
    rules: { hp: 2000, mpRegen: 0.22 }
};

io.on('connection', (socket) => {
    const pIds = Object.keys(gameState.players);

    if (pIds.length < 2) {
        const isHost = pIds.length === 0;
        const role = isHost ? 1 : 2;
        gameState.players[socket.id] = { role, isHost };

        socket.emit('init_role', { role, isHost, rules: gameState.rules });

        if (Object.keys(gameState.players).length === 2) {
            io.emit('player_joined', { count: 2 });
        }

        socket.on('update_rules', (newRules) => {
            if (gameState.players[socket.id]?.isHost) {
                gameState.rules = newRules;
                socket.broadcast.emit('rules_updated', newRules);
            }
        });

        socket.on('request_start', () => {
            if (gameState.players[socket.id]?.isHost) io.emit('game_start');
        });

        socket.on('spawn', (data) => socket.broadcast.emit('spawn', data));
    }

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        if (Object.keys(gameState.players).length === 0) {
            gameState.rules = { hp: 2000, mpRegen: 0.22 };
        }
        io.emit('player_left');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

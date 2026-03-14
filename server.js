const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

let gameState = {
    players: {}, // id: {role, ready}
    rules: { hp: 2000, mpRegen: 0.22 }, // ホストが変更可能なルール
    status: 'waiting' // waiting, setup, playing
};

io.on('connection', (socket) => {
    const playerIds = Object.keys(gameState.players);

    if (playerIds.length < 2) {
        const isHost = playerIds.length === 0;
        gameState.players[socket.id] = { 
            id: socket.id, 
            role: isHost ? 1 : 2, 
            isHost: isHost 
        };

        socket.emit('init_role', { 
            role: gameState.players[socket.id].role, 
            isHost: isHost,
            rules: gameState.rules 
        });

        // ホストがルールを変更したとき
        socket.on('update_rules', (newRules) => {
            if (gameState.players[socket.id].isHost) {
                gameState.rules = newRules;
                socket.broadcast.emit('rules_updated', newRules);
            }
        });

        // ユニット投入同期
        socket.on('spawn', (data) => socket.broadcast.emit('spawn', data));

        // ゲーム開始合図 (ホストのみ可能)
        socket.on('request_start', () => {
            if (gameState.players[socket.id].isHost && Object.keys(gameState.players).length === 2) {
                io.emit('game_start');
            }
        });
    } else {
        socket.emit('message', '満員です');
        socket.disconnect();
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

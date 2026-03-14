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
    rules: { hp: 2000, mpRegen: 0.22 },
    currentHP: { 1: 2000, 2: 2000 },
    isGameOver: false
};

io.on('connection', (socket) => {
    const pIds = Object.keys(gameState.players);
    if (pIds.length < 2) {
        const role = pIds.length === 0 ? 1 : 2;
        gameState.players[socket.id] = { role, isHost: role === 1 };
        socket.emit('init_role', { role, isHost: role === 1, rules: gameState.rules });
        if (Object.keys(gameState.players).length === 2) io.emit('player_joined');

        socket.on('deck_sync', (data) => socket.broadcast.emit('deck_sync', data));
        socket.on('update_rules', (r) => { 
            gameState.rules = r; 
            gameState.currentHP = { 1: r.hp, 2: r.hp };
            socket.broadcast.emit('rules_updated', r); 
        });

        socket.on('request_start', () => {
            gameState.isGameOver = false;
            gameState.currentHP = { 1: gameState.rules.hp, 2: gameState.rules.hp };
            io.emit('game_start');
        });

        // ユニット出現（座標を割合 0~1 で転送）
        socket.on('spawn', (data) => socket.broadcast.emit('spawn', data));

        // ダメージ計算をサーバーで一括管理
        socket.on('base_damage', (data) => {
            if (gameState.isGameOver) return;
            gameState.currentHP[data.targetRole] -= data.damage;
            io.emit('hp_update', { hp1: gameState.currentHP[1], hp2: gameState.currentHP[2] });

            if (gameState.currentHP[data.targetRole] <= 0) {
                gameState.isGameOver = true;
                io.emit('game_over', { winner: data.targetRole === 1 ? 2 : 1 });
            }
        });
    }

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        if (Object.keys(gameState.players).length === 0) {
            gameState.rules = { hp: 2000, mpRegen: 0.22 };
            gameState.isGameOver = false;
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

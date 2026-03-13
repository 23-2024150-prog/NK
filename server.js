const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const rooms = {};

io.on('connection', (socket) => {
    // ルーム作成
    socket.on('createRoom', (config) => {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms[roomId] = { host: socket.id, config: config, players: [socket.id] };
        socket.join(roomId);
        socket.emit('roomCreated', { roomId, config });
    });

    // ルーム参加
    socket.on('joinRoom', (roomId) => {
        if (rooms[roomId] && rooms[roomId].players.length < 2) {
            rooms[roomId].players.push(socket.id);
            socket.join(roomId);
            io.to(roomId).emit('playerJoined', { roomId, config: rooms[roomId].config });
        } else {
            socket.emit('errorMsg', 'ルームが見つからないか、満員です。');
        }
    });

    // ユニット召喚の同期
    socket.on('spawnUnit', (data) => {
        socket.to(data.roomId).emit('enemySpawn', data);
    });

    // 準備完了同期
    socket.on('playerReady', (data) => {
        socket.to(data.roomId).emit('enemyReady', data.deck);
    });

    socket.on('disconnect', () => {
        // 切断処理（簡易版）
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

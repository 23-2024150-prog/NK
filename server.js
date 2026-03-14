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

        // 自分の役割を通知
        socket.emit('init_role', { role, isHost, rules: gameState.rules });

        // 2人揃ったことを全員に通知
        if (Object.keys(gameState.players).length === 2) {
            io.emit('player_joined');
        }

        // --- 追加: デッキ選択情報の同期 ---
        socket.on('deck_sync', (data) => {
            // 相手に「誰がどのデッキを選んだか」を転送する
            socket.broadcast.emit('deck_sync', data);
        });

        // ルール更新の同期
        socket.on('update_rules', (newRules) => {
            if (gameState.players[socket.id]?.isHost) {
                gameState.rules = newRules;
                socket.broadcast.emit('rules_updated', newRules);
            }
        });

        // ゲーム開始要求
        socket.on('request_start', () => {
            if (gameState.players[socket.id]?.isHost) {
                io.emit('game_start');
            }
        });

        // ユニット出現の同期
        socket.on('spawn', (data) => {
            socket.broadcast.emit('spawn', data);
        });
    }

    socket.on('disconnect', () => {
        delete gameState.players[socket.id];
        // 誰もいなくなったら設定をリセット
        if (Object.keys(gameState.players).length === 0) {
            gameState.rules = { hp: 2000, mpRegen: 0.22 };
        }
        io.emit('player_left');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

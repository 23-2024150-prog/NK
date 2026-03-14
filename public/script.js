const socket = io();
let myRole = null;
let isHost = false;

// 初期化
socket.on('init_role', (data) => {
    myRole = data.role;
    isHost = data.isHost;
    if (isHost) {
        document.getElementById('host-panel').style.display = 'block';
    }
    applyRules(data.rules);
});

// ホストが変えたルールをゲストに反映
socket.on('rules_updated', (rules) => {
    applyRules(rules);
});

function syncRules() {
    if (!isHost) return;
    const rules = {
        hp: parseInt(document.getElementById('rule-hp').value),
        mpRegen: parseFloat(document.getElementById('rule-mp').value)
    };
    socket.emit('update_rules', rules);
}

function applyRules(rules) {
    players[1].hp = players[2].hp = rules.hp;
    // mpRegenはloop関数内で使用
    window.currentMpRegen = rules.mpRegen;
}

// 2人揃った時のUI変更
socket.on('init', (data) => {
    document.getElementById('waiting-msg').style.display = 'none';
    if (isHost) {
        document.getElementById('start-btn').style.display = 'block';
    } else {
        document.getElementById('guest-msg').style.display = 'block';
    }
});

function requestStart() {
    if (p1Deck.length === 5 && p2Deck.length === 5) {
        socket.emit('request_start');
    } else {
        alert("お互いにデッキを5枚選んでください");
    }
}

socket.on('game_start', () => {
    startGame(); // 既存の開始関数
});

// 既存のUnit生成・クリック処理にsocket.emit('spawn', ...) を追加（前回の回答参照）

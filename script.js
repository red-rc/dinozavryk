// Отримання елементів DOM
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const screamerOverlay = document.getElementById('screamer-overlay');
const playAgainButton = document.getElementById('play-again-button');

// --- Ігрові Змінні ---
let score = 0;
let speedIncreaseCount = 0; // Лічильник для відображення % збільшення швидкості (кожний бал = +1%)
let isPlaying = true;
let animationFrameId;

// Параметри гравця (оновлені)
const playerImg = new Image();
playerImg.src = 'player.png';

const PLAYER_WIDTH = 150;
// Висота буде розрахована динамічно після завантаження зображення
let playerHeight = 150;
const PLAYER_JUMP_HEIGHT = 200; // Висота стрибка залишається 200px

const GROUND_HEIGHT = 100;

let player = {
    x: 50,
    y: 0, // Буде встановлено в initGame
    width: PLAYER_WIDTH,
    height: playerHeight,
    vy: 0,
    isJumping: false,
    gravity: 0.6, // Сила гравітації
};

// Параметри перешкоди (оновлені)
const TRIANGLE_SIZE = 67; // Нова більша основа трикутника
let baseSpeed = 8; 
let triangleSpeed = baseSpeed;
const SPEED_INCREASE_FACTOR = 0.05; // Зростання швидкості на 1%

// Динамічні змінні, що будуть розраховуватися при init
let PLAYER_GROUND_Y;
let TRIANGLE_BASE_Y;
let triangleHeight = Math.sqrt(3) / 2 * TRIANGLE_SIZE; // Цей рядок автоматично підхопить нове значення 67. // Висота рівностороннього трикутника

let obstacle = {
    x: 0, // Буде встановлено в initGame
    y: 0, // Буде встановлено в initGame (координата основи)
    size: TRIANGLE_SIZE,
    height: triangleHeight, 
    isVisible: true
};

// --- Функції Малювання ---

/**
 * Малює гравця (зображення).
 */
function drawPlayer() {
    if (playerImg.complete) {
        ctx.drawImage(playerImg, player.x, player.y, player.width, player.height);
    } else {
        ctx.fillStyle = 'blue';
        ctx.fillRect(player.x, player.y, player.width, player.height);
    }
}

/**
 * Малює сірий трикутник.
 */
function drawTriangle() {
    ctx.fillStyle = 'gray'; // Сірий колір
    ctx.beginPath();
    // Нижній лівий кут
    ctx.moveTo(obstacle.x, obstacle.y);
    // Верхній кут (вершина): y = TRIANGLE_BASE_Y - triangleHeight
    ctx.lineTo(obstacle.x + obstacle.size / 2, obstacle.y - obstacle.height);
    // Нижній правий кут
    ctx.lineTo(obstacle.x + obstacle.size, obstacle.y);
    ctx.closePath();
    ctx.fill();
}

/**
 * Малює рахунок та швидкість.
 */
function drawScore() {
    ctx.fillStyle = 'gray'; // Сірий колір
    ctx.font = '24px Arial';
    ctx.textAlign = 'right';
    
    // 1. Рахунок (Score)
    ctx.fillText('Score: ' + score, canvas.width - 20, 30); 

    // 2. Лічильник швидкості (Speed)
    // Кожний успішний стрибок збільшує швидкість на 1% від базової.
    ctx.fillText('Speed: +' + speedIncreaseCount + '%', canvas.width - 20, 60); 
}

/**
 * Малює землю (#f0f0f0) внизу.
 */
function drawGround() {
    ctx.fillStyle = '#f0f0f0';
    // Малюємо прямокутник від початку землі до нижнього краю canvas
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
}

// --- Ігрова Логіка ---

/**
 * Обробляє стрибок гравця.
 */
function jump() {
    if (!player.isJumping && isPlaying) {
        player.isJumping = true;
        // Розрахунок початкової швидкості для заданої висоти стрибка
        player.vy = -Math.sqrt(2 * player.gravity * PLAYER_JUMP_HEIGHT);
    }
}

/**
 * Оновлює позицію гравця.
 */
function updatePlayer() {
    if (player.isJumping) {
        player.y += player.vy;
        player.vy += player.gravity; // Гравітація тягне вниз

        // Перевірка, чи гравець приземлився
        if (player.y >= PLAYER_GROUND_Y) {
            player.y = PLAYER_GROUND_Y;
            player.isJumping = false;
            player.vy = 0;
        }
    }
}

/**
 * Оновлює позицію перешкоди та перевіряє перетин.
 */
function updateObstacle() {
    obstacle.x -= triangleSpeed;

    // Якщо перешкода виїхала за межі ліворуч
    if (obstacle.x + obstacle.size < 0) {
        // 1. Оновлення рахунку
        score++;
        // 2. Збільшення лічильника швидкості
        speedIncreaseCount+=5;
        // 3. Збільшення швидкості перешкоди (на 1% від поточної)
        triangleSpeed *= (1 + SPEED_INCREASE_FACTOR);
        // 4. Скидання перешкоди на початок
        resetObstacle();
    }
}

/**
 * Скидає перешкоду на початок (справа).
 */
function resetObstacle() {
    obstacle.x = canvas.width;
}

/**
 * Перевірка колізії (зіткнення).
 */
function checkCollision() {
    // 1. Bounding Box для гравця:
    const playerBox = {
        left: player.x,
        right: player.x + player.width,
        top: player.y,
        bottom: player.y + player.height
    };

    // 2. Bounding Box для трикутника:
    const obstacleBox = {
        left: obstacle.x,
        right: obstacle.x + obstacle.size,
        top: obstacle.y - obstacle.height, // Верхня точка трикутника
        bottom: obstacle.y // Основа трикутника
    };

    // Перевірка перетину (AABB)
    const isCollidingX = playerBox.right > obstacleBox.left && playerBox.left < obstacleBox.right;
    const isCollidingY = playerBox.bottom > obstacleBox.top && playerBox.top < obstacleBox.bottom;

    if (isCollidingX && isCollidingY) {
        endGame();
    }
}

/**
 * Завершує гру.
 */
function endGame() {
    isPlaying = false;
    cancelAnimationFrame(animationFrameId);
    screamerOverlay.style.display = 'flex'; // Показати скрімер
}

/**
 * Головний ігровий цикл.
 */
function gameLoop() {
    // 1. Очищення Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Оновлення позицій
    updatePlayer();
    updateObstacle();

    // 3. Перевірка колізій
    checkCollision();

    // 4. Малювання
    drawGround();
    drawPlayer();
    drawTriangle();
    drawScore();

    // 5. Запуск наступного кадру
    if (isPlaying) {
        animationFrameId = requestAnimationFrame(gameLoop);
    }
}

/**
 * Ініціалізація або перезапуск гри.
 */
/**
 * Ініціалізація або перезапуск гри.
 */
function initGame() {
    // 1. Встановлення розмірів Canvas на весь екран
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // РОЗРАХУНОК ПРОПОРЦІЙНОЇ ВИСОТИ ГРАВЦЯ
    if (playerImg.complete && playerImg.naturalWidth > 0) {
        const ratio = playerImg.naturalHeight / playerImg.naturalWidth;
        playerHeight = PLAYER_WIDTH * ratio; 
    }
    player.height = playerHeight; // Встановлення фактичної висоти

    // --- ЗМІНА КООРДИНАТ ---
    // Y-координата поверхні, на якій стоять елементи
    const PLAYING_SURFACE_Y = canvas.height - GROUND_HEIGHT;

    // Y для гравця (верхній край)
    PLAYER_GROUND_Y = PLAYING_SURFACE_Y - player.height; 
    
    // Y для основи трикутника (нижній край)
    TRIANGLE_BASE_Y = PLAYING_SURFACE_Y; 
    // --- КІНЕЦЬ ЗМІНИ КООРДИНАТ ---

    // 3. Скидання параметрів
    score = 0;
    speedIncreaseCount = 0;
    triangleSpeed = baseSpeed;
    isPlaying = true;

    // 4. Початкові позиції елементів
    player.y = PLAYER_GROUND_Y;
    player.isJumping = false;
    player.vy = 0;

    obstacle.y = TRIANGLE_BASE_Y; // Основа трикутника на лінії землі
    resetObstacle(); // Позиція X скидається на правий край
    
    // *** ДОДАНІ КРОКИ ***

    // 5. Приховати скрімер
    screamerOverlay.style.display = 'none';

    // 6. Початок гри
    gameLoop();
} // <--- Функція initGame повинна закриватися тут

// --- Обробники Подій ---

// Стрибок при натисканні пробілу
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        jump();
    }
});
// Стрибок при кліку на Canvas
canvas.addEventListener('click', jump);

// Перезапуск гри
playAgainButton.addEventListener('click', initGame);

// Обробник зміни розміру вікна для адаптивності
window.addEventListener('resize', () => {
    if (isPlaying) {
        // Перезапуск гри при зміні розміру для перерахунку всіх координат
        initGame();
    } else {
        // Якщо гра завершена, просто оновлюємо розмір canvas, щоб screamer був на весь екран
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});


// Запуск гри при завантаженні
window.onload = () => {
    // Запускаємо гру, коли зображення гравця завантажено
    playerImg.onload = initGame;
    if (playerImg.complete) {
        initGame();
    }
};
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from client build
app.use(express.static(path.join(__dirname, '../client/dist')));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let waitingPlayer = null;
const games = new Map();

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('findGame', () => {
    if (waitingPlayer && waitingPlayer.id !== socket.id) {
      const gameId = `${waitingPlayer.id}-${socket.id}`;
      const game = {
        player1: waitingPlayer.id,
        player2: socket.id,
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null
      };
      
      games.set(gameId, game);
      
      waitingPlayer.join(gameId);
      socket.join(gameId);
      
      io.to(waitingPlayer.id).emit('gameStart', { 
        gameId, 
        symbol: 'X', 
        opponent: socket.id 
      });
      io.to(socket.id).emit('gameStart', { 
        gameId, 
        symbol: 'O', 
        opponent: waitingPlayer.id 
      });
      
      waitingPlayer = null;
    } else {
      waitingPlayer = socket;
      socket.emit('waiting');
    }
  });

  socket.on('makeMove', ({ gameId, index, symbol }) => {
    const game = games.get(gameId);
    if (!game || game.board[index] || game.winner) return;

    game.board[index] = symbol;
    
    const winner = checkWinner(game.board);
    if (winner) {
      game.winner = winner;
      io.to(gameId).emit('gameOver', { winner, board: game.board });
    } else if (game.board.every(cell => cell !== null)) {
      io.to(gameId).emit('gameOver', { winner: 'draw', board: game.board });
    } else {
      game.currentPlayer = symbol === 'X' ? 'O' : 'X';
      io.to(gameId).emit('moveMade', { board: game.board, currentPlayer: game.currentPlayer });
    }
  });

  socket.on('playAgain', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game) return;
    
    game.board = Array(9).fill(null);
    game.currentPlayer = 'X';
    game.winner = null;
    
    io.to(gameId).emit('gameReset', { board: game.board, currentPlayer: game.currentPlayer });
  });

  socket.on('disconnect', () => {
    if (waitingPlayer?.id === socket.id) {
      waitingPlayer = null;
    }
    
    games.forEach((game, gameId) => {
      if (game.player1 === socket.id || game.player2 === socket.id) {
        io.to(gameId).emit('opponentLeft');
        games.delete(gameId);
      }
    });
  });
});

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  
  for (let [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
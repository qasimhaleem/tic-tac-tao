import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState('menu');
  const [gameId, setGameId] = useState(null);
  const [symbol, setSymbol] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState('X');
  const [winner, setWinner] = useState(null);
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('waiting', () => {
      setGameState('waiting');
    });

    newSocket.on('gameStart', ({ gameId, symbol }) => {
      setGameId(gameId);
      setSymbol(symbol);
      setGameState('playing');
      setBoard(Array(9).fill(null));
      setCurrentPlayer('X');
      setWinner(null);
      setIsMyTurn(symbol === 'X');
    });

    newSocket.on('moveMade', ({ board, currentPlayer }) => {
      setBoard(board);
      setCurrentPlayer(currentPlayer);
      setIsMyTurn(currentPlayer === symbol);
    });

    newSocket.on('gameOver', ({ winner, board }) => {
      setBoard(board);
      setWinner(winner);
      setGameState('gameOver');
    });

    newSocket.on('gameReset', ({ board, currentPlayer }) => {
      setBoard(board);
      setCurrentPlayer(currentPlayer);
      setWinner(null);
      setGameState('playing');
      setIsMyTurn(symbol === 'X');
    });

    newSocket.on('opponentLeft', () => {
      alert('Opponent left the game!');
      setGameState('menu');
      setGameId(null);
      setSymbol(null);
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    setIsMyTurn(currentPlayer === symbol && gameState === 'playing');
  }, [currentPlayer, symbol, gameState]);

  const findGame = () => {
    socket?.emit('findGame');
  };

  const makeMove = (index) => {
    if (!isMyTurn || board[index] || winner) return;
    socket?.emit('makeMove', { gameId, index, symbol });
  };

  const playAgain = () => {
    socket?.emit('playAgain', { gameId });
  };

  const goToMenu = () => {
    setGameState('menu');
    setGameId(null);
    setSymbol(null);
    setBoard(Array(9).fill(null));
    setWinner(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 max-w-lg w-full">
        {gameState === 'menu' && (
          <div className="text-center space-y-6">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Tic-Tac-Toe
            </h1>
            <p className="text-gray-600 text-lg">Multiplayer Edition</p>
            <button
              onClick={findGame}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-bold text-xl hover:shadow-lg hover:scale-105 transition-all duration-200"
            >
              🎮 Find Game
            </button>
          </div>
        )}

        {gameState === 'waiting' && (
          <div className="text-center space-y-6">
            <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-purple-600 mx-auto"></div>
            <h2 className="text-2xl font-bold text-gray-800">Finding Opponent...</h2>
            <p className="text-gray-600">Please wait while we match you with a player</p>
          </div>
        )}

        {(gameState === 'playing' || gameState === 'gameOver') && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">You are</p>
                <p className="text-2xl font-bold text-purple-600">{symbol}</p>
              </div>
              <div className="text-center">
                {gameState === 'playing' && (
                  <div>
                    <p className="text-sm text-gray-600">Current Turn</p>
                    <p className="text-2xl font-bold text-pink-600">{currentPlayer}</p>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`text-lg font-bold ${isMyTurn ? 'text-green-600' : 'text-orange-600'}`}>
                  {isMyTurn ? '✓ Your Turn' : '⏳ Wait...'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 aspect-square">
              {board.map((cell, index) => (
                <button
                  key={index}
                  onClick={() => makeMove(index)}
                  disabled={!isMyTurn || cell !== null || gameState === 'gameOver'}
                  className={`
                    aspect-square rounded-2xl text-5xl font-bold transition-all duration-200
                    ${cell === 'X' ? 'bg-purple-100 text-purple-600' : ''}
                    ${cell === 'O' ? 'bg-pink-100 text-pink-600' : ''}
                    ${!cell ? 'bg-gray-100 hover:bg-gray-200 hover:scale-105' : ''}
                    ${isMyTurn && !cell && gameState === 'playing' ? 'cursor-pointer hover:shadow-lg' : 'cursor-not-allowed'}
                    disabled:opacity-50
                  `}
                >
                  {cell}
                </button>
              ))}
            </div>

            {gameState === 'gameOver' && (
              <div className="text-center space-y-4 bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-2xl">
                <h2 className="text-3xl font-bold">
                  {winner === 'draw' ? (
                    <span className="text-gray-700">🤝 It's a Draw!</span>
                  ) : winner === symbol ? (
                    <span className="text-green-600">🎉 You Won!</span>
                  ) : (
                    <span className="text-red-600">😢 You Lost!</span>
                  )}
                </h2>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={playAgain}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-200"
                  >
                    🔄 Play Again
                  </button>
                  <button
                    onClick={goToMenu}
                    className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all duration-200"
                  >
                    🏠 Menu
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Socket.IO • React • Node.js</p>
        </div>
      </div>
    </div>
  );
}
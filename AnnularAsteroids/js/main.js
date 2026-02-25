import { Game } from './game.js';
import { InputHandler } from './inputHandler.js';
import { GameLoop } from './gameLoop.js';

const canvas = document.getElementById('gameCanvas');
const input = new InputHandler();
input.attach();

const game = new Game(canvas, input);
window._game = game;
window._input = input;

const loop = new GameLoop(
  (dt) => game.update(dt),
  () => game.render()
);

loop.start();

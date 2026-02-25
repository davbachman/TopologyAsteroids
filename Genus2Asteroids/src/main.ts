import './styles.css';
import { attachAdvanceTime } from '../../unified/src/core/debug/advanceTime';
import { renderGameToText } from '../../unified/src/core/debug/renderGameToText';
import { Game } from '../../unified/src/core/game';
import { createOctagonTopology } from '../../unified/src/topology/octagon';

declare global {
  interface Window {
    advanceTime: (ms: number) => void;
    render_game_to_text: () => string;
    gameDebug?: {
      getState: () => unknown;
      game: Game;
    };
  }
}

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing #app container');

const shell = document.createElement('div');
shell.className = 'game-shell';
const canvas = document.createElement('canvas');
canvas.width = 960;
canvas.height = 960;
shell.appendChild(canvas);
app.appendChild(shell);

async function toggleFullscreen(): Promise<void> {
  if (!document.fullscreenElement) {
    await shell.requestFullscreen();
  } else {
    await document.exitFullscreen();
  }
}

const topology = createOctagonTopology(360);
const game = new Game(canvas, topology, { toggleFullscreen });
attachAdvanceTime((ms) => game.advanceTime(ms));
window.render_game_to_text = () => renderGameToText(game.getState());
window.gameDebug = {
  getState: () => structuredClone(game.getState()),
  game,
};

game.start();

import './style.css';
import { Game } from './game/Game';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="ui-overlay">
    <h1>WUXIA FIGHT</h1>
    <div class="controls-hint">A / D: MOVEMENT | SPACE: JUMP</div>
  </div>
`;

new Game('app');

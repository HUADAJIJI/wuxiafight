import './style.css';
import { Game } from './game/Game';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="ui-overlay">
    <h1>武 侠 决</h1>
    <div class="controls-hint">AD 键：平移 | 空格：纵跃 | S 键：转向</div>
  </div>
`;

new Game('app');

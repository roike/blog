import './sass/style.scss';
import { gevent } from './js/lib/spa.js';
import { init } from './js/shell.js';

document.addEventListener('DOMContentLoaded', () => {
  gevent.init();
  init();
  // window.location.urlを取得してルーtィングを開始する
  window.dispatchEvent(new Event('popstate'));
});

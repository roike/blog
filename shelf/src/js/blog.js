/*
 * Thirdpen|Bookshelf blog.js
 * See License
 * ---description---
 *
*/

import * as spa from "./lib/spa.js";
import * as shell from "./shell.js";
import * as model from "./model.js";

const configMap = { anchor: null, previous: null, windowHeight: null };
//const stateMap = {};
// dom traversalの繰り返しを避けるため、操作に必要なdom オブジェクトを格納する
const domMap = {container: null};
const onLoadBlog = event => {
  const { view } = template;
  domMap.container.innerHTML = view(event.detail);
};
const config= input_map => {
  spa.util.setConfigMap({
    input_map: input_map,
    config_map: configMap
  });
};

// Begin public method /initModule/
const init= container => {
  domMap.container = container;
  //グローバルカスタムイベントのバインド
  spa.gevent.subscribe('blog', 'load-blog', onLoadBlog);
  //ページ取得
  model.blog.get(configMap.anchor.page);
};

// return public methods
export { config, init };

// ------------------ Templatre ---------------------------
const template = {
  view: ({tag, update, content_html}) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const prev = configMap.previous ? configMap.previous.join("/") : "heading" ;
    return `
  <div class="ly-wrapperArticle">
    <article class="article">
      <header class="article-header">
        <span>${new Date(update).toLocaleDateString(undefined, options)}</span>
        <span>${tag}</span>
      </header>
      <div class="blog-content">${content_html}</div>
      <footer class="article-footer">
        <a href="${'/' + prev}" id="heading-more" class="tooltip">
          <i class="material-icons">reply</i>
          <span class="tooltiptext">見出しに戻る</span>
        </a>
      </footer>
    </article>
  </div>`;
}};

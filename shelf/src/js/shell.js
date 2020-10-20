/*
 * Thirdpen|Bookshelf shell.js
 * See License
 * -----------------------------------------------------------------
*/

/* global spa */

/*新規モジュールを追加する場合のtodo-------------------------
 * anchor_schemaに追加
 * ---------------------
 */

import _ from "lodash";
import * as spa from "./lib/spa.js";
import * as heading from "./heading.js";
import * as blog from "./blog.js";
import * as model from "./model.js";

//congigMapに静的な構成値を配置
const configMap = { SchemaEventMap: {} };
// stateMap: cash container
//ローカルキャッシュはここで宣言
const stateMap = { windowHeight: null };
//動的に呼び出す他モジュールを格納
const moduleMap = {
  heading,
  blog,
  error: spa.error,
};
//許可するanchorはここで宣言--モジュール名に一致
const anchor_schema = Object.keys(moduleMap);
// domMap: dom container
const domMap = {};

//DOMメソッドにはページ要素の作成と操作を行う関数を配置
const setDomMap = () => {
  //domコレクションをキャッシュするとドキュメントトラバーサル数を減らせる
  domMap.container = document.getElementById("spa");
};

const screenTest = (e) => {
  const mql = window.matchMedia("(min-width: 800px)");
  spa.gevent.publish("mediaQuery", mql.matches);
};

const onError = (event) => {
  console.info("error", event.detail);
  const err = event.detail;

  const error = {
    name: "server",
    notification: err.response,
    data: null,
  };

  moduleMap.error.config({
    error_model: error,
  });
  moduleMap.error.init(domMap.container);
};

const onNotify = (event) => {
  const mesData = event.detail;
  const { notify } = template;
  domMap.container.insertAdjacentHTML("afterbegin", notify(mesData.message));
  const notification = document.getElementById("notification");
  notification.style.top = mesData.top;
  notification.style.left = mesData.left;
  if (notification.classList.contains("is-paused")) {
    notification.classList.remove("is-paused");
  }
  const closeMessage = () => {
    domMap.container.removeChild(notification);
  };

 notification.addEventListener("animationend", closeMessage);
};

//handling local event
//ここでイベントを捕捉する場合はschemaのどれかが最初に必要
//例:href='/blog/<pre>/<slug>'
//Google loginなどschemaがあっても外部にスルーさせたい
//イベントはバブリングをサブモジュールで止めるか、例えばerror.js
//あるいはここでスルー処理を追加する
const handleAnchorClick = (event) => {
  const anchor = event.path.find((element) => element.tagName === "A");
  //anchor.classList.contains("someTag")
  if (anchor) {
    const hrefPath = anchor.pathname.split("/").slice(1);
    const isSchema = anchor_schema.includes(hrefPath[0]);

    if (isSchema) {
      event.preventDefault();
      spa.uriAnchor.setAnchor({ page: hrefPath }, false);
    }
  }
};

/* call each schema's eventMap */
const eventHandler = (event) => {
  const element = event.target;
  const listener = element.getAttribute("listener") || null;
  if (listener && _.has(configMap.SchemaEventMap[event.type], listener)) {
    event.stopPropagation();
    configMap.SchemaEventMap[event.type][listener](event);
  }
};

// urlの監視--schema以外のページ要求はエラーに誘導
// url履歴の管理
// 親履歴(anchor only)でリセット
// 新規の子履歴は追加
// 現在の履歴の後の履歴は削除
const onPopstate = () => {
  //アドレスバーのanchorを適正テスト後に取り出す
  //引数はdefault_anchor,anchorがあればそれを優先
  //不適正なアドレスはエラー発生
  let anchor_map_proposed;
  try {
    anchor_map_proposed = spa.uriAnchor.makeAnchorMap("heading");
  } catch (err) {
    moduleMap.error.config({
      error_model: err,
    });
    moduleMap.error.init(domMap.container);
    return false;
  }
  const anchor = anchor_map_proposed.page[0];
  const previous = spa.uriAnchor.testHistory(anchor_map_proposed.page);
  moduleMap[anchor].config({
    //各anchorで参照する汎用objectを先頭のconfigMapで宣言する
    anchor: anchor_map_proposed,
    previous: previous,
    windowHeight: stateMap.windowHeight,
  });

  moduleMap[anchor].init(domMap.container);

  Object.keys(configMap.SchemaEventMap).forEach((eventType) =>
    domMap.container.addEventListener(eventType, eventHandler)
  );
};

//外部に公開するものを明示する
const config = input_map => {
  spa.util.setConfigMap({
    input_map: input_map,
    config_map: configMap
  });
};
const init = () => {
  setDomMap();
  const h =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    document.body.clientHeight;
  stateMap.windowHeight = h;

  //グローバルカスタムイベントのバインド
  spa.gevent.subscribe('shell', 'error', onError);
  spa.gevent.subscribe('shell', 'notify', onNotify);

  // ローカルイベントのバインド
  document.addEventListener('click', handleAnchorClick, false);

  //callできるanchorを設定
  spa.uriAnchor.setConfig(anchor_schema);

  // Handle URI anchor change events.
  window.addEventListener('popstate', onPopstate);
  // media query
  const mql = window.matchMedia("(min-width: 800px)");
  mql.addEventListener("change", screenTest);
};

//shellが公開するメソッド
export { config, init };

// ------------------ Templatre ---------------------------
const template = {
  notify: (message) => {
    return `
      <section id="notification" class="fadeInAndOut is-paused">
        <i class="material-icons">error_outline</i>
        ${message}
      </section>`;
  },
};

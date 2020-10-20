/*
 * Thirdpen|Editor heading.js
 * See License
 * ---description---
 *
 */

import _ from 'lodash';
import * as spa from "./lib/spa.js";
import * as model from "./model.js";

//-------BEGIN SCOPE VARIABLES----------------------------
const configMap = {
  anchor: null,
  user: null,
};
const stateMap = {
  //ローカルキャッシュはここで宣言
  entry: "thirdpen",
  offset: "0",
  pageStep: 0,
  pageNation: [],
};
const domMap = {};
//定数はここで宣言

//公開モジュールを参照する場合はここで宣言
//----END SCOPE VARIABLES-------------------------------------

//------------------- BEGIN UTILITY METHODS ------------------

//-------------------- END UTILITY METHODS -------------------

//--------------------- BEGIN DOM METHODS --------------------
//DOMメソッドにはページ要素の作成と操作を行う関数を配置
//可読性のためtarget elementは分散させずにここで宣言
const setDomMap = () => {
  domMap.heading = document.getElementById("entry-contents");
  domMap.more = document.getElementById("heading-more");
  domMap.page = document.getElementById("heading-pagenation");
};

//---------------------- END DOM METHODS ---------------------

//------------------- BEGIN EVENT HANDLERS -------------------

//リストの再描画
// heading = {blogs:[],offset:,result:completed,error,noMore}
// blog:{id:,poster:,title:,entry:,tag:,date:,update:,excerpt:,content:,
//       excerpt_html:,content_html:,status:}
const onChangeLatest = (event) => {
  const heading = event.detail;
  stateMap.pageStep = heading.step;
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  domMap.heading.innerHTML = heading.blogs
    .map(({ ID, title, prologue, entry, date, tag, update, status }) => {
      return `
<article class="ly-headings">
  <h1 class="card-title">${title}</h1>
  <div class="bl-headings-subTitle">
    <span>${new Date(update).toLocaleDateString(undefined, options)}</span>
    <span>${entry}</span>
    <span>${tag}</span>
    <span>${status}</span>
  </div>
  <p>${prologue}</p>
  <footer>
    <a href="/blog/${entry}/${ID}" class="tooltip">
      <span class="icon">
        <i class="material-icons el-headings-icon">mode_edit</i>
      </span>
      <span class="tooltiptext">記事の編集</span>
    </a>
  </footer>
</article>`;
    })
    .join("");
  if (heading.result === "noMore") {
    domMap.more.href = '';
  } else {
    domMap.more.href = `/heading/${stateMap.entry}/${heading.offset}`;
    stateMap.offset = heading.offset;
  }
  addPage();
};
const addPage = () => {
  const idx = stateMap.offset / stateMap.pageStep;
  if(idx > stateMap.pageNation.length) {
    stateMap.pageNation.push(`<li><a href="/heading/${stateMap.entry}/${stateMap.offset}">${idx+1}</a>`); 
  }
  domMap.page.insertAdjacentHTML('beforeend', stateMap.pageNation.join(''));
};
//-------------------- END EVENT HANDLERS --------------------

//------------------- BEGIN PUBLIC METHODS -------------------
const config = (input_map) => {
  spa.util.setConfigMap({
    input_map: input_map,
    config_map: configMap,
  });
};

// Begin public method /init/
const init = (container) => {
  const { headings } = template;
  container.innerHTML = headings({entry: "thirdpen", offset: "0"});
  setDomMap();

  //domMap.more.href = `/heading/${stateMap.entry}/0`;
  // subscribe to custom_event
  spa.gevent.subscribe("heading", "change-latest", onChangeLatest);

  //anchor.page = [heading, entry, offset]
  //or [heading, entry, tag, offset]
  const anchor = configMap.anchor;
  const params = {
    entry: "thirdpen",
    tag: "",
    offset: "0",
  };

  if (anchor.page.length === 3) {
    params.offset = anchor.page[2];
  } else if (anchor.page.length === 4) {
    params.tag = decodeURIComponent(anchor.page[2]);
    params.offset = anchor.page[3];
  }
  //console.info(params);
  model.blog.heading(params);
};

// return public methods
export { config, init };
//------------------- END PUBLIC METHODS ---------------------

// ------------------ Templatre ---------------------------
const template = {
  headings: ({entry, offset}) => {
    return `
  <div class="ly-wrapperArticle">
    <article class="article">
      <header class="header">
        <a href="/blog" id="add-blog" class="tooltip">
          <i class="material-icons">add_circle</i>
          <span class="tooltiptext">記事の投稿</span>
        </a>
      </header>
      <h1 class="el-hide">投稿記事</h1>
      <div id="entry-contents"></div>
      <footer class="article-footer">
        <ul id="heading-pagenation" class="ly-pagenation">
          <li>
            <a href="#" id="heading-more" class="tooltip">
              <i class="material-icons">arrow_forward</i>
              <span class="tooltiptext">次の記事</span>
            </a>
           <li>
             <a href="/heading/${entry}/${offset}">1</a>
           </li>
        </ul>
      </footer>
    </article>
  </div>`;
  },
};

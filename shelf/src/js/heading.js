/*
 * Thirdpen|Bookshelf heading.js
 * See License
 * ---description---
 *
*/

import * as spa from "./lib/spa.js";
import * as model from "./model.js";

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

//DOMメソッドにはページ要素の作成と操作を行う関数を配置
//可読性のためtarget elementは分散させずにここで宣言
const setDomMap = () => {
  domMap.heading = document.getElementById("entry-contents");
  domMap.more = document.getElementById("heading-more");
  domMap.page = document.getElementById("heading-pagenation");
};

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
    <span>${tag}</span>
  </div>
  <p>${prologue}</p>
  <footer>
    <a href="/blog/${ID}" class="el-button">
      <b>READ MORE ...</b>
    </a>
  </footer>
</article>`;
    })
    .join("");
  if (heading.result === "noMore") {
    domMap.more.href = '';
  } else {
    domMap.more.href = `/heading/${heading.offset}`;
    stateMap.offset = heading.offset;
  }
  addPage();
};

const addPage = () => {
  const idx = parseInt(stateMap.offset) / parseInt(stateMap.pageStep);
  if(idx > stateMap.pageNation.length) {
    stateMap.pageNation.push(`<li><a href="/heading/${stateMap.offset}">${idx+1}</a>`); 
  }
  domMap.page.insertAdjacentHTML('beforeend', stateMap.pageNation.join(''));
};

const config = (input_map) => {
  spa.util.setConfigMap({
    input_map: input_map,
    config_map: configMap,
  });
};

// Begin public method /init/
const init = (container) => {
  const { headings } = template;
  container.innerHTML = headings({offset: "0"});
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

  if (anchor.page.length === 2) {
    params.offset = anchor.page[1];
  } else if (anchor.page.length === 3) {
    params.tag = decodeURIComponent(anchor.page[1]);
    params.offset = anchor.page[2];
  }
  //console.info(params);
  model.blog.heading(params);
};

// return public methods
export { config, init };

// ------------------ Templatre ---------------------------
const template = {
  headings: ({offset}) => {
    return `
  <div class="ly-wrapperArticle">
    <article class="article">
      <h1 class="el-hide">List of articles</h1>
      <div id="entry-contents"></div>
      <footer class="article-footer">
        <ul id="heading-pagenation" class="ly-pagenation">
          <li>
            <a href="#" id="heading-more" class="tooltip">
              <i class="material-icons">arrow_forward</i>
              <span class="tooltiptext">次の記事</span>
            </a>
           <li>
             <a href="/heading/${offset}">1</a>
           </li>
        </ul>
      </footer>
    </article>
  </div>`;
  },
};

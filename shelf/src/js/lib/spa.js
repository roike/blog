/*
 * thirdpen spa.js
 * Root namespace module
 * See License
 * ---------------------------------------------------------
 * Update 2020-05-20 
*/
import _ from 'lodash';
import template from './error.js';

const gevent = (() => {
  //---------------- BEGIN MODULE SCOPE VARIABLES --------------
  const 
    customEvent = {},
    eventTarget = {};
  //----------------- END MODULE SCOPE VARIABLES ---------------

  //------------------- BEGIN PUBLIC METHODS -------------------
  const publish = (eventName, data) => {
    const event = new CustomEvent(eventName, {detail: data});
    eventTarget.spa.dispatchEvent(event);
  };

  //event_nameは競合不可
  // muleIdはanchor_schemaに一致
  const subscribe = (moduleId, eventName, fn ) => {
    //console.info('bind collection %s', collection);
    eventTarget.spa.addEventListener(eventName, fn);
    if (!(_.has(customEvent, moduleId))) {
      customEvent[moduleId] = {};
    }
    customEvent[moduleId] = {eventName: fn};
  };

  const unsubscribe = moduleId => {
    if (_.has(customEvent, moduleId)) {
      Object.keys(customEvent[moduleId]).forEach(eventName => {
        eventTarget.spa.removeEventListener(eventName, customEvent[moduleId][eventName]);
      });
      delete customEvent[moduleId];
    }
  };

  const init = () => {
    eventTarget.spa = document.getElementById('spa');
  };
  //------------------- END PUBLIC METHODS ---------------------

  // return public methods
  return {
    init,
    publish,
    subscribe,
    unsubscribe
  };
})();

const uriAnchor = (() => {

  let schemaList = null;
  const historyMap = [];

  //schemaにないページはdefault_pageに誘導
  const setConfig = anchor_schema => { schemaList = anchor_schema; };

  //想定のケースは以下
  // domain/ --> anchor=''
  // domain/<anchor> --> anchor in schemaList
  // domain/blog/<entry>/<ID> --> anchor=blog
  const getCleanAnchorString = () => {
    const pathname = document.location.pathname;
    if (pathname === "/") {
      return {page: null};
    }
    const urlPathList = pathname.split('/').slice(1);
    const isSchema = schemaList.includes(urlPathList[0]);
    if (isSchema) {
      return {page: urlPathList};
    } else {
      const err = {
        name: "schema",
        notification: "Page not found!",
        data: null
      };
      throw err;
    }
  };

  // アドレスバーにuriをセットしてpopstateイベントを発行する
  const setAnchor = (anchorMap, replace_state) => {
    const anchor = anchorMap.page;
    const uri_string = Array.isArray(anchor) ? '/' + anchor.join('/') : anchor;
    const state = history.state;

    if ( replace_state ) {
      //ページは書き換えるがキャッシュしない
      history.replaceState(null, null, uri_string);
    } else {
      //２番目の引数は無視される--mdn pushState()
      history.pushState(state, null, uri_string);
    }
    window.dispatchEvent(new Event('popstate'));
  };

  // 引数はdefault_anchor
  // アドレスバーのuriをmapに格納する
  const makeAnchorMap = anchor =>{
    const anchorMap = getCleanAnchorString();
    if (anchorMap.page === null) {
      anchorMap.page = Array.isArray(anchor) ? anchor : [anchor];
    }
    return anchorMap;
  };

  const testHistory = page => {
    //page=[schema,,,]
    //現在のurl履歴を登録する
    //戻るリンクの不適切な循環を防止する
    //ひとつ前の画面==historyMap[idx-1]
    //historyMap=履歴の格納
    //ひとつ前の画面のページ配列をunderbarで連結する 
    const pageHistory = page.join('_');
    let idx = historyMap.indexOf(pageHistory);
    //schemaListに一致するものがないかチェックする
    //連結するものがなかった([latest]等)場合(>-1)になる
    if (schemaList.indexOf(pageHistory) > -1) {
      historyMap.length = 0;
      historyMap.push(pageHistory);
      //この場合は前のページはないのでnullを返すためにidx=0
      idx = 0;
    }
    else if (idx == -1) {
      //pageHistoryに未格納な新しいページがあるので格納する
      historyMap.push(pageHistory);
      idx = historyMap.length - 1;
    }
    else if ((historyMap.length - idx) > 1) {
      //同じものがある場合は循環を避けるために後順位を捨てる
      //例:[ab, abc, abcd]の時にabcが来たら[ab, abc]としてabcdを捨てる
      const historyMapNext = historyMap.slice(0, idx + 1);
      historyMap.length = 0;
      Object.assign(historyMap, historyMapNext);

    }
    //historyMap.length - idx == 1 -->重複クリック
    return idx === 0 ? null : historyMap[idx-1].split('_');
  };

  const setBreadCrumb = () => {
    const len = historyMap.length;
    // display no bread crumb as len === 1
    const breadcrumb = len === 1 ? '' : historyMap.map((url, idx) => { 
      const page = url.split('_')[0];
      const href = url.replace(/_/g, '/');
      return idx === (len - 1) ? `<li>${page}</li>`
        : `<li><a href="/${href}">${page}</a></li>`;}).join(' >> ');
    document.querySelector('.breadcrumb').innerHTML = breadcrumb;
  };

  return {
    setConfig,
    setAnchor,
    historyMap,
    makeAnchorMap,
    testHistory,
    setBreadCrumb
  };
})();

const ajax = (() => {
  // const stateMap = {socket: null};
  const makeAjax = (() => {
    //paramsがない場合はnull
    const encodedString = params => {
      return Object.keys(params).map(key => {
        let val = params[key];
        if(typeof val === 'object') val = JSON.stringify(val);
        return [key ,encodeURIComponent(val)].join('=');
      }).join('&');
    };
    
    const makeRequest = opts => {
      //console.info(opts.url);
      return new Promise( (resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(opts.method, opts.url, true);

        Object.keys(opts.headers).forEach(key => {
          xhr.setRequestHeader(key, opts.headers[key]);
        });
        //console.info(opts.params);
        xhr.send(opts.params);
        xhr.onload = () => {
          //console.info(xhr.status);
          if(xhr.status >= 200 && xhr.status < 302) {
            resolve(JSON.parse(xhr.response));
          } else if ([400, 401, 403, 404].includes(xhr.status)) {
            reject({status: xhr.status, response: xhr.response});
          } else {
            //status==500はここでキャッチ
            reject({status: xhr.status, response: xhr.response});
          }
        };
        xhr.onerror = () => {
          //console.info(xhr.statusText);
          reject(xhr.statusText);
        };
      });
    };

    const ajaxGet = (url, params={}, token=null) => {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const urlString = encodedString(params);
      if (urlString) {
        url += '?' + encodedString(params);
      }
      //console.info(url);
      return makeRequest({
        method: 'GET',
        url: url,
        params: null,
        headers: headers
      });
    };

    const ajaxDelete = (url, params, token=null) => {
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return makeRequest({
        method: 'DELETE',
        url: url,
        params: encodedString(params),
        headers: headers
      });
    };

    // send formData as itself by using ajax
    const ajaxPost = (url, params, token=null) => {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return makeRequest({
        method: 'POST',
        url: url,
        params: encodedString(params),
        headers: headers
      });
    };

    const ajaxPatch = (url, params, token=null) => {
      const headers = {'Content-Type': 'application/json; charset=UTF-8'};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return makeRequest({
        method: 'PATCH',
        url: url,
        params: JSON.stringify(params),
        headers: headers
      });
    };

    // convert formdata to json and then post it
    const ajaxPostByJson = (url, params, token=null) => {
      const headers = {'Content-Type': 'application/json; charset=UTF-8'};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return makeRequest({
        method: 'POST',
        url: url,
        params: JSON.stringify(params),
        headers: headers
      });
    };

    const imgLoad = (url, file) => {
      //console.info(url);
      return new Promise((resolve, reject) => {
        const 
          xhr = new XMLHttpRequest(),
          formData = new FormData();

        formData.append('file', file);
        xhr.open('POST', url);
        xhr.send(formData);
        xhr.onload = () => {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.response));
          } else {
            reject(error('Image didn\'t load successfully; error code:' + xhr.statusText));
          }
        };
        xhr.onerror = () => {
          reject(error('There was a network error.'));
        };
      });
    };

    return {
      get: ajaxGet,
      delete: ajaxDelete,
      patch: ajaxPatch,
      post: ajaxPost,
      json: ajaxPostByJson,
      upload: imgLoad
    };

  })();

  //公開するモジュールを定義
  return {
    getAjax: makeAjax,
  };
})();

const util = (() => {
  const makeError = ( name_text, msg_text, data ) => {
    const err = new Error();
    err.name = name_text;
    err.message = msg_text;

    if ( data ){ err.data = data; }

    return err;
  };

  /* 汎用共通オブジェクトを各モジュールに設定する
   * arg_map = {
   *   input_map:<提供元のオブジェクト>,
   *   config_map:<受け取りたいオブジェクト>
   * }
   */
  const setConfigMap = arg_map => {
    const
      input_map = arg_map.input_map,
      config_map = arg_map.config_map;

    Object.keys(input_map).forEach(key_name => {
      if ( config_map.hasOwnProperty(key_name) ) {
        config_map[key_name] = input_map[key_name];
      }
    });
  };
  // End Public method /setConfigMap/
  //文字列の文字の置き換え-連続['a','b','c']等、置き換える文字が異なる場合
  //%sの数と置き換え文字の数は一致するはずだが後者が少ない場合は%sは空文字変換
  const okikae = function() {
    const
      args = Array.prototype.slice.call(arguments),
      rest = args.slice(1);

    const henkan = (str, moji) => {
      if ( str.indexOf('%s') === -1 ) return str; 
      return henkan(str.replace('%s', moji||''), rest.shift());
    };
    return henkan(args[0], rest.shift());
  };

  //Deep Copy 
  const deepCopy = origin => JSON.parse(JSON.stringify(origin));

  //スペースの削除
  const ltrim = line => {
    return line.replace(/[\s\u3000]+/g, '');
  };

  //カラーコード自動生成--rgb
  const autoColor = () => {
    const getHex = dec => {
      //convert Decimal to Hexadimal
      const hexArray = [ 
        "0", "1", "2", "3","4", "5", "6", "7","8", "9", "A", "B","C", "D", "E", "F"
      ];

      let code = dec - (Math.floor(dec / 16)) * 16;
       
      return (hexArray[code]);
    };

    return (() => {
      let
        x = Math.round(255*Math.random()),
        y = Math.round(255*Math.random()),
        z = Math.round(255*Math.random());
      
      return '#' + getHex(x) + getHex(y) + getHex(z);
    })();
  };

  //--browser utilities-------------------------------
  /* encodeHTML
   * タグに埋め込む文字列をHTMLの実体参照にエスケープする
   * 通常は次の５文字
   * <>&"'->&lt;&gt;&amp;&quot;&apos
   */
  const encodeHTML = val => {
    const dom = document.createElement('div');
    dom.appendChild(document.createTextNode(val));
    //console.info(dom.innerHTML);
    return dom.innerHTML;
  };

  return {
    makeError,
    okikae,
    deepCopy,
    setConfigMap,
    ltrim,
    autoColor,
    encodeHTML
  };


})();

//errorのタイプは-=->error.name===[login, schema, server]
const error = (() => {
  const configMap = {
    //汎用オブジェクトを参照する場合はここで宣言
    error_model: null,
  };
  const onHandleClick = event => {
    //error画面の全クリックイベントをspa.shellで捕捉しないでスルー
    event.stopPropagation();
  };
  //------------------- BEGIN PUBLIC METHODS -------------------
  const config = input_map => {
    util.setConfigMap({
      input_map: input_map,
      config_map: configMap
    });
  };

  const init = container => {
    const err = configMap.error_model;
    container.innerHTML = template[err.name](err);
    //ローカルイベントのバインド
    document.getElementById('container-error').addEventListener('click', onHandleClick);
  };

  // return public methods
  return { config, init };
  //------------------- END PUBLIC METHODS ---------------------
})();

export { gevent, uriAnchor, ajax, util, error };

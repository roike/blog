/*
 * thirdpen/editor model.js
 * See License
 *-----------------------------------------------------------------
 */

/*
 ajaxの引数:
 ajax.get(url, params, token)
 ajax.post(url, params, token)
 latest : {blogs:[],offset:,result:completed,error,noMore}
 blog新着リスト--5件単位
 追加した場合は新規を行の最初に末尾は削除する
 更新した場合は該当するキーのBlogを更新する
*/

import _ from "lodash";
import * as spa from "./lib/spa.js";

//データキャッシュ
const stateMap = {
  user: null,
  latest: null,
};

//インスタンスオブジェクト------------------------
//user情報はhnsdbc.appsopt.com/loginから以下取得
//{email:, role:, token:}
const user = (() => {
  const login = (data) => {
    stateMap.user = data;
    sessionStorage.setItem("user", JSON.stringify(data));
    spa.gevent.publish("login", data);
  };

  return {
    login,
    get: () => {
      // TODO:sessionStorageのライフサイクルの設定
      if (!stateMap.user && sessionStorage.getItem("user")) {
        stateMap.user = JSON.parse(sessionStorage.getItem("user"));
      }
      return stateMap.user;
    },
    logout: () => {
      stateMap.user = null;
    },
  };
})();

const blog = (() => {
  const ajax = spa.ajax.getAjax;
  //const dcopy = spa.util.deepCopy;

  const getBlogLocal = (blog) => {
    const id = typeof blog === "object" ? blog.ID : blog;
    return stateMap.latest
      ? _.find(stateMap.latest.blogs, (cacheblog, index) => {
          if (cacheblog.ID === id) {
            if (_.isObject(blog)) {
              stateMap.latest.blogs[index] = blog;
            }
            return stateMap.latest.blogs[index];
          }
        })
      : null;
  };

  const get = (page) => {
    const id = _.last(page);
    const latest_blog = getBlogLocal(id);
    if (latest_blog) {
      spa.gevent.publish("load-blog", latest_blog);
    } else {
      const url = "/api/" + page.join("/");
      ajax
        .get(url, undefined, stateMap.user.token)
        .then((data) => {
          spa.gevent.publish("load-blog", data);
        })
        .catch((error) => handleException(error));
    }
  };

  const post = (params) => {
    let url = "/api/blog/add";
    if (params.id) {
      url = `/api/blog/put/${params.id}`;
    }
    ajax
      .json(url, params, stateMap.user.token)
      .then(() => {
        notify("投稿を保存しました。");
        spa.uriAnchor.setAnchor({page: ['heading']});
      })
      .catch((error) => handleException(error));
  };

  //blog新着リスト--5件単位で取り出す
  // heading = {blogs:[],offset:,result:completed,error,noMore}
  // キャッシを使わないで都度requestする
  const heading = (params) => {
    const { entry, tag, offset } = params;
    const url = tag
      ? `/api/heading/${entry}/${tag}/${offset}`
      : `/api/heading/${entry}/${offset}`;
    ajax
      .get(url, undefined, stateMap.user.token)
      .then((data) => {
        stateMap.latest = data;
        spa.gevent.publish("change-latest", data);
      })
      .catch((error) => handleException(error));
  };

  // UPload a image
  const upload = (file) => {
    ajax
      .upload("/api/file/upload", file)
      .then((data) => {
        spa.gevent.publish("complete-upload", data);
      })
      .catch((error) => handleException(error));
  };

  return {
    get: get,
    post: post,
    heading: heading,
    upload: upload,
    entry: ["thirdpen"],
  };
})();

const handleException = (error) => {
  // 400 Bad Request
  // 401 Unauthorized
  // 403 Forbidden
  // 404 Not Found
  // 405 Method Not Allowed
  //console.info(error);
  //認証違反は再認証
  if (_.has(error, "status")) {
    console.info("status", error.status);
    sessionStorage.clear();
    spa.gevent.publish("error", error);
  }
};

const notify = (message) => {
  const mesData = {
    top: "70px",
    left: "50%",
    message: message,
  };
  spa.gevent.publish("notify", mesData);
};

export { notify, user, blog };

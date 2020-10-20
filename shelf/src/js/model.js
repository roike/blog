/*
 * Thirdpen|Bookshelf model.js
 * See License
 *-----------------------------------------------------------------
*/
/*global */

/*
 ajaxの引数:
 ajax.get(url, params, callback)
 ajax.post(url, params, callback)
 latest : {blogs:[],offset:,result:completed,error,noMore}
 blog新着リスト--5件単位
 追加した場合は新規を行の最初に末尾は削除する
 更新した場合は該当するキーのBlogを更新する
*/
import _ from "lodash";
import * as spa from "./lib/spa.js";

//データキャッシュ
const stateMap = {
  serverToken: "HwEKDCPU",
  latest: null,
};

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
        .get(url, undefined, stateMap.serverToken)
        .then((data) => {
          spa.gevent.publish("load-blog", data);
        })
        .catch((error) => handleException(error));
    }
  };

  //blog新着リスト--5件単位で取り出す
  // heading = {blogs:[],offset:,result:completed,error,noMore}
  // キャッシを使わないで都度requestする
  const heading = (params) => {
    const { entry, tag, offset } = params;
    const url = tag
      ? `/api/heading/${tag}/${offset}`
      : `/api/heading/${offset}`;
    ajax
      .get(url, undefined, stateMap.serverToken)
      .then((data) => {
        stateMap.latest = data;
        spa.gevent.publish("change-latest", data);
      })
      .catch((error) => handleException(error));
  };


  return {
    get: get,
    heading: heading,
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

export { notify, blog };

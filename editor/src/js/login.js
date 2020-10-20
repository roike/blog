/*
 * thirdpen login.js
 * See License
 * ---description---
 *
 */
import * as spa from "./lib/spa.js";
import * as model from "./model.js";

//---------------- BEGIN MODULE SCOPE VARIABLES --------------
const configMap = {
  anchor: null,
  previous: null,
};
//----------------- END MODULE SCOPE VARIABLES ---------------

//------------------- BEGIN UTILITY METHODS ------------------

//-------------------- END UTILITY METHODS -------------------

//--------------------- BEGIN DOM METHODS --------------------
//---------------------- END DOM METHODS ---------------------

//------------------- BEGIN EVENT HANDLERS -------------------
const receiveMessage = (event) => {
  if (event.origin !== "https://hnsdbc.appspot.com") return;
  const message = event.data;
  const anchor = configMap.anchor;
  message.anchor = anchor.page[0];
  model.user.login(message);
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
  const { loginForm } = template;
  // ページ取得
  container.innerHTML = loginForm();
  // クロスドメイン通信の設定
  // hnsdbc.appspot.comのログイン認証を使う
  window.addEventListener("message", receiveMessage);
};

// return public methods
export { config, init };
//------------------- END PUBLIC METHODS ---------------------

// ------------------ Templatre ---------------------------
const template = {
  loginForm: () => {
    return `
  <div>
    <iframe
      width="100%"
      height="500"
      style="border:none;"
      name="iframe_login"
      src="https://hnsdbc.appspot.com/index.html"
    >
    </iframe>
  </div>`;
  },
};

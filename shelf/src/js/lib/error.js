/*
 * Thirdpen|Editor error.js
 * See License
 * -----------------------------------------------------------------
 * error:{name:<login||schema||server>, message:, data:}
*/


const template = {
  login: error => {
    return `
      <div id="container-error" class="mdl-grid">
        <div class="mdl-card mdl-cell--12-col mdl-shadow--2dp">
          <div class="mdl-card__title">
            <h2>Thirdpen</h2>
          </div>
          <div class="mdl-card__supporting-text">
            <h3>認証エラー</h3>
            <p>${error.notification}</p>
            <div><a href="${error.data}">アカウントにログインする</a></div>
          </div>
        </div>
      </div>`;
  },
  schema: error => {
    return `
      <div id="container-error" class="mdl-grid">
        <div class="mdl-card mdl-cell--12-col mdl-shadow--2dp">
          <div class="mdl-card__title">
            <h2>Thirdpen</h2>
          </div>
          <div class="mdl-card__supporting-text">
            <h3>ページ違反</h3>
            <p>${error.notification}</p>
          </div>
        </div>
      </div>`;
  },
  server: error => {
    return `
      <div id="container-error" class="mdl-grid">
        <div class="mdl-card mdl-cell--12-col mdl-shadow--2dp">
          <div class="mdl-card__title">
            <h2>Thirdpen</h2>
          </div>
          <div class="mdl-card__supporting-text">
            <h3>serverで例外発生</h3>
            <p>${error.notification}</p>
          </div>
        </div>
      </div>`;
  
  }
};
export { template as default };

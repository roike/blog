/*
 * Thirdpen/Editor blog.js
 * See License
 * ---description---
 * Using Toast Ui Editor
 * https://nhn.github.io/tui.editor/latest/#-documents
 */

import _ from "lodash";
import * as spa from "./lib/spa.js";
import * as shell from "./shell.js";
import * as model from "./model.js";

const configMap = { anchor: null, previous: null, windowHeight: null };
const stateMap = {
  //ローカルキャッシュはここで宣言
  blog: {}, //ID,content,poster,status,tag,title,entry
  postForm: {},
  status: null,
  // [thirdpen,southwind,vpwboard,oike]
  editor: null,
  tuiDialog: null,
  uploadFile: null,
  isEdit: false, // 更新時はisEdit: true
  timeout: null,
};
// dom traversalの繰り返しを避けるため、操作に必要なdom オブジェクトを格納する
const domMap = {container: null, editor: null};

//const encodeHTML = spa.util.encodeHTML;

const changeEventMap = {
  upLoad: e => {
    // e.target -> input[type=file]
    const upload = e.target;
    const file = upload.files[0];
    const el_image = domMap.editor.querySelector(".bl-image>img");
    const imageType = /image.*/;

    if (!file.type.match(imageType)) {
      return false;
    }
    if (file === undefined || file.size > 10000000) {
      model.notify("画像のサイズが大き過ぎます。");
      return false;
    }
    stateMap.uploadFile = file;
    const objectURL = window.URL.createObjectURL(file);
    el_image.src = objectURL;
    el_image.onload = e => {
      window.URL.revokeObjectURL(objectURL);
    };
  },
};

const factoryLayerPopup = ({title, content, mold} = obj) => {
    const mould = template[mold];
    const popUP = stateMap.editor.getUI().createPopup({
      target: domMap.editor.querySelector(".tui-editor-defaultUI"),
      header: true,
      title: title,
      modal: false,
      className: "tui-editor-popup",
      closerCssQuery: ".cm-close-tuiPop",
      content: mould(content)
    });
    stateMap.tuiDialog = popUP;
    return popUP;
};

const clickEventMap = {
  saveImage: e => {
    model.blog.upload(stateMap.uploadFile);
  },
  popImg: e => {
    const content = {
      title: "画像挿入"
    };
    const popup = factoryLayerPopup({title: "Add a photo", content: content, mold: "image"});
    popup.show();
  },
  popForm: e => {
    const { toastMark } = stateMap.editor;
    const lineTexts = toastMark.lineTexts.slice(0, 2);
    stateMap.blog.entrySelect = ["thirdpen"];
    const content = {
      title: lineTexts[0].replace("# ", ""),
      prologue: lineTexts[1],
      tag: stateMap.isEdit ? stateMap.blog.tag : "",
      entry: 'thirdpen',
      status: stateMap.isEdit ? stateMap.blog.status : 'Draft'
    };

    const popup = factoryLayerPopup({title: "Add description", content: content, mold: "form"});
    popup.show();
  },
  postForm: e => {
    const form = new FormData(domMap.editor.querySelector(".bl-tuiPopForm"));
    ["title", "tag", "entry", "prologue"].forEach(
      (name) => (stateMap.postForm[name] = form.get(name) || "")
    );
    if (stateMap.isEdit) {
      stateMap.postForm.id = stateMap.blog.ID;
    }
    stateMap.postForm.status = form.get("status") || "Draft";
    stateMap.postForm.content = stateMap.editor.getMarkdown();
    stateMap.postForm.content_html = stateMap.editor.getHtml();
    stateMap.postForm.delete = false;
    //console.info("form", stateMap.postForm);
    model.notify("投稿記事を登録中です。");
    model.blog.post(stateMap.postForm);
  }
};
//custom event---------------------
/* Image uploded */
const onUploadedImage = (event) => {
  const path = event.detail.path;
  const form = new FormData(domMap.editor.querySelector(".bl-tuiPopImage"));
  const params = {};
  ["alt", "title", "float", "width"].forEach(
    (name) => (params[name] = form.get(name) || "")
  );
  const imageUrl = `/api/${path}/${params.width || 250}`;
  const altText = params.alt|| "photo";
  stateMap.editor.exec("AddImage", {altText: altText, imageUrl: imageUrl});
  stateMap.tuiDialog.remove();
};

const initPage = () => {
  const mql = window.matchMedia("(min-width: 800px)");
  const height = configMap.windowHeight - 115;
  // toast ui editor -------------------
  const content = stateMap.isEdit ? stateMap.blog.content : "";
  domMap.editor = document.querySelector("#editor");
  stateMap.editor = toastui.Editor.factory({
    el: domMap.editor,
    height: `${height}px`,
    initialEditType: "markdown",
    initialValue: content,
    previewStyle: mql.matches ? "vertical" : "tag",
    toolbarItems: [
      "divider",
      "heading",
      "bold",
      "italic",
      "strike",
      "divider",
      "hr",
      "quote",
      "divider",
      "ul",
      "ol",
      "task",
      "indent",
      "outdent",
      "divider",
      "table",
      "link",
      "divider",
      "code",
      "codeblock",
    ],
  });

  // Insert a save button at the beginning of the toolbar.
  const toolbar = stateMap.editor.getUI().getToolbar();
  const btnForm = document.createElement("button");
  btnForm.innerHTML = `<i class="material-icons tui-toolbar-icon" listener="popForm">save</i>`;
  toolbar.insertItem(0, {
    type: "button",
    options: {
      el: btnForm,
      tooltip: "Save",
    },
  });
  const btnImg = document.createElement("button");
  btnImg.innerHTML = `<i class="material-icons tui-toolbar-icon" listener="popImg">insert_photo</i>`;
  toolbar.insertItem(1, {
    type: "button",
    options: {
      el: btnImg,
      tooltip: "Insert a photo",
    },
  });
};

// media query min-width: 800px
const onChangeWindow = (event) => {
  const matche = event.detail;
  const style = matche ? "vertical" : "tab";
  stateMap.editor.changePreviewStyle(style);
};

/* 更新 */
const onLoadBlog = (event) => {
  stateMap.blog = event.detail;
  stateMap.isEdit = true;
  initPage();
};

/* 新規投稿
 */
const onLoadTemplate = () => {
  stateMap.isEdit = false;
  initPage();
};

//-------------------- END EVENT HANDLERS --------------------

//------------------- BEGIN PUBLIC METHODS -------------------
const config = (input_map) => {
  spa.util.setConfigMap({
    input_map: input_map,
    config_map: configMap,
  });
};

// Begin public method /initModule/
const init = (container) => {
  const { tuiEditor } = template;
  domMap.container = container;
  //グローバルカスタムイベントのバインド
  spa.gevent.subscribe("editor", "load-blog", onLoadBlog);
  spa.gevent.subscribe("editor", "complete-upload", onUploadedImage);
  // windowサイズの変化を購読する
  spa.gevent.subscribe("editor", "mediaQuery", onChangeWindow);

  domMap.container.innerHTML = tuiEditor({});
  if (configMap.anchor.page.length > 2) {
    //編集ページがある
    model.blog.get(configMap.anchor.page);
  } else {
    //テンプレートの読み込み 新規ページ
    onLoadTemplate();
  }
  shell.config({
    SchemaEventMap: {
      //keyup: keyupHandler,
      change: changeEventMap,
      click: clickEventMap
    }
  });
};

// return public methods
export { config, init };
//------------------- END PUBLIC METHODS ---------------------

// ------------------ Templatre ---------------------------
const template = {
  // dialog:
  image: ({title} = prop) => {
    return `
    <section>
      <h1>${title}</h1>
      <form class="bl-tuiPopImage">
        <div class="bl-tuiPopImage-params">
          <label><input type="radio" name="float" value="float-left" checked>&nbsp;画像左</label>
          <label><input type="radio" name="float" value="float-right">&nbsp;画像右</label>
          <input type="text" name="width" placeholder="width..." pattern="^[0-9]+$" title="Numbers only" value=""/>
        </div>
        <figure class="bl-image">
          <img />
        </figure>
        <input type="file" name="file" listener="upLoad" />
        <input type="text" name="alt" placeholder="altText..." value=""/>
        <input type="text" name="title" placeholder="title..." value=""/>
        <div class="bl-tuiPop-btn">
          <button class="button" listener="saveImage">Save image</button>
          <button class="button cm-close-tuiPop">Cancel</button>
        </div>
      </form>
    </section>`;
  },
  form: ({ title, tag, prologue, entry, status } = blog) => {
    return `
    <section>
      <h1>Post Form</h1>
      <form class="bl-tuiPopForm">
        <div class="bl-tuiPopForm-input">
          <input type="text" name="tag" placeholder="タグを入力" value="${
            tag || ""
          }">
          <input type="text" list="entrySelect" name="entry" placeholder="投稿先グループ..." pattern="^[a-z]+$"atitle="Alphabet only" value="${
            entry || ""
          }">
        </div>
        <label>記事を公開する
        <input type="checkbox" name="status" value="Posted" ${
          status === "Posted" ? "checked" : ""
        }>
        </label>
        <input type="text" name="title" placeholder="タイトル..." value="${
          title || ""
        }">
        <textarea name="prologue" rows="10" cols="70">${prologue||""}</textarea>
        <div class="bl-tuiPop-btn">
          <button class="button" name="save" listener="postForm">Save</button>
          <button class="button cm-close-tuiPop">Cancel</button>
        </div>
      </form>
    </section>`;
  },
  // editor body
  tuiEditor: ({}) => {
    return `
  <section class="el-tuiEditor">
    <h1>Toast-ui Editor</h1>
    <div id="editor"></div>
  </section>`;
  },
};

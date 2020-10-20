package model

/* Thirdpen|Editor
 * Model.go
 */

import (
	"time"
	jwt "github.com/dgrijalva/jwt-go"
)

/* description
 ---Model Node Trees---
 User
	Member
 Entry
	 Blog
		 Comment
 ---ancestor---
 Entry:
 最初に設定したEntryは親キーになるので変更できない
 ---relations---
 ---model---
 ID:
 <datastore>.Keyをencodeしたものでjson:"id"で使う
*/


/* Invitation
---description---
Entry owner is able to invite any user to entry.
---propertoes---
parent.Key Entry Owner
Entry
Receiver Invitation To Email
Token Life is shortly, json token
Completed to be invited False or True
*/
type Invitation struct {
	Entry     string    `datastore:"entry,noindex" json:"entry"`
	Receiver  string    `datastore:"receiver,noindex" json:"receiver"`
	Token     string    `datastore:"token,noindex" json:"token"`
	Completed bool      `datastore:"completed" json:"completed"`
	Date      time.Time `datastore:"date" json:"date"`
}

/* Member
---description---
member of Entry able to post
---properties---
parent.Key: User
Entry: thirdpen, southwind, family etc
Email: email
Role: 1-standared 2-advanced 5-owner 0-retired
Date: update day
*/
type Member struct {
	Entry string    `datastore:"entry" json:"entry"`
	Email string    `datastore:"email,noindex" json:"email"`
	Role  int       `datastore:"role,noindex" json:"role"`
	Date  time.Time `datastore:"date,noindex" json:"date"`
}

/* Entry
---description---
parent.Key	nil
Key	NewKey(stringIDにthink等のテーマ名を使う)
Name	投稿テーマ[think, tech, euler, etc]
State	Comment許可=true、Comment非許可=false	default=false
Date	更新日
*/
type Entry struct {
	Name  string    `datastore:"name,noindex" json:"name"`
	State bool      `datastore:"state,noindex" json:"state"`
	Date  time.Time `datastore:"date,noindex" json:"date"`
}

/* Blog
---description---
url-->/blog/ID
新着記事の表示は投稿日順
Deleteは非表示にする
PosterIDは送信しない
---properties---
parent.Key	Entry.Key
ID	stringid := helper.RandomString(10)
Poster	投稿者email
PosterID	投稿者User.ID
Title	タイトル
Entry　any([think,euler,teck,github],変更できない)
Tag
Date	初稿日
Update	更新日
Excerpt	抜粋 *廃止(2020-10-03
Status	Posted or Draft, default=Draft
Delete 削除=true default=false
IsMathjax 数式を使用 *廃止(2020-10-03
Prologue *追加 2020-10-03
---payload---
Poster & PosterID : user.email & user.id
Date : 初稿時のみサーバー側で登録
Update : 更新ごとにサーバ側で入力
*/
type Blog struct {
	ID          string    `datastore:"id,noindex" josn:"id"`
	Poster      string    `datastore:"poster,noindex" json:"poster"`
	PosterID    string    `datastore:"poster_id,noindex" json:"-"`
	Title       string    `datastore:"title,noindex" json:"title"`
	Entry       string    `datastore:"entry,noindex" json:"entry"`
	Tag         string    `datastore:"tag" json:"tag"`
	Date        time.Time `datastore:"date" json:"date"`
	Update      time.Time `datastore:"update" json:"update"`
	Excerpt     string    `datastore:"excerpt,noindex" json:"excerpt"`
	Prologue     string    `datastore:"prologue,noindex" json:"prologue"`
	Content     string    `datastore:"content,noindex" json:"content"`
	ExcerptHTML string    `datastore:"excerpt_html,noindex" json:"excerpt_html"`
	ContentHTML string    `datastore:"content_html,noindex" json:"content_html"`
	Status      string    `datastore:"status" json:"status"`
	Delete      bool      `datastore:"delete" json:"delete"`
	IsMathjax   bool      `datastore:"is_mathjax,noindex" json:"is_mathjax"`
}

/* Comment
---description---
Deleteは非表示にする
---properties---
parent.Key	Blog.Key
Delete 削除=true default=false
Date	更新日
*/
type Comment struct {
	ID          string    `datastore:"-" josn:"id"`
	BlogID      string    `datastore:"blog_id,noindex" json:"blog_id"`
	Poster      string    `datastore:"name,noindex" json:"name"`
	Content     string    `datastore:"content,noindex" json:"content"`
	ContentHTML string    `datastore:"body_html,noindex" json:"content_html"`
	Delete      bool      `datastore:"delete,noindex" json:"delete"`
	Date        time.Time `datastore:"date" json:"date"`
}

/* --- Jwt handling ---
 * j.Object shortens the storage object key.
 * Uid == Email
 */
type Jwt struct {
	BucketName string
	Object     string
	Uid        string
	Role       int
	Expat      time.Time
	Issuer     string
	Token      string
}

type CustomClaim struct {
	Email string `json:"email"`
	Role  int    `json:"role"`
	*jwt.StandardClaims
}


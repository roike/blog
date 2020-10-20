package model

/* Thirdpen|Editor
 * Method.go
 */

import (
	"context"
	"io/ioutil"
	"net/url"
	"strconv"
	"time"

	"cloud.google.com/go/datastore"
	"cloud.google.com/go/storage"

	jwt "github.com/dgrijalva/jwt-go"

	"github.com/roike/go-util/helper"
)

/* description
modelにデータを書き込むばあいはポインタメッソドを使う
また実態が不要な場合もポインタメッソドを使う
後者の用法は静的な関数の使い方に近い
*/

/* Result of Blog.Query */
type Latest struct {
	Blogs  []*Blog `json:"blogs"`
	Offset string  `json:"offset"`
	Step string  `json:"step"`
	Result string  `json:"result"`
}

const pageNationStep = 5

/* Member.Method
member.Add
member.ListEntry
--description--------
投稿可能なエントリをリストするメソッド
返すのはユーザーを親にするメンバー(=自分自身)のリストだが、
各メンバーは投稿可能なエントリ情報を持っている
ListEntryなのに[]entryではなく[]memberなのはわかりにくい
*/
func (m *Member) Add(cx context.Context, userID string, pjid string) (*datastore.Key, error) {
	client, _ := datastore.NewClient(cx, pjid)
	parentKey := datastore.NameKey("User", userID, nil)
	key := datastore.IncompleteKey( "Member", parentKey)
	m.Date = time.Now()

	return client.Put(cx, key, m)
}

func (m *Member) ListEntry(cx context.Context, userID string, pjid string) ([]*Member, error) {
	client, _ := datastore.NewClient(cx, pjid)
	parentKey := datastore.NameKey("User", userID, nil)
	q := datastore.NewQuery("Member").Ancestor(parentKey)
	var ms []*Member
	if _, err := client.GetAll(cx, q, &ms); err != nil {
		return nil, err
	}
	return ms, nil
}

/* Entry.Method
entry.Put
entry.ListBlog
---- description -----
*/
func (e *Entry) Put(cx context.Context, pjid string) (*datastore.Key, error) {
	client, _ := datastore.NewClient(cx, pjid)
	key := datastore.NameKey("Entry", e.Name, nil)
	e.Date = time.Now()
	return client.Put(cx, key, e)
}

/* Param
 * :entry:tag:offset or :entry:offset
 * p["status"] = Posted or Draft, default=Draft
 */
func (e *Entry) ListBlog(cx context.Context, p map[string]string, pjid string, email string) (*Latest, error) {
	client, _ := datastore.NewClient(cx, pjid)
	// list blog with pageLimit
	// +1 means check digit for last page
	step := pageNationStep
	// Query
	entry := p["entry"]
	offset, _ := strconv.Atoi(p["offset"])
	size := offset + step + 1
	ancestor := datastore.NameKey("Entry", entry, nil)
	q := datastore.NewQuery("Blog").Ancestor(ancestor)
	// TODO: Only poster can edit.
	if status, ok := p["status"]; ok {
		q = q.Filter("status =", status)
	}
	if tag, ok := p["tag"]; ok {
		decodedTag, err := url.QueryUnescape(tag)
		if err != nil {
			return nil, err
		}
		q = q.Filter("tag =", decodedTag)
	}
	q = q.Order("-update").Limit(size).KeysOnly()
	// if q is a "keys-only" query, GetAll ignore dst and only returns the keys
	keys, err := client.GetAll(cx, q, nil)
	if err != nil {
		return nil, err
	}
	result := "completed"
	length := len(keys)
	if length == size {
		offset = ((length / step) - 1) * step
		result = "More"
		length = length - 1
	} else if (length % step) == 0 {
		offset = ((length / step) - 1) * step
		result = "noMore"
	} else if length < size {
		offset = (length / step) * step
		result = "noMore"
	}
	l := keys[offset:length]
	blogs := make([]*Blog, len(l))
	err = client.GetMulti(cx, l, blogs)
	if err != nil {
		return nil, err
	}

	offset = (length / step) * step
	latest := &Latest{}
	latest.Blogs = blogs
	latest.Offset = strconv.Itoa(offset)
	latest.Step = strconv.Itoa(step)
	latest.Result = result

	return latest, nil
}

/* blog.Method
blog.Get
blog.Put
blog.Add
blog.ListComment
*/
func (b *Blog) Get(cx context.Context, p map[string]string, pjid string) error {
	client, _ := datastore.NewClient(cx, pjid)
	// list blog with pageLimit
	entry := p["entry"]
	id := p["id"]
	parentKey := datastore.NameKey("Entry", entry, nil)
	key := datastore.NameKey("Blog", id, parentKey)
	return client.Get(cx, key, b)
}

func (b *Blog) Put(cx context.Context, p map[string]string, pjid string) (*datastore.Key, error) {
	client, _ := datastore.NewClient(cx, pjid)
	parentKey := datastore.NameKey("Entry", b.Entry, nil)
	var stringKey	string
	if ID, ok := p["id"]; ok {
		stringKey = ID
	} else {
		// ID	NewKey(stringIDに10文字のアルファベット)
		stringKey = helper.RandomString(10)
	}
	b.ID = stringKey
	key := datastore.NameKey("Blog", stringKey, parentKey)
	return client.Put(cx, key, b)
}

/* --- Storage handling --- */
func readStorage(ctx context.Context, bucketName, object string) ([]byte, error) {
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, err
	}
	defer client.Close()
	rc, err := client.Bucket(bucketName).Object(object).NewReader(ctx)
	if err != nil {
		return nil, err
	}
	defer rc.Close()

	return ioutil.ReadAll(rc)
}

/* --- Jwt handling --- */
func (j *Jwt) Decode(ctx context.Context) error {
	pubkey, err := readStorage(ctx, j.BucketName, j.Object)
	if err != nil {
		return err
	}

	verifyKey, err := jwt.ParseRSAPublicKeyFromPEM(pubkey)
	if err != nil {
		return err
	}

	// Parse the token
	token, err := jwt.ParseWithClaims(j.Token, &CustomClaim{}, func(token *jwt.Token) (interface{}, error) {
		return verifyKey, nil
	})
	if err != nil {
		return err
	}
	claims := token.Claims.(*CustomClaim)
	j.Uid = claims.Email
	j.Role = claims.Role

	return nil
}

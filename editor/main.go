package main

/* file main
routing-------
map url to function
authentication---
errorHandle------
フロントエンドで内容を表示する場合は以下の２タイプ
1:defaultのInternalServerErrorで対応する場合は
 fmt.Errorf("Failed to get messageList: %v", err)
2:原因が明確な場合は
AppErrorf(http.statusBadRequest, "invalid id %v", err)
サーバ側でエラー出力する場合は
1:存在しないページやadmin管理ページにアクセスがあった場合は
routerのhttp.Errorで対応
-------------------
編集サイト：
投稿者のみが編集閲覧できる
*/

import (
	"context"
	"encoding/json"
	"fmt"
	"image/jpeg"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/storage"

	"github.com/nfnt/resize"

	m "github.com/roike/blog/model"
	rt "github.com/roike/go-util/router"
)

const (
	expiration    = 5 * time.Hour
	maxUploadSize = 10 * 1024 * 1024 /*10MB*/
)
var (
	projectID        string
	bucketName    string
	userApiDecodeKey string
	userEmail		 string
)
func main() {
	projectID = os.Getenv("PROJECT_ID")
	bucketName = os.Getenv("DEFAULT_BUCKET")
	userApiDecodeKey = path.Join("signature", "id_rsa.pub.pkcs8")

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	log.Printf("Listening on port %s", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", port), nil))

}

/* map url to function
(method, url, function)
*/
func init() {
	r := rt.New("/api")
	r.Handle("GET", "/index.html", defaultHandle)
	r.Handle("GET", "/user/property", authHandle)
	r.Handle("GET", "/blog/:entry/:id", getBlogHandle)
	r.Handle("POST", "/blog/add", putBlogHandle)
	r.Handle("POST", "/blog/put/:id", putBlogHandle)
	r.Handle("POST", "/file/upload", uploadHandle)
	r.Handle("GET", "/file/download/:filename/:width", downloadHandle)
	r.Handle("GET", "/heading/:entry/:offset", listBlogHandle)
	r.Handle("GET", "/heading/:entry/:tag/:offset", listBlogHandle)

	r.PanicHandler = panicHandle
	r.Wrapper = checkAuthen

	// Use only if the server can save the file.
	//r.FileServe("/:filepath", http.Dir("/editor/static"))

	http.Handle("/", r)
}

func panicHandle(h http.ResponseWriter, r *http.Request, p interface{}) {
	log.Printf("Raised panic %v", p)
}

/* Wrapper
If there is no token, redirect defaultHandler.
But if request.Method is Post without token, then throw it away.
if Method with GET not but login has not token, then redirect "/"
*/
func checkAuthen(r *http.Request, urlPath string) (string, error) {
	log.Printf("urlPath %s.", urlPath)
	// Skip
	if urlPath == "/file/upload" {
		return urlPath, nil
	}
	matched := strings.HasPrefix(urlPath, "/file/download")
	if matched {
		return urlPath, nil
	}
	// End Skip
	//---Check token--------------------------------
	auth := r.Header.Get("Authorization")
	if !(strings.HasPrefix(auth, "Bearer")) {
		return "/index.html", nil
	}
	fields := strings.Fields(auth)
	if len(fields) != 2 {
		return "/index.html", nil
	}
	token := fields[1]
	if token == "" {
		log.Printf("Request is without token.")
		return "/index.html", nil
	}
	ctx := context.Background()
	j := m.Jwt{}
	j.BucketName = bucketName
	j.Object = userApiDecodeKey
	j.Token = token
	err := j.Decode(ctx)
	if err != nil {
		log.Printf("Request'token is invalid. Error: %s", err)
		return "", rt.AppErrorf(http.StatusUnauthorized, "Token is invalid.", err)
	}
	userEmail = j.Uid

	return urlPath, nil
}

var defaultHandle rt.AppHandle = func(w io.Writer, r *http.Request, _ rt.Param) error {
	content, err := ioutil.ReadFile(path.Join("editor", "static", "index.html"))
	// use only localtest
	//content, err := ioutil.ReadFile(path.Join("static", "index.html"))
	if err != nil {
		return fmt.Errorf("Failed to get statioc files: %v", err)
	}

	fmt.Fprintf(w, "%s", content)
	return nil
}

/* GET:/user/property
------------
*/
var authHandle rt.AppHandle = func(w io.Writer, r *http.Request, _ rt.Param) error {
	ctx := context.Background()
	reply := &struct {
		//StayList    []*m.Stay	`json:"stayList"`
		//MessageList []*m.Message	`json:"messageList"`
		Entry      []string  `json:"entry"`
	}{}

	// 投稿可能なエントリを抽出する
	member := &m.Member{}
	members, err := member.ListEntry(ctx, userEmail, projectID)
	if err != nil {
		log.Printf("Failed to fetch entry to be able to post by user: %v", err)
		return fmt.Errorf("Failed to get Entry for user: %v", err)
	}
	if len(members) == 0 {
		log.Printf("Not have any Entry for user: %v", err)
		return fmt.Errorf("No entries you have")
	}
	var entries []string
	for _, mber := range members {
		entries = append(entries, mber.Entry)
	}
	reply.Entry = entries

	return json.NewEncoder(w).Encode(reply)
}

/* GET:/blog/:entry/:id
 * GET:/marked/:entry/:id
 */
var getBlogHandle rt.AppHandle = func(w io.Writer, r *http.Request, p rt.Param) error {
	c := context.Background()
	blog := &m.Blog{}
	if err := blog.Get(c, p, projectID); err != nil {
		return fmt.Errorf("Failed to get blog: %v", err)
	}
	return json.NewEncoder(w).Encode(blog)
}

/* 
 *POST:/blog/add
 *POST:/blog/put/:id
 *put only by owner
*/
var putBlogHandle rt.AppHandle = func(w io.Writer, r *http.Request, p rt.Param) error {
	defer r.Body.Close()
	c := context.Background()
	blog := &m.Blog{}
	err := json.NewDecoder(r.Body).Decode(blog)
	if err != nil {
		log.Printf("Failed to post: %v", err)
		return fmt.Errorf("Failed to post: %v", err)
	}
	blog.Poster = userEmail
	blog.Update = time.Now()
	_, err = blog.Put(c, p, projectID)
	if err != nil {
		return fmt.Errorf("Failed to post: %v", err)
	}
	return json.NewEncoder(w).Encode(blog)
}

/* GET:/latest/:entry/:tag/:offset
 *GET:/latest/:entry/:offset
*/
var listBlogHandle rt.AppHandle = func(w io.Writer, r *http.Request, p rt.Param) error {
	c := context.Background()
	entry := &m.Entry{}
	reply, err := entry.ListBlog(c, p, projectID, userEmail)
	if err != nil {
		return fmt.Errorf("Failed to fetch Blogs.", err)
	}
	return json.NewEncoder(w).Encode(reply)
}

/* POST:/file/upload
画像のアップロード
*/
var uploadHandle rt.AppHandle = func(w io.Writer, r *http.Request, p rt.Param) error {
	c := context.Background()
	if err := r.ParseMultipartForm(maxUploadSize); err != nil {
		return rt.AppErrorf(http.StatusBadRequest, "File is too big")
	}
	form, handle, err := r.FormFile("file")
	if err != nil {
		return rt.AppErrorf(http.StatusBadRequest, "File is inVaild")
	}
	defer form.Close()

	client, err := storage.NewClient(c)
	if err != nil {
		return fmt.Errorf("failed to create client: %v", err)
	}
	defer client.Close()

	savePath := path.Join("user", userEmail, handle.Filename)
	wc := client.Bucket(bucketName).Object(savePath).NewWriter(c)
	wc.ContentType = handle.Header.Get("Content-Type")
	size, err := io.Copy(wc, form)
	if err != nil {
		return fmt.Errorf("failed to copy bucket: %v", err)
	}
	log.Printf("file size: %v", size)
	if err := wc.Close(); err != nil {
		return fmt.Errorf("failed to copy bucket: %v", err)
	}
	// Success process---
	reply := &struct {
		Path    string `json:"path"`
		Content string `json:"content"`
	}{}
	reply.Path = path.Join("file", "download", handle.Filename)
	reply.Content = "success"

	return json.NewEncoder(w).Encode(reply)
}

/* GET:/file/download/:filename/:width
reads the named file in Google Cloud Storage
*/
var downloadHandle rt.AppHandle = func(w io.Writer, r *http.Request, p rt.Param) error {
	c := context.Background()
	client, err := storage.NewClient(c)
	if err != nil {
		log.Printf("Failed to create client: %v", err)
		return fmt.Errorf("failed to create client: %v", err)
	}
	defer client.Close()

	savePath := path.Join("user", userEmail, p["filename"])
	log.Printf("savePath: %v", savePath)
	rc, err := client.Bucket(bucketName).Object(savePath).NewReader(c)
	if err != nil {
		log.Printf("Failed to get object: %v", err)
		return fmt.Errorf("failed to get object from bucket: %v", err)
	}
	defer rc.Close()
	// decode jpeg into image.Image
	img, err := jpeg.Decode(rc)
	if err != nil {
		log.Printf("Failed to decode bucket: %v", err)
		return fmt.Errorf("failed to decode object from bucket: %v", err)
	}
	// resize to :width using Lanczos resampling
	// and preserve aspect ratio
	u64, err := strconv.ParseUint(p["width"], 10, 32)
	if err != nil {
		log.Printf("Failed to parse uinti for image : %v", err)
		return fmt.Errorf("failed to parse resize: %v", err)
	}
	width := uint(u64)
	imgResized := resize.Resize(width, 0, img, resize.Lanczos3)
	// write resized image to io.Writer
	jpeg.Encode(w, imgResized, nil)

	return nil
}

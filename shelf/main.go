package main

/* Thirdpen|Bookshelf
 *main.go
 */

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path"
	"strings"

	m "github.com/roike/blog/model"
	rt "github.com/roike/go-util/router"
)

const (
	host = "thirdpen"
)
var (
	projectID     string
	bucketName    string
)
func main() {
	projectID = os.Getenv("PROJECT_ID")
	bucketName = os.Getenv("DEFAULT_BUCKET")

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	log.Printf("Listening on port %s", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%s", port), nil))

}
func init() {
	r := rt.New("/api")
	r.Handle("GET", "/index.html", defaultHandle)
	r.Handle("GET", "/blog/:id", getBlogHandle)
	r.Handle("GET", "/heading/:offset", listBlogHandle)
	r.Handle("GET", "/heading/:tag/:offset", listBlogHandle)

	r.PanicHandler = panicHandle
	r.Wrapper = checkToken

	http.Handle("/", r)
}

func panicHandle(h http.ResponseWriter, r *http.Request, p interface{}) {
	log.Fatal("Raised panic %v", p)
}

func checkToken(r *http.Request, urlPath string) (string, error) {
	log.Printf("urlPath %s.", urlPath)
	// Skip

	// Check token
	auth := r.Header.Get("Authorization")
	if !(strings.HasPrefix(auth, "Bearer")) {
		return "/index.html", nil
	}
	fields := strings.Fields(auth)
	if len(fields) != 2 {
		return "/index.html", nil
	}
	return urlPath, nil
}

var defaultHandle rt.AppHandle = func(w io.Writer, r *http.Request, _ rt.Param) error {
	content, err := ioutil.ReadFile(path.Join("shelf", "static", "index.html"))
	// use only localtest
	//content, err := ioutil.ReadFile(path.Join("static", "index.html"))
	if err != nil {
		return fmt.Errorf("Failed to get statioc files: %v", err)
	}

	fmt.Fprintf(w, "%s", content)
	return nil
}

/* GET:/blog/:id
 */
var getBlogHandle rt.AppHandle = func(w io.Writer, r *http.Request, p rt.Param) error {
	c := context.Background()
	blog := &m.Blog{}
	p["entry"] = host
	if err := blog.Get(c, p, projectID); err != nil {
		return fmt.Errorf("Failed to get blog: %v", err)
	}
	if blog.Status != "Posted" {
		return fmt.Errorf("Not permitted to fetch bolg which's status is draft")
	}
	return json.NewEncoder(w).Encode(blog)
}

/* GET:/latest/:tag/:offset
*GET:/latest/:offset
*/
var listBlogHandle rt.AppHandle = func(w io.Writer, r *http.Request, p rt.Param) error {
	c := context.Background()
	entry := &m.Entry{}
	p["entry"] = host
	p["status"] = "Posted"
	reply, err := entry.ListBlog(c, p, projectID, "")
	if err != nil {
		return fmt.Errorf("Failed to fetch Blogs.", err)
	}
	return json.NewEncoder(w).Encode(reply)
}

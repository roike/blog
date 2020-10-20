package model

/* use go test -v  */

import (
	"context"
	"path"
	"testing"

	jwt "github.com/dgrijalva/jwt-go"
)

type Param map[string] string
func TestBlog(t *testing.T) {

	// test ListBlog--------------
	t.Logf("Test to get list of blogs")
	c := context.Background()
	entry := &Entry{}
	p := make(Param)
	p["entry"] = "thirdpen"
	p["offset"] = "0"
	p["status"] = "Posted"
	latest, err := entry.ListBlog(c, p, "thirdpen", "")
	if err != nil {
		t.Fatal(err)
	}
	// Set reverse index as latest.Blogs is sorted desc updated
	// reverseIndex is len(blogs) - 3 - 1
	if len(latest.Blogs) != 5 {
		t.Fatalf("wanted len 3 but result is failed")
	}
	t.Logf("Test finished.")
}

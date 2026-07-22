package vistorias

import (
	"io"
	"mime/multipart"
	"os"
)

// multipartFileHeader envolve *multipart.FileHeader para dar um helper
// saveTo(dstPath) sem duplicar o loop de cópia em cada handler.
type multipartFileHeader struct {
	*multipart.FileHeader
}

func wrapFiles(fhs []*multipart.FileHeader) []*multipartFileHeader {
	out := make([]*multipartFileHeader, 0, len(fhs))
	for _, fh := range fhs {
		out = append(out, &multipartFileHeader{fh})
	}
	return out
}

func (m *multipartFileHeader) saveTo(dstPath string) error {
	src, err := m.Open()
	if err != nil {
		return err
	}
	defer src.Close()
	dst, err := os.Create(dstPath)
	if err != nil {
		return err
	}
	defer dst.Close()
	_, err = io.Copy(dst, src)
	return err
}

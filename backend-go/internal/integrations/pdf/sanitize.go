package pdf

import "regexp"

var (
	reBrackets   = regexp.MustCompile(`[()\[\]{}]`)
	reSpaces     = regexp.MustCompile(`\s+`)
	reOtherChars = regexp.MustCompile(`[^a-zA-Z0-9._-]`)
	reUnderscore = regexp.MustCompile(`_+`)
)

// sanitizeFileName replica sanitizeFileName do pdfService.js: remove
// ()[]{}, colapsa espaços/underscores repetidos e cai para "documento" se o
// resultado ficar vazio. Não depende de nenhuma lib nativa de PDF — pode ser
// usada mesmo antes da implementação real do Service.
func sanitizeFileName(name string) string {
	n := reBrackets.ReplaceAllString(name, "")
	n = reSpaces.ReplaceAllString(n, "_")
	n = reOtherChars.ReplaceAllString(n, "_")
	n = reUnderscore.ReplaceAllString(n, "_")
	n = trimUnderscores(n)
	if n == "" {
		return "documento"
	}
	return n
}

func trimUnderscores(s string) string {
	start, end := 0, len(s)
	for start < end && s[start] == '_' {
		start++
	}
	for end > start && s[end-1] == '_' {
		end--
	}
	return s[start:end]
}

package whatsapp

import (
	"regexp"

	"go.mau.fi/whatsmeow/types"
)

var nonDigit = regexp.MustCompile(`\D`)

// FormatPhoneNumber replica EXATAMENTE a regra brasileira do 9º dígito usada
// pelo Node (routes/whatsappRoutes.js `formatPhoneNumber`). O resultado final
// DEVE ter 12 dígitos (55 + DDD com 2 dígitos + 8 dígitos de linha, sem o "9"
// extra dos celulares modernos). Casos tratados:
//
//   - 13 dígitos (55 + DDD + 9 + 8 dígitos) com o 5º dígito == '9' → remove esse dígito.
//   - 11 dígitos (DDD + 9 + 8 dígitos, sem 55) com o 3º dígito == '9' → remove
//     esse dígito e prefixa "55".
//   - 10 dígitos (DDD + 8 dígitos, sem 55 e sem 9) → apenas prefixa "55".
//   - Qualquer outro tamanho após as normalizações → retorna "", false (inválido,
//     abortar envio, igual ao Node que retorna null).
//
// Retorna o número puro (12 dígitos, sem sufixo @s.whatsapp.net) e ok=true se válido.
func FormatPhoneNumber(raw string) (string, bool) {
	digits := nonDigit.ReplaceAllString(raw, "")

	switch len(digits) {
	case 13:
		// 55 DD 9 NNNNNNNN — 5º caractere (índice 4) é o "9" extra.
		if digits[4] == '9' {
			digits = digits[:4] + digits[5:]
		}
	case 11:
		// DD 9 NNNNNNNN — 3º caractere (índice 2) é o "9" extra.
		if digits[2] == '9' {
			digits = digits[:2] + digits[3:]
		}
		digits = "55" + digits
	case 10:
		// DD NNNNNNNN, sem o 9 e sem 55.
		digits = "55" + digits
	}

	if len(digits) != 12 {
		return "", false
	}
	return digits, true
}

// ToJID converte um telefone bruto no types.JID de destino (usuário no servidor
// padrão do WhatsApp), aplicando a normalização brasileira acima.
func ToJID(rawPhone string) (types.JID, bool) {
	num, ok := FormatPhoneNumber(rawPhone)
	if !ok {
		return types.JID{}, false
	}
	return types.NewJID(num, types.DefaultUserServer), true
}

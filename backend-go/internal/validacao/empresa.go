package validacao

// SoDigitos devolve só os números de s.
func SoDigitos(s string) string {
	b := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		if s[i] >= '0' && s[i] <= '9' {
			b = append(b, s[i])
		}
	}
	return string(b)
}

// CNPJValido confere os dois dígitos verificadores (14 dígitos, não repetidos).
func CNPJValido(s string) bool {
	d := SoDigitos(s)
	if len(d) != 14 {
		return false
	}
	iguais := true
	for i := 1; i < 14; i++ {
		if d[i] != d[0] {
			iguais = false
			break
		}
	}
	if iguais {
		return false
	}
	pesos := []int{6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2}
	for _, n := range []int{12, 13} {
		soma := 0
		for i := 0; i < n; i++ {
			soma += int(d[i]-'0') * pesos[13-n+i]
		}
		dv := soma % 11
		if dv < 2 {
			dv = 0
		} else {
			dv = 11 - dv
		}
		if int(d[n]-'0') != dv {
			return false
		}
	}
	return true
}

// UFs válidas.
var ufs = map[string]bool{"AC": true, "AL": true, "AP": true, "AM": true, "BA": true, "CE": true, "DF": true, "ES": true, "GO": true, "MA": true, "MT": true, "MS": true, "MG": true, "PA": true, "PB": true, "PR": true, "PE": true, "PI": true, "RJ": true, "RN": true, "RS": true, "RO": true, "RR": true, "SC": true, "SP": true, "SE": true, "TO": true}

// UFValida: sigla de estado brasileiro (maiúscula).
func UFValida(s string) bool { return ufs[s] }

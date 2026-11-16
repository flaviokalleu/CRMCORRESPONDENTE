package validacao

import "testing"

func TestCNPJValido(t *testing.T) {
	casos := map[string]bool{"11.222.333/0001-81": true, "11222333000181": true, "11.222.333/0001-80": false, "00.000.000/0000-00": false, "123": false}
	for c, quer := range casos {
		if CNPJValido(c) != quer {
			t.Errorf("CNPJValido(%q) = %v, quer %v", c, !quer, quer)
		}
	}
}

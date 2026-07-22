package auth

import "golang.org/x/crypto/bcrypt"

// bcryptCost padronizado (o Node misturava 10 e 12; o bcrypt lê o cost do próprio
// hash, então hashes antigos continuam válidos). Ver gotcha 01-spec §7.16.
const bcryptCost = 10

func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcryptCost)
	return string(b), err
}

func CheckPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

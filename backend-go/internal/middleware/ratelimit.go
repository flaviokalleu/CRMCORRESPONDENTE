package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// ipRateLimiter é um limitador simples de janela deslizante por IP, em memória.
// Substitui o loginLimiter (10 req / 15 min) do Node sem dependências externas.
type ipRateLimiter struct {
	mu     sync.Mutex
	hits   map[string][]time.Time
	limit  int
	window time.Duration
}

func newIPRateLimiter(limit int, window time.Duration) *ipRateLimiter {
	l := &ipRateLimiter{hits: make(map[string][]time.Time), limit: limit, window: window}
	go l.gc()
	return l
}

func (l *ipRateLimiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := time.Now()
	cutoff := now.Add(-l.window)
	kept := l.hits[ip][:0]
	for _, t := range l.hits[ip] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= l.limit {
		l.hits[ip] = kept
		return false
	}
	l.hits[ip] = append(kept, now)
	return true
}

func (l *ipRateLimiter) gc() {
	for range time.Tick(l.window) {
		l.mu.Lock()
		cutoff := time.Now().Add(-l.window)
		for ip, ts := range l.hits {
			kept := ts[:0]
			for _, t := range ts {
				if t.After(cutoff) {
					kept = append(kept, t)
				}
			}
			if len(kept) == 0 {
				delete(l.hits, ip)
			} else {
				l.hits[ip] = kept
			}
		}
		l.mu.Unlock()
	}
}

// RateLimit devolve um middleware Gin que limita por IP.
func RateLimit(limit int, window time.Duration) gin.HandlerFunc {
	l := newIPRateLimiter(limit, window)
	return func(c *gin.Context) {
		if !l.allow(c.ClientIP()) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Muitas tentativas. Tente novamente mais tarde."})
			return
		}
		c.Next()
	}
}

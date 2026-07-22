package whatsapp

import (
	"context"
	"fmt"

	"go.mau.fi/whatsmeow"
	"go.mau.fi/whatsmeow/proto/waE2E"
	"go.mau.fi/whatsmeow/types"
	"google.golang.org/protobuf/proto"
)

// sendText replica `sock.sendMessage(jid, { text: mensagem })`, devolvendo o
// ID da mensagem enviada (equivalente a `result.key.id`).
func sendText(ctx context.Context, client *whatsmeow.Client, jid types.JID, text string) (string, error) {
	msg := &waE2E.Message{
		Conversation: proto.String(text),
	}
	resp, err := client.SendMessage(ctx, jid, msg)
	if err != nil {
		return "", fmt.Errorf("whatsapp: enviar mensagem: %w", err)
	}
	return resp.ID, nil
}

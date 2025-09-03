// ai/gemini.go
package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

type genPart struct {
	Text string `json:"text"`
}
type genContent struct {
	Role  string    `json:"role"`
	Parts []genPart `json:"parts"`
}
type genReq struct {
	Contents []genContent `json:"contents"`
}
type genResp struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	PromptFeedback any `json:"promptFeedback"`
}

func CallGemini(ctx context.Context, message string) (string, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return "", fmt.Errorf("GEMINI_API_KEY not set")
	}

	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

	body := genReq{
		Contents: []genContent{
			{Role: "user", Parts: []genPart{{Text: message}}},
		},
	}
	jsonBody, _ := json.Marshal(body)

	req, _ := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-goog-api-key", apiKey)

	client := &http.Client{Timeout: 20 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("gemini request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("gemini error %d: %s", resp.StatusCode, string(b))
	}

	var out genResp
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}
	if len(out.Candidates) == 0 {
		return "", fmt.Errorf("no candidates returned")
	}
	parts := out.Candidates[0].Content.Parts
	if len(parts) == 0 || parts[0].Text == "" {
		return "", fmt.Errorf("empty candidate content")
	}
	return parts[0].Text, nil
}

// Convenience wrapper matching your old signature
func CallGeminiSimple(message string) (string, error) {
	return CallGemini(context.Background(), message)
}

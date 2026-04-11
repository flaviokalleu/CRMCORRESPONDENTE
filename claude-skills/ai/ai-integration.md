# Skill: AI Integration

## Purpose
Integrate AI services (Gemini, Claude, OpenAI) effectively and cost-efficiently.

## Rules

### API Usage
- Always set `maxTokens`/`max_output_tokens` to limit response size and cost
- Use streaming for long-running generations to improve perceived latency
- Implement exponential backoff for rate limit errors (429)
- Cache AI responses for identical inputs when the output is deterministic
- Set reasonable timeouts (30s for simple queries, 120s for complex analysis)

### Prompt Engineering
```javascript
// Structured prompt pattern
const prompt = `
You are a real estate analyst for a CRM system in Brazil.

Context:
- Client: ${cliente.nome}
- Property value: R$ ${imovel.valor}
- Monthly income: R$ ${cliente.valor_renda}
- Financing type: ${cliente.tipo_financiamento}

Task: Analyze whether this client qualifies for this property financing.

Rules:
- Monthly payment should not exceed 30% of income
- Consider FGTS eligibility
- Respond in Brazilian Portuguese

Output format:
{
  "qualified": true/false,
  "reason": "explanation",
  "max_financing": number,
  "recommendations": ["list of suggestions"]
}
`;
```

### Cost Management
- Use the cheapest model that meets quality requirements
- Haiku/Flash for classification, extraction, simple analysis
- Sonnet/Pro for complex reasoning, code generation
- Opus for critical decisions requiring highest accuracy
- Monitor token usage per feature — set budget alerts
- Cache common analyses to avoid repeated API calls

### Error Handling
```javascript
async function callAI(prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await ai.generateContent(prompt);
      return JSON.parse(response.text());
    } catch (error) {
      if (error.status === 429 && i < retries - 1) {
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      if (error.status === 400) {
        throw new AppError('Erro na análise AI — verifique os dados', 400);
      }
      throw error;
    }
  }
}
```

### Safety
- Validate AI outputs before using in business logic
- Don't pass sensitive data (CPF, passwords) to AI services unless necessary
- Sanitize AI-generated content before rendering in the UI
- Log prompts and responses for debugging (redact PII)
- Implement fallback behavior when AI service is unavailable
- Never let AI responses directly execute code or database queries

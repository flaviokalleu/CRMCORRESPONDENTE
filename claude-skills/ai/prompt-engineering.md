# Skill: Prompt Engineering

## Purpose
Write effective prompts that produce consistent, high-quality AI outputs.

## Rules

### Prompt Structure
1. **Role**: Define who the AI is acting as
2. **Context**: Provide relevant background information
3. **Task**: Clear, specific instruction of what to do
4. **Constraints**: Rules, limitations, and requirements
5. **Output format**: Exact structure of the expected response
6. **Examples**: One or two examples of correct output (few-shot)

### Techniques
- **Be specific**: "List 3 risks" not "Analyze risks"
- **Set boundaries**: "Respond in under 200 words" / "Return only JSON"
- **Use delimiters**: Triple backticks, XML tags, or headers to separate sections
- **Chain of thought**: "Think step by step" for complex reasoning
- **Few-shot examples**: Show 1-2 examples of the desired input/output pair

### Output Reliability
```
Return ONLY valid JSON matching this exact schema:
{
  "score": number (0-100),
  "category": "aprovado" | "reprovado" | "analise",
  "details": string
}

Do not include any text before or after the JSON.
```

### Anti-Patterns
- Don't ask open-ended questions when you need structured output
- Don't provide contradictory instructions
- Don't rely on the AI remembering context from previous calls (stateless)
- Don't use ambiguous language: "maybe consider" vs "you must include"
- Don't overload a single prompt with multiple unrelated tasks

### Testing Prompts
- Test with edge cases: empty data, very long input, special characters
- Verify output parsing succeeds for all tested cases
- Run the same prompt 5 times to check consistency
- A/B test prompt variations for quality improvement
- Log actual outputs to identify failure patterns over time

### Brazilian Portuguese Considerations
- Instruct the AI to respond in Portuguese when user-facing
- Provide Portuguese examples in few-shot prompts
- Use Brazilian financial terms (FGTS, INSS, ITBI) in the context
- Validate that the AI uses correct Brazilian formatting (R$, CPF, dates as dd/mm/yyyy)

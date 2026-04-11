# Skill: AI Data Processing

## Purpose
Process, transform, and analyze data efficiently using AI and traditional methods.

## Rules

### Data Pipeline Pattern
```
Input -> Validate -> Clean -> Transform -> Analyze -> Output
```

### Validation
- Validate data shape and types before processing
- Reject records with missing required fields — log and continue for optional fields
- Check for data anomalies: negative values, future dates, impossible ranges
- Report validation summary: total records, valid, invalid, skipped

### Cleaning
```javascript
function cleanClienteData(raw) {
  return {
    nome: raw.nome?.trim().replace(/\s+/g, ' '),
    cpf: raw.cpf?.replace(/\D/g, ''),         // Remove formatting
    telefone: raw.telefone?.replace(/\D/g, ''), // Digits only
    email: raw.email?.trim().toLowerCase(),
    valor_renda: parseFloat(
      raw.valor_renda?.toString().replace(/[R$\s.]/g, '').replace(',', '.')
    ) || 0
  };
}
```

### Batch Processing
- Process in chunks (100-500 records) to manage memory
- Use database transactions for batch inserts
- Implement progress tracking for long-running operations
- Allow resumption from the last successful chunk on failure
- Log processing stats: records/second, errors, duration

### AI-Assisted Analysis
- Pre-process data to reduce tokens sent to AI (remove irrelevant fields)
- Batch multiple items into a single AI call when possible
- Parse AI responses immediately and validate the structure
- Implement fallback to rule-based analysis when AI is unavailable
- Store raw AI responses alongside parsed results for debugging

### Export Patterns
- Support multiple formats: JSON, CSV, PDF
- Stream large exports to avoid memory issues
- Include metadata: generation date, filters applied, total count
- Use appropriate content-type and content-disposition headers
- Generate exports asynchronously for large datasets — notify when ready

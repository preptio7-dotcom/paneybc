# CA MCQ Import Guide

To import questions into the platform, use the following pipe-separated format. Each question should be on a new line.

## Format Line
`questionNumber|chapterCode(optional)|questionText|option1|option2|option3|option4|correctIndex|explanation|difficulty`

### Field Breakdown
1. **questionNumber**: (Number) e.g., `1`
2. **chapterCode (optional)**: The chapter code (e.g., `CH1`).
3. **questionText**: The MCQ text.
4. **option1 to option4**: The four possible answers.
5. **correctIndex**: (Number or comma-separated list) The index(es) of the correct answer (1 to 4). Example: `2` or `1,3`.
6. **explanation**: (Optional) Text explaining the answer.
7. **difficulty**: (Optional) `easy`, `medium`, or `hard`. Defaults to `medium`.

---

## Example (Direct Paste)
```text
1|CH1|What is the capital of France?|London|Paris|Berlin|Madrid|2|Paris is the capital.|easy
2|CH2|Select all correct statements.|A|B|C|D|1,3|A and C are correct.|medium
```

---

## Tips
- Ensure you have exactly **4 options**.
- The **correctIndex** must be between **1 and 4**.
- Do not use the pipe character (`|`) inside your question or option text.
- For PDF uploads, ensure the text in the PDF follows this exact structure for the engine to parse it.

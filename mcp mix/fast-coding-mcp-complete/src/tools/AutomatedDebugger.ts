// src/tools/AutomatedDebugger.ts

interface DebugSuggestion {
  confidence: number; // Confidence score from 0 to 1
  message: string;
}

export class AutomatedDebugger {
  public static debug(code: string, error: string): DebugSuggestion[] {
    const suggestions: DebugSuggestion[] = [];

    // Run all available checkers
    suggestions.push(...this.checkReferenceError(code, error));
    suggestions.push(...this.checkTypeError(code, error));
    suggestions.push(...this.checkSyntaxError(code, error));

    if (suggestions.length === 0) {
      suggestions.push({
        confidence: 0.1,
        message:
          'Could not automatically determine the cause of the error. It might be a logic issue.',
      });
    }

    // Sort by confidence
    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private static checkReferenceError(
    code: string,
    error: string
  ): DebugSuggestion[] {
    const suggestions: DebugSuggestion[] = [];
    const refErrorRegex = /(\w+) is not defined/;
    const match = error.match(refErrorRegex);

    if (match && match[1]) {
      const variableName = match[1];
      const declarationRegex = new RegExp(
        `(let|const|var|function|class)\s+${variableName}`
      );
      if (!declarationRegex.test(code)) {
        suggestions.push({
          confidence: 0.9,
          message: `The variable '${variableName}' seems to be used without being declared. Did you forget to declare it with 'let', 'const', or 'var'?`,
        });
      }
    }
    return suggestions;
  }

  private static checkTypeError(
    code: string,
    error: string
  ): DebugSuggestion[] {
    const suggestions: DebugSuggestion[] = [];
    const typeErrorRegex = /Cannot read properties of (undefined|null)/;

    if (typeErrorRegex.test(error)) {
      suggestions.push({
        confidence: 0.7,
        message:
          "A 'TypeError' often occurs when you try to access a property on an object that is 'null' or 'undefined'. Check the variables involved in the failing line to ensure they are initialized before use.",
      });
    }
    return suggestions;
  }

  private static checkSyntaxError(
    code: string,
    error: string
  ): DebugSuggestion[] {
    const suggestions: DebugSuggestion[] = [];
    const openBrackets = (code.match(/\(|\[|\{/g) || []).length;
    const closeBrackets = (code.match(/\)|\]|\}/g) || []).length;

    if (openBrackets !== closeBrackets) {
      suggestions.push({
        confidence: 0.85,
        message: `Found a mismatch in brackets/parentheses. Opened: ${openBrackets}, Closed: ${closeBrackets}. Please check your code for missing or extra brackets.`,
      });
    }
    return suggestions;
  }
}

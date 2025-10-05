// src/tools/AutomatedRefactor.ts
import * as ts from 'typescript';

interface RefactorOptions {
  functionName?: string;
  // Other options can be added here
}

export class AutomatedRefactor {
  public static refactor(
    code: string,
    refactoringType: string,
    options: RefactorOptions
  ): string {
    switch (refactoringType) {
      case 'convert-to-arrow-function':
        return this.convertToArrowFunction(code, options);
      default:
        throw new Error(`Unsupported refactoring type: ${refactoringType}`);
    }
  }

  private static convertToArrowFunction(
    code: string,
    options: RefactorOptions
  ): string {
    const sourceFile = ts.createSourceFile(
      'temp.ts',
      code,
      ts.ScriptTarget.Latest,
      true
    );
    let transformation: { oldText: string; newText: string } | null = null;

    const findFunction = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        // If a specific function name is provided, only target that one
        if (
          options.functionName &&
          node.name.getText(sourceFile) !== options.functionName
        ) {
          return;
        }

        const functionName = node.name.getText(sourceFile);
        const params = node.parameters
          .map(p => p.getText(sourceFile))
          .join(', ');
        const body = node.body?.getText(sourceFile) || '{}';

        const oldText = node.getText(sourceFile);
        const newText = `const ${functionName} = (${params}) => ${body};`;

        // Store the first transformation found and stop searching
        if (!transformation) {
          transformation = { oldText, newText };
        }
        return; // Stop after finding the first one
      }
      ts.forEachChild(node, findFunction);
    };

    findFunction(sourceFile);

    if (transformation) {
      return code.replace(transformation.oldText, transformation.newText);
    }

    throw new Error('Could not find a suitable function to convert.');
  }
}

// test/BoilerplateGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { BoilerplateGenerator } from '../src/tools/BoilerplateGenerator.js';

describe('BoilerplateGenerator', () => {
  it('should generate a correct Express route boilerplate', () => {
    const code = BoilerplateGenerator.generate('express-route', {
      path: '/test',
      methodName: 'post',
      functionName: 'testHandler',
    });
    expect(code).toContain("import { Request, Response } from 'express';");
    expect(code).toContain(
      'export const testHandler = (req: Request, res: Response) =>'
    );
    expect(code).toContain("res.json({ message: 'This is the /test route' });");
    expect(code).toContain("app.post('/test', testHandler);");
  });

  it('should generate a correct React component boilerplate', () => {
    const code = BoilerplateGenerator.generate('react-component', {
      componentName: 'TestComponent',
      stateName: 'items',
      stateType: 'string[]',
    });
    expect(code).toContain(
      "import React, { useState, useEffect } from 'react';"
    );
    expect(code).toContain('interface TestComponentProps');
    expect(code).toContain(
      'const TestComponent: React.FC<TestComponentProps> = (props) =>'
    );
    expect(code).toContain(
      'const [items, setItems] = useState<string[] | null>(null);'
    );
    expect(code).toContain('export default TestComponent;');
  });

  it('should use default options when none are provided', () => {
    const expressCode = BoilerplateGenerator.generate('express-route', {});
    expect(expressCode).toContain('/new-route');
    expect(expressCode).toContain('get');

    const reactCode = BoilerplateGenerator.generate('react-component', {});
    expect(reactCode).toContain('NewComponent');
    expect(reactCode).toContain(
      'const [data, setData] = useState<any | null>(null);'
    );
  });

  it('should throw an error for an unknown boilerplate type', () => {
    expect(() => {
      BoilerplateGenerator.generate('unknown-type', {});
    }).toThrow('Unknown boilerplate type: unknown-type');
  });
});

// src/tools/BoilerplateGenerator.ts

interface BoilerplateOptions {
  [key: string]: any;
}

export class BoilerplateGenerator {
  public static generate(type: string, options: BoilerplateOptions): string {
    switch (type) {
      case 'express-route':
        return this.generateExpressRoute(options);
      case 'react-component':
        return this.generateReactComponent(options);
      default:
        throw new Error(`Unknown boilerplate type: ${type}`);
    }
  }

  private static generateExpressRoute(options: BoilerplateOptions): string {
    const {
      path = '/new-route',
      methodName = 'get',
      functionName = 'newRouteHandler',
    } = options;
    return `
// Generated Express Route
import { Request, Response } from 'express';

export const ${functionName} = (req: Request, res: Response) => {
  res.json({ message: 'This is the ${path} route' });
};

// Add this to your Express app:
// app.${methodName}('${path}', ${functionName});
`;
  }

  private static generateReactComponent(options: BoilerplateOptions): string {
    const {
      componentName = 'NewComponent',
      stateName = 'data',
      stateType = 'any',
    } = options;
    return `
// Generated React Component
import React, { useState, useEffect } from 'react';

interface ${componentName}Props {
  // Add your component props here
}

const ${componentName}: React.FC<${componentName}Props> = (props) => {
  const [${stateName}, set${stateName.charAt(0).toUpperCase() + stateName.slice(1)}] = useState<${stateType} | null>(null);

  useEffect(() => {
    // Add your side effects here, e.g., data fetching
  }, []);

  return (
    <div>
      <h1>${componentName}</h1>
      {/* Add your component JSX here */}
    </div>
  );
};

export default ${componentName};
`;
  }
}

# Data Model Design

## 1. Input Data Models

### BeamProperties
```typescript
interface BeamProperties {
  id: string;
  name: string;
  length: number;           // ความยาวคาน (m)
  elasticModulus: number;   // โมดูลัสยืดหยุ่น E (Pa)
  momentOfInertia: number;  // โมเมนต์ความเฉื่อย I (m⁴)
  crossSection: {
    type: 'rectangular' | 'circular' | 'i-beam' | 'custom';
    width?: number;         // กว้าง (m)
    height?: number;        // สูง (m)
    diameter?: number;      // เส้นผ่านศูนย์กลาง (m)
    customProperties?: any;
  };
  material: {
    name: string;
    density: number;        // ความหนาแน่น (kg/m³)
    yieldStrength: number;  // ความต้านทานแรงดึง (Pa)
  };
}
```

### SupportConditions
```typescript
interface SupportConditions {
  type: 'simply-supported' | 'cantilever' | 'fixed-fixed' | 'fixed-pinned' | 'continuous';
  supports: Support[];
}

interface Support {
  position: number;       // ตำแหน่งจากจุดเริ่มต้น (m)
  type: 'pin' | 'roller' | 'fixed';
  reactions: {
    vertical: boolean;    // รับแรงในแนวตั้ง
    horizontal: boolean;  // รับแรงในแนวนอน
    moment: boolean;      // รับโมเมนต์
  };
}
```

### LoadConditions
```typescript
interface LoadConditions {
  loads: Load[];
}

type Load = PointLoad | DistributedLoad | MomentLoad;

interface PointLoad {
  type: 'point';
  magnitude: number;      // ขนาดแรง (N)
  position: number;       // ตำแหน่ง (m)
  direction: 'up' | 'down';
  angle?: number;         // มุมเอียง (degrees)
}

interface DistributedLoad {
  type: 'distributed';
  startMagnitude: number; // แรงเริ่มต้น (N/m)
  endMagnitude: number;   // แรงสิ้นสุด (N/m)
  startPosition: number;  // ตำแหน่งเริ่มต้น (m)
  endPosition: number;    // ตำแหน่งสิ้นสุด (m)
  direction: 'up' | 'down';
}

interface MomentLoad {
  type: 'moment';
  magnitude: number;      // ขนาดโมเมนต์ (N⋅m)
  position: number;       // ตำแหน่ง (m)
  direction: 'clockwise' | 'counterclockwise';
}
```

## 2. Process Data Models

### AnalysisRequest
```typescript
interface AnalysisRequest {
  id: string;
  timestamp: Date;
  beam: BeamProperties;
  supports: SupportConditions;
  loads: LoadConditions;
  analysisOptions: {
    includeDeflection: boolean;
    includeMoment: boolean;
    includeShear: boolean;
    includeStress: boolean;
    numberOfPoints: number;     // จำนวนจุดในการคำนวณ
    safetyFactor?: number;
  };
}
```

### CalculationParameters
```typescript
interface CalculationParameters {
  stepSize: number;           // ขนาดช่วงในการคำนวณ
  tolerance: number;          // ความคลาดเคลื่อนที่ยอมรับได้
  maxIterations: number;      // จำนวนรอบการคำนวณสูงสุด
  method: 'finite-element' | 'analytical' | 'numerical';
}
```

## 3. Output Data Models

### AnalysisResults
```typescript
interface AnalysisResults {
  id: string;
  requestId: string;
  timestamp: Date;
  beam: BeamProperties;
  supports: SupportConditions;
  loads: LoadConditions;
  
  // ผลการคำนวณ
  reactions: Reaction[];
  moments: DataPoint[];
  shearForces: DataPoint[];
  deflections: DataPoint[];
  stresses: DataPoint[];
  
  // ค่าสูงสุด/ต่ำสุด
  maxMoment: { value: number; position: number; };
  maxShear: { value: number; position: number; };
  maxDeflection: { value: number; position: number; };
  maxStress: { value: number; position: number; };
  
  // การตรวจสอบความปลอดภัย
  safetyCheck: SafetyAnalysis;
  
  // ข้อมูลเพิ่มเติม
  calculationTime: number;    // เวลาในการคำนวณ (ms)
  method: string;
  convergence: boolean;
}
```

### DataPoint
```typescript
interface DataPoint {
  position: number;           // ตำแหน่งตามแนวคาน (m)
  value: number;             // ค่าที่คำนวณได้
  unit: string;              // หน่วย
}
```

### Reaction
```typescript
interface Reaction {
  supportId: string;
  position: number;
  verticalForce: number;      // แรงปฏิกิริยาในแนวตั้ง (N)
  horizontalForce: number;    // แรงปฏิกิริยาในแนวนอน (N)
  moment: number;            // โมเมนต์ปฏิกิริยา (N⋅m)
}
```

### SafetyAnalysis
```typescript
interface SafetyAnalysis {
  isStructurallySafe: boolean;
  safetyFactor: number;
  criticalPoints: CriticalPoint[];
  warnings: string[];
  recommendations: string[];
}

interface CriticalPoint {
  position: number;
  type: 'moment' | 'shear' | 'deflection' | 'stress';
  actualValue: number;
  allowableValue: number;
  utilizationRatio: number;   // อัตราส่วนการใช้งาน (0-1)
  severity: 'low' | 'medium' | 'high' | 'critical';
}
```

## 4. Database Models

### Project
```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  analyses: AnalysisResults[];
}
```

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'engineer' | 'student' | 'admin';
  preferences: {
    defaultUnits: 'metric' | 'imperial';
    defaultMaterial: string;
    autoSave: boolean;
  };
  createdAt: Date;
  lastLogin: Date;
}
```

## 5. API Response Models

### APIResponse
```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
  requestId: string;
}
```

### ValidationError
```typescript
interface ValidationError {
  field: string;
  message: string;
  value: any;
  constraint: string;
}
```

## 6. Chart Data Models

### ChartData
```typescript
interface ChartData {
  type: 'moment' | 'shear' | 'deflection';
  title: string;
  xAxis: {
    label: string;
    unit: string;
    data: number[];
  };
  yAxis: {
    label: string;
    unit: string;
    data: number[];
  };
  style: {
    color: string;
    lineWidth: number;
    showPoints: boolean;
  };
}
```

## หน่วยมาตรฐาน (Standard Units)

- **ความยาว**: เมตร (m)
- **แรง**: นิวตัน (N)
- **โมเมนต์**: นิวตัน-เมตร (N⋅m)
- **ความเค้น**: ปาสคาล (Pa)
- **โมดูลัสยืดหยุ่น**: ปาสคาล (Pa)
- **โมเมนต์ความเฉื่อย**: เมตร⁴ (m⁴)
- **ความหนาแน่น**: กิโลกรัมต่อลูกบาศก์เมตร (kg/m³)

## การตรวจสอบความถูกต้อง (Validation Rules)

1. **BeamProperties**:
   - length > 0
   - elasticModulus > 0
   - momentOfInertia > 0

2. **Loads**:
   - magnitude ≠ 0
   - 0 ≤ position ≤ beam.length
   - สำหรับ distributed load: startPosition < endPosition

3. **Supports**:
   - อย่างน้อย 1 support
   - 0 ≤ position ≤ beam.length
   - สำหรับ simply-supported: ต้องมี 2 supports
   - สำหรับ cantilever: ต้องมี 1 fixed support ที่ปลายใดปลายหนึ่ง

4. **Safety Factors**:
   - safetyFactor ≥ 1.0
   - utilizationRatio ≤ 1.0 สำหรับความปลอดภัย
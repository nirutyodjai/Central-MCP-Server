from pydantic import BaseModel, Field, validator
from typing import List, Optional, Union, Literal
from datetime import datetime
from enum import Enum

# Enums
class BeamType(str, Enum):
    SIMPLY_SUPPORTED = "simply-supported"
    CANTILEVER = "cantilever"
    FIXED_FIXED = "fixed-fixed"
    FIXED_PINNED = "fixed-pinned"
    CONTINUOUS = "continuous"

class SupportType(str, Enum):
    PIN = "pin"
    ROLLER = "roller"
    FIXED = "fixed"

class LoadType(str, Enum):
    POINT = "point"
    DISTRIBUTED = "distributed"
    MOMENT = "moment"

class CrossSectionType(str, Enum):
    RECTANGULAR = "rectangular"
    CIRCULAR = "circular"
    I_BEAM = "i-beam"
    CUSTOM = "custom"

class Direction(str, Enum):
    UP = "up"
    DOWN = "down"
    CLOCKWISE = "clockwise"
    COUNTERCLOCKWISE = "counterclockwise"

# Cross Section Models
class CrossSection(BaseModel):
    type: CrossSectionType
    width: Optional[float] = Field(None, gt=0, description="กว้าง (m)")
    height: Optional[float] = Field(None, gt=0, description="สูง (m)")
    diameter: Optional[float] = Field(None, gt=0, description="เส้นผ่านศูนย์กลาง (m)")
    custom_properties: Optional[dict] = None
    
    @validator('width')
    def validate_width(cls, v, values):
        if values.get('type') == CrossSectionType.RECTANGULAR and v is None:
            raise ValueError('Width is required for rectangular cross section')
        return v
    
    @validator('height')
    def validate_height(cls, v, values):
        if values.get('type') == CrossSectionType.RECTANGULAR and v is None:
            raise ValueError('Height is required for rectangular cross section')
        return v
    
    @validator('diameter')
    def validate_diameter(cls, v, values):
        if values.get('type') == CrossSectionType.CIRCULAR and v is None:
            raise ValueError('Diameter is required for circular cross section')
        return v

# Material Model
class Material(BaseModel):
    name: str = Field(..., description="ชื่อวัสดุ")
    density: float = Field(..., gt=0, description="ความหนาแน่น (kg/m³)")
    yield_strength: float = Field(..., gt=0, description="ความต้านทานแรงดึง (Pa)")

# Beam Properties Model
class BeamProperties(BaseModel):
    id: str = Field(..., description="รหัสคาน")
    name: str = Field(..., description="ชื่อคาน")
    length: float = Field(..., gt=0, description="ความยาวคาน (m)")
    elastic_modulus: float = Field(..., gt=0, description="โมดูลัสยืดหยุ่น E (Pa)")
    moment_of_inertia: float = Field(..., gt=0, description="โมเมนต์ความเฉื่อย I (m⁴)")
    cross_section: CrossSection
    material: Material

# Support Models
class SupportReactions(BaseModel):
    vertical: bool = Field(True, description="รับแรงในแนวตั้ง")
    horizontal: bool = Field(False, description="รับแรงในแนวนอน")
    moment: bool = Field(False, description="รับโมเมนต์")

class Support(BaseModel):
    position: float = Field(..., ge=0, description="ตำแหน่งจากจุดเริ่มต้น (m)")
    type: SupportType
    reactions: SupportReactions
    
    @validator('reactions')
    def validate_reactions(cls, v, values):
        support_type = values.get('type')
        if support_type == SupportType.PIN:
            v.vertical = True
            v.horizontal = True
            v.moment = False
        elif support_type == SupportType.ROLLER:
            v.vertical = True
            v.horizontal = False
            v.moment = False
        elif support_type == SupportType.FIXED:
            v.vertical = True
            v.horizontal = True
            v.moment = True
        return v

class SupportConditions(BaseModel):
    type: BeamType
    supports: List[Support] = Field(..., min_items=1, description="รายการจุดรองรับ")
    
    @validator('supports')
    def validate_supports(cls, v, values):
        beam_type = values.get('type')
        
        if beam_type == BeamType.SIMPLY_SUPPORTED and len(v) != 2:
            raise ValueError('Simply supported beam requires exactly 2 supports')
        elif beam_type == BeamType.CANTILEVER and len(v) != 1:
            raise ValueError('Cantilever beam requires exactly 1 support')
        elif beam_type == BeamType.FIXED_FIXED and len(v) != 2:
            raise ValueError('Fixed-fixed beam requires exactly 2 supports')
        
        # Check for cantilever that support is at the end
        if beam_type == BeamType.CANTILEVER:
            support = v[0]
            if support.type != SupportType.FIXED:
                raise ValueError('Cantilever beam requires a fixed support')
        
        return v

# Load Models
class PointLoad(BaseModel):
    type: Literal[LoadType.POINT] = LoadType.POINT
    magnitude: float = Field(..., ne=0, description="ขนาดแรง (N)")
    position: float = Field(..., ge=0, description="ตำแหน่ง (m)")
    direction: Direction = Direction.DOWN
    angle: Optional[float] = Field(0, ge=0, le=360, description="มุมเอียง (degrees)")

class DistributedLoad(BaseModel):
    type: Literal[LoadType.DISTRIBUTED] = LoadType.DISTRIBUTED
    start_magnitude: float = Field(..., description="แรงเริ่มต้น (N/m)")
    end_magnitude: float = Field(..., description="แรงสิ้นสุด (N/m)")
    start_position: float = Field(..., ge=0, description="ตำแหน่งเริ่มต้น (m)")
    end_position: float = Field(..., ge=0, description="ตำแหน่งสิ้นสุด (m)")
    direction: Direction = Direction.DOWN
    
    @validator('end_position')
    def validate_positions(cls, v, values):
        start_pos = values.get('start_position')
        if start_pos is not None and v <= start_pos:
            raise ValueError('End position must be greater than start position')
        return v

class MomentLoad(BaseModel):
    type: Literal[LoadType.MOMENT] = LoadType.MOMENT
    magnitude: float = Field(..., ne=0, description="ขนาดโมเมนต์ (N⋅m)")
    position: float = Field(..., ge=0, description="ตำแหน่ง (m)")
    direction: Direction = Direction.CLOCKWISE

# Union type for all loads
Load = Union[PointLoad, DistributedLoad, MomentLoad]

class LoadConditions(BaseModel):
    loads: List[Load] = Field(..., min_items=1, description="รายการแรงกระทำ")

# Analysis Options
class AnalysisOptions(BaseModel):
    include_deflection: bool = Field(True, description="คำนวณการโก่งตัว")
    include_moment: bool = Field(True, description="คำนวณโมเมนต์")
    include_shear: bool = Field(True, description="คำนวณแรงเฉือน")
    include_stress: bool = Field(True, description="คำนวณความเค้น")
    number_of_points: int = Field(100, ge=10, le=1000, description="จำนวนจุดในการคำนวณ")
    safety_factor: Optional[float] = Field(1.5, ge=1.0, description="ค่าความปลอดภัย")

# Analysis Request
class AnalysisRequest(BaseModel):
    id: str = Field(..., description="รหัสการวิเคราะห์")
    timestamp: datetime = Field(default_factory=datetime.now)
    beam: BeamProperties
    supports: SupportConditions
    loads: LoadConditions
    analysis_options: AnalysisOptions = Field(default_factory=AnalysisOptions)
    
    @validator('loads')
    def validate_load_positions(cls, v, values):
        beam = values.get('beam')
        if beam:
            beam_length = beam.length
            for load in v.loads:
                if hasattr(load, 'position') and load.position > beam_length:
                    raise ValueError(f'Load position {load.position} exceeds beam length {beam_length}')
                if hasattr(load, 'end_position') and load.end_position > beam_length:
                    raise ValueError(f'Load end position {load.end_position} exceeds beam length {beam_length}')
        return v
    
    @validator('supports')
    def validate_support_positions(cls, v, values):
        beam = values.get('beam')
        if beam:
            beam_length = beam.length
            for support in v.supports:
                if support.position > beam_length:
                    raise ValueError(f'Support position {support.position} exceeds beam length {beam_length}')
        return v

# Result Models
class DataPoint(BaseModel):
    position: float = Field(..., description="ตำแหน่งตามแนวคาน (m)")
    value: float = Field(..., description="ค่าที่คำนวณได้")
    unit: str = Field(..., description="หน่วย")

class Reaction(BaseModel):
    support_id: str
    position: float
    vertical_force: float = Field(..., description="แรงปฏิกิริยาในแนวตั้ง (N)")
    horizontal_force: float = Field(..., description="แรงปฏิกิริยาในแนวนอน (N)")
    moment: float = Field(..., description="โมเมนต์ปฏิกิริยา (N⋅m)")

class CriticalPoint(BaseModel):
    position: float
    type: Literal['moment', 'shear', 'deflection', 'stress']
    actual_value: float
    allowable_value: float
    utilization_ratio: float = Field(..., ge=0, le=1, description="อัตราส่วนการใช้งาน (0-1)")
    severity: Literal['low', 'medium', 'high', 'critical']

class SafetyAnalysis(BaseModel):
    is_structurally_safe: bool
    safety_factor: float
    critical_points: List[CriticalPoint]
    warnings: List[str]
    recommendations: List[str]

class MaxValues(BaseModel):
    value: float
    position: float

# Analysis Results
class AnalysisResults(BaseModel):
    id: str
    request_id: str
    timestamp: datetime = Field(default_factory=datetime.now)
    beam: BeamProperties
    supports: SupportConditions
    loads: LoadConditions
    
    # ผลการคำนวณ
    reactions: List[Reaction]
    moments: List[DataPoint]
    shear_forces: List[DataPoint]
    deflections: List[DataPoint]
    stresses: List[DataPoint]
    
    # ค่าสูงสุด/ต่ำสุด
    max_moment: MaxValues
    max_shear: MaxValues
    max_deflection: MaxValues
    max_stress: MaxValues
    
    # การตรวจสอบความปลอดภัย
    safety_check: SafetyAnalysis
    
    # ข้อมูลเพิ่มเติม
    calculation_time: float = Field(..., description="เวลาในการคำนวณ (ms)")
    method: str
    convergence: bool

# Validation Result
class ValidationResult(BaseModel):
    is_valid: bool
    errors: List[str] = []
    warnings: List[str] = []
    suggestions: List[str] = []
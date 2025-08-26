# Engineering Web Application

## ปัญหาหลักที่แก้ไข (Core Problem)

เว็บแอปพลิเคชันสำหรับวิศวกรโยธาเพื่อคำนวณการรับน้ำหนักของคานแบบต่างๆ (Beam Load Analysis)

### วัตถุประสงค์
- คำนวณค่า Moment, Shear Force และ Deflection ของคาน
- รองรับคานแบบต่างๆ: Simply Supported, Cantilever, Fixed-Fixed
- แสดงผลเป็นกราฟและตัวเลขที่แม่นยำ
- ส่งออกรายงานเป็น PDF

### ผู้ใช้งาน (Target Users)
- วิศวกรโยธา (Structural Engineers)
- นักศึกษาวิศวกรรมโยธา
- ผู้ออกแบบโครงสร้าง

### Use Cases
1. ป้อนข้อมูลคาน: ความยาว, โมดูลัสยืดหยุ่น, โมเมนต์ความเฉื่อย
2. กำหนดเงื่อนไขการรองรับ (Support Conditions)
3. ระบุแรงกระทำ: Point Load, Distributed Load, Moment
4. คำนวณและแสดงผล: กราฟ Moment Diagram, Shear Force Diagram
5. ส่งออกรายงานผลการคำนวณ

## เทคโนโลยีที่ใช้

### Backend
- **Python + FastAPI**: สำหรับ API และการคำนวณ
- **NumPy**: การคำนวณเมทริกซ์และอาร์เรย์
- **SciPy**: สมการเชิงอนุพันธ์และการหาค่าเหมาะสม
- **Matplotlib**: สร้างกราฟสำหรับส่งออก

### Frontend
- **React + TypeScript**: UI Framework
- **Tailwind CSS**: Styling Framework
- **Chart.js**: การแสดงผลกราฟแบบ Interactive
- **React Hook Form**: จัดการฟอร์มข้อมูล

### Database
- **SQLite**: เก็บประวัติการคำนวณ (สำหรับ MVP)
- **PostgreSQL**: สำหรับ Production

## โครงสร้างโปรเจกต์

```
engineering-webapp/
├── backend/          # Python FastAPI
├── frontend/         # React TypeScript
├── docs/            # Documentation
├── tests/           # Test files
└── docker/          # Docker configuration
```

## การเริ่มต้นพัฒนา

1. ตั้งค่า Backend (Python + FastAPI)
2. ตั้งค่า Frontend (React + TypeScript)
3. พัฒนา API สำหรับการคำนวณ
4. สร้าง UI Components
5. เชื่อมต่อ Frontend-Backend
6. เพิ่มการแสดงผลกราฟ
7. ทดสอบและปรับปรุง

## สูตรการคำนวณหลัก

### Simply Supported Beam with Point Load
- Maximum Moment: M = PL/4 (at center)
- Maximum Deflection: δ = PL³/(48EI)

### Cantilever Beam with Point Load at End
- Maximum Moment: M = PL (at fixed end)
- Maximum Deflection: δ = PL³/(3EI)

### Distributed Load
- Maximum Moment: M = wL²/8
- Maximum Deflection: δ = 5wL⁴/(384EI)

โดยที่:
- P = Point Load (N)
- w = Distributed Load (N/m)
- L = Length of beam (m)
- E = Modulus of Elasticity (Pa)
- I = Moment of Inertia (m⁴)
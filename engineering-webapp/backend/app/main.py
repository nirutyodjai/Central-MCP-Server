from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from typing import List, Optional
import logging
from datetime import datetime

# Import models and services
from models.beam_models import (
    BeamProperties, 
    SupportConditions, 
    LoadConditions, 
    AnalysisRequest, 
    AnalysisResults
)
from services.beam_calculator import BeamCalculator
from services.validation_service import ValidationService
from utils.logger import setup_logger

# Setup logging
logger = setup_logger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Engineering Web Application API",
    description="API สำหรับการคำนวณการรับน้ำหนักของคานทางวิศวกรรมโยธา",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
beam_calculator = BeamCalculator()
validation_service = ValidationService()

# Health check endpoint
@app.get("/health")
async def health_check():
    """ตรวจสอบสถานะของ API"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }

# Root endpoint
@app.get("/")
async def root():
    """หน้าแรกของ API"""
    return {
        "message": "Engineering Web Application API",
        "docs": "/docs",
        "health": "/health"
    }

# Beam analysis endpoint
@app.post("/api/analyze", response_model=AnalysisResults)
async def analyze_beam(request: AnalysisRequest):
    """
    คำนวณการรับน้ำหนักของคาน
    
    Args:
        request: ข้อมูลคาน, การรองรับ, และแรงกระทำ
    
    Returns:
        ผลการคำนวณรวมถึงกราฟและค่าสำคัญต่างๆ
    """
    try:
        logger.info(f"Starting beam analysis for request ID: {request.id}")
        
        # Validate input data
        validation_result = validation_service.validate_analysis_request(request)
        if not validation_result.is_valid:
            raise HTTPException(
                status_code=400, 
                detail={
                    "message": "Invalid input data",
                    "errors": validation_result.errors
                }
            )
        
        # Perform beam analysis
        results = await beam_calculator.analyze_beam(request)
        
        logger.info(f"Beam analysis completed for request ID: {request.id}")
        return results
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal calculation error")

# Get supported beam types
@app.get("/api/beam-types")
async def get_beam_types():
    """รายการประเภทคานที่รองรับ"""
    return {
        "beam_types": [
            {
                "id": "simply-supported",
                "name": "Simply Supported Beam",
                "description": "คานรองรับแบบง่าย (Pin-Roller)",
                "supports_required": 2
            },
            {
                "id": "cantilever",
                "name": "Cantilever Beam",
                "description": "คานยื่น (Fixed-Free)",
                "supports_required": 1
            },
            {
                "id": "fixed-fixed",
                "name": "Fixed-Fixed Beam",
                "description": "คานยึดแน่นทั้งสองปลาย",
                "supports_required": 2
            }
        ]
    }

# Get material properties
@app.get("/api/materials")
async def get_materials():
    """รายการคุณสมบัติวัสดุมาตรฐาน"""
    return {
        "materials": [
            {
                "name": "Steel (A36)",
                "elastic_modulus": 200e9,  # Pa
                "density": 7850,  # kg/m³
                "yield_strength": 250e6  # Pa
            },
            {
                "name": "Concrete (C25/30)",
                "elastic_modulus": 31e9,  # Pa
                "density": 2400,  # kg/m³
                "yield_strength": 25e6  # Pa
            },
            {
                "name": "Aluminum (6061-T6)",
                "elastic_modulus": 69e9,  # Pa
                "density": 2700,  # kg/m³
                "yield_strength": 276e6  # Pa
            },
            {
                "name": "Wood (Douglas Fir)",
                "elastic_modulus": 13e9,  # Pa
                "density": 500,  # kg/m³
                "yield_strength": 40e6  # Pa
            }
        ]
    }

# Validate beam configuration
@app.post("/api/validate")
async def validate_beam_config(request: AnalysisRequest):
    """
    ตรวจสอบความถูกต้องของการกำหนดค่าคาน
    
    Args:
        request: ข้อมูลคานที่ต้องการตรวจสอบ
    
    Returns:
        ผลการตรวจสอบและข้อเสนอแนะ
    """
    try:
        validation_result = validation_service.validate_analysis_request(request)
        
        return {
            "is_valid": validation_result.is_valid,
            "errors": validation_result.errors,
            "warnings": validation_result.warnings,
            "suggestions": validation_result.suggestions
        }
        
    except Exception as e:
        logger.error(f"Validation error: {str(e)}")
        raise HTTPException(status_code=500, detail="Validation service error")

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "message": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "message": "Internal server error",
            "timestamp": datetime.now().isoformat()
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
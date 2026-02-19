from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from vcf_parser import parse_vcf_content
from llm_service import generate_clinical_assessment

app = FastAPI(title="RIFT 2026 Pharmacogenomics API")

app.add_middleware(
    CORSMiddleware,
    #Changed urls
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (POST, GET, etc.)
    allow_headers=["*"],  # Allows all headers
)

@app.get("/")
def health_check():
    return {"status": "active", "message": "Pharmacogenomics API is running!"}

@app.post("/analyze")
async def analyze_pharmacogenomics(
    file: UploadFile = File(...), 
    drugs: str = Form(...)
):
    # 1. Validation Requirements 
    if not file.filename.endswith('.vcf'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a .vcf file.")
    
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 5MB limit.")
        
    vcf_text = content.decode("utf-8")
    drug_list = [d.strip().upper() for d in drugs.split(",")]
    
    # Parse the VCF content
    parsed_data = parse_vcf_content(vcf_text)
    
    if not parsed_data["success"]:
        raise HTTPException(status_code=500, detail="Failed to parse the VCF file. Please check the file format.")
    
    variants = parsed_data["variants"]

    results = []
    
    # Process each drug the user requested
    for drug in drug_list:
        try:
            # Call Google Gemini to generate the CPIC-aligned JSON report
            report = generate_clinical_assessment(
                variants=variants, 
                drug_name=drug, 
                parsing_success=parsed_data["success"]
            )
            results.append(report)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"LLM Generation failed for {drug}: {str(e)}")
            
    # For a single drug, just return the dict. For multiple, return the list.
    return results[0] if len(results) == 1 else results

if __name__ == "__main__":
    # Runs the server on localhost:8000
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
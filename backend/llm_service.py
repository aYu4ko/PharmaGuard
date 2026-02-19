import os
import json
from datetime import datetime, timezone
from dotenv import load_dotenv
import google.generativeai as genai
from pydantic import BaseModel
from typing import List, Literal

load_dotenv()

class RiskAssessment(BaseModel):
    risk_label: Literal["Safe", "Adjust Dosage", "Toxic", "Ineffective", "Unknown"]
    confidence_score: float
    severity: Literal["none", "low", "moderate", "high", "critical"]

class DetectedVariant(BaseModel):
    rsid: str

    description: str 

class PharmacogenomicProfile(BaseModel):
    primary_gene: str
    diplotype: str
    phenotype: Literal["PM", "IM", "NM", "RM", "URM", "Unknown"]
    detected_variants: List[DetectedVariant]

class ClinicalRecommendation(BaseModel):
    dosing_guidance: str
    alternative_drugs: List[str]

class LLMExplanation(BaseModel):
    summary: str
    biological_mechanism: str

class QualityMetrics(BaseModel):
    vcf_parsing_success: bool

    data_completeness_score: float 

class PharmacogenomicReport(BaseModel):

    risk_assessment: RiskAssessment
    pharmacogenomic_profile: PharmacogenomicProfile
    clinical_recommendation: ClinicalRecommendation
    llm_generated_explanation: LLMExplanation
    quality_metrics: QualityMetrics


def generate_clinical_assessment(variants: list, drug_name: str, parsing_success: bool) -> dict:
    genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))
    
    model = genai.GenerativeModel(
        model_name="gemini-2.5-flash",
        system_instruction=(
            "You are a strict pharmacogenomics API. Analyze the genetic variants for the given drug "
            "based on CPIC guidelines. You MUST map phenotypes exactly to: PM, IM, NM, RM, URM, or Unknown. "
            "Severity must strictly be: none, low, moderate, high, or critical."
        )
    )
    
    user_prompt = f"Patient Variants: {variants}\nTarget Drug: {drug_name}\nVCF Parsing Success: {parsing_success}"
    

    response = model.generate_content(
        user_prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            response_schema=PharmacogenomicReport,
            temperature=0.0, 
        )
    )
    
    ai_data = json.loads(response.text)
    

    final_json = {
        "patient_id": "PATIENT_XXX",
        "drug": drug_name.upper(),
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "risk_assessment": ai_data["risk_assessment"],
        "pharmacogenomic_profile": ai_data["pharmacogenomic_profile"],
        "clinical_recommendation": ai_data["clinical_recommendation"],
        "llm_generated_explanation": ai_data["llm_generated_explanation"],
        "quality_metrics": ai_data["quality_metrics"]
    }
    

    final_json["quality_metrics"]["vcf_parsing_success"] = parsing_success
    
    return final_json
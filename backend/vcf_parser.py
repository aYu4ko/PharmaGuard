import re
import logging

# Set up basic logging for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# The 6 critical genes required by the hackathon specifications
TARGET_GENES = {"CYP2D6", "CYP2C19", "CYP2C9", "SLCO1B1", "TPMT", "DPYD"}

def parse_vcf_content(vcf_text: str) -> dict:
    """
    Parses VCF text to extract rsIDs for the target pharmacogenomic genes.
    Returns a dictionary with success status and a list of detected variants.
    """
    detected_variants = []
    parsing_success = True
    
    try:
        # Split the file into lines
        lines = vcf_text.strip().split('\n')
        
        for line in lines:
            # Skip header lines
            if line.startswith('#'):
                continue
            
            # VCF files are tab-separated
            parts = line.split('\t')
            
            # Ensure the line has at least the basic 8 columns
            if len(parts) < 8:
                continue
                
            rsid_column = parts[2]  # The ID column
            info_column = parts[7]  # The INFO column
            
            # 1. Gracefully look for the GENE tag in the INFO column
            gene_match = re.search(r'GENE=([a-zA-Z0-9]+)', info_column)
            if not gene_match:
                continue # Skip if no gene is annotated
                
            gene = gene_match.group(1).upper()
            
            # 2. Check if it's one of our 6 target genes
            if gene in TARGET_GENES:
                rsid = None
                
                # 3. Extract rsID (Try the ID column first, then check INFO column)
                if rsid_column.startswith('rs'):
                    rsid = rsid_column
                else:
                    # Look for RS=12345 or rs12345 in the INFO column
                    rs_match = re.search(r'(?:RS=|rs)(\d+)', info_column, re.IGNORECASE)
                    if rs_match:
                        rsid = f"rs{rs_match.group(1)}"
                
                # If we successfully found both a target gene and an rsID, save it
                if rsid:
                    # Avoid duplicates
                    if not any(v['rsid'] == rsid for v in detected_variants):
                        detected_variants.append({
                            "gene": gene,
                            "rsid": rsid
                        })
                        
    except Exception as e:
        logger.error(f"Failed to parse VCF file: {e}")
        parsing_success = False
        
    return {
        "success": parsing_success,
        "variants": detected_variants
    }
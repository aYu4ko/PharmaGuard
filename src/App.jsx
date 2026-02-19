import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

export default function App() {
  const [file, setFile] = useState(null);
  const [drugs, setDrugs] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Drag and Drop Logic ---
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null);
    if (rejectedFiles.length > 0) {
      setError("Please upload a valid .vcf file under 5MB.");
      return;
    }
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/vcard': ['.vcf'], 'application/octet-stream': ['.vcf'] },
    maxSize: 5242880, // 5MB in bytes
    multiple: false
  });

  // --- API Call Logic ---
  const handleAnalyze = async () => {
    if (!file) {
      setError("Please upload a VCF file first.");
      return;
    }
    if (!drugs.trim()) {
      setError("Please enter at least one drug name.");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("drugs", drugs);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Server error. Make sure your Python backend is running!");
      }

      const data = await response.json();
      setResults(Array.isArray(data) ? data : [data]); 
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- UI Styling Helpers ---
  const getRiskColor = (label) => {
    switch(label) {
      case 'Safe': return 'bg-green-100 border-green-500 text-green-900';
      case 'Adjust Dosage': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'Toxic': 
      case 'Ineffective': return 'bg-red-100 border-red-500 text-red-900';
      default: return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const handleCopyJSON = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    alert("JSON copied to clipboard!");
  };

  const handleDownloadJSON = (data, drugName) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${drugName}_report.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="text-center">
          <h1 className="text-4xl font-extrabold text-blue-900">Pharmacogenomic Risk Analyzer</h1>
          <p className="text-gray-600 mt-2">Upload a VCF file to analyze genetic variants against CPIC guidelines.</p>
        </header>

        {/* Input Form Section */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 space-y-6">
          
          {/* File Upload Zone */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">1. Upload Patient VCF</label>
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-200
                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 bg-gray-50'}`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="text-green-600 font-bold text-lg">✓ {file.name}</div>
              ) : (
                <div className="text-gray-500">
                  <p className="font-medium text-lg">Drag & drop a .vcf file here</p>
                  <p className="text-sm mt-1">or click to browse</p>
                </div>
              )}
            </div>
          </div>

          {/* Drug Input Field */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">2. Enter Target Drugs</label>
            <input 
              type="text" 
              placeholder="e.g., WARFARIN, CODEINE (comma-separated)" 
              value={drugs}
              onChange={(e) => setDrugs(e.target.value.toUpperCase())}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="p-4 bg-red-100 text-red-700 border border-red-400 rounded-lg font-medium">
              ⚠ {error}
            </div>
          )}

          {/* Submit Button */}
          <button 
            onClick={handleAnalyze} 
            disabled={loading}
            className={`w-full py-4 rounded-lg font-bold text-white text-lg transition-colors shadow-md
              ${loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {loading ? 'Analyzing Genomics Data... Please wait.' : 'Generate Risk Assessment'}
          </button>
        </div>

        {/* Results Section */}
        {results && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2">Analysis Results</h2>
            
            {results.map((result, idx) => (
              <div key={idx} className={`border-l-8 p-6 rounded-xl bg-white shadow-lg ${getRiskColor(result.risk_assessment.risk_label)}`}>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-3xl font-black">{result.drug}</h3>
                    <span className="inline-block mt-2 px-4 py-1 bg-white bg-opacity-60 rounded-full font-bold uppercase tracking-wide border border-current">
                      Risk: {result.risk_assessment.risk_label}
                    </span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button onClick={() => handleCopyJSON(result)} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold hover:bg-gray-100 text-black shadow-sm transition-colors">Copy JSON</button>
                    <button onClick={() => handleDownloadJSON(result, result.drug)} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-bold hover:bg-gray-700 shadow-sm transition-colors">Download JSON</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 text-black bg-white bg-opacity-40 p-4 rounded-lg">
                  <div>
                    <p className="mb-1"><strong>Primary Gene:</strong> {result.pharmacogenomic_profile.primary_gene}</p>
                    <p className="mb-1"><strong>Diplotype:</strong> {result.pharmacogenomic_profile.diplotype}</p>
                    <p><strong>Phenotype:</strong> {result.pharmacogenomic_profile.phenotype}</p>
                  </div>
                  <div>
                    <p className="mb-1"><strong>Severity:</strong> <span className="uppercase">{result.risk_assessment.severity}</span></p>
                    <p><strong>Confidence:</strong> {(result.risk_assessment.confidence_score * 100).toFixed(0)}%</p>
                  </div>
                </div>

                <div className="bg-white bg-opacity-80 p-5 rounded-lg border border-opacity-20 border-current text-black mb-4">
                  <h4 className="font-bold text-lg mb-2">Clinical Recommendation</h4>
                  <p>{result.clinical_recommendation.dosing_guidance}</p>
                  {result.clinical_recommendation.alternative_drugs.length > 0 && (
                    <p className="mt-3 text-sm"><strong>Alternatives:</strong> {result.clinical_recommendation.alternative_drugs.join(", ")}</p>
                  )}
                </div>

                <details className="cursor-pointer text-black mt-2 bg-white bg-opacity-50 p-3 rounded-lg">
                  <summary className="font-bold hover:opacity-80">View Biological Mechanism & Raw JSON</summary>
                  <div className="mt-4">
                    <p className="mb-4 text-sm leading-relaxed"><strong>Mechanism:</strong> {result.llm_generated_explanation.biological_mechanism}</p>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto shadow-inner">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </details>

              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
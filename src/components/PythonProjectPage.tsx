import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  FileCode,
  Copy,
  Check,
  Download,
  Terminal,
  ExternalLink,
  BookOpen,
  CheckCircle2
} from 'lucide-react';
import { api, ProjectFileItem } from '../services/api';

export const PythonProjectPage: React.FC = () => {
  const [files, setFiles] = useState<ProjectFileItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("README.md");
  const [fileContent, setFileContent] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    api.getProjectFiles().then((res) => {
      if (res && res.files) {
        setFiles(res.files);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedFile) {
      setIsLoading(true);
      api.getProjectFileContent(selectedFile).then((res) => {
        setFileContent(res.content || "");
        setIsLoading(false);
      });
    }
  }, [selectedFile]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', selectedFile.split('/').pop() || 'file.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Python Streamlit Project & Windows VS Code Guide
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            The complete, modular source repository for your Machine Learning Internship project, containing all Gmail integration, MongoDB, and FastAPI code.
          </p>
        </div>

        <button
          onClick={handleDownloadFile}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download {selectedFile.split('/').pop()}</span>
        </button>
      </div>

      {/* PowerShell Instructions Banner */}
      <div className="bg-slate-950 text-slate-200 rounded-xl p-5 border border-slate-800 shadow-xs font-mono text-xs">
        <div className="flex items-center gap-2 mb-2 text-slate-400">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="font-sans font-semibold text-white">PowerShell Setup Commands (Windows VS Code):</span>
        </div>
        <div className="space-y-1.5 bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 text-emerald-300">
          <p><span className="text-slate-500"># 1. Open VS Code terminal and activate virtual environment</span></p>
          <p className="text-white">python -m venv .venv; .\.venv\Scripts\Activate.ps1</p>
          <p className="pt-1"><span className="text-slate-500"># 2. Install all dependencies</span></p>
          <p className="text-white">pip install -r requirements.txt</p>
          <p className="pt-1"><span className="text-slate-500"># 3. Train the ML pipeline</span></p>
          <p className="text-white">python train_model.py</p>
          <p className="pt-1"><span className="text-slate-500"># 4. Run unit tests</span></p>
          <p className="text-white">pytest -v</p>
          <p className="pt-1"><span className="text-slate-500"># 5. Launch the Streamlit dashboard</span></p>
          <p className="text-white">streamlit run app.py</p>
        </div>
      </div>

      {/* Two Column File Tree & Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Tree (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block px-2 pb-2 border-b border-slate-100">
            Repository Files ({files.length})
          </span>
          <div className="space-y-1 max-h-[500px] overflow-y-auto pr-1">
            {files.map((file) => (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file.path)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                  selectedFile === file.path
                    ? 'bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono truncate">{file.name}</span>
                </div>
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 px-2 leading-relaxed">
            <span className="font-semibold text-slate-700 block mb-1">Architecture Highlights:</span>
            Contains official Gmail API client, Base64URL MIME parser, FastAPI Pub/Sub webhook endpoint, and 4 test suites.
          </div>
        </div>

        {/* Right Column: Code Viewer (8 cols) */}
        <div className="lg:col-span-8 bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm flex flex-col">
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span className="text-xs font-mono font-semibold text-slate-200">
                realtime-email-spam-detection/{selectedFile}
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 flex-1 overflow-x-auto max-h-[580px]">
            {isLoading ? (
              <span className="text-xs text-slate-400 italic">Loading file content...</span>
            ) : (
              <pre className="text-xs font-mono text-slate-200 leading-relaxed">
                <code>{fileContent}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

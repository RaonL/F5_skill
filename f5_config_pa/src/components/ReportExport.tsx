import { FileSpreadsheet, FileText, Download } from 'lucide-react'
import type { AnalysisResult } from '../types/f5'
import { exportToExcel } from '../utils/reportExcel'
import { exportToHtml } from '../utils/reportHtml'

interface ReportExportProps {
  result: AnalysisResult
}

export function ReportExport({ result }: ReportExportProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={() => exportToExcel(result)}
        className="flex items-center gap-2 px-5 py-3 bg-f5-success text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-sm hover:shadow-md font-medium text-sm"
      >
        <FileSpreadsheet className="w-5 h-5" />
        <div className="text-left">
          <div>Excel 보고서</div>
          <div className="text-xs opacity-80">.xlsx</div>
        </div>
        <Download className="w-4 h-4 ml-2 opacity-70" />
      </button>

      <button
        onClick={() => exportToHtml(result)}
        className="flex items-center gap-2 px-5 py-3 bg-f5-accent text-white rounded-xl hover:bg-blue-500 transition-colors shadow-sm hover:shadow-md font-medium text-sm"
      >
        <FileText className="w-5 h-5" />
        <div className="text-left">
          <div>HTML 보고서</div>
          <div className="text-xs opacity-80">읽기 전용</div>
        </div>
        <Download className="w-4 h-4 ml-2 opacity-70" />
      </button>
    </div>
  )
}

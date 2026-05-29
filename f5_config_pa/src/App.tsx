import { useState, useCallback } from 'react'
import { FileUpload } from './components/FileUpload'
import { Dashboard } from './components/Dashboard'
import { parseBigipConf } from './parser/bigipParser'
import { analyzeConfig } from './analyzer/analyzer'
import type { AnalysisResult } from './types/f5'

export default function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ucsDebug, setUcsDebug] = useState<{
    matchedFile: string
    fileSize: number
    allEntries: { path: string; size: number }[]
    contentPreview: string
    contentLength: number
    lineCount: number
  } | null>(null)

  const handleFileLoad = useCallback((
    content: string,
    fileName: string,
    ucsInfo?: { matchedFile: string; fileSize: number; allEntries: { path: string; size: number }[] },
  ) => {
    setIsLoading(true)
    setError(null)
    setUcsDebug(null)
    try {
      const config = parseBigipConf(content, fileName)
      if (config.virtualServers.length === 0 && config.pools.length === 0) {
        const isUCS = fileName.toLowerCase().endsWith('.ucs')
        if (isUCS && ucsInfo) {
          const preview = content.substring(0, 1500)
          const lines = content.split('\n').length
          setUcsDebug({
            matchedFile: ucsInfo.matchedFile,
            fileSize: ucsInfo.fileSize,
            allEntries: ucsInfo.allEntries,
            contentPreview: preview,
            contentLength: content.length,
            lineCount: lines,
          })
          setError(
            `bigip.conf에서 Virtual Server 또는 Pool을 찾을 수 없습니다.\n\n` +
            `매칭된 파일: ${ucsInfo.matchedFile} (${formatSize(ucsInfo.fileSize)})\n` +
            `파일 크기: ${content.length}자 (${lines}줄)\n\n` +
            `아래 [디버그 정보] 섹션에서 추출된 내용을 확인할 수 있습니다.`
          )
        } else {
          setError('bigip.conf에서 Virtual Server 또는 Pool을 찾을 수 없습니다. 올바른 설정 파일인지 확인해 주세요.')
        }
        setIsLoading(false)
        return
      }
      const analysis = analyzeConfig(config)
      setTimeout(() => {
        setResult(analysis)
        setIsLoading(false)
      }, 300)
    } catch (e) {
      setError(`파싱 중 오류 발생: ${e instanceof Error ? e.message : String(e)}`)
      setIsLoading(false)
    }
  }, [])

  const handleReset = useCallback(() => {
    setResult(null)
    setError(null)
    setUcsDebug(null)
  }, [])

  return (
    <div className="min-h-screen bg-f5-bg">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-f5-blue rounded-lg p-2">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold text-f5-dark">F5 LTM Analyzer</h1>
              <p className="text-xs text-f5-gray">구성 분석 도구 v1.0</p>
            </div>
          </div>
          {result && (
            <button
              onClick={handleReset}
              className="text-sm text-f5-gray hover:text-f5-dark transition-colors"
            >
              새로 분석
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {!result ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-center mb-8">
              <div className="bg-f5-blue/10 rounded-full p-4 w-fit mx-auto mb-4">
                <svg className="w-12 h-12 text-f5-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                  <path d="M5 3L3 5l2 2" />
                  <path d="M19 3l2 2-2 2" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-f5-dark mb-2">F5 LTM Configuration Analyzer</h2>
              <p className="text-f5-gray max-w-md mx-auto">
                F5 BIG-IP의 bigip.conf / UCS 파일을 업로드하면<br />
                구성 구조를 자동으로 분석하여 시각화합니다.
              </p>
            </div>

            <FileUpload onFileLoad={handleFileLoad} isLoading={isLoading} />

            {error && (
              <div className="mt-6 max-w-3xl mx-auto w-full">
                <div className="bg-red-50 border border-red-200 text-f5-danger px-5 py-4 rounded-xl text-sm">
                  <p className="font-medium mb-1">⚠️ 오류</p>
                  <p className="whitespace-pre-wrap">{error}</p>
                </div>

                {ucsDebug && (
                  <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                    <details>
                      <summary className="px-5 py-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 rounded-xl select-none">
                        🔍 디버그 정보 — 매칭된 파일: {ucsDebug.matchedFile} ({formatSize(ucsDebug.fileSize)})
                      </summary>
                      <div className="px-5 pb-4 space-y-3">
                        <div>
                          <p className="font-medium text-gray-600 mb-1">UCS 내부 파일 목록</p>
                          <pre className="bg-white border rounded-lg p-3 text-xs text-gray-700 max-h-40 overflow-y-auto">
                            {ucsDebug.allEntries.map((e) =>
                              `${e.path.padEnd(50)} ${formatSize(e.size)}`
                            ).join('\n')}
                          </pre>
                        </div>
                        <div>
                          <p className="font-medium text-gray-600 mb-1">
                            추출된 내용 미리보기 (첫 1500자 / 총 {formatSize(ucsDebug.contentLength)}, {ucsDebug.lineCount}줄)
                          </p>
                          <pre className="bg-white border rounded-lg p-3 text-xs text-gray-700 max-h-60 overflow-y-auto font-mono leading-relaxed">{ucsDebug.contentPreview}</pre>
                        </div>
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}

            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-3xl mx-auto w-full">
              {[
                { title: '가상 서버 분석', desc: 'VS 목록, Pool 매핑, SNAT/Persistence/SSL 정보', icon: '🌐' },
                { title: 'Pool & Member', desc: 'Pool/Member 매핑, 모니터 관계, 사용량 분석', icon: '📦' },
                { title: '미사용 Object', desc: '사용되지 않는 Pool, Monitor, Profile 자동 탐지', icon: '🗑️' },
                { title: '리포트 생성', desc: 'Excel 및 HTML 보고서 자동 생성', icon: '📊' },
              ].map((feature, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 text-center hover:shadow-md transition-shadow">
                  <div className="text-2xl mb-2">{feature.icon}</div>
                  <h3 className="font-semibold text-sm text-f5-dark mb-1">{feature.title}</h3>
                  <p className="text-xs text-f5-gray">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Dashboard result={result} onReset={handleReset} />
        )}
      </main>
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

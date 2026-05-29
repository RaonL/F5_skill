import { useCallback, useRef, useState } from 'react'
import { Upload, FileText, AlertCircle, Info, Archive } from 'lucide-react'
import { cn } from '../utils/cn'
import { extractBigipConfFromUCS } from '../utils/ucsExtractor'

interface FileUploadProps {
  onFileLoad: (content: string, fileName: string, ucsInfo?: { matchedFile: string; fileSize: number; allEntries: { path: string; size: number }[] }) => void
  isLoading: boolean
}

const ACCEPTED_EXTENSIONS = '.conf,.txt,.ucs'

export function FileUpload({ onFileLoad, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)

    // Check file extension
    const fileNameLower = file.name.toLowerCase()
    const isAcceptedExt = ACCEPTED_EXTENSIONS.split(',').some(ext =>
      fileNameLower.endsWith(ext)
    )
    if (!isAcceptedExt) {
      setError('.conf, .txt, .ucs 파일만 업로드할 수 있습니다.')
      return
    }

    // Check file isn't empty
    if (file.size === 0) {
      setError('파일이 비어 있습니다.')
      return
    }

    // UCS 파일 처리 (.ucs 확장자)
    if (fileNameLower.endsWith('.ucs')) {
      setIsExtracting(true)
      try {
        const result = await extractBigipConfFromUCS(file)
        if (!result.content || result.content.trim().length === 0) {
          setError('UCS 파일 내 bigip.conf가 비어 있습니다.')
          return
        }
        // UCS 파일 처리: matchedFile 정보 포함하여 전달
        onFileLoad(result.content, file.name, {
          matchedFile: result.matchedFile,
          fileSize: result.fileSize,
          allEntries: result.allEntries,
        })
      } catch (e) {
        setError(`UCS 파일 처리 중 오류: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setIsExtracting(false)
      }
      return
    }

    // 일반 텍스트 파일 처리 (.conf, .txt)
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      if (!text || text.trim().length === 0) {
        setError('파일이 비어 있습니다.')
        return
      }
      onFileLoad(text, file.name)
    }
    reader.onerror = () => setError('파일을 읽는 중 오류가 발생했습니다.')
    reader.readAsText(file)
  }, [onFileLoad])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleClick = () => inputRef.current?.click()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-200',
          'hover:border-f5-accent hover:bg-blue-50/50',
          isDragging
            ? 'border-f5-accent bg-blue-50 scale-[1.02] shadow-lg'
            : 'border-gray-300 bg-white',
          (isLoading || isExtracting) && 'pointer-events-none opacity-60'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-4">
          {(isLoading || isExtracting) ? (
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-f5-blue border-t-transparent" />
          ) : (
            <div className={cn(
              'rounded-full p-4 transition-colors',
              isDragging ? 'bg-f5-accent/10' : 'bg-blue-50'
            )}>
              {isDragging
                ? <FileText className="w-8 h-8 text-f5-accent" />
                : <Upload className="w-8 h-8 text-f5-blue" />
              }
            </div>
          )}

          <div>
            <p className="text-lg font-semibold text-f5-dark">
              {isLoading ? '분석 중...' : isExtracting ? 'UCS 파일 처리 중...' : isDragging ? '파일을 여기에 놓으세요' : 'bigip.conf / UCS 파일 업로드'}
            </p>
            <p className="text-sm text-f5-gray mt-1">
              또는 클릭하여 파일 선택
            </p>
          </div>

          <div className="flex gap-2 text-xs text-f5-gray">
            <span className="px-2 py-1 bg-gray-100 rounded-md">bigip.conf</span>
            <span className="px-2 py-1 bg-gray-100 rounded-md">.txt</span>
            <span className="px-2 py-1 bg-f5-accent/10 text-f5-accent rounded-md border border-f5-accent/30">
              <Archive className="w-3 h-3 inline mr-0.5" />.ucs
            </span>
          </div>

          <div className="flex items-start gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span>UCS 파일 지원! .ucs 파일을 업로드하면 자동으로<br />bigip.conf를 추출하여 분석합니다.</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-f5-danger bg-red-50 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}

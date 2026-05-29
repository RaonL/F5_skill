/**
 * UCS 파일(tar.gz)에서 bigip.conf 내용을 추출합니다.
 * F5 UCS 파일은 gzip으로 압축된 tar 아카이브입니다.
 * (브라우저 내장 DecompressionStream API 사용, 외부 의존성 없음)
 */

export interface UcsExtractResult {
  content: string
  matchedFile: string
  fileSize: number
  allEntries: { path: string; size: number }[]
}

/**
 * UCS 파일(tar.gz)에서 bigip.conf 내용을 추출하고 메타데이터를 반환합니다.
 */
export async function extractBigipConfFromUCS(file: File): Promise<UcsExtractResult> {
  const arrayBuffer = await file.arrayBuffer()

  // Step 1: Gzip 압축 해제 (브라우저 내장 API)
  let tarData: Uint8Array
  try {
    tarData = await decompressGzip(new Uint8Array(arrayBuffer))
  } catch {
    throw new Error(
      'UCS 파일의 압축을 해제할 수 없습니다. 유효한 UCS 파일인지 확인해 주세요.'
    )
  }

  // Step 2: tar 파일 목록 수집
  const entries = listTarEntries(tarData)

  if (entries.length === 0) {
    throw new Error(
      'UCS 파일 내에 파일이 없습니다. 유효한 UCS 파일인지 확인해 주세요.'
    )
  }

  // Step 3: 정확한 파일명 기준으로 bigip.conf 찾기
  const bigipEntry = findBestEntry(entries, 'bigip.conf')

  if (!bigipEntry) {
    throw new Error(
      `UCS 파일 내에서 bigip.conf를 찾을 수 없습니다.\n` +
        `발견된 파일들: ${entries.slice(0, 30).map((e) => `${e.path} (${formatSize(e.size)})`).join(', ')}`,
    )
  }

  // Step 4: bigip.conf 내용 추출
  const content = extractFileFromTarAt(
    tarData,
    bigipEntry.offset,
    bigipEntry.size,
  )
  if (content === null || content.trim().length === 0) {
    throw new Error('UCS 파일 내 bigip.conf가 비어 있습니다.')
  }

  return {
    content,
    matchedFile: bigipEntry.path,
    fileSize: bigipEntry.size,
    allEntries: entries.map((e) => ({ path: e.path, size: e.size })),
  }
}

/**
 * 파일 목록에서 특정 파일명과 정확히 일치하는 항목을 찾습니다.
 * 여러 개일 경우 파일 크기가 가장 큰 항목을 반환합니다.
 */
function findBestEntry(
  entries: TarEntry[],
  targetFilename: string,
): TarEntry | null {
  // 정확한 파일명 매칭 (경로 제외, 대소문자 무관)
  const matches = entries.filter((e) => {
    const filename = e.path.replace(/\\/g, '/').split('/').filter(Boolean).pop() || ''
    return filename.toLowerCase() === targetFilename.toLowerCase()
  })

  if (matches.length > 0) {
    // 여러 개면 가장 큰 파일 선택 (메인 config가 가장 큼)
    matches.sort((a, b) => b.size - a.size)
    return matches[0]
  }

  return null
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

/**
 * DecompressionStream API를 사용하여 gzip 데이터를 압축 해제합니다.
 */
async function decompressGzip(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('이 브라우저는 gzip 압축 해제를 지원하지 않습니다.')
  }
  const ds = new DecompressionStream('gzip')
  const blob = new Blob([data])
  const decompressedStream = blob.stream().pipeThrough(ds)
  const decompressed = await new Response(decompressedStream).arrayBuffer()
  return new Uint8Array(decompressed)
}

interface TarEntry {
  path: string
  offset: number
  size: number
}

/**
 * tar 아카이브에서 모든 파일 항목 목록을 수집합니다.
 */
function listTarEntries(data: Uint8Array): TarEntry[] {
  const entries: TarEntry[] = []
  let offset = 0

  while (offset + 512 <= data.length) {
    const header = data.subarray(offset, offset + 512)

    // tar 종료 마커 (512바이트 제로 블록)
    if (isAllZeros(header)) break

    const rawName = parseString(header.subarray(0, 100))
    if (!rawName) break

    // POSIX ustar prefix (bytes 345-500) - 긴 경로명 지원
    const prefix = parseString(header.subarray(345, 500))
    const fullPath = prefix ? `${prefix}/${rawName}` : rawName

    const sizeStr = parseString(header.subarray(124, 136))
    const fileSize = parseInt(sizeStr, 8)
    if (isNaN(fileSize)) break

    // 헤더 이후 데이터 위치
    const dataOffset = offset + 512
    const paddedSize = Math.ceil(fileSize / 512) * 512

    // 디렉토리가 아닌 파일만 추가
    const typeFlag = header[156]
    if (typeFlag !== 53 && fileSize > 0) {
      // 53 = '5' = 디렉토리
      entries.push({ path: fullPath, offset: dataOffset, size: fileSize })
    }

    offset = dataOffset + paddedSize
  }

  return entries
}

/**
 * tar 데이터의 특정 위치에서 파일 내용을 추출합니다.
 */
function extractFileFromTarAt(
  data: Uint8Array,
  dataOffset: number,
  fileSize: number,
): string | null {
  if (dataOffset + fileSize > data.length || fileSize <= 0) return null
  const fileData = data.subarray(dataOffset, dataOffset + fileSize)
  return new TextDecoder('utf-8', { fatal: false }).decode(fileData)
}

/**
 * tar 헤더의 null-terminated 문자열을 읽습니다.
 */
function parseString(bytes: Uint8Array): string {
  const end = bytes.indexOf(0)
  const valid = end >= 0 ? bytes.subarray(0, end) : bytes
  return new TextDecoder('ascii').decode(valid)
}

function isAllZeros(bytes: Uint8Array): boolean {
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0) return false
  }
  return true
}

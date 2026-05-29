# 🔍 F5 LTM Configuration Analyzer

F5 BIG-IP LTM 장비의 `bigip.conf` 설정 파일을 업로드하면 구성을 자동으로 분석하여 시각화하는 웹 도구입니다.

고객사 장비 인수인계 시 VIP-Pool-Member 관계 파악, 미사용 Object 탐지, 구성 검증 등을 자동화합니다.

---

## 📸 데모 화면

![대시보드](https://img.shields.io/badge/status-available-green)

데모 페이지에서 실제 동작을 확인할 수 있습니다:
👉 **[f5-demo.html](./f5-demo.html)** — 브라우저로 직접 열어보세요

또는 `sample-bigip.conf` 파일을 웹앱에 업로드하여 동작을 테스트할 수 있습니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| **bigip.conf 파싱** | 계층형 tmsh 설정 파일을 완전히 파싱하여 객체화 |
| **Virtual Server 분석** | VS 목록, Destination, Pool 매핑, 활성/비활성 상태 |
| **SSL Profile 분석** | clientside SSL, Persistence, SNAT 구성 한눈에 확인 |
| **Pool/Member 매핑** | Pool별 Member 현황, 상태(up/down), Monitor 정보 |
| **미사용 Object 탐지** | 사용되지 않는 Pool, Monitor, Profile, iRule 자동 발견 |
| **네트워크 토폴로지** | Mermaid.js 기반 VS→Pool→Node 관계 시각화 (SVG 다운로드) |
| **보고서 내보내기** | Excel(.xlsx) 및 HTML 보고서 자동 생성 |

---

## 🚀 시작하기

### 1. 저장소 클론

```bash
git clone https://github.com/RaonL/f5_config_pa.git
cd f5_config_pa
```

### 2. 패키지 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 으로 접속합니다.

### 4. 설정 파일 업로드

1. F5 BIG-IP 장비에서 `bigip.conf` 파일을 추출합니다.
   - **SSH 접속:** `ssh admin@<F5_IP>`
   - **파일 확인:** `cat /config/bigip.conf`
   - **파일 다운로드:** SCP 또는 UCS 백업 사용
2. 웹 UI의 드래그 앤 드롭 영역에 파일을 업로드합니다.
3. 자동 분석이 완료되면 대시보드가 표시됩니다.

### 5. CLI로 보고서 직접 생성

Node.js 환경에서도 분석과 보고서 생성을 실행할 수 있습니다:

```bash
# tsx로 실행 (CLI 보고서 생성기)
npx tsx scripts/generate-report.ts

# 결과: f5-report.html 파일 생성됨
```

### 6. 프로덕션 빌드

```bash
npm run build
npm run preview    # 빌드 결과물 미리보기
```

빌드 결과물은 `dist/` 폴더에 생성됩니다.

---

## 📖 사용 방법 상세

### bigip.conf 파일 준비

F5 장비에서 설정 파일을 추출하는 방법:

```bash
# 방법 1: SSH로 직접 접속하여 파일 복사
ssh admin@f5-ltm-장비-IP
cat /config/bigip.conf > /var/tmp/bigip.conf
exit
scp admin@f5-ltm-장비-IP:/var/tmp/bigip.conf .

# 방법 2: UCS 백업 파일 사용
# tmsh save /sys ucs /var/tmp/backup.ucs
# → UCS 파일은 압축 파일이므로, bigip.conf를 추출하여 업로드
```

### 대시보드 탐색

업로드가 완료되면 다음과 같은 탭을 탐색할 수 있습니다:

#### 🌐 Virtual Server
- 모든 Virtual Server 목록 표시
- Destination, 연결된 Pool, SSL Profile, Persistence 정보
- 활성(Enabled)/비활성(Disabled) 상태 구분

#### 📦 Pool
- Pool별 상세 정보 카드
- LB 방식, Monitor, 연결된 VS 목록
- 각 Member의 상태(up/down)를 컬러 닷으로 표시
- 미사용 Pool은 빨간색 강조

#### 🔐 SSL / Profile
- SSL Profile(clientside) 분석
- Persistence, SNAT Pool, iRule 정보

#### ⚠️ 미사용 Object
- 사용되지 않는 Pool, Monitor, Profile, Persistence, iRule 자동 탐지
- 정리 대상 선정에 활용

#### 🗺️ 토폴로지
- Mermaid.js 기반 네트워크 관계도
- VS → Pool → Member 계층 구조 시각화
- SVG 파일로 다운로드 가능

#### 📊 리포트
- Monitor 상세 설정 (Interval, Timeout, Send/Recv 문자열)
- Node 목록

### 보고서 내보내기

대시보드 우측 상단의 **보고서 내보내기** 버튼을 클릭:

- **📥 Excel:** 여러 시트로 구성된 .xlsx 파일 다운로드
  - VS 목록, Pool 정보, Member 매핑, 미사용 Object 시트
- **📄 HTML:** 스타일링된 HTML 리포트 다운로드 (프린트/공유 용이)

---

## 🧪 샘플 데이터

프로젝트에 포함된 `sample-bigip.conf` 파일로 테스트할 수 있습니다:

```bash
# dev 서버 실행 후
# http://localhost:5173 에서 sample-bigip.conf 업로드
```

샘플 구성에는 다음이 포함됩니다:

| 항목 | 개수 | 설명 |
|------|:----:|------|
| Virtual Server | 6 | 웹, API, 관리자 VIP + 비활성 VS |
| Pool | 6 | 웹, API, 관리자 Pool + 미사용 Pool |
| Monitor | 5 | HTTP, HTTPS, TCP, ICMP + 미사용 |
| Profile | 5 | clientssl, cookie persistence 등 |
| iRule | 3 | API rate limit, redirect + 미사용 |
| SNAT Pool | 2 | global-snat-pool + 미사용 |

**분석 결과 예시:**
- **5개의 미사용 Object 발견** (unused-pool, http-monitor-unused, source-addr-persistence-unused, unused-snat-pool, unused-irule)
- **1개의 비활성 VS** (disabled-old-vip)
- **1개의 down 상태 Member** (10.10.1.12:80)

---

## 📁 프로젝트 구조

```
f5_config_pa/
├── index.html                 # HTML 진입점
├── package.json               # 의존성 및 스크립트
├── vite.config.ts             # Vite + React + TailwindCSS 설정
├── tsconfig.json              # TypeScript 설정
├── sample-bigip.conf          # 샘플 설정 파일 (테스트용)
├── f5-demo.html               # 데모 페이지 (별도 실행)
│
├── src/
│   ├── main.tsx               # React 진입점
│   ├── App.tsx                # 메인 앱 (업로드 → 분석 → 대시보드)
│   ├── index.css              # TailwindCSS + 커스텀 스타일
│   │
│   ├── types/
│   │   └── f5.ts              # F5 Object 타입 정의 (VS, Pool, Monitor 등)
│   │
│   ├── parser/
│   │   └── bigipParser.ts     # bigip.conf 파서 (토크나이저 → AST → 객체)
│   │
│   ├── analyzer/
│   │   └── analyzer.ts        # 구성 분석기 (매핑, 미사용 Object 탐지)
│   │
│   ├── utils/
│   │   ├── cn.ts              # className 유틸리티 (clsx + tailwind-merge)
│   │   ├── reportExcel.ts     # Excel(.xlsx) 보고서 생성
│   │   └── reportHtml.ts      # HTML 보고서 생성
│   │
│   └── components/
│       ├── Dashboard.tsx       # 메인 대시보드 (탭 내비게이션)
│       ├── FileUpload.tsx      # 드래그 앤 드롭 파일 업로드
│       ├── VirtualServerList.tsx # VS 목록 테이블
│       ├── PoolMapping.tsx     # Pool/Member 매핑 뷰
│       ├── ProfileAnalysis.tsx  # SSL/Persistence/SNAT 분석
│       ├── UnusedObjects.tsx   # 미사용 Object 탐지 결과
│       ├── TopologyDiagram.tsx  # Mermaid 토폴로지 다이어그램
│       └── ReportExport.tsx    # Excel/HTML 내보내기 버튼
│
└── scripts/
    └── generate-report.ts     # CLI 보고서 생성기 (tsx로 실행)
```

---

## 🛠 기술 스택

| 기술 | 용도 |
|------|------|
| **React 19** | UI 프레임워크 |
| **TypeScript** | 타입 안정성 |
| **Vite** | 빌드 도구 |
| **TailwindCSS v4** | 스타일링 |
| **Mermaid.js** | 토폴로지 다이어그램 |
| **SheetJS (xlsx)** | Excel 보고서 생성 |
| **lucide-react** | 아이콘 |
| **file-saver** | 파일 다운로드 |

---

## 📋 엔지니어를 위한 팁

이 도구는 다음과 같은 상황에서 유용합니다:

1. **고객사 장비 인수인계**
   - VIP가 어떤 Pool과 연결되어 있는지?
   - 이 Pool은 어디서 사용되고 있는지?
   - 이 서버는 몇 개의 서비스에 물려 있는지?
   - 안 쓰는 Object가 무엇인지?

2. **구성 정리/최적화**
   - 미사용 Object 식별 → 정리 대상 선정
   - 불필요한 Monitor, Profile 정리

3. **구성 검증**
   - 설정 파일 오류 감지
   - 참조 무결성 확인 (존재하지 않는 Pool/Profile 참조)

4. **문서화**
   - Excel/HTML 보고서로 구성 문서화
   - 토폴로지 다이어그램으로 네트워크 구조 시각화

---

## 📄 라이선스

이 프로젝트는 개인/상업적 용도로 자유롭게 사용할 수 있습니다.

---

## 📬 문의

- **GitHub:** [RaonL](https://github.com/RaonL)
- **저장소:** [https://github.com/RaonL/f5_config_pa](https://github.com/RaonL/f5_config_pa)

import { parseBigipConf } from './src/parser/bigipParser'
import { readFileSync } from 'fs'

// 사용자가 제공한 실제 conf 데이터
const testConf = `ltm virtual /Common/dvwa_vs {
    creation-time 2026-05-11:11:38:42
    destination /Common/192.168.137.211:80
    ip-protocol tcp
    last-modified-time 2026-05-18:13:37:21
    mask 255.255.255.255
    persist {
        /Common/cookie {
            default yes
        }
    }
    policies {
        /Common/asm_auto_l7_policy__dvwa_vs { }
    }
    pool /Common/dvwa_pool
    profiles {
        /Common/http { }
        /Common/tcp { }
        /Common/waf_pol.app/ASM_waf_pol { }
        /Common/websecurity { }
    }
    security-log-profiles {
        "/Common/Log Illegal requests and requests"
    }
    serverssl-use-sni disabled
    source 0.0.0.0/0
    source-address-translation {
        type automap
    }
    translate-address enabled
    translate-port enabled
}
ltm virtual /Common/n8n_vs {
    creation-time 2026-05-20:08:53:34
    destination /Common/192.168.137.200:80
    ip-protocol tcp
    last-modified-time 2026-05-20:14:47:05
    mask 255.255.255.255
    pool /Common/n8n_pool
    profiles {
        /Common/http { }
        /Common/tcp { }
    }
    rules {
        /Common/LLM_router
    }
    serverssl-use-sni disabled
    source 0.0.0.0/0
    source-address-translation {
        type automap
    }
    translate-address enabled
    translate-port enabled
}
ltm virtual-address /Common/192.168.137.200 {
    address 192.168.137.200
    arp enabled
    icmp-echo enabled
    mask 255.255.255.255
    traffic-group /Common/traffic-group-1
}
ltm virtual-address /Common/192.168.137.211 {
    address 192.168.137.211
    arp enabled
    icmp-echo enabled
    mask 255.255.255.255
    traffic-group /Common/traffic-group-1
}
ltm pool /Common/dvwa_pool {
    members {
        192.168.137.211:80 { }
    }
}
ltm pool /Common/n8n_pool {
    members {
        192.168.137.200:5678 { }
    }
}
`

console.log('=== 파서 테스트 시작 ===\n')

const config = parseBigipConf(testConf, 'test.conf')

console.log(`Virtual Servers: ${config.virtualServers.length}`)
for (const vs of config.virtualServers) {
  console.log(`  - ${vs.name} (${vs.destination}) pool: ${vs.pool}`)
}

console.log(`\nPools: ${config.pools.length}`)
for (const pool of config.pools) {
  console.log(`  - ${pool.name} (members: ${pool.members.length})`)
}

if (config.virtualServers.length === 0) {
  console.log('\n❌ Virtual Server를 찾을 수 없습니다!')
  process.exit(1)
} else {
  console.log('\n✅ Virtual Server 정상 파싱됨!')
}

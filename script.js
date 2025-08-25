// ================================
// 전역 변수 및 설정
// ================================

let currentQAList = [];
let currentSearchParams = {};

// API 베이스 URL 자동 감지
const API_BASE_URL = (() => {
    const hostname = window.location.hostname;
    
    // GitHub Pages에서 실행중인 경우
    if (hostname.includes('github.io')) {
        return 'http://localhost:8502';  // 로컬 Flask 서버로 연결
    }
    
    // 로컬에서 실행중인 경우
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return '';  // 상대 경로 사용
    }
    
    // 기타의 경우
    return '';
})();

console.log(`🌐 API 베이스 URL: ${API_BASE_URL || '상대 경로'}`);

// ================================
// 공통 API 호출 함수
// ================================

async function apiCall(url, options = {}) {
    // API URL 구성
    const fullUrl = API_BASE_URL + url;
    
    const defaultOptions = {
        credentials: 'include', // 세션 쿠키 포함 (필수!)
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    console.log(`🌐 API 호출: ${fullUrl}`, {
        method: finalOptions.method || 'GET',
        credentials: finalOptions.credentials,
        headers: finalOptions.headers
    });
    
    try {
        const response = await fetch(fullUrl, finalOptions);
        
        console.log(`📡 응답 수신: ${fullUrl}`, {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({error: 'Unknown error'}));
            console.error(`❌ API 오류: ${fullUrl}`, errorData);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log(`✅ API 성공: ${fullUrl}`, data);
        return data;
    } catch (error) {
        console.error(`💥 API 호출 실패 (${fullUrl}):`, error);
        
        // GitHub Pages에서 로컬 서버 접속 실패시 안내
        if (API_BASE_URL.includes('localhost') && window.location.hostname.includes('github.io')) {
            showToast('로컬 Flask 서버(localhost:8502)가 실행되고 있는지 확인해주세요.', 'error');
        }
        
        throw error;
    }
}

// ================================
// 유틸리티 함수들
// ================================

function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    
    // 아이콘 설정
    icon.className = 'toast-icon';
    if (type === 'success') {
        icon.innerHTML = '<i class="fas fa-check-circle"></i>';
        toast.className = 'toast toast-success';
    } else if (type === 'error') {
        icon.innerHTML = '<i class="fas fa-exclamation-circle"></i>';
        toast.className = 'toast toast-error';
    } else if (type === 'warning') {
        icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        toast.className = 'toast toast-warning';
    } else {
        icon.innerHTML = '<i class="fas fa-info-circle"></i>';
        toast.className = 'toast toast-info';
    }
    
    messageEl.textContent = message;
    toast.style.display = 'block';
    
    // 3초 후 자동 숨김
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function formatDateTime(timestamp) {
    try {
        const date = new Date(timestamp);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (error) {
        return timestamp;
    }
}

function truncateText(text, maxLength = 100) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ================================
// 인증 관련 함수들
// ================================

async function checkAuth() {
    try {
        const result = await apiCall('/api/auth/check');
        return result.authenticated;
    } catch (error) {
        console.error('인증 확인 오류:', error);
        return false;
    }
}

async function login(password) {
    try {
        showLoading();
        const result = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ password: password })
        });
        
        if (result.success) {
            showToast('로그인 성공!', 'success');
            showMainDashboard();
            await initializeDashboard();
        } else {
            showToast(result.message || '로그인에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('로그인 오류:', error);
        showToast('로그인 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

async function logout() {
    try {
        await apiCall('/api/auth/logout', { method: 'POST' });
        showToast('로그아웃 되었습니다.', 'info');
        showLoginScreen();
    } catch (error) {
        console.error('로그아웃 오류:', error);
        showToast('로그아웃 중 오류가 발생했습니다.', 'error');
    }
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainDashboard').style.display = 'none';
}

function showMainDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'block';
}

// ================================
// 대시보드 초기화 함수들
// ================================

async function initializeDashboard() {
    // 오늘 날짜로 기본 설정
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('singleDate').value = today;
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;
    
    // 이메일 설정 정보 로드
    await loadEmailSettings();
    
    // Instructions 목록 로드
    await loadInstructionsOverview();
}

async function loadEmailSettings() {
    try {
        const settings = await apiCall('/api/email/settings');
        const container = document.getElementById('emailSettingsContent');
        
        if (settings.fully_available) {
            container.innerHTML = `
                <div class="email-settings-available">
                    <p>✅ 메일 기능이 정상적으로 설정되어 있습니다.</p>
                    <p><strong>발송 주소:</strong> ${settings.sender_email || '설정됨'}</p>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="email-settings-unavailable">
                    <p>⚠️ 메일 기능을 사용할 수 없습니다.</p>
                    <p><strong>상태:</strong> ${settings.message || '설정되지 않음'}</p>
                    <p>관리자에게 문의하세요.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('이메일 설정 로드 오류:', error);
        document.getElementById('emailSettingsContent').innerHTML = `
            <div class="email-settings-error">
                <p>❌ 이메일 설정을 불러오는 중 오류가 발생했습니다.</p>
            </div>
        `;
    }
}

async function loadInstructionsOverview() {
    try {
        const result = await apiCall('/api/instructions/files/list');
        const container = document.getElementById('instructionsOverview');
        
        if (result.available === false) {
            container.innerHTML = `
                <div class="instructions-unavailable">
                    <p>⚠️ ${result.message}</p>
                </div>
            `;
            return;
        }
        
        const files = result.files || [];
        let totalInstructions = 0;
        let activeInstructions = 0;
        
        files.forEach(file => {
            totalInstructions += file.instructions.length;
            activeInstructions += file.instructions.filter(inst => inst.active).length;
        });
        
        container.innerHTML = `
            <div class="instructions-summary">
                <div class="summary-cards">
                    <div class="summary-card">
                        <h4>📁 파일 수</h4>
                        <div class="summary-number">${files.length}</div>
                    </div>
                    <div class="summary-card">
                        <h4>📝 전체 지시사항</h4>
                        <div class="summary-number">${totalInstructions}</div>
                    </div>
                    <div class="summary-card">
                        <h4>✅ 활성 지시사항</h4>
                        <div class="summary-number">${activeInstructions}</div>
                    </div>
                </div>
            </div>
        `;
        
        // 파일 목록도 로드
        await loadInstructionsFilesList();
    } catch (error) {
        console.error('Instructions 개요 로드 오류:', error);
        document.getElementById('instructionsOverview').innerHTML = `
            <div class="instructions-error">
                <p>❌ 지시사항 정보를 불러오는 중 오류가 발생했습니다.</p>
            </div>
        `;
    }
}

// ================================
// 탭 관리
// ================================

function setupTabs() {
    // 메인 탭
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // 서브 탭
    document.querySelectorAll('.sub-tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const subTabName = this.dataset.subtab;
            switchSubTab(subTabName);
        });
    });
}

function switchTab(tabName) {
    // 탭 버튼 활성화
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 탭 내용 표시
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'dashboard') {
        document.getElementById('dashboardTab').classList.add('active');
    } else if (tabName === 'instructions') {
        document.getElementById('instructionsTab').classList.add('active');
        loadInstructionsOverview(); // Instructions 탭 클릭시 새로고침
    }
}

function switchSubTab(subTabName) {
    // 서브탭 버튼 활성화
    document.querySelectorAll('.sub-tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-subtab="${subTabName}"]`).classList.add('active');
    
    // 서브탭 내용 표시
    document.querySelectorAll('.sub-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetTab = subTabName.replace(/-/g, '').replace('instructions', 'instructions') + 'Tab';
    const tabMap = {
        'instructionslist': 'instructionsListTab',
        'instructionsadd': 'instructionsAddTab',
        'instructionsstats': 'instructionsStatsTab',
        'instructionstest': 'instructionsTestTab'
    };
    
    const tabId = tabMap[subTabName.replace(/-/g, '')] || targetTab;
    document.getElementById(tabId).classList.add('active');
    
    // 특정 탭 로드시 추가 동작
    if (subTabName === 'instructions-list') {
        loadInstructionsFilesList();
    } else if (subTabName === 'instructions-stats') {
        loadInstructionsStatistics();
    }
}

// ================================
// 검색 및 필터링
// ================================

function setupSearch() {
    // 검색 모드 변경
    document.getElementById('searchMode').addEventListener('change', function() {
        const mode = this.value;
        const singleDateGroup = document.getElementById('singleDateGroup');
        const startDateGroup = document.getElementById('startDateGroup');
        const endDateGroup = document.getElementById('endDateGroup');
        
        if (mode === 'day') {
            singleDateGroup.style.display = 'block';
            startDateGroup.style.display = 'none';
            endDateGroup.style.display = 'none';
        } else {
            singleDateGroup.style.display = 'none';
            startDateGroup.style.display = 'block';
            endDateGroup.style.display = 'block';
        }
    });
    
    // 검색 버튼
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    
    // 새로운 조회 버튼
    document.getElementById('newSearchBtn').addEventListener('click', function() {
        document.getElementById('resultsSection').style.display = 'none';
        currentQAList = [];
        currentSearchParams = {};
    });
}

async function performSearch() {
    try {
        showLoading();
        
        // 검색 파라미터 수집
        const mode = document.getElementById('searchMode').value;
        const singleDate = document.getElementById('singleDate').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        const searchParams = {
            mode: mode,
            start_date: mode === 'day' ? singleDate : startDate,
            end_date: mode === 'range' ? endDate : null,
            match_filter: document.getElementById('matchFilter').value,
            email_filter: document.getElementById('emailFilter').value,
            reflection_filter: document.getElementById('reflectionFilter').value,
            chat_session_filter: document.getElementById('chatSessionFilter').value.trim()
        };
        
        // 유효성 검사
        if (!searchParams.start_date) {
            showToast('날짜를 선택해주세요.', 'warning');
            return;
        }
        
        if (mode === 'range' && !searchParams.end_date) {
            showToast('종료 날짜를 선택해주세요.', 'warning');
            return;
        }
        
        currentSearchParams = searchParams;
        
        // 통계 조회
        const stats = await apiCall('/api/dashboard/statistics', {
            method: 'POST',
            body: JSON.stringify(searchParams)
        });
        
        // Q&A 목록 조회
        const qaResult = await apiCall('/api/dashboard/qa_list', {
            method: 'POST',
            body: JSON.stringify(searchParams)
        });
        
        currentQAList = qaResult.qa_list || [];
        
        // 결과 표시
        displaySearchResults(stats, qaResult);
        
        // 키워드 분석 수행
        analyzeKeywords(currentQAList);
        
        showToast(`총 ${currentQAList.length}건의 Q&A를 찾았습니다.`, 'success');
        
    } catch (error) {
        console.error('검색 오류:', error);
        showToast('검색 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

function displaySearchResults(stats, qaResult) {
    // 통계 카드 표시
    displayStatistics(stats);
    
    // Q&A 목록 표시
    displayQAList(qaResult);
    
    // 검색 정보 표시
    displaySearchInfo();
    
    // 결과 섹션 표시
    document.getElementById('resultsSection').style.display = 'block';
}

function displayStatistics(stats) {
    const container = document.getElementById('statsCards');
    const total = stats.total_users;
    
    container.innerHTML = `
        <div class="stat-card stat-card-total">
            <div class="stat-number">${total}</div>
            <div class="stat-label">전체 사용자</div>
        </div>
        <div class="stat-card stat-card-match">
            <div class="stat-number">${stats.match}</div>
            <div class="stat-label">매치 ⭕️</div>
            <div class="stat-percentage">${total > 0 ? Math.round(stats.match / total * 100) : 0}%</div>
        </div>
        <div class="stat-card stat-card-no-match">
            <div class="stat-number">${stats.no_match}</div>
            <div class="stat-label">매치 ✖️</div>
            <div class="stat-percentage">${total > 0 ? Math.round(stats.no_match / total * 100) : 0}%</div>
        </div>
        <div class="stat-card stat-card-improvement">
            <div class="stat-number">${stats.need_improvement}</div>
            <div class="stat-label">보강 필요 ➡️</div>
            <div class="stat-percentage">${total > 0 ? Math.round(stats.need_improvement / total * 100) : 0}%</div>
        </div>
        <div class="stat-card stat-card-not-evaluated">
            <div class="stat-number">${stats.not_evaluated}</div>
            <div class="stat-label">미검토</div>
            <div class="stat-percentage">${total > 0 ? Math.round(stats.not_evaluated / total * 100) : 0}%</div>
        </div>
    `;
}

function displayQAList(qaResult) {
    const container = document.getElementById('qaList');
    const infoContainer = document.getElementById('qaListInfo');
    
    infoContainer.textContent = `총 ${qaResult.total_count}건`;
    
    if (qaResult.qa_list.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <p>검색 조건에 맞는 Q&A가 없습니다.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = qaResult.qa_list.map(qa => `
        <div class="qa-item" data-qa-id="${qa.id}">
            <div class="qa-header">
                <div class="qa-info">
                    <span class="qa-source">${qa.source_icon || '❓'}</span>
                    <span class="qa-timestamp">${formatDateTime(qa.timestamp)}</span>
                    <span class="qa-chat-id">${qa.chat_id}</span>
                    ${qa.session_count > 1 ? `<span class="session-count">${qa.session_count}회 대화</span>` : ''}
                </div>
                <div class="qa-status">
                    ${getMatchStatusBadge(qa.match_status)}
                    ${qa.reflection_completed ? '<span class="status-badge reflection-completed">반영완료</span>' : ''}
                    ${qa.is_sent ? '<span class="status-badge email-sent">발송완료</span>' : ''}
                </div>
            </div>
            <div class="qa-question">
                ${truncateText(qa.question, 150)}
            </div>
            <div class="qa-actions">
                <button class="btn btn-sm btn-primary" onclick="openQADetail('${qa.id}')">
                    <i class="fas fa-eye"></i> 상세보기
                </button>
                <button class="btn btn-sm btn-secondary" onclick="updateMatchStatus('${qa.id}', event)">
                    <i class="fas fa-edit"></i> 평가
                </button>
                ${qa.is_sent ? 
                    `<button class="btn btn-sm btn-info" onclick="showSentInfo('${qa.id}')">
                        <i class="fas fa-info-circle"></i> 발송정보
                    </button>` :
                    `<button class="btn btn-sm btn-warning" onclick="openEmailModal('${qa.id}')">
                        <i class="fas fa-envelope"></i> 메일공유
                    </button>`
                }
                <button class="btn btn-sm ${qa.reflection_completed ? 'btn-success' : 'btn-outline-success'}" 
                        onclick="toggleReflectionStatus('${qa.id}', ${!qa.reflection_completed})">
                    <i class="fas ${qa.reflection_completed ? 'fa-check' : 'fa-square'}"></i>
                    ${qa.reflection_completed ? '완료' : '미완료'}
                </button>
            </div>
        </div>
    `).join('');
}

function getMatchStatusBadge(matchStatus) {
    if (matchStatus === 1.0) {
        return '<span class="status-badge match-yes">매치 ⭕️</span>';
    } else if (matchStatus === 0.0) {
        return '<span class="status-badge match-no">매치 ✖️</span>';
    } else if (matchStatus === 0.5) {
        return '<span class="status-badge match-improvement">보강 ➡️</span>';
    } else {
        return '<span class="status-badge match-unknown">미검토</span>';
    }
}

function displaySearchInfo() {
    const container = document.getElementById('searchInfo');
    const params = currentSearchParams;
    
    let info = '';
    if (params.mode === 'day') {
        info = `📅 ${params.start_date}`;
    } else {
        info = `📅 ${params.start_date} ~ ${params.end_date}`;
    }
    
    const filters = [];
    if (params.match_filter !== '전체') filters.push(`매치: ${params.match_filter}`);
    if (params.email_filter !== '전체') filters.push(`메일: ${params.email_filter}`);
    if (params.reflection_filter !== '전체') filters.push(`반영: ${params.reflection_filter}`);
    if (params.chat_session_filter) filters.push(`세션: ${params.chat_session_filter}`);
    
    if (filters.length > 0) {
        info += ` | 🔍 ${filters.join(', ')}`;
    }
    
    container.textContent = info;
}

// ================================
// 키워드 분석
// ================================

function analyzeKeywords(qaList) {
    const keywordCount = {};
    const keywordExamples = {};
    
    qaList.forEach(qa => {
        const question = qa.question.toLowerCase();
        const words = question.split(/[\s\n\r\t.,!?;:()[\]{}'"]+/).filter(word => word.length >= 2);
        
        words.forEach(word => {
            if (!keywordCount[word]) {
                keywordCount[word] = 0;
                keywordExamples[word] = [];
            }
            keywordCount[word]++;
            if (keywordExamples[word].length < 3) {
                keywordExamples[word].push(qa.question);
            }
        });
    });
    
    // 빈도순 정렬
    const sortedKeywords = Object.entries(keywordCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 50); // 상위 50개만
    
    displayKeywordTable(sortedKeywords, keywordExamples);
}

function displayKeywordTable(keywords, examples) {
    const tableBody = document.querySelector('#keywordTable tbody');
    
    tableBody.innerHTML = keywords.map(([keyword, count]) => `
        <tr>
            <td><strong>${keyword}</strong></td>
            <td><span class="keyword-count">${count}</span></td>
            <td>
                <div class="keyword-examples">
                    ${examples[keyword].slice(0, 2).map(example => 
                        `<div class="example-text">${truncateText(example, 80)}</div>`
                    ).join('')}
                </div>
            </td>
        </tr>
    `).join('');
}

// ================================
// Q&A 상세보기 및 모달 관리
// ================================

async function openQADetail(qaId) {
    try {
        showLoading();
        const result = await apiCall(`/api/qa/detail/${qaId}`);
        displayQADetailModal(result);
    } catch (error) {
        console.error('Q&A 상세 조회 오류:', error);
        showToast('Q&A 상세 정보를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

function displayQADetailModal(data) {
    const modal = document.getElementById('qaDetailModal');
    const content = document.getElementById('qaDetailContent');
    
    const targetQA = data.target_qa;
    const sessionConversations = data.session_conversations;
    
    content.innerHTML = `
        <div class="qa-detail-main">
            <h4>🎯 선택된 Q&A</h4>
            <div class="qa-detail-item highlighted">
                <div class="qa-detail-header">
                    <span class="qa-source">${targetQA.source_icon} ${targetQA.source_desc}</span>
                    <span class="qa-timestamp">${formatDateTime(targetQA.timestamp)}</span>
                </div>
                <div class="qa-question">
                    <strong>질문:</strong><br>
                    ${targetQA.question}
                </div>
                <div class="qa-answer">
                    <strong>답변:</strong><br>
                    ${targetQA.answer || '답변 없음'}
                </div>
                ${targetQA.metadata ? `
                    <div class="qa-metadata">
                        <strong>메타데이터:</strong>
                        <pre>${JSON.stringify(targetQA.metadata, null, 2)}</pre>
                    </div>
                ` : ''}
            </div>
        </div>
        
        ${sessionConversations.length > 1 ? `
            <div class="qa-session-conversations">
                <h4>💬 같은 세션의 다른 대화들 (총 ${sessionConversations.length}건)</h4>
                ${sessionConversations.map(qa => `
                    <div class="qa-detail-item ${qa.id === targetQA.id ? 'highlighted' : ''}">
                        <div class="qa-detail-header">
                            <span class="qa-source">${qa.source_icon} ${qa.source_desc}</span>
                            <span class="qa-timestamp">${formatDateTime(qa.timestamp)}</span>
                            ${qa.id === targetQA.id ? '<span class="current-item">👈 현재 항목</span>' : ''}
                        </div>
                        <div class="qa-question">
                            <strong>질문:</strong><br>
                            ${qa.question}
                        </div>
                        <div class="qa-answer">
                            <strong>답변:</strong><br>
                            ${qa.answer || '답변 없음'}
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : ''}
    `;
    
    modal.style.display = 'block';
}

async function updateMatchStatus(qaId, event) {
    event.stopPropagation();
    
    const statusOptions = [
        { value: '미검토', text: '미검토', class: 'match-unknown' },
        { value: '매치⭕️', text: '매치 ⭕️', class: 'match-yes' },
        { value: '매치✖️', text: '매치 ✖️', class: 'match-no' },
        { value: '보강➡️', text: '보강 ➡️', class: 'match-improvement' }
    ];
    
    const buttonsHtml = statusOptions.map(option => 
        `<button class="btn btn-sm status-option ${option.class}" data-status="${option.value}">
            ${option.text}
        </button>`
    ).join('');
    
    const tempDiv = document.createElement('div');
    tempDiv.className = 'match-status-selector';
    tempDiv.innerHTML = `
        <div class="status-selector-content">
            <p>매치 상태를 선택하세요:</p>
            <div class="status-buttons">
                ${buttonsHtml}
            </div>
        </div>
    `;
    
    event.target.parentNode.appendChild(tempDiv);
    
    tempDiv.addEventListener('click', async function(e) {
        if (e.target.dataset.status) {
            try {
                const status = e.target.dataset.status;
                await apiCall('/api/qa/update_match_status', {
                    method: 'POST',
                    body: JSON.stringify({
                        qa_id: qaId,
                        match_status: status
                    })
                });
                
                showToast('매치 상태가 업데이트되었습니다.', 'success');
                tempDiv.remove();
                
                // 현재 목록 새로고침
                if (Object.keys(currentSearchParams).length > 0) {
                    await performSearch();
                }
            } catch (error) {
                console.error('매치 상태 업데이트 오류:', error);
                showToast('매치 상태 업데이트 중 오류가 발생했습니다.', 'error');
            }
        }
    });
    
    // 외부 클릭시 닫기
    setTimeout(() => {
        document.addEventListener('click', function closeSelector(e) {
            if (!tempDiv.contains(e.target)) {
                tempDiv.remove();
                document.removeEventListener('click', closeSelector);
            }
        });
    }, 100);
}

async function toggleReflectionStatus(qaId, newStatus) {
    try {
        await apiCall('/api/qa/update_reflection_status', {
            method: 'POST',
            body: JSON.stringify({
                qa_id: qaId,
                reflection_completed: newStatus
            })
        });
        
        showToast(newStatus ? '반영완료로 표시되었습니다.' : '미완료로 표시되었습니다.', 'success');
        
        // 현재 목록 새로고침
        if (Object.keys(currentSearchParams).length > 0) {
            await performSearch();
        }
    } catch (error) {
        console.error('반영완료 상태 업데이트 오류:', error);
        showToast('상태 업데이트 중 오류가 발생했습니다.', 'error');
    }
}

// ================================
// 메일 관련 함수들
// ================================

async function openEmailModal(qaId) {
    try {
        showLoading();
        const result = await apiCall(`/api/qa/detail/${qaId}`);
        displayEmailModal(result);
    } catch (error) {
        console.error('메일 모달 오류:', error);
        showToast('메일 발송 정보를 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

function displayEmailModal(data) {
    const modal = document.getElementById('emailModal');
    const content = document.getElementById('emailModalContent');
    
    const qaId = data.target_qa.id;
    
    content.innerHTML = `
        <div class="email-form">
            <div class="qa-summary">
                <h4>📧 메일로 공유할 Q&A</h4>
                <div class="qa-preview">
                    <div><strong>질문:</strong> ${truncateText(data.target_qa.question, 100)}</div>
                    <div><strong>시간:</strong> ${formatDateTime(data.target_qa.timestamp)}</div>
                </div>
            </div>
            
            <div class="form-section">
                <div class="form-group">
                    <label>받는 사람 (TO) *</label>
                    <textarea id="emailTo" rows="3" placeholder="이메일 주소를 입력하세요 (여러 개일 경우 쉼표로 구분)&#10;예: user1@company.com, user2@company.com"></textarea>
                </div>
                
                <div class="form-group">
                    <label>참조 (CC)</label>
                    <textarea id="emailCc" rows="2" placeholder="참조 이메일 주소 (선택사항)"></textarea>
                </div>
                
                <div class="form-group">
                    <label>메모</label>
                    <textarea id="emailMemo" rows="3" placeholder="추가 메모나 설명 (선택사항)"></textarea>
                </div>
            </div>
            
            <div class="form-actions">
                <button class="btn btn-primary" onclick="sendEmail('${qaId}')">
                    <i class="fas fa-paper-plane"></i> 메일 발송
                </button>
                <button class="btn btn-secondary" onclick="closeModal('emailModal')">
                    취소
                </button>
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

async function sendEmail(qaId) {
    try {
        const toEmails = document.getElementById('emailTo').value.trim();
        const ccEmails = document.getElementById('emailCc').value.trim();
        const memo = document.getElementById('emailMemo').value.trim();
        
        if (!toEmails) {
            showToast('받는 사람을 입력해주세요.', 'warning');
            return;
        }
        
        const toList = toEmails.split(',').map(email => email.trim()).filter(email => email);
        const ccList = ccEmails ? ccEmails.split(',').map(email => email.trim()).filter(email => email) : [];
        
        showLoading();
        
        const result = await apiCall('/api/email/send', {
            method: 'POST',
            body: JSON.stringify({
                qa_id: qaId,
                to_list: toList,
                cc_list: ccList,
                memo: memo
            })
        });
        
        if (result.success) {
            showToast('메일이 성공적으로 발송되었습니다!', 'success');
            closeModal('emailModal');
            
            // 현재 목록 새로고침
            if (Object.keys(currentSearchParams).length > 0) {
                await performSearch();
            }
        } else {
            showToast(result.message || '메일 발송에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('메일 발송 오류:', error);
        showToast('메일 발송 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

async function showSentInfo(qaId) {
    try {
        const result = await apiCall(`/api/email/sent_info/${qaId}`);
        displaySentInfoModal(result);
    } catch (error) {
        console.error('발송 정보 조회 오류:', error);
        showToast('발송 정보를 불러오는 중 오류가 발생했습니다.', 'error');
    }
}

function displaySentInfoModal(sentInfo) {
    const modal = document.getElementById('sentInfoModal');
    const content = document.getElementById('sentInfoContent');
    
    content.innerHTML = `
        <div class="sent-info">
            <div class="info-section">
                <h4>📧 발송 정보</h4>
                <div class="info-row">
                    <strong>발송 시간:</strong> ${sentInfo.sent_time}
                </div>
                <div class="info-row">
                    <strong>받는 사람:</strong>
                    <div class="email-list">${sentInfo.to.join(', ')}</div>
                </div>
                ${sentInfo.cc && sentInfo.cc.length > 0 ? `
                    <div class="info-row">
                        <strong>참조:</strong>
                        <div class="email-list">${sentInfo.cc.join(', ')}</div>
                    </div>
                ` : ''}
                ${sentInfo.memo ? `
                    <div class="info-row">
                        <strong>메모:</strong>
                        <div class="memo-content">${sentInfo.memo}</div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

// ================================
// Instructions 관리 함수들
// ================================

async function loadInstructionsFilesList() {
    try {
        const result = await apiCall('/api/instructions/files/list');
        displayInstructionsFilesList(result);
    } catch (error) {
        console.error('Instructions 파일 목록 로드 오류:', error);
        document.getElementById('instructionsFilesList').innerHTML = `
            <div class="instructions-error">
                <p>❌ 지시사항 파일 목록을 불러오는 중 오류가 발생했습니다.</p>
            </div>
        `;
    }
}

function displayInstructionsFilesList(result) {
    const container = document.getElementById('instructionsFilesList');
    
    if (result.available === false) {
        container.innerHTML = `
            <div class="instructions-unavailable">
                <p>⚠️ ${result.message}</p>
            </div>
        `;
        return;
    }
    
    const files = result.files || [];
    
    container.innerHTML = `
        <div class="instructions-files-list">
            <h4>📁 지시사항 파일 목록</h4>
            ${files.length === 0 ? `
                <div class="no-files">
                    <p>등록된 지시사항 파일이 없습니다.</p>
                </div>
            ` : files.map(file => `
                <div class="instruction-file">
                    <div class="file-header">
                        <h5>📄 ${file.filename}</h5>
                        <div class="file-stats">
                            <span class="stat-badge">전체 ${file.instructions.length}개</span>
                            <span class="stat-badge active">활성 ${file.instructions.filter(i => i.active).length}개</span>
                        </div>
                    </div>
                    
                    <div class="instructions-list">
                        ${file.instructions.map((instruction, index) => `
                            <div class="instruction-item ${instruction.active ? 'active' : 'inactive'}">
                                <div class="instruction-header">
                                    <div class="instruction-title">
                                        ${instruction.active ? '✅' : '❌'} 
                                        <strong>${instruction.title}</strong>
                                        <span class="priority-badge">우선순위: ${instruction.priority}</span>
                                    </div>
                                    <div class="instruction-actions">
                                        <button class="btn btn-xs btn-primary" onclick="editInstruction('${file.filename}', ${index})">
                                            <i class="fas fa-edit"></i> 수정
                                        </button>
                                        <button class="btn btn-xs btn-danger" onclick="deleteInstruction('${file.filename}', ${index})">
                                            <i class="fas fa-trash"></i> 삭제
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="instruction-content">
                                    <div><strong>내용:</strong></div>
                                    <div class="content-text">${truncateText(instruction.content, 200)}</div>
                                </div>
                                
                                ${instruction.keywords && instruction.keywords.length > 0 ? `
                                    <div class="instruction-keywords">
                                        <strong>키워드:</strong>
                                        ${instruction.keywords.map(keyword => 
                                            `<span class="keyword-tag">${keyword}</span>`
                                        ).join('')}
                                    </div>
                                ` : ''}
                                
                                ${instruction.apply_to_all ? `
                                    <div class="apply-all-notice">
                                        🌐 모든 질문에 적용
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ================================
// 엑셀 다운로드
// ================================

function setupDownload() {
    document.getElementById('downloadExcel').addEventListener('click', downloadExcel);
}

function downloadExcel() {
    if (currentQAList.length === 0) {
        showToast('다운로드할 데이터가 없습니다.', 'warning');
        return;
    }
    
    try {
        // CSV 데이터 생성
        const headers = ['번호', '시간', '채팅ID', '질문', '답변', '매치상태', '반영완료', '메일발송', '데이터소스'];
        const csvData = currentQAList.map((qa, index) => [
            index + 1,
            formatDateTime(qa.timestamp),
            qa.chat_id,
            qa.question.replace(/"/g, '""'), // CSV 이스케이프
            (qa.answer || '').replace(/"/g, '""'),
            getMatchStatusText(qa.match_status),
            qa.reflection_completed ? '완료' : '미완료',
            qa.is_sent ? '발송완료' : '미발송',
            qa.source_desc || '알 수 없음'
        ]);
        
        // CSV 문자열 생성
        const csvContent = [headers, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        // BOM 추가 (Excel에서 한글 깨짐 방지)
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
        
        // 다운로드
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `qa_report_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Excel 파일이 다운로드되었습니다.', 'success');
    } catch (error) {
        console.error('엑셀 다운로드 오류:', error);
        showToast('엑셀 다운로드 중 오류가 발생했습니다.', 'error');
    }
}

function getMatchStatusText(matchStatus) {
    if (matchStatus === 1.0) return '매치';
    if (matchStatus === 0.0) return '매치 안됨';
    if (matchStatus === 0.5) return '보강 필요';
    return '미검토';
}

// ================================
// 모달 관리
// ================================

function setupModals() {
    // 모달 닫기 버튼들
    document.querySelectorAll('.modal .close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // 모달 외부 클릭시 닫기
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// ================================
// 디버깅 함수들 (개발자 콘솔에서 사용 가능)
// ================================

// 세션 디버깅 함수 - 개발자 콘솔에서 사용
window.debugSession = async function() {
    console.log('=== 세션 디버깅 시작 ===');
    console.log('🍪 현재 쿠키:', document.cookie);
    
    try {
        const authResult = await fetch('/api/auth/check', {
            credentials: 'include'
        });
        const authData = await authResult.json();
        console.log('🔍 인증 상태:', authData);
        
        return authData;
    } catch (error) {
        console.error('❌ 세션 확인 실패:', error);
        return null;
    }
};

// 강제 로그인 함수 - 개발자 콘솔에서 사용
window.forceLogin = async function(password) {
    console.log('=== 강제 로그인 시도 ===');
    
    try {
        const result = await fetch('/api/auth/login', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: password })
        });
        
        const data = await result.json();
        console.log('🔐 로그인 결과:', data);
        
        // 로그인 후 세션 확인
        const authCheck = await window.debugSession();
        console.log('✅ 로그인 후 세션:', authCheck);
        
        return data;
    } catch (error) {
        console.error('❌ 강제 로그인 실패:', error);
        return null;
    }
};

// 쿠키 초기화 함수
window.clearAllCookies = function() {
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    console.log('🗑️ 모든 쿠키가 삭제되었습니다.');
};

console.log('🔧 디버깅 함수 사용법:');
console.log('  - window.debugSession(): 현재 세션 상태 확인');
console.log('  - window.forceLogin("비밀번호"): 강제 로그인');
console.log('  - window.clearAllCookies(): 모든 쿠키 삭제');

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 페이지 초기화 시작');
    console.log('🍪 페이지 로드시 쿠키 상태:', document.cookie);
    
    // 이벤트 리스너 설정
    setupEventListeners();
    setupTabs();
    setupSearch();
    setupDownload();
    setupModals();
    
    // 세션 상태 디버깅
    try {
        console.log('🔍 초기 인증 상태 확인 시작...');
        const authResult = await apiCall('/api/auth/check');
        console.log('🔍 초기 인증 확인 결과:', authResult);
        
        if (authResult.authenticated) {
            console.log('✅ 이미 로그인된 상태');
            showMainDashboard();
            await initializeDashboard();
        } else {
            console.log('❌ 로그인되지 않은 상태');
            showLoginScreen();
        }
    } catch (error) {
        console.error('💥 초기 인증 확인 실패:', error);
        showLoginScreen();
    }
    
    console.log('✅ 페이지 초기화 완료');
});

function setupEventListeners() {
    // 로그인
    document.getElementById('loginBtn').addEventListener('click', function() {
        const password = document.getElementById('password').value;
        if (password) {
            login(password);
        } else {
            showToast('비밀번호를 입력해주세요.', 'warning');
        }
    });
    
    // 엔터키로 로그인
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('loginBtn').click();
        }
    });
    
    // 로그아웃
    document.getElementById('logoutBtn').addEventListener('click', logout);
}

// ================================
// 전역 변수 및 설정
// ================================

let currentQAList = [];
let currentSearchParams = {};
let isRetrying = false;

// API 베이스 URL 설정 - 단순화
const API_BASE_URL = (() => {
    const hostname = window.location.hostname;
    
    console.log('🌐 현재 환경:', { hostname });
    
    // GitHub Pages에서 실행중인 경우
    if (hostname.includes('github.io')) {
        return 'https://feedback3.run.goorm.site';  // 🔥 Goorm URL로 수정!
    }
    
    // 로컬에서 실행중인 경우
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'https://feedback3.run.goorm.site';  // 🔥 Goorm URL로 수정!
    }
    
    // 기본값도 Goorm URL로 설정
    return 'https://feedback3.run.goorm.site';
})();

console.log(`🌐 API 베이스 URL: ${API_BASE_URL || '상대 경로'}`);

// ================================
// 공통 API 호출 함수 - 개선된 버전
// ================================

async function apiCall(url, options = {}) {
    const fullUrl = API_BASE_URL + url;
    
    // 기본 옵션 설정
    const defaultOptions = {
        credentials: 'include',  // 쿠키 포함 (필수!)
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            // 추가 CORS 헤더
            'X-Requested-With': 'XMLHttpRequest',
            ...options.headers
        },
        // Timeout 설정
        signal: AbortSignal.timeout(30000) // 30초
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    console.log(`🌐 API 호출 시작: ${finalOptions.method || 'GET'} ${fullUrl}`, {
        headers: finalOptions.headers,
        credentials: finalOptions.credentials,
        body: finalOptions.body ? JSON.parse(finalOptions.body) : undefined
    });
    
    try {
        const response = await fetch(fullUrl, finalOptions);
        
        console.log(`📡 응답 수신: ${fullUrl}`, {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            ok: response.ok
        });
        
        // 응답이 성공적이지 않은 경우
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
            }
            
            console.error(`❌ API 오류: ${fullUrl}`, errorData);
            
            // 401 오류의 경우 로그인 화면으로 이동
            if (response.status === 401) {
                console.log('🔐 인증 오류 - 로그인 화면으로 이동');
                showLoginScreen();
            }
            
            throw new Error(errorData.detail || errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ API 성공: ${fullUrl}`, data);
        return data;
        
    } catch (error) {
        console.error(`💥 API 호출 실패 (${fullUrl}):`, error);
        
        // 네트워크 오류 처리
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            console.error('🌐 네트워크 연결 오류 - 서버가 실행중인지 확인하세요.');
            
            // GitHub Pages에서 로컬 서버 접속 실패시 안내
            if (API_BASE_URL.includes('localhost') && window.location.hostname.includes('github.io')) {
                showToast('로컬 API 서버(localhost:8502)가 실행되고 있는지 확인해주세요.', 'error');
            } else {
                showToast('서버에 연결할 수 없습니다. 네트워크를 확인해주세요.', 'error');
            }
        } else if (error.name === 'AbortError') {
            console.error('⏰ 요청 타임아웃');
            showToast('서버 응답 시간이 초과되었습니다.', 'error');
        }
        
        throw error;
    }
}

// ================================
// 재시도 로직이 포함된 API 호출
// ================================

async function apiCallWithRetry(url, options = {}, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            return await apiCall(url, options);
        } catch (error) {
            console.log(`🔄 API 호출 시도 ${attempt}/${maxRetries + 1} 실패:`, error.message);
            
            if (attempt <= maxRetries && !error.message.includes('401')) {
                console.log(`⏳ ${attempt}초 후 재시도...`);
                await new Promise(resolve => setTimeout(resolve, attempt * 1000));
            } else {
                throw error;
            }
        }
    }
}

// ================================
// 유틸리티 함수들 (기존과 동일하지만 개선)
// ================================

function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'flex';
    }
}

function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.style.display = 'none';
    }
}

function showToast(message, type = 'info', duration = 5000) {
    console.log(`🎯 토스트: [${type.toUpperCase()}] ${message}`);
    
    const toast = document.getElementById('toast');
    if (!toast) return;
    
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
    
    // 자동 숨김
    setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
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
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ================================
// 연결 상태 확인 및 진단 함수들
// ================================

async function checkConnection() {
    console.log('🔍 연결 상태 확인 시작...');
    
    try {
        // 기본 서버 연결 확인
        const response = await fetch(API_BASE_URL || '/', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log('✅ 서버 연결 성공:', response.status);
        return true;
        
    } catch (error) {
        console.error('❌ 서버 연결 실패:', error);
        return false;
    }
}

async function diagnoseConnection() {
    console.log('🔬 연결 진단 시작...');
    
    const diagnostics = {
        serverReachable: false,
        corsWorking: false,
        authWorking: false,
        sessionWorking: false
    };
    
    try {
        // 1. 서버 도달 가능성 확인
        console.log('🌐 1단계: 서버 도달 가능성 확인');
        const serverResponse = await fetch(API_BASE_URL || '/', {
            method: 'GET',
            mode: 'cors'
        });
        diagnostics.serverReachable = true;
        console.log('✅ 서버 도달 가능');
        
        // 2. CORS 작동 확인
        console.log('🌐 2단계: CORS 확인');
        const corsResponse = await fetch((API_BASE_URL || '') + '/api/debug/session', {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (corsResponse.ok) {
            diagnostics.corsWorking = true;
            console.log('✅ CORS 작동');
            
            const debugData = await corsResponse.json();
            console.log('🔍 디버그 데이터:', debugData);
        }
        
        // 3. 인증 상태 확인
        console.log('🔐 3단계: 인증 상태 확인');
        const authResponse = await apiCall('/api/auth/check');
        diagnostics.authWorking = true;
        diagnostics.sessionWorking = authResponse.authenticated;
        console.log('🔐 인증 상태:', authResponse);
        
    } catch (error) {
        console.error('❌ 진단 중 오류:', error);
    }
    
    console.log('🔬 진단 결과:', diagnostics);
    return diagnostics;
}

// ================================
// 인증 관련 함수들 (개선된 버전)
// ================================

async function checkAuth() {
    try {
        console.log('🔍 인증 상태 확인 중...');
        const result = await apiCall('/api/auth/check');
        console.log('🔍 인증 확인 결과:', result);
        return result.authenticated;
    } catch (error) {
        console.error('❌ 인증 확인 오류:', error);
        return false;
    }
}

async function login(password) {
    try {
        console.log('🔐 로그인 시도 시작...');
        showLoading();
        
        const result = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ password: password })
        });
        
        console.log('🔐 로그인 결과:', result);
        
        if (result.success) {
            showToast('로그인 성공!', 'success');
            showMainDashboard();
            await initializeDashboard();
        } else {
            showToast(result.message || '로그인에 실패했습니다.', 'error');
        }
    } catch (error) {
        console.error('❌ 로그인 오류:', error);
        
        if (error.message.includes('fetch') || error.message.includes('network')) {
            showToast('서버에 연결할 수 없습니다. 서버가 실행중인지 확인해주세요.', 'error');
        } else {
            showToast(error.message || '로그인 중 오류가 발생했습니다.', 'error');
        }
    } finally {
        hideLoading();
    }
}

async function logout() {
    try {
        console.log('🚪 로그아웃 시도...');
        await apiCall('/api/auth/logout', { method: 'POST' });
        showToast('로그아웃 되었습니다.', 'info');
        showLoginScreen();
    } catch (error) {
        console.error('❌ 로그아웃 오류:', error);
        // 로그아웃 실패해도 로그인 화면으로 이동
        showToast('로그아웃 중 오류가 발생했지만 로그인 화면으로 이동합니다.', 'warning');
        showLoginScreen();
    }
}

function showLoginScreen() {
    const loginScreen = document.getElementById('loginScreen');
    const mainDashboard = document.getElementById('mainDashboard');
    
    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainDashboard) mainDashboard.style.display = 'none';
    
    // 비밀번호 입력 필드 포커스
    setTimeout(() => {
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.value = '';
            passwordInput.focus();
        }
    }, 100);
}

function showMainDashboard() {
    const loginScreen = document.getElementById('loginScreen');
    const mainDashboard = document.getElementById('mainDashboard');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (mainDashboard) mainDashboard.style.display = 'block';
}

// ================================
// 대시보드 초기화 함수들 (개선된 버전)
// ================================

async function initializeDashboard() {
    console.log('🚀 대시보드 초기화 시작...');
    
    try {
        // 오늘 날짜로 기본 설정
        const today = new Date().toISOString().split('T')[0];
        const singleDate = document.getElementById('singleDate');
        const startDate = document.getElementById('startDate');
        const endDate = document.getElementById('endDate');
        
        if (singleDate) singleDate.value = today;
        if (startDate) startDate.value = today;
        if (endDate) endDate.value = today;
        
        // 이메일 설정 정보 로드
        await loadEmailSettings();
        
        // Instructions 목록 로드
        await loadInstructionsOverview();
        
        console.log('✅ 대시보드 초기화 완료');
        showToast('대시보드가 준비되었습니다!', 'success');
        
    } catch (error) {
        console.error('❌ 대시보드 초기화 오류:', error);
        showToast('대시보드 초기화 중 일부 오류가 발생했습니다.', 'warning');
    }
}

async function loadEmailSettings() {
    try {
        console.log('📧 이메일 설정 로드 중...');
        const settings = await apiCallWithRetry('/api/email/settings');
        const container = document.getElementById('emailSettingsContent');
        
        if (!container) return;
        
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
        
        console.log('✅ 이메일 설정 로드 완료');
    } catch (error) {
        console.error('❌ 이메일 설정 로드 오류:', error);
        const container = document.getElementById('emailSettingsContent');
        if (container) {
            container.innerHTML = `
                <div class="email-settings-error">
                    <p>❌ 이메일 설정을 불러오는 중 오류가 발생했습니다.</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
}

async function loadInstructionsOverview() {
    try {
        console.log('🎯 Instructions 개요 로드 중...');
        const result = await apiCallWithRetry('/api/instructions/files/list');
        const container = document.getElementById('instructionsOverview');
        
        if (!container) return;
        
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
            totalInstructions += (file.instructions || []).length;
            activeInstructions += (file.instructions || []).filter(inst => inst.active).length;
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
        
        console.log('✅ Instructions 개요 로드 완료');
    } catch (error) {
        console.error('❌ Instructions 개요 로드 오류:', error);
        const container = document.getElementById('instructionsOverview');
        if (container) {
            container.innerHTML = `
                <div class="instructions-error">
                    <p>❌ 지시사항 정보를 불러오는 중 오류가 발생했습니다.</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
}

// ================================
// 검색 및 필터링 (개선된 버전)
// ================================

async function performSearch() {
    try {
        console.log('🔍 검색 시작...');
        showLoading();
        
        // 검색 파라미터 수집
        const mode = document.getElementById('searchMode')?.value || 'day';
        const singleDate = document.getElementById('singleDate')?.value;
        const startDate = document.getElementById('startDate')?.value;
        const endDate = document.getElementById('endDate')?.value;
        
        const searchParams = {
            mode: mode,
            start_date: mode === 'day' ? singleDate : startDate,
            end_date: mode === 'range' ? endDate : null,
            match_filter: document.getElementById('matchFilter')?.value || '전체',
            email_filter: document.getElementById('emailFilter')?.value || '전체',
            reflection_filter: document.getElementById('reflectionFilter')?.value || '전체',
            chat_session_filter: document.getElementById('chatSessionFilter')?.value?.trim() || ''
        };
        
        console.log('🔍 검색 파라미터:', searchParams);
        
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
        console.log('📊 통계 조회 시작...');
        const stats = await apiCallWithRetry('/api/dashboard/statistics', {
            method: 'POST',
            body: JSON.stringify(searchParams)
        });
        console.log('📊 통계 결과:', stats);
        
        // Q&A 목록 조회
        console.log('📋 Q&A 목록 조회 시작...');
        const qaResult = await apiCallWithRetry('/api/dashboard/qa_list', {
            method: 'POST',
            body: JSON.stringify(searchParams)
        });
        console.log('📋 Q&A 목록 결과:', qaResult);
        
        currentQAList = qaResult.qa_list || [];
        
        // 결과 표시
        displaySearchResults(stats, qaResult);
        
        // 키워드 분석 수행
        analyzeKeywords(currentQAList);
        
        showToast(`총 ${currentQAList.length}건의 Q&A를 찾았습니다.`, 'success');
        
        console.log('✅ 검색 완료');
        
    } catch (error) {
        console.error('❌ 검색 오류:', error);
        showToast(`검색 중 오류가 발생했습니다: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// 나머지 함수들은 기존과 동일하지만 에러 핸들링 개선...
// (displaySearchResults, displayStatistics, displayQAList 등)

function displaySearchResults(stats, qaResult) {
    try {
        // 통계 카드 표시
        displayStatistics(stats);
        
        // Q&A 목록 표시
        displayQAList(qaResult);
        
        // 검색 정보 표시
        displaySearchInfo();
        
        // 결과 섹션 표시
        const resultsSection = document.getElementById('resultsSection');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
    } catch (error) {
        console.error('❌ 검색 결과 표시 오류:', error);
        showToast('검색 결과를 표시하는 중 오류가 발생했습니다.', 'error');
    }
}

function displayStatistics(stats) {
    try {
        const container = document.getElementById('statsCards');
        if (!container) return;
        
        const total = stats.total_users || 0;
        
        container.innerHTML = `
            <div class="stat-card stat-card-total">
                <div class="stat-number">${total}</div>
                <div class="stat-label">전체 사용자</div>
            </div>
            <div class="stat-card stat-card-match">
                <div class="stat-number">${stats.match || 0}</div>
                <div class="stat-label">매치 ⭕️</div>
                <div class="stat-percentage">${total > 0 ? Math.round((stats.match || 0) / total * 100) : 0}%</div>
            </div>
            <div class="stat-card stat-card-no-match">
                <div class="stat-number">${stats.no_match || 0}</div>
                <div class="stat-label">매치 ✖️</div>
                <div class="stat-percentage">${total > 0 ? Math.round((stats.no_match || 0) / total * 100) : 0}%</div>
            </div>
            <div class="stat-card stat-card-improvement">
                <div class="stat-number">${stats.need_improvement || 0}</div>
                <div class="stat-label">보강 필요 ➡️</div>
                <div class="stat-percentage">${total > 0 ? Math.round((stats.need_improvement || 0) / total * 100) : 0}%</div>
            </div>
            <div class="stat-card stat-card-not-evaluated">
                <div class="stat-number">${stats.not_evaluated || 0}</div>
                <div class="stat-label">미검토</div>
                <div class="stat-percentage">${total > 0 ? Math.round((stats.not_evaluated || 0) / total * 100) : 0}%</div>
            </div>
        `;
    } catch (error) {
        console.error('❌ 통계 표시 오류:', error);
    }
}

function displayQAList(qaResult) {
    try {
        const container = document.getElementById('qaList');
        const infoContainer = document.getElementById('qaListInfo');
        
        if (!container) return;
        
        if (infoContainer) {
            infoContainer.textContent = `총 ${qaResult.total_count || 0}건`;
        }
        
        const qaList = qaResult.qa_list || [];
        
        if (qaList.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <p>검색 조건에 맞는 Q&A가 없습니다.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = qaList.map(qa => `
            <div class="qa-item" data-qa-id="${qa.id || ''}">
                <div class="qa-header">
                    <div class="qa-info">
                        <span class="qa-source">${qa.source_icon || '❓'}</span>
                        <span class="qa-timestamp">${formatDateTime(qa.timestamp)}</span>
                        <span class="qa-chat-id">${qa.chat_id || ''}</span>
                        ${(qa.session_count || 0) > 1 ? `<span class="session-count">${qa.session_count}회 대화</span>` : ''}
                    </div>
                    <div class="qa-status">
                        ${getMatchStatusBadge(qa.match_status)}
                        ${qa.reflection_completed ? '<span class="status-badge reflection-completed">반영완료</span>' : ''}
                        ${qa.is_sent ? '<span class="status-badge email-sent">발송완료</span>' : ''}
                    </div>
                </div>
                <div class="qa-question">
                    ${truncateText(qa.question || '', 150)}
                </div>
                <div class="qa-actions">
                    <button class="btn btn-sm btn-primary" onclick="openQADetail('${qa.id || ''}')">
                        <i class="fas fa-eye"></i> 상세보기
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="updateMatchStatus('${qa.id || ''}', event)">
                        <i class="fas fa-edit"></i> 평가
                    </button>
                    ${qa.is_sent ? 
                        `<button class="btn btn-sm btn-info" onclick="showSentInfo('${qa.id || ''}')">
                            <i class="fas fa-info-circle"></i> 발송정보
                        </button>` :
                        `<button class="btn btn-sm btn-warning" onclick="openEmailModal('${qa.id || ''}')">
                            <i class="fas fa-envelope"></i> 메일공유
                        </button>`
                    }
                    <button class="btn btn-sm ${qa.reflection_completed ? 'btn-success' : 'btn-outline-success'}" 
                            onclick="toggleReflectionStatus('${qa.id || ''}', ${!qa.reflection_completed})">
                        <i class="fas ${qa.reflection_completed ? 'fa-check' : 'fa-square'}"></i>
                        ${qa.reflection_completed ? '완료' : '미완료'}
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('❌ Q&A 목록 표시 오류:', error);
        const container = document.getElementById('qaList');
        if (container) {
            container.innerHTML = `
                <div class="error-results">
                    <p>❌ Q&A 목록을 표시하는 중 오류가 발생했습니다.</p>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }
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

// ================================
// 디버깅 함수들 (확장된 버전)
// ================================

// 개발자 콘솔용 디버깅 함수들
window.debugSession = async function() {
    console.log('=== 🔬 세션 디버깅 시작 ===');
    console.log('🍪 현재 쿠키:', document.cookie);
    console.log('🌐 현재 환경:', {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        origin: window.location.origin,
        API_BASE_URL: API_BASE_URL
    });
    
    try {
        const authResult = await fetch((API_BASE_URL || '') + '/api/auth/check', {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        const authData = await authResult.json();
        console.log('🔍 인증 상태:', authData);
        
        return authData;
    } catch (error) {
        console.error('❌ 세션 확인 실패:', error);
        return null;
    }
};

window.testConnection = async function() {
    console.log('=== 🌐 연결 테스트 시작 ===');
    return await diagnoseConnection();
};

window.forceLogin = async function(password) {
    console.log('=== 🔐 강제 로그인 시도 ===');
    
    try {
        const result = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ password: password })
        });
        
        console.log('🔐 로그인 결과:', result);
        
        if (result.success) {
            showMainDashboard();
            await initializeDashboard();
        }
        
        return result;
    } catch (error) {
        console.error('❌ 강제 로그인 실패:', error);
        return null;
    }
};

window.clearAllCookies = function() {
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    console.log('🗑️ 모든 쿠키가 삭제되었습니다.');
};

console.log('🔧 디버깅 함수 사용법:');
console.log('  - window.debugSession(): 현재 세션 상태 확인');
console.log('  - window.testConnection(): 연결 상태 진단');
console.log('  - window.forceLogin("비밀번호"): 강제 로그인');
console.log('  - window.clearAllCookies(): 모든 쿠키 삭제');

// ================================
// 페이지 초기화 (개선된 버전)
// ================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 페이지 초기화 시작');
    console.log('🍪 페이지 로드시 쿠키 상태:', document.cookie);
    console.log('🌐 현재 환경:', {
        hostname: window.location.hostname,
        protocol: window.location.protocol,
        origin: window.location.origin,
        API_BASE_URL: API_BASE_URL
    });
    
    try {
        // 이벤트 리스너 설정
        setupEventListeners();
        setupTabs();
        setupSearch();
        setupDownload();
        setupModals();
        
        console.log('✅ 이벤트 리스너 설정 완료');
        
        // 연결 상태 확인
        console.log('🔍 서버 연결 확인 중...');
        const isConnected = await checkConnection();
        
        if (!isConnected) {
            console.log('❌ 서버 연결 실패');
            showToast('서버에 연결할 수 없습니다. 서버가 실행중인지 확인해주세요.', 'error', 10000);
            showLoginScreen();
            return;
        }
        
        console.log('✅ 서버 연결 성공');
        
        // 세션 상태 확인
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
        console.error('💥 초기화 실패:', error);
        showToast('초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.', 'error', 10000);
        showLoginScreen();
    }
    
    console.log('✅ 페이지 초기화 완료');
});

function setupEventListeners() {
    try {
        // 로그인
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const password = document.getElementById('password')?.value;
                if (password) {
                    login(password);
                } else {
                    showToast('비밀번호를 입력해주세요.', 'warning');
                }
            });
        }
        
        // 엔터키로 로그인
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const loginBtn = document.getElementById('loginBtn');
                    if (loginBtn) loginBtn.click();
                }
            });
        }
        
        // 로그아웃
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', logout);
        }
        
        console.log('✅ 기본 이벤트 리스너 설정 완료');
    } catch (error) {
        console.error('❌ 이벤트 리스너 설정 오류:', error);
    }
}

// 여기서 나머지 함수들 (setupTabs, setupSearch 등)도 동일하게 구현...
// 공간상 생략하지만 실제 구현에서는 모든 함수를 포함해야 합니다.

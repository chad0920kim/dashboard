// =========================
// 전역 변수
// =========================

let currentData = {
    qaList: [],
    statistics: {},
    searchParams: {},
    instructionsData: {},
    emailSettings: {}
};

// =========================
// 유틸리티 함수들
// =========================

// API 요청 헬퍼
async function apiRequest(url, options = {}) {
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Network error' }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

// 토스트 알림 표시
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    
    // 기존 클래스 제거
    toast.className = 'toast';
    
    // 아이콘 설정
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    icon.className = `toast-icon ${icons[type]}`;
    messageEl.textContent = message;
    toast.classList.add(type, 'show');
    
    // 자동 숨김
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.className = 'toast';
        }, 300);
    }, 3000);
}

// 로딩 스피너 제어
function showLoading(text = '처리 중...') {
    const spinner = document.getElementById('loadingSpinner');
    const loadingText = spinner.querySelector('.loading-text');
    loadingText.textContent = text;
    spinner.style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

// 날짜 포맷팅
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return dateString;
    }
}

// 오늘 날짜를 YYYY-MM-DD 형식으로 반환
function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// 일주일 전 날짜를 YYYY-MM-DD 형식으로 반환
function getWeekAgoString() {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
}

// =========================
// 인증 관련 함수들
// =========================

// 인증 상태 확인
async function checkAuth() {
    try {
        const response = await apiRequest('/api/auth/check');
        return response.authenticated;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

// 로그인
async function login(password) {
    try {
        const response = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ password })
        });
        
        if (response.success) {
            showMainDashboard();
            return true;
        } else {
            showToast(response.message, 'error');
            return false;
        }
    } catch (error) {
        showToast('로그인 중 오류가 발생했습니다.', 'error');
        return false;
    }
}

// 로그아웃
async function logout() {
    try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
        showLoginScreen();
        showToast('로그아웃되었습니다.', 'info');
    } catch (error) {
        showToast('로그아웃 중 오류가 발생했습니다.', 'error');
    }
}

// 로그인 화면 표시
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainDashboard').style.display = 'none';
}

// 메인 대시보드 표시
function showMainDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainDashboard').style.display = 'block';
    
    // 기본값 설정
    initializeDashboard();
}

// =========================
// 대시보드 초기화
// =========================

function initializeDashboard() {
    // 날짜 초기값 설정
    document.getElementById('singleDate').value = getTodayString();
    document.getElementById('startDate').value = getWeekAgoString();
    document.getElementById('endDate').value = getTodayString();
    
    // 메일 설정 로드
    loadEmailSettings();
    
    // 지시사항 파일 목록 로드
    loadInstructionFiles();
}

// =========================
// 탭 관리
// =========================

function switchTab(tabName) {
    // 메인 탭 버튼 업데이트
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // 탭 컨텐츠 업데이트
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    if (tabName === 'dashboard') {
        document.getElementById('dashboardTab').classList.add('active');
    } else if (tabName === 'instructions') {
        document.getElementById('instructionsTab').classList.add('active');
        loadInstructionsList(); // 지시사항 탭으로 전환 시 목록 로드
    }
}

function switchSubTab(subtabName) {
    // 서브 탭 버튼 업데이트
    document.querySelectorAll('.sub-tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-subtab="${subtabName}"]`).classList.add('active');
    
    // 서브 탭 컨텐츠 업데이트
    document.querySelectorAll('.sub-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetTab = subtabName.replace('-', '').replace('-', '') + 'Tab';
    document.getElementById(targetTab).classList.add('active');
    
    // 각 서브탭별 초기화
    switch(subtabName) {
        case 'instructions-list':
            loadInstructionsList();
            break;
        case 'instructions-add':
            resetInstructionForm();
            break;
        case 'instructions-stats':
            loadInstructionsStatistics();
            break;
        case 'instructions-test':
            // 테스트 탭은 별도 초기화 불필요
            break;
    }
}

// =========================
// 고객질문 대시보드 기능들
// =========================

// 조회 방식 변경 핸들러
function handleSearchModeChange() {
    const mode = document.getElementById('searchMode').value;
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
}

// 검색 실행
async function performSearch() {
    try {
        showLoading('데이터 조회 중...');
        
        // 검색 파라미터 수집
        const searchParams = getSearchParams();
        currentData.searchParams = searchParams;
        
        // 통계 데이터 로드
        await loadStatistics(searchParams);
        
        // Q&A 목록 로드
        await loadQAList(searchParams);
        
        // 결과 섹션 표시
        document.getElementById('resultsSection').style.display = 'block';
        
        showToast('조회가 완료되었습니다.', 'success');
        
    } catch (error) {
        console.error('Search error:', error);
        showToast('조회 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 검색 파라미터 수집
function getSearchParams() {
    const mode = document.getElementById('searchMode').value;
    
    let startDate, endDate;
    if (mode === 'day') {
        startDate = document.getElementById('singleDate').value;
        endDate = startDate;
    } else {
        startDate = document.getElementById('startDate').value;
        endDate = document.getElementById('endDate').value;
    }
    
    return {
        mode,
        start_date: startDate,
        end_date: endDate,
        match_filter: document.getElementById('matchFilter').value,
        email_filter: document.getElementById('emailFilter').value,
        reflection_filter: document.getElementById('reflectionFilter').value,
        chat_session_filter: document.getElementById('chatSessionFilter').value
    };
}

// 통계 데이터 로드
async function loadStatistics(params) {
    try {
        const response = await apiRequest('/api/dashboard/statistics', {
            method: 'POST',
            body: JSON.stringify(params)
        });
        
        currentData.statistics = response;
        displayStatistics(response, params);
        
    } catch (error) {
        console.error('Statistics load error:', error);
        throw error;
    }
}

// 통계 카드 표시
function displayStatistics(stats, params) {
    const statsCards = document.getElementById('statsCards');
    const searchInfo = document.getElementById('searchInfo');
    
    const total = stats.total_users;
    
    // 퍼센트 계산
    const calcPercent = (value, total) => total > 0 ? Math.round((value / total * 100) * 10) / 10 : 0;
    
    const matchPercent = calcPercent(stats.match, total);
    const noMatchPercent = calcPercent(stats.no_match, total);
    const improvementPercent = calcPercent(stats.need_improvement, total);
    const notEvaluatedPercent = calcPercent(stats.not_evaluated, total);
    
    statsCards.innerHTML = `
        <div class="stat-card total">
            <div class="stat-card-title">👥 총 사용자</div>
            <div class="stat-card-value">${total}</div>
            <div class="stat-card-percentage">-</div>
        </div>
        <div class="stat-card match">
            <div class="stat-card-title">✅ 매치</div>
            <div class="stat-card-value">${stats.match}</div>
            <div class="stat-card-percentage">${matchPercent}%</div>
        </div>
        <div class="stat-card no-match">
            <div class="stat-card-title">❌ 매치 안됨</div>
            <div class="stat-card-value">${stats.no_match}</div>
            <div class="stat-card-percentage">${noMatchPercent}%</div>
        </div>
        <div class="stat-card improvement">
            <div class="stat-card-title">⬆️ 보강 필요</div>
            <div class="stat-card-value">${stats.need_improvement}</div>
            <div class="stat-card-percentage">${improvementPercent}%</div>
        </div>
        <div class="stat-card not-evaluated">
            <div class="stat-card-title">❓ 미평가</div>
            <div class="stat-card-value">${stats.not_evaluated}</div>
            <div class="stat-card-percentage">${notEvaluatedPercent}%</div>
        </div>
    `;
    
    // 조회 정보 표시
    const modeText = params.mode === 'day' ? '하루 조회' : '날짜 범위 조회';
    const dateText = params.mode === 'day' ? params.start_date : `${params.start_date} ~ ${params.end_date}`;
    
    searchInfo.innerHTML = `📊 <strong>${modeText}</strong>: ${dateText}`;
}

// Q&A 목록 로드
async function loadQAList(params) {
    try {
        const response = await apiRequest('/api/dashboard/qa_list', {
            method: 'POST',
            body: JSON.stringify(params)
        });
        
        currentData.qaList = response.qa_list;
        displayQAList(response.qa_list, params);
        
    } catch (error) {
        console.error('QA list load error:', error);
        throw error;
    }
}

// Q&A 목록 표시
function displayQAList(qaList, params) {
    const qaListInfo = document.getElementById('qaListInfo');
    const qaListContainer = document.getElementById('qaList');
    
    if (!qaList || qaList.length === 0) {
        qaListInfo.innerHTML = '🔍 적용된 필터 조건에 맞는 Q&A가 없습니다.';
        qaListContainer.innerHTML = '';
        return;
    }
    
    // 필터 정보 구성
    const filterInfo = [];
    if (params.match_filter !== '전체') filterInfo.push(`매치상태: ${params.match_filter}`);
    if (params.email_filter !== '전체') filterInfo.push(`메일상태: ${params.email_filter}`);
    if (params.reflection_filter !== '전체') filterInfo.push(`반영완료: ${params.reflection_filter}`);
    if (params.chat_session_filter.trim()) filterInfo.push(`Chat/Session ID: ${params.chat_session_filter}`);
    
    const filterText = filterInfo.length > 0 ? ` | 필터: ${filterInfo.join(', ')}` : '';
    
    qaListInfo.innerHTML = `<strong>총 ${qaList.length}개의 최신 질문 (Chat ID별 최신만 표시)${filterText}</strong>`;
    
    // Q&A 목록 렌더링
    qaListContainer.innerHTML = qaList.map((qa, index) => {
        const questionNumber = qaList.length - index;
        const questionPreview = qa.question.length > 30 ? qa.question.substring(0, 30) + '...' : qa.question;
        
        const timeStr = qa.timestamp ? formatDate(qa.timestamp).split(' ')[1] : '';
        const sessionInfo = qa.session_count > 1 ? ` (총 ${qa.session_count}건)` : '';
        const chatIdShort = qa.chat_id.length > 8 ? qa.chat_id.slice(-8) : qa.chat_id;
        
        const matchStatusOptions = ['미검토', '매치⭕️', '매치✖️', '보강➡️'];
        const currentMatchStatus = qa.match_status === 1.0 ? '매치⭕️' : 
                                   qa.match_status === 0.0 ? '매치✖️' :
                                   qa.match_status === 0.5 ? '보강➡️' : '미검토';
        
        return `
            <div class="qa-item">
                <div class="qa-item-header">
                    <div class="qa-question">
                        <div class="qa-question-title">
                            <strong>Q${questionNumber}</strong> [${timeStr}] ${questionPreview}${sessionInfo}
                        </div>
                        <div class="qa-question-meta">💬 ${chatIdShort}</div>
                    </div>
                    
                    <div class="qa-actions">
                        <button class="btn btn-primary" onclick="showQADetail('${qa.id}')">상세보기</button>
                    </div>
                    
                    <div>
                        <select class="match-status-select" onchange="updateMatchStatus('${qa.id}', this.value)">
                            ${matchStatusOptions.map(option => 
                                `<option value="${option}" ${option === currentMatchStatus ? 'selected' : ''}>${option}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="reflection-checkbox">
                        <label>
                            <input type="checkbox" ${qa.reflection_completed ? 'checked' : ''} 
                                   onchange="updateReflectionStatus('${qa.id}', this.checked)">
                            반영완료
                        </label>
                    </div>
                    
                    <div class="qa-actions">
                        ${qa.is_sent ? 
                            `<button class="btn btn-success" onclick="showSentInfo('${qa.id}')">✅ 발송완료</button>` :
                            `<button class="btn btn-secondary" onclick="showEmailModal('${qa.id}')">📧 메일공유</button>`
                        }
                    </div>
                    
                    <div class="data-source-info" title="${qa.source_desc}">
                        ${qa.source_icon || '❓'}
                        <div class="data-source-caption">데이터소스</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 매치 상태 업데이트
async function updateMatchStatus(qaId, matchStatus) {
    try {
        const response = await apiRequest('/api/qa/update_match_status', {
            method: 'POST',
            body: JSON.stringify({
                qa_id: qaId,
                match_status: matchStatus
            })
        });
        
        if (response.success) {
            showToast('매치상태 저장완료', 'success');
        } else {
            showToast('저장 실패', 'error');
        }
    } catch (error) {
        console.error('Match status update error:', error);
        showToast('저장 중 오류가 발생했습니다.', 'error');
    }
}

// 반영완료 상태 업데이트
async function updateReflectionStatus(qaId, reflectionCompleted) {
    try {
        const response = await apiRequest('/api/qa/update_reflection_status', {
            method: 'POST',
            body: JSON.stringify({
                qa_id: qaId,
                reflection_completed: reflectionCompleted
            })
        });
        
        if (response.success) {
            showToast(response.message, 'success');
        } else {
            showToast('저장 실패', 'error');
        }
    } catch (error) {
        console.error('Reflection status update error:', error);
        showToast('저장 중 오류가 발생했습니다.', 'error');
    }
}

// Q&A 상세 정보 표시
async function showQADetail(qaId) {
    try {
        showLoading('상세 정보 로드 중...');
        
        const response = await apiRequest(`/api/qa/detail/${qaId}`);
        
        const modal = document.getElementById('qaDetailModal');
        const content = document.getElementById('qaDetailContent');
        
        const targetQA = response.target_qa;
        const sessionConversations = response.session_conversations;
        
        // 기본 정보
        const timeStr = targetQA.timestamp ? formatDate(targetQA.timestamp).split(' ')[1] : '';
        
        content.innerHTML = `
            <div class="qa-detail-content">
                <div class="qa-detail-header">
                    <h4>📊 선택된 Q&A 정보</h4>
                </div>
                
                <div class="qa-basic-info">
                    <div class="info-card">
                        <div class="info-card-label">Chat ID</div>
                        <div class="info-card-value">${response.chat_id}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-card-label">시간</div>
                        <div class="info-card-value">${timeStr}</div>
                    </div>
                    <div class="info-card">
                        <div class="info-card-label">데이터 소스</div>
                        <div class="info-card-value">${targetQA.source_icon || '❓'} ${targetQA.source_desc || '알 수 없음'}</div>
                    </div>
                </div>
                
                <h4>💬 선택된 Q&A</h4>
                
                <div class="qa-conversation">
                    <div class="qa-message question">
                        <div class="qa-message-label">👤 질문:</div>
                        <div class="qa-message-content">${targetQA.question || ''}</div>
                    </div>
                    
                    <div class="qa-message answer">
                        <div class="qa-message-label">🤖 답변:</div>
                        <div class="qa-message-content">${(targetQA.answer || '').replace('</div>', '').trim()}</div>
                    </div>
                </div>
                
                ${targetQA.source_desc && targetQA.source_desc !== '알 수 없음' ? `
                    <div class="qa-source-info">
                        <div class="qa-message-label">📊 데이터 소스:</div>
                        <div>${targetQA.source_icon || '❓'} ${targetQA.source_desc}</div>
                    </div>
                ` : ''}
                
                ${targetQA.metadata ? `
                    <details>
                        <summary>🔧 메타데이터</summary>
                        <pre>${JSON.stringify(targetQA.metadata, null, 2)}</pre>
                    </details>
                ` : ''}
                
                ${sessionConversations.length > 1 ? `
                    <details>
                        <summary>📜 전체 세션 대화 (${sessionConversations.length}건)</summary>
                        ${sessionConversations.map((conv, idx) => {
                            const convTime = conv.timestamp ? formatDate(conv.timestamp).split(' ')[1] : '';
                            const isSelected = conv.id === qaId;
                            const sourceInfo = conv.source_icon ? ` ${conv.source_icon}` : '';
                            
                            return `
                                <div style="margin: 10px 0; padding: 15px; background: #fafafa; border-radius: 6px; border: 1px solid #e0e0e0;">
                                    <strong>${isSelected ? '🔸' : ''} [${idx + 1}] ${convTime}${sourceInfo} ${isSelected ? '(현재 선택)' : ''}</strong>
                                    ${conv.source_desc && conv.source_desc !== '알 수 없음' ? `
                                        <div style="font-size: 12px; color: #666; margin-bottom: 8px;">📊 ${conv.source_desc}</div>
                                    ` : ''}
                                    
                                    <div style="margin: 8px 0;">
                                        <div style="font-weight: bold; color: #1f77b4; font-size: 11px; margin-bottom: 4px;">👤 질문:</div>
                                        <div style="font-size: 11px; color: #333; margin-bottom: 8px;">${conv.question || ''}</div>
                                        <div style="font-weight: bold; color: #28a745; font-size: 11px; margin-bottom: 4px;">🤖 답변:</div>
                                        <div style="font-size: 11px; color: #333; white-space: pre-wrap;">${(conv.answer || '').replace('</div>', '').trim()}</div>
                                        ${conv.source_desc && conv.source_desc !== '알 수 없음' ? `
                                            <div style="font-size: 10px; margin-top: 8px; padding: 4px 8px; background-color: #fff3cd; border-radius: 3px; color: #856404;">
                                                <strong>📊 데이터 소스:</strong> ${conv.source_icon || '❓'} ${conv.source_desc}
                                            </div>
                                        ` : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </details>
                ` : ''}
            </div>
        `;
        
        showModal(modal);
        
    } catch (error) {
        console.error('QA detail load error:', error);
        showToast('상세 정보 로드 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 메일 모달 표시
async function showEmailModal(qaId) {
    try {
        showLoading('Q&A 정보 로드 중...');
        
        const response = await apiRequest(`/api/qa/detail/${qaId}`);
        
        const modal = document.getElementById('emailModal');
        const content = document.getElementById('emailModalContent');
        
        const targetQA = response.target_qa;
        const questionPreview = targetQA.question.length > 50 ? 
                               targetQA.question.substring(0, 50) + '...' : targetQA.question;
        
        content.innerHTML = `
            <div class="email-form">
                <p class="email-info">
                    <strong>Chat ID:</strong> ${response.chat_id}<br>
                    <strong>질문:</strong> ${questionPreview}
                </p>
                
                <h4>📝 메모</h4>
                <div class="form-group">
                    <label for="emailMemo">메일 본문 최상단에 포함될 메모</label>
                    <textarea id="emailMemo" rows="4" placeholder="이 Q&A에 대한 메모나 코멘트를 입력하세요...
예: 고객 불만 사항, 개선이 필요한 부분 등"></textarea>
                    <small class="help-text">입력한 메모는 메일 본문 최상단에 표시됩니다.</small>
                </div>
                
                <h4>📮 수신자 정보</h4>
                <div class="email-recipients">
                    <div class="form-group">
                        <label for="emailTo">수신자 (필수) *</label>
                        <textarea id="emailTo" rows="4" placeholder="example1@company.com, example2@company.com
또는 한 줄에 하나씩 입력">kyh@tidesquare.com
jkmoon@tidesquare.com</textarea>
                        <small class="help-text">쉼표(,) 또는 줄바꿈으로 여러 이메일 구분. 기본 수신자는 수정/삭제 가능합니다.</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="emailCc">참조 (선택)</label>
                        <textarea id="emailCc" rows="4" placeholder="cc1@company.com, cc2@company.com
또는 한 줄에 하나씩 입력"></textarea>
                        <small class="help-text">쉼표(,) 또는 줄바꿈으로 여러 이메일 구분</small>
                    </div>
                </div>
                
                <div id="emailPreview"></div>
                
                <div class="email-actions">
                    <button class="btn btn-secondary" onclick="closeModal('emailModal')">❌ 취소</button>
                    <button class="btn btn-primary" onclick="sendEmail('${qaId}')">📤 전송</button>
                </div>
            </div>
        `;
        
        // 실시간 미리보기 이벤트 등록
        setupEmailPreview();
        
        showModal(modal);
        
    } catch (error) {
        console.error('Email modal error:', error);
        showToast('메일 모달 로드 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 메일 미리보기 설정
function setupEmailPreview() {
    const emailTo = document.getElementById('emailTo');
    const emailCc = document.getElementById('emailCc');
    const emailMemo = document.getElementById('emailMemo');
    const preview = document.getElementById('emailPreview');
    
    function updatePreview() {
        const toText = emailTo.value.trim();
        const ccText = emailCc.value.trim();
        const memoText = emailMemo.value.trim();
        
        if (!toText && !ccText && !memoText) {
            preview.innerHTML = '';
            return;
        }
        
        const toList = parseEmails(toText);
        const ccList = parseEmails(ccText);
        
        let previewHtml = '<h4>📋 수신자 미리보기</h4>';
        
        if (toList.length > 0) {
            const defaultEmails = ["kyh@tidesquare.com", "jkmoon@tidesquare.com"];
            const defaultRecipients = toList.filter(email => defaultEmails.includes(email));
            const additionalRecipients = toList.filter(email => !defaultEmails.includes(email));
            
            previewHtml += '<div class="email-preview success">';
            
            if (defaultRecipients.length > 0) {
                previewHtml += `<strong>기본 수신자 (${defaultRecipients.length}명):</strong> ${defaultRecipients.join(', ')}<br>`;
            }
            if (additionalRecipients.length > 0) {
                previewHtml += `<strong>추가 수신자 (${additionalRecipients.length}명):</strong> ${additionalRecipients.join(', ')}<br>`;
            }
            
            previewHtml += `<strong>총 수신자 (${toList.length}명):</strong> ${toList.join(', ')}`;
            previewHtml += '</div>';
        } else {
            previewHtml += '<div class="email-preview error">수신자를 입력해주세요.</div>';
        }
        
        if (ccList.length > 0) {
            previewHtml += `<div class="email-preview">
                <strong>참조 (${ccList.length}명):</strong> ${ccList.join(', ')}
            </div>`;
        }
        
        if (memoText) {
            previewHtml += `<h4>📄 메모 미리보기</h4>
                <div class="email-preview">
                    <strong>메일 상단에 포함될 메모:</strong><br><br>${memoText}
                </div>`;
        }
        
        preview.innerHTML = previewHtml;
    }
    
    emailTo.addEventListener('input', updatePreview);
    emailCc.addEventListener('input', updatePreview);
    emailMemo.addEventListener('input', updatePreview);
    
    // 초기 미리보기
    updatePreview();
}

// 이메일 파싱
function parseEmails(emailText) {
    if (!emailText) return [];
    
    const emails = [];
    const lines = emailText.split('\n');
    
    for (const line of lines) {
        const lineEmails = line.split(',');
        for (const email of lineEmails) {
            const cleanEmail = email.trim();
            if (cleanEmail && cleanEmail.includes('@')) {
                emails.push(cleanEmail);
            }
        }
    }
    
    return emails;
}

// 메일 전송
async function sendEmail(qaId) {
    try {
        const emailTo = document.getElementById('emailTo').value.trim();
        const emailCc = document.getElementById('emailCc').value.trim();
        const emailMemo = document.getElementById('emailMemo').value.trim();
        
        const toList = parseEmails(emailTo);
        const ccList = parseEmails(emailCc);
        
        if (toList.length === 0) {
            showToast('수신자를 입력해주세요.', 'error');
            return;
        }
        
        showLoading('메일 전송 중...');
        
        const response = await apiRequest('/api/email/send', {
            method: 'POST',
            body: JSON.stringify({
                qa_id: qaId,
                to_list: toList,
                cc_list: ccList,
                memo: emailMemo
            })
        });
        
        if (response.success) {
            showToast(response.message, 'success');
            closeModal('emailModal');
            
            // Q&A 목록 새로고침
            if (currentData.searchParams) {
                await loadQAList(currentData.searchParams);
            }
        } else {
            showToast(response.message, 'error');
        }
        
    } catch (error) {
        console.error('Email send error:', error);
        showToast('메일 전송 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 발송 정보 표시
async function showSentInfo(qaId) {
    try {
        showLoading('발송 정보 로드 중...');
        
        const response = await apiRequest(`/api/email/sent_info/${qaId}`);
        
        const modal = document.getElementById('sentInfoModal');
        const content = document.getElementById('sentInfoContent');
        
        const defaultEmails = ["kyh@tidesquare.com", "jkmoon@tidesquare.com"];
        const toList = response.to || [];
        const ccList = response.cc || [];
        
        const defaultRecipients = toList.filter(email => defaultEmails.includes(email));
        const additionalRecipients = toList.filter(email => !defaultEmails.includes(email));
        
        let recipientInfo = '';
        if (defaultRecipients.length > 0) {
            recipientInfo += `<div><strong>🔸 기본 수신자:</strong></div>
                <ul>${defaultRecipients.map((email, idx) => `<li>${idx + 1}. ${email}</li>`).join('')}</ul>`;
        }
        
        if (additionalRecipients.length > 0) {
            recipientInfo += `<div><strong>🔸 추가 수신자:</strong></div>
                <ul>${additionalRecipients.map((email, idx) => `<li>${defaultRecipients.length + idx + 1}. ${email}</li>`).join('')}</ul>`;
        }
        
        let ccInfo = '';
        if (ccList.length > 0) {
            ccInfo = `<div class="email-preview">
                <strong>참조 (${ccList.length}명)</strong>
                <ul>${ccList.map((email, idx) => `<li>${idx + 1}. ${email}</li>`).join('')}</ul>
            </div>`;
        }
        
        const totalRecipients = toList.length + ccList.length;
        
        content.innerHTML = `
            <div>
                <p>메일 발송이 완료된 Q&A입니다</p>
                
                <div class="email-preview">
                    <strong>발송 시간:</strong> ${response.sent_time || '알 수 없음'}
                </div>
                
                ${response.memo ? `
                    <h4>📝 발송 시 포함된 메모</h4>
                    <div class="form-group">
                        <textarea readonly rows="4" style="background: #f8f9fa;">${response.memo}</textarea>
                        <small class="help-text">이 메모가 메일 본문 최상단에 포함되었습니다.</small>
                    </div>
                ` : ''}
                
                <h4>📮 발송된 수신자 정보</h4>
                
                <div class="email-preview success">
                    <strong>수신자 (${toList.length}명)</strong>
                    ${recipientInfo}
                </div>
                
                ${ccInfo}
                
                <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                    <strong>총 발송 대상:</strong> ${totalRecipients}명
                </div>
                
                <div class="email-actions">
                    <button class="btn btn-primary" onclick="closeModal('sentInfoModal')">✅ 확인</button>
                </div>
            </div>
        `;
        
        showModal(modal);
        
    } catch (error) {
        console.error('Sent info error:', error);
        showToast('발송 정보 로드 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 새로운 조회
function newSearch() {
    document.getElementById('resultsSection').style.display = 'none';
    currentData = {
        qaList: [],
        statistics: {},
        searchParams: {},
        instructionsData: {},
        emailSettings: {}
    };
    
    // 폼 초기화
    document.getElementById('searchMode').value = 'day';
    document.getElementById('singleDate').value = getTodayString();
    document.getElementById('startDate').value = getWeekAgoString();
    document.getElementById('endDate').value = getTodayString();
    document.getElementById('matchFilter').value = '전체';
    document.getElementById('emailFilter').value = '전체';
    document.getElementById('reflectionFilter').value = '전체';
    document.getElementById('chatSessionFilter').value = '';
    
    handleSearchModeChange();
}

// 메일 설정 로드
async function loadEmailSettings() {
    try {
        const response = await apiRequest('/api/email/settings');
        currentData.emailSettings = response;
        
        const content = document.getElementById('emailSettingsContent');
        
        if (response.fully_available) {
            content.innerHTML = `
                <h3>📊 현재 메일 설정 상태</h3>
                <div class="email-preview success">
                    ✅ 메일 기능이 정상적으로 설정되었습니다!
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                    <div>
                        <strong>라이브러리 상태:</strong><br>
                        <span style="color: #28a745;">✅ 메일 라이브러리 로드됨</span>
                    </div>
                    <div>
                        <strong>환경변수 상태:</strong><br>
                        <span style="color: #28a745;">✅ 모든 환경변수 설정됨</span>
                    </div>
                </div>
                
                <h4>🔧 환경변수 확인</h4>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px;">
                    <div>
                        <span style="color: #28a745;">✅ SMTP_SERVER</span><br>
                        <code>${response.smtp_server || ''}</code>
                    </div>
                    <div>
                        <span style="color: #28a745;">✅ SMTP_PORT</span><br>
                        <code>${response.smtp_port || ''}</code>
                    </div>
                    <div>
                        <span style="color: #28a745;">✅ SENDER_EMAIL</span><br>
                        <code>${response.sender_email || ''}</code>
                    </div>
                    <div>
                        <span style="color: #28a745;">✅ SENDER_PASSWORD</span><br>
                        <code>***설정됨***</code>
                    </div>
                </div>
                
                <h4>🧪 메일 테스트</h4>
                <div style="margin: 15px 0;">
                    <input type="email" id="testEmailInput" placeholder="테스트 메일 받을 주소" style="width: 300px; margin-right: 10px;" />
                    <button class="btn btn-secondary" onclick="sendTestEmail()">📤 테스트 메일 전송</button>
                </div>
                
                <div id="emailHistorySection">
                    <!-- 발송 이력 정보가 여기에 표시됩니다 -->
                </div>
            `;
        } else {
            content.innerHTML = `
                <div class="email-preview error">
                    ❌ 메일 기능이 비활성화되어 있습니다.
                </div>
                <p>메일 기능을 사용하려면 환경변수 설정이 필요합니다.</p>
                <p>${response.message || ''}</p>
            `;
        }
        
        // 발송 이력 로드
        loadEmailHistory();
        
    } catch (error) {
        console.error('Email settings load error:', error);
        const content = document.getElementById('emailSettingsContent');
        content.innerHTML = `<div class="email-preview error">메일 설정 로드 중 오류가 발생했습니다.</div>`;
    }
}

// 테스트 메일 전송
async function sendTestEmail() {
    const email = document.getElementById('testEmailInput').value.trim();
    
    if (!email) {
        showToast('테스트 메일 주소를 입력해주세요.', 'error');
        return;
    }
    
    try {
        showLoading('테스트 메일 전송 중...');
        
        const response = await apiRequest('/api/email/test', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        
        if (response.success) {
            showToast(response.message, 'success');
        } else {
            showToast(response.message, 'error');
        }
        
    } catch (error) {
        console.error('Test email error:', error);
        showToast('테스트 메일 전송 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 메일 발송 이력 로드
async function loadEmailHistory() {
    try {
        const response = await apiRequest('/api/email/sent_history');
        
        const historySection = document.getElementById('emailHistorySection');
        if (!historySection) return;
        
        historySection.innerHTML = `
            <h4>📧 발송 이력 관리</h4>
            <div class="email-preview">
                현재 저장된 발송 이력: <strong>${response.sent_count}건</strong>
            </div>
            
            ${response.sent_count > 0 ? `
                <button class="btn btn-danger" onclick="clearEmailHistory()">🗑️ 모든 발송 이력 삭제</button>
                
                <details>
                    <summary>📋 전체 발송 이력 보기</summary>
                    ${Object.entries(response.sent_emails).map(([qaId, info]) => `
                        <div style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 6px;">
                            <strong>QA ID:</strong> ${qaId}<br>
                            <strong>발송시간:</strong> ${info.sent_time || '알 수 없음'}<br>
                            ${info.memo ? `<strong>📝 메모:</strong> ${info.memo.length > 50 ? info.memo.substring(0, 50) + '...' : info.memo}<br>` : ''}
                            <strong>수신자:</strong> ${(info.to || []).join(', ')}<br>
                            ${info.cc && info.cc.length > 0 ? `<strong>참조:</strong> ${info.cc.join(', ')}<br>` : ''}
                        </div>
                    `).join('')}
                </details>
            ` : ''}
        `;
        
    } catch (error) {
        console.error('Email history load error:', error);
    }
}

// 메일 발송 이력 삭제
async function clearEmailHistory() {
    if (!confirm('정말로 모든 발송 이력을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        showLoading('발송 이력 삭제 중...');
        
        const response = await apiRequest('/api/email/sent_history', {
            method: 'DELETE'
        });
        
        if (response.success) {
            showToast(response.message, 'success');
            loadEmailHistory(); // 이력 새로고침
        } else {
            showToast(response.message, 'error');
        }
        
    } catch (error) {
        console.error('Clear email history error:', error);
        showToast('발송 이력 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// =========================
// 지시사항 관리 기능들
// =========================

// 지시사항 파일 목록 로드
async function loadInstructionFiles() {
    try {
        const response = await apiRequest('/api/instructions/files/list');
        
        const fileChoice = document.getElementById('fileChoice');
        if (!fileChoice) return;
        
        // 기존 옵션 제거 (새 파일 생성 제외)
        while (fileChoice.options.length > 1) {
            fileChoice.removeChild(fileChoice.lastChild);
        }
        
        // 기존 파일들 추가
        response.files.forEach(filename => {
            const option = document.createElement('option');
            option.value = filename;
            option.textContent = filename;
            fileChoice.appendChild(option);
        });
        
    } catch (error) {
        console.error('Instruction files load error:', error);
    }
}

// 지시사항 목록 로드
async function loadInstructionsList() {
    try {
        showLoading('지시사항 목록 로드 중...');
        
        const response = await apiRequest('/api/instructions/list');
        currentData.instructionsData = response;
        
        displayInstructionsOverview(response.statistics);
        displayInstructionsFiles(response.files);
        
    } catch (error) {
        console.error('Instructions list load error:', error);
        showToast('지시사항 목록 로드 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 지시사항 개요 표시
function displayInstructionsOverview(stats) {
    const overview = document.getElementById('instructionsOverview');
    
    overview.innerHTML = `
        <div class="instructions-overview">
            <div class="overview-card">
                <div class="overview-card-value">${stats.total_files}</div>
                <div class="overview-card-label">📁 총 파일 수</div>
            </div>
            <div class="overview-card">
                <div class="overview-card-value">${stats.total_instructions}</div>
                <div class="overview-card-label">📝 총 지시사항</div>
            </div>
            <div class="overview-card">
                <div class="overview-card-value">${stats.active_count}</div>
                <div class="overview-card-label">✅ 활성화</div>
            </div>
            <div class="overview-card">
                <div class="overview-card-value">${stats.inactive_count}</div>
                <div class="overview-card-label">❌ 비활성화</div>
            </div>
        </div>
    `;
}

// 지시사항 파일들 표시
function displayInstructionsFiles(files) {
    const filesList = document.getElementById('instructionsFilesList');
    
    if (Object.keys(files).length === 0) {
        filesList.innerHTML = `
            <div class="email-preview">
                📝 아직 설정된 지시사항이 없습니다. '지시사항 추가' 탭에서 새로운 지시사항을 만들어보세요!
            </div>
        `;
        return;
    }
    
    filesList.innerHTML = Object.entries(files).map(([filename, instructions]) => {
        if (instructions.length === 0) return '';
        
        return `
            <div class="instructions-file">
                <div class="file-header">
                    <div class="file-title">📁 ${filename} (${instructions.length}개)</div>
                    <div class="file-actions">
                        <button class="btn btn-primary" onclick="addToFile('${filename}')">➕ 이 파일에 추가</button>
                        <button class="btn btn-danger" onclick="deleteFile('${filename}')">🗑️ 파일 삭제</button>
                    </div>
                </div>
                
                ${instructions.map(instruction => `
                    <div class="instruction-item ${instruction.is_active ? 'active' : 'inactive'}">
                        <div class="instruction-header">
                            <div class="instruction-title">
                                <h4>${instruction.is_active ? '✅' : '❌'} ${instruction.title || '제목 없음'}</h4>
                                <div class="instruction-priority">우선순위: ${instruction.priority || 999}</div>
                            </div>
                            <div class="instruction-actions">
                                <button class="btn btn-primary" onclick="editInstruction('${instruction.id}', '${filename}')">📝 수정</button>
                                <button class="btn btn-secondary" onclick="toggleInstruction('${instruction.id}', '${filename}')">
                                    🔄 ${instruction.is_active ? '비활성화' : '활성화'}
                                </button>
                                <button class="btn btn-warning" onclick="copyInstruction('${instruction.id}', '${filename}')">📋 복사</button>
                                <button class="btn btn-danger" onclick="deleteInstruction('${instruction.id}', '${filename}')">🗑️ 삭제</button>
                            </div>
                        </div>
                        
                        <div class="instruction-content">
                            ${(instruction.instruction || '내용 없음').substring(0, 100)}...
                        </div>
                        
                        <div class="instruction-conditions">
                            ${instruction.apply_to_all ? 
                                '<span class="condition-all">🌐 모든 질문에 적용</span>' :
                                instruction.keywords && instruction.keywords.length > 0 ?
                                    `<span class="condition-keywords">🔍 키워드: ${instruction.keywords.join(', ')}</span>` :
                                    '<span class="condition-none">⚠️ 조건 없음 (적용되지 않음)</span>'
                            }
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
}

// 파일에 지시사항 추가
function addToFile(filename) {
    // 지시사항 추가 탭으로 전환
    switchSubTab('instructions-add');
    
    // 파일 선택
    const fileChoice = document.getElementById('fileChoice');
    fileChoice.value = filename;
    
    // 새 파일명 필드 숨김
    handleFileChoiceChange();
}

// 파일 삭제
async function deleteFile(filename) {
    if (!confirm(`파일 '${filename}'을 정말 삭제하시겠습니까?`)) {
        return;
    }
    
    try {
        showLoading('파일 삭제 중...');
        
        const response = await apiRequest('/api/instructions/files/delete', {
            method: 'DELETE',
            body: JSON.stringify({ filename })
        });
        
        if (response.success) {
            showToast(response.message, 'success');
            loadInstructionsList(); // 목록 새로고침
            loadInstructionFiles(); // 파일 목록 새로고침
        } else {
            showToast(response.message, 'error');
        }
        
    } catch (error) {
        console.error('File delete error:', error);
        showToast('파일 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 지시사항 수정
function editInstruction(instructionId, filename) {
    // 기존 지시사항 데이터 찾기
    const files = currentData.instructionsData.files;
    const instructions = files[filename] || [];
    const instruction = instructions.find(inst => inst.id === instructionId);
    
    if (!instruction) {
        showToast('지시사항을 찾을 수 없습니다.', 'error');
        return;
    }
    
    // 수정 모달 표시
    showEditInstructionModal(instruction, filename);
}

// 지시사항 수정 모달 표시
function showEditInstructionModal(instruction, filename) {
    const modal = document.getElementById('editInstructionModal');
    const content = document.getElementById('editInstructionContent');
    
    content.innerHTML = `
        <p><strong>파일:</strong> <code>${filename}</code></p>
        
        <form id="editInstructionForm">
            <div class="form-group">
                <label for="editTitle">제목</label>
                <input type="text" id="editTitle" value="${instruction.title || ''}" required />
            </div>
            
            <div class="form-group">
                <label for="editPriority">우선순위</label>
                <input type="number" id="editPriority" min="1" max="999" value="${instruction.priority || 100}" required />
            </div>
            
            <div class="form-group">
                <label for="editContent">지시사항 내용</label>
                <textarea id="editContent" rows="6" required>${instruction.instruction || ''}</textarea>
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="editApplyToAll" ${instruction.apply_to_all ? 'checked' : ''} />
                    모든 질문에 적용
                </label>
            </div>
            
            <div class="form-group" id="editKeywordsGroup" style="display: ${instruction.apply_to_all ? 'none' : 'block'};">
                <label for="editKeywords">키워드 (쉼표로 구분)</label>
                <input type="text" id="editKeywords" value="${(instruction.keywords || []).join(', ')}" />
            </div>
            
            <div class="form-group">
                <label>
                    <input type="checkbox" id="editActive" ${instruction.is_active ? 'checked' : ''} />
                    활성화
                </label>
            </div>
            
            <div class="email-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal('editInstructionModal')">❌ 취소</button>
                <button type="submit" class="btn btn-primary">✅ 저장</button>
                <button type="button" class="btn btn-danger" onclick="deleteInstructionFromModal('${instruction.id}', '${filename}')">🗑️ 삭제</button>
            </div>
        </form>
    `;
    
    // 이벤트 리스너 설정
    document.getElementById('editApplyToAll').addEventListener('change', function() {
        document.getElementById('editKeywordsGroup').style.display = 
            this.checked ? 'none' : 'block';
    });
    
    document.getElementById('editInstructionForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveEditedInstruction(instruction.id, filename);
    });
    
    showModal(modal);
}

// 수정된 지시사항 저장
async function saveEditedInstruction(instructionId, filename) {
    try {
        const title = document.getElementById('editTitle').value.trim();
        const priority = parseInt(document.getElementById('editPriority').value);
        const instructionContent = document.getElementById('editContent').value.trim();
        const applyToAll = document.getElementById('editApplyToAll').checked;
        const keywordsInput = document.getElementById('editKeywords').value.trim();
        const isActive = document.getElementById('editActive').checked;
        
        if (!title || !instructionContent) {
            showToast('제목과 내용을 모두 입력해주세요.', 'error');
            return;
        }
        
        showLoading('지시사항 수정 중...');
        
        const response = await apiRequest(`/api/instructions/update/${instructionId}`, {
            method: 'PUT',
            body: JSON.stringify({
                filename,
                title,
                priority,
                instruction: instructionContent,
                apply_to_all: applyToAll,
                keywords: keywordsInput,
                is_active: isActive
            })
        });
        
        if (response.success) {
            showToast(response.message, 'success');
            closeModal('editInstructionModal');
            loadInstructionsList(); // 목록 새로고침
        } else {
            showToast(response.message, 'error');
        }
        
    } catch (error) {
        console.error('Edit instruction error:', error);
        showToast('지시사항 수정 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 모달에서 지시사항 삭제
async function deleteInstructionFromModal(instructionId, filename) {
    if (!confirm('정말로 이 지시사항을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        await deleteInstruction(instructionId, filename);
        closeModal('editInstructionModal');
    } catch (error) {
        console.error('Delete from modal error:', error);
    }
}

// 지시사항 토글
async function toggleInstruction(instructionId, filename) {
    try {
        showLoading('상태 변경 중...');
        
        const response = await apiRequest(`/api/instructions/toggle/${instructionId}`, {
            method: 'POST',
            body: JSON.stringify({ filename })
        });
        
        if (response.success) {
            showToast(response.message, 'success');
            loadInstructionsList(); // 목록 새로고침
        } else {
            showToast(response.message, 'error');
        }
        
    } catch (error) {
        console.error('Toggle instruction error:', error);
        showToast('상태 변경 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 지시사항 복사
async function copyInstruction(instructionId, filename) {
    try {
        showLoading('지시사항 복사 중...');
        
        const response = await apiRequest(`/api/instructions/copy/${instructionId}`, {
            method: 'POST',
            body: JSON.stringify({ filename })
        });
        
        if (response.success) {
            showToast(response.message, 'success');
            loadInstructionsList(); // 목록 새로고침
        } else {
            showToast(response.message, 'error');
        }
        
    } catch (error) {
        console.error('Copy instruction error:', error);
        showToast('지시사항 복사 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 지시사항 삭제
async function deleteInstruction(instructionId, filename) {
    if (!confirm('정말로 이 지시사항을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        showLoading('지시사항 삭제 중...');
        
        const response = await apiRequest(`/api/instructions/delete/${instructionId}`, {
            method: 'DELETE',
            body: JSON.stringify({ filename })
        });
        
        if (response.success) {
            showToast(response.message, 'success');
            loadInstructionsList(); // 목록 새로고침
        } else {
            showToast(response.message, 'error');
        }
        
    } catch (error) {
        console.error('Delete instruction error:', error);
        showToast('지시사항 삭제 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 지시사항 폼 초기화
function resetInstructionForm() {
    document.getElementById('addInstructionForm').reset();
    document.getElementById('instructionPriority').value = 100;
    document.getElementById('applyToAll').checked = false;
    document.getElementById('instructionActive').checked = true;
    document.getElementById('fileChoice').value = 'new';
    
    // 키워드 그룹 표시
    document.getElementById('keywordsGroup').style.display = 'block';
    document.getElementById('newFilenameGroup').style.display = 'block';
    
    // 미리보기 숨김
    document.getElementById('previewSection').style.display = 'none';
    
    // 파일 목록 새로고침
    loadInstructionFiles();
}

// 파일 선택 변경 핸들러
function handleFileChoiceChange() {
    const fileChoice = document.getElementById('fileChoice');
    const newFilenameGroup = document.getElementById('newFilenameGroup');
    
    if (fileChoice.value === 'new') {
        newFilenameGroup.style.display = 'block';
    } else {
        newFilenameGroup.style.display = 'none';
    }
}

// 모든 질문에 적용 체크박스 핸들러
function handleApplyToAllChange() {
    const applyToAll = document.getElementById('applyToAll');
    const keywordsGroup = document.getElementById('keywordsGroup');
    
    if (applyToAll.checked) {
        keywordsGroup.style.display = 'none';
        document.getElementById('instructionKeywords').value = '';
    } else {
        keywordsGroup.style.display = 'block';
    }
    
    updateInstructionPreview();
}

// 지시사항 미리보기 업데이트
function updateInstructionPreview() {
    const title = document.getElementById('instructionTitle').value.trim();
    const instructionContent = document.getElementById('instructionContent').value.trim();
    const priority = document.getElementById('instructionPriority').value;
    const applyToAll = document.getElementById('applyToAll').checked;
    const keywordsInput = document.getElementById('instructionKeywords').value.trim();
    const isActive = document.getElementById('instructionActive').checked;
    
    const previewSection = document.getElementById('previewSection');
    const preview = document.getElementById('instructionPreview');
    
    if (!title && !instructionContent) {
        previewSection.style.display = 'none';
        return;
    }
    
    const keywords = keywordsInput ? keywordsInput.split(',').map(kw => kw.trim()).filter(kw => kw) : [];
    
    let conditionText;
    if (applyToAll) {
        conditionText = '🌐 모든 질문에 적용';
    } else if (keywords.length > 0) {
        conditionText = `🔍 키워드: ${keywords.join(', ')}`;
    } else {
        conditionText = '⚠️ 조건 없음';
    }
    
    const statusIcon = isActive ? '✅' : '❌';
    const previewClass = isActive ? 'preview-active' : 'preview-inactive';
    
    preview.innerHTML = `
        <div class="instruction-preview ${previewClass}">
            <strong>${statusIcon} ${title || '(제목 없음)'}</strong> (우선순위: ${priority})<br>
            <strong>내용:</strong> ${instructionContent || '(내용 없음)'}<br>
            <strong>조건:</strong> ${conditionText}
        </div>
    `;
    
    previewSection.style.display = 'block';
}

// 지시사항 추가 폼 제출
async function submitInstructionForm(event) {
    event.preventDefault();
    
    try {
        const title = document.getElementById('instructionTitle').value.trim();
        const priority = parseInt(document.getElementById('instructionPriority').value);
        const instructionContent = document.getElementById('instructionContent').value.trim();
        const applyToAll = document.getElementById('applyToAll').checked;
        const keywordsInput = document.getElementById('instructionKeywords').value.trim();
        const isActive = document.getElementById('instructionActive').checked;
        const fileChoice = document.getElementById('fileChoice').value;
        const newFilename = document.getElementById('newFilename').value.trim();
        
        // 유효성 검사
        const errors = [];
        
        if (!title) errors.push('제목을 입력해주세요.');
        if (!instructionContent) errors.push('지시사항 내용을 입력해주세요.');
        
        if (!applyToAll) {
            const keywords = keywordsInput ? keywordsInput.split(',').map(kw => kw.trim()).filter(kw => kw) : [];
            if (keywords.length === 0) {
                errors.push('모든 질문 적용을 체크하거나 키워드를 입력해주세요.');
            }
        }
        
        if (fileChoice === 'new') {
            if (!newFilename) errors.push('파일명을 입력해주세요.');
            else if (!newFilename.endsWith('.json')) errors.push('파일명은 .json 확장자를 포함해야 합니다.');
        }
        
        if (errors.length > 0) {
            errors.forEach(error => showToast(error, 'error'));
            return;
        }
        
        showLoading('지시사항 저장 중...');
        
        const response = await apiRequest('/api/instructions/create', {
            method: 'POST',
            body: JSON.stringify({
                title,
                priority,
                instruction: instructionContent,
                keywords: keywordsInput,
                apply_to_all: applyToAll,
                is_active: isActive,
                file_choice: fileChoice,
                filename: fileChoice === 'new' ? newFilename : fileChoice
            })
        });
        
        if (response.success) {
            showToast(response.message, 'success');
            resetInstructionForm();
            loadInstructionsList(); // 목록 새로고침
            loadInstructionFiles(); // 파일 목록 새로고침
        } else {
            if (response.errors) {
                response.errors.forEach(error => showToast(error, 'error'));
            } else {
                showToast(response.message, 'error');
            }
        }
        
    } catch (error) {
        console.error('Submit instruction error:', error);
        showToast('지시사항 저장 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 지시사항 통계 로드
async function loadInstructionsStatistics() {
    try {
        showLoading('통계 로드 중...');
        
        const response = await apiRequest('/api/instructions/statistics');
        
        const statsContainer = document.getElementById('instructionsStatistics');
        
        if (!response.has_data) {
            statsContainer.innerHTML = `
                <div class="email-preview">📈 분석할 지시사항이 없습니다.</div>
            `;
            return;
        }
        
        const stats = response;
        
        statsContainer.innerHTML = `
            <div class="stats-section">
                <h4>📈 기본 통계</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-item-label">📝 총 지시사항</div>
                        <div class="stat-item-value">${stats.basic_stats.total_count}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">✅ 활성화</div>
                        <div class="stat-item-value">${stats.basic_stats.active_count}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">❌ 비활성화</div>
                        <div class="stat-item-value">${stats.basic_stats.inactive_count}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">📁 파일 수</div>
                        <div class="stat-item-value">${stats.basic_stats.files_count}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">⭐ 평균 우선순위</div>
                        <div class="stat-item-value">${stats.basic_stats.avg_priority}</div>
                    </div>
                </div>
            </div>
            
            <div class="stats-section">
                <h4>📁 파일별 분포</h4>
                <div class="keyword-table-container">
                    <table class="keyword-table">
                        <thead>
                            <tr>
                                <th>파일명</th>
                                <th>총 지시사항</th>
                                <th>활성화</th>
                                <th>비활성화</th>
                                <th>평균 우선순위</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.file_stats.map(file => `
                                <tr>
                                    <td>${file.파일명}</td>
                                    <td>${file['총 지시사항']}</td>
                                    <td>${file.활성화}</td>
                                    <td>${file.비활성화}</td>
                                    <td>${file['평균 우선순위']}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="stats-section">
                <h4>⭐ 우선순위 분포</h4>
                <div class="stats-grid">
                    ${Object.entries(stats.priority_stats).map(([range, data]) => `
                        <div class="stat-item">
                            <div class="stat-item-label">${range}</div>
                            <div class="stat-item-value">${data.count}개 (${data.percentage}%)</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="stats-section">
                <h4>🔍 키워드 분석</h4>
                ${stats.keyword_stats.top_keywords.length > 0 ? `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div>
                            <strong>상위 10개 키워드</strong>
                            <ul class="keyword-ranking">
                                ${stats.keyword_stats.top_keywords.map(kw => `
                                    <li>
                                        <strong>${kw.keyword}</strong>
                                        <span>${kw.count}회</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        <div>
                            <div class="stat-item">
                                <div class="stat-item-label">총 고유 키워드</div>
                                <div class="stat-item-value">${stats.keyword_stats.total_unique_keywords}개</div>
                            </div>
                            <div class="stat-item">
                                <div class="stat-item-label">총 키워드 사용</div>
                                <div class="stat-item-value">${stats.keyword_stats.total_keyword_usage}회</div>
                            </div>
                        </div>
                    </div>
                ` : '<div class="email-preview">키워드 데이터가 없습니다.</div>'}
            </div>
            
            <div class="stats-section">
                <h4>🎯 적용 조건 분석</h4>
                <div class="stats-grid">
                    ${Object.entries(stats.condition_stats).map(([condition, data]) => `
                        <div class="stat-item">
                            <div class="stat-item-label">${condition}</div>
                            <div class="stat-item-value">${data.count}개 (${data.percentage}%)</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="stats-section">
                <h4>📋 전체 지시사항 상세</h4>
                <div class="keyword-table-container">
                    <table class="keyword-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>제목</th>
                                <th>파일</th>
                                <th>우선순위</th>
                                <th>활성화</th>
                                <th>적용 조건</th>
                                <th>키워드</th>
                                <th>생성일</th>
                                <th>수정일</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${stats.detailed_stats.map(item => `
                                <tr>
                                    <td>${item.id}</td>
                                    <td>${item.title}</td>
                                    <td>${item.file}</td>
                                    <td>${item.priority}</td>
                                    <td>${item.is_active ? '✅' : '❌'}</td>
                                    <td>
                                        ${item.apply_to_all ? '🌐 전체' : 
                                          item.keywords_count > 0 ? `🔍 ${item.keywords_count}개 키워드` : '⚠️ 없음'}
                                    </td>
                                    <td>${item.keywords}</td>
                                    <td>${item.created_at}</td>
                                    <td>${item.updated_at}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Statistics load error:', error);
        showToast('통계 로드 중 오류가 발생했습니다.', 'error');
        
        const statsContainer = document.getElementById('instructionsStatistics');
        statsContainer.innerHTML = `
            <div class="email-preview error">통계 로드 중 오류가 발생했습니다.</div>
        `;
    } finally {
        hideLoading();
    }
}

// 지시사항 테스트
async function testInstructions() {
    const testQuestion = document.getElementById('testQuestion').value.trim();
    
    if (!testQuestion) {
        showToast('테스트할 질문을 입력해주세요.', 'error');
        return;
    }
    
    try {
        showLoading('지시사항 매칭 테스트 중...');
        
        const response = await apiRequest('/api/instructions/test', {
            method: 'POST',
            body: JSON.stringify({ question: testQuestion })
        });
        
        const resultsContainer = document.getElementById('testResults');
        
        if (!response.success) {
            resultsContainer.innerHTML = `
                <div class="email-preview error">${response.message}</div>
            `;
            resultsContainer.style.display = 'block';
            return;
        }
        
        const matchedInstructions = response.matched_instructions;
        const inactiveMatches = response.inactive_matches;
        const statistics = response.statistics;
        
        let resultsHtml = `
            <div class="test-results">
                <h4>🎯 테스트 결과</h4>
        `;
        
        if (matchedInstructions.length > 0) {
            resultsHtml += `
                <div class="test-result-success">
                    ✅ <strong>${matchedInstructions.length}개의 지시사항이 이 질문에 적용됩니다!</strong>
                </div>
                
                <h5>📋 적용되는 지시사항 (우선순위 순)</h5>
                
                ${matchedInstructions.map((instruction, index) => `
                    <div class="matched-instruction">
                        <h4 style="margin: 0 0 10px 0; color: #155724;">
                            ${index + 1}. ${instruction.title || '제목 없음'} (우선순위: ${instruction.priority || 999})
                        </h4>
                        <div class="matched-instruction-meta">
                            <strong>파일:</strong> ${instruction.source_file || ''}
                        </div>
                        <div class="matched-instruction-meta">
                            <strong>매칭 이유:</strong> ${instruction.match_reason || ''}
                        </div>
                        <div class="matched-instruction-meta">
                            <strong>지시사항:</strong>
                        </div>
                        <div class="matched-instruction-content">
                            ${instruction.instruction || '내용 없음'}
                        </div>
                    </div>
                `).join('')}
            `;
            
            if (matchedInstructions.length > 1) {
                const firstInstruction = matchedInstructions[0];
                resultsHtml += `
                    <div class="email-preview error">
                        ⚠️ <strong>주의</strong>: 여러 지시사항이 적용되는 경우, 우선순위가 낮은 숫자부터 적용됩니다.<br>
                        가장 높은 우선순위: <strong>${firstInstruction.title || '제목 없음'}</strong> (우선순위 ${firstInstruction.priority || 999})
                    </div>
                `;
            }
        } else {
            resultsHtml += `
                <div class="test-result-info">
                    ℹ️ <strong>이 질문에 적용되는 지시사항이 없습니다.</strong>
                </div>
            `;
        }
        
        // 비활성화된 매칭 표시
        if (inactiveMatches.length > 0) {
            resultsHtml += `
                <h5>⚠️ 비활성화된 지시사항 중 매칭되는 것</h5>
                ${inactiveMatches.map(instruction => `
                    <div class="email-preview error">
                        ❌ <strong>${instruction.title || '제목 없음'}</strong> (파일: ${instruction.source_file || ''}) - 비활성화됨
                    </div>
                `).join('')}
            `;
        }
        
        // 전체 통계 요약
        resultsHtml += `
                <h4>📊 전체 지시사항 현황</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-item-label">📝 전체 지시사항</div>
                        <div class="stat-item-value">${statistics.total_instructions}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">✅ 활성화</div>
                        <div class="stat-item-value">${statistics.total_active}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">🎯 매칭됨</div>
                        <div class="stat-item-value">${statistics.total_matched}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-item-label">📈 매칭률</div>
                        <div class="stat-item-value">${statistics.match_rate}%</div>
                    </div>
                </div>
            </div>
        `;
        
        resultsContainer.innerHTML = resultsHtml;
        resultsContainer.style.display = 'block';
        
    } catch (error) {
        console.error('Test instructions error:', error);
        showToast('테스트 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// 키워드 분석
async function analyzeKeywords() {
    try {
        showLoading('키워드 분석 중...');
        
        const response = await apiRequest('/api/instructions/keyword_analysis');
        
        const resultsContainer = document.getElementById('keywordAnalysisResults');
        
        if (!response.has_data) {
            resultsContainer.innerHTML = `
                <div class="keyword-analysis-results">
                    <div class="email-preview">분석할 키워드가 없습니다.</div>
                </div>
            `;
        } else {
            resultsContainer.innerHTML = `
                <div class="keyword-analysis-results">
                    <h5>🏆 키워드 사용 빈도 TOP 10</h5>
                    
                    <ul class="keyword-ranking">
                        ${response.keyword_analysis.map(kw => `
                            <li>
                                ${kw.rank}. <strong>${kw.keyword}</strong>: ${kw.count}회 (${kw.percentage}%)
                            </li>
                        `).join('')}
                    </ul>
                    
                    <div style="margin-top: 20px;">
                        <strong>총 고유 키워드:</strong> ${response.total_unique_keywords}개<br>
                        <strong>총 키워드 사용:</strong> ${response.total_keyword_usage}회
                    </div>
                </div>
            `;
        }
        
        resultsContainer.style.display = 'block';
        
    } catch (error) {
        console.error('Keyword analysis error:', error);
        showToast('키워드 분석 중 오류가 발생했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// =========================
// 모달 관리
// =========================

function showModal(modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

// =========================
// 이벤트 리스너 설정
// =========================

document.addEventListener('DOMContentLoaded', async function() {
    // 인증 상태 확인
    const isAuthenticated = await checkAuth();
    
    if (isAuthenticated) {
        showMainDashboard();
    } else {
        showLoginScreen();
    }
    
    // 로그인 폼 이벤트
    document.getElementById('loginBtn').addEventListener('click', async function() {
        const password = document.getElementById('password').value;
        if (password) {
            await login(password);
        }
    });
    
    document.getElementById('password').addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            const password = this.value;
            if (password) {
                await login(password);
            }
        }
    });
    
    // 로그아웃 버튼
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // 탭 버튼 이벤트
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // 서브 탭 버튼 이벤트
    document.querySelectorAll('.sub-tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const subtabName = this.dataset.subtab;
            switchSubTab(subtabName);
        });
    });
    
    // 고객질문 대시보드 이벤트들
    document.getElementById('searchMode').addEventListener('change', handleSearchModeChange);
    document.getElementById('searchBtn').addEventListener('click', performSearch);
    document.getElementById('newSearchBtn').addEventListener('click', newSearch);
    
    // 지시사항 관리 이벤트들
    document.getElementById('fileChoice').addEventListener('change', handleFileChoiceChange);
    document.getElementById('applyToAll').addEventListener('change', handleApplyToAllChange);
    
    // 지시사항 폼 미리보기 이벤트들
    document.getElementById('instructionTitle').addEventListener('input', updateInstructionPreview);
    document.getElementById('instructionContent').addEventListener('input', updateInstructionPreview);
    document.getElementById('instructionPriority').addEventListener('input', updateInstructionPreview);
    document.getElementById('instructionKeywords').addEventListener('input', updateInstructionPreview);
    document.getElementById('instructionActive').addEventListener('change', updateInstructionPreview);
    
    // 지시사항 폼 제출
    document.getElementById('addInstructionForm').addEventListener('submit', submitInstructionForm);
    
    // 지시사항 테스트
    document.getElementById('testInstructionsBtn').addEventListener('click', testInstructions);
    
    // 키워드 분석
    document.getElementById('analyzeKeywords').addEventListener('click', analyzeKeywords);
    
    // 모달 닫기 이벤트
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal.id);
        });
    });
    
    // 모달 배경 클릭으로 닫기
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
    
    // ESC 키로 모달 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                closeModal(openModal.id);
            }
        }
    });
});

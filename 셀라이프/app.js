/**
 * QT라이프 - 모바일 웹 애플리케이션 로직
 */

// ==========================================================================
// 0. Supabase 설정
// ==========================================================================
const SUPABASE_URL = 'https://lvweuexyrirmdtmdhagw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NI_tXMu_Xy31GFyYzOTotA_YXo2rf94';

function getSupabase() { return window._supabaseClient || null; }
function getCurrentUserId() { return window._currentUserId || ''; }
function getCurrentUserName() { return window._currentUserName || '성도'; }

// ==========================================================================
// 1. 데이터 저장소 및 상태 관리 (LocalStorage DB Wrapper)
// ==========================================================================
const db = {
  _k(key) {
    const uid = getCurrentUserId();
    return `cell_life_${uid ? uid + '_' : ''}${key}`;
  },

  getAllQts() {
    const qtsStr = localStorage.getItem(this._k('qts'));
    if (!qtsStr) return [];
    try {
      let qts = JSON.parse(qtsStr);
      let migrated = false;
      qts = qts.map(qt => {
        if (qt.meditation !== undefined && qt.whoIsGod === undefined) {
          qt.title = qt.title || '오늘의 묵상';
          qt.understanding = qt.understanding || '';
          qt.whoIsGod = qt.meditation;
          qt.graceAndThanks = qt.graceAndThanks || '';
          qt.lesson = qt.lesson || '';
          delete qt.meditation;
          migrated = true;
        }
        if (qt.title === undefined) { qt.title = '오늘의 묵상'; migrated = true; }
        if (qt.understanding === undefined) { qt.understanding = ''; migrated = true; }
        if (qt.whoIsGod === undefined) { qt.whoIsGod = ''; migrated = true; }
        if (qt.graceAndThanks === undefined) { qt.graceAndThanks = ''; migrated = true; }
        if (qt.lesson === undefined) { qt.lesson = ''; migrated = true; }
        if (qt.application === undefined) { qt.application = ''; migrated = true; }
        if (qt.prayer === undefined) { qt.prayer = ''; migrated = true; }
        return qt;
      });
      if (migrated) localStorage.setItem(this._k('qts'), JSON.stringify(qts));
      return qts.sort((a, b) => b.date.localeCompare(a.date));
    } catch (e) {
      console.error('QT 데이터를 파싱하는 중 오류가 발생했습니다.', e);
      return [];
    }
  },

  saveQt(qt) {
    const qts = this.getAllQts();
    const index = qts.findIndex(item => item.id === qt.id);
    if (index > -1) { qts[index] = qt; } else { qts.push(qt); }
    localStorage.setItem(this._k('qts'), JSON.stringify(qts));
    const sb = getSupabase(); const uid = getCurrentUserId();
    if (sb && uid) {
      sb.from('qts').upsert({
        user_id: uid, date: qt.date, passage: qt.passage || '', scripture: qt.scripture || '',
        title: qt.title || '', understanding: qt.understanding || '', who_is_god: qt.whoIsGod || '',
        grace_and_thanks: qt.graceAndThanks || '', lesson: qt.lesson || '',
        application: qt.application || '', prayer: qt.prayer || '',
        updated_at: new Date().toISOString()
      }).then(({ error }) => { if (error) console.error('Supabase saveQt:', error); });
    }
    return qts;
  },

  deleteQt(id) {
    let qts = this.getAllQts();
    qts = qts.filter(item => item.id !== id);
    localStorage.setItem(this._k('qts'), JSON.stringify(qts));
    const sb = getSupabase(); const uid = getCurrentUserId();
    if (sb && uid) {
      sb.from('qts').delete().eq('user_id', uid).eq('date', id)
        .then(({ error }) => { if (error) console.error('Supabase deleteQt:', error); });
    }
    return qts;
  },

  getUserName() { return getCurrentUserName(); },

  saveUserName(name) {
    window._currentUserName = name;
    const sb = getSupabase(); const uid = getCurrentUserId();
    if (sb && uid) {
      sb.from('profiles').upsert({ id: uid, name: name })
        .then(({ error }) => { if (error) console.error('Supabase saveUserName:', error); });
    }
  },

  async loadFromSupabase() {
    const sb = getSupabase(); const uid = getCurrentUserId();
    if (!sb || !uid) return;
    const { data, error } = await sb.from('qts').select('*').eq('user_id', uid);
    if (error) { console.error('Supabase load error:', error); return; }
    if (data && data.length > 0) {
      const qts = data.map(r => ({
        id: r.date, date: r.date, passage: r.passage || '', scripture: r.scripture || '',
        title: r.title || '', understanding: r.understanding || '', whoIsGod: r.who_is_god || '',
        graceAndThanks: r.grace_and_thanks || '', lesson: r.lesson || '',
        application: r.application || '', prayer: r.prayer || ''
      })).sort((a, b) => b.date.localeCompare(a.date));
      localStorage.setItem(this._k('qts'), JSON.stringify(qts));
    }
  },

  getTheme() { return localStorage.getItem(this._k('theme')) || 'light'; },
  saveTheme(theme) { localStorage.setItem(this._k('theme'), theme); },

  getFontSize() { return localStorage.getItem(this._k('font_size')) || 'medium'; },
  saveFontSize(size) { localStorage.setItem(this._k('font_size'), size); },

  getGdriveConnected() { return localStorage.getItem(this._k('gdrive_connected')) === 'true'; },
  saveGdriveConnected(v) { localStorage.setItem(this._k('gdrive_connected'), v ? 'true' : 'false'); },

  getDraft() {
    const d = localStorage.getItem(this._k('draft'));
    return d ? JSON.parse(d) : null;
  },
  saveDraft(data) { localStorage.setItem(this._k('draft'), JSON.stringify(data)); },
  clearDraft() { localStorage.removeItem(this._k('draft')); },

  clearAllData() {
    const uid = getCurrentUserId();
    ['qts','draft','theme','font_size','gdrive_connected'].forEach(key => {
      localStorage.removeItem(`cell_life_${uid}_${key}`);
    });
    const sb = getSupabase();
    if (sb && uid) {
      sb.from('qts').delete().eq('user_id', uid)
        .then(({ error }) => { if (error) console.error('Supabase clearAll:', error); });
    }
  }
};

// ==========================================================================
// 2. 글로벌 상태 객체 (App State)
// ==========================================================================
const GOOGLE_OAUTH_CLIENT_ID = ''; // 여기에 구글 OAuth 클라이언트 ID를 입력하세요.
const GDRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// 성경 데이터 반환 (bible_data.js에서 전역 변수로 이미 로드됨)
async function getBibleData() {
  if (typeof BIBLE_KO_DATA !== 'undefined') return BIBLE_KO_DATA;
  throw new Error('bible_data.js가 로드되지 않았습니다.');
}

const state = {
  userName: '성도',
  theme: 'light',
  fontSize: 'medium',
  qts: [],
  activeTab: 'dashboard',
  currentView: 'view-dashboard',
  viewingQtId: null,
  editingQtId: null,
  calendarDate: new Date(),
  searchQuery: '',
  gdriveAccessToken: null,
  gdriveTokenClient: null,
  gdriveConnected: false,
  editorScriptureFontSize: 15
};

// 최근 사용 형광펜 색상 (LocalStorage)
function getRecentColors() {
  try {
    const uid = getCurrentUserId();
    const key = `cell_life_${uid ? uid + '_' : ''}recent_colors`;
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {}
  return ['#FFF176', '#A5D6A7', '#F48FB1'];
}
function saveRecentColor(color) {
  const uid = getCurrentUserId();
  const key = `cell_life_${uid ? uid + '_' : ''}recent_colors`;
  let r = getRecentColors().filter(c => c !== color);
  r.unshift(color);
  localStorage.setItem(key, JSON.stringify(r.slice(0, 3)));
}

// 요일 매핑 테이블
const DAYS_KOREAN = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

// 성경 본문 매핑 테이블 (6~8월)
const ALL_PASSAGES = {
  // 6월
  "2026-06-20": { passage: "겔 23:22-35", scripture: "" },
  "2026-06-21": { passage: "겔 23:36-49", scripture: "" },
  "2026-06-22": { passage: "겔 24:1-14", scripture: "" },
  "2026-06-23": { passage: "겔 24:15-27", scripture: "" },
  "2026-06-24": { passage: "겔 25:1-7", scripture: "" },
  "2026-06-25": { passage: "겔 25:8-17", scripture: "" },
  "2026-06-26": { passage: "겔 26:1-14", scripture: "" },
  "2026-06-27": { passage: "겔 26:15-21", scripture: "" },
  "2026-06-28": { passage: "겔 27:1-11", scripture: "" },
  "2026-06-29": { passage: "겔 27:12-25", scripture: "" },
  "2026-06-30": { passage: "겔 27:26-36", scripture: "" },
  // 7월
  "2026-07-01": { passage: "겔 28:1-10", scripture: "" },
  "2026-07-02": { passage: "겔 28:11-19", scripture: "" },
  "2026-07-03": { passage: "겔 28:20-26", scripture: "" },
  "2026-07-04": { passage: "겔 29:1-11", scripture: "" },
  "2026-07-05": { passage: "겔 29:12-21", scripture: "" },
  "2026-07-06": { passage: "겔 30:1-13", scripture: "" },
  "2026-07-07": { passage: "겔 30:14-26", scripture: "" },
  "2026-07-08": { passage: "겔 31:1-9", scripture: "" },
  "2026-07-09": { passage: "겔 31:10-18", scripture: "" },
  "2026-07-10": { passage: "겔 32:1-10", scripture: "" },
  "2026-07-11": { passage: "겔 32:11-21", scripture: "" },
  "2026-07-12": { passage: "겔 32:22-32", scripture: "" },
  "2026-07-13": { passage: "겔 33:1-9", scripture: "" },
  "2026-07-14": { passage: "겔 33:10-22", scripture: "" },
  "2026-07-15": { passage: "겔 33:23-33", scripture: "" },
  "2026-07-16": { passage: "겔 34:1-9", scripture: "" },
  "2026-07-17": { passage: "겔 34:10-19", scripture: "" },
  "2026-07-18": { passage: "겔 34:20-31", scripture: "" },
  "2026-07-19": { passage: "겔 35:1-15", scripture: "" },
  "2026-07-20": { passage: "겔 36:1-7", scripture: "" },
  "2026-07-21": { passage: "겔 36:8-15", scripture: "" },
  "2026-07-22": { passage: "겔 36:16-28", scripture: "" },
  "2026-07-23": { passage: "겔 36:29-38", scripture: "" },
  "2026-07-24": { passage: "겔 37:1-10", scripture: "" },
  "2026-07-25": { passage: "겔 37:11-22", scripture: "" },
  "2026-07-26": { passage: "겔 37:23-28", scripture: "" },
  "2026-07-27": { passage: "겔 38:1-13", scripture: "" },
  "2026-07-28": { passage: "겔 38:14-23", scripture: "" },
  "2026-07-29": { passage: "겔 39:1-10", scripture: "" },
  "2026-07-30": { passage: "겔 39:11-20", scripture: "" },
  "2026-07-31": { passage: "겔 39:21-29", scripture: "" },
  // 8월
  "2026-08-01": { passage: "겔 40:1-11", scripture: "" },
  "2026-08-02": { passage: "겔 40:12-23", scripture: "" },
  "2026-08-03": { passage: "겔 40:24-37", scripture: "" },
  "2026-08-04": { passage: "겔 40:38-49", scripture: "" },
  "2026-08-05": { passage: "겔 41:1-11", scripture: "" },
  "2026-08-06": { passage: "겔 41:12-26", scripture: "" },
  "2026-08-07": { passage: "겔 42:1-9", scripture: "" },
  "2026-08-08": { passage: "겔 42:10-20", scripture: "" },
  "2026-08-09": { passage: "겔 43:1-12", scripture: "" },
  "2026-08-10": { passage: "겔 43:13-27", scripture: "" },
  "2026-08-11": { passage: "겔 44:1-8", scripture: "" },
  "2026-08-12": { passage: "겔 44:9-19", scripture: "" },
  "2026-08-13": { passage: "겔 44:20-31", scripture: "" },
  "2026-08-14": { passage: "겔 45:1-12", scripture: "" },
  "2026-08-15": { passage: "겔 45:13-25", scripture: "" },
  "2026-08-16": { passage: "겔 46:1-12", scripture: "" },
  "2026-08-17": { passage: "겔 46:13-24", scripture: "" },
  "2026-08-18": { passage: "겔 47:1-12", scripture: "" },
  "2026-08-19": { passage: "겔 47:13-23", scripture: "" },
  "2026-08-20": { passage: "겔 48:1-12", scripture: "" },
  "2026-08-21": { passage: "겔 48:13-22", scripture: "" },
  "2026-08-22": { passage: "겔 48:23-35", scripture: "" },
  "2026-08-23": { passage: "시 113:1-9", scripture: "" },
  "2026-08-24": { passage: "시 114:1-8", scripture: "" },
  "2026-08-25": { passage: "시 115:1-9", scripture: "" },
  "2026-08-26": { passage: "시 115:10-18", scripture: "" },
  "2026-08-27": { passage: "시 116:1-9", scripture: "" },
  "2026-08-28": { passage: "시 116:10-19", scripture: "" },
  "2026-08-29": { passage: "시 117:1-2", scripture: "" },
  "2026-08-30": { passage: "시 118:1-18", scripture: "" },
  "2026-08-31": { passage: "시 118:19-29", scripture: "" },
};

// 영어 성경책 명칭 한글 번역 매핑 테이블 (하위 호환성 유지)
const BIBLE_ENG_TO_KO = {
  'genesis': '창세기', 'exodus': '출애굽기', 'leviticus': '레위기', 'numbers': '민수기', 'deuteronomy': '신명기',
  'joshua': '여호수아', 'judges': '사사기', 'ruth': '룻기', '1 samuel': '사무엘상', '2 samuel': '사무엘하',
  '1 sam': '사무엘상', '2 sam': '사무엘하', '1samuel': '사무엘상', '2samuel': '사무엘하',
  '1 kings': '열왕기상', '2 kings': '열왕기하', '1kings': '열왕기상', '2kings': '열왕기하',
  '1 chronicles': '역대상', '2 chronicles': '역대하', '1chronicles': '역대상', '2chronicles': '역대하',
  'ezra': '에스라', 'nehemiah': '느헤미야', 'esther': '에스더', 'job': '욥기', 'psalms': '시편', 'psalm': '시편',
  'proverbs': '잠언', 'ecclesiastes': '전도서', 'song of solomon': '아가', 'song of songs': '아가',
  'isaiah': '이사야', 'jeremiah': '예레미야', 'lamentations': '예레미야애가', 'ezekiel': '에스겔', 'daniel': '다니엘',
  'hosea': '호세아', 'joel': '요엘', 'amos': '아모스', 'obadiah': '오바댜', 'jonah': '요나', 'micah': '미가',
  'nahum': '나훔', 'habakkuk': '하박국', 'zephaniah': '스바냐', 'haggai': '학개', 'zechariah': '스가랴', 'malachi': '말라기',
  'matthew': '마태복음', 'mark': '마가복음', 'luke': '누가복음', 'john': '요한복음', 'acts': '사도행전', 'romans': '로마서',
  '1 corinthians': '고린도전서', '2 corinthians': '고린도후서', '1corinthians': '고린도전서', '2corinthians': '고린도후서',
  'galatians': '갈라디아서', 'ephesians': '에베소서', 'philippians': '빌립보서', 'colossians': '골로새서',
  '1 thessalonians': '데살로니가전서', '2 thessalonians': '데살로니가후서', '1thessalonians': '데살로니가전서', '2thessalonians': '데살로니가후서',
  '1 timothy': '디모데전서', '2 timothy': '디모데후서', '1timothy': '디모데전서', '2timothy': '디모데후서',
  'titus': '디도서', 'philemon': '빌레몬서', 'hebrews': '히브리서', 'james': '야고보서',
  '1 peter': '베드로전서', '2 peter': '베드로후서', '1peter': '베드로전서', '2peter': '베드로후서',
  '1 john': '요한1서', '2 john': '요한2서', '3 john': '요한3서', '1john': '요한1서', '2john': '요한2서', '3john': '요한3서',
  'jude': '유다서', 'revelation': '요한계시록'
};

// ==========================================================================
// 3. 헬퍼 함수 (Utility Functions)
// ==========================================================================
function getLocalDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().split('T')[0];
}

function formatKoreanDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const dateObj = new Date(year, month - 1, day);
  const dayName = DAYS_KOREAN[dateObj.getDay()];
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일 ${dayName}`;
}

// 스트릭(연속 묵상) 계산기
function calculateStreak(qts) {
  if (!qts || qts.length === 0) return 0;
  
  const completedDates = new Set(qts.map(qt => qt.date));
  const todayStr = getLocalDateString(new Date());
  
  // 어제 날짜 구하기
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateString(yesterday);
  
  // 오늘과 어제 모두 묵상 기록이 없으면 스트릭은 0
  if (!completedDates.has(todayStr) && !completedDates.has(yesterdayStr)) {
    return 0;
  }
  
  // 오늘 기록이 있으면 오늘부터, 없으면 어제부터 역산 시작
  const startStr = completedDates.has(todayStr) ? todayStr : yesterdayStr;
  let streak = 0;
  let currentDate = new Date(startStr);
  
  while (true) {
    const checkStr = getLocalDateString(currentDate);
    if (completedDates.has(checkStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

// ==========================================================================
// 4. 앱 초기화 및 네비게이션 제어
// ==========================================================================
const app = {
  async init(session) {
    // 로컬 PIN 로그인 방식: window._currentUserId, _currentUserName은 이미 설정됨
    if (!window._currentUserId) { location.reload(); return; }

    // 데이터 로드
    state.userName = db.getUserName();
    state.theme = db.getTheme();
    state.fontSize = db.getFontSize();
    state.qts = db.getAllQts();

    // 내용 없는 stale draft 자동 삭제
    const staleDraft = db.getDraft();
    if (staleDraft) {
      const hasContent = staleDraft.title || staleDraft.whoIsGod || staleDraft.graceAndThanks ||
                         staleDraft.lesson || staleDraft.application || staleDraft.prayer || staleDraft.understanding;
      if (!hasContent) db.clearDraft();
    }

    this.applyTheme(state.theme);
    this.applyFontSize(state.fontSize);
    
    // UI 초기 렌더링
    this.renderUserProfile();
    this.renderStreak();
    this.renderCalendar();
    this.renderQtList();
    
    // 이벤트 리스너 등록
    this.bindEvents();
    
    // 구글 드라이브 초기화
    this.initGoogleDrive();

    // 최근 형광펜 색상 초기화
    this.renderRecentColors();

    // Lucide 아이콘 초기화
    safeCreateIcons();

    // Supabase에서 최신 데이터 동기화 (백그라운드)
    db.loadFromSupabase().then(() => {
      state.qts = db.getAllQts();
      this.renderQtList();
      this.renderCalendar();
      this.renderStreak();
    });
  },

  // 탭 화면 전환
  switchTab(tabName, extraData = null) {
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    // 모든 뷰 비활성화
    document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active'));
    
    state.activeTab = tabName;
    
    if (tabName === 'dashboard') {
      state.currentView = 'view-dashboard';
      document.querySelector('.nav-item[data-tab="dashboard"]').classList.add('active');
      this.renderStreak();
      this.renderCalendar();
      this.renderQtList();
    } 
    else if (tabName === 'write') {
      state.currentView = 'view-editor';
      document.getElementById('nav-item-write').classList.add('active');
      this.setupEditor(extraData); // extraData: 수정할 ID 또는 신규 작성을 위한 날짜
    } 
    else if (tabName === 'settings') {
      state.currentView = 'view-settings';
      document.querySelector('.nav-item[data-tab="settings"]').classList.add('active');
      this.setupSettings();
    }
    else if (tabName === 'viewer') {
      state.currentView = 'view-viewer';
      // 하단 탭바 선택 제거 (상세뷰는 탭이 아니기 때문)
      this.setupViewer(extraData); // extraData: 볼 QT ID
    }

    // 활성화 대상 뷰 렌더링
    const activeView = document.getElementById(state.currentView);
    activeView.classList.add('active');
    activeView.scrollTop = 0; // 스크롤 초기화
    
    safeCreateIcons();
  },

  // 테마 적용
  applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
    // lucide.createIcons()가 <i>를 SVG로 교체하므로, innerHTML로 항상 새 <i> 삽입
    const toggleBtn = document.getElementById('btn-theme-toggle');
    if (toggleBtn) toggleBtn.innerHTML = theme === 'dark' ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
    state.theme = theme;
    db.saveTheme(theme);
    // 테마 버튼 활성 상태 항상 동기화
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-theme') === theme);
    });
    safeCreateIcons();
  },

  // 글자 크기 적용
  applyFontSize(size) {
    const viewer = document.getElementById('viewer-container');
    viewer.classList.remove('font-size-small', 'font-size-medium', 'font-size-large', 'font-size-xlarge');
    viewer.classList.add(`font-size-${size}`);
    state.fontSize = size;
    db.saveFontSize(size);
  },

  // 프로필 정보 업데이트
  renderUserProfile() {
    state.userName = db.getUserName();
    document.getElementById('display-user-name').textContent = state.userName;
    document.getElementById('input-username').value = state.userName;
    const profileLabel = document.getElementById('settings-profile-label');
    if (profileLabel) profileLabel.textContent = state.userName;
    const emailLabel = document.getElementById('settings-email-label');
    if (emailLabel) emailLabel.textContent = '';
  },

  signOut() {
    window._currentUserId = '';
    window._currentUserName = '';
    window._currentProfileId = '';
    location.reload();
  },

  changePassword(newPw, confirmPw) {
    if (!newPw) { this.showToast('새 비밀번호를 입력하세요.'); return; }
    if (newPw.length < 6) { this.showToast('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (!/[a-zA-Z]/.test(newPw) || !/[0-9]/.test(newPw)) { this.showToast('영문과 숫자를 모두 포함해야 합니다.'); return; }
    if (newPw !== confirmPw) { this.showToast('비밀번호가 일치하지 않습니다.'); return; }
    const profileId = window._currentProfileId;
    if (!profileId) { this.showToast('프로필 정보를 찾을 수 없습니다.'); return; }
    localStorage.setItem('qt_pin_' + profileId, newPw);
    document.getElementById('input-new-pw').value = '';
    document.getElementById('input-confirm-pw').value = '';
    this.showToast('비밀번호가 변경되었습니다.');
  },

  // 스트릭(연속 묵상) 렌더링
  renderStreak() {
    const streak = calculateStreak(state.qts);
    document.getElementById('display-streak').textContent = streak;
    document.getElementById('dashboard-today-date').textContent = formatKoreanDate(getLocalDateString(new Date()));
  },

  // 토스트 메시지 띄우기
  showToast(message) {
    const toast = document.getElementById('toast-message');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  },

  // ==========================================================================
  // 5. 달력 컴포넌트 렌더링
  // ==========================================================================
  renderCalendar() {
    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();
    
    // 달력 타이틀 변경
    document.getElementById('calendar-title').textContent = `${year}년 ${month + 1}월`;
    
    const daysContainer = document.getElementById('calendar-days');
    daysContainer.innerHTML = '';
    
    // 달력 데이터 생성
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const prevLastDay = new Date(year, month, 0).getDate();
    
    // 작성 완료된 날짜들을 Set으로 추출
    const completedSet = new Set(
      state.qts
        .filter(qt => {
          const [qtY, qtM] = qt.date.split('-');
          return parseInt(qtY) === year && parseInt(qtM) === (month + 1);
        })
        .map(qt => parseInt(qt.date.split('-')[2]))
    );

    const todayStr = getLocalDateString(new Date());

    // 1. 이전 달 빈칸 채우기
    for (let x = firstDayIndex; x > 0; x--) {
      const dayNum = prevLastDay - x + 1;
      const cell = document.createElement('div');
      cell.classList.add('calendar-day-cell', 'other-month');
      cell.textContent = dayNum;
      daysContainer.appendChild(cell);
    }
    
    // 2. 이번 달 날짜 채우기
    for (let i = 1; i <= lastDay; i++) {
      const cell = document.createElement('div');
      cell.classList.add('calendar-day-cell');
      cell.textContent = i;
      
      const currentFormattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      // 요일 구하기
      const dayOfWeek = new Date(year, month, i).getDay();
      if (dayOfWeek === 0) cell.classList.add('sunday');
      if (dayOfWeek === 6) cell.classList.add('saturday');
      
      // 오늘 표시
      if (currentFormattedDate === todayStr) {
        cell.classList.add('today');
      }
      
      // 작성 완료된 날
      if (completedSet.has(i)) {
        cell.classList.add('completed');
      }
      
      // 클릭 시 해당 날짜의 QT 뷰어로 이동 혹은 새로 쓰기
      cell.addEventListener('click', () => {
        if (completedSet.has(i)) {
          this.switchTab('viewer', currentFormattedDate);
        } else {
          this.switchTab('write', { targetDate: currentFormattedDate });
        }
      });
      
      daysContainer.appendChild(cell);
    }
    
    // 3. 다음 달 빈칸 채우기 (달력 격자 42칸 맞추기)
    const totalCells = firstDayIndex + lastDay;
    const remainingCells = 42 - totalCells;
    for (let j = 1; j <= remainingCells; j++) {
      const cell = document.createElement('div');
      cell.classList.add('calendar-day-cell', 'other-month');
      cell.textContent = j;
      daysContainer.appendChild(cell);
    }
  },

  // ==========================================================================
  // 6. QT 기록 리스트 렌더링 및 검색
  // ==========================================================================
  renderQtList() {
    const listContainer = document.getElementById('qt-list');
    listContainer.innerHTML = '';
    
    // 검색어 필터링
    const query = state.searchQuery.toLowerCase().trim();
    const filteredQts = state.qts.filter(qt => {
      return (
        qt.passage.toLowerCase().includes(query) ||
        (qt.scripture || '').toLowerCase().includes(query) ||
        (qt.title || '').toLowerCase().includes(query) ||
        (qt.understanding || '').toLowerCase().includes(query) ||
        (qt.whoIsGod || '').toLowerCase().includes(query) ||
        (qt.graceAndThanks || '').toLowerCase().includes(query) ||
        (qt.lesson || '').toLowerCase().includes(query) ||
        (qt.application || '').toLowerCase().includes(query) ||
        (qt.prayer || '').toLowerCase().includes(query) ||
        qt.date.includes(query)
      );
    });
    
    if (filteredQts.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.classList.add('empty-state');
      emptyDiv.innerHTML = `
        <i data-lucide="${query ? 'search-code' : 'book-open'}" class="empty-icon"></i>
        <p>${query ? '검색 결과에 맞는 QT가 없습니다.' : '아직 작성된 QT가 없습니다.'}</p>
        ${query ? '' : '<button class="btn btn-primary" id="btn-empty-start">오늘의 QT 시작하기</button>'}
      `;
      listContainer.appendChild(emptyDiv);
      
      const btnStart = document.getElementById('btn-empty-start');
      if (btnStart) {
        btnStart.addEventListener('click', () => this.switchTab('write'));
      }
      safeCreateIcons();
      return;
    }
    
    filteredQts.forEach(qt => {
      const card = document.createElement('div');
      card.classList.add('qt-item-card');
      
      const dateText = formatKoreanDate(qt.date);
      const previewText = qt.title ? `[제목] ${qt.title} | ${qt.whoIsGod || qt.application || ''}` : (qt.whoIsGod || qt.application || '');
      
      card.innerHTML = `
        <div class="qt-item-header">
          <span class="qt-item-date">${dateText}</span>
        </div>
        <h4 class="qt-item-passage">${this.formatPassageToKorean(qt.passage)}</h4>
        <p class="qt-item-preview">${previewText}</p>
      `;
      
      card.addEventListener('click', () => {
        this.switchTab('viewer', qt.id);
      });
      
      listContainer.appendChild(card);
    });
  },

  formatPassageToKorean(passage) {
    if (!passage) return '';
    let lower = passage.trim().toLowerCase();
    const engKeys = Object.keys(BIBLE_ENG_TO_KO).sort((a, b) => b.length - a.length);
    for (const eng of engKeys) {
      if (lower.startsWith(eng)) {
        return passage.replace(new RegExp(eng, 'i'), BIBLE_ENG_TO_KO[eng]);
      }
    }
    return passage;
  },

  // 구절 참조(예: 에스겔 23:22-35)를 hidden input + 타이틀 표시 동시 업데이트
  setPassage(value) {
    document.getElementById('input-passage').value = value || '';
    const display = document.getElementById('passage-display');
    if (display) display.textContent = value || '';
  },

  setScriptureContent(content) {
    const display = document.getElementById('scripture-display');
    display.innerHTML = content ? content.replace(/\n/g, '<br>') : '';
  },

  getScriptureContent() {
    const display = document.getElementById('scripture-display');
    return display.innerHTML.trim();
  },

  updateScripturePlaceholder() { /* 플레이스홀더 제거됨 */ },

  showFormatToolbar() {
    const toolbar = document.getElementById('text-format-toolbar');
    toolbar.style.display = 'flex';
  },

  hideFormatToolbar() {
    const toolbar = document.getElementById('text-format-toolbar');
    toolbar.style.display = 'none';
  },

  isSelectionInside(element) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    const range = selection.getRangeAt(0);
    return element.contains(range.commonAncestorContainer);
  },

  applyTextFormat(action, color) {
    const scriptureDisplay = document.getElementById('scripture-display');
    if (!this.isSelectionInside(scriptureDisplay)) {
      this.showToast('먼저 본문을 선택해 주세요.');
      return;
    }

    if (action === 'highlight') {
      document.execCommand('hiliteColor', false, color);
      saveRecentColor(color);
      this.renderRecentColors();
    } else if (action === 'underline') {
      document.execCommand('underline', false, null);
    } else if (action === 'clear') {
      document.execCommand('removeFormat', false, null);
    }

    scriptureDisplay.focus();
    this.handleEditorInput();
  },

  // 최근 색상 버튼 렌더링
  renderRecentColors() {
    const container = document.getElementById('recent-color-btns');
    if (!container) return;
    const recents = getRecentColors();
    container.innerHTML = recents.map(color =>
      `<button class="fmt-btn recent-color-btn" data-action="highlight" data-color="${color}" style="background:${color}" title="형광펜"></button>`
    ).join('');
    container.querySelectorAll('.recent-color-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.applyTextFormat('highlight', e.currentTarget.getAttribute('data-color'));
      });
    });
  },

  // 에디터 성경 본문 글자 크기 조절
  changeEditorScriptureSize(delta) {
    const newSize = Math.max(11, Math.min(22, state.editorScriptureFontSize + delta));
    state.editorScriptureFontSize = newSize;
    document.getElementById('scripture-display').style.fontSize = newSize + 'px';
  },

  translateBibleReference(query) {
    const mapping = {
      '창세기':'genesis','출애굽기':'exodus','레위기':'leviticus','민수기':'numbers','신명기':'deuteronomy',
      '여호수아':'joshua','사사기':'judges','룻기':'ruth','사무엘상':'samuel 1','사무엘하':'samuel 2','열왕기상':'kings 1','열왕기하':'kings 2',
      '역대상':'chronicles 1','역대하':'chronicles 2','에스라':'ezra','느헤미야':'nehemiah','에스더':'esther','욥기':'job','시편':'psalms',
      '잠언':'proverbs','전도서':'ecclesiastes','아가':'song of songs','이사야':'isaiah','예레미야':'jeremiah','예레미야애가':'lamentations',
      '에스겔':'ezekiel','다니엘':'daniel','호세아':'hosea','요엘':'joel','아모스':'amos','오바댜':'obadiah','요나':'jonah','미가':'micah',
      '나훔':'nahum','하박국':'habakkuk','스바냐':'zephaniah','학개':'haggai','스가랴':'zechariah','말라기':'malachi',
      '마태복음':'matthew','마가복음':'mark','누가복음':'luke','요한복음':'john','사도행전':'acts','로마서':'romans','고린도전서':'1 corinthians',
      '고린도후서':'2 corinthians','갈라디아서':'galatians','에베소서':'ephesians','빌립보서':'philippians','골로새서':'colossians',
      '데살로니가전서':'1 thessalonians','데살로니가후서':'2 thessalonians','디모데전서':'1 timothy','디모데후서':'2 timothy',
      '디도서':'titus','빌레몬서':'philemon','히브리서':'hebrews','야고보서':'james','베드로전서':'1 peter','베드로후서':'2 peter',
      '요한1서':'1 john','요한2서':'2 john','요한3서':'3 john','유다서':'jude','요한계시록':'revelation'
    };

    let normalized = query.trim().replace(/\s+/g, ' ');
    const bookKeys = Object.keys(mapping).sort((a, b) => b.length - a.length);
    for (const book of bookKeys) {
      if (normalized.startsWith(book)) {
        normalized = normalized.replace(book, mapping[book]);
        break;
      }
    }
    return normalized;
  },

  findPassageInBible(bible, passageQuery) {
    const regex = /^([1-3]?\s*[가-힣\s]+)\s*(\d+)\s*:\s*(\d+)(?:\s*-\s*(\d+))?$/;
    const normalized = passageQuery.replace(/\s+/g, ' ').trim();
    const match = normalized.match(regex);
    if (!match) return null;

    const bookName = match[1].trim().replace(/\s+/g, '');
    const chapterNum = parseInt(match[2]);
    const verseStart = parseInt(match[3]);
    const verseEnd = match[4] ? parseInt(match[4]) : verseStart;

    // 약어 → 전체 이름 매핑 (한글 직접 매칭)
    const synonyms = {
      '창':'창세기','출':'출애굽기','레':'레위기','민':'민수기','신':'신명기',
      '수':'여호수아','삿':'사사기','룻':'룻기','삼상':'사무엘상','삼하':'사무엘하',
      '왕상':'열왕기상','왕하':'열왕기하','대상':'역대상','대하':'역대하',
      '스':'에스라','느':'느헤미야','에':'에스더','욥':'욥기','시':'시편',
      '잠':'잠언','전':'전도서','아':'아가','사':'이사야','렘':'예레미야',
      '애':'예레미야애가','겔':'에스겔','단':'다니엘','호':'호세아','욜':'요엘',
      '암':'아모스','옵':'오바댜','욘':'요나','미':'미가','나':'나훔',
      '합':'하박국','습':'스바냐','학':'학개','슥':'스가랴','말':'말라기',
      '마':'마태복음','막':'마가복음','눅':'누가복음','요':'요한복음',
      '행':'사도행전','롬':'로마서','고전':'고린도전서','고후':'고린도후서',
      '갈':'갈라디아서','엡':'에베소서','빌':'빌립보서','골':'골로새서',
      '살전':'데살로니가전서','살후':'데살로니가후서',
      '딤전':'디모데전서','딤후':'디모데후서','딛':'디도서','몬':'빌레몬서',
      '히':'히브리서','약':'야고보서','벧전':'베드로전서','벧후':'베드로후서',
      '요일':'요한1서','요이':'요한2서','요삼':'요한3서','유':'유다서','계':'요한계시록',
      '요한일서':'요한1서','요한이서':'요한2서','요한삼서':'요한3서'
    };

    const targetName = synonyms[bookName] || bookName;
    const book = bible.find(b => b.name === targetName || b.abbrev === bookName);
    if (!book) return null;

    const chapter = book.chapters[chapterNum - 1];
    if (!chapter) return null;

    let resultText = '';
    for (let v = verseStart; v <= verseEnd; v++) {
      const verseText = chapter[v - 1];
      if (verseText !== undefined) {
        resultText += `<span class="verse-num">${v}</span> ${verseText}<br>`;
      }
    }

    return { bookName: book.name, chapter: chapterNum, verseStart, verseEnd, text: resultText };
  },

  async fetchBiblePassage() {
    const passageText = document.getElementById('input-passage').value.trim();
    if (!passageText) {
      alert('조회할 본문을 입력해 주세요.');
      return;
    }

    this.showToast('성경 본문을 조회하고 있습니다...');

    try {
      const bible = await getBibleData();
      const result = this.findPassageInBible(bible, passageText);

      if (!result || !result.text) {
        throw new Error('성경 구절을 찾을 수 없거나 형식이 잘못되었습니다.');
      }

      this.setScriptureContent(result.text);
      
      // 검색어 포맷 정리
      this.setPassage(`${result.bookName} ${result.chapter}:${result.verseStart}${result.verseEnd !== result.verseStart ? '-' + result.verseEnd : ''}`);
      
      this.updateDraftStatus(false);
      this.handleEditorInput();
      this.showToast('본문을 불러왔습니다.');
    } catch (error) {
      console.error('fetchBiblePassage error', error);
      this.showToast('본문 조회에 실패했습니다. 본문란에 직접 입력/붙여넣기도 가능합니다.');
    }
  },

  // 날짜 자동 선택 시 조용히 성경 본문 로드 (draft 저장 없이)
  async autoFetchPassage(passageText) {
    if (!passageText) return;
    try {
      const bible = await getBibleData();
      const result = this.findPassageInBible(bible, passageText);
      if (result && result.text) {
        this.setScriptureContent(result.text);
      }
    } catch (e) {
      console.warn('autoFetchPassage 실패:', e);
    }
  },

  initGoogleDrive() {
    if (!GOOGLE_OAUTH_CLIENT_ID) {
      this.updateGdriveStatus();
      return;
    }

    if (!window.google || !google.accounts || !google.accounts.oauth2) {
      setTimeout(() => this.initGoogleDrive(), 300);
      return;
    }

    state.gdriveTokenClient = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      scope: GDRIVE_SCOPE,
      callback: (tokenResponse) => {
        if (tokenResponse.error) {
          console.error('Google Drive auth error', tokenResponse);
          this.showToast('구글 드라이브 연결에 실패했습니다.');
          return;
        }
        state.gdriveAccessToken = tokenResponse.access_token;
        state.gdriveConnected = true;
        db.saveGdriveConnected(true);
        this.updateGdriveStatus();
        this.showToast('구글 드라이브에 연결되었습니다.');
      }
    });

    if (db.getGdriveConnected()) {
      state.gdriveConnected = true;
      state.gdriveTokenClient.requestAccessToken({ prompt: '' });
    }
  },

  updateGdriveStatus() {
    const status = document.getElementById('gdrive-status');
    const connectBtn = document.getElementById('btn-gdrive-connect');
    const disconnectBtn = document.getElementById('btn-gdrive-disconnect');

    if (state.gdriveConnected && state.gdriveAccessToken) {
      status.innerHTML = '<span class="gdrive-connected">구글 드라이브 연결됨</span>';
      connectBtn.style.display = 'none';
      disconnectBtn.style.display = 'block';
    } else {
      status.innerHTML = '<span class="gdrive-disconnected">연결되지 않음</span>';
      connectBtn.style.display = 'block';
      disconnectBtn.style.display = 'none';
    }
  },

  async connectGoogleDrive() {
    if (!GOOGLE_OAUTH_CLIENT_ID) {
      alert('구글 OAuth 클라이언트 ID가 설정되어 있지 않습니다. app.js에서 GOOGLE_OAUTH_CLIENT_ID 값을 입력해주세요.');
      return;
    }
    if (!state.gdriveTokenClient) {
      alert('구글 인증 준비 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    state.gdriveTokenClient.requestAccessToken({ prompt: 'consent' });
  },

  async disconnectGoogleDrive() {
    if (state.gdriveAccessToken) {
      await this.revokeGoogleToken(state.gdriveAccessToken);
    }
    state.gdriveConnected = false;
    state.gdriveAccessToken = null;
    db.saveGdriveConnected(false);
    this.updateGdriveStatus();
    this.showToast('구글 드라이브 연결이 해제되었습니다.');
  },

  async revokeGoogleToken(token) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    } catch (err) {
      console.error('revoke token failed', err);
    }
  },

  async findDriveItemId(name, parentId, mimeType, isFolder = false) {
    const queryParts = [];
    queryParts.push(`name='${name.replace(/'/g, "\\'")}'`);
    if (mimeType) {
      queryParts.push(`mimeType='${mimeType}'`);
    } else if (isFolder) {
      queryParts.push(`mimeType='application/vnd.google-apps.folder'`);
    }
    queryParts.push(`trashed=false`);
    if (parentId) {
      queryParts.push(`'${parentId}' in parents`);
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryParts.join(' and '))}&fields=files(id,name)&spaces=drive`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${state.gdriveAccessToken}` } });
    const data = await response.json();
    return data.files && data.files[0] ? data.files[0].id : null;
  },

  async createDriveFolder(name, parentId) {
    const url = 'https://www.googleapis.com/drive/v3/files';
    const body = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : []
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.gdriveAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    return data.id;
  },

  async ensureDriveFolderPath(folderNames) {
    let parentId = 'root';
    for (const folderName of folderNames) {
      let folderId = await this.findDriveItemId(folderName, parentId, 'application/vnd.google-apps.folder', true);
      if (!folderId) {
        folderId = await this.createDriveFolder(folderName, parentId);
      }
      parentId = folderId;
    }
    return parentId;
  },

  async createOrUpdateDriveFile(fileName, content, folderId) {
    const existingFileId = await this.findDriveItemId(fileName, folderId, null, false);
    if (existingFileId) {
      const url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
      await fetch(url, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${state.gdriveAccessToken}`,
          'Content-Type': 'text/markdown'
        },
        body: content
      });
      return existingFileId;
    }

    const boundary = `-------cell-life-${Date.now()}`;
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'text/markdown'
    };
    const multipartRequestBody = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: text/markdown\r\n\r\n${content}\r\n--${boundary}--`;

    const url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.gdriveAccessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartRequestBody
    });
    const data = await response.json();
    return data.id;
  },

  async saveQtToDrive(qt) {
    if (!state.gdriveConnected || !state.gdriveAccessToken) return;
    try {
      const [year, month] = qt.date.split('-');
      const folderId = await this.ensureDriveFolderPath(['QT라이프', year, month]);
      const fileName = `${qt.date}.md`;
      const content = `# ${qt.date}\n\n` +
        `## 본문\n${qt.passage}\n\n` +
        (qt.scripture ? `### 말씀\n${qt.scripture.replace(/<br>/g, '\n')}\n\n` : '') +
        `### 말씀 묵상\n${qt.meditation}\n\n` +
        `### 감사와 적용\n${qt.application}\n\n` +
        (qt.prayer ? `### 기도\n${qt.prayer}\n\n` : '') +
        `작성자: ${state.userName}\n`;
      await this.createOrUpdateDriveFile(fileName, content, folderId);
      this.showToast('구글 드라이브에 저장되었습니다.');
    } catch (error) {
      console.error('saveQtToDrive error', error);
      this.showToast('구글 드라이브 저장에 실패했습니다.');
    }
  },

  // ==========================================================================
  // 7. QT 에디터 세팅 및 비즈니스 로직
  // ==========================================================================
  setupEditor(extraData) {
    const form = document.getElementById('qt-form');
    form.reset();
    
    state.editingQtId = null;
    document.getElementById('editor-title-text').textContent = 'QT 작성';
    document.getElementById('draft-status-badge').style.display = 'none';
    
    let initialDate = getLocalDateString(new Date());
    
    // 캘린더에서 빈 셀을 눌렀을 때
    if (extraData && extraData.targetDate) {
      initialDate = extraData.targetDate;
    }
    
    // 리스트/뷰어에서 수정하기를 눌렀을 때
    if (extraData && typeof extraData === 'string') {
      const targetQt = state.qts.find(qt => qt.id === extraData);
      if (targetQt) {
        state.editingQtId = targetQt.id;
        document.getElementById('editor-title-text').textContent = 'QT 수정';
        
        document.getElementById('input-date').value = targetQt.date;
        this.setPassage(this.formatPassageToKorean(targetQt.passage));
        this.setScriptureContent(targetQt.scripture || '');
        document.getElementById('input-title').value = targetQt.title || '';
        document.getElementById('input-understanding').value = targetQt.understanding || '';
        document.getElementById('input-who-is-god').value = targetQt.whoIsGod || '';
        document.getElementById('input-grace-and-thanks').value = targetQt.graceAndThanks || '';
        document.getElementById('input-lesson').value = targetQt.lesson || '';
        document.getElementById('input-application').value = targetQt.application || '';
        document.getElementById('input-prayer').value = targetQt.prayer || '';
        return; // 수정 시 임시 저장 불러오지 않음
      }
    }
    
    // 신규 작성 시 기본 날짜 및 본문 자동 반영
    document.getElementById('input-date').value = initialDate;
    const preloaded = ALL_PASSAGES[initialDate];
    this.setPassage(preloaded ? preloaded.passage : '');
    this.setScriptureContent('');

    // ① draft 확인 먼저 (동기)
    const draft = db.getDraft();
    let draftLoaded = false;
    if (draft) {
      const hasContent = draft.title || draft.whoIsGod || draft.graceAndThanks || draft.lesson || draft.application || draft.prayer;
      if (hasContent && confirm('이전에 작성 중이던 임시 저장본이 있습니다. 불러오시겠습니까?')) {
        const draftDate = draft.date || initialDate;
        document.getElementById('input-date').value = draftDate;
        const draftPreloaded = ALL_PASSAGES[draftDate];
        this.setPassage(draft.passage || (draftPreloaded ? draftPreloaded.passage : ''));
        this.setScriptureContent(draft.scripture || '');
        document.getElementById('input-title').value = draft.title || '';
        document.getElementById('input-understanding').value = draft.understanding || '';
        document.getElementById('input-who-is-god').value = draft.whoIsGod || '';
        document.getElementById('input-grace-and-thanks').value = draft.graceAndThanks || '';
        document.getElementById('input-lesson').value = draft.lesson || '';
        document.getElementById('input-application').value = draft.application || '';
        document.getElementById('input-prayer').value = draft.prayer || '';
        this.updateDraftStatus(true);
        draftLoaded = true;
      } else {
        db.clearDraft();
      }
    }

    // ② draft 없을 때만 성경 자동 로드
    if (!draftLoaded && preloaded && preloaded.passage) {
      this.autoFetchPassage(preloaded.passage);
    }
  },

  // 임시저장 뱃지 상태 업데이트
  updateDraftStatus(isSaved) {
    const badge = document.getElementById('draft-status-badge');
    if (isSaved) {
      badge.textContent = '임시 저장됨';
      badge.style.backgroundColor = '#10B981';
      badge.style.display = 'inline-block';
    } else {
      badge.textContent = '수정 중...';
      badge.style.backgroundColor = '#F59E0B';
      badge.style.display = 'inline-block';
    }
  },

  // 에디터 입력값 실시간 임시저장
  handleEditorInput() {
    // 수정 중일 때는 자동 임시 저장 제외 (수정 취소의 안전성 보장)
    if (state.editingQtId) return;
    
    const draftData = {
      date: document.getElementById('input-date').value,
      passage: document.getElementById('input-passage').value,
      scripture: this.getScriptureContent(),
      title: document.getElementById('input-title').value,
      understanding: document.getElementById('input-understanding').value,
      whoIsGod: document.getElementById('input-who-is-god').value,
      graceAndThanks: document.getElementById('input-grace-and-thanks').value,
      lesson: document.getElementById('input-lesson').value,
      application: document.getElementById('input-application').value,
      prayer: document.getElementById('input-prayer').value,
      updatedAt: Date.now()
    };
    
    db.saveDraft(draftData);
    this.updateDraftStatus(true);
  },

  // QT 저장 실행
  async handleFormSubmit(e) {
    e.preventDefault();
    
    const dateVal = document.getElementById('input-date').value;
    const idVal = dateVal; // 날짜를 ID로 사용
    
    // 이미 작성된 날짜인지 체크 (신규 작성 시에만 체크)
    if (!state.editingQtId) {
      const exists = state.qts.some(qt => qt.id === idVal);
      if (exists) {
        if (!confirm(`${dateVal}에 이미 작성된 QT가 존재합니다. 덮어쓰시겠습니까?`)) {
          return;
        }
      }
    }

    const qt = {
      id: idVal,
      date: dateVal,
      passage: document.getElementById('input-passage').value.trim(),
      scripture: this.getScriptureContent().trim(),
      title: document.getElementById('input-title').value.trim(),
      understanding: document.getElementById('input-understanding').value.trim(),
      whoIsGod: document.getElementById('input-who-is-god').value.trim(),
      graceAndThanks: document.getElementById('input-grace-and-thanks').value.trim(),
      lesson: document.getElementById('input-lesson').value.trim(),
      application: document.getElementById('input-application').value.trim(),
      prayer: document.getElementById('input-prayer').value.trim()
    };

    // 로컬 스토리지 저장
    state.qts = db.saveQt(qt);
    
    // 임시 저장 삭제
    db.clearDraft();

    if (state.gdriveConnected) {
      await this.saveQtToDrive(qt);
    }
    
    this.showToast(state.editingQtId ? 'QT를 수정했습니다!' : '오늘의 QT를 기록했습니다!');
    
    // 대시보드로 이동
    this.switchTab('dashboard');
  },

  // ==========================================================================
  // 8. QT 뷰어 (상세 화면) 및 공유 모달
  // ==========================================================================
  setupViewer(qtId) {
    const qt = state.qts.find(item => item.id === qtId);
    if (!qt) {
      this.showToast('해당 QT 기록을 찾을 수 없습니다.');
      this.switchTab('dashboard');
      return;
    }
    
    state.viewingQtId = qtId;
    
    // 날짜 파싱
    const [y, m, d] = qt.date.split('-');
    const dateObj = new Date(y, m - 1, d);
    
    document.getElementById('viewer-date').textContent = `${y}.${m}.${d}`;
    document.getElementById('viewer-day').textContent = DAYS_KOREAN[dateObj.getDay()];
    
    document.getElementById('viewer-passage').textContent = this.formatPassageToKorean(qt.passage);
    
    const scriptureSection = document.querySelector('.card-bible');
    if (qt.scripture) {
      document.getElementById('viewer-scripture').innerHTML = qt.scripture;
      scriptureSection.style.display = 'block';
    } else {
      scriptureSection.style.display = 'none';
    }
    
    document.getElementById('viewer-title').textContent = qt.title || '오늘의 묵상';
    
    // 본문의 이해 처리
    const understandingBody = document.getElementById('viewer-understanding');
    if (qt.understanding) {
      understandingBody.textContent = qt.understanding;
      understandingBody.parentNode.style.display = 'block';
    } else {
      understandingBody.parentNode.style.display = 'none';
    }
    
    document.getElementById('viewer-who-is-god').textContent = qt.whoIsGod;
    document.getElementById('viewer-grace-and-thanks').textContent = qt.graceAndThanks;
    document.getElementById('viewer-lesson').textContent = qt.lesson;
    document.getElementById('viewer-application').textContent = qt.application;
    
    // 기도 처리
    const prayerBody = document.getElementById('viewer-prayer');
    const prayerSection = document.getElementById('viewer-prayer-section');
    if (qt.prayer) {
      prayerBody.textContent = qt.prayer;
      prayerSection.style.display = 'block';
    } else {
      prayerSection.style.display = 'none';
    }
  },

  // QT 기록 삭제
  deleteCurrentQt() {
    if (!state.viewingQtId) return;
    if (confirm('이 QT 기록을 정말 삭제하시겠습니까? 복구할 수 없습니다.')) {
      state.qts = db.deleteQt(state.viewingQtId);
      state.viewingQtId = null;
      this.showToast('QT 기록을 삭제했습니다.');
      this.switchTab('dashboard');
    }
  },

  // 공유 텍스트 포맷터 생성
  generateShareText() {
    const qt = state.qts.find(item => item.id === state.viewingQtId);
    if (!qt) return '';
    
    const includeDate = document.getElementById('share-chk-date').checked;
    const includePassage = document.getElementById('share-chk-passage').checked;
    const includeScripture = document.getElementById('share-chk-scripture').checked;
    const includeTitle = document.getElementById('share-chk-title').checked;
    const includeUnderstanding = document.getElementById('share-chk-understanding').checked;
    const includeWhoIsGod = document.getElementById('share-chk-who-is-god').checked;
    const includeGraceAndThanks = document.getElementById('share-chk-grace-and-thanks').checked;
    const includeLesson = document.getElementById('share-chk-lesson').checked;
    const includeApplication = document.getElementById('share-chk-application').checked;
    const includePrayer = document.getElementById('share-chk-prayer').checked;
    
    let text = `✨ [QT라이프 나눔] ✨\n`;
    text += `작성자: ${state.userName}\n`;
    
    if (includeDate) {
      text += `날짜: ${formatKoreanDate(qt.date)}\n`;
    }
    
    if (includePassage) {
      text += `본문: ${this.formatPassageToKorean(qt.passage)}\n`;
    }
    
    text += `=========================\n\n`;

    if (includeTitle && qt.title) {
      text += `📌 [제목]\n${qt.title}\n\n`;
    }

    if (includeScripture && qt.scripture) {
      // HTML 태그 제거 및 정리
      const cleanScripture = qt.scripture.replace(/<span class="verse-num">(\d+)<\/span>/g, '[$1]').replace(/<br>/g, '\n');
      text += `📖 [오늘의 말씀]\n${cleanScripture}\n\n`;
    }

    if (includeUnderstanding && qt.understanding) {
      text += `🔍 [본문의 이해]\n${qt.understanding}\n\n`;
    }

    if (includeWhoIsGod && qt.whoIsGod) {
      text += `❓ [하나님은 어떤 분이십니까?]\n${qt.whoIsGod}\n\n`;
    }

    if (includeGraceAndThanks && qt.graceAndThanks) {
      text += `🎁 [내가 받은 은혜와 감사]\n${qt.graceAndThanks}\n\n`;
    }

    if (includeLesson && qt.lesson) {
      text += `🧭 [내게 주시는 교훈]\n${qt.lesson}\n\n`;
    }

    if (includeApplication && qt.application) {
      text += `🌱 [적용과 실천]\n${qt.application}\n\n`;
    }

    if (includePrayer && qt.prayer) {
      text += `🙏 [오늘의 기도]\n${qt.prayer}\n\n`;
    }

    text += `매일 주님과 함께, QT라이프 🕊️`;
    return text;
  },

  // 공유 모달 열기 및 초기 프리뷰 렌더링
  openShareModal() {
    const modal = document.getElementById('share-modal');
    modal.classList.add('active');
    this.updateSharePreview();
  },

  closeShareModal() {
    const modal = document.getElementById('share-modal');
    modal.classList.remove('active');
  },

  updateSharePreview() {
    const shareText = this.generateShareText();
    document.getElementById('share-preview-text').textContent = shareText;
  },

  // 실제 전송 및 클립보드 복사
  executeShare() {
    const text = this.generateShareText();
    if (!text) return;
    
    // 모바일 기기 자체 공유 API 지원 시
    if (navigator.share) {
      navigator.share({
        title: 'QT라이프 QT 나눔',
        text: text
      })
      .then(() => {
        this.closeShareModal();
        this.showToast('성공적으로 나눔을 공유했습니다!');
      })
      .catch((err) => {
        console.log('공유 취소 또는 오류:', err);
        // 에러 발생 혹은 공유 창을 그냥 닫을 시 클립보드 복사로 대체
        this.copyToClipboard(text);
      });
    } else {
      // 일반 클립보드 복사
      this.copyToClipboard(text);
    }
  },

  copyToClipboard(text) {
    // 최신 Clipboard API 활용
    navigator.clipboard.writeText(text).then(() => {
      this.closeShareModal();
      this.showToast('클립보드에 나눔 텍스트가 복사되었습니다! 카톡에 붙여넣어 공유하세요.');
    }).catch(err => {
      console.error('클립보드 복사 실패:', err);
      // 구형 Clipboard Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.closeShareModal();
        this.showToast('클립보드에 복사되었습니다!');
      } catch (err2) {
        this.showToast('복사 실패. 텍스트를 드래그해서 직접 복사해 주세요.');
      }
      document.body.removeChild(textArea);
    });
  },

  // ==========================================================================
  // 9. 설정 및 데이터 백업/복원
  // ==========================================================================
  setupSettings() {
    document.getElementById('input-username').value = state.userName;
    // 테마 버튼 상태는 applyTheme()에서 항상 동기화됨
  },

  saveUsername() {
    const input = document.getElementById('input-username');
    const newName = input.value.trim();
    if (newName) {
      state.userName = newName;
      db.saveUserName(newName);
      this.renderUserProfile();
      this.showToast('사용자 이름을 변경했습니다.');
    } else {
      alert('이름을 한 글자 이상 입력해 주세요.');
    }
  },

  // 백업 파일 생성 및 다운로드 (JSON 내보내기)
  exportData() {
    if (state.qts.length === 0) {
      alert('백업할 QT 기록이 없습니다.');
      return;
    }
    
    const backupData = {
      version: '1.0.0',
      exporter: 'Cell Life QT Mobile Web App',
      createdAt: new Date().toISOString(),
      userName: state.userName,
      qts: state.qts
    };
    
    const dataStr = JSON.stringify(backupData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `cell-life-qt-backup-${getLocalDateString(new Date()).replace(/-/g, '')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    this.showToast('백업용 JSON 파일이 내보내졌습니다.');
  },

  // 백업 파일 로드 (JSON 가져오기)
  importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!data.qts || !Array.isArray(data.qts)) {
          alert('올바른 백업 파일 형식이 아닙니다. (qts 배열을 찾을 수 없음)');
          return;
        }

        if (confirm(`백업 파일에 포함된 ${data.qts.length}개의 QT 기록을 불러오시겠습니까? 기존 기록 중 중복된 날짜의 데이터는 덮어씌워집니다.`)) {
          // 병합 처리 (날짜 ID 기준 중복 시 백업 데이터 우선)
          const currentMap = new Map(state.qts.map(qt => [qt.id, qt]));
          data.qts.forEach(qt => {
            currentMap.set(qt.id, qt);
          });
          
          const mergedQts = Array.from(currentMap.values());
          localStorage.setItem('cell_life_qts', JSON.stringify(mergedQts));
          state.qts = mergedQts;
          
          if (data.userName) {
            state.userName = data.userName;
            db.saveUserName(data.userName);
            this.renderUserProfile();
          }

          this.renderStreak();
          this.renderCalendar();
          this.renderQtList();
          
          this.showToast('데이터가 성공적으로 복원되었습니다.');
          this.switchTab('dashboard');
        }
      } catch (err) {
        alert('백업 파일 분석에 실패했습니다. 올바른 JSON 형식인지 확인하세요.');
        console.error(err);
      }
      // 파일 입력 초기화
      e.target.value = '';
    };
    reader.readAsText(file);
  },

  // 데이터 전체 초기화
  resetDatabase() {
    if (confirm('정말로 모든 QT 기록을 초기화하시겠습니까?\n이 작업은 되돌릴 수 없으며 모든 데이터가 삭제됩니다.')) {
      if (confirm('최종 확인: 모든 데이터(작성 기록, 이름, 테마 설정 등)를 전부 영구적으로 삭제하시겠습니까?')) {
        db.clearAllData();
        state.userName = '성도';
        state.theme = 'light';
        state.fontSize = 'medium';
        state.qts = [];
        state.viewingQtId = null;
        state.editingQtId = null;
        
        this.applyTheme('light');
        this.applyFontSize('medium');
        this.renderUserProfile();
        this.renderStreak();
        this.renderCalendar();
        this.renderQtList();
        
        this.showToast('모든 기록이 깨끗하게 초기화되었습니다.');
        this.switchTab('dashboard');
      }
    }
  },

  // ==========================================================================
  // 10. 이벤트 바인딩
  // ==========================================================================
  bindEvents() {
    // 하단 탭 바 클릭 이벤트
    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });

    // 헤더 테마 변경 버튼
    document.getElementById('btn-theme-toggle').addEventListener('click', () => {
      const nextTheme = state.theme === 'light' ? 'dark' : 'light';
      this.applyTheme(nextTheme);
    });

    // 달력 이전달/다음달 버튼
    document.getElementById('btn-prev-month').addEventListener('click', () => {
      state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
      this.renderCalendar();
    });
    
    document.getElementById('btn-next-month').addEventListener('click', () => {
      state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
      this.renderCalendar();
    });

    // 날짜 선택 변경 시 해당 날짜의 본문 자동 반영 및 성경 자동 로드
    const dateInput = document.getElementById('input-date');
    if (dateInput) {
      dateInput.addEventListener('change', (e) => {
        const selectedDate = e.target.value;
        const preloadedData = ALL_PASSAGES[selectedDate];
        this.setPassage(preloadedData ? preloadedData.passage : '');
        this.setScriptureContent('');
        if (preloadedData && preloadedData.passage) {
          this.autoFetchPassage(preloadedData.passage);
        }
        this.updateDraftStatus(false);
        this.handleEditorInput();
      });
    }

    // 대시보드 QT 검색 기능
    document.getElementById('search-qt').addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      this.renderQtList();
    });

    // 에디터 뒤로가기 / 취소 버튼
    document.getElementById('btn-editor-back').addEventListener('click', () => {
      if (confirm('작성 중인 내용이 저장되지 않을 수 있습니다. 뒤로 가시겠습니까?')) {
        this.switchTab('dashboard');
      }
    });

    document.getElementById('btn-editor-cancel').addEventListener('click', () => {
      if (confirm('작성을 취소하시겠습니까?')) {
        this.switchTab('dashboard');
      }
    });

    // 에디터 입력 시 실시간 임시 저장 유도
    const formFields = [
      'input-date', 'input-title', 'input-understanding',
      'input-who-is-god', 'input-grace-and-thanks', 'input-lesson', 'input-application', 'input-prayer'
    ];
    formFields.forEach(id => {
      const element = document.getElementById(id);
      if (!element) return;
      element.addEventListener('input', () => {
        this.updateDraftStatus(false);
        this.handleEditorInput();
      });
    });

    const scriptureDisplay = document.getElementById('scripture-display');
    // 직접 타이핑 차단 (형광펜/밑줄 선택은 유지)
    scriptureDisplay.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) return; // Ctrl+A, Ctrl+C 허용
      e.preventDefault();
    });
    scriptureDisplay.addEventListener('paste', (e) => e.preventDefault());

    scriptureDisplay.addEventListener('input', () => {
      this.updateDraftStatus(false);
      this.handleEditorInput();
    });
    scriptureDisplay.addEventListener('mouseup', () => {
      setTimeout(() => {
        if (this.isSelectionInside(scriptureDisplay)) {
          this.showFormatToolbar();
        }
      }, 10);
    });

    // 색상 선택기 — 선택 영역 저장 후 적용
    let savedRange = null;
    const colorInput = document.getElementById('highlight-color-input');
    colorInput.addEventListener('mousedown', () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();
    }, true);
    colorInput.addEventListener('change', (e) => {
      if (savedRange) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
        savedRange = null;
      }
      this.applyTextFormat('highlight', e.target.value);
    });

    // 에디터 성경 글자 크기 조절
    document.getElementById('btn-scripture-size-dec').addEventListener('click', () => this.changeEditorScriptureSize(-1));
    document.getElementById('btn-scripture-size-inc').addEventListener('click', () => this.changeEditorScriptureSize(1));

    document.addEventListener('click', (e) => {
      const toolbar = document.getElementById('text-format-toolbar');
      if (!scriptureDisplay.contains(e.target) && !toolbar.contains(e.target)) {
        this.hideFormatToolbar();
      }
    });

    document.querySelectorAll('#text-format-toolbar .fmt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.currentTarget.getAttribute('data-action');
        const color = e.currentTarget.getAttribute('data-color');
        this.applyTextFormat(action, color);
      });
    });

    // 에디터 서브밋(저장)
    document.getElementById('qt-form').addEventListener('submit', (e) => this.handleFormSubmit(e));

    // 뷰어 뒤로가기 버튼
    document.getElementById('btn-viewer-back').addEventListener('click', () => {
      this.switchTab('dashboard');
    });

    // 뷰어 글자크기 제어
    document.getElementById('btn-font-dec').addEventListener('click', () => {
      const sizes = ['small', 'medium', 'large', 'xlarge'];
      const curIndex = sizes.indexOf(state.fontSize);
      if (curIndex > 0) {
        this.applyFontSize(sizes[curIndex - 1]);
      }
    });
    
    document.getElementById('btn-font-inc').addEventListener('click', () => {
      const sizes = ['small', 'medium', 'large', 'xlarge'];
      const curIndex = sizes.indexOf(state.fontSize);
      if (curIndex < sizes.length - 1) {
        this.applyFontSize(sizes[curIndex + 1]);
      }
    });

    // 뷰어 액션: 수정/삭제/나눔 모달 열기
    document.getElementById('btn-viewer-edit').addEventListener('click', () => {
      this.switchTab('write', state.viewingQtId);
    });

    document.getElementById('btn-viewer-delete').addEventListener('click', () => {
      this.deleteCurrentQt();
    });

    document.getElementById('btn-viewer-share').addEventListener('click', () => {
      this.openShareModal();
    });

    // 나눔 모달 제어
    document.getElementById('btn-modal-close').addEventListener('click', () => {
      this.closeShareModal();
    });

    document.getElementById('share-modal').addEventListener('click', (e) => {
      if (e.target.id === 'share-modal') this.closeShareModal();
    });

    // 모달 내 체크박스 상태 변경 시 프리뷰 업데이트
    const shareCheckboxes = [
      'share-chk-date', 'share-chk-passage', 'share-chk-scripture', 'share-chk-title', 
      'share-chk-understanding', 'share-chk-who-is-god', 'share-chk-grace-and-thanks', 
      'share-chk-lesson', 'share-chk-application', 'share-chk-prayer'
    ];
    shareCheckboxes.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.addEventListener('change', () => this.updateSharePreview());
      }
    });

    // 모달 복사/공유 실행
    document.getElementById('btn-share-copy').addEventListener('click', () => this.executeShare());

    // 설정: 이름 변경
    document.getElementById('btn-save-username').addEventListener('click', () => this.saveUsername());
    
    // 설정: 화면 테마 전환
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.applyTheme(e.currentTarget.getAttribute('data-theme'));
        // active 상태는 applyTheme()에서 자동 처리
      });
    });

    document.getElementById('btn-gdrive-connect').addEventListener('click', () => this.connectGoogleDrive());
    document.getElementById('btn-gdrive-disconnect').addEventListener('click', () => this.disconnectGoogleDrive());

    // 설정: 데이터 백업 및 복원
    document.getElementById('btn-export').addEventListener('click', () => this.exportData());
    
    const fileInput = document.getElementById('file-import');
    document.getElementById('btn-import-trigger').addEventListener('click', () => {
      fileInput.click();
    });
    fileInput.addEventListener('change', (e) => this.importData(e));

    // 설정: 전체 데이터 초기화
    document.getElementById('btn-reset-db').addEventListener('click', () => this.resetDatabase());

    // 설정: 로그아웃
    document.getElementById('btn-logout').addEventListener('click', () => this.signOut());
    document.getElementById('btn-change-pw').addEventListener('click', () => {
      const newPw = document.getElementById('input-new-pw').value;
      const confirmPw = document.getElementById('input-confirm-pw').value;
      this.changePassword(newPw, confirmPw);
    });
  }
};

// lucide 안전 호출 래퍼
function safeCreateIcons() {
  try {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  } catch (e) {
    console.warn('lucide 아이콘 초기화 실패:', e);
  }
}

// Supabase 로그인 완료 후 init 호출
window._appInitCallback = function(session) { app.init(session); };

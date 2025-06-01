// Firebase 초기화
const firebaseConfig = {
    apiKey: "AIzaSyB34XefY5TKArFOSSt_ITgRo_qKBz3oLKg",
    authDomain: "hawail-travel.firebaseapp.com",
    projectId: "hawail-travel",
    storageBucket: "hawail-travel.firebasestorage.app",
    messagingSenderId: "995504357924",
    appId: "1:995504357924:web:a6b4a2661ecfea21ee0eb1",
    databaseURL: "https://hawail-travel-default-rtdb.asia-southeast1.firebasedatabase.app/"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// DOM 요소
const calendarGrid = document.getElementById('calendarGrid');
const currentMonthElement = document.getElementById('currentMonth');
const prevMonthButton = document.getElementById('prevMonth');
const nextMonthButton = document.getElementById('nextMonth');
const selectedDateElement = document.getElementById('selectedDate');
const scheduleItems = document.getElementById('scheduleItems');
const scheduleForm = document.getElementById('scheduleForm');
const addScheduleBtn = document.getElementById('addScheduleBtn');
const cancelBtn = document.getElementById('cancelBtn');
const eventTime = document.getElementById('eventTime');

// JSON 파일 처리 관련 변수와 이벤트 리스너
const jsonFileInput = document.getElementById('jsonFileInput');
const importJsonBtn = document.getElementById('importJsonBtn');

// 현재 선택된 날짜와 달력 상태
let currentDate = new Date();
let selectedDate = null;
let events = [];

// 캘린더 초기화
function initializeCalendar() {
    renderCalendar();
    loadEvents();
    setupEventListeners();
}

// 캘린더 렌더링
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 달력 제목 업데이트
    currentMonthElement.textContent = `${year}년 ${month + 1}월`;
    
    // 이번 달의 첫 날과 마지막 날
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 이전 달의 마지막 날들
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const firstDayIndex = firstDay.getDay();
    
    calendarGrid.innerHTML = '';
    
    // 이전 달의 날짜들
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dayElement = createDayElement(prevMonthLastDay - i, 'empty');
        calendarGrid.appendChild(dayElement);
    }
    
    // 현재 달의 날짜들
    for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dayElement = createDayElement(day, 'current');
        
        // 주말 처리
        if (date.getDay() === 0) dayElement.classList.add('holiday');
        
        // 오늘 날짜 처리
        if (isToday(date)) dayElement.classList.add('today');
        
        // 선택된 날짜 처리
        if (isSelectedDate(date)) dayElement.classList.add('selected');
        
        // 이벤트가 있는 날짜 처리
        if (hasEvents(date)) {
            dayElement.classList.add('has-event');
            const eventTypes = getEventTypes(date);
            if (eventTypes.departure) dayElement.classList.add('is-departure');
            if (eventTypes.arrival) dayElement.classList.add('is-arrival');
        }
        
        calendarGrid.appendChild(dayElement);
    }
    
    // 다음 달의 날짜들
    const remainingDays = 42 - (firstDayIndex + lastDay.getDate());
    for (let i = 1; i <= remainingDays; i++) {
        const dayElement = createDayElement(i, 'empty');
        calendarGrid.appendChild(dayElement);
    }
}

// 날짜 요소 생성
function createDayElement(day, type) {
    const dayElement = document.createElement('div');
    dayElement.className = `calendar-day ${type}`;
    dayElement.textContent = day;
    
    if (type === 'current') {
        dayElement.addEventListener('click', () => selectDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)));
    }
    
    return dayElement;
}

// 이벤트 리스너 설정
function setupEventListeners() {
    prevMonthButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonthButton.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    addScheduleBtn.addEventListener('click', () => {
        showScheduleForm('add');
    });
    
    cancelBtn.addEventListener('click', hideScheduleForm);
    
    document.querySelector('.schedule-form').addEventListener('submit', handleScheduleSubmit);

    // 파일 선택 시 버튼 활성화
    jsonFileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        importJsonBtn.disabled = !file;
    });

    // JSON 파일 가져오기 버튼 클릭 처리
    importJsonBtn.addEventListener('click', function() {
        const file = jsonFileInput.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const jsonData = JSON.parse(e.target.result);
                importEvents(jsonData);
            } catch (error) {
                console.error('JSON 파싱 오류:', error);
                alert('JSON 파일 형식이 올바르지 않습니다.');
            }
        };
        reader.readAsText(file);
    });
}

// 날짜 선택 처리
function selectDate(date) {
    console.log('Selecting date:', date);
    // 선택된 날짜의 시간을 00:00:00으로 설정
    selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    
    const formattedDate = formatDate(selectedDate);
    console.log('Formatted selected date:', formattedDate);
    selectedDateElement.textContent = formattedDate;
    
    renderCalendar();
    loadEventsForDate(selectedDate);
}

// Firebase 이벤트 로드
function loadEvents() {
    database.ref('events').on('value', (snapshot) => {
        events = [];
        snapshot.forEach((childSnapshot) => {
            const event = {
                id: childSnapshot.key,
                ...childSnapshot.val()
            };
            // 날짜 데이터 검증
            if (event.date) {
                try {
                    const eventDate = parseDate(event.date);
                    event.date = formatDate(eventDate);
                } catch (error) {
                    console.error('Invalid date format:', event.date);
                    return;
                }
            }
            events.push(event);
        });
        console.log('Loaded events:', events);
        renderCalendar();
        if (selectedDate) {
            loadEventsForDate(selectedDate);
        }
    });
}

// 시간을 24시간 형식으로 변환하는 함수 수정
function convertTimeToMinutes(timeStr) {
    // 시간이 없거나 '시간 선택'인 경우 가장 뒤로 정렬
    if (!timeStr || timeStr === '시간 선택') {
        return Number.MAX_SAFE_INTEGER;
    }

    try {
        const [period, time] = timeStr.split(' ');
        if (!period || !time) {
            return Number.MAX_SAFE_INTEGER;
        }

        const [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
            return Number.MAX_SAFE_INTEGER;
        }
        
        let totalMinutes = hours * 60 + minutes;
        
        // 오후인 경우 12시간 추가 (단, 오후 12시는 제외)
        if (period === '오후' && hours !== 12) {
            totalMinutes += 12 * 60;
        }
        // 오전 12시는 0시로 변환
        else if (period === '오전' && hours === 12) {
            totalMinutes = minutes;
        }
        
        return totalMinutes;
    } catch (error) {
        console.warn('시간 변환 중 오류 발생:', error);
        return Number.MAX_SAFE_INTEGER;
    }
}

// 선택된 날짜의 이벤트를 로드하는 함수 수정
function loadEventsForDate(date) {
    const dateStr = formatDate(date);
    console.log('Loading events for date:', dateStr);
    
    const dateEvents = events.filter(event => {
        const matches = event.date === dateStr;
        console.log('Event date comparison:', event.date, dateStr, matches);
        return matches;
    });
    
    // 시간 순으로 정렬
    dateEvents.sort((a, b) => {
        const timeA = convertTimeToMinutes(a.time);
        const timeB = convertTimeToMinutes(b.time);
        return timeA - timeB;
    });
    
    console.log('Found events:', dateEvents);
    
    scheduleItems.innerHTML = '<div class="schedule-timeline"></div>';
    
    if (dateEvents.length === 0) {
        scheduleItems.innerHTML += '<div class="no-events">등록된 일정이 없습니다.</div>';
        return;
    }
    
    dateEvents.forEach(event => {
        const eventElement = createEventElement(event);
        scheduleItems.appendChild(eventElement);
    });
}

// 일정 폼 표시
function showScheduleForm(mode, eventId = null) {
    const form = document.querySelector('.schedule-form');
    const event = eventId ? events.find(e => e.id === eventId) : null;
    
    form.reset();
    scheduleForm.classList.remove('hidden');
    
    const formTitle = scheduleForm.querySelector('h3');
    formTitle.textContent = mode === 'edit' ? '일정 수정' : '새 일정 추가';
    
    const submitBtn = form.querySelector('.submit-btn');
    submitBtn.textContent = mode === 'edit' ? '수정 완료' : '일정 추가';
    
    if (mode === 'edit' && event) {
        document.getElementById('eventId').value = event.id;
        document.getElementById('eventTitle').value = event.title;
        document.getElementById('eventDate').value = event.date;
        document.getElementById('eventUrl').value = event.url || '';
        document.getElementById('mapUrl').value = event.mapUrl || '';
        document.getElementById('eventDescription').value = event.description || '';
        document.getElementById('isDeparture').checked = event.isDeparture;
        document.getElementById('isArrival').checked = event.isArrival;
        document.getElementById('eventTime').value = event.time || '시간 선택';
    } else {
        document.getElementById('eventId').value = '';
        document.getElementById('eventTime').value = '시간 선택';
        if (selectedDate) {
            const formattedDate = formatDate(selectedDate);
            console.log('Setting form date:', formattedDate);
            document.getElementById('eventDate').value = formattedDate;
        }
    }
}

// 일정 폼 숨기기
function hideScheduleForm() {
    scheduleForm.classList.add('hidden');
}

// 일정 저장 처리
function handleScheduleSubmit(e) {
    e.preventDefault();
    
    const eventId = document.getElementById('eventId').value;
    const eventTime = document.getElementById('eventTime');
    const eventDateInput = document.getElementById('eventDate').value;
    
    console.log('Form submission - Input date:', eventDateInput);
    
    const eventDate = parseDate(eventDateInput);
    const formattedDate = formatDate(eventDate);
    
    console.log('Parsed and formatted date:', formattedDate);
    
    const eventData = {
        title: document.getElementById('eventTitle').value,
        date: formattedDate,
        time: eventTime.value !== '시간 선택' ? eventTime.value : null,
        url: document.getElementById('eventUrl').value,
        mapUrl: document.getElementById('mapUrl').value,
        description: document.getElementById('eventDescription').value,
        isDeparture: document.getElementById('isDeparture').checked,
        isArrival: document.getElementById('isArrival').checked
    };
    
    console.log('Saving event with date:', eventData.date);
    
    if (eventId) {
        database.ref('events/' + eventId).update(eventData)
            .then(() => {
                hideScheduleForm();
            })
            .catch(error => {
                console.error('Error updating event:', error);
                alert('일정 수정 중 오류가 발생했습니다.');
            });
    } else {
        database.ref('events').push(eventData)
            .then(() => {
                hideScheduleForm();
            })
            .catch(error => {
                console.error('Error adding event:', error);
                alert('일정 추가 중 오류가 발생했습니다.');
            });
    }
}

// 일정 수정
function editEvent(eventId) {
    showScheduleForm('edit', eventId);
}

// 일정 삭제
function deleteEvent(eventId) {
    if (confirm('정말로 이 일정을 삭제하시겠습니까?')) {
        database.ref('events/' + eventId).remove()
            .catch(error => {
                console.error('Error deleting event:', error);
                alert('일정 삭제 중 오류가 발생했습니다.');
            });
    }
}

// 유틸리티 함수들
function formatDate(date) {
    // 로컬 시간대 기준으로 날짜 변환
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().split('T')[0];
}

function parseDate(dateString) {
    // YYYY-MM-DD 형식의 문자열을 Date 객체로 변환
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    // 시간을 00:00:00으로 설정
    date.setHours(0, 0, 0, 0);
    return date;
}

function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
}

function isSelectedDate(date) {
    return selectedDate &&
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getFullYear() === selectedDate.getFullYear();
}

function hasEvents(date) {
    const dateStr = formatDate(date);
    console.log('Checking events for date:', dateStr);
    return events.some(event => {
        const result = event.date === dateStr;
        if (result) {
            console.log('Found event on:', dateStr);
        }
        return result;
    });
}

function getEventTypes(date) {
    const dateStr = formatDate(date);
    const dateEvents = events.filter(event => event.date === dateStr);
    return {
        departure: dateEvents.some(event => event.isDeparture),
        arrival: dateEvents.some(event => event.isArrival)
    };
}

// 이벤트 요소 생성
function createEventElement(event) {
    const eventElement = document.createElement('div');
    eventElement.className = 'schedule-item';
    eventElement.innerHTML = `
        <div class="schedule-content">
            <div class="title-container">
                <h4>${event.url ? `<a href="${event.url}" target="_blank">${event.title}</a>` : event.title}</h4>
                ${event.mapUrl ? `<button class="view-map-btn" title="지도 보기" onclick="window.open('${event.mapUrl}', '_blank')"></button>` : ''}
            </div>
            ${event.time ? `<div class="event-time">${event.time}</div>` : ''}
            ${event.description ? `<div class="event-details">${event.description}</div>` : ''}
            <div class="schedule-actions">
                <button class="edit-btn">수정</button>
                <button class="delete-btn">삭제</button>
            </div>
        </div>
    `;

    // 일정 클릭 이벤트
    eventElement.addEventListener('click', function(e) {
        // 이미 선택된 다른 일정들의 선택 상태 제거
        document.querySelectorAll('.schedule-item').forEach(item => {
            if (item !== eventElement) {
                item.classList.remove('show-actions');
            }
        });
        
        // 현재 일정의 선택 상태 토글
        eventElement.classList.toggle('show-actions');
    });

    // 수정 버튼 클릭 이벤트
    const editBtn = eventElement.querySelector('.edit-btn');
    editBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 이벤트 버블링 방지
        showScheduleForm('edit', event.id);
        
        // 수정 폼이 보이도록 스크롤
        setTimeout(() => {
            scheduleForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    });

    // 삭제 버튼 클릭 이벤트
    const deleteBtn = eventElement.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', function(e) {
        e.stopPropagation(); // 이벤트 버블링 방지
        if (confirm('이 일정을 삭제하시겠습니까?')) {
            deleteEvent(event.id);
        }
    });

    return eventElement;
}

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    initializeCalendar();
});

// 문서 클릭 이벤트 추가
document.addEventListener('click', function(e) {
    // 일정 항목 외의 영역 클릭 시 모든 일정의 선택 상태 제거
    if (!e.target.closest('.schedule-item')) {
        document.querySelectorAll('.schedule-item').forEach(item => {
            item.classList.remove('show-actions');
        });
    }
});

// 지도 검색 버튼 이벤트 핸들러 추가
document.getElementById('mapSearchBtn').addEventListener('click', function() {
    const mapUrl = document.getElementById('mapUrl').value;
    if (mapUrl) {
        window.open(mapUrl, '_blank');
    } else {
        // 구글 맵 새 창으로 열기
        window.open('https://www.google.com/maps', '_blank');
    }
});

// JSON 데이터로 일정 가져오기
function importEvents(jsonData) {
    if (!jsonData.events) {
        alert('올바른 형식의 JSON 파일이 아닙니다.');
        return;
    }

    // 확인 대화상자 표시
    if (!confirm('기존 일정이 모두 삭제되고 새로운 일정으로 대체됩니다.\n계속하시겠습니까?')) {
        return;
    }

    // Firebase에서 기존 일정 모두 삭제
    database.ref('events').remove()
        .then(() => {
            // 새로운 일정 추가
            const promises = [];
            
            Object.entries(jsonData.events).forEach(([dateTime, eventData]) => {
                const date = dateTime.split('T')[0]; // YYYY-MM-DD 형식 추출
                
                const newEvent = {
                    title: eventData.title,
                    date: date,
                    time: eventData.time || null,
                    url: eventData.url || '',
                    mapUrl: eventData.mapUrl || '',
                    description: eventData.details || '',
                    isDeparture: eventData.isDeparture || false,
                    isArrival: eventData.isArrival || false
                };

                // Firebase에 새 일정 추가
                promises.push(database.ref('events').push(newEvent));
            });

            // 모든 일정이 추가될 때까지 대기
            return Promise.all(promises);
        })
        .then(() => {
            alert('일정이 성공적으로 업데이트되었습니다.');
            jsonFileInput.value = ''; // 파일 입력 초기화
            importJsonBtn.disabled = true; // 버튼 비활성화
        })
        .catch(error => {
            console.error('일정 업데이트 오류:', error);
            alert('일정 업데이트 중 오류가 발생했습니다.');
        });
} 
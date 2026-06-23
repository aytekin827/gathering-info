import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { Calendar, Info, Search, Home, X, Map, BookOpen } from 'lucide-react';
import './index.css';

// Type definition for Room Data
interface RoomData {
  name: string;
  contact: string;  // '연락처' 열
  roomDay1: string;
  roomDay2: string;
}

// 동 번호 → 동 이름 매핑
const BUILDING_NAMES: Record<string, string> = {
  '1': '태조관',
  '2': '태종관',
  '3': '세종관',
  '4': '문종관',
  '5': '세조관',
  '6': '선조관',
  '7': '숙종관',
  '8': '영조관',
  '9': '정조관',
  '10': '고종관',
  '11': '순종관',
};

// "10동 101호" 형태의 문자열에서 동 이름을 추출하는 함수
function getBuildingName(roomStr: string): string {
  const match = roomStr.match(/(\d+)동/);
  if (match) {
    return BUILDING_NAMES[match[1]] || `${match[1]}동`;
  }
  return '';
}

// Mock data to use if Google Sheets fetch fails or is not yet configured
const MOCK_DATA: RoomData[] = [
  { name: '홍길동', contact: '010-1234-5678', roomDay1: '1동 101호', roomDay2: '1동 101호' },
  { name: '김철수', contact: '010-9876-5432', roomDay1: '5동 205호', roomDay2: '5동 205호' },
  { name: '이영희', contact: '010-1111-2222', roomDay1: '3동 303호', roomDay2: '3동 305호' },
];

export type Language = 'ko' | 'en';

export const TRANSLATIONS = {
  ko: {
    navSchedule: '시간표',
    navStructure: '지도',
    navLocation: '오시는 길',
    navGuide: '캠프 안내사항',
    navRoom: '숙소 배정',
    navWorkshop: '미션워크샵',
    title: '2026 개더링',
    subtitle: '하나님의 은혜로 복된 시간 되세요❤️',
    scheduleTitle: '시간표',
    scheduleHint: '',
    structureTitle: '지도',
    locationTitle: '오시는 길',
    locationHint: '캠프장 오시는 길 안내입니다. 셔틀버스 탑승 위치도 확인해주세요.',
    guideTitle: '캠프 안내사항',
    guideHint: '',
    roomTitle: '숙소 배정',
    roomHint: '이름과 전화번호를 입력하여 배정된 숙소를 확인하세요.',
    nameLabel: '이름',
    namePlaceholder: '예: 홍길동',
    phoneLabel: '연락처',
    phonePlaceholder: '010-0000-0000',
    submitBtn: '숙소 확인하기',
    checkingBtn: '확인 중...',
    successMessage: (name: string) => `${name}님의 숙소가 배정되었습니다.`,
    errorMessage: '일치하는 정보가 없습니다. 이름과 전화번호를 다시 확인해주세요.',
    day1Room: '6.25 (목)',
    day2Room: '6.26 (금)',
    swipeHint: '옆으로 스와이프 하세요 ↔',
    workshopTitle: '미션워크샵',
    workshopBtn: '신청하기',
    workshopHint: '미션워크샵 강의 신청 페이지로 이동하여 신청하실 수 있습니다.',
  },
  en: {
    navSchedule: 'Schedule',
    navStructure: 'Map',
    navLocation: 'Directions',
    navGuide: 'Information',
    navRoom: 'Room Assignment',
    navWorkshop: 'Mission Workshop',
    title: '2026 Gathering',
    subtitle: 'Have a blessed time!',
    scheduleTitle: 'Schedule',
    scheduleHint: '',
    structureTitle: 'Map',
    locationTitle: 'Directions',
    locationHint: 'Directions to the campsite. Please check the shuttle bus boarding location.',
    guideTitle: 'Information',
    guideHint: '',
    roomTitle: 'Room Assignment',
    roomHint: 'Enter your name and phone number to check your assigned accommodation.',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. Gildong Hong',
    phoneLabel: 'Contact',
    phonePlaceholder: '010-0000-0000',
    submitBtn: 'Check Accommodation',
    checkingBtn: 'Checking...',
    successMessage: (name: string) => `Room assigned for ${name}.`,
    errorMessage: 'No matching records found. Please check your name and phone number again.',
    day1Room: 'Day 1 (Thu 6/25)',
    day2Room: 'Day 2 (Fri 6/26)',
    swipeHint: 'Swipe sideways ↔',
    workshopTitle: 'Mission Workshop',
    workshopBtn: 'Apply',
    workshopHint: 'Go to the Mission Workshop registration page to apply.',
  }
};

const SECTION_IMAGES = {
  schedule: [
    "/gathering-schedule-ko.png",
    "/gathering-schedule-en.png",
  ],
  structure: [
    "layout.jpg",
  ],
  location: [
    "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=1000&auto=format&fit=crop",
  ],
  guide: {
    ko: [
      "/gathering-items.jpg",
      "/gathering-shuttle.jpg"
    ],
    en: [
      "/gathering-items-en.jpg",
      "/gathering-shuttle-en.jpg"
    ]
  }
};

function App() {
  const [language, setLanguage] = useState<Language>('ko');
  const [activeSection, setActiveSection] = useState('schedule');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [searchResult, setSearchResult] = useState<{
    status: 'idle' | 'success' | 'error';
    name?: string;
    roomDay1?: string;
    roomDay2?: string;
  }>({ status: 'idle' });
  const [isLoading, setIsLoading] = useState(false);
  const [roomData, setRoomData] = useState<RoomData[]>([]);

  // Lightbox State
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const lightboxSliderRef = useRef<HTMLDivElement>(null);

  // Google Sheet "방배정" 시트 CSV URL
  // 실제 시트 데이터 확인 결과, 첫 번째 시트(gid=0)에 방배정 데이터가 있습니다.
  // 만약 "방배정" 시트가 따로 있다면 해당 시트의 gid 값으로 교체하세요.
  // const BASE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSobizaNozUAdQ0FThwosoBm8897pf96D-wN0VLsH2QR_RQk96d_EA-yKpdB6yqqkAT2KUok5h--0Ms/pub';
  // gid=0: 첫 번째 시트 ("방배정" 시튴이 다른 위치에 있다면 해당 gid로 교체)
  // const BANG_BAEJUNG_GID = '0';
  // const GOOGLE_SHEET_CSV_URL = `${BASE_SHEET_URL}?output=csv&gid=${BANG_BAEJUNG_GID}`;

  const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSobizaNozUAdQ0FThwosoBm8897pf96D-wN0VLsH2QR_RQk96d_EA-yKpdB6yqqkAT2KUok5h--0Ms/pub?output=csv';

  useEffect(() => {
    // Attempt to load Google Sheets data
    const fetchSheetData = async () => {
      if (!GOOGLE_SHEET_CSV_URL) {
        setRoomData(MOCK_DATA);
        return;
      }

      try {
        Papa.parse(GOOGLE_SHEET_CSV_URL, {
          download: true,
          header: true,
          complete: (results) => {
            console.log('CSV 헤더 (열 이름):', results.meta.fields);
            console.log('첫 번째 행 샘플:', results.data[0]);
            const parsedData: RoomData[] = (results.data as any[])
              .filter((row: any) => row['이름'] || row['name']) // 빈 행 제거
              .map((row: any) => ({
                name: row['이름'] || row['name'] || '',
                // '연락처' 열 사용 (백업: '전화번호', 'phone')
                contact: row['연락처'] || row['전화번호'] || row['phone'] || '',
                // 실제 열명: '6.25(목)', '6.26(금)'
                roomDay1: row['6.25(목)'] || row['첫째날방'] || row['1일차방'] || '',
                roomDay2: row['6.26(금)'] || row['둘째날방'] || row['2일차방'] || '',
              }));
            console.log(`총 ${parsedData.length}개의 행 로드됨`);
            console.log('샘플 데이터:', parsedData.slice(0, 3));
            setRoomData(parsedData);
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
            setRoomData(MOCK_DATA);
          }
        });
      } catch (e) {
        console.error("Failed to fetch Google Sheet data:", e);
        setRoomData(MOCK_DATA);
      }
    };

    fetchSheetData();
  }, []);

  const handleScroll = () => {
    const sections = ['schedule', 'guide', 'workshop', 'structure', 'room', 'location'];
    const scrollPosition = window.scrollY + 100;

    for (const section of sections) {
      const element = document.getElementById(section);
      if (element) {
        const { offsetTop, offsetHeight } = element;
        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
          setActiveSection(section);
        }
      }
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    setActiveSection(id);
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 3 && cleaned.length <= 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    } else if (cleaned.length > 7) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
    }
    return formatted;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneInput(formatPhoneNumber(e.target.value));
  };

  const handleSearchRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim() || !phoneInput.trim()) return;

    setIsLoading(true);
    setSearchResult({ status: 'idle' });

    setTimeout(() => {
      const normalizedInputContact = phoneInput.replace(/-/g, '').trim();
      const normalizedInputName = nameInput.trim();

      const found = roomData.find(item => {
        const itemContact = item.contact.replace(/-/g, '').trim();
        return item.name === normalizedInputName && itemContact === normalizedInputContact;
      });

      if (found && (found.roomDay1 || found.roomDay2)) {
        setSearchResult({
          status: 'success',
          name: found.name,
          roomDay1: found.roomDay1,
          roomDay2: found.roomDay2
        });
      } else {
        setSearchResult({
          status: 'error'
        });
      }
      setIsLoading(false);
    }, 600);
  };

  const openLightbox = (images: string[], initialIndex: number) => {
    setLightboxImages(images);
    setIsLightboxOpen(true);
    document.body.style.overflow = 'hidden';

    // Scroll to the specific image instantly once the lightbox is open
    setTimeout(() => {
      if (lightboxSliderRef.current) {
        const slideWidth = window.innerWidth;
        lightboxSliderRef.current.scrollTo({ left: slideWidth * initialIndex, behavior: 'instant' });
      }
    }, 10);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
    document.body.style.overflow = 'auto';
  };

  return (
    <>
      <div className="bg-decoration-1" />
      <div className="bg-decoration-2" />

      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-container">
          <ul className="nav-links">
            <li
              className={`nav-item ${activeSection === 'schedule' ? 'active' : ''}`}
              onClick={() => scrollToSection('schedule')}
            >
              {TRANSLATIONS[language].navSchedule}
            </li>
            <li
              className={`nav-item ${activeSection === 'guide' ? 'active' : ''}`}
              onClick={() => scrollToSection('guide')}
            >
              {TRANSLATIONS[language].navGuide}
            </li>
            <li
              className={`nav-item ${activeSection === 'workshop' ? 'active' : ''}`}
              onClick={() => scrollToSection('workshop')}
            >
              {TRANSLATIONS[language].navWorkshop}
            </li>
            <li
              className={`nav-item ${activeSection === 'structure' ? 'active' : ''}`}
              onClick={() => scrollToSection('structure')}
            >
              {TRANSLATIONS[language].navStructure}
            </li>
            <li
              className={`nav-item ${activeSection === 'room' ? 'active' : ''}`}
              onClick={() => scrollToSection('room')}
            >
              {TRANSLATIONS[language].navRoom}
            </li>
            {/* <li
              className={`nav-item ${activeSection === 'location' ? 'active' : ''}`}
              onClick={() => scrollToSection('location')}
            >
              {TRANSLATIONS[language].navLocation}
            </li> */}
          </ul>

          <div className="lang-toggle">
            <button
              type="button"
              className={`lang-btn ${language === 'ko' ? 'active' : ''}`}
              onClick={() => setLanguage('ko')}
            >
              KO
            </button>
            <button
              type="button"
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              EN
            </button>
          </div>
        </div>
      </nav>

      <main className="container">
        <header className="page-header">
          <h1 className="page-title">{TRANSLATIONS[language].title}</h1>
          <p className="page-subtitle">{TRANSLATIONS[language].subtitle}</p>
        </header>

        {/* Schedule Section */}
        <section id="schedule" className="section">
          <h2 className="section-title">
            <Calendar size={24} color="var(--primary-color)" /> {TRANSLATIONS[language].scheduleTitle}
          </h2>
          <div className="section-gallery">
            {(() => {
              const scheduleImg = language === 'ko'
                ? SECTION_IMAGES.schedule[0]
                : SECTION_IMAGES.schedule[1];
              return (
                <img
                  src={scheduleImg}
                  alt={TRANSLATIONS[language].scheduleTitle}
                  className="section-image section-image--full"
                  onClick={() => openLightbox([scheduleImg], 0)}
                />
              );
            })()}
          </div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            {TRANSLATIONS[language].scheduleHint}
          </p>
        </section>

        {/* Guide Section */}
        <section id="guide" className="section">
          <h2 className="section-title">
            <Info size={24} color="var(--primary-color)" /> {TRANSLATIONS[language].guideTitle}
          </h2>
          <div className="section-gallery">
            {SECTION_IMAGES.guide[language].map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`${TRANSLATIONS[language].guideTitle} ${idx + 1}`}
                className="section-image section-image--full"
                onClick={() => openLightbox(SECTION_IMAGES.guide[language], idx)}
              />
            ))}
          </div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            {TRANSLATIONS[language].guideHint}
          </p>
        </section>

        {/* Workshop Section */}
        <section id="workshop" className="section">
          <h2 className="section-title">
            <BookOpen size={24} color="var(--primary-color)" /> {TRANSLATIONS[language].workshopTitle}
          </h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            {TRANSLATIONS[language].workshopHint}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
            <a
              href="https://www.the4winds1327.com/courses"
              target="_blank"
              rel="noopener noreferrer"
              className="submit-btn"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: '300px',
                textAlign: 'center',
              }}
            >
              {TRANSLATIONS[language].workshopBtn}
            </a>
          </div>
        </section>

        {/* Structure Section */}
        <section id="structure" className="section">
          <h2 className="section-title">
            <Map size={24} color="var(--primary-color)" /> {TRANSLATIONS[language].structureTitle}
          </h2>
          <div className="section-gallery">
            {SECTION_IMAGES.structure.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`${TRANSLATIONS[language].structureTitle} ${idx + 1}`}
                className="section-image"
                onClick={() => openLightbox(SECTION_IMAGES.structure, idx)}
              />
            ))}
          </div>
        </section>

        {/* Room Assignment Section */}
        <section id="room" className="section">
          <h2 className="section-title">
            <Home size={24} color="var(--primary-color)" /> {TRANSLATIONS[language].roomTitle}
          </h2>
          <p style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)' }}>
            {TRANSLATIONS[language].roomHint}
          </p>

          <form className="room-form" onSubmit={handleSearchRoom}>
            <div className="input-group">
              <label htmlFor="name" className="input-label">
                {TRANSLATIONS[language].nameLabel}
              </label>
              <input
                type="text"
                id="name"
                className="input-field"
                placeholder={TRANSLATIONS[language].namePlaceholder}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="phone" className="input-label">
                {TRANSLATIONS[language].phoneLabel}
              </label>
              <input
                type="tel"
                id="phone"
                className="input-field"
                placeholder={TRANSLATIONS[language].phonePlaceholder}
                value={phoneInput}
                onChange={handlePhoneChange}
                maxLength={13}
                required
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={isLoading || !nameInput || !phoneInput}
            >
              {isLoading ? TRANSLATIONS[language].checkingBtn : TRANSLATIONS[language].submitBtn}{' '}
              <Search size={18} style={{ display: 'inline', verticalAlign: 'text-bottom', marginLeft: '4px' }} />
            </button>
          </form>

          {/* Result Display */}
          {searchResult.status !== 'idle' && (
            <div className={`result-card ${searchResult.status}`}>
              <p>
                {searchResult.status === 'success'
                  ? TRANSLATIONS[language].successMessage(searchResult.name || '')
                  : TRANSLATIONS[language].errorMessage}
              </p>
              {searchResult.status === 'success' && (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                  <div style={{ flex: 1, padding: '1rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {TRANSLATIONS[language].day1Room}
                    </div>
                    <div className="room-number">{searchResult.roomDay1 || '-'}</div>
                    {searchResult.roomDay1 && getBuildingName(searchResult.roomDay1) && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 600, marginTop: '0.3rem' }}>
                        {getBuildingName(searchResult.roomDay1)}
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, padding: '1rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {TRANSLATIONS[language].day2Room}
                    </div>
                    <div className="room-number">{searchResult.roomDay2 || '-'}</div>
                    {searchResult.roomDay2 && getBuildingName(searchResult.roomDay2) && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 600, marginTop: '0.3rem' }}>
                        {getBuildingName(searchResult.roomDay2)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Location Section */}
        {/* <section id="location" className="section">
          <h2 className="section-title">
            <MapPin size={24} color="var(--primary-color)" /> {TRANSLATIONS[language].locationTitle}
          </h2>
          <div className="section-gallery">
            {SECTION_IMAGES.location.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`${TRANSLATIONS[language].locationTitle} ${idx + 1}`}
                className="section-image"
                onClick={() => openLightbox(SECTION_IMAGES.location, idx)}
              />
            ))}
          </div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            {TRANSLATIONS[language].locationHint}
          </p>
        </section> */}
      </main>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="lightbox-overlay">
          <button className="lightbox-close" onClick={closeLightbox}>
            <X size={28} color="white" />
          </button>

          <div className="lightbox-slider" ref={lightboxSliderRef}>
            {lightboxImages.map((src, idx) => (
              <div className="lightbox-slide" key={idx}>
                <img src={src} alt={`Enlarged image ${idx + 1}`} className="lightbox-img" />
              </div>
            ))}
          </div>

          {lightboxImages.length > 1 && (
            <div className="lightbox-hint">{TRANSLATIONS[language].swipeHint}</div>
          )}
        </div>
      )}
    </>
  );
}

export default App;

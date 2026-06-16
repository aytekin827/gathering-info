import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { Calendar, MapPin, Info, Search, Home, X, Map } from 'lucide-react';
import './index.css';

// Type definition for Room Data
interface RoomData {
  name: string;
  phone: string;
  roomDay1: string;
  roomDay2: string;
}

// Mock data to use if Google Sheets fetch fails or is not yet configured
const MOCK_DATA: RoomData[] = [
  { name: '홍길동', phone: '010-1234-5678', roomDay1: '101호', roomDay2: '101호' },
  { name: '김철수', phone: '010-9876-5432', roomDay1: '205호', roomDay2: '205호' },
  { name: '이영희', phone: '010-1111-2222', roomDay1: '303호', roomDay2: '305호' },
];

export type Language = 'ko' | 'en';

export const TRANSLATIONS = {
  ko: {
    navSchedule: '시간표',
    navStructure: '왕의지밀 구조도',
    navLocation: '오시는 길',
    navGuide: '캠프 안내사항',
    navRoom: '숙소 배정',
    title: '2026 개더링',
    subtitle: '은혜 많이 받으세요~',
    scheduleTitle: '시간표',
    scheduleHint: '이미지를 클릭하시면 확대하여 보실 수 있습니다. 여러 장일 경우 좌우로 넘겨보세요.',
    structureTitle: '왕의지밀 구조도',
    locationTitle: '오시는 길',
    locationHint: '캠프장 오시는 길 안내입니다. 셔틀버스 탑승 위치도 확인해주세요.',
    guideTitle: '캠프 안내사항',
    guideHint: '준비물 및 주의사항 등 캠프 참가에 필요한 상세 정보입니다.',
    roomTitle: '숙소 배정',
    roomHint: '이름과 전화번호를 입력하여 배정된 숙소를 확인하세요.',
    nameLabel: '이름',
    namePlaceholder: '예: 홍길동',
    phoneLabel: '전화번호',
    phonePlaceholder: '010-0000-0000',
    submitBtn: '숙소 확인하기',
    checkingBtn: '확인 중...',
    successMessage: (name: string) => `${name}님의 숙소가 배정되었습니다.`,
    errorMessage: '일치하는 정보가 없습니다. 이름과 전화번호를 다시 확인해주세요.',
    day1Room: '첫째날 방',
    day2Room: '둘째날 방',
    swipeHint: '옆으로 스와이프 하세요 ↔',
  },
  en: {
    navSchedule: 'Schedule',
    navStructure: 'Layout',
    navLocation: 'Directions',
    navGuide: 'Information',
    navRoom: 'Room Assignment',
    title: '2026 Gathering',
    subtitle: 'Have a blessed time!',
    scheduleTitle: 'Schedule',
    scheduleHint: 'Click on the image to view the enlarged version. Swipe left or right if there are multiple images.',
    structureTitle: 'Layout',
    locationTitle: 'Directions',
    locationHint: 'Directions to the campsite. Please check the shuttle bus boarding location.',
    guideTitle: 'Information',
    guideHint: 'Detailed information for camp participation, including checklist and precautions.',
    roomTitle: 'Room Assignment',
    roomHint: 'Enter your name and phone number to check your assigned accommodation.',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. Gildong Hong',
    phoneLabel: 'Phone Number',
    phonePlaceholder: '010-0000-0000',
    submitBtn: 'Check Accommodation',
    checkingBtn: 'Checking...',
    successMessage: (name: string) => `Room assigned for ${name}.`,
    errorMessage: 'No matching records found. Please check your name and phone number again.',
    day1Room: 'Day 1 Room',
    day2Room: 'Day 2 Room',
    swipeHint: 'Swipe sideways ↔',
  }
};

const SECTION_IMAGES = {
  schedule: [
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop",
  ],
  structure: [
    "https://images.unsplash.com/photo-1565031491910-e57fac031c41?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop",
  ],
  location: [
    "https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?q=80&w=1000&auto=format&fit=crop",
  ],
  guide: [
    "https://images.unsplash.com/photo-1533481405265-e9ce0c044abb?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=1000&auto=format&fit=crop",
  ]
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

  // TODO: Replace with the actual Google Sheet "Published to the web" CSV URL
  const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTItftdzN5m1B6Aoxn2FZviI10qa2nwVifXbuuXPwH-oB5-KTWlnTiGp5L68Q5eJwJEWUf4l3nDZNlP/pub?gid=869083155&single=true&output=csv';

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
            const parsedData: RoomData[] = results.data.map((row: any) => ({
              name: row['이름'] || row['name'] || '',
              phone: row['전화번호'] || row['phone'] || '',
              roomDay1: row['첫째날방'] || '',
              roomDay2: row['둘째날방'] || '',
            }));
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
    const sections = ['schedule', 'structure', 'location', 'guide', 'room'];
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
      const normalizedInputPhone = phoneInput.replace(/-/g, '');
      const normalizedInputName = nameInput.trim();

      const found = roomData.find(item => {
        const itemPhone = item.phone.replace(/-/g, '');
        return item.name === normalizedInputName && itemPhone === normalizedInputPhone;
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
              className={`nav-item ${activeSection === 'structure' ? 'active' : ''}`}
              onClick={() => scrollToSection('structure')}
            >
              {TRANSLATIONS[language].navStructure}
            </li>
            <li
              className={`nav-item ${activeSection === 'location' ? 'active' : ''}`}
              onClick={() => scrollToSection('location')}
            >
              {TRANSLATIONS[language].navLocation}
            </li>
            <li
              className={`nav-item ${activeSection === 'guide' ? 'active' : ''}`}
              onClick={() => scrollToSection('guide')}
            >
              {TRANSLATIONS[language].navGuide}
            </li>
            <li
              className={`nav-item ${activeSection === 'room' ? 'active' : ''}`}
              onClick={() => scrollToSection('room')}
            >
              {TRANSLATIONS[language].navRoom}
            </li>
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
            {SECTION_IMAGES.schedule.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`${TRANSLATIONS[language].scheduleTitle} ${idx + 1}`}
                className="section-image"
                onClick={() => openLightbox(SECTION_IMAGES.schedule, idx)}
              />
            ))}
          </div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            {TRANSLATIONS[language].scheduleHint}
          </p>
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

        {/* Location Section */}
        <section id="location" className="section">
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
        </section>

        {/* Guide Section */}
        <section id="guide" className="section">
          <h2 className="section-title">
            <Info size={24} color="var(--primary-color)" /> {TRANSLATIONS[language].guideTitle}
          </h2>
          <div className="section-gallery">
            {SECTION_IMAGES.guide.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`${TRANSLATIONS[language].guideTitle} ${idx + 1}`}
                className="section-image"
                onClick={() => openLightbox(SECTION_IMAGES.guide, idx)}
              />
            ))}
          </div>
          <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>
            {TRANSLATIONS[language].guideHint}
          </p>
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
                  </div>
                  <div style={{ flex: 1, padding: '1rem', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      {TRANSLATIONS[language].day2Room}
                    </div>
                    <div className="room-number">{searchResult.roomDay2 || '-'}</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
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

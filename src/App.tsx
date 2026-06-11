import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Calendar, MapPin, Info, Search, Home } from 'lucide-react';
import './index.css';

// Type definition for Room Data
interface RoomData {
  name: string;
  phone: string;
  room: string;
}

// Mock data to use if Google Sheets fetch fails or is not yet configured
const MOCK_DATA: RoomData[] = [
  { name: '홍길동', phone: '010-1234-5678', room: '101호' },
  { name: '김철수', phone: '010-9876-5432', room: '205호' },
  { name: '이영희', phone: '010-1111-2222', room: '303호' },
];

function App() {
  const [activeSection, setActiveSection] = useState('schedule');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [searchResult, setSearchResult] = useState<{ status: 'idle' | 'success' | 'error', message: string, room?: string }>({ status: 'idle', message: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [roomData, setRoomData] = useState<RoomData[]>([]);

  // TODO: Replace with the actual Google Sheet "Published to the web" CSV URL
  // To get this URL: File -> Share -> Publish to web -> Link -> select sheet and CSV -> Copy URL
  const GOOGLE_SHEET_CSV_URL = '';

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
            // Assuming the CSV columns are exactly "이름", "전화번호", "숙소"
            const parsedData: RoomData[] = results.data.map((row: any) => ({
              name: row['이름'] || row['name'] || '',
              phone: row['전화번호'] || row['phone'] || '',
              room: row['숙소'] || row['room'] || row['숙소배정'] || '',
            }));
            setRoomData(parsedData);
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
            setRoomData(MOCK_DATA); // Fallback
          }
        });
      } catch (e) {
        console.error("Failed to fetch Google Sheet data:", e);
        setRoomData(MOCK_DATA); // Fallback
      }
    };

    fetchSheetData();
  }, []);

  const handleScroll = () => {
    const sections = ['schedule', 'location', 'guide', 'room'];
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
    // Automatically format as 010-XXXX-XXXX
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
    setSearchResult({ status: 'idle', message: '' });

    // Simulate network delay for better UX feeling
    setTimeout(() => {
      // Very basic normalization for comparison
      const normalizedInputPhone = phoneInput.replace(/-/g, '');
      const normalizedInputName = nameInput.trim();

      const found = roomData.find(item => {
        const itemPhone = item.phone.replace(/-/g, '');
        return item.name === normalizedInputName && itemPhone === normalizedInputPhone;
      });

      if (found && found.room) {
        setSearchResult({
          status: 'success',
          message: `${found.name}님의 숙소가 배정되었습니다.`,
          room: found.room
        });
      } else {
        setSearchResult({
          status: 'error',
          message: '일치하는 정보가 없습니다. 이름과 전화번호를 다시 확인해주세요.'
        });
      }
      setIsLoading(false);
    }, 600);
  };

  return (
    <>
      <div className="bg-decoration-1" />
      <div className="bg-decoration-2" />
      
      {/* Navigation Bar */}
      <nav className="navbar">
        <ul className="nav-links">
          <li 
            className={`nav-item ${activeSection === 'schedule' ? 'active' : ''}`}
            onClick={() => scrollToSection('schedule')}
          >
            일정안내
          </li>
          <li 
            className={`nav-item ${activeSection === 'location' ? 'active' : ''}`}
            onClick={() => scrollToSection('location')}
          >
            오시는길
          </li>
          <li 
            className={`nav-item ${activeSection === 'guide' ? 'active' : ''}`}
            onClick={() => scrollToSection('guide')}
          >
            캠프안내
          </li>
          <li 
            className={`nav-item ${activeSection === 'room' ? 'active' : ''}`}
            onClick={() => scrollToSection('room')}
          >
            숙소배정
          </li>
        </ul>
      </nav>

      <main className="container">
        <header className="page-header">
          <h1 className="page-title">2026 썸머 캠프</h1>
          <p className="page-subtitle">2박 3일간의 특별한 여정에 오신 것을 환영합니다</p>
        </header>

        {/* Schedule Section */}
        <section id="schedule" className="section">
          <h2 className="section-title"><Calendar size={24} color="var(--primary-color)"/> 일정 안내</h2>
          {/* Dummy Image from picsum for beautiful placeholders */}
          <img 
            src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000&auto=format&fit=crop" 
            alt="일정표 이미지" 
            className="section-image"
          />
          <p style={{marginTop: '1rem', color: 'var(--text-secondary)'}}>
            전체 일정표입니다. 이미지를 클릭하시면 확대하여 보실 수 있습니다.
          </p>
        </section>

        {/* Location Section */}
        <section id="location" className="section">
          <h2 className="section-title"><MapPin size={24} color="var(--primary-color)"/> 오시는 길</h2>
          <img 
            src="https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?q=80&w=1000&auto=format&fit=crop" 
            alt="오시는 길 지도 이미지" 
            className="section-image"
          />
          <p style={{marginTop: '1rem', color: 'var(--text-secondary)'}}>
            캠프장 오시는 길 안내입니다. 셔틀버스 탑승 위치도 확인해주세요.
          </p>
        </section>

        {/* Guide Section */}
        <section id="guide" className="section">
          <h2 className="section-title"><Info size={24} color="var(--primary-color)"/> 캠프 안내사항</h2>
          <img 
            src="https://images.unsplash.com/photo-1533481405265-e9ce0c044abb?q=80&w=1000&auto=format&fit=crop" 
            alt="캠프 안내 이미지" 
            className="section-image"
          />
          <p style={{marginTop: '1rem', color: 'var(--text-secondary)'}}>
            준비물 및 주의사항 등 캠프 참가에 필요한 상세 정보입니다.
          </p>
        </section>

        {/* Room Assignment Section */}
        <section id="room" className="section">
          <h2 className="section-title"><Home size={24} color="var(--primary-color)"/> 개인 숙소 배정 확인</h2>
          <p style={{marginBottom: '1.5rem', color: 'var(--text-secondary)'}}>
            이름과 전화번호를 입력하여 배정된 숙소를 확인하세요.
          </p>
          
          <form className="room-form" onSubmit={handleSearchRoom}>
            <div className="input-group">
              <label htmlFor="name" className="input-label">이름</label>
              <input 
                type="text" 
                id="name" 
                className="input-field" 
                placeholder="예: 홍길동"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
              />
            </div>
            
            <div className="input-group">
              <label htmlFor="phone" className="input-label">전화번호</label>
              <input 
                type="tel" 
                id="phone" 
                className="input-field" 
                placeholder="010-0000-0000"
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
              {isLoading ? '확인 중...' : '숙소 확인하기'} <Search size={18} style={{display: 'inline', verticalAlign: 'text-bottom', marginLeft: '4px'}}/>
            </button>
          </form>

          {/* Result Display */}
          {searchResult.status !== 'idle' && (
            <div className={`result-card ${searchResult.status}`}>
              <p>{searchResult.message}</p>
              {searchResult.status === 'success' && searchResult.room && (
                <div className="room-number">{searchResult.room}</div>
              )}
            </div>
          )}
          
          <div style={{marginTop: '2rem', padding: '1rem', background: '#F1F5F9', borderRadius: '8px', fontSize: '0.85rem', color: '#64748B'}}>
            <strong>💡 구글 시트 연동 안내 (관리자용)</strong><br/>
            현재는 테스트 데이터가 적용되어 있습니다. (테스트: 홍길동 / 010-1234-5678)<br/>
            실제 연동을 위해서는 App.tsx 파일의 GOOGLE_SHEET_CSV_URL 변수에 구글 시트 CSV 게시 링크를 입력해주세요.<br/>
            [시트 양식: 첫 줄에 '이름', '전화번호', '숙소' 열 필수]
          </div>
        </section>

      </main>
    </>
  );
}

export default App;

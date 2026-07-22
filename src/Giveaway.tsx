import { FormEvent, useState } from 'react';
import { ArrowUpRight, Check, Instagram } from 'lucide-react';
import './giveaway.css';

const LINKS = {
  marmoo: 'https://www.instagram.com/marmoo.bistro/',
  perla: 'https://www.instagram.com/perlahelsa/',
  post: 'https://www.instagram.com/',
};

export default function Giveaway() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [instagram, setInstagram] = useState('');
  const [agreement, setAgreement] = useState(false);
  const [participantId, setParticipantId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Вкажіть ваше ім’я.');
      return;
    }

    if (phone.replace(/\D/g, '').length < 9) {
      setError('Перевірте номер телефону.');
      return;
    }

    if (instagram.trim().replace('@', '').length < 2) {
      setError('Вкажіть Instagram.');
      return;
    }

    if (!agreement) {
      setError('Потрібна згода з правилами участі.');
      return;
    }

    const savedNumber = Number(
      localStorage.getItem('marmoo-perla-counter') || '0',
    );

    const nextNumber = savedNumber + 1;
    localStorage.setItem('marmoo-perla-counter', String(nextNumber));

    setParticipantId(`MP-${String(nextNumber).padStart(4, '0')}`);
  };

  if (participantId) {
    return (
      <main className="gw-page gw-center">
        <section className="gw-card gw-success">
          <div className="gw-check">
            <Check size={30} />
          </div>

          <p className="gw-label">MARMOO × PERLA HELSA</p>
          <h1>Ви зареєстровані</h1>
          <p>Збережіть свій номер учасника.</p>

          <div className="gw-ticket">
            <span>Ваш номер</span>
            <strong>{participantId}</strong>
          </div>

          <a
            className="gw-main-button"
            href={LINKS.post}
            target="_blank"
            rel="noreferrer"
          >
            Відкрити допис
            <ArrowUpRight size={18} />
          </a>
        </section>
      </main>
    );
  }

  return (
    <main className="gw-page">
      <div className="gw-shell">
        <header className="gw-header">
          <strong>MARMOO</strong>
          <span>×</span>
          <strong>PERLA HELSA</strong>
        </header>

        <section className="gw-hero">
          <p className="gw-label">WORLD SELF-CARE DAY</p>

          <h1>
            Вечір турботи
            <br />
            про себе
          </h1>

          <p className="gw-description">
            Камерний вечір MARMOO × Perla Helsa: prosecco, DJ-сет,
            високобілкові страви та розмова про щоденну турботу про себе.
          </p>

          <div className="gw-details">
            <div>
              <span>Дата</span>
              <strong>24 липня</strong>
            </div>

            <div>
              <span>Початок</span>
              <strong>18:30</strong>
            </div>

            <div className="gw-wide">
              <span>Місце</span>
              <strong>Велика Васильківська, 57/3</strong>
            </div>
          </div>

          <a className="gw-main-button" href="#registration">
            Взяти участь
          </a>
        </section>

        <section className="gw-section">
          <p className="gw-label">УМОВИ УЧАСТІ</p>
          <h2>Три прості кроки</h2>

          <a
            className="gw-action"
            href={LINKS.marmoo}
            target="_blank"
            rel="noreferrer"
          >
            <span>01</span>
            <div>
              <small>Підписатися</small>
              <strong>@marmoo.bistro</strong>
            </div>
            <Instagram size={20} />
          </a>

          <a
            className="gw-action"
            href={LINKS.perla}
            target="_blank"
            rel="noreferrer"
          >
            <span>02</span>
            <div>
              <small>Підписатися</small>
              <strong>@perlahelsa</strong>
            </div>
            <Instagram size={20} />
          </a>

          <a
            className="gw-action"
            href={LINKS.post}
            target="_blank"
            rel="noreferrer"
          >
            <span>03</span>
            <div>
              <small>Відкрити допис</small>
              <strong>Залишити коментар</strong>
            </div>
            <ArrowUpRight size={20} />
          </a>
        </section>

        <section className="gw-section gw-form-section" id="registration">
          <p className="gw-label">РЕЄСТРАЦІЯ</p>
          <h2>Залиште свої дані</h2>

          <form className="gw-form" onSubmit={handleSubmit}>
            <label>
              <span>Ім’я</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ваше ім’я"
              />
            </label>

            <label>
              <span>Телефон</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+380"
              />
            </label>

            <label>
              <span>Instagram</span>
              <input
                value={instagram}
                onChange={(event) => setInstagram(event.target.value)}
                placeholder="@username"
              />
            </label>

            <label className="gw-agreement">
              <input
                type="checkbox"
                checked={agreement}
                onChange={(event) => setAgreement(event.target.checked)}
              />
              <span>
                Погоджуюсь із правилами участі та обробкою персональних
                даних.
              </span>
            </label>

            {error && <div className="gw-error">{error}</div>}

            <button className="gw-main-button" type="submit">
              Зареєструватися
            </button>
          </form>
        </section>

        <footer className="gw-footer">
          MARMOO × Perla Helsa · Kyiv · 2026
        </footer>
      </div>
    </main>
  );
}

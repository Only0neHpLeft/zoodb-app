import { useEffect, useState } from 'react';
import { ScratchCard } from '@/components/scratch-card';
import { type CertificateData, type SqlRank, formatTime, formatDate } from '@/lib/certificate';
import { useLanguage } from '@/contexts/language-context';

interface CertificateViewProps {
  data: CertificateData;
  rank: SqlRank;
  exportMode?: boolean;
  onScratchReveal?: () => void;
}

const GOLD = '#C8A951';
const NAVY = '#1B2A4A';
const CREAM = '#FDFBF5';

export function loadCertificateFonts(): Promise<void> {
  const id = 'certificate-fonts';
  if (!document.getElementById(id)) {
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap';
    document.head.appendChild(link);
  }
  return document.fonts.ready.then(() => {});
}

function CornerOrnament({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const rotate =
    position === 'tl' ? 0 : position === 'tr' ? 90 : position === 'bl' ? 270 : 180;
  const posStyle: React.CSSProperties =
    position === 'tl'
      ? { top: 16, left: 16 }
      : position === 'tr'
        ? { top: 16, right: 16 }
        : position === 'bl'
          ? { bottom: 16, left: 16 }
          : { bottom: 16, right: 16 };

  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      style={{ position: 'absolute', ...posStyle, transform: `rotate(${rotate}deg)` }}
    >
      <path d="M0 0 L36 0 L36 4 L4 4 L4 36 L0 36 Z" fill={GOLD} />
      <path d="M8 0 L12 0 L12 8 L0 8 L0 4 L8 4 Z" fill={GOLD} opacity={0.5} />
    </svg>
  );
}

function ZooDBSeal() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" stroke={GOLD} strokeWidth="2" fill="none" />
      <circle cx="32" cy="32" r="26" stroke={GOLD} strokeWidth="1" fill="none" opacity={0.5} />
      <polygon
        points="32,14 35,24 46,24 37,30 40,40 32,34 24,40 27,30 18,24 29,24"
        fill={GOLD}
      />
      <text
        x="32"
        y="54"
        textAnchor="middle"
        fill={GOLD}
        style={{ fontSize: 9, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700 }}
      >
        ZooDB
      </text>
    </svg>
  );
}

export function CertificateView({
  data,
  rank,
  exportMode = false,
  onScratchReveal,
}: CertificateViewProps) {
  const { t } = useLanguage();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const isEn = data.language === 'en';

  useEffect(() => {
    loadCertificateFonts().then(() => setFontsLoaded(true));
  }, []);

  const rankTitle = isEn ? rank.en : rank.cz;
  const completionText = isEn
    ? `For completing ${data.completedTasks} of ${data.totalTasks} tasks on the ZooDB SQL Learning Platform with a ${data.completionRate.toFixed(1)}% completion rate, investing ${formatTime(data.totalTimeSeconds)} of dedicated practice.`
    : `Za dokončení ${data.completedTasks} z ${data.totalTasks} úkolů na platformě ZooDB pro výuku SQL s ${data.completionRate.toFixed(1)}% mírou dokončení a ${formatTime(data.totalTimeSeconds)} věnovaného cvičení.`;

  const fontFamily = fontsLoaded
    ? "'Playfair Display', Georgia, serif"
    : 'Georgia, serif';
  const scriptFont = fontsLoaded
    ? "'Great Vibes', cursive"
    : 'cursive';

  return (
    <div
      data-certificate
      style={{
        width: 900,
        minHeight: 640,
        background: CREAM,
        position: 'relative',
        padding: 0,
        fontFamily,
        color: NAVY,
        overflow: 'hidden',
      }}
    >
      {/* Outer border */}
      <div
        style={{
          position: 'absolute',
          inset: 8,
          border: `3px solid ${GOLD}`,
          pointerEvents: 'none',
        }}
      />
      {/* Inner border */}
      <div
        style={{
          position: 'absolute',
          inset: 16,
          border: `1px solid rgba(200,169,81,0.4)`,
          pointerEvents: 'none',
        }}
      />

      {/* Corner ornaments */}
      <CornerOrnament position="tl" />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />
      <CornerOrnament position="br" />

      {/* Content */}
      <div
        style={{
          padding: '48px 60px 40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0,
        }}
      >
        {/* Header */}
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: '0.3em',
            color: NAVY,
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          {t.certificate.headerLabel}
        </div>

        {/* Subheader */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 400,
            letterSpacing: '0.25em',
            color: GOLD,
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          {t.certificate.mainTitle}
        </div>

        {/* Decorative divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 120,
              height: 1,
              background: `linear-gradient(to right, transparent, ${GOLD})`,
            }}
          />
          <div
            style={{
              width: 8,
              height: 8,
              background: GOLD,
              transform: 'rotate(45deg)',
            }}
          />
          <div
            style={{
              width: 120,
              height: 1,
              background: `linear-gradient(to left, transparent, ${GOLD})`,
            }}
          />
        </div>

        {/* Presented to */}
        <div
          style={{
            fontSize: 13,
            color: '#888888',
            fontStyle: 'italic',
            marginBottom: 8,
          }}
        >
          {t.certificate.presentedTo}
        </div>

        {/* Student name */}
        <div
          style={{
            fontFamily: scriptFont,
            fontSize: 48,
            color: GOLD,
            marginBottom: 4,
            lineHeight: 1.2,
          }}
        >
          {data.userName}
        </div>

        {/* Name underline */}
        <div
          style={{
            width: 300,
            height: 1,
            background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`,
            marginBottom: 20,
          }}
        />

        {/* Completion text */}
        <div
          style={{
            fontSize: 13,
            color: '#555555',
            textAlign: 'center',
            maxWidth: 600,
            lineHeight: 1.7,
            marginBottom: 24,
          }}
        >
          {completionText}
        </div>

        {/* Rank label */}
        <div
          style={{
            fontSize: 11,
            color: '#888888',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {t.certificate.rankLabel}
        </div>

        {/* Scratch card / Rank badge */}
        <ScratchCard
          width={220}
          height={56}
          disabled={exportMode}
          onReveal={onScratchReveal}
          scratchText={t.certificate.scratchHere}
        >
          <div
            style={{
              width: 220,
              height: 56,
              background: `linear-gradient(135deg, ${GOLD}, #D4B96A)`,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontFamily: fontFamily,
                fontSize: 18,
                fontWeight: 700,
                color: '#FFFFFF',
                letterSpacing: '0.05em',
              }}
            >
              {rankTitle}
            </span>
          </div>
        </ScratchCard>

        {/* Bottom section: seal + footer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            width: '100%',
            marginTop: 32,
          }}
        >
          {/* Signature */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div
              style={{
                width: 160,
                height: 1,
                background: GOLD,
                margin: '0 auto 6px',
              }}
            />
            <div style={{ fontSize: 11, color: '#888888' }}>{t.certificate.signature}</div>
          </div>

          {/* Seal */}
          <div style={{ flex: 0, margin: '0 32px' }}>
            <ZooDBSeal />
          </div>

          {/* Date */}
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div
              style={{
                width: 160,
                height: 1,
                background: GOLD,
                margin: '0 auto 6px',
              }}
            />
            <div style={{ fontSize: 11, color: '#888888' }}>{formatDate(data.language)}</div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            fontSize: 10,
            color: '#AAAAAA',
            fontStyle: 'italic',
            marginTop: 16,
            textAlign: 'center',
          }}
        >
          {t.certificate.footer}
        </div>
      </div>
    </div>
  );
}

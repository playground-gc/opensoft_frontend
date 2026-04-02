import React, { useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { useTutorialStore } from '../../store';

// Keep tour styling aligned with the app's dark terminal palette.
const TOUR_COLORS = {
  surface: 'rgba(8, 8, 8, 0.94)',
  surfaceRaised: 'rgba(14, 14, 14, 0.50)',
  backdropFilter: 'blur(12px)',
  border: 'rgba(255, 69, 0, 0.2)',
  text: '#f0f2fc',
  muted: '#9aa3bf',
  accent: '#ff4500',
  accentText: '#140b08',
  overlay: 'rgba(0, 0, 0, 0.72)',
};

const TOUR_STEPS = [
  {
    target: 'body',
    placement: 'center',
    title: 'Welcome to Synthetic Bull!',
    content: 'Let us take a quick tour to show you where everything is. You can replay this anytime by clicking the Help icon in the header.',
    disableBeacon: true,
  },
  {
    target: '#tour-market-watch',
    title: 'Market Watch',
    content: 'Here you can see the latest prices. Click the Pin icon to keep a stock at the top, or click the Plus icon to compare it against your main chart.',
    placement: 'left',
  },
  {
    target: '#tour-stats-bar',
    title: 'Active Symbol Stats',
    content: 'This bar shows the live 24-hour statistics for whichever asset you are currently trading.',
    placement: 'bottom',
  },
  {
    target: '#tour-order-book',
    title: 'Live Order Book',
    content: 'Track market depth in real time here. You can scroll down to see the full depth of standard Bids and Asks.',
    placement: 'right',
  },
  {
    target: '#tour-place-order',
    title: 'Place Orders',
    content: 'When you are ready, you can configure your Limit or Market orders here to enter the market!',
    placement: 'left',
  }
];

const TutorialTour = () => {
  const { runTutorial, tourKey, stopTutorial } = useTutorialStore();

  useEffect(() => {
    // Slight delay to ensure DOM id nodes are fully painted before Joyride parses them
    const timer = setTimeout(() => {
      const hasCompleted = localStorage.getItem('hasCompletedTutorial');
      if (!hasCompleted) {
        useTutorialStore.getState().startTutorial();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      stopTutorial();
      localStorage.setItem('hasCompletedTutorial', 'true');
    }
  };

  return (
    <>
      {runTutorial && (
        <Joyride
          key={tourKey}
          callback={handleJoyrideCallback}
          continuous
          hideCloseButton
          disableOverlayClose
          run={runTutorial}
          scrollToFirstStep={false}
          disableScrolling={true}
          showProgress
          showSkipButton
          steps={TOUR_STEPS}
          locale={{
            last: 'Got it!',
            skip: 'Skip Tour'
          }}
          styles={{
            options: {
              zIndex: 10000,
              primaryColor: TOUR_COLORS.accent,
              backgroundColor: TOUR_COLORS.surfaceRaised,
              textColor: TOUR_COLORS.text,
              overlayColor: TOUR_COLORS.overlay,
              arrowColor: TOUR_COLORS.surfaceRaised,
              width: Math.min(380, window.innerWidth - 32),
            },
            tooltip: {
              borderRadius: '10px',
              border: `1px solid ${TOUR_COLORS.border}`,
              backgroundColor: TOUR_COLORS.surfaceRaised,
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45), inset 0 0 20px rgba(255, 69, 0, 0.06)',
              padding: '20px',
              maxWidth: `${window.innerWidth - 32}px`,
              boxSizing: 'border-box',
            },
            tooltipContainer: {
              textAlign: 'left',
              lineHeight: '1.5',
              color: TOUR_COLORS.text,
            },
            tooltipTitle: {
              color: TOUR_COLORS.accent,
              fontWeight: 700,
              letterSpacing: '0.02em',
              marginBottom: '8px',
            },
            buttonNext: {
              background: 'linear-gradient(90deg, #ff4500, #f0b942)',
              border: `1px solid ${TOUR_COLORS.border}`,
              borderRadius: '6px',
              color: TOUR_COLORS.accentText,
              fontWeight: 700,
              padding: '8px 16px',
            },
            buttonBack: {
              backgroundColor: 'transparent',
              color: TOUR_COLORS.muted,
              marginRight: '10px',
            },
            buttonSkip: {
              backgroundColor: 'transparent',
              color: TOUR_COLORS.muted,
            },
          }}
        />
      )}
    </>
  );
};

export default TutorialTour;

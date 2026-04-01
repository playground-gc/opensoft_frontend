import React, { useEffect } from 'react';
import { Joyride, STATUS } from 'react-joyride';
import { useTutorialStore } from '../../store';

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
              primaryColor: '#0ECB81',
              backgroundColor: '#1E2329',
              textColor: '#eaecef',
              overlayColor: 'rgba(0, 0, 0, 0.65)',
              arrowColor: '#1E2329',
              width: Math.min(380, window.innerWidth - 32),
            },
            tooltip: {
              borderRadius: '8px',
              padding: '20px',
              maxWidth: `${window.innerWidth - 32}px`,
              boxSizing: 'border-box',
            },
            tooltipContainer: {
              textAlign: 'left',
              lineHeight: '1.5'
            },
            buttonNext: {
              backgroundColor: '#0ECB81',
              borderRadius: '4px',
              color: '#1E2329',
              fontWeight: 'bold',
              padding: '8px 16px'
            },
            buttonBack: {
              color: '#848e9c',
              marginRight: '10px'
            },
            buttonSkip: {
              color: '#848e9c',
            }
          }}
        />
      )}
    </>
  );
};

export default TutorialTour;

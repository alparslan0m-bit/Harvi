/**
 * Animation Utilities
 * Device-aware animations optimized for performance across mobile and desktop
 */

function triggerConfetti() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
    
    const particleCount = isIOS ? 30 : (isMobile ? 50 : 100);
    const spread = isIOS ? 45 : (isMobile ? 60 : 70);
    const ticks = isIOS ? 100 : (isMobile ? 150 : 200);
    const scalar = isIOS ? 0.8 : (isMobile ? 1.0 : 1.2);
    
    requestAnimationFrame(() => {
        confetti({
            particleCount: particleCount,
            spread: spread,
            origin: { y: 0.6 },
            colors: ['#6366F1', '#8B5CF6', '#4ADE80', '#34D399'],
            ticks: ticks,
            scalar: scalar,
            shapes: isIOS ? ['circle'] : ['circle', 'square'],
            gravity: isIOS ? 0.8 : (isMobile ? 1.0 : 1.2),
            decay: isIOS ? 0.9 : (isMobile ? 0.92 : 0.94),
            drift: 0,
            startVelocity: isIOS ? 20 : (isMobile ? 25 : 30),
            disableForReducedMotion: false,
            useWorker: true
        });
    });
}

function triggerSuccessMicroAnimation(element) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    element.style.transform = 'translateZ(0)';
    element.style.webkitTransform = 'translateZ(0)';
    element.style.willChange = 'transform';
    
    if (isMobile) {
        element.classList.add('mobile-success-animation');
    }
    
    element.classList.add('success-pop');
    
    requestAnimationFrame(() => {
        setTimeout(() => {
            element.classList.remove('success-pop', 'mobile-success-animation');
            element.style.willChange = 'auto';
        }, 500);
    });
}

function celebrateCorrectAnswer(element) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    element.classList.add('hardware-accelerated', 'smooth-animation');
    
    if (isMobile) {
        element.classList.add('mobile-celebration');
    }
    
    triggerSuccessMicroAnimation(element);
    
    const particleCount = isIOS ? 15 : (isMobile ? 25 : 30);
    const spread = isIOS ? 35 : (isMobile ? 40 : 50);
    const ticks = isIOS ? 60 : (isMobile ? 80 : 100);
    
    requestAnimationFrame(() => {
        confetti({
            particleCount: particleCount,
            spread: spread,
            origin: { y: 0.8 },
            colors: ['#4ADE80', '#34D399'],
            ticks: ticks,
            disableForReducedMotion: false,
            scalar: isIOS ? 0.7 : (isMobile ? 0.8 : 1),
            useWorker: true
        });
    });
    
    setTimeout(() => {
        element.classList.remove('hardware-accelerated', 'smooth-animation', 'mobile-celebration');
    }, 1000);
}

function celebrateQuizCompletion(score, totalQuestions) {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    requestAnimationFrame(() => {
        confetti({
            particleCount: isIOS ? 50 : (isMobile ? 75 : 100),
            spread: isIOS ? 55 : (isMobile ? 65 : 70),
            origin: { y: 0.6 },
            colors: ['#6366F1', '#8B5CF6', '#4ADE80'],
            ticks: isIOS ? 150 : (isMobile ? 175 : 200),
            useWorker: true
        });
    });
}

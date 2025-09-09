// Function to trigger confetti with iOS optimizations
function triggerConfetti() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    confetti({
        particleCount: isIOS ? 50 : 100, // Reduce particles on iOS
        spread: isIOS ? 55 : 70,
        origin: { y: 0.6 },
        colors: ['#6366F1', '#8B5CF6', '#4ADE80', '#34D399'],
        ticks: isIOS ? 150 : 200,
        scalar: isIOS ? 1.0 : 1.2, // Reduce scale on iOS
        shapes: ['circle'], // Only circles on iOS for better performance
        gravity: isIOS ? 1.0 : 1.2,
        decay: isIOS ? 0.91 : 0.94,
        drift: 0,
        startVelocity: isIOS ? 25 : 30,
        disableForReducedMotion: false // Ensure it works on iOS
    });
}

// Function to trigger success micro animation with iOS improvements
function triggerSuccessMicroAnimation(element) {
    // Force GPU acceleration for smoother animations on iOS
    element.style.transform = 'translateZ(0)';
    element.style.webkitTransform = 'translateZ(0)';
    
    element.classList.add('success-pop');
    
    // Use requestAnimationFrame for smoother animation removal
    requestAnimationFrame(() => {
        setTimeout(() => {
            element.classList.remove('success-pop');
        }, 500);
    });
}

// Function to celebrate correct answer with iOS optimizations
function celebrateCorrectAnswer(element) {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // Add hardware acceleration classes for iOS
    element.classList.add('hardware-accelerated', 'smooth-animation');
    
    // Add success visual feedback
    triggerSuccessMicroAnimation(element);
    
    // Small confetti burst optimized for iOS
    confetti({
        particleCount: isIOS ? 20 : 30,
        spread: isIOS ? 40 : 50,
        origin: { y: 0.8 },
        colors: ['#4ADE80', '#34D399'],
        ticks: isIOS ? 80 : 100,
        disableForReducedMotion: false,
        scalar: isIOS ? 0.8 : 1
    });
    
    // Clean up classes after animation
    setTimeout(() => {
        element.classList.remove('hardware-accelerated', 'smooth-animation');
    }, 1000);
}

// Function for quiz completion celebration
function celebrateQuizCompletion(score, totalQuestions) {
    const successRate = score / totalQuestions;
    
    // Different celebrations based on performance
    if (successRate >= 0.8) { // 80% or better
        // Grand celebration
        const duration = 3000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 7,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#6366F1', '#8B5CF6', '#4ADE80']
            });
            confetti({
                particleCount: 7,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#6366F1', '#8B5CF6', '#4ADE80']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        }());
    } else if (successRate >= 0.6) { // 60% or better
        // Medium celebration
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#6366F1', '#8B5CF6', '#4ADE80'],
            ticks: 200
        });
    } else {
        // Small celebration for completion
        confetti({
            particleCount: 50,
            spread: 50,
            origin: { y: 0.7 },
            colors: ['#6366F1', '#8B5CF6'],
            ticks: 100
        });
    }
}

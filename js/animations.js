// Function to trigger confetti
function triggerConfetti() {
    confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366F1', '#8B5CF6', '#4ADE80', '#34D399'],
        ticks: 200,
        scalar: 1.2,
        shapes: ['circle', 'square'],
        gravity: 1.2,
        decay: 0.94,
        drift: 0,
        startVelocity: 30,
    });
}

// Function to trigger success micro animation
function triggerSuccessMicroAnimation(element) {
    element.classList.add('success-pop');
    setTimeout(() => {
        element.classList.remove('success-pop');
    }, 500);
}

// Function to celebrate correct answer
function celebrateCorrectAnswer(element) {
    // Add success visual feedback
    triggerSuccessMicroAnimation(element);
    
    // Small confetti burst for individual correct answers
    confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#4ADE80', '#34D399'],
        ticks: 100
    });
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

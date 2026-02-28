// Initialize Lenis for smooth scrolling
const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
    direction: 'vertical',
    gestureDirection: 'vertical',
    smooth: true,
    mouseMultiplier: 1,
    smoothTouch: false,
    touchMultiplier: 2,
    infinite: false,
});

function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Setup GSAP to work with Lenis
gsap.registerPlugin(ScrollTrigger);

// Hero Animation
const heroTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

heroTimeline
    .to('.hero-content', { opacity: 1, scale: 1, duration: 1.5 }, 0.2)
    .to('.hero-cloud-1', { opacity: 1, duration: 2 }, 0)
    .to('.hero-cloud-2', { opacity: 1, duration: 2 }, 0);


// Generic Staggered Text Reveal
const initStaggeredText = () => {
    const textBlocks = document.querySelectorAll('.stagger-text');
    
    textBlocks.forEach(block => {
        // Split text by words for reveal
        const text = block.innerText;
        block.innerHTML = '';
        const words = text.split(' ');
        
        words.forEach((word) => {
            const span = document.createElement('span');
            span.innerHTML = word + '&nbsp;';
            span.className = 'feat-word inline-block opacity-0 translate-y-[20px]';
            block.appendChild(span);
        });

        gsap.to(block.querySelectorAll('.feat-word'), {
            scrollTrigger: {
                trigger: block,
                start: 'top 85%',
            },
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.05,
            ease: 'power3.out'
        });
    });
};

// "Why Reasonal" Floating Icons Parallax
const initFloatingIcons = () => {
    const icons = document.querySelectorAll('.why-image');
    
    gsap.fromTo(icons, 
        { opacity: 0, scale: 0.75, y: 50 },
        {
            scrollTrigger: {
                trigger: '#about',
                start: 'top 70%',
            },
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1.2,
            stagger: 0.1,
            ease: 'back.out(1.5)'
        }
    );
};

// Parallax scroll effect for specific elements
const initParallax = () => {
    gsap.utils.toArray('.parallax-image').forEach(img => {
        gsap.to(img, {
            scrollTrigger: {
                trigger: img.parentElement,
                scrub: true,
                start: 'top bottom',
                end: 'bottom top'
            },
            y: '20%',
            ease: 'none'
        });
    });
};


// Initialization
window.addEventListener('load', () => {
    initStaggeredText();
    initFloatingIcons();
    initParallax();
});

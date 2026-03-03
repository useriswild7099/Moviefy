import { useState, useEffect, useRef } from 'react'
import './App.css'
import { ARTICLES } from './data/articles.js'
import { extractText, parseResume } from './utils/parser'
import { generateRecommendations } from './utils/recommender'
import { buildProfileFromPrompt, getSkillsForIndustry, VIBE_OPTIONS, CAREER_STAGES, INDUSTRIES } from './utils/promptBuilder'

const LOADING_QUOTES = [
  "If your content is rotting your brain, it's time for a digital diet.",
  "Content is food for the mind. Stop eating out of the digital dumpster.",
  "We serve Michelin-star knowledge, not fast-food brain rot.",
  "I survived the era of brain-rot content, and all I got was this sudden urge to actually learn something.",
  "Your brain has hundreds of tabs open; let's finally fill them with something useful.",
  "Why watch a ten-part series on a fictional disaster when you can learn to prevent your own financial one?",
  "Unsubscribe from the mindless. Subscribe to the mindful.",
  "If you're going to be a couch potato, at least be a highly educated one.",
  "Stop giving your screen time to people who aren't paying your bills.",
  "Less 'What did I just watch?' and more 'What am I going to build?'",
  "Yes, I watched 8 hours of video today. Yes, I'm putting it on my resume.",
  "Binge-watching: because Rome wasn't built in a day, but you can learn how they did it in a weekend.",
  "Finally, a way to tell your parents you were 'studying' and actually mean it.",
  "Warning: Bingeing our content may result in sudden career advancement and uncharacteristic ambition.",
  "It's not 'wasting time on a screen,' it's 'strategic incubation'.",
  "Go down the rabbit hole, but make sure it leads to a corner office.",
  "The only cliffhanger here is whether you'll ask for a 15% or 20% raise tomorrow.",
  "Popcorn? Check. Blanket? Check. Actionable career strategies? Check.",
  "You are what you binge.",
  "Binge-watch like a CEO, not a zombie.",
  "Our algorithm doesn't want you to just stare at a screen; it wants you to soar.",
  "Personalized content: because you're too unique for basic internet trash.",
  "We bypassed the 'For You' page and created the 'For Your Future' page.",
  "An algorithm so smart, it knows what you need to learn before your boss does.",
  "Stop letting a random number generator dictate your brain chemistry.",
  "Imagine if your feed actually liked you. That's what we built.",
  "Tailored content. Because one-size-fits-all is only good for ponchos.",
  "Your algorithm should be a mentor, not a distraction.",
  "My algorithm finally realized I want a promotion, not another cat video.",
  "We curate your feed so you don't have to curate a boring life.",
  "Manifesting is just binge-watching the right tutorials until it becomes reality.",
  "Don't just go with the flow. Learn to build the boat and direct the river.",
  "Crystal healing is cool, but have you tried manifesting through aggressive skill-building?",
  "Watch your way into a better tax bracket.",
  "Directionless scrolling is a cardio workout for your thumbs and a sedative for your dreams.",
  "Get off the digital treadmill and step onto the digital escalator.",
  "If your content doesn't give you a sense of direction, you're just a digital nomad without a map.",
  "Vision boards are nice, but a personalized, educational queue is faster.",
  "We provide the compass; you just provide the snacks.",
  "Manifesting your dream life, one strategically chosen episode at a time.",
  "Why learn from your mistakes when you can binge-watch someone else's solutions?",
  "If knowledge is power, our platform is a nuclear reactor in your living room.",
  "Turn your downtime into up-time.",
  "We are the sworn enemy of the phrase 'I have nothing to watch'.",
  "Your couch is calling, and it wants you to get a promotion.",
  "Procrastinate productively.",
  "Because 'I saw it in a web series' shouldn't be your excuse, it should be your competitive advantage.",
  "Cancel your plans. We've got your future to build.",
  "Watch what you want, but make sure it pays you back.",
  "Binge responsibly. Build relentlessly."
];

function App() {

  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingQuote, setLoadingQuote] = useState("")
  const [profile, setProfile] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [error, setError] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const [activeArticle, setActiveArticle] = useState(null)
  const [readingProgress, setReadingProgress] = useState(0)
  const [currentView, setCurrentView] = useState('home')

  // Pathway Mode Tracking (null = Menu, 'upload', 'text', 'quiz', 'wizard')
  const [activePathway, setActivePathway] = useState(null)
  
  // Pathway D: Wizard State
  const [wizardStep, setWizardStep] = useState(0)
  const [wizardData, setWizardData] = useState({
    jobTitle: '',
    industry: '',
    careerStage: '',
    selectedSkills: [],
    vibe: '',
    mood: '', // new mood step
  })
  const [availableSkills, setAvailableSkills] = useState([])
  

  const lenisRef = useRef(null)

  // Fix: Restore body overflow when article modal closes or component unmounts
  useEffect(() => {
    return () => { document.body.style.overflow = ''; };
  }, [activeArticle]);

  useEffect(() => {
    // Initialize Lenis for smooth scrolling
    if (!window.Lenis) {
      console.warn('[App] Lenis not loaded — smooth scrolling disabled.');
      return;
    }
    lenisRef.current = new window.Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), 
        direction: 'vertical',
        gestureDirection: 'vertical',
        smooth: true,
    });

    // Fix: Store RAF ID so we can cancel it on cleanup
    let rafId;
    function raf(time) {
        lenisRef.current?.raf(time);
        rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Keep Lenis in sync with DOM changes (debounced to prevent infinite loop)
    let resizeTimeout;
    const resizeObserver = new ResizeObserver(() => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            lenisRef.current?.resize();
            window.ScrollTrigger?.refresh();
        }, 250);
    });
    resizeObserver.observe(document.body);

    // Setup GSAP Animations
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    
    if (gsap && ScrollTrigger) {
        gsap.registerPlugin(ScrollTrigger);

        // Hero Animation — opens the clip-path from inset(50%) to inset(0%)
        const heroTimeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
        
        heroTimeline
            .to('.clip-hero', { clipPath: 'inset(0% round 32px)', duration: 1.5, ease: 'power4.inOut' }, 0)
            .to('header#navbar', { y: 0, opacity: 1, duration: 1.2, ease: 'power4.out' }, 0.3)
            .to('.hero-content', { opacity: 1, scale: 1, duration: 1.5 }, 0.5)
            .to('.hero-cloud-1', { opacity: 1, duration: 2 }, 0.2)
            .to('.hero-cloud-2', { opacity: 1, duration: 2 }, 0.2);


        // Apple-style Text Fill Scrub (Per Character)
        const initStaggeredText = () => {
            const textBlocks = document.querySelectorAll('.stagger-text');
            
            textBlocks.forEach(block => {
                // Return if already processed
                if (block.querySelector('.scrub-char')) return;
                
                const originalHTML = block.innerHTML;
                block.innerHTML = '';
                
                const processNode = (node, container) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        const words = node.textContent.split(/(\s+)/);
                        words.forEach(word => {
                            if (word.trim().length === 0) {
                                container.appendChild(document.createTextNode(word));
                            } else {
                                const wordSpan = document.createElement('span');
                                wordSpan.className = 'inline-block whitespace-nowrap';
                                word.split('').forEach(char => {
                                    const charSpan = document.createElement('span');
                                    charSpan.innerHTML = char === ' ' ? '&nbsp;' : char;
                                    charSpan.className = 'scrub-char inline-block opacity-15 transition-opacity duration-100 will-change-[opacity]';
                                    wordSpan.appendChild(charSpan);
                                });
                                container.appendChild(wordSpan);
                            }
                        });
                    } else if (node.nodeName === 'BR') {
                        container.appendChild(document.createElement('br'));
                    } else {
                        const clonedNode = node.cloneNode(false);
                        Array.from(node.childNodes).forEach(child => processNode(child, clonedNode));
                        container.appendChild(clonedNode);
                    }
                };
                
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = originalHTML;
                Array.from(tempDiv.childNodes).forEach(child => processNode(child, block));

                const chars = block.querySelectorAll('.scrub-char');
                gsap.to(chars, {
                    scrollTrigger: {
                        trigger: block,
                        start: 'top 90%',
                        end: 'bottom 60%',
                        scrub: 1.2,
                        onUpdate: (self) => {
                            const progress = self.progress;
                            chars.forEach((char, i) => {
                                const threshold = i / chars.length;
                                if (progress > threshold) {
                                    char.classList.remove('opacity-15');
                                    char.classList.add('opacity-100');
                                } else {
                                    char.classList.remove('opacity-100');
                                    char.classList.add('opacity-15');
                                }
                            });
                        }
                    },
                    ease: 'none'
                });
            });
        };

        // Parallax Floating Icons
        const initFloatingIcons = () => {
            const icons = document.querySelectorAll('.floating-icon');
            if (!icons || icons.length === 0) return;
            gsap.fromTo(icons, 
                { opacity: 0, scale: 0.75, y: 50 },
                {
                    scrollTrigger: { trigger: '#about', start: 'top 70%' },
                    opacity: 1, scale: 1, y: 0, duration: 1.2, stagger: 0.1, ease: 'back.out(1.5)'
                }
            );
        };

        // Parallax scroll effect for specific elements
        const initParallax = () => {
            gsap.utils.toArray('.parallax-image').forEach(img => {
                gsap.to(img, {
                    scrollTrigger: {
                        trigger: img.closest('.overflow-clip'), // Trigger on the parent card
                        scrub: true,
                        start: 'top bottom',
                        end: 'bottom top'
                    },
                    y: '15%',
                    ease: 'none'
                });
            });
        };

        // Apple-style Card Entrance Reveal
        const initCardEntrance = () => {
            const cards = document.querySelectorAll('.overflow-clip');
            cards.forEach(card => {
                // Exclude hero which handles its own animation
                if (!card.classList.contains('clip-hero')) {
                    gsap.fromTo(card, 
                        { opacity: 0, y: 50, scale: 0.96 },
                        {
                            scrollTrigger: {
                                trigger: card,
                                start: 'top 95%',
                                end: 'top 75%',
                                scrub: 0.5
                            },
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            ease: 'power2.out'
                        }
                    );
                }
            });
        };

        // Delay slightly so React finishes rendering DOM before GSAP calculates sizes
        setTimeout(() => {
            initStaggeredText();
            initFloatingIcons();
            initParallax();
            initCardEntrance();
        }, 300); // Increased delay slightly to ensure images are loaded for height calculation
    }
    
    // Navbar scroll effect synchronized with Lenis
    const handleScroll = (scroll) => {
        const nav = document.getElementById('navbar-inner');
        if (!nav) return;
        
        if (scroll > 50) {
            nav.classList.add('py-1', 'bg-white/95', 'shadow-md');
            nav.classList.remove('py-2', 'bg-white/85', 'shadow-soft');
        } else {
            nav.classList.add('py-2', 'bg-white/85', 'shadow-soft');
            nav.classList.remove('py-1', 'bg-white/95', 'shadow-md');
        }
    };

    lenisRef.current.on('scroll', ({ scroll }) => handleScroll(scroll));

    return () => {
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
        lenisRef.current?.destroy();
        window.ScrollTrigger?.getAll().forEach(t => t.kill());
    };
  }, []);


  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ['.pdf', '.docx'];

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`);
      return false;
    }
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_TYPES.includes(ext)) {
      setError(`Unsupported file type (${ext}). Please upload a PDF or DOCX.`);
      return false;
    }
    return true;
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (!validateFile(selectedFile)) return;
      setFile(selectedFile)
      setError(null)
      processFile(selectedFile)
    }
  }

  const processFile = async (fileToProcess) => {
    setLoading(true)
    setFadingOut(false)
    setError(null)
    setLoadingQuote(LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)])

    // Minimum 2-second loading screen so the quote is readable
    const minDelay = new Promise(resolve => setTimeout(resolve, 2000))

    try {
      console.log("[App.jsx] Starting local processing...");
      // 1. Extract Text (Offline)
      console.log("[App.jsx] Extracting text from file:", fileToProcess.name, "type:", fileToProcess.type);
      const text = await extractText(fileToProcess);
      console.log("[App.jsx] Text extracted successfully. Length:", text.length);
      
      // 2. Parse Resume (Offline)
      console.log("[App.jsx] Parsing resume...");
      const parsedProfile = parseResume(text);
      console.log("[App.jsx] Parsed profile:", parsedProfile);
      setProfile(parsedProfile);

      // 3. Generate Recommendations (Offline)
      console.log("[App.jsx] Generating recommendations...");
      const recs = generateRecommendations(parsedProfile, 10);
      console.log("[App.jsx] Recommendations generated:", recs.length);
      setRecommendations(recs);

      // Wait for min delay if needed
      await minDelay;
      
      // While the overlay is still covering, scroll to results underneath
      setTimeout(() => {
        lenisRef.current?.scrollTo('#results-target', { offset: -100, duration: 1.2 });
      }, 100)

      // Start the fade-out transition
      await new Promise(resolve => setTimeout(resolve, 400))
      setFadingOut(true)

      // Wait for fade-out animation to finish, then remove overlay
      await new Promise(resolve => setTimeout(resolve, 800))

    } catch (err) {
      console.error("[App.jsx] FATAL ERROR during local analysis:", err);
      setError("Unable to process resume locally. See browser console for details.");
    } finally {
      setLoading(false)
      setFadingOut(false)
    }
  }

  const handleUploadClick = () => {
    setIsModalOpen(true)
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selectedFile = e.dataTransfer.files[0]
      if (!validateFile(selectedFile)) return;
      setFile(selectedFile)
      setError(null)
      setIsModalOpen(false)
      processFile(selectedFile)
    }
  }

  const reset = () => {
    setProfile(null)
    setRecommendations([])
    setFile(null)
    setError(null)
    setActivePathway(null)
    setWizardStep(0)
    setWizardData({ jobTitle: '', industry: '', careerStage: '', selectedSkills: [], vibe: '', mood: '' })
    lenisRef.current?.scrollTo(0, { duration: 1.5 });
  }

  const processPrompt = async () => {
    setIsModalOpen(false)
    setLoading(true)
    setFadingOut(false)
    setError(null)
    setLoadingQuote(LOADING_QUOTES[Math.floor(Math.random() * LOADING_QUOTES.length)])
    const minDelay = new Promise(resolve => setTimeout(resolve, 2000))
    
    try {
      let promptProfile = null;
      
      if (activePathway === 'wizard') {
         promptProfile = buildProfileFromPrompt(wizardData)
      } else if (activePathway === 'quiz') {
         // promptProfile = buildProfileFromQuiz(quizData) // Soon
         throw new Error("Quiz parsing not implemented yet")
      }
      
      if (!promptProfile) throw new Error("No profile generated");

      setProfile(promptProfile)
      // Pass the explicit mood directly if wizard mode; else it defaults to null inside
      const recs = generateRecommendations(promptProfile, 10, wizardData.mood)
      setRecommendations(recs)
      
      await minDelay
      setTimeout(() => {
        lenisRef.current?.scrollTo('#results-target', { offset: -100, duration: 1.2 })
      }, 100)
      
      await new Promise(resolve => setTimeout(resolve, 400))
      setFadingOut(true)
      await new Promise(resolve => setTimeout(resolve, 800))
    } catch (err) {
      console.error('[App.jsx] Prompt processing error:', err)
      setError('Unable to generate recommendations. Please try again.')
    } finally {
      setLoading(false)
      setFadingOut(false)
    }
  }

  const handleWizardNext = () => {
    if (wizardStep === 0) {
      if (!wizardData.jobTitle.trim() || !wizardData.industry) return
      setAvailableSkills(getSkillsForIndustry(wizardData.industry, 30))
      setWizardStep(1)
    } else if (wizardStep === 1) {
      if (!wizardData.careerStage) return
      setWizardStep(2)
    } else if (wizardStep === 2) {
      setWizardStep(3)
    } else if (wizardStep === 3) {
      if (!wizardData.vibe) return
      processPrompt()
    }
  }

  const handleWizardBack = () => {
    if (wizardStep > 0) setWizardStep(wizardStep - 1)
    else { setPromptMode(false); setWizardStep(0) }
  }

  const toggleSkill = (skill) => {
    setWizardData(prev => ({
      ...prev,
      selectedSkills: prev.selectedSkills.includes(skill)
        ? prev.selectedSkills.filter(s => s !== skill)
        : [...prev.selectedSkills, skill]
    }))
  }

  return (
    <>
      {/* Navbar */}
      <header className="fixed inset-x-0 top-0 z-[1000] p-8 max-md:p-4 pointer-events-none transition-transform duration-500 opacity-0 -translate-y-full" id="navbar">
          <div id="navbar-inner" className="relative mx-auto max-w-[1200px] flex justify-between items-center py-2 pr-2 pl-6 max-md:pl-4 bg-white/85 backdrop-blur-md rounded-full shadow-soft transition-all duration-300 pointer-events-auto">
              <a href="#" onClick={(e) => { e.preventDefault(); reset(); setCurrentView('home'); }} aria-label="MOVIEFY Home" className="flex items-center z-10 font-gabarito font-bold text-2xl max-md:text-xl tracking-tighter text-dark-charcoal hover:opacity-80 transition-opacity">
                  MOVIEFY
              </a>
              <nav className="absolute inset-0 flex items-center justify-center max-md:hidden" aria-label="Main Navigation">
                  <a href="#about" onClick={() => setCurrentView('home')} className="px-5 py-2 inline-flex items-center justify-center rounded-full font-archivo font-medium text-[18px] text-dark-charcoal hover:bg-black/5 transition-colors duration-150">How it works</a>
                  <a href="#lessons" onClick={() => setCurrentView('home')} className="px-5 py-2 inline-flex items-center justify-center rounded-full font-archivo font-medium text-[18px] text-dark-charcoal hover:bg-black/5 transition-colors duration-150">Themes</a>
                  <a href="#articles" onClick={(e) => { e.preventDefault(); setCurrentView('library'); window.scrollTo(0, 0); }} className="px-5 py-2 inline-flex items-center justify-center rounded-full font-archivo font-medium text-[18px] text-dark-charcoal hover:bg-black/5 transition-colors duration-150">Deep Dives</a>
                  <a href="#results-target" onClick={() => setCurrentView('home')} className="px-5 py-2 inline-flex items-center justify-center rounded-full font-archivo font-medium text-[18px] text-dark-charcoal hover:bg-black/5 transition-colors duration-150">Match Engine</a>
              </nav>
              <button 
                  onClick={profile ? reset : handleUploadClick} 
                  disabled={loading}
                  aria-label={profile ? "Start over and match new resume" : "Open resume upload portal"}
                  className={`relative inline-flex items-center justify-center px-5 py-2 max-md:px-3 max-md:py-1.5 rounded-full text-white font-archivo font-medium text-[15px] max-md:text-[13px] tracking-wide z-10 transition-all duration-300 shadow-lg border border-dark-charcoal/20 ${loading ? 'bg-dark-charcoal/50 backdrop-blur-md cursor-not-allowed scale-100' : 'bg-dark-charcoal/80 backdrop-blur-md hover:bg-dark-charcoal hover:border-dark-charcoal/40 active:bg-dark-active hover:scale-105 active:scale-95'}`}
              >
                  {profile ? "Start Over" : (loading ? "Analyzing..." : "Find My Cinematic Twin")}
              </button>
          </div>
      </header>

      {/* Upload Portal Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-dark-charcoal/40 backdrop-blur-xl animate-fade-in">
              <div className="relative bg-white w-full max-w-2xl rounded-4xl-card max-md:rounded-2xl-card p-12 max-md:p-6 shadow-2xl flex flex-col items-center text-center animate-scale-in" role="dialog" aria-labelledby="modal-title">
                  <button onClick={() => { setIsModalOpen(false); setPromptMode(false); setWizardStep(0); }} aria-label="Close upload portal" className="absolute top-6 right-6 w-10 h-10 bg-dark-charcoal/10 backdrop-blur-md border border-dark-charcoal/10 rounded-full flex items-center justify-center hover:bg-dark-charcoal/20 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path d="M13 1L1 13M1 1L13 13" stroke="#181D1F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                  </button>

                  {!activePathway ? (
                    /* ── MENU: START YOUR JOURNEY ── */
                    <>
                      <h2 id="modal-title" className="font-archivo font-semibold text-4xl max-md:text-2xl text-dark-charcoal mb-4 max-md:mb-2 text-balance leading-tight">Start Your Journey</h2>
                      <p className="font-archivo text-lg max-md:text-base text-dark-slate mb-8 max-md:mb-6 max-w-md text-balance">Choose how you want us to analyze your career and discover your cinematic twin.</p>
                      
                      <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4 w-full max-w-lg mb-4">
                        
                        {/* Box 1: Document Upload */}
                        <button 
                          onClick={() => setActivePathway('upload')}
                          className="flex flex-col items-start gap-2 p-6 rounded-3xl-card bg-white neu-white neu-transition hover:translate-y-[-2px] text-left group"
                        >
                          <span className="text-3xl mb-1 group-hover:scale-110 transition-transform">📄</span>
                          <span className="font-archivo font-semibold text-dark-charcoal text-lg">Document Upload</span>
                          <span className="font-archivo text-dark-slate text-[13px] leading-relaxed">Drop your Resume, LinkedIn PDF, or Cover Letter here.</span>
                        </button>

                        {/* Box 2: Guided Wizard */}
                        <button 
                          onClick={() => setActivePathway('wizard')}
                          className="flex flex-col items-start gap-2 p-6 rounded-3xl-card bg-white neu-white neu-transition hover:translate-y-[-2px] text-left group"
                        >
                          <span className="text-3xl mb-1 group-hover:scale-110 transition-transform">🧭</span>
                          <span className="font-archivo font-semibold text-dark-charcoal text-lg">Guided Wizard</span>
                          <span className="font-archivo text-dark-slate text-[13px] leading-relaxed">Step-by-step role, skills, and mood selector.</span>
                        </button>

                      </div>
                    </>
                  ) : activePathway === 'upload' ? (
                    /* ── PATHWAY A: UPLOAD ── */
                    <>
                      <h2 id="modal-title" className="font-archivo font-semibold text-4xl max-md:text-2xl text-dark-charcoal mb-4 max-md:mb-2">Document Parser</h2>
                      <p className="font-archivo text-lg max-md:text-base text-dark-slate mb-8 max-md:mb-4 max-w-md">Drop your resume, LinkedIn PDF, or Cover Letter here.</p>
                      
                      <div 
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={`w-full max-w-md h-64 max-md:h-48 border-2 border-dashed rounded-3xl-card max-md:rounded-2xl-card flex flex-col items-center justify-center transition-colors cursor-pointer ${dragActive ? 'border-[#037BB5] bg-pastel-blue/30' : 'border-gray-300 hover:border-gray-400 bg-gray-50'}`}
                          onClick={() => document.getElementById('file-upload').click()}
                      >
                          <span className="text-4xl mb-4">📄</span>
                          <span className="font-archivo font-medium text-dark-charcoal text-lg">Click or Drag & Drop</span>
                          <span className="font-archivo text-dark-slate text-sm mt-2">PDF & DOCX maximum 5MB</span>
                      </div>

                      <input 
                        type="file" 
                        id="file-upload" 
                        onChange={(e) => {
                            handleFileChange(e);
                            setIsModalOpen(false);
                        }} 
                        accept=".pdf,.docx,.txt" 
                        className="hidden" 
                      />
                      
                      <button onClick={() => setActivePathway(null)} className="mt-8 max-md:mt-5 font-archivo text-dark-slate hover:text-dark-charcoal text-sm underline underline-offset-4 decoration-dark-slate/30 hover:decoration-dark-charcoal/50 transition-colors">
                        ← Back to Menu
                      </button>
                    </>
                  ) : activePathway === 'wizard' ? (
                    /* ── PATHWAY D: GUIDED WIZARD ── */
                    <>
                      {/* Step indicator */}
                      <div className="flex items-center gap-2 mb-8 max-md:mb-5">
                        {[0,1,2,3].map(i => (
                          <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === wizardStep ? 'bg-dark-charcoal scale-125' : i < wizardStep ? 'bg-dark-charcoal/40' : 'bg-dark-charcoal/15'}`} />
                        ))}
                      </div>

                      {/* Step 0: Role & Industry */}
                      {wizardStep === 0 && (
                        <div className="wizard-step w-full max-w-md">
                          <h2 className="font-archivo font-semibold text-3xl max-md:text-2xl text-dark-charcoal mb-2">What do you do?</h2>
                          <p className="font-archivo text-dark-slate mb-6 max-md:mb-4">Tell us your role and industry.</p>
                          
                          <input
                            type="text"
                            placeholder="e.g. Product Manager, Nurse, Chef..."
                            value={wizardData.jobTitle}
                            onChange={(e) => setWizardData(prev => ({...prev, jobTitle: e.target.value}))}
                            className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 font-archivo text-dark-charcoal text-base placeholder:text-dark-slate/50 focus:outline-none focus:ring-2 focus:ring-dark-charcoal/20 focus:border-dark-charcoal/30 transition-all mb-4"
                          />

                          <select
                            value={wizardData.industry}
                            onChange={(e) => setWizardData(prev => ({...prev, industry: e.target.value, selectedSkills: []}))}
                            className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 bg-gray-50 font-archivo text-dark-charcoal text-base focus:outline-none focus:ring-2 focus:ring-dark-charcoal/20 focus:border-dark-charcoal/30 transition-all appearance-none cursor-pointer"
                          >
                            <option value="" disabled>Select your industry</option>
                            {INDUSTRIES.map(ind => (
                              <option key={ind} value={ind}>{ind}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Step 1: Career Stage */}
                      {wizardStep === 1 && (
                        <div className="wizard-step w-full max-w-md">
                          <h2 className="font-archivo font-semibold text-3xl max-md:text-2xl text-dark-charcoal mb-2">Where are you in your career?</h2>
                          <p className="font-archivo text-dark-slate mb-6 max-md:mb-4">This helps us tailor recommendations to your experience level.</p>
                          
                          <div className="grid grid-cols-3 gap-3">
                            {CAREER_STAGES.map(stage => (
                              <button
                                key={stage.id}
                                onClick={() => setWizardData(prev => ({...prev, careerStage: stage.id}))}
                                className={`flex flex-col items-center gap-2 p-5 max-md:p-3 rounded-2xl border-2 transition-all duration-200 cursor-pointer ${wizardData.careerStage === stage.id ? 'border-dark-charcoal bg-dark-charcoal/5 scale-[1.02]' : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'}`}
                              >
                                <span className="text-3xl max-md:text-2xl">{stage.emoji}</span>
                                <span className="font-archivo font-semibold text-dark-charcoal text-sm">{stage.label}</span>
                                <span className="font-archivo text-dark-slate text-xs">{stage.desc}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step 2: Skills */}
                      {wizardStep === 2 && (
                        <div className="wizard-step w-full max-w-lg">
                          <h2 className="font-archivo font-semibold text-3xl max-md:text-2xl text-dark-charcoal mb-2">Select your skills</h2>
                          <p className="font-archivo text-dark-slate mb-6 max-md:mb-4">Pick the ones that match your experience. <span className="text-dark-charcoal font-medium">({wizardData.selectedSkills.length} selected)</span></p>
                          
                          <div className="flex flex-wrap gap-2 max-h-[280px] max-md:max-h-[220px] overflow-y-auto pr-1 justify-center">
                            {availableSkills.map(skill => (
                              <button
                                key={skill}
                                onClick={() => toggleSkill(skill)}
                                className={`px-4 py-2 rounded-full font-archivo text-sm transition-all duration-150 border ${wizardData.selectedSkills.includes(skill) ? 'bg-dark-charcoal text-white border-dark-charcoal' : 'bg-white text-dark-charcoal border-gray-200 hover:border-gray-400 hover:bg-gray-50'}`}
                              >
                                {wizardData.selectedSkills.includes(skill) && '✓ '}{skill}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step 3: Vibe */}
                      {wizardStep === 3 && (
                        <div className="wizard-step w-full max-w-lg">
                          <h2 className="font-archivo font-semibold text-3xl max-md:text-2xl text-dark-charcoal mb-2">What's your vibe?</h2>
                          <p className="font-archivo text-dark-slate mb-6 max-md:mb-4">Pick the work personality that fits you best.</p>
                          
                          <div className="grid grid-cols-2 max-md:grid-cols-1 gap-3">
                            {VIBE_OPTIONS.map(v => (
                              <button
                                key={v.id}
                                onClick={() => setWizardData(prev => ({...prev, vibe: v.id}))}
                                className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${wizardData.vibe === v.id ? 'border-dark-charcoal bg-dark-charcoal/5 scale-[1.01]' : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'}`}
                              >
                                <span className="text-2xl mt-0.5 shrink-0">{v.emoji}</span>
                                <div>
                                  <div className="font-archivo font-semibold text-dark-charcoal text-sm">{v.title}</div>
                                  <div className="font-archivo text-dark-slate text-xs mt-0.5">{v.desc}</div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Step 4: Mood */}
                      {wizardStep === 4 && (
                        <div className="wizard-step w-full max-w-lg">
                          <h2 className="font-archivo font-semibold text-3xl max-md:text-2xl text-dark-charcoal mb-2">What's your mood?</h2>
                          <p className="font-archivo text-dark-slate mb-6 max-md:mb-4">How do you want to feel after watching?</p>
                          
                          <div className="grid grid-cols-3 max-md:grid-cols-1 gap-3">
                            {['Inspired', 'Validated', 'Cautioned'].map(m => (
                              <button
                                key={m}
                                onClick={() => setWizardData(prev => ({...prev, mood: m}))}
                                className={`flex flex-col items-center gap-2 p-5 rounded-2xl-card border-2 transition-all duration-200 cursor-pointer text-left ${wizardData.mood === m ? 'border-dark-charcoal bg-dark-charcoal/5 scale-[1.02]' : 'border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50'}`}
                              >
                                <span className="font-archivo font-semibold text-dark-charcoal text-lg">{m}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Wizard navigation buttons */}
                      <div className="flex items-center gap-3 mt-8 max-md:mt-5 w-full max-w-md justify-between">
                        <button
                          onClick={handleWizardBack}
                          className="px-6 py-3 rounded-full font-archivo font-medium text-dark-charcoal bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          {wizardStep === 0 ? '← Start Over' : '← Back'}
                        </button>
                        <button
                          onClick={handleWizardNext}
                          disabled={(wizardStep === 0 && (!wizardData.jobTitle.trim() || !wizardData.industry)) || (wizardStep === 1 && !wizardData.careerStage) || (wizardStep === 3 && !wizardData.vibe) || (wizardStep === 4 && !wizardData.mood)}
                          className="px-8 py-3 rounded-full font-archivo font-semibold text-white bg-dark-charcoal hover:bg-dark-active disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:scale-105 active:scale-95"
                        >
                          {wizardStep === 4 ? 'Get Recommendations' : 'Next →'}
                        </button>
                      </div>
                    </>
                  ) : activePathway === 'text' ? (
                     /* ── PATHWAY B: THE VIBE CHECK ── */
                     <>
                        <h2 className="font-archivo font-semibold text-4xl max-md:text-2xl text-dark-charcoal mb-2">The Vibe Check</h2>
                        <p className="font-archivo text-dark-slate mb-8 max-md:mb-6 max-w-md">What's your biggest challenge at work right now? Or describe your dream job in 3 words. Just vent—we'll figure out your movie.</p>
                        
                        <textarea
                          placeholder="I'm feeling burnt out from managing people..."
                          value={freeTextData}
                          onChange={(e) => setFreeTextData(e.target.value)}
                          className="w-full max-w-lg h-40 p-5 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-dark-charcoal/20 transition-all font-archivo text-base text-dark-charcoal resize-none mb-6"
                        ></textarea>

                        <div className="flex items-center gap-3 w-full max-w-lg justify-between mt-2">
                          <button onClick={() => setActivePathway(null)} className="px-6 py-3 rounded-full font-archivo font-medium text-dark-charcoal bg-gray-100 hover:bg-gray-200 transition-colors">
                            ← Menu
                          </button>
                          <button 
                            onClick={processPrompt}
                            disabled={freeTextData.trim().length < 10}
                            className="px-8 py-3 rounded-full font-archivo font-semibold text-white bg-dark-charcoal hover:bg-dark-active disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg hover:scale-105 active:scale-95"
                          >
                            Analyze Vibe
                          </button>
                        </div>
                    </>
                  ) : null}
              </div>
          </div>
      )}

      {/* ── Full-Screen Loading Overlay ── */}
      {loading && (
          <div className={`fixed inset-0 z-[3000] flex items-center justify-center p-6 ${fadingOut ? 'animate-fade-out' : 'animate-fade-in'}`} style={fadingOut ? {animation: 'fadeOut 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards'} : {}}>
              {/* Blurred backdrop */}
              <div className="absolute inset-0 bg-dark-charcoal/60 backdrop-blur-2xl"></div>
              
              {/* Centered content */}
              <div className="relative z-10 flex flex-col items-center gap-10 max-w-2xl w-full text-center animate-scale-in">
                  
                  {/* Animated spinner */}
                  <div className="relative">
                      <span className="block w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></span>
                      <span className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-pastel-coral rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></span>
                  </div>

                  {/* Quote card */}
                  <div className="relative bg-white/5 backdrop-blur-xl rounded-4xl-card p-10 max-md:p-6 border border-white/10 shadow-2xl overflow-hidden">
                      {/* Animated gradient accent */}
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-pastel-peach via-pastel-coral to-pastel-blue animate-pulse"></div>
                      
                      <p className="font-archivo italic text-2xl max-md:text-xl text-white/90 leading-relaxed text-balance">
                          "{loadingQuote}"
                      </p>
                  </div>

                  {/* Subtitle */}
                  <p className="font-gabarito font-medium text-sm tracking-[0.15em] uppercase text-white/40 animate-pulse">
                      Analyzing your career trajectory...
                  </p>
              </div>
          </div>
      )}

      <main id="main-content" role="main">
          {currentView === 'home' ? (
            <>
          
          {/* Hero Section */}
          <div className="h-screen min-h-[500px] max-h-[1440px] p-4 max-md:p-2 flex flex-col pt-24 max-lg:pt-20 max-md:pt-14">
              <section id="hero" className="hero-wrapper relative w-full max-w-[1440px] h-full flex-1 mx-auto bg-gradient-to-b from-gradient-heroStart to-gradient-heroEnd rounded-4xl-card max-[1200px]:rounded-3xl-card max-lg:rounded-2xl-card max-md:rounded-xl-card overflow-hidden clip-hero flex items-center justify-center">
                  
                  {/* BG Clouds */}
                  <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-[2048px] max-[1200px]:w-[1400px] max-md:w-[1600px] max-sm:w-[2000px] z-[1] pointer-events-none opacity-0 hero-cloud-1" style={{willChange: 'transform'}}>
                      <img src="/assets/cloud.webp" alt="Ethereal floating background clouds" fetchPriority="high" decoding="async" className="w-full h-auto animate-cloud-drift" />
                  </div>
                  
                  <div className="relative z-[10] flex flex-col items-center justify-center text-center opacity-0 scale-110 hero-content px-4 max-sm:px-2 w-full">
                      <span className="inline-block px-5 py-2 max-md:px-4 max-md:py-1.5 mb-10 max-md:mb-6 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg font-gabarito font-bold text-[14px] max-md:text-[11px] tracking-[0.15em] max-md:tracking-[0.1em] uppercase text-white hover:bg-white/20 transition-colors">
                          AI-Powered Trajectory
                      </span>
                      <h1 className="font-archivo font-semibold text-[clamp(40px,8vw,128px)] max-md:leading-[1.05] leading-[1.12] tracking-tight-title hero-title-gradient w-full pb-4">
                          Find the perfect<br/>movies for your<br/>career growth
                      </h1>
                      
                      <div className="mt-16 max-md:mt-8 max-sm:mt-6 max-w-2xl w-full flex flex-col items-center gap-4 relative z-[10]">
                        {error && <p className="text-red-600 bg-red-100/80 px-4 py-2 rounded-full font-archivo font-medium">{error}</p>}
                        {loading && (
                            <div className="flex flex-col items-center gap-4">
                                <span className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></span>
                                <p className="font-archivo text-white/80 text-lg">Analyzing your trajectory...</p>
                            </div>
                        )}
                        {file && !profile && !loading && (
                            <p className="text-dark-charcoal font-archivo font-medium bg-white/50 px-6 py-2 rounded-full">
                                Ready to analyze: {file.name}
                            </p>
                        )}
                        {!file && !loading && (
                            <button 
                                onClick={handleUploadClick}
                                className="inline-flex items-center justify-center px-8 py-4 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 hover:border-white/40 active:bg-white/30 rounded-full text-white font-archivo font-medium text-[20px] max-md:text-[18px] tracking-body shadow-2xl transition-all hover:scale-105 active:scale-95 duration-300"
                            >
                                Upload Resume
                            </button>
                        )}
                      </div>
                  </div>

                  <div className="absolute top-[42%] left-1/2 w-[2048px] max-[1200px]:w-[1400px] max-md:w-[1600px] z-[3] pointer-events-none opacity-0 hero-cloud-2" style={{willChange: 'transform'}}>
                      <img src="/assets/cloud-protect-2.webp" alt="Opaque white foreground clouds for depth" fetchPriority="high" decoding="async" className="w-full h-auto" />
                  </div>
              </section>
          </div>

          {/* DYNAMIC RESULTS STAGE (Appears when profile exists) */}
          <div id="results-target"></div>
          {profile && (
              <section className="bg-white px-4 max-md:px-2 pb-4 max-md:pb-2 mt-12 max-md:mt-6 animate-fade-slide-up">
                  <div className="mx-auto max-w-[1440px] grid grid-cols-12 max-lg:grid-cols-1 gap-4 max-md:gap-2 animate-stagger">
                      
                      {/* Left: Deep Profile Analysis */}
                      <div className="col-span-4 max-lg:col-span-1 min-h-[500px] max-md:min-h-0 rounded-4xl-card max-[1200px]:rounded-3xl-card max-md:rounded-2xl-card bg-pastel-beige p-10 max-md:p-6 flex flex-col gap-6 max-md:gap-4 neu-beige neu-transition">
                          <div>
                              <h3 className="font-gabarito font-semibold text-[18px] tracking-wide-kicker uppercase text-dark-charcoal mb-4">Deep Analysis</h3>
                              <p className="font-archivo text-4xl font-semibold text-dark-charcoal leading-tight mb-1">
                                  {profile.industry}
                              </p>
                              {profile.secondary_industry && (
                                <p className="font-archivo text-lg text-dark-slate">+ {profile.secondary_industry}</p>
                              )}
                              <div className="flex flex-col gap-1 mt-3">
                                <p className="font-archivo text-lg text-dark-slate">Level: <span className="font-semibold text-dark-charcoal">{profile.career_stage}</span></p>
                                {profile.years_of_experience > 0 && (
                                  <p className="font-archivo text-lg text-dark-slate">Experience: <span className="font-semibold text-dark-charcoal">{profile.years_of_experience}+ years</span></p>
                                )}
                                {profile.vibe && (
                                  <p className="font-archivo text-lg text-dark-slate">Professional Vibe: <span className="font-semibold text-[#037BB5]">{profile.vibe}</span></p>
                                )}
                              </div>
                          </div>

                          <div className="w-full h-px bg-black/10"></div>

                          {/* Technologies */}
                          {profile.technologies && profile.technologies.length > 0 && (
                            <div>
                                <h4 className="font-archivo font-semibold text-lg text-dark-charcoal mb-3">Tech Stack</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {profile.technologies.slice(0, 10).map(tech => (
                                        <span key={tech} className="px-3 py-1 bg-dark-charcoal/5 rounded-md font-archivo font-medium text-dark-charcoal text-[13px] border border-black/5">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            </div>
                          )}

                          <div>
                              <h4 className="font-archivo font-semibold text-lg text-dark-charcoal mb-3">Verified Strengths</h4>
                              <div className="flex flex-wrap gap-2">
                                  {profile.found_skills.slice(0, 8).map(skill => (
                                      <span key={skill} className="px-3 py-1.5 max-md:px-2.5 max-md:py-1 bg-white rounded-full font-archivo font-medium text-dark-slate text-[14px] max-md:text-[12px] border border-black/5 neu-white neu-transition">
                                          {skill}
                                      </span>
                                  ))}
                              </div>
                          </div>

                          <div>
                              <h4 className="font-archivo font-semibold text-lg text-dark-charcoal mb-3">Growth Opportunities</h4>
                              <div className="flex flex-wrap gap-2">
                                  {profile.skill_gaps.slice(0, 5).map(gap => (
                                      <span key={gap} className="px-3 py-1.5 max-md:px-2.5 max-md:py-1 bg-pastel-coral/20 rounded-full font-archivo font-medium text-red-900 text-[14px] max-md:text-[12px] border border-pastel-coral/30 neu-beige neu-transition">
                                          {gap}
                                      </span>
                                  ))}
                              </div>
                          </div>
                      </div>

                      {/* Right: Movie Recommendations */}
                      <div className="col-span-8 max-lg:col-span-1 rounded-4xl-card max-[1200px]:rounded-3xl-card max-md:rounded-2xl-card bg-pastel-blue p-10 max-md:p-5 neu-blue neu-transition flex flex-col gap-6 max-md:gap-4">
                           <h3 className="font-gabarito font-semibold text-[18px] tracking-wide-kicker uppercase text-dark-charcoal mb-2">Curated Watchlist</h3>
                           
                           <div className="flex flex-col gap-4 animate-stagger">
                               {recommendations.length > 0 ? recommendations.map((movie, idx) => (
                                   <div key={idx} className="bg-white rounded-3xl-card max-md:rounded-2xl-card p-8 max-md:p-5 flex flex-col gap-4 max-md:gap-3 neu-white neu-transition border border-black/5 hover:translate-y-[-2px]">
                                       <div className="flex justify-between items-start max-md:flex-col max-md:gap-2">
                                            <div className="flex flex-col gap-1">
                                                <h4 className="font-archivo font-bold text-3xl max-md:text-xl max-sm:text-lg text-dark-charcoal">{movie.title}</h4>
                                                <span className={`inline-block mr-auto px-2 py-0.5 rounded text-[12px] font-gabarito font-bold uppercase tracking-wider ${movie.type === 'Web Series' ? 'bg-[#037BB5]/10 text-[#037BB5]' : 'bg-dark-charcoal/5 text-dark-slate'}`}>
                                                    {movie.type}
                                                </span>
                                            </div>
                                            <span className="px-4 py-1.5 max-md:px-3 max-md:py-1 bg-green-100 text-green-800 rounded-full font-archivo font-bold text-[16px] max-md:text-[13px] flex-shrink-0 neu-white mt-1 max-md:mt-0">
                                                {(movie.match_score * 100).toFixed(0)}% Match
                                            </span>
                                       </div>
                                       <p className="font-archivo text-xl max-md:text-base text-dark-slate leading-relaxed">
                                           {movie.summary}
                                       </p>
                                       <div className="mt-2 bg-pastel-blue/30 rounded-2xl-card max-md:rounded-xl-card p-6 max-md:p-4 border border-pastel-blue border-dashed neu-blue">
                                            <h5 className="font-gabarito font-bold text-[16px] max-md:text-[14px] text-[#037BB5] mb-2 uppercase tracking-wide">Mentor's Note</h5>
                                            <p className="font-archivo text-lg max-md:text-base text-dark-charcoal leading-relaxed">{movie.explanation}</p>
                                       </div>
                                   </div>
                               )) : (
                                   <div className="flex-1 flex items-center justify-center p-12">
                                        <p className="font-archivo text-xl text-dark-slate">Analyzing your trajectory and finding the best cinematic matches...</p>
                                   </div>
                               )}
                           </div>
                      </div>

                  </div>
              </section>
          )}

          {/* About Section - Only show when no profile is active */}
          {!profile && (
            <>
              {/* About Section */}
          <section id="about" className="bg-white px-4 max-md:px-3 pb-4 max-md:pb-3 mt-12 max-md:mt-6">
              <div className="mx-auto max-w-[1440px]">
                  <div className="min-h-[760px] max-[1200px]:min-h-[640px] max-lg:min-h-[500px] max-md:min-h-[auto] rounded-4xl-card max-[1200px]:rounded-3xl-card max-lg:rounded-2xl-card max-md:rounded-xl-card overflow-clip relative flex items-center justify-center py-16">
                      
                      {/* Full background video */}
                      <video 
                        autoPlay loop muted playsInline
                        className="absolute inset-0 w-full h-full object-cover z-[1]"
                        src="/assets/hero_clip.mp4"
                      />
                      
                      {/* Dark gradient overlay for text readability */}
                      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70 z-[2]"></div>

                      <div className="relative z-[3] flex flex-col items-center gap-6 py-[80px] max-md:py-[40px] px-12 max-[1200px]:px-8 max-md:px-4 max-w-[960px] text-center w-full">
                          <h2 className="font-gabarito font-semibold text-[18px] max-md:text-[14px] leading-[24px] tracking-[0.05em] uppercase text-white/80">Why use MOVIEFY?</h2>
                          <p className="font-archivo font-normal text-[32px] max-[1200px]:text-[24px] max-md:text-[20px] max-sm:text-[18px] leading-[1.25] tracking-tight-title text-white stagger-text">
                              Your resume tells you where you've been. Excellent storytelling shows you where you can go.
                          </p>
                          <div className="flex items-center justify-center my-2 max-md:scale-75">
                              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-white/70"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                          </div>
                          <p className="font-archivo font-normal text-[32px] max-[1200px]:text-[24px] max-md:text-[20px] max-sm:text-[18px] leading-[1.25] tracking-tight-title text-white stagger-text">
                              We extract your skills and map them to characters who overcome exactly what's next in your career.
                          </p>
                      </div>
                  </div>

              </div>
          </section>

          {/* Manifesto Section */}
          <section id="manifesto" className="bg-dark-charcoal px-6 max-md:px-3 py-32 max-lg:py-24 max-md:py-16 mt-12 max-md:mt-6 max-w-[1440px] mx-auto rounded-[64px] max-[1200px]:rounded-[48px] max-md:rounded-[24px] text-white overflow-clip relative shadow-2xl">
              {/* Background ambient halos for deep cinematic feel */}
              {/* Background ambient halos removed for a cleaner look */}

              
              <div className="relative z-10 mx-auto max-w-[1024px] flex flex-col gap-16 max-md:gap-10 px-8 max-md:px-0">
                  
                  {/* Manifesto Header */}
                  <div className="flex flex-col items-center text-center max-w-[800px] mx-auto mt-12 max-md:mt-4">
                      <span className="font-gabarito font-semibold text-[20px] max-md:text-[14px] leading-[24px] tracking-wide-kicker uppercase text-pastel-blue mb-8 max-md:mb-4 opacity-90 stagger-text">The Philosophy</span>
                      <h2 className="font-archivo font-semibold text-[clamp(36px,6vw,80px)] leading-[1.05] tracking-tight-title text-white stagger-text text-balance">
                          Entertainment should elevate, not sedate.
                      </h2>
                  </div>
                  
                  {/* Philosophy Pillars - Alternating Grid */}
                  <div className="flex flex-col gap-40 max-md:gap-16 mb-16 max-md:mb-8 w-full">
                      
                      {/* Pillar 1: The Digital Diet */}
                      <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-12 max-md:gap-6 items-center">
                          <div className="flex gap-6 max-md:gap-4 flex-col pl-10 max-md:pl-4 order-1 max-lg:order-2">

                              <h3 className="text-pastel-coral font-gabarito font-bold uppercase tracking-[0.1em] text-[18px] max-md:text-[16px] mb-2 opacity-80">1. The Digital Diet</h3>
                              <p className="font-archivo font-medium text-[clamp(20px,2.5vw,32px)] leading-[1.3] text-balance tracking-tight-title text-white/95 stagger-text">
                                  Your attention is being strip-mined by algorithms optimized for outrage. Directionless scrolling is a cardio workout for your thumbs and a sedative for your ambition. We are living on a diet of digital fast food, wondering why we feel lethargic in our careers.
                              </p>
                          </div>
                          <div className="rounded-3xl max-md:rounded-2xl overflow-hidden order-2 max-lg:order-1 group aspect-square max-md:aspect-video">

                              <img 
                                src="/assets/movie_grid.jpg" 
                                alt="Grid of famous movie posters" 
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-1000 grayscale-[0.3] group-hover:grayscale-0"
                              />
                          </div>
                      </div>
                      
                      {/* Pillar 2: The Productive Binge */}
                      <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-12 max-md:gap-6 items-center">
                          <div className="rounded-3xl max-md:rounded-2xl overflow-hidden order-1 group aspect-auto max-md:aspect-video">
                              <video 
                                autoPlay 
                                loop 
                                muted 
                                playsInline 
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-1000"
                              >
                                  <source src="/assets/AHMED..mp4" type="video/mp4" />
                              </video>
                          </div>
                          <div className="flex gap-6 max-md:gap-4 flex-col pr-10 max-lg:pr-0 max-lg:pl-6 max-md:pl-4 text-right max-lg:text-left order-2">

                              <h3 className="text-pastel-yellow font-gabarito font-bold uppercase tracking-[0.1em] text-[18px] max-md:text-[16px] mb-2 opacity-80">2. The Productive Binge</h3>
                              <p className="font-archivo font-medium text-[clamp(20px,2.5vw,32px)] leading-[1.3] text-balance tracking-tight-title text-white/95 stagger-text">
                                  We refuse to accept that education and entertainment must exist in separate silos. Mindless escapism is the enemy. When you watch a protagonist overcome a seemingly impossible constraint, you are absorbing a strategic framework. 
                              </p>
                          </div>
                      </div>
                      
                      {/* Pillar 3: Cinematic Incubation */}
                      <div className="grid grid-cols-2 max-lg:grid-cols-1 gap-12 max-md:gap-6 items-center">
                          <div className="flex gap-6 max-md:gap-4 flex-col pl-10 max-md:pl-4 order-1 max-lg:order-2">

                              <h3 className="text-pastel-sage font-gabarito font-bold uppercase tracking-[0.1em] text-[18px] max-md:text-[16px] mb-2 opacity-80">3. Cinematic Incubation</h3>
                              <p className="font-archivo font-medium text-[clamp(20px,2.5vw,32px)] leading-[1.3] text-balance tracking-tight-title text-white/95 stagger-text">
                                  By extracting your technical skills and identifying your trajectory, we curate your downtime to act as an incubator for your next breakthrough. Don't just go with the flow. Learn to build the boat and direct the river.
                              </p>
                          </div>
                          <div className="rounded-3xl max-md:rounded-2xl overflow-hidden order-2 max-lg:order-1 group aspect-auto max-md:aspect-video">
                              <video 
                                autoPlay 
                                loop 
                                muted 
                                playsInline 
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-1000"
                              >
                                  <source src="/assets/manifesto_vision.mp4" type="video/mp4" />
                              </video>
                          </div>
                      </div>

                  </div>
                  
                  {/* Manifesto Footer punchline */}
                  <div className="text-center mt-4 mb-4 border-t border-white/10 pt-8 max-md:pt-6">
                      <p className="font-archivo font-semibold text-[clamp(28px,6vh,56px)] leading-[1.1] tracking-tight-title text-transparent bg-clip-text bg-gradient-to-r from-pastel-peach via-pastel-yellow to-pastel-blue inline-block stagger-text">
                          Cancel your plans.<br/>We've got your future to build.
                      </p>
                  </div>

              </div>
          </section>

              {/* Articles Section */}
          <section id="articles" className="bg-white px-4 max-md:px-2 pb-4 max-md:pb-2 mt-12 max-md:mt-6">
              <div className="mx-auto max-w-[1440px] flex flex-col gap-8 max-md:gap-6">
                  <div className="px-12 max-md:px-6">
                      <span className="font-gabarito font-semibold text-[18px] tracking-wide-kicker uppercase text-dark-charcoal/60 mb-2 block">Deep Dives</span>
                      <h2 className="font-archivo font-semibold text-[48px] max-md:text-[32px] text-dark-charcoal leading-tight">Cinematic Strategy</h2>
                  </div>
                  
                  <div className="grid grid-cols-3 max-[1200px]:grid-cols-2 max-lg:grid-cols-1 gap-6 max-md:gap-4 px-12 max-md:px-4">
                      {ARTICLES.map(article => (
                          <div 
                              key={article.id} 
                              onClick={() => {
                                  setActiveArticle(article);
                                  setReadingProgress(0);
                                  document.body.style.overflow = 'hidden';
                              }}
                              className="group relative h-[400px] max-md:h-[320px] rounded-4xl-card max-[1200px]:rounded-3xl-card max-md:rounded-2xl-card overflow-clip bg-pastel-beige cursor-pointer transition-transform duration-500 hover:scale-[0.99] active:scale-[0.97]"
                          >
                              {/* Background Accent */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent z-[1]"></div>
                              <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-pastel-coral/20 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-150 z-[1]"></div>
                                                            <div className="relative z-[2] p-8 max-md:p-6 h-full flex flex-col justify-end">
                                  <div className="flex items-center justify-between mb-4">
                                      <span className="inline-block px-3 py-1 rounded-full bg-dark-charcoal text-white font-gabarito font-bold text-[10px] uppercase tracking-wider w-fit">
                                          {article.tag}
                                      </span>
                                      <div className="flex items-center gap-3 text-[12px] font-archivo font-medium text-dark-slate/60">
                                          <span>{article.date}</span>
                                          <span className="w-1 h-1 rounded-full bg-dark-slate/30"></span>
                                          <span>{article.readingTime}</span>
                                      </div>
                                  </div>
                                  <h3 className="font-archivo font-bold text-2xl max-md:text-xl text-dark-charcoal leading-[1.2] mb-3 group-hover:text-[#037BB5] transition-colors line-clamp-3">
                                      {article.title}
                                  </h3>
                                  <p className="font-archivo text-base text-dark-slate line-clamp-3 opacity-70 group-hover:opacity-100 transition-opacity mb-4">
                                      {article.summary}
                                  </p>
                                  <div className="mt-auto flex items-center gap-2 font-archivo font-bold text-[14px] text-dark-charcoal group-hover:translate-x-2 transition-transform">
                                      Read Analysis <span>→</span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </section>

          {/* Features Matrix */}
          <section className="bg-white px-4 max-md:px-2 pb-4 max-md:pb-2 mt-12 max-md:mt-6">
              <div className="mx-auto max-w-[1440px] grid grid-cols-12 max-lg:grid-cols-1 gap-4 max-md:gap-2">
                  
                  {/* Antidote Card (Span 5) */}
                  <div className="col-span-5 max-lg:col-span-1 min-h-[560px] md:h-[640px] xl:h-[760px] rounded-4xl-card max-xl:rounded-3xl-card max-lg:rounded-2xl-card max-md:rounded-xl-card overflow-clip relative flex flex-col max-lg:flex-row max-sm:flex-col bg-pastel-beige group">
                      <div className="absolute right-[8%] top-[44%] w-[107%] aspect-square pointer-events-none group-hover:scale-105 transition-transform duration-700">
                          <div className="w-full h-full rounded-full bg-pastel-coral mix-blend-multiply opacity-80"></div>
                      </div>
                      <div className="min-h-[220px] max-md:min-h-0 p-12 max-xl:p-8 max-md:p-6 flex flex-col gap-4 max-md:gap-2 flex-shrink-0 z-[4]">
                          <h2 className="font-archivo font-semibold text-[clamp(28px,4vw,48px)] leading-[1.05] tracking-tight-title text-dark-charcoal ">Curated, not random</h2>
                          <p className="font-archivo font-normal text-[clamp(16px,2vw,20px)] leading-[1.5] tracking-normal text-dark-slate ">We read between the lines of your resume. Stop scrolling through algorithmic slop and start watching content deeply personalized to the skills you actually need to build.</p>
                      </div>
                      <div className="flex-1 flex items-start justify-center min-h-0 z-[2] p-8 max-md:p-4">
                            <img src="/assets/the_score.jpg" loading="lazy" decoding="async" alt="The Score interface highlighting cinematic metrics" className="w-full h-auto max-w-[400px] object-contain object-top pt-4 max-md:pt-0 drop-shadow-2xl rounded-3xl shadow-2xl" />
                      </div>
                  </div>

                  {/* Fundamental Skills (Span 7) */}
                  <div className="col-span-7 max-lg:col-span-1 min-h-[560px] md:h-[640px] xl:h-[760px] rounded-4xl-card max-xl:rounded-3xl-card max-lg:rounded-2xl-card max-md:rounded-xl-card overflow-clip relative flex flex-col max-lg:flex-row max-sm:flex-col bg-pastel-lavender group">
                      <div className="min-h-[220px] max-md:min-h-0 p-12 max-[1200px]:p-8 max-md:p-6 flex flex-col gap-4 max-md:gap-2 flex-shrink-0 z-[4]">
                          <h2 className="font-archivo font-semibold text-[48px] max-[1200px]:text-[32px] max-md:text-[28px] max-sm:text-[24px] leading-[1.05] tracking-tight-title text-dark-charcoal stagger-text">Manifest your trajectory</h2>
                          <p className="font-archivo font-normal text-[20px] max-[1200px]:text-[18px] max-md:text-[16px] leading-[1.5] tracking-normal text-dark-slate stagger-text">We match your professional constraints with the protagonists who broke through them. It's not just a movie recommendation; it's a blueprint for your next milestone.</p>
                      </div>
                      <div className="flex-1 flex items-end justify-center min-h-0 z-[2]">
                          <img src="/assets/tagcloud.webp" loading="lazy" decoding="async" alt="Skill tags" className="max-h-full max-sm:max-h-[250px] w-auto object-contain object-bottom max-md:mt-4" />
                      </div>
                  </div>
                  
                  {/* Interactive lessons equivalent (Span 7) */}
                  <div className="col-span-7 max-lg:col-span-1 h-[760px] max-[1200px]:h-[560px] max-md:h-auto rounded-4xl-card max-[1200px]:rounded-3xl-card max-lg:rounded-2xl-card max-md:rounded-xl-card overflow-clip relative flex flex-col max-lg:flex-row max-sm:flex-col bg-pastel-blue">
                      <div className="min-h-[220px] max-md:min-h-0 p-12 max-[1200px]:p-8 max-md:p-6 flex flex-col gap-4 max-md:gap-2 flex-shrink-0 z-[4]">
                          <h2 className="font-archivo font-semibold text-[48px] max-[1200px]:text-[32px] max-md:text-[28px] max-sm:text-[24px] leading-[1.05] tracking-tight-title text-dark-charcoal stagger-text">Learn while binge-watching</h2>
                          <p className="font-archivo font-normal text-[20px] max-[1200px]:text-[18px] max-md:text-[16px] leading-[1.5] tracking-normal text-dark-slate stagger-text">Why compartmentalize entertainment and education? Our engine highlights exactly what concepts you should be looking for before you hit play.</p>
                      </div>
                      <div className="flex-1 flex items-start justify-end min-h-0 z-[2] pr-12 pb-12 max-md:pr-6 max-md:pb-6 mix-blend-multiply opacity-90">
                          <img src="/assets/learning_binge.jpg" loading="lazy" decoding="async" alt="Digital brain visualization merging with cinematic film reels" className="w-full h-auto max-sm:max-h-[250px] max-md:mt-4 object-contain object-bottom drop-shadow-[0_10px_35px_rgba(0,0,0,0.2)] mix-blend-color-burn rounded-xl animate-in zoom-in duration-1000" />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-[180px] max-sm:h-[100px] z-[3] pointer-events-none bg-gradient-to-b from-transparent to-pastel-blue"></div>
                  </div>

                  {/* Real-life Case Studies equivalent (Span 5) */}
                  <div className="col-span-5 max-lg:col-span-1 h-[760px] max-[1200px]:h-[560px] max-md:h-auto rounded-4xl-card max-[1200px]:rounded-3xl-card max-lg:rounded-2xl-card max-md:rounded-xl-card overflow-clip relative flex flex-col max-lg:flex-row max-sm:flex-col bg-pastel-sage">
                      <div className="min-h-[220px] max-md:min-h-0 p-12 max-[1200px]:p-8 max-md:p-6 flex flex-col gap-4 max-md:gap-2 flex-shrink-0 z-[4]">
                          <h2 className="font-archivo font-semibold text-[48px] max-[1200px]:text-[32px] max-md:text-[28px] max-sm:text-[24px] leading-[1.05] tracking-tight-title text-dark-charcoal stagger-text">Actionable cinematic insights</h2>
                          <p className="font-archivo font-normal text-[20px] max-[1200px]:text-[18px] max-md:text-[16px] leading-[1.5] tracking-normal text-dark-slate stagger-text">Every recommendation comes deeply annotated. We translate screenwriting structure directly into real-world strategic frameworks you can use tomorrow.</p>
                      </div>
                      <div className="flex-1 flex items-start justify-center min-h-0 z-[2] p-8 max-md:p-4 mt-12 max-md:mt-2 mix-blend-multiply opacity-95">
                          <img src="/assets/career_insight.jpg" loading="lazy" decoding="async" alt="NLP Cinematic tags" className="w-[120%] max-w-none max-sm:w-full h-auto max-sm:max-h-[300px] object-contain object-top drop-shadow-2xl mix-blend-color-burn rounded-xl" />
                      </div>
                  </div>

              </div>
          </section>

              {/* Made by Humans Section */}
              <section className="bg-white px-4 max-md:px-3 pb-4 max-md:pb-3">
                  <div className="mx-auto max-w-[1440px]">
                      <div className="h-[372px] max-[1200px]:h-auto rounded-4xl-card max-[1200px]:rounded-3xl-card max-lg:rounded-2xl-card max-md:rounded-xl-card overflow-clip flex max-md:flex-col relative bg-pastel-rose neu-white neu-transition">
                          <div className="relative z-[1] flex-1 min-h-[220px] max-md:min-h-0 p-12 max-[1200px]:p-8 max-md:p-6 flex flex-col gap-4 max-md:gap-2">
                              <h2 className="font-archivo font-semibold text-[48px] max-[1200px]:text-[32px] max-md:text-[28px] max-sm:text-[24px] leading-[1.05] tracking-tight-title text-dark-charcoal stagger-text">Built to elevate, not just entertain.</h2>
                              <p className="font-archivo font-normal text-[20px] max-[1200px]:text-[18px] max-md:text-[16px] leading-[1.5] tracking-normal text-dark-slate max-w-[740px] stagger-text">
                                  The internet provides infinite distractions to numb your brain. We want to do the opposite. You deserve content that accelerates your progression. Whether you're feeling imposter syndrome, facing a massive pivot, or charting a startup, there is a movie engineered to teach you how to win. 
                              </p>
                          </div>
                          <div className="relative z-[2] h-full max-md:h-[200px] pt-[0] max-md:pt-2 pr-[24px] max-md:px-4 pb-[0] flex flex-col items-center justify-end shrink-0 mix-blend-multiply">
                              <img src="/assets/Cinema.jpg" loading="lazy" decoding="async" alt="Vitruvian man director silhouette representing human potential and cinematography" className="w-[420px] max-[1200px]:w-[320px] max-lg:w-[280px] max-md:w-full max-md:h-full max-sm:w-[180px] object-contain object-bottom drop-shadow-xl rounded-xl" />
                          </div>
                      </div>
                  </div>
              </section>

              {/* Lessons / Marquee Section */}
              <section id="lessons" className="bg-white px-4 max-md:px-3 pb-8 max-md:pb-4">
                  <div className="relative max-w-[1440px] mx-auto rounded-4xl-card max-[1200px]:rounded-3xl-card max-lg:rounded-2xl-card max-md:rounded-xl-card py-16 max-md:py-12 overflow-hidden bg-gradient-to-br from-pastel-peach to-pastel-yellow">
                      <div className="absolute -left-px -top-px -bottom-px z-10 pointer-events-none w-[8.5%] bg-gradient-to-r from-pastel-peach to-transparent"></div>
                      <div className="absolute -right-px -top-px -bottom-px z-10 pointer-events-none w-[8.5%] bg-gradient-to-l from-pastel-yellow to-transparent"></div>
                      
                      <div className="relative z-20 text-center mb-[64px] max-[1200px]:mb-[48px] max-md:mb-[32px] max-w-[820px] mx-auto px-4">
                          <p className="font-gabarito font-semibold text-[18px] max-md:text-[14px] leading-[24px] tracking-[0.05em] uppercase text-[#037BB5] mb-6 max-md:mb-3 stagger-text">Grow Your Core</p>
                          <h2 className="font-archivo font-semibold text-[64px] max-[1200px]:text-[48px] max-md:text-[32px] max-sm:text-[28px] leading-[1.05] tracking-[-2px] text-dark-charcoal mb-6 max-md:mb-3 stagger-text">Explore storylines engineered for your ambition.</h2>
                          <p className="font-archivo font-normal text-[20px] max-[1200px]:text-[18px] max-md:text-[16px] leading-[1.5] tracking-normal text-dark-slate stagger-text">Upload your resume. Let's find out what you need to watch tonight to win tomorrow.</p>
                      </div>

                      <div className="relative z-[1] flex flex-col gap-4 mb-[24px]">
                          {/* Top Marquee (Moves Left) */}
                          <div className="marquee-container">
                              <div className="marquee-track flex gap-4 pr-4">
                                  {["Strategic Empathy", "Overcoming Imposter Syndrome", "Venture Scaling", "Leading Through Crisis", "Innovative Ideation", "Bold Career Pivots", "Power Negotiation", "Resilient Framing"].map((theme, i) => (
                                      <div key={`t-${i}`} className="flex items-center gap-4 bg-white/80 rounded-2xl-card px-6 py-4 max-md:px-4 max-md:py-3 flex-shrink-0 neu-white neu-transition border border-white/40 hover:bg-white/95 hover:translate-y-[-2px]">
                                          <span className="font-archivo font-semibold text-[20px] max-md:text-[16px] text-dark-charcoal whitespace-nowrap">{theme}</span>
                                      </div>
                                  ))}
                                  {["Strategic Empathy", "Overcoming Imposter Syndrome", "Venture Scaling", "Leading Through Crisis", "Innovative Ideation", "Bold Career Pivots", "Power Negotiation", "Resilient Framing"].map((theme, i) => (
                                      <div key={`dup-t-${i}`} className="flex items-center gap-4 bg-white/80 rounded-2xl-card px-6 py-4 max-md:px-4 max-md:py-3 flex-shrink-0 neu-white neu-transition border border-white/40 hover:bg-white/95 hover:translate-y-[-2px]">
                                          <span className="font-archivo font-semibold text-[20px] max-md:text-[16px] text-dark-charcoal whitespace-nowrap">{theme}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                          
                          {/* Bottom Marquee (Moves Right, Slower) */}
                          <div className="marquee-container">
                              <div className="marquee-track-reverse flex gap-4 pr-4">
                                  {["Data Driven Conviction", "Remote Team Leadership", "Navigating Layoffs", "Bootstrapping Startups", "Finding a Mentor", "Sustaining High Output", "Product Roadmapping"].map((theme, i) => (
                                      <div key={`b-${i}`} className="flex items-center gap-4 bg-white/80 rounded-2xl-card px-6 py-4 max-md:px-4 max-md:py-3 flex-shrink-0 neu-white neu-transition border border-white/40 hover:bg-white/95 hover:translate-y-[-2px]">
                                          <span className="font-archivo font-semibold text-[20px] max-md:text-[16px] text-dark-charcoal whitespace-nowrap">{theme}</span>
                                      </div>
                                  ))}
                                  {["Data Driven Conviction", "Remote Team Leadership", "Navigating Layoffs", "Bootstrapping Startups", "Finding a Mentor", "Sustaining High Output", "Product Roadmapping"].map((theme, i) => (
                                      <div key={`dup-b-${i}`} className="flex items-center gap-4 bg-white/80 rounded-2xl-card px-6 py-4 max-md:px-4 max-md:py-3 flex-shrink-0 neu-white neu-transition border border-white/40 hover:bg-white/95 hover:translate-y-[-2px]">
                                          <span className="font-archivo font-semibold text-[20px] max-md:text-[16px] text-dark-charcoal whitespace-nowrap">{theme}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </div>
                      
                      <div className="relative z-20 text-center mt-12">
                          <button onClick={handleUploadClick} className="inline-flex items-center justify-center px-8 py-4 bg-dark-charcoal hover:scale-105 active:scale-95 rounded-full text-white font-archivo font-medium text-[20px] shadow-xl transition-all duration-300 group">
                              Start your analysis
                              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
                          </button>
                      </div>
                  </div>
              </section>
            </>
          )}
        </>
      ) : (
        /* Articles Library "Page" View */
        <div className="min-h-screen pt-40 px-6 max-md:pt-28 bg-white animate-fade-in">
                <div className="mx-auto max-w-[1440px]">
                    <div className="flex flex-col gap-12 mb-20 px-12 max-md:px-4">
                        <button 
                            onClick={() => setCurrentView('home')}
                            className="flex items-center gap-2 font-archivo font-bold text-[#037BB5] hover:translate-x-[-4px] transition-transform w-fit"
                        >
                            <span>←</span> Back to Home
                        </button>
                        <div>
                            <span className="font-gabarito font-semibold text-[20px] tracking-wide-kicker uppercase text-dark-charcoal/60 mb-4 block">Knowledge Library</span>
                            <h1 className="font-archivo font-bold text-[clamp(48px,8vw,100px)] text-dark-charcoal leading-[1.05] tracking-tight-title max-w-4xl">
                                Cinematic Strategy & Cultural Codes
                            </h1>
                            <p className="font-archivo text-2xl max-md:text-lg text-dark-slate mt-8 max-w-2xl leading-relaxed">
                                A curated database of collections engineered to broaden your worldview and sharpen your strategic instincts.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 max-[1200px]:grid-cols-2 max-lg:grid-cols-1 gap-8 max-md:gap-4 px-12 max-md:px-4 pb-40">
                        {ARTICLES.map(article => (
                            <div 
                                key={article.id} 
                                onClick={() => {
                                    setActiveArticle(article);
                                    setReadingProgress(0);
                                    document.body.style.overflow = 'hidden';
                                }}
                                className="group relative min-h-[540px] max-md:min-h-[440px] rounded-4xl-card max-[1200px]:rounded-3xl-card max-md:rounded-2xl-card overflow-clip bg-pastel-beige cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent z-[1]"></div>
                                <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-pastel-coral/20 rounded-full blur-3xl transition-transform duration-700 group-hover:scale-150 z-[1]"></div>
                                
                                <div className="relative z-[2] p-8 max-md:p-6 h-full flex flex-col justify-end">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="inline-block px-3 py-1 rounded-full bg-dark-charcoal text-white font-gabarito font-bold text-[10px] uppercase tracking-wider w-fit">
                                            {article.tag}
                                        </span>
                                        <div className="flex items-center gap-2 text-[11px] font-archivo font-bold text-dark-slate/40">
                                            <span>{article.readingTime}</span>
                                        </div>
                                    </div>
                                    <h3 className="font-archivo font-bold text-[24px] text-dark-charcoal leading-[1.2] mb-6 group-hover:text-[#037BB5] transition-colors line-clamp-2">
                                        {article.title}
                                    </h3>
                                    
                                    {/* Structured Movie List */}
                                    <div className="flex flex-col gap-4 mb-8">
                                        {article.featuredMovies?.map((movie, mIdx) => (
                                            <div key={mIdx} className="flex gap-3 leading-tight group/item">
                                                <span className="font-archivo font-medium text-dark-charcoal/30 text-[14px] pt-[2px]">
                                                    {mIdx + 1}.
                                                </span>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="font-archivo font-bold text-[16px] text-dark-charcoal group-hover/item:text-[#037BB5] transition-colors">
                                                            {movie.title} ({movie.year})
                                                        </span>
                                                    </div>
                                                    <p className="font-archivo text-[13px] text-dark-slate opacity-70 leading-normal">
                                                        {movie.description}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Action Hint */}
                                    <div className="mt-auto pt-4 border-t border-dark-charcoal/5 flex items-center justify-between pointer-events-none">
                                        <span className="font-archivo font-bold text-[12px] text-dark-charcoal tracking-wider uppercase opacity-30 group-hover:opacity-100 transition-opacity">
                                            Deep Dive Analysis
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-dark-charcoal text-white flex items-center justify-center group-hover:bg-[#037BB5] transition-colors">
                                            <span>→</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
          )}
      </main>

      {/* Article Reader Modal */}
      {activeArticle && (
          <div 
              className="fixed inset-0 z-[4000] flex items-center justify-center p-4 max-md:p-0 bg-dark-charcoal/40 backdrop-blur-xl animate-fade-in"
              onClick={() => {
                  setActiveArticle(null);
                  document.body.style.overflow = '';
              }}
          >
              <div 
                  className="relative bg-white w-full max-w-4xl h-[90vh] max-md:h-screen rounded-[40px] max-md:rounded-none flex flex-col overflow-hidden animate-scale-in shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)]" 
                  role="dialog" 
                  aria-labelledby="article-title"
                  onClick={(e) => e.stopPropagation()}
              >
                  {/* Reading Progress Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gray-100 z-[20]">
                      <div 
                        className="h-full bg-gradient-to-r from-pastel-coral via-[#037BB5] to-pastel-blue transition-all duration-300 ease-out shadow-[0_0_10px_rgba(3,123,181,0.5)]"
                        style={{ width: `${readingProgress}%` }}
                      ></div>
                  </div>

                  {/* Close Header (Sticky) */}
                  <div className="sticky top-0 z-10 flex justify-between items-center px-12 py-8 max-md:px-6 max-md:py-4 bg-white/90 backdrop-blur-md border-b border-black/5">
                      <div className="flex flex-col">
                        <span className="font-gabarito font-bold text-[12px] uppercase tracking-widest text-[#037BB5] mb-1">
                            {activeArticle.tag}
                        </span>
                        <span className="font-archivo text-[12px] text-dark-slate/60 font-medium">
                            {activeArticle.date} • {activeArticle.readingTime}
                        </span>
                      </div>
                      <button 
                          onClick={() => {
                              setActiveArticle(null);
                              document.body.style.overflow = '';
                          }} 
                          autoFocus
                          aria-label="Close article" 
                          className="w-12 h-12 bg-dark-charcoal tooltip-trigger hover:scale-105 active:scale-95 rounded-full flex items-center justify-center transition-all shadow-lg"
                      >
                          <svg width="18" height="18" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                              <path d="M13 1L1 13M1 1L13 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                      </button>
                  </div>

                  {/* Scrollable Content */}
                  <div 
                    className="flex-1 overflow-y-auto px-12 pb-32 max-md:px-6 max-md:pb-16 custom-reader-scrollbar"
                    onScroll={(e) => {
                        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
                        const progress = (scrollTop / (scrollHeight - clientHeight)) * 100;
                        setReadingProgress(progress);
                    }}
                  >
                      <article className="max-w-[720px] mx-auto pt-16 max-md:pt-10">
                          <h1 id="article-title" className="font-archivo font-bold text-[clamp(40px,5vw,72px)] text-dark-charcoal leading-[1.05] tracking-tight-title mb-12 max-md:mb-8">
                              {activeArticle.title}
                          </h1>
                          
                          <div className="article-content-body font-archivo text-[20px] max-md:text-[18px] text-dark-slate leading-[1.8] space-y-8 tracking-normal">
                              {activeArticle.content.split('\n').map((para, i) => {
                                  const trimmed = para.trim();
                                  if (!trimmed) return null;
                                  
                                  // Improved Markdown Parsing
                                  if (trimmed.startsWith('### ')) {
                                      return <h3 key={i} className="font-archivo font-bold text-4xl text-dark-charcoal pt-10 pb-4 border-b border-black/5 mb-6">{trimmed.replace('### ', '')}</h3>;
                                  }
                                  if (trimmed.startsWith('#### ')) {
                                      return <h4 key={i} className="font-archivo font-bold text-2xl text-dark-charcoal pt-8 pb-3">{trimmed.replace('#### ', '')}</h4>;
                                  }
                                  if (trimmed.startsWith('• ') || trimmed.startsWith('* ')) {
                                      return <li key={i} className="ml-6 pl-2 list-disc marker:text-pastel-coral">{trimmed.substring(2)}</li>;
                                  }
                                  // Handle numbered lists (e.g. "1. Item")
                                  const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
                                  if (numberedMatch) {
                                      const listContent = numberedMatch[2];
                                      const formattedList = listContent.split('**').map((part, idx) =>
                                        idx % 2 === 1 ? <strong key={idx} className="text-dark-charcoal font-bold">{part}</strong> : part
                                      );
                                      return <li key={i} className="ml-6 pl-2 list-decimal marker:text-dark-charcoal/40 marker:font-bold">{formattedList}</li>;
                                  }
                                  if (trimmed.startsWith('> ')) {
                                      return <blockquote key={i} className="pl-6 border-l-4 border-pastel-coral/40 py-4 italic text-2xl max-md:text-xl text-dark-charcoal/80 bg-pastel-coral/5 rounded-r-2xl my-8">
                                          {trimmed.replace('> ', '').replace('**', '').replace('**', '')}
                                      </blockquote>;
                                  }
                                  if (trimmed === '---') {
                                      return <hr key={i} className="my-12 border-black/5" />;
                                  }
                                  
                                  // Handle bold segments and inline markers
                                  const formattedPara = trimmed.split('**').map((part, index) => 
                                      index % 2 === 1 ? <strong key={index} className="text-dark-charcoal font-bold">{part}</strong> : part
                                  );

                                  return <p key={i} className="opacity-90">{formattedPara}</p>;
                              })}
                          </div>
                          
                          {/* Article Footer */}
                          <div className="mt-24 pt-12 border-t border-black/5 flex flex-col items-center text-center gap-6">
                              <div className="w-16 h-1 bg-gradient-to-r from-pastel-peach to-pastel-blue rounded-full"></div>
                              <p className="font-archivo font-medium text-dark-slate/60 italic text-lg">
                                  End of analysis. Elevate your perspective, then take action.
                              </p>
                              <button 
                                onClick={() => {
                                    setActiveArticle(null);
                                    document.body.style.overflow = '';
                                }}
                                className="px-10 py-4 bg-dark-charcoal text-white rounded-full font-archivo font-bold hover:scale-105 transition-all shadow-xl"
                              >
                                  Return to Library
                              </button>
                          </div>
                      </article>
                  </div>
              </div>
          </div>
      )}
    </>
  )
}

export default App

(function () {
    "use strict";

    var translations = {
        pt: {
            navHome: "Início",
            navAbout: "Sobre",
            navSkills: "Habilidades",
            navProjects: "Projetos",
            navContact: "Contato",
            langToggleLabel: "Mudar idioma",
            navToggleLabel: "Menu",

            heroGreeting: "Olá, eu sou",
            heroRole: "Full Stack com foco em Mobile e automação",
            heroPitch: "Desenvolvimento de aplicativos, sistemas internos e fluxos de automação que reduzem tarefas manuais e aceleram a operação.",
            heroPrimaryCta: "Fale comigo",
            heroProjects: "Ver Projetos",

            aboutTitle: "Como eu gero valor",
            aboutText: "Traduzo processos operacionais em produtos digitais práticos, com foco em estabilidade, produtividade da equipe e tempo de resposta menor para o negócio.",
            aboutPillar1Title: "Apps mobile orientados a campo",
            aboutPillar1Desc: "Fluxos offline, integração com hardware e UX direta para uso diário.",
            aboutPillar2Title: "Sistemas internos para operação",
            aboutPillar2Desc: "Painel, controle de status e automação de etapas repetitivas.",
            aboutPillar3Title: "Entrega ponta a ponta",
            aboutPillar3Desc: "Do desenho técnico até deploy, com monitoramento e evolução contínua.",

            skillsTitle: "Stack técnica",
            skillsIntro: "Combinação de stack web, mobile e backend para construir produtos de uso real, com performance e manutenção simples.",
            skillFrontend: "Frontend",
            skillBackend: "Backend",
            skillMobile: "Mobile",
            skillTools: "Ferramentas",

            sectionProjects: "Projetos em destaque",
            projectsIntro: "Seleções com foco em impacto operacional: menos retrabalho, processos previsíveis e ganho de velocidade para o time.",
            proj1Badge: "Destaque mobile",
            proj1Title: "ZPL Template Printer",
            proj1Desc: "Aplicativo Flutter para criação de etiquetas ZPL em campo, com conexão Bluetooth em impressoras térmicas e configuração rápida de modelos por contexto de uso.",
            proj1Highlight1: "Fluxo focado em operação logística",
            proj1Highlight2: "Edição dinâmica de layout sem retrabalho",
            proj1Highlight3: "Execução local com baixa dependência externa",

            proj2Badge: "Desktop operacional",
            proj2Title: "AutoOs",
            proj2Desc: "Sistema desktop em Tauri + React para assistência técnica, consolidando abertura de ordens, controle de itens, status de manutenção e comunicação com clientes.",
            proj2Highlight1: "Visão única de todo o ciclo da OS",
            proj2Highlight2: "Fluxo padronizado para equipe técnica",

            proj3Badge: "Automação financeira",
            proj3Title: "AutoBo",
            proj3Desc: "Solução desktop em Tauri + React/TypeScript para automatização de cobranças via boletos, reduzindo etapas manuais e melhorando previsibilidade financeira.",
            proj3Highlight1: "Automação ponta a ponta do ciclo de cobrança",
            proj3Highlight2: "Integração com serviços externos e validações",
            modalCloseLabel: "Fechar",
            modalImageAlt: "Imagem do Projeto",
            modalRepo: "Repositório",
            modalDemo: "Demo",

            sectionContact: "Vamos construir algo útil?",
            contactText: "Se você procura alguém para transformar processo manual em produto digital, podemos conversar.",
            contactAvailability: "Disponível para freelas estratégicos e oportunidades full stack/mobile.",
            contactEmail: "Enviar email",
            contactGitHub: "GitHub",
            contactLinkedIn: "LinkedIn",

            footerText: "Paulo Medeiros | Full Stack & Mobile"
        },
        en: {
            navHome: "Home",
            navAbout: "About",
            navSkills: "Skills",
            navProjects: "Projects",
            navContact: "Contact",
            langToggleLabel: "Change language",
            navToggleLabel: "Menu",

            heroGreeting: "Hello, I am",
            heroRole: "Full Stack focused on Mobile and automation",
            heroPitch: "I build apps, internal systems and automation flows that reduce manual tasks and speed up operations.",
            heroPrimaryCta: "Discuss a project",
            heroProjects: "View case studies",

            aboutTitle: "How I create value",
            aboutText: "I transform operational processes into practical digital products, focused on stability, team productivity and faster response time for the business.",
            aboutPillar1Title: "Field-oriented mobile apps",
            aboutPillar1Desc: "Offline-first flows, hardware integration and direct UX for daily use.",
            aboutPillar2Title: "Internal systems for operations",
            aboutPillar2Desc: "Dashboards, status control and automation for repetitive steps.",
            aboutPillar3Title: "End-to-end delivery",
            aboutPillar3Desc: "From technical design to deployment, with monitoring and continuous improvement.",

            skillsTitle: "Technical stack",
            skillsIntro: "A blend of web, mobile and backend technologies to build real-world products with performance and maintainability.",
            skillFrontend: "Frontend",
            skillBackend: "Backend",
            skillMobile: "Mobile",
            skillTools: "Tools",

            sectionProjects: "Featured projects",
            projectsIntro: "Selections focused on operational impact: less rework, more predictable processes and faster team execution.",
            proj1Badge: "Mobile highlight",
            proj1Title: "ZPL Template Printer",
            proj1Desc: "Flutter app for creating ZPL labels in the field, with Bluetooth thermal printer connection and fast template setup by use context.",
            proj1Highlight1: "Flow designed for logistics operations",
            proj1Highlight2: "Dynamic layout editing without rework",
            proj1Highlight3: "Local execution with low external dependency",

            proj2Badge: "Operational desktop",
            proj2Title: "AutoOs",
            proj2Desc: "Desktop system built with Tauri + React for technical support operations, centralizing work orders, inventory, maintenance status and customer communication.",
            proj2Highlight1: "Single view of the full work-order cycle",
            proj2Highlight2: "Standardized flow for technical teams",

            proj3Badge: "Financial automation",
            proj3Title: "AutoBo",
            proj3Desc: "Desktop solution built with Tauri + React/TypeScript to automate boleto billing flows, reducing manual work and improving financial predictability.",
            proj3Highlight1: "End-to-end billing cycle automation",
            proj3Highlight2: "Integration with external services and validations",
            modalCloseLabel: "Close",
            modalImageAlt: "Project image",
            modalRepo: "Repository",
            modalDemo: "Demo",

            sectionContact: "Let us build something useful",
            contactText: "If you need someone to turn manual processes into digital products, we should talk.",
            contactAvailability: "Open to strategic freelance work and full stack/mobile opportunities.",
            contactEmail: "Send email",
            contactGitHub: "GitHub",
            contactLinkedIn: "LinkedIn",

            footerText: "Paulo Medeiros | Full Stack & Mobile"
        }
    };

    var navbar = document.getElementById("navbar");
    var navToggle = document.getElementById("navToggle");
    var navLinks = document.querySelector(".nav-links");
    var heroOverlay = document.getElementById("heroOverlay");
    var heroSection = document.getElementById("hero");
    var heroName = document.querySelector(".hero-name");
    var heroNameText = document.getElementById("heroNameText");
    var contactOverlay = document.getElementById("contactOverlay");
    var contactSection = document.getElementById("contact");
    var footerOverlay = document.getElementById("footerOverlay");
    var allNavAnchors = document.querySelectorAll(".nav-links a");
    var fadeElements = document.querySelectorAll(
        ".hero-content, .about-content, .about-kpi, .section-title, .section-intro, .skill-card, .project-card, .contact-panel"
    );
    var langToggle = document.getElementById("langToggle");
    var langToggleText = document.getElementById("langToggleText");

    function applyTranslations(lang) {
        var currentTranslations = translations[lang];
        var elements = document.querySelectorAll("[data-i18n]");
        for (var i = 0; i < elements.length; i++) {
            var key = elements[i].getAttribute("data-i18n");
            if (currentTranslations && currentTranslations[key]) {
                elements[i].textContent = currentTranslations[key];
            }
        }

        var attributeElements = document.querySelectorAll("[data-i18n-aria-label], [data-i18n-alt]");
        for (var j = 0; j < attributeElements.length; j++) {
            var ariaLabelKey = attributeElements[j].getAttribute("data-i18n-aria-label");
            var altKey = attributeElements[j].getAttribute("data-i18n-alt");

            if (ariaLabelKey && currentTranslations && currentTranslations[ariaLabelKey]) {
                attributeElements[j].setAttribute("aria-label", currentTranslations[ariaLabelKey]);
            }

            if (altKey && currentTranslations && currentTranslations[altKey]) {
                attributeElements[j].setAttribute("alt", currentTranslations[altKey]);
            }
        }

        updateLangToggleText(lang);
    }

    function updateLangToggleText(currentLang) {
        if (!langToggleText) {
            return;
        }
        langToggleText.textContent = currentLang === "pt" ? "EN" : "PT";
    }

    function getInitialLanguage() {
        var savedLang = localStorage.getItem("portfolio-lang");
        if (savedLang === "pt" || savedLang === "en") {
            return savedLang;
        }

        var browserLang = (window.navigator.language || "pt").toLowerCase();
        return browserLang.indexOf("pt") === 0 ? "pt" : "en";
    }

    function setLanguage(lang) {
        var safeLang = lang === "en" ? "en" : "pt";
        localStorage.setItem("portfolio-lang", safeLang);
        applyTranslations(safeLang);
    }

    function toggleLanguage() {
        var currentLang = localStorage.getItem("portfolio-lang") || getInitialLanguage();
        var nextLang = currentLang === "pt" ? "en" : "pt";
        setLanguage(nextLang);
    }

    function initLanguage() {
        setLanguage(getInitialLanguage());

        if (langToggle) {
            langToggle.addEventListener("click", toggleLanguage);
        }
    }

    function initFadeElements() {
        for (var i = 0; i < fadeElements.length; i++) {
            fadeElements[i].classList.add("fade-in");
        }
    }

    function handleNavbarScroll() {
        if (!navbar) {
            return;
        }

        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    }

    function typeHeroName() {
        if (!heroName || !heroNameText) {
            return;
        }

        var fullText = heroName.getAttribute("data-text") || "";
        var index = 0;
        heroNameText.textContent = "";

        function typeNextChar() {
            if (index <= fullText.length) {
                heroNameText.textContent = fullText.slice(0, index);
                index += 1;
                window.setTimeout(typeNextChar, 110);
            }
        }

        typeNextChar();
    }

    function handleHeroOverlay() {
        if (!heroOverlay || !heroSection) {
            return;
        }

        var heroHeight = heroSection.offsetHeight;
        var scrollPos = window.scrollY;
        var opacity = 1 - scrollPos / heroHeight;

        if (opacity < 0) {
            opacity = 0;
        }
        if (opacity > 1) {
            opacity = 1;
        }

        heroOverlay.style.opacity = opacity;
    }

    function handleContactOverlay() {
        if (!contactOverlay || !contactSection) {
            return;
        }

        var contactTop = contactSection.offsetTop;
        var scrollPos = window.scrollY;
        var windowHeight = window.innerHeight;

        var fadeStart = contactTop - windowHeight;
        var fadeEnd = contactTop - windowHeight * 0.32;
        var fadeRange = fadeEnd - fadeStart;

        var opacity = 0;

        if (scrollPos > fadeStart && fadeRange > 0) {
            opacity = (scrollPos - fadeStart) / fadeRange;
        }

        if (opacity < 0) {
            opacity = 0;
        }
        if (opacity > 1) {
            opacity = 1;
        }

        contactOverlay.style.opacity = opacity;
        if (footerOverlay) {
            footerOverlay.style.opacity = opacity;
        }
    }

    function toggleMobileMenu() {
        if (!navToggle || !navLinks) {
            return;
        }
        navToggle.classList.toggle("active");
        navLinks.classList.toggle("open");
        navToggle.setAttribute("aria-expanded", navLinks.classList.contains("open") ? "true" : "false");
    }

    function closeMobileMenu() {
        if (!navToggle || !navLinks) {
            return;
        }
        navToggle.classList.remove("active");
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
    }

    function setupMobileMenuListeners() {
        if (!navToggle || !navLinks) {
            return;
        }

        navToggle.addEventListener("click", function (event) {
            event.stopPropagation();
            toggleMobileMenu();
        });

        navLinks.addEventListener("click", function (event) {
            event.stopPropagation();
        });

        for (var i = 0; i < allNavAnchors.length; i++) {
            allNavAnchors[i].addEventListener("click", closeMobileMenu);
        }

        document.addEventListener("click", function (event) {
            if (!navLinks.classList.contains("open")) {
                return;
            }

            if (!navbar || !navbar.contains(event.target)) {
                closeMobileMenu();
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && navLinks.classList.contains("open")) {
                closeMobileMenu();
            }
        });
    }

    function setupScrollObserver() {
        if (!("IntersectionObserver" in window)) {
            for (var i = 0; i < fadeElements.length; i++) {
                fadeElements[i].classList.add("visible");
            }
            return;
        }

        var observer = new IntersectionObserver(
            function (entries) {
                for (var i = 0; i < entries.length; i++) {
                    if (entries[i].isIntersecting) {
                        entries[i].target.classList.add("visible");
                        observer.unobserve(entries[i].target);
                    }
                }
            },
            {
                root: null,
                threshold: 0.14
            }
        );

        for (var j = 0; j < fadeElements.length; j++) {
            observer.observe(fadeElements[j]);
        }
    }

    function smoothScrollToSection() {
        var anchors = document.querySelectorAll('a[href^="#"]');

        for (var i = 0; i < anchors.length; i++) {
            anchors[i].addEventListener("click", function (event) {
                var targetId = this.getAttribute("href");
                if (targetId === "#") {
                    return;
                }

                var targetElement = document.querySelector(targetId);
                if (!targetElement) {
                    return;
                }

                event.preventDefault();
                var navbarHeight = navbar ? navbar.offsetHeight : 0;
                var targetPosition = targetElement.offsetTop - navbarHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: "smooth"
                });
            });
        }
    }

    function isRealRepoUrl(repoUrl) {
        if (!repoUrl) {
            return false;
        }

        if (repoUrl.indexOf("seuusuario") !== -1) {
            return false;
        }

        return /^https?:\/\//.test(repoUrl);
    }

    function isRealVideoId(videoId) {
        if (!videoId) {
            return false;
        }

        return videoId.indexOf("SEU_VIDEO_ID") !== 0;
    }

    function setupProjectDetails() {
        var modal = document.getElementById("projectDetailModal");
        var modalOverlay = document.getElementById("projectDetailOverlay");
        var modalClose = document.getElementById("projectDetailClose");
        var projectCards = document.querySelectorAll(".project-card");

        var modalTitle = document.getElementById("modalProjectTitle");
        var modalDescription = document.getElementById("modalProjectDescription");
        var modalImage = document.getElementById("modalProjectImage");
        var repoBtn = document.getElementById("modalProjectRepo");
        var demoBtn = document.getElementById("modalProjectDemo");

        if (!modal) {
            return;
        }

        function closeModal() {
            modal.classList.remove("active");
            document.body.style.overflow = "";
        }

        function openModal(card) {
            var repoUrl = card.getAttribute("data-repo-url");
            var imageUrl = card.getAttribute("data-image");
            var videoId = card.getAttribute("data-video-id");
            var title = card.querySelector(".card-title").textContent;
            var description = card.querySelector(".card-description").textContent;

            if (modalTitle) {
                modalTitle.textContent = title;
            }
            if (modalDescription) {
                modalDescription.textContent = description;
            }
            if (modalImage) {
                modalImage.src = imageUrl || "assets/montanha.jpeg";
                modalImage.alt = title;
            }

            if (repoBtn) {
                if (isRealRepoUrl(repoUrl)) {
                    repoBtn.href = repoUrl;
                    repoBtn.removeAttribute("aria-disabled");
                    repoBtn.title = "";
                } else {
                    repoBtn.href = "#";
                    repoBtn.setAttribute("aria-disabled", "true");
                    repoBtn.title = "Repositório não disponível";
                }

                repoBtn.onclick = function (event) {
                    if (repoBtn.getAttribute("aria-disabled") === "true") {
                        event.preventDefault();
                    }
                };
            }

            if (demoBtn) {
                if (isRealVideoId(videoId)) {
                    demoBtn.disabled = false;
                    demoBtn.removeAttribute("aria-disabled");
                    demoBtn.title = "";
                    demoBtn.onclick = function () {
                        window.open("https://www.youtube.com/watch?v=" + videoId, "_blank", "noopener,noreferrer");
                    };
                } else {
                    demoBtn.disabled = true;
                    demoBtn.setAttribute("aria-disabled", "true");
                    demoBtn.title = "Demo não disponível";
                    demoBtn.onclick = null;
                }
            }

            modal.classList.add("active");
            document.body.style.overflow = "hidden";
        }

        for (var i = 0; i < projectCards.length; i++) {
            projectCards[i].addEventListener("click", function (event) {
                if (event.target.tagName !== "A" && event.target.closest("a") === null) {
                    openModal(this);
                }
            });
        }

        if (modalOverlay) {
            modalOverlay.addEventListener("click", closeModal);
        }
        if (modalClose) {
            modalClose.addEventListener("click", closeModal);
        }

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && modal.classList.contains("active")) {
                closeModal();
            }
        });
    }

    function init() {
        initLanguage();
        initFadeElements();
        handleNavbarScroll();
        handleHeroOverlay();
        handleContactOverlay();
        typeHeroName();
        setupMobileMenuListeners();
        setupScrollObserver();
        smoothScrollToSection();
        setupProjectDetails();

        window.addEventListener("scroll", handleNavbarScroll);
        window.addEventListener("scroll", handleHeroOverlay);
        window.addEventListener("scroll", handleContactOverlay);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();

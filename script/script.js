/* ==========================================================
   PORTFOLIO -- Scripts
   Funcoes de interacao: navbar, menu mobile, scroll e 
   animacoes de entrada dos elementos.
   ========================================================== */

(function () {
    "use strict";

    /* --------------------------------------------------
       Objeto de traducoes para internacionalizacao.
       Cada chave corresponde ao atributo data-i18n 
       dos elementos HTML.
       -------------------------------------------------- */
    var translations = {
        "pt": {
            "navHome": "Inicio",
            "navAbout": "Stacks",
            "navProjects": "Projetos",
            "navContact": "Contato",
            "heroGreeting": "Ola, eu sou",
            "heroRole": "Desenvolvedor Full Stack",
            "heroResume": "Resume",
            "heroProjects": "Ver Projetos",
            "heroContact": "Contato",
            "sectionStacks": "Stacks",
            "aboutText": "Stacks e tecnologias que domino e utilizo frequentemente em meus projetos, abrangendo desde linguagens de programacao e frameworks ate ferramentas de desenvolvimento e bancos de dados.",
            "catLanguages": "Linguagens",
            "catFrameworks": "Frameworks",
            "catFeatures": "Funcionalidades",
            "catDatabases": "Databases",
            "sectionProjects": "Projetos",
            "proj1Title": "Projeto Alpha",
            "proj1Desc": "Aplicacao web completa com autenticacao, dashboard interativo e integracao com APIs externas.",
            "proj2Desc": "Sistema desktop nativo desenvolvido em Tauri + React para gestao completa de assistencia tecnica de impressoras, incluindo controle de equipamentos, estoque de insumos, workflow de manutencao e automacao de comunicacao com clientes.",
            "proj3Desc": "Solucao desktop desenvolvida em Tauri e React/TypeScript para automatizacao completa do ciclo de cobrancas via boletos bancarios, eliminando processos manuais e integrando-se diretamente com a infraestrutura bancaria do Sicredi.",
            "proj4Title": "Projeto Delta",
            "proj4Desc": "CLI para automacao de tarefas repetitivas no ambiente de desenvolvimento, com plugins extensiveis.",
            "proj5Title": "Projeto Epsilon",
            "proj5Desc": "Dashboard de monitoramento em tempo real com graficos interativos e sistema de alertas.",
            "proj6Title": "Projeto Zeta",
            "proj6Desc": "Microservico de processamento de imagens com fila de tarefas e armazenamento em nuvem.",
            "sectionContact": "Contato",
            "contactText": "Interessado em trabalhar junto? Entre em contato.",
            "footerText": "ph"
        },
        "en": {
            "navHome": "Home",
            "navAbout": "Stacks",
            "navProjects": "Projects",
            "navContact": "Contact",
            "heroGreeting": "Hello, I am",
            "heroRole": "Full Stack Developer",
            "heroResume": "Resume",
            "heroProjects": "View Projects",
            "heroContact": "Contact",
            "sectionStacks": "Stacks",
            "aboutText": "Stacks and technologies I master and frequently use in my projects, ranging from programming languages and frameworks to development tools and databases.",
            "catLanguages": "Languages",
            "catFrameworks": "Frameworks",
            "catFeatures": "Features",
            "catDatabases": "Databases",
            "sectionProjects": "Projects",
            "proj1Title": "Project Alpha",
            "proj1Desc": "Complete web application with authentication, interactive dashboard, and external API integrations.",
            "proj2Desc": "Native desktop system built with Tauri + React for complete printer technical assistance management, including equipment control, supplies inventory, maintenance workflow, and automated customer communication.",
            "proj3Desc": "Desktop solution developed in Tauri and React/TypeScript for complete automation of bank slip billing cycles, eliminating manual processes and integrating directly with Sicredi's banking infrastructure.",
            "proj4Title": "Project Delta",
            "proj4Desc": "CLI for automating repetitive tasks in the development environment, with extensible plugins.",
            "proj5Title": "Project Epsilon",
            "proj5Desc": "Real-time monitoring dashboard with interactive charts and alert system.",
            "proj6Title": "Project Zeta",
            "proj6Desc": "Image processing microservice with task queue and cloud storage.",
            "sectionContact": "Contact",
            "contactText": "Interested in working together? Get in touch.",
            "footerText": "ph"
        }
    };

    /* --------------------------------------------------
       Selecao de elementos do DOM utilizados nas funcoes.
       -------------------------------------------------- */
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
        ".project-card, .section-title, .about-content, .hero-content, .contact-text, .contact-links, .skill-tag"
    );
    var langPopup = document.getElementById("langPopup");
    var langPtBtn = document.getElementById("langPt");
    var langEnBtn = document.getElementById("langEn");
    var langToggle = document.getElementById("langToggle");
    var langToggleText = document.getElementById("langToggleText");

    /* --------------------------------------------------
       applyTranslations
       Percorre todos os elementos com atributo data-i18n 
       e substitui seu textContent pela traducao 
       correspondente ao idioma selecionado.
       -------------------------------------------------- */
    function applyTranslations(lang) {
        var elements = document.querySelectorAll("[data-i18n]");
        for (var i = 0; i < elements.length; i++) {
            var key = elements[i].getAttribute("data-i18n");
            if (translations[lang] && translations[lang][key]) {
                elements[i].textContent = translations[lang][key];
            }
        }
        /* Atualiza o texto do botao toggle na navbar */
        updateLangToggleText(lang);
    }

    /* --------------------------------------------------
       updateLangToggleText
       Atualiza o texto do botao de idioma na navbar.
       Mostra o idioma alternativo (clicavel para trocar).
       -------------------------------------------------- */
    function updateLangToggleText(currentLang) {
        if (langToggleText) {
            langToggleText.textContent = currentLang === "pt" ? "EN" : "PT";
        }
    }

    /* --------------------------------------------------
       toggleLanguage
       Alterna entre portugues e ingles.
       -------------------------------------------------- */
    function toggleLanguage() {
        var currentLang = localStorage.getItem("portfolio-lang") || "pt";
        var newLang = currentLang === "pt" ? "en" : "pt";
        setLanguage(newLang);
    }

    /* --------------------------------------------------
       setLanguage
       Define o idioma da pagina, salva no localStorage 
       e aplica as traducoes. Tambem esconde o popup.
       -------------------------------------------------- */
    function setLanguage(lang) {
        localStorage.setItem("portfolio-lang", lang);
        applyTranslations(lang);
        hidePopup();
    }

    /* --------------------------------------------------
       hidePopup
       Esconde o popup de selecao de idioma com animacao.
       -------------------------------------------------- */
    function hidePopup() {
        if (langPopup) {
            langPopup.classList.add("hidden");
        }
    }

    /* --------------------------------------------------
       showPopup
       Exibe o popup de selecao de idioma.
       -------------------------------------------------- */
    function showPopup() {
        if (langPopup) {
            langPopup.classList.remove("hidden");
        }
    }

    /* --------------------------------------------------
       initLanguage
       Verifica se ja existe um idioma salvo no localStorage.
       Se sim, aplica as traducoes e esconde o popup.
       Se nao, exibe o popup para o usuario escolher.
       -------------------------------------------------- */
    function initLanguage() {
        var savedLang = localStorage.getItem("portfolio-lang");
        
        if (savedLang) {
            applyTranslations(savedLang);
            hidePopup();
        } else {
            showPopup();
        }

        /* Listeners para os botoes do popup */
        if (langPtBtn) {
            langPtBtn.addEventListener("click", function () {
                setLanguage("pt");
            });
        }
        if (langEnBtn) {
            langEnBtn.addEventListener("click", function () {
                setLanguage("en");
            });
        }

        /* Listener para o botao toggle na navbar */
        if (langToggle) {
            langToggle.addEventListener("click", toggleLanguage);
        }
    }

    /* --------------------------------------------------
       initFadeElements
       Adiciona a classe "fade-in" a todos os elementos 
       que devem aparecer com animacao ao entrar na tela.
       Isso os deixa inicialmente invisiveis ate que o 
       observer detecte sua visibilidade.
       -------------------------------------------------- */
    function initFadeElements() {
        for (var i = 0; i < fadeElements.length; i++) {
            fadeElements[i].classList.add("fade-in");
        }
    }

    /* --------------------------------------------------
       handleNavbarScroll
       Verifica a posicao de rolagem da pagina. Quando o 
       usuario rola mais de 50px, adiciona a classe 
       "scrolled" a navbar para reduzir seu tamanho.
       Quando volta ao topo, remove a classe.
       -------------------------------------------------- */
    function handleNavbarScroll() {
        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    }

    /* --------------------------------------------------
       typeHeroName
       Simula o efeito de digitacao no nome do hero.
       Usa o atributo data-text como fonte do texto.
       -------------------------------------------------- */
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
                window.setTimeout(typeNextChar, 450);
            }
        }

        typeNextChar();
    }

    /* --------------------------------------------------
       handleHeroOverlay
       Calcula a opacidade do overlay da secao hero com 
       base na posicao de rolagem. Quando o usuario esta 
       no topo, o overlay esta totalmente visivel. A 
       medida que rola para baixo, o overlay desaparece 
       gradualmente ate ficar completamente transparente 
       ao sair da secao hero.
       -------------------------------------------------- */
    function handleHeroOverlay() {
        if (!heroOverlay || !heroSection) {
            return;
        }
        var heroHeight = heroSection.offsetHeight;
        var scrollPos = window.scrollY;

        /* Calcula a opacidade de 1 (topo) ate 0 (fim do hero) */
        var opacity = 1 - (scrollPos / heroHeight);

        /* Limita o valor entre 0 e 1 */
        if (opacity < 0) {
            opacity = 0;
        }
        if (opacity > 1) {
            opacity = 1;
        }

        heroOverlay.style.opacity = opacity;
    }

    /* --------------------------------------------------
       handleContactOverlay
       Calcula a opacidade do overlay da secao de contato.
       Quando o usuario se aproxima da secao final, o 
       overlay comeca a aparecer gradualmente, ficando 
       totalmente visivel quando a secao esta centralizada
       na viewport. Cria um efeito espelhado em relacao 
       ao overlay do hero.
       -------------------------------------------------- */
    function handleContactOverlay() {
        if (!contactOverlay || !contactSection) {
            return;
        }

        var contactTop = contactSection.offsetTop;
        var contactHeight = contactSection.offsetHeight;
        var scrollPos = window.scrollY;
        var windowHeight = window.innerHeight;

        /* Ponto onde o overlay comeca a aparecer: quando a secao entra na viewport */
        var fadeStart = contactTop - windowHeight;
        /* Ponto onde o overlay esta totalmente visivel: metade da secao visivel */
        var fadeEnd = contactTop - (windowHeight * 0.3);
        var fadeRange = fadeEnd - fadeStart;

        var opacity = 0;

        if (scrollPos > fadeStart && fadeRange > 0) {
            opacity = (scrollPos - fadeStart) / fadeRange;
        }

        /* Limita o valor entre 0 e 1 */
        if (opacity < 0) {
            opacity = 0;
        }
        if (opacity > 1) {
            opacity = 1;
        }

        contactOverlay.style.opacity = opacity;

        /* Aplica a mesma opacidade ao overlay do footer */
        if (footerOverlay) {
            footerOverlay.style.opacity = opacity;
        }
    }

    /* --------------------------------------------------
       toggleMobileMenu
       Alterna a visibilidade do menu em dispositivos 
       mobile. Ativa/desativa as classes "active" no 
       botao hamburguer e "open" na lista de links.
       -------------------------------------------------- */
    function toggleMobileMenu() {
        navToggle.classList.toggle("active");
        navLinks.classList.toggle("open");
    }

    /* --------------------------------------------------
       closeMobileMenu
       Fecha o menu mobile removendo as classes de estado 
       aberto. Chamada quando o usuario clica em um link 
       do menu, garantindo que o menu feche apos a 
       navegacao.
       -------------------------------------------------- */
    function closeMobileMenu() {
        navToggle.classList.remove("active");
        navLinks.classList.remove("open");
    }

    /* --------------------------------------------------
       setupMobileMenuListeners
       Associa o evento de clique no botao hamburguer 
       para abrir/fechar o menu. Tambem adiciona um 
       listener a cada link da navegacao para fechar o 
       menu apos o clique.
       -------------------------------------------------- */
    function setupMobileMenuListeners() {
        navToggle.addEventListener("click", toggleMobileMenu);

        for (var i = 0; i < allNavAnchors.length; i++) {
            allNavAnchors[i].addEventListener("click", closeMobileMenu);
        }
    }

    /* --------------------------------------------------
       setupScrollObserver
       Cria um IntersectionObserver que monitora quando 
       os elementos com a classe "fade-in" entram no 
       viewport. Quando pelo menos 15% do elemento esta 
       visivel, adiciona a classe "visible" para disparar 
       a animacao de entrada. Apos a animacao, o observer 
       para de monitorar aquele elemento.
       -------------------------------------------------- */
    function setupScrollObserver() {
        /* Verifica se o navegador suporta IntersectionObserver */
        if (!("IntersectionObserver" in window)) {
            /* Fallback: torna todos os elementos visiveis imediatamente */
            for (var i = 0; i < fadeElements.length; i++) {
                fadeElements[i].classList.add("visible");
            }
            return;
        }

        var observerOptions = {
            root: null,        /* viewport como referencia */
            threshold: 0.15    /* 15% do elemento visivel */
        };

        var observer = new IntersectionObserver(function (entries) {
            for (var i = 0; i < entries.length; i++) {
                if (entries[i].isIntersecting) {
                    entries[i].target.classList.add("visible");
                    observer.unobserve(entries[i].target);
                }
            }
        }, observerOptions);

        for (var j = 0; j < fadeElements.length; j++) {
            observer.observe(fadeElements[j]);
        }
    }

    /* --------------------------------------------------
       smoothScrollToSection
       Intercepta cliques em links de ancora (href="#id") 
       e realiza uma rolagem suave ate a secao alvo.
       Calcula o offset levando em conta a altura da 
       navbar fixa para nao cobrir o conteudo.
       -------------------------------------------------- */
    function smoothScrollToSection() {
        var anchors = document.querySelectorAll('a[href^="#"]');

        for (var i = 0; i < anchors.length; i++) {
            anchors[i].addEventListener("click", function (event) {
                var targetId = this.getAttribute("href");

                if (targetId === "#") {
                    return;
                }

                var targetElement = document.querySelector(targetId);

                if (targetElement) {
                    event.preventDefault();
                    var navbarHeight = navbar.offsetHeight;
                    var targetPosition = targetElement.offsetTop - navbarHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: "smooth"
                    });
                }
            });
        }
    }

    /* --------------------------------------------------
       init
       Funcao principal de inicializacao. Chama todas as 
       funcoes de setup na ordem correta quando o DOM 
       esta pronto.
       -------------------------------------------------- */
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

        /* Listener de scroll para o comportamento da navbar e overlay */
        window.addEventListener("scroll", handleNavbarScroll);
        window.addEventListener("scroll", handleHeroOverlay);
        window.addEventListener("scroll", handleContactOverlay);
    }

    /* Aguarda o DOM estar completamente carregado */
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }

})();
